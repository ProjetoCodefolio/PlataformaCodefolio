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
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const formattedHrs = hrs > 0 ? `${hrs}:` : "";
    const formattedMins = mins < 10 && hrs > 0 ? `0${mins}:` : `${mins}:`;
    const formattedSecs = secs < 10 ? `0${secs}` : `${secs}`;

    return `${formattedHrs}${formattedMins}${formattedSecs}`;
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
    const videoCompletedRef = useRef(percentageWatched >= 100);
    const lastTimeRef = useRef(watchTime); // Para detectar seeks
    const lastSaved10PercentageRef = useRef(Math.floor(percentageWatched / 10) * 10);

    // Modifique o updateProgressUI para adicionar verificação de marcos de 10%:
    const updateProgressUI = () => {
        if (!player || videoCompletedRef.current) return;

        try {
            const duration = player.getDuration() || 0;
            const currentTime = player.getCurrentTime() || 0;

            if (duration <= 0) return;

            // Verificar se houve um seek significativo
            const timeDifference = Math.abs(currentTime - lastTimeRef.current);
            const isSeek = timeDifference > 2; // Um seek é detectado se a diferença for maior que 2 segundos

            lastTimeRef.current = currentTime;

            // Considera como 100% se estiver a menos de 2 segundos do final ou se a % for >= 99.5%
            const isNearEnd = duration - currentTime <= 2 || currentTime / duration >= 0.995;
            const newPercentage = isNearEnd ? 100 : Math.min(100, Math.floor((currentTime / duration) * 100));

            // Atualizar a UI imediatamente
            setWatchTime(currentTime);
            setPercentageWatched(newPercentage);

            // Verificar se ultrapassamos um marco de 10%
            const current10Percentage = Math.floor(newPercentage / 10) * 10;
            if (current10Percentage > lastSaved10PercentageRef.current) {
                // Salvar explicitamente no banco pois atingimos um novo marco de 10%
                saveProgress(currentTime, duration);
                lastSaved10PercentageRef.current = current10Percentage;
            }

            // Se for um seek ou estiver próximo do final, podemos verificar conclusão
            if (isSeek || isNearEnd) {
                if (newPercentage >= 100 && !videoCompletedRef.current) {
                    handleVideoCompletion(duration);
                } else if (lastSavedPercentage < 90 && newPercentage >= 90 && !hasNotified90Percent.current) {
                    handleReachedMilestone(currentTime, duration, newPercentage);
                }
            }
        } catch (error) {
            console.error("Erro ao atualizar UI do progresso:", error);
        }
    };

    // Função para lidar com vídeo completo
    const handleVideoCompletion = (duration) => {
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
        toast.success("Progresso do vídeo salvo com sucesso!");
        hasNotified90Percent.current = true;

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

        newPercentage = Math.max(newPercentage, lastSaved10PercentageRef.current);

        // Se não mudou o marco de 10%, não salva (exceto para 100%)
        if (newPercentage === lastSaved10PercentageRef.current && newPercentage < 100) {
            return;
        }

        if (userDetails?.userId && videoId && courseId) {
            try {
                // Primeiro verifica se existe um registro anterior no Firebase
                const progressRef = databaseRef(database, `videoProgress/${userDetails.userId}/${courseId}/${videoId}`);

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
                    completed: newPercentage >= 100 // Campo booleano para indicar conclusão
                };

                if (newPercentage >= 100) {
                    videoCompletedRef.current = true;
                }

                // Salva no banco e atualiza o estado local
                await set(progressRef, progressData);
                lastSaved10PercentageRef.current = newPercentage;
                setLastSavedPercentage(newPercentage);

              
            } catch (error) {
             
            }
        }

        if (onProgress) {
            onProgress(currentTime, duration);
        }
    };

    const debouncedSaveProgress = debounce(saveProgress, 1000);

    // Setup YouTube player events
    useEffect(() => {
        if (!player) return;

        // Adicionar event listeners para o player
        try {
            // Evento de mudança de estado (play, pause, buffer, etc)
            player.addEventListener('onStateChange', (event) => {
                // Estado -1: unstarted, 0: ended, 1: playing, 2: paused, 3: buffering, 5: video cued
                const playerState = event.data;

                // Atualizar a UI imediatamente em qualquer mudança de estado
                updateProgressUI();

                // Em caso de pause ou fim do vídeo, podemos salvar o progresso
                if (playerState === 0 || playerState === 2) {
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
            });

            // Criar um observador para detectar seeks
            const seekObserver = setInterval(() => {
                if (player && player.getPlayerState && player.getPlayerState() === 3) { // 3 = buffering (que ocorre após seeks)
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
    }, [player]);

    useEffect(() => {
        // Se já está em 100% ou não tem player, não iniciar monitoramento
        if (!player || percentageWatched >= 100 || videoCompletedRef.current) {
            videoCompletedRef.current = true;
            return;
        }

        const monitorProgress = () => {
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
            hasNotified90Percent.current = false;
        };
    }, [player, videoId]);

    useEffect(() => {
        const handleBeforeUnload = (event) => {
            if (player && !videoCompletedRef.current) {
                const currentTime = player.getCurrentTime() || 0;
                const duration = player.getDuration() || 0;
                saveProgress(currentTime, duration);
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [player]);

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
                    {videoCompletedRef.current ? 100 : percentageWatched}% {percentageWatched >= 90 ? "✓" : ""}
                </Typography>
            </Box>
        </Box>
    );
}

export { VideoWatcher, formatTime };