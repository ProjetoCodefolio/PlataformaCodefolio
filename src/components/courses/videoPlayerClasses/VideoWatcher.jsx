import React, { useState, useEffect, useRef } from "react";
import { ref as databaseRef, set, get } from "firebase/database";
import { database } from "../../../service/firebase";
import { useAuth } from "../../../context/AuthContext";
import { LinearProgress, Box, Typography, IconButton } from "@mui/material";
import { toast } from "react-toastify";
import { debounce } from "lodash";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  return [h, m, s]
    .map((v) => (v < 10 ? "0" + v : v))
    .filter((v, i) => v !== "00" || i > 0)
    .join(":");
}

function VideoWatcher({
  player,
  videoId,
  courseId,
  onProgress,
  hasNotifiedRef,
  watchTime,
  setWatchTime,
  percentageWatched,
  setPercentageWatched,
  videos,
  currentVideo,
  onVideoChange,
  setShowQuiz,
  setCurrentVideoId,
  onVideoProgressUpdate,
}) {
  const { userDetails } = useAuth();
  const progressInterval = useRef(null);
  const [lastSavedPercentage, setLastSavedPercentage] =
    useState(percentageWatched);

  // Usar objetos para armazenar os estados por vídeo
  // Isso é crucial para manter estados separados por vídeo
  const videoStates = useRef({});

  // Inicializar estado para o vídeo atual se ainda não existir
  if (!videoStates.current[videoId]) {
    videoStates.current[videoId] = {
      hasNotified90Percent: percentageWatched >= 90,
      videoCompleted: percentageWatched >= 100,
      lastTime: watchTime || 0,
      lastSaved10Percentage: Math.floor(percentageWatched / 10) * 10,
    };

    console.log(
      `[VideoWatcher] Inicializando estado para o vídeo ${videoId}:`,
      {
        percentageWatched,
        watchTime,
        completed: percentageWatched >= 100,
      }
    );
  }

  // Obter o estado específico do vídeo atual
  const videoState = videoStates.current[videoId];

  // Limpar intervalo quando o componente é desmontado ou o vídeo muda
  useEffect(() => {
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }
    };
  }, [videoId]);

  const updateProgressUI = () => {
    if (!player) return;

    try {
      // Obter valores do player
      const duration = player.getDuration() || 0;
      const currentTime = player.getCurrentTime() || 0;

      if (duration <= 0) return;

      // Verificar se houve um seek significativo
      const timeDifference = Math.abs(currentTime - videoState.lastTime);
      const isSeek = timeDifference > 2; // Um seek é detectado se a diferença for maior que 2 segundos

      videoState.lastTime = currentTime;

      // Considera como 100% se estiver a menos de 2 segundos do final ou se a % for >= 99.5%
      const isNearEnd =
        duration - currentTime <= 2 || currentTime / duration >= 0.995;
      const newPercentage = isNearEnd
        ? 100
        : Math.min(100, Math.floor((currentTime / duration) * 100));

      // Atualizar a UI imediatamente se o valor for diferente ou maior
      if (newPercentage > percentageWatched || isSeek) {
        setWatchTime(currentTime);
        setPercentageWatched(newPercentage);
      }

      // Verificar se ultrapassamos um marco de 10%
      const current10Percentage = Math.floor(newPercentage / 10) * 10;
      if (current10Percentage > videoState.lastSaved10Percentage) {
        // Salvar explicitamente no banco pois atingimos um novo marco de 10%
        saveProgress(currentTime, duration);
        videoState.lastSaved10Percentage = current10Percentage;
      }

      // Se for um seek ou estiver próximo do final, podemos verificar conclusão
      if ((isSeek || isNearEnd) && currentTime > 0) {
        if (newPercentage >= 100 && !videoState.videoCompleted) {
          handleVideoCompletion(duration);
        } else if (
          lastSavedPercentage < 90 &&
          newPercentage >= 90 &&
          !videoState.hasNotified90Percent
        ) {
          handleReachedMilestone(currentTime, duration, newPercentage);
        }
      }
    } catch (error) {
      console.error("Erro ao atualizar UI do progresso:", error);
    }
  };

  const handleVideoCompletion = (duration) => {
    console.log(
      `[VideoWatcher] Completando vídeo ${videoId} com duração ${duration}`
    );

    setWatchTime(duration);
    setPercentageWatched(100);
    saveProgress(duration, duration);
    setLastSavedPercentage(100);
    toast.success("Vídeo concluído com sucesso!");

    // Marcar APENAS o vídeo atual como completo
    videoState.videoCompleted = true;
    videoState.hasNotified90Percent = true;

    if (onVideoProgressUpdate) {
      onVideoProgressUpdate(videoId, 100, true);
    }

    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  };

  const handleReachedMilestone = (currentTime, duration, percentage) => {
    toast.success("Progresso do vídeo salvo com sucesso!");
    videoState.hasNotified90Percent = true;

    if (onVideoProgressUpdate) {
      onVideoProgressUpdate(videoId, percentage, true);
    }

    debouncedSaveProgress(currentTime, duration);
    setLastSavedPercentage(percentage);
  };

  const saveProgress = async (currentTime, duration) => {
    let currentPercentage = Math.floor((currentTime / duration) * 100);

    // Arredonda para o múltiplo de 10 mais próximo (para baixo)
    let newPercentage = Math.floor(currentPercentage / 10) * 10;

    newPercentage = Math.max(newPercentage, videoState.lastSaved10Percentage);

    // Se não mudou o marco de 10%, não salva (exceto para 100%)
    if (
      newPercentage === videoState.lastSaved10Percentage &&
      newPercentage < 100
    ) {
      return;
    }

    if (userDetails?.userId && videoId && courseId) {
      try {
        // Primeiro verifica se existe um registro anterior no Firebase
        const progressRef = databaseRef(
          database,
          `videoProgress/${userDetails.userId}/${courseId}/${videoId}`
        );

        // Busca o valor atual do banco antes de salvar
        const snapshot = await get(progressRef);
        let currentDbPercentage = 0;

        if (snapshot.exists()) {
          const data = snapshot.val();
          currentDbPercentage = data.percentageWatched || 0;
        }

        // Usa o maior valor entre o atual e o do banco
        newPercentage = Math.max(newPercentage, currentDbPercentage);

        // Se for 100%, mantém 100% sem arredondar
        if (currentPercentage >= 100) {
          newPercentage = 100;
          videoState.videoCompleted = true;
        }

        const progressData = {
          watchedTimeInSeconds: currentTime,
          percentageWatched: newPercentage,
          watched: newPercentage >= 90,
          lastUpdated: new Date().toISOString(),
          completed: newPercentage >= 100,
          videoId: videoId,
        };

        // Salva no banco e atualiza o estado local
        await set(progressRef, progressData);
        videoState.lastSaved10Percentage = Math.floor(newPercentage / 10) * 10;
        setLastSavedPercentage(newPercentage);
      } catch (error) {
        console.error("Erro ao salvar progresso:", error);
      }
    }

    if (onProgress) {
      onProgress(currentTime, duration);
    }
  };

  const debouncedSaveProgress = debounce(saveProgress, 1000);

  useEffect(() => {
    if (!player) return;

    // Adicionar event listeners para o player
    try {
      const playerStateChangeHandler = (event) => {
        // Estado -1: unstarted, 0: ended, 1: playing, 2: paused, 3: buffering, 5: video cued
        const playerState = event.data;

        // Atualizar a UI imediatamente em qualquer mudança de estado
        updateProgressUI();

        // Em caso de pause ou fim do vídeo, podemos salvar o progresso
        if (playerState === 0 || playerState === 2) {
          const currentTime = player.getCurrentTime() || 0;
          const duration = player.getDuration() || 0;

          // Se o vídeo terminou normalmente
          if (playerState === 0 && !videoState.videoCompleted) {
            handleVideoCompletion(duration);
          } else {
            // Se pausou, atualiza progresso mas não marca como completo
            debouncedSaveProgress(currentTime, duration);
          }
        }
      };

      // Adicionar o event listener apenas se o player tiver suporte
      if (player.addEventListener) {
        player.addEventListener("onStateChange", playerStateChangeHandler);
      }
    } catch (error) {
      console.error("Erro ao configurar event listeners do player:", error);
    }

    return () => {
      // Não podemos remover event listeners do YouTube player diretamente
      // O YouTube API não oferece um método removeEventListener
    };
  }, [player, videoId]);

  // Monitoramento de progresso contínuo
  useEffect(() => {
    if (!player) return;

    // Limpar intervalo existente
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }

    // Se já está em 100% ou não tem player, não iniciar monitoramento
    if (!player || percentageWatched >= 100 || videoState.videoCompleted) {
      return;
    }

    let isComponentMounted = true;

    const monitorProgress = () => {
      if (!isComponentMounted || !player || !videoId) return;

      try {
        const playerState = player.getPlayerState?.() || -1;

        // Só monitora quando o vídeo está em reprodução
        if (playerState !== 1) return;

        const duration = player.getDuration() || 0;
        const currentTime = player.getCurrentTime() || 0;

        if (duration <= 0) return; // Evita cálculos inválidos

        // Atualiza lastTime para o monitoramento de seeks
        videoState.lastTime = currentTime;

        // Calcula o percentual atual
        const isNearEnd =
          duration - currentTime <= 2 || currentTime / duration >= 0.995;
        const newPercentage = isNearEnd
          ? 100
          : Math.min(100, Math.floor((currentTime / duration) * 100));

        // Se já atingiu 100% ou está muito próximo do final
        if (newPercentage >= 100 || isNearEnd) {
          if (!videoState.videoCompleted) {
            handleVideoCompletion(duration);
          }
          return;
        }

        // Atualiza o progresso apenas se for maior
        if (newPercentage > percentageWatched) {
          setWatchTime(currentTime);
          setPercentageWatched(newPercentage);

          if (
            lastSavedPercentage < 90 &&
            newPercentage >= 90 &&
            !videoState.hasNotified90Percent
          ) {
            handleReachedMilestone(currentTime, duration, newPercentage);
          }

          const current10Percentage = Math.floor(newPercentage / 10) * 10;
          if (current10Percentage > videoState.lastSaved10Percentage) {
            saveProgress(currentTime, duration);
            videoState.lastSaved10Percentage = current10Percentage;
          }
        }
      } catch (error) {
        console.error("Erro ao monitorar progresso:", error);
      }
    };

    // Executa uma vez imediatamente
    monitorProgress();

    // Configura o intervalo - 5 segundos é um bom equilíbrio
    progressInterval.current = setInterval(monitorProgress, 5000);

    return () => {
      isComponentMounted = false;
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }
    };
  }, [player, videoId, percentageWatched]);

  // Salvar progresso antes de fechar a página
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (player) {
        try {
          const currentTime = player.getCurrentTime() || 0;
          const duration = player.getDuration() || 0;
          if (duration > 0) {
            saveProgress(currentTime, duration);
          }
        } catch (error) {
          console.error("Erro ao salvar progresso antes de sair:", error);
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
      debouncedSaveProgress.cancel();
    };
  }, [player, videoId]);

  const currentIndex = videos.findIndex((v) => v.id === currentVideo.id);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < videos.length - 1;

  const handlePrevious = () => {
    if (hasPrevious) {
      const previousItem = videos[currentIndex - 1];
      if (isVideoLocked(previousItem)) {
        toast.warn(
          "Você precisa completar o vídeo anterior ou o quiz antes de prosseguir!"
        );
        return;
      }

      // Salvar progresso atual
      if (player) {
        try {
          const currentTime = player.getCurrentTime() || 0;
          const duration = player.getDuration() || 0;
          if (duration > 0) {
            saveProgress(currentTime, duration);
          }
        } catch (error) {
          console.error("Erro ao salvar progresso:", error);
        }
      }

      if (previousItem.quizId && !previousItem.quizPassed) {
        setShowQuiz(true);
        setCurrentVideoId(previousItem.id);
      } else {
        onVideoChange(previousItem);
      }
    }
  };

  const handleNext = () => {
    if (hasNext) {
      // Verificar se precisa fazer o quiz atual
      if (
        currentVideo.quizId &&
        !currentVideo.quizPassed &&
        percentageWatched >= 90
      ) {
        setShowQuiz(true);
        setCurrentVideoId(currentVideo.id);
        return;
      } else if (
        currentVideo.quizId &&
        !currentVideo.quizPassed &&
        percentageWatched < 90
      ) {
        toast.warn(
          "Você precisa assistir pelo menos 90% do vídeo para acessar o quiz!"
        );
        return;
      }

      const nextItem = videos[currentIndex + 1];
      if (isVideoLocked(nextItem)) {
        toast.warn(
          "Você precisa completar o vídeo anterior ou o quiz antes de prosseguir!"
        );
        return;
      } else {
        // Salvar progresso atual
        if (player) {
          try {
            const currentTime = player.getCurrentTime() || 0;
            const duration = player.getDuration() || 0;
            if (duration > 0) {
              saveProgress(currentTime, duration);
            }
          } catch (error) {
            console.error("Erro ao salvar progresso:", error);
          }
        }

        onVideoChange(nextItem);
      }
    }
  };

  const isVideoLocked = (video) => {
    const videoIndex = videos.findIndex((v) => v.id === video.id);
    const previousVideo = videoIndex > 0 ? videos[videoIndex - 1] : null;

    if (videoIndex === 0) return false;

    return (
      video.requiresPrevious &&
      previousVideo &&
      (!previousVideo.watched ||
        (previousVideo.quizId && !previousVideo.quizPassed))
    );
  };

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: { xs: "100%", sm: "780px" },
        mt: 1,
        ml: { xs: 0, sm: 2 },
        backgroundColor: "#F5F5FA",
      }}
    >
      <Box
        sx={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ flex: 1, position: "relative" }}>
          <LinearProgress
            variant="determinate"
            value={videoState.videoCompleted ? 100 : percentageWatched}
            sx={{
              width: "100%",
              height: 10,
              borderRadius: 5,
              backgroundColor: "#e0e0e0",
              "& .MuiLinearProgress-bar": {
                backgroundColor:
                  percentageWatched >= 90 ? "#4caf50" : "#9041c1",
                borderRadius: 5,
                transition: "transform 0.3s ease-in-out",
              },
            }}
          />
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: 2 }}>
          <IconButton
            onClick={handlePrevious}
            disabled={!hasPrevious}
            sx={{ color: hasPrevious ? "#9041c1" : "#cccccc" }}
          >
            <ArrowBackIcon />
          </IconButton>
          <IconButton
            onClick={handleNext}
            disabled={!hasNext}
            sx={{ color: hasNext ? "#9041c1" : "#cccccc" }}
          >
            <ArrowForwardIcon />
          </IconButton>
        </Box>
      </Box>

      <Box
        sx={{
          width: "100%",
          mt: 1,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography
          variant="caption"
          color="textSecondary"
          sx={{ fontWeight: 500 }}
        >
          {formatTime(watchTime)}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 600,
            color: percentageWatched >= 90 ? "#4caf50" : "#9041c1",
            backgroundColor:
              percentageWatched >= 90
                ? "rgba(76, 175, 80, 0.1)"
                : "rgba(144, 65, 193, 0.1)",
            px: 1.5,
            py: 0.5,
            borderRadius: 10,
          }}
        >
          {videoState.videoCompleted ? 100 : percentageWatched}%{" "}
          {percentageWatched >= 90 ? "✓" : ""}
        </Typography>
      </Box>
    </Box>
  );
}

export { VideoWatcher, formatTime };
