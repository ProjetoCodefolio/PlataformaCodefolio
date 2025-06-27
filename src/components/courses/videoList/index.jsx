import React from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Tooltip,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import LockIcon from "@mui/icons-material/Lock";
import ReplayIcon from "@mui/icons-material/Replay";
import QuizIcon from "@mui/icons-material/Quiz";
import { toast } from "react-toastify";

const VideoList = ({
  videos,
  setCurrentVideo,
  onQuizStart,
  currentVideoId,
  userQuizAttempts = {}, // Novo parâmetro para controlar tentativas
  maxAttempts = 1, // Número máximo de tentativas permitidas
}) => {
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

  const handleQuizLockedClick = (video) => {
    toast.warn(
      `Você precisa assistir o vídeo "${video.title}" para liberar o quiz!`
    );
  };

  // Função para lidar com o clique no botão de assistir vídeo
  const handleVideoClick = (video) => {
    setCurrentVideo(video);
  };

  console.log(userQuizAttempts)

    // Função para verificar se o usuário atingiu o limite de tentativas
  const hasReachedAttemptLimit = (quizId) => {
    // Verificar se userQuizAttempts existe antes de acessar a propriedade
    if (!userQuizAttempts) return false;
    
    // Extrair apenas o videoId do quizId completo (formato: courseId/videoId)
    const videoId = quizId.split('/')[1];
    
    // Verificar se o videoId existe em userQuizAttempts
    // E se o usuário já alcançou o número máximo de tentativas
    return Object.keys(userQuizAttempts).some(key => {
      // Verificar se a chave é exatamente igual ao videoId
      if (key === videoId) return true;
      
      // Verificar se o quiz está na parte final da chave (caso seja armazenado como courseId/videoId)
      if (key.endsWith(`/${videoId}`)) return true;
      
      return false;
    });
  };

  // Função para exibir mensagem quando tentar refazer quiz após limite de tentativas
  const handleMaxAttemptsReached = () => {
    toast.info(`Você já atingiu o limite de ${maxAttempts} tentativas para este quiz.`, {
      position: "bottom-center",
      autoClose: 5000,
    });
  };

  return (
    <Box>
      {videos.map((video, index) => {
        const previousVideo = index > 0 ? videos[index - 1] : null;
        const isLocked =
          video.requiresPrevious &&
          previousVideo &&
          (!previousVideo.watched ||
            (previousVideo.quizId && !previousVideo.quizPassed));
        const isCompleted =
          video.watched && (!video.quizId || video.quizPassed);
        const isCurrent = video.id === currentVideoId;
        const isQuizLocked = !video.watched;
        const quizAttemptsExhausted = video.quizId && hasReachedAttemptLimit(video.quizId);
        console.log(quizAttemptsExhausted)

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
              opacity: isLocked ? 0.5 : 1,
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
                    {video.title} {/* Nome do vídeo */}
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
                      Vídeo atual
                    </Typography>
                  )}
                  {isLocked && (
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
                  {video.quizId && !isLocked && !isCurrent && (
                    <Typography
                      variant="body2"
                      color="textSecondary"
                      sx={{ display: { xs: "none", sm: "block" } }}
                    >
                      {video.quizPassed
                        ? "Quiz concluído ✅"
                        : isQuizLocked
                        ? "Quiz bloqueado 🔒"
                        : "Quiz pendente"}
                    </Typography>
                  )}
                </Box>
                {isCompleted && (
                  <CheckCircleIcon
                    sx={{
                      color: "#4caf50",
                      fontSize: { xs: 20, sm: 24 },
                      ml: "10px",
                    }}
                  />
                )}
                {isLocked && (
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
                {!isLocked ? (
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

                {video.quizId &&
                  !video.quizPassed &&
                  (isQuizLocked ? (
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

                {video.quizId && video.quizPassed && !isLocked && (
                  <Tooltip title={quizAttemptsExhausted ? "Limite de tentativas atingido" : "Refazer Quiz"}>
                    <span>
                      <IconButton
                        onClick={quizAttemptsExhausted ? handleMaxAttemptsReached : () => onQuizStart(video.quizId, video.id)}
                        sx={{
                          color: quizAttemptsExhausted ? "#bdbdbd" : "#9041c1",
                          "&:hover": { color: quizAttemptsExhausted ? "#bdbdbd" : "#7d37a7" },
                        }}
                        disabled={quizAttemptsExhausted}
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
                {!isLocked ? (
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

                {video.quizId &&
                  !video.quizPassed &&
                  (isQuizLocked ? (
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

                {video.quizId && video.quizPassed && !isLocked && (
                  <Button
                    variant="outlined"
                    onClick={quizAttemptsExhausted ? handleMaxAttemptsReached : () => onQuizStart(video.quizId, video.id)}
                    startIcon={
                      <ReplayIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
                    }
                    sx={{
                      borderColor: quizAttemptsExhausted ? "#bdbdbd" : "#9041c1",
                      color: quizAttemptsExhausted ? "#bdbdbd" : "#9041c1",
                      borderRadius: "12px",
                      "&:hover": { borderColor: quizAttemptsExhausted ? "#bdbdbd" : "#7d37a7", color: quizAttemptsExhausted ? "#bdbdbd" : "#7d37a7" },
                      textTransform: "none",
                      fontWeight: 500,
                      fontSize: "0.875rem",
                      py: 1,
                      px: 3,
                      width: "100%",
                      minHeight: "45px",
                    }}
                    disabled={quizAttemptsExhausted}
                  >
                    {quizAttemptsExhausted ? "Limite Atingido" : "Refazer Quiz"}
                  </Button>
                )}
              </Box>
            </CardActions>
          </Card>
        );
      })}
    </Box>
  );
};

export default VideoList;
