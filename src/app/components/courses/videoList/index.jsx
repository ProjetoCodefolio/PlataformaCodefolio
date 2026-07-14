import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import ViewCarouselIcon from "@mui/icons-material/ViewCarousel"; // Ícone para slides/apresentações
import LockIcon from "@mui/icons-material/Lock";
import ReplayIcon from "@mui/icons-material/Replay";
import QuizIcon from "@mui/icons-material/Quiz";
import { toast } from "react-toastify";
import { isVideoLocked } from "$api/services/courses/videos";
import {
  hasUserReachedQuizAttemptLimit,
  getQuizAttemptLimit,
  isQuizLocked,
} from "$api/services/courses/quizzes";

const VideoList = ({
  videos,
  setCurrentVideo,
  onQuizStart,
  currentVideoId,
  userQuizAttempts = {},
  quizSettings = {}, // Config de tentativas por quiz (allowRetry/maxAttempts)
  course,
  slideQuizzes,
  advancedSettings, // Adicione advancedSettings aos props do componente
}) => {
  const [pendingLimitUpdates, setPendingLimitUpdates] = useState({});

  // Extrai a chave do quiz (id do conteúdo) a partir do video.quizId, que pode
  // vir como "courseId/videoId" ou apenas "videoId".
  const getQuizKey = (quizId) =>
    quizId ? (quizId.includes("/") ? quizId.split("/")[1] : quizId) : null;

  // Limite EFETIVO de tentativas do quiz de um vídeo (1 se repetição desativada,
  // o número configurado, ou Infinity se ilimitado).
  const getVideoAttemptLimit = (video) =>
    getQuizAttemptLimit(quizSettings[getQuizKey(video?.quizId)]);
  
  // Make sure to initialize properly when component mounts or userQuizAttempts changes
  useEffect(() => {
    if (Object.keys(userQuizAttempts).length > 0) {
      // Initialize immediately with current attempts data
      const initialUpdates = {};
      
      videos.forEach(video => {
        if (video.quizId) {
          // Extract the videoId part (handle both formats)
          const videoId = getQuizKey(video.quizId);

          // Check if this quiz has reached its attempt limit
          const attemptData = userQuizAttempts[videoId];
          const attempts = attemptData?.attemptCount || 0;

          if (attempts >= getVideoAttemptLimit(video)) {
            initialUpdates[video.quizId] = true;
          }
        }
      });

      // Set the initial state with all attempts that reached the limit
      setPendingLimitUpdates(initialUpdates);
    }
  }, [userQuizAttempts, videos, quizSettings]);

  // Handler para clicar em um vídeo bloqueado
  const handleLockedClick = (video, previousVideo) => {
    if (previousVideo) {
      if (!previousVideo.watched) {
        toast.warn(
          `Você precisa assistir o vídeo anterior: "${previousVideo.title}" antes de prosseguir!`
        );
      } else if (previousVideo.quizId && !previousVideo.quizPassed) {
        toast.warn(
          `Você precisa completar o quiz do vídeo anterior: "${previousVideo.title}" antes de prosseguir!`
        );
      }
    }
  };

  // Handler para clicar em um quiz bloqueado
  const handleQuizLockedClick = (video) => {
    toast.warn(
      `Você precisa assistir o vídeo "${video.title}" para liberar o quiz!`
    );
  };

  // Handler para clicar no botão de assistir vídeo
  const handleVideoClick = (video) => {
    setCurrentVideo(video);
  };

  // Handler para limite de tentativas atingido
  const handleMaxAttemptsReached = (attemptLimit) => {
    toast.info(
      attemptLimit === 1
        ? "Este quiz permite apenas 1 tentativa, que você já utilizou."
        : `Você já atingiu o limite de ${attemptLimit} tentativas para este quiz.`,
      {
        position: "bottom-center",
        autoClose: 5000,
      }
    );
  };

  return (
    <Box>
      {videos.map((video, index) => {
        // Pegar o vídeo anterior para verificações de bloqueio
        const previousVideo = index > 0 ? videos[index - 1] : null;
        
        // Adicionamos logs e uma verificação explícita
        let locked = false;
        if (advancedSettings?.videos?.requirePreviousCompletion === false) {
          locked = false;
        } else {
          // Caso contrário, usamos a lógica padrão
          locked = !video.isSlide && isVideoLocked(video, videos);
        }
        const completed = video.isSlide
          ? true
          : video.watched && (!video.quizId || video.quizPassed);
        const isCurrent = video.id === currentVideoId;
        const quizLocked = video.isSlide ? false : isQuizLocked(video);
        // Limite efetivo por quiz (allowRetry=false → 1; maxAttempts; ou Infinity).
        const attemptLimit = getVideoAttemptLimit(video);
        const permanentlyExhausted =
          video.quizId &&
          hasUserReachedQuizAttemptLimit(
            userQuizAttempts,
            video.quizId,
            attemptLimit
          );

        // Include both permanent exhaustion and pending updates
        const attemptsExhausted = permanentlyExhausted || pendingLimitUpdates[video.quizId];

        // Determinar se é um slide
        const isSlide = video.isSlide || video.type === "slide";
        const hasQuiz = isSlide ? video.quizId : video.hasQuiz; // Verifica se o slide tem um quiz associado

        return (
          <Card
            key={video.id}
            sx={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: { xs: 1, sm: 2 },
              marginBottom: { xs: 1, sm: 2 },
              backgroundColor: "#F5F5FA",
              borderRadius: "16px",
              border: isCurrent ? "2px solid #9041c1" : "1px solid #e0e0e0",
              opacity: locked ? 0.5 : 1,
              position: "relative",
            }}
          >
            <CardContent sx={{ pb: { xs: 0, sm: 2 } }}>
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
              >
                <Box>
                  <Typography
                    variant="h6"
                    fontWeight="bold"
                    sx={{
                      color: "#333",
                      fontSize: { xs: "0.95rem", sm: "1.25rem" },
                    }}
                  >
                    {video.title} {/* Nome do vídeo ou slide */}
                  </Typography>
                  {isCurrent && (
                    <Typography
                      variant="body2"
                      sx={{
                        color: "#9041c1",
                        fontWeight: "bold",
                        mt: 0.5,
                        display: { xs: "none", sm: "block" },
                      }}
                    >
                      {isSlide ? "Slide atual" : "Vídeo atual"}
                    </Typography>
                  )}
                  {locked && !isSlide && (
                    <Typography
                      variant="body2"
                      sx={{
                        color: "#d32f2f",
                        fontWeight: "bold",
                        mt: 0.5,
                        display: { xs: "none", sm: "block" },
                      }}
                    >
                      Vídeo bloqueado
                    </Typography>
                  )}
                  {video.quizId && !locked && !isCurrent && !isSlide && (
                    <Typography
                      variant="body2"
                      color="textSecondary"
                      sx={{ display: { xs: "none", sm: "block" } }}
                    >
                      {video.quizPassed
                        ? "Quiz concluído ✅"
                        : quizLocked
                        ? "Quiz bloqueado 🔒"
                        : "Quiz pendente"}
                    </Typography>
                  )}
                </Box>
                {completed && !isSlide && (
                  <CheckCircleIcon
                    sx={{
                      color: "#4caf50",
                      fontSize: { xs: 20, sm: 24 },
                      ml: "10px",
                    }}
                  />
                )}
                {isSlide && (
                  <ViewCarouselIcon
                    sx={{
                      color: "#9041c1",
                      fontSize: { xs: 20, sm: 24 },
                      ml: "10px",
                    }}
                  />
                )}
                {locked && !isSlide && (
                  <LockIcon
                    sx={{
                      color: "#d32f2f",
                      fontSize: { xs: 20, sm: 24 },
                      ml: "10px",
                    }}
                  />
                )}
              </Box>
            </CardContent>

            <CardActions
              sx={{
                display: "flex",
                flexDirection: { xs: "row", sm: "row" }, // Horizontal em mobile
                justifyContent: { xs: "flex-end", sm: "space-between" }, // Ícones à direita em mobile
                gap: { xs: 1, sm: 2 },
                px: { xs: 1, sm: 2 },
                pb: { xs: 1, sm: 2 },
              }}
            >
              {/* Layout para telas menores (xs) */}
              <Box sx={{ display: { xs: "flex", sm: "none" }, gap: 1 }}>
                {isSlide ? (
                  // Ícone para slides em telas pequenas
                  <Tooltip title="Ver Slide">
                    <IconButton
                      onClick={() => handleVideoClick(video)}
                      sx={{
                        color: "#9041c1",
                        "&:hover": { color: "#7d37a7" },
                      }}
                    >
                      <ViewCarouselIcon sx={{ fontSize: { xs: 24 } }} />
                    </IconButton>
                  </Tooltip>
                ) : !locked ? (
                  <Tooltip
                    title={
                      isCurrent
                        ? "Ver este vídeo"
                        : video.watched
                        ? "Rever Vídeo"
                        : "Assistir Vídeo"
                    }
                  >
                    <span>
                      <IconButton
                        onClick={() => handleVideoClick(video)}
                        sx={{
                          color: "#9041c1",
                          "&:hover": { color: "#7d37a7" },
                        }}
                      >
                        <PlayCircleIcon sx={{ fontSize: { xs: 24 } }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                ) : (
                  <Tooltip title="Bloqueado">
                    <IconButton
                      onClick={() => handleLockedClick(video, previousVideo)}
                      sx={{
                        color: "#666",
                      }}
                    >
                      <LockIcon sx={{ fontSize: { xs: 24 } }} />
                    </IconButton>
                  </Tooltip>
                )}

                {!isSlide &&
                  video.quizId &&
                  !video.quizPassed &&
                  (quizLocked ? (
                    <Tooltip title="Quiz Bloqueado">
                      <IconButton
                        onClick={() => handleQuizLockedClick(video)}
                        sx={{
                          color: "#666",
                        }}
                      >
                        <LockIcon sx={{ fontSize: { xs: 24 } }} />
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Tooltip title="Fazer Quiz">
                      <IconButton
                        onClick={() => onQuizStart(video.quizId, video.id)}
                        sx={{
                          color: "#9041c1",
                          "&:hover": { color: "#7d37a7" },
                        }}
                      >
                        <QuizIcon sx={{ fontSize: { xs: 24 } }} />
                      </IconButton>
                    </Tooltip>
                  ))}

                {!isSlide && video.quizId && video.quizPassed && !locked && (
                  <Tooltip
                    title={
                      attemptsExhausted
                        ? "Limite de tentativas atingido"
                        : "Refazer Quiz"
                    }
                  >
                    <span>
                      <IconButton
                        onClick={
                          attemptsExhausted
                            ? () => handleMaxAttemptsReached(attemptLimit)
                            : () => onQuizStart(video.quizId, video.id)
                        }
                        sx={{
                          color: attemptsExhausted ? "#bdbdbd" : "#9041c1",
                          "&:hover": {
                            color: attemptsExhausted ? "#bdbdbd" : "#7d37a7",
                          },
                        }}
                        disabled={attemptsExhausted}
                      >
                        <ReplayIcon sx={{ fontSize: { xs: 24 } }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                )}
              </Box>

              {/* Layout para telas maiores (sm e acima) */}
              <Box
                sx={{
                  display: { xs: "none", sm: "flex" },
                  flexDirection: "row",
                  gap: 2,
                  width: "100%",
                  justifyContent: "space-between",
                }}
              >
                {isSlide ? (
                  // Para slides em telas maiores
                  <Box sx={{ display: "flex", gap: 2, width: "100%" }}>
                    <Button
                      variant="contained"
                      onClick={() => handleVideoClick(video)}
                      startIcon={
                        <ViewCarouselIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
                      }
                      sx={{
                        backgroundColor: "#9041c1",
                        borderRadius: "12px",
                        "&:hover": { backgroundColor: "#7d37a7" },
                        textTransform: "none",
                        fontWeight: 500,
                        fontSize: "0.875rem",
                        py: 1,
                        px: 3,
                        width: video.quizId ? "50%" : "100%",
                        minHeight: "45px",
                        color: "#fff",
                      }}
                    >
                      {isCurrent ? "Ver Slide" : "Abrir Slide"}
                    </Button>

                    {/* Botão de quiz para slides quando houver quiz associado */}
                    {video.quizId && (
                      <Button
                        variant="outlined"
                        onClick={() => onQuizStart(video.quizId, video.id)}
                        startIcon={
                          <QuizIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
                        }
                        sx={{
                          borderColor: "#9041c1",
                          color: "#9041c1",
                          borderRadius: "12px",
                          "&:hover": {
                            borderColor: "#7d37a7",
                            backgroundColor: "rgba(144, 65, 193, 0.04)",
                          },
                          textTransform: "none",
                          fontWeight: 500,
                          fontSize: "0.875rem",
                          py: 1,
                          px: 3,
                          width: "50%",
                          minHeight: "45px",
                        }}
                      >
                        {video.quizPassed ? "Refazer Quiz" : "Fazer Quiz"}
                      </Button>
                    )}
                  </Box>
                ) : !locked ? (
                  <Button
                    variant="contained"
                    onClick={() => handleVideoClick(video)}
                    startIcon={
                      <PlayCircleIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
                    }
                    sx={{
                      backgroundColor: "#9041c1",
                      borderRadius: "12px",
                      "&:hover": { backgroundColor: "#7d37a7" },
                      textTransform: "none",
                      fontWeight: 500,
                      fontSize: "0.875rem",
                      py: 1,
                      px: 3,
                      width: "100%",
                      minHeight: "45px",
                      color: "#fff",
                    }}
                  >
                    {isCurrent
                      ? "Ver Vídeo"
                      : video.watched
                      ? "Rever Vídeo"
                      : "Assistir"}
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    onClick={() => handleLockedClick(video, previousVideo)}
                    startIcon={
                      <LockIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
                    }
                    sx={{
                      backgroundColor: "#e0e0e0",
                      borderRadius: "12px",
                      color: "#666",
                      textTransform: "none",
                      fontWeight: 500,
                      fontSize: "0.875rem",
                      py: 1,
                      px: 3,
                      width: "100%",
                      minHeight: "45px",
                    }}
                  >
                    Bloqueado
                  </Button>
                )}

                {/* Para vídeos com quiz, manter a lógica original */}
                {!isSlide &&
                  video.quizId &&
                  !video.quizPassed &&
                  (quizLocked ? (
                    <Button
                      variant="contained"
                      onClick={() => handleQuizLockedClick(video)}
                      startIcon={
                        <LockIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
                      }
                      sx={{
                        backgroundColor: "#e0e0e0",
                        borderRadius: "12px",
                        color: "#666",
                        textTransform: "none",
                        fontWeight: 500,
                        fontSize: "0.875rem",
                        py: 1,
                        px: 3,
                        width: "100%",
                        minHeight: "45px",
                      }}
                    >
                      Quiz Bloqueado
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      onClick={() => onQuizStart(video.quizId, video.id)}
                      startIcon={
                        <QuizIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
                      }
                      sx={{
                        backgroundColor: "#9041c1",
                        borderRadius: "12px",
                        "&:hover": { backgroundColor: "#7d37a7" },
                        textTransform: "none",
                        fontWeight: 500,
                        fontSize: "0.875rem",
                        py: 1,
                        px: 3,
                        width: "100%",
                        minHeight: "45px",
                      }}
                    >
                      Fazer Quiz
                    </Button>
                  ))}

                {!isSlide && video.quizId && video.quizPassed && !locked && (
                  <Button
                    variant="outlined"
                    onClick={
                      attemptsExhausted
                        ? () => handleMaxAttemptsReached(attemptLimit)
                        : () => onQuizStart(video.quizId, video.id)
                    }
                    startIcon={
                      <ReplayIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
                    }
                    sx={{
                      borderColor: attemptsExhausted ? "#bdbdbd" : "#9041c1",
                      color: attemptsExhausted ? "#bdbdbd" : "#9041c1",
                      borderRadius: "12px",
                      "&:hover": {
                        borderColor: attemptsExhausted ? "#bdbdbd" : "#7d37a7",
                        color: attemptsExhausted ? "#bdbdbd" : "#7d37a7",
                      },
                      textTransform: "none",
                      fontWeight: 500,
                      fontSize: "0.875rem",
                      py: 1,
                      px: 3,
                      width: "100%",
                      minHeight: "45px",
                    }}
                    disabled={attemptsExhausted}
                  >
                    {attemptsExhausted ? "Limite Atingido" : "Refazer Quiz"}
                  </Button>
                )}
              </Box>
            </CardActions>
          </Card>
        );
      })}

      {/* Nova seção para slides com quiz */}
      {slideQuizzes && slideQuizzes.length > 0 && (
        <>
          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Slides com Quiz
          </Typography>
          <List>
            {slideQuizzes.map((quiz) => {
              const slide = course.slides.find((s) => s.id === quiz.slideId);
              return (
                <ListItem
                  key={quiz.slideId}
                  sx={{
                    cursor: "pointer",
                    backgroundColor: "#f5f5f5",
                    borderRadius: "8px",
                    mb: 1,
                    p: 2,
                  }}
                  onClick={() => handleVideoClick(slide)}
                >
                  <ListItemIcon>
                    <ViewCarouselIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      slide?.title || `Slide ${quiz.slideId.substring(0, 6)}`
                    }
                    secondary="Quiz disponível"
                  />
                  <QuizIcon color="primary" />
                </ListItem>
              );
            })}
          </List>
        </>
      )}
    </Box>
  );
};

export default VideoList;
