import React, { useState, useEffect, useRef } from "react";
import { Box, Typography, IconButton, LinearProgress } from "@mui/material";
import { toast } from "react-toastify";
import { debounce } from "lodash";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useAuth } from "$context/AuthContext";

// Importar funções da API
import {
  saveVideoProgress,
  fetchVideoProgress,
  markVideoAsCompleted,
  processPlayerState,
} from "$api/services/courses/videoProgress";
import { formatTime, isVideoLocked, isNearEnd } from "$api/utils/videoUtils";

export function VideoWatcher({
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
  advancedSettings, // Adicione este parâmetro
}) {
  const { userDetails } = useAuth();
  const progressInterval = useRef(null);
  const [lastSavedPercentage, setLastSavedPercentage] =
    useState(percentageWatched);

  // Usar objetos para armazenar os estados por vídeo
  const videoStates = useRef({});

  // Inicializar estado para o vídeo atual se ainda não existir
  if (!videoStates.current[videoId]) {
    videoStates.current[videoId] = {
      hasNotified90Percent: percentageWatched >= 90,
      videoCompleted: percentageWatched >= 100,
      lastTime: watchTime || 0,
      lastSaved10Percentage: Math.floor(percentageWatched / 10) * 10,
    };
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
      // Usar a função da API para processar o estado do player
      const progressData = processPlayerState(player, videoState);

      if (!progressData) return;

      const { currentTime, duration, percentage, isSeek, isNearEnd } =
        progressData;

      // Atualizar a UI imediatamente se o valor for diferente ou maior
      if (percentage > percentageWatched || isSeek) {
        setWatchTime(currentTime);
        setPercentageWatched(percentage);
      }

      // Verificar se ultrapassamos um marco de 10%
      const current10Percentage = Math.floor(percentage / 10) * 10;
      if (current10Percentage > videoState.lastSaved10Percentage) {
        // Salvar explicitamente no banco pois atingimos um novo marco de 10%
        saveProgress(currentTime, duration);
        videoState.lastSaved10Percentage = current10Percentage;
      }

      // Se for um seek ou estiver próximo do final, podemos verificar conclusão
      if ((isSeek || isNearEnd) && currentTime > 0) {
        if (percentage >= 100 && !videoState.videoCompleted) {
          handleVideoCompletion(duration);
        } else if (
          lastSavedPercentage < 90 &&
          percentage >= 90 &&
          !videoState.hasNotified90Percent
        ) {
          handleReachedMilestone(currentTime, duration, percentage);
        }
      }
    } catch (error) {
      console.error("Erro ao atualizar UI do progresso:", error);
    }
  };

  const handleVideoCompletion = async (duration) => {
    console.log(
      `[VideoWatcher] Completando vídeo ${videoId} com duração ${duration}`
    );

    setWatchTime(duration);
    setPercentageWatched(100);

    // Usar a função da API para salvar o progresso como 100%
    if (userDetails?.userId) {
      await markVideoAsCompleted(
        userDetails.userId,
        courseId,
        videoId,
        duration
      );
    }

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

  const handleReachedMilestone = async (currentTime, duration, percentage) => {
    toast.success("Progresso do vídeo salvo com sucesso!");
    videoState.hasNotified90Percent = true;

    if (onVideoProgressUpdate) {
      onVideoProgressUpdate(videoId, percentage, true);
    }

    await debouncedSaveProgress(currentTime, duration);
    setLastSavedPercentage(percentage);
  };

  const saveProgress = async (currentTime, duration) => {
    // Só salva se houver um usuário logado
    if (!userDetails?.userId) return;

    try {
      // Usar a função da API para salvar o progresso
      const result = await saveVideoProgress(
        userDetails.userId,
        courseId,
        videoId,
        currentTime,
        duration,
        videoState
      );

      if (result.success) {
        videoState.lastSaved10Percentage =
          Math.floor(result.newPercentage / 10) * 10;
        setLastSavedPercentage(result.newPercentage);
      }

      if (onProgress) {
        onProgress(currentTime, duration);
      }
    } catch (error) {
      console.error("Erro ao salvar progresso:", error);
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
        const nearEnd = isNearEnd(currentTime, duration);
        const newPercentage = nearEnd
          ? 100
          : Math.min(100, Math.floor((currentTime / duration) * 100));

        // Se já atingiu 100% ou está muito próximo do final
        if (newPercentage >= 100 || nearEnd) {
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

      // Verificar configurações avançadas
      const requirePreviousCompletion = !(
        advancedSettings?.videos?.requirePreviousCompletion === false
      );

      if (requirePreviousCompletion && isVideoLocked(previousItem, videos)) {
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

      // Verificar configurações avançadas
      const requirePreviousCompletion = !(
        advancedSettings?.videos?.requirePreviousCompletion === false
      );

      if (requirePreviousCompletion && isVideoLocked(nextItem, videos)) {
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
