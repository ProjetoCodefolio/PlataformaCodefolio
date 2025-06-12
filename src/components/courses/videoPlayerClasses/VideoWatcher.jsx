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
  const hasNotified90Percent = useRef(false);
  const videoCompletedRef = useRef(false);
  const lastTimeRef = useRef(watchTime);
  const lastSaved10PercentageRef = useRef(
    Math.floor(percentageWatched / 10) * 10
  );
  const currentVideoIdRef = useRef(videoId);

  // CORREÇÃO 1: Inicializar corretamente o estado quando o componente monta
  useEffect(() => {
    // Definir o estado inicial corretamente
    videoCompletedRef.current = percentageWatched >= 100;
    hasNotified90Percent.current = percentageWatched >= 90;
    lastTimeRef.current = watchTime;
    lastSaved10PercentageRef.current = Math.floor(percentageWatched / 10) * 10;
    setLastSavedPercentage(percentageWatched);
    currentVideoIdRef.current = videoId;

    // Limpar na desmontagem
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }
    };
  }, []); // Executar apenas uma vez na montagem

  // CORREÇÃO 2: Redefinir explicitamente todos os estados quando o videoId muda
  useEffect(() => {
    // Verificação crítica: se o ID do vídeo mudou, redefina explicitamente videoCompletedRef
    if (currentVideoIdRef.current !== videoId) {
      console.log(
        `Vídeo mudou de ${currentVideoIdRef.current} para ${videoId}`
      );

      // CORREÇÃO PRINCIPAL: Forçar videoCompletedRef.current = false para o novo vídeo
      // a menos que o novo vídeo já tenha percentageWatched >= 100
      videoCompletedRef.current = false;

      // Limpar o intervalo existente
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }

      // Resetar todos os estados para o novo vídeo
      hasNotified90Percent.current = percentageWatched >= 90;

      // Definir videoCompletedRef apenas se o novo vídeo realmente tiver 100%
      // Esta é a correção principal
      if (percentageWatched >= 100) {
        videoCompletedRef.current = true;
      } else {
        videoCompletedRef.current = false; // Garantir que seja false para o novo vídeo
      }

      lastTimeRef.current = watchTime;
      lastSaved10PercentageRef.current =
        Math.floor(percentageWatched / 10) * 10;
      setLastSavedPercentage(percentageWatched);
      currentVideoIdRef.current = videoId;

      console.log(
        `Estado inicial para vídeo ${videoId}: completado=${videoCompletedRef.current}, percentageWatched=${percentageWatched}`
      );
    }
  }, [videoId]); // Dependência apenas do videoId para garantir que seja executado quando o vídeo mudar

  // CORREÇÃO 3: updateProgressUI melhorado para verificação mais robusta
  const updateProgressUI = () => {
    if (!player) return;

    try {
      // Obter valores do player
      const duration = player.getDuration() || 0;
      const currentTime = player.getCurrentTime() || 0;

      if (duration <= 0) return;

      // Verificar se houve um seek significativo
      const timeDifference = Math.abs(currentTime - lastTimeRef.current);
      const isSeek = timeDifference > 2; // Um seek é detectado se a diferença for maior que 2 segundos

      lastTimeRef.current = currentTime;

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
      if (current10Percentage > lastSaved10PercentageRef.current) {
        // Salvar explicitamente no banco pois atingimos um novo marco de 10%
        saveProgress(currentTime, duration);
        lastSaved10PercentageRef.current = current10Percentage;
      }

      // Se for um seek ou estiver próximo do final, podemos verificar conclusão
      if ((isSeek || isNearEnd) && currentVideoIdRef.current === videoId) {
        if (newPercentage >= 100 && !videoCompletedRef.current) {
          handleVideoCompletion(duration);
        } else if (
          lastSavedPercentage < 90 &&
          newPercentage >= 90 &&
          !hasNotified90Percent.current
        ) {
          handleReachedMilestone(currentTime, duration, newPercentage);
        }
      }
    } catch (error) {
      console.error("Erro ao atualizar UI do progresso:", error);
    }
  };

  // Função para lidar com vídeo completo
  const handleVideoCompletion = (duration) => {
    if (currentVideoIdRef.current !== videoId) return;

    console.log(`Completando vídeo ${videoId}`);
    setWatchTime(duration);
    setPercentageWatched(100);
    saveProgress(duration, duration);
    setLastSavedPercentage(100);
    toast.success("Vídeo concluído com sucesso!");
    videoCompletedRef.current = true;

    if (onVideoProgressUpdate) {
      onVideoProgressUpdate(videoId, 100, true);
    }

    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  };

  // Função para lidar com milestone de 90%
  const handleReachedMilestone = (currentTime, duration, percentage) => {
    if (currentVideoIdRef.current !== videoId) return;

    toast.success("Progresso do vídeo salvo com sucesso!");
    hasNotified90Percent.current = true;

    if (onVideoProgressUpdate) {
      onVideoProgressUpdate(videoId, percentage, true);
    }

    debouncedSaveProgress(currentTime, duration);
    setLastSavedPercentage(percentage);
  };

  // CORREÇÃO 4: saveProgress melhorado com verificações adicionais
  const saveProgress = async (currentTime, duration) => {
    // Verificar se este ainda é o vídeo atual
    if (currentVideoIdRef.current !== videoId) return;

    let currentPercentage = Math.floor((currentTime / duration) * 100);

    // Arredonda para o múltiplo de 10 mais próximo (para baixo)
    let newPercentage = Math.floor(currentPercentage / 10) * 10;

    newPercentage = Math.max(newPercentage, lastSaved10PercentageRef.current);

    // Se não mudou o marco de 10%, não salva (exceto para 100%)
    if (
      newPercentage === lastSaved10PercentageRef.current &&
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
          // Arredonda o valor do banco para múltiplo de 10 também
          currentDbPercentage = Math.floor(currentDbPercentage / 10) * 10;
        }

        // Usa o maior valor entre o atual e o do banco
        newPercentage = Math.max(newPercentage, currentDbPercentage);

        // Se for 100%, mantém 100% sem arredondar
        if (currentPercentage >= 100) {
          newPercentage = 100;
        }

        const progressData = {
          watchedTimeInSeconds: Math.max(
            currentTime,
            (newPercentage / 100) * duration
          ),
          percentageWatched: newPercentage,
          watched: newPercentage >= 90,
          lastUpdated: new Date().toISOString(),
          completed: newPercentage >= 100, // Campo booleano para indicar conclusão
        };

        if (newPercentage >= 100) {
          videoCompletedRef.current = true;
        }

        // Salva no banco e atualiza o estado local
        await set(progressRef, progressData);
        lastSaved10PercentageRef.current = Math.floor(newPercentage / 10) * 10;
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

  // CORREÇÃO 5: Setup YouTube player events com verificações adicionais
  useEffect(() => {
    if (!player) return;

    // Adicionar event listeners para o player
    try {
      // Evento de mudança de estado (play, pause, buffer, etc)
      player.addEventListener("onStateChange", (event) => {
        // Estado -1: unstarted, 0: ended, 1: playing, 2: paused, 3: buffering, 5: video cued
        const playerState = event.data;

        // Atualizar a UI imediatamente em qualquer mudança de estado
        if (currentVideoIdRef.current === videoId) {
          updateProgressUI();
        }

        // Em caso de pause ou fim do vídeo, podemos salvar o progresso
        if (playerState === 0 || playerState === 2) {
          if (currentVideoIdRef.current === videoId) {
            const currentTime = player.getCurrentTime() || 0;
            const duration = player.getDuration() || 0;

            // Se o vídeo terminou normalmente
            if (playerState === 0 && !videoCompletedRef.current) {
              handleVideoCompletion(duration);
            } else {
              // Se pausou, atualiza progresso mas não marca como completo
              debouncedSaveProgress(currentTime, duration);
            }
          }
        }
      });

      // Criar um observador para detectar seeks
      const seekObserver = setInterval(() => {
        if (
          currentVideoIdRef.current === videoId &&
          player &&
          player.getPlayerState &&
          player.getPlayerState() === 3
        ) {
          // 3 = buffering (que ocorre após seeks)
          updateProgressUI();
        }
      }, 200); // Verificar mais frequentemente durante buffers

      return () => {
        clearInterval(seekObserver);
        // Não podemos remover event listeners do YouTube player diretamente
        // O YouTube API não oferece um método removeEventListener
      };
    } catch (error) {
      console.error("Erro ao configurar event listeners do player:", error);
    }
  }, [player, videoId]);

  // CORREÇÃO 6: Monitoramento de progresso com limpeza adequada
  useEffect(() => {
    // Limpar intervalo existente antes de configurar um novo
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }

    // Se já está em 100% ou não tem player, não iniciar monitoramento
    if (!player || percentageWatched >= 100 || videoCompletedRef.current) {
      return;
    }

    const monitorProgress = () => {
      // Garantir que estamos trabalhando com o vídeo correto
      if (currentVideoIdRef.current !== videoId) {
        return;
      }

      // Verificação extra para garantir que não continuemos se já está em 100%
      if (percentageWatched >= 100 || videoCompletedRef.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
        debouncedSaveProgress.cancel();
        return;
      }

      try {
        const duration = player.getDuration() || 0;
        const currentTime = player.getCurrentTime() || 0;

        if (duration <= 0) return; // Evita cálculos inválidos

        // Atualiza lastTimeRef para o monitoramento de seeks
        lastTimeRef.current = currentTime;

        // Considera como 100% se estiver a menos de 2 segundos do final ou se a % for >= 99.5%
        const isNearEnd =
          duration - currentTime <= 2 || currentTime / duration >= 0.995;

        // Se estiver no final, força 100%
        const newPercentage = isNearEnd
          ? 100
          : Math.min(100, Math.floor((currentTime / duration) * 100));

        // Se já atingiu 100% ou está muito próximo do final, parar o monitoramento imediatamente
        if (newPercentage >= 100 || isNearEnd) {
          if (!videoCompletedRef.current) {
            handleVideoCompletion(duration);
          }
          clearInterval(progressInterval.current); // Para o intervalo
          progressInterval.current = null;
          debouncedSaveProgress.cancel(); // Cancela qualquer salvamento pendente
          return;
        }

        // Atualiza o progresso apenas se ainda não atingiu 100%
        if (currentTime > watchTime) {
          setWatchTime(currentTime);
          setPercentageWatched(newPercentage);

          if (
            lastSavedPercentage < 90 &&
            newPercentage >= 90 &&
            !hasNotified90Percent.current
          ) {
            handleReachedMilestone(currentTime, duration, newPercentage);
          }

          const current10Percentage = Math.floor(newPercentage / 10) * 10;
          if (current10Percentage > lastSaved10PercentageRef.current) {
            // Salvar explicitamente no banco pois atingimos um novo marco de 10%
            saveProgress(currentTime, duration);
            lastSaved10PercentageRef.current = current10Percentage;
          }
        }

        // Verificação adicional para quando estiver muito próximo do fim
        if (duration - currentTime <= 2 && !videoCompletedRef.current) {
          handleVideoCompletion(duration);
        }
      } catch (error) {
        console.error("Erro ao monitorar progresso:", error);
      }
    };

    // Executa uma vez imediatamente para verificar o estado inicial
    monitorProgress();

    // Configura o intervalo com uma verificação adicional para garantir que
    // não será executado se o vídeo atingir 100% entre verificações
    progressInterval.current = setInterval(() => {
      if (percentageWatched >= 100 || videoCompletedRef.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
        return;
      }
      monitorProgress();
    }, 5000);

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }
      debouncedSaveProgress.cancel();
    };
  }, [player, videoId]);

  // CORREÇÃO 7: Manipulador de beforeunload atualizado
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (
        player &&
        currentVideoIdRef.current === videoId &&
        !videoCompletedRef.current
      ) {
        const currentTime = player.getCurrentTime() || 0;
        const duration = player.getDuration() || 0;
        saveProgress(currentTime, duration);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }
      debouncedSaveProgress.cancel();
    };
  }, [player, videoId]);

  const currentIndex = videos.findIndex((v) => v.id === currentVideo.id);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < videos.length - 1;

  // CORREÇÃO 8: Manipuladores de navegação atualizados
  const handlePrevious = () => {
    if (hasPrevious) {
      const previousItem = videos[currentIndex - 1];
      if (isVideoLocked(previousItem)) {
        toast.warn(
          "Você precisa completar o vídeo anterior ou o quiz antes de prosseguir!"
        );
        return;
      }
      if (previousItem.quizId && !previousItem.quizPassed) {
        setShowQuiz(true);
        setCurrentVideoId(previousItem.id);
      } else {
        // Forçar salvamento do vídeo atual antes de mudar
        if (player && currentVideoIdRef.current === videoId) {
          const currentTime = player.getCurrentTime() || 0;
          const duration = player.getDuration() || 0;
          saveProgress(currentTime, duration);
        }

        onVideoChange(previousItem);
      }
    }
  };

  const handleNext = () => {
    if (hasNext) {
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
        // Forçar salvamento do vídeo atual antes de mudar
        if (player && currentVideoIdRef.current === videoId) {
          const currentTime = player.getCurrentTime() || 0;
          const duration = player.getDuration() || 0;
          saveProgress(currentTime, duration);
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
            value={videoCompletedRef.current ? 100 : percentageWatched}
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
          {videoCompletedRef.current ? 100 : percentageWatched}%{" "}
          {percentageWatched >= 90 ? "✓" : ""}
        </Typography>
      </Box>
    </Box>
  );
}

export { VideoWatcher, formatTime };
