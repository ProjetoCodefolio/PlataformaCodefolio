import React, {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import PropTypes from "prop-types";
import {
  Box,
  Typography,
  IconButton,
  Button,
  CircularProgress,
} from "@mui/material";
import YouTube from "react-youtube";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import LockIcon from "@mui/icons-material/Lock";
import SchoolIcon from "@mui/icons-material/School";
import PersonIcon from "@mui/icons-material/Person";
import SlideshowIcon from "@mui/icons-material/Slideshow";
import ReportIcon from "@mui/icons-material/Report";
import EditIcon from "@mui/icons-material/Edit";
import { handleGoogleSignIn } from "$api/services/auth";
import { useNavigate } from "react-router-dom";
import { getYouTubeID } from "../../../utils/postUtils";
import { VideoWatcher } from "./VideoWatcher";
import { useAuth } from "$context/AuthContext";
import { fetchVideoProgress } from "$api/services/courses/videoProgress";
import { isVideoLocked } from "$api/utils/videoUtils";
import { toast } from "react-toastify";
import ReportModal from "$components/common/reportModal";
import { prepareSlideUrl } from "$api/services/courses/slides";

export const styles = `
  .youtube-player .ytp-chrome-bottom,
  .youtube-player .html5-video-container {
    background-color: #F5F5FA !important;
  }
  .youtube-player iframe {
    background-color: #F5F5FA !important;
  }
  .slide-iframe {
    border: none;
    border-radius: 12px;
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  }
`;

export const VideoPlayer = forwardRef(
  (
    {
      video,
      courseId,
      onProgress,
      videos,
      onVideoChange,
      setShowQuiz,
      setCurrentVideoId,
      onVideoProgressUpdate,
      onOpenQuizGigi,
      courseOwnerUid,
      onOpenSlide,
      hasSlide,
    },
    ref
  ) => {
    const { userDetails, refreshUserDetails } = useAuth();
    const [player, setPlayer] = useState(null);
    const [percentageWatched, setPercentageWatched] = useState(
      video?.progress || 0
    );
    const [watchTime, setWatchTime] = useState(video?.watchedTime || 0);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [isVideoLockedState, setIsVideoLockedState] = useState(false);
    const [playerLoadAttempt, setPlayerLoadAttempt] = useState(0);
    const [playerError, setPlayerError] = useState(false);
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [hasSlideQuiz, setHasSlideQuiz] = useState(false);
    const videoRef = useRef(null);
    const hasNotifiedRef = useRef(video?.watched || false);
    const navigate = useNavigate();
    const playerRef = useRef(null);
    const [showControls, setShowControls] = useState(true);

    const handleLogin = async () => {
      try {
        await handleGoogleSignIn(
          null,
          async () => {
            await refreshUserDetails();
          },
          null,
          refreshUserDetails
        );
      } catch (error) {
        console.error("Erro no login:", error);
      }
    };

    const onReady = (event) => {
      const playerInstance = event.target;

      if (!playerInstance) {
        return;
      }

      const isPlayerReady = () => {
        try {
          return (
            playerInstance &&
            typeof playerInstance.getPlayerState === "function" &&
            playerInstance.getPlayerState() !== undefined
          );
        } catch (e) {
          return false;
        }
      };

      const safeSeekTo = (time) => {
        try {
          if (!isPlayerReady()) {
            return;
          }
          playerInstance.seekTo(time);
        } catch (e) {
          console.error("Erro ao chamar seekTo:", e);
        }
      };

      ref.current = {
        seekTo: safeSeekTo,
        updateProgress: (progress, time) => {
          setPercentageWatched(progress);
          setWatchTime(time);
        },
        player: playerInstance,
        pause: () => {
          try {
            if (isPlayerReady()) {
              playerInstance.pauseVideo();
            }
          } catch (e) {
            console.error("Erro ao pausar vídeo:", e);
          }
        },
        getCurrentTime: () => {
          try {
            return isPlayerReady() ? playerInstance.getCurrentTime() : 0;
          } catch (e) {
            console.error("Erro ao obter tempo atual:", e);
            return 0;
          }
        },
        getDuration: () => {
          try {
            return isPlayerReady() ? playerInstance.getDuration() : 0;
          } catch (e) {
            console.error("Erro ao obter duração:", e);
            return 0;
          }
        },
      };

      setPlayer(playerInstance);

      const startTime = video?.watchedTime || 0;
      if (startTime > 0) {
        let attempts = 0;
        const maxAttempts = 5;

        const trySeekTo = () => {
          if (attempts >= maxAttempts) {
            return;
          }

          attempts++;

          try {
            if (
              isPlayerReady() &&
              playerInstance.getIframe &&
              playerInstance.getIframe() &&
              playerInstance.getIframe().src
            ) {
              const duration = playerInstance.getDuration();
              if (isNaN(duration) || duration <= 0) {
                setTimeout(trySeekTo, 1000 * attempts);
                return;
              }

              const safeTime = Math.min(startTime, duration - 1);
              playerInstance.seekTo(safeTime);
            } else {
              setTimeout(trySeekTo, 1000 * attempts);
            }
          } catch (e) {
            setTimeout(trySeekTo, 1000 * attempts);
          }
        };

        setTimeout(trySeekTo, 1500);
      }
    };

    useEffect(() => {
      if (!userDetails?.userId && video && videos) {
        const videoIndex = videos.findIndex((v) => v.id === video.id);
        if (videoIndex > 1) {
          setIsVideoLockedState(true);
          setShowLoginModal(true);
        } else {
          setIsVideoLockedState(false);
        }
      } else {
        setIsVideoLockedState(false);
      }
    }, [video, videos, userDetails]);

    useEffect(() => {
      const fetchWatchData = async () => {
        if (!video?.id || !video?.courseId) return;

        try {
          setWatchTime(0);
          setPercentageWatched(0);
          hasNotifiedRef.current = false;

          if (!userDetails?.userId) {
            setWatchTime(video.watchedTime || 0);
            setPercentageWatched(video.progress || 0);
            return;
          }

          const progress = await fetchVideoProgress(
            userDetails.userId,
            video.courseId,
            video.id
          );

          setWatchTime(progress.watchedTime);
          setPercentageWatched(progress.percentageWatched);
        } catch (error) {
          console.error("Erro ao buscar dados do vídeo:", error);
        }
      };

      fetchWatchData();

      return () => {
        setWatchTime(0);
        setPercentageWatched(0);
        hasNotifiedRef.current = false;
      };
    }, [video?.id, video?.courseId, userDetails?.userId]);

    useEffect(() => {
      const styleSheet = document.createElement("style");
      styleSheet.textContent = styles;
      document.head.appendChild(styleSheet);
      return () => document.head.removeChild(styleSheet);
    }, []);

    useEffect(() => {
      if (video?.id) {
        setPercentageWatched(video.progress || 0);
        setWatchTime(video.watchedTime || 0);

        if (player && video.watchedTime > 0) {
          try {
            setTimeout(() => {
              if (player && typeof player.seekTo === "function") {
                player.seekTo(video.watchedTime);
              }
            }, 1000);
          } catch (error) {
            console.error("Erro ao posicionar vídeo:", error);
          }
        }
      }
    }, [video?.id, video?.watchedTime, video?.progress]);

    const handleViewStudents = () => {
      navigate(
        `/studentDashboard?quizId=${
          video.quizId?.split("/")[1] || video.quizId
        }`
      );
    };

    const handleOpenSlide = (videoId, quizId = null, slide = null) => {
      if (
        videoPlayerRef.current &&
        typeof videoPlayerRef.current.pause === "function"
      ) {
        videoPlayerRef.current.pause();
      }

      if (slide) {
        setSlideData(slide);
        setShowSlidePlayer(true);
        return;
      }

      let foundSlides = [];

      if (videoId) {
        foundSlides = videoSlides[videoId] || [];
      } else if (quizId) {
        const quizKey = `quiz_${quizId}`;
        foundSlides = videoSlides[quizKey] || [];
      }

      if (foundSlides.length > 0) {
        setSlideData(foundSlides[0]);
        setShowSlidePlayer(true);
      }
    };

    useEffect(() => {
      if (playerError && playerLoadAttempt < 3) {
        const timer = setTimeout(() => {
          setPlayerLoadAttempt((prev) => prev + 1);
          setPlayerError(false);
        }, 2000);

        return () => clearTimeout(timer);
      }
    }, [playerError, playerLoadAttempt]);

    const pauseVideo = () => {
      try {
        if (videoRef.current && typeof videoRef.current.pause === "function") {
          videoRef.current.pause();
          return true;
        }

        if (player && typeof player.pauseVideo === "function") {
          player.pauseVideo();
          return true;
        }

        return false;
      } catch (error) {
        console.error("Erro ao pausar vídeo:", error);
        return false;
      }
    };

    const isSlide = video.isSlide || video.type === "slide";

    useImperativeHandle(ref, () => ({
      pause: () => {
        if (playerRef.current && !isSlide) {
          playerRef.current.internalPlayer.pauseVideo();
        }
      },
      getCurrentTime: () => {
        if (playerRef.current && !isSlide) {
          return playerRef.current.internalPlayer.getCurrentTime();
        }
        return 0;
      },
      getDuration: () => {
        if (playerRef.current && !isSlide) {
          return playerRef.current.internalPlayer.getDuration();
        }
        return 0;
      },
    }));

    const formatSlideUrl = (url) => {
      if (!url) return "";

      try {
        url = url.trim();

        if (url.includes("<iframe") && url.includes("src=")) {
          const srcMatch = url.match(/src=["']([^"']+)["']/);
          if (srcMatch && srcMatch[1]) {
            return srcMatch[1];
          }
        }

        if (url.includes("embed") && url.includes("docs.google.com")) {
          return url;
        }

        if (url.includes("docs.google.com/presentation")) {
          if (url.includes("/edit")) {
            const baseUrl = url.split(/[?#]/)[0];
            return `${baseUrl.replace(
              "/edit",
              "/embed"
            )}?start=false&loop=false&delayms=3000`;
          }

          if (url.includes("/pub")) {
            return url.replace("/pub", "/embed");
          }

          if (!url.includes("/embed")) {
            const baseUrl = url.split(/[?#]/)[0];
            return `${baseUrl}/embed?start=false&loop=false&delayms=3000`;
          }
        }

        return url;
      } catch (error) {
        console.error("Erro ao formatar URL do slide:", error);
        return url;
      }
    };

    useEffect(() => {
      const checkForSlideQuiz = async () => {
        if (isSlide && video && video.id && video.courseId) {
          try {
            const hasQuiz = await checkSlideHasQuiz(video.courseId, video.id);
            setHasSlideQuiz(hasQuiz);
          } catch (error) {
            console.error("Erro ao verificar quiz do slide:", error);
          }
        }
      };

      checkForSlideQuiz();
    }, [isSlide, video]);

    const handleEditCourse = () => {
      navigate(`/adm-cursos?courseId=${courseId}`);
    };

    const canEditCourse = () => {
      if (!userDetails) return false;

      // Verifica se é admin
      if (userDetails.role === "admin") return true;

      // Verifica se é o dono do curso
      if (userDetails.userId === courseOwnerUid) return true;

      return false;
    };

    if (!video || !video.url) {
      return (
        <Box
          sx={{
            p: { xs: 2, sm: 4 },
            textAlign: "center",
            backgroundColor: "#F5F5FA",
          }}
        >
          <Typography variant="h6" color="error">
            Erro: Nenhum conteúdo disponível
          </Typography>
        </Box>
      );
    }

    if (isVideoLockedState) {
      return (
        <Box
          sx={{
            width: "100%",
            maxWidth: { xs: "90%", sm: "780px" },
            mx: "auto",
            p: { xs: 1.5, sm: 4 },
            textAlign: "center",
            backgroundColor: "#F5F5FA",
            borderRadius: "12px",
            boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: { xs: 1, sm: 2 },
            minHeight: { xs: "auto", sm: "200px" },
          }}
        >
          <LockIcon sx={{ fontSize: { xs: 30, sm: 40 }, color: "#9041c1" }} />
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              color: "#555",
              fontSize: { xs: "1rem", sm: "1.25rem" },
              lineHeight: 1.2,
            }}
          >
            Conteúdo Bloqueado
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: "#666",
              maxWidth: { xs: "100%", sm: "400px" },
              fontSize: { xs: "0.85rem", sm: "1rem" },
              lineHeight: 1.4,
            }}
          >
            Faça login para acessar este vídeo e continuar seu curso!
          </Typography>
          <Button
            variant="contained"
            onClick={handleLogin}
            sx={{
              backgroundColor: "#9041c1",
              color: "#fff",
              fontWeight: 600,
              px: { xs: 2, sm: 3 },
              py: { xs: 0.5, sm: 1 },
              borderRadius: "8px",
              "&:hover": {
                backgroundColor: "#7a35a3",
              },
              fontSize: { xs: "0.8rem", sm: "1rem" },
              minWidth: { xs: "120px", sm: "auto" },
            }}
          >
            Fazer Login
          </Button>
        </Box>
      );
    }

    return (
      <Box
        sx={{
          width: "100%",
          maxWidth: { xs: "100%", sm: "840px" },
          mx: "auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          backgroundColor: "#F5F5FA",
        }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth: { xs: "100%", sm: "780px" },
            display: "flex",
            alignItems: "center",
            mb: 2,
            ml: { xs: 0, sm: 2 },
          }}
        >
          <IconButton
            onClick={() => navigate(-1)}
            sx={{
              color: "#9041c1",
              mr: 1,
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              color: "#555",
              fontSize: { xs: "1rem", sm: "1.25rem" },
            }}
          >
            {video.title.split(" - ")[0]}
          </Typography>

          <Box sx={{ display: "flex", ml: "auto" }}>
            {hasSlide && (
              <IconButton
                onClick={handleOpenSlide}
                sx={{
                  color: "#fff",
                  bgcolor: "#9041c1",
                  mr: 1,
                  p: 0.8,
                  "&:hover": {
                    bgcolor: "#7a35a3",
                  },
                }}
                title="Ver Slides"
              >
                <SlideshowIcon sx={{ fontSize: "18px" }} />
              </IconButton>
            )}

            {userDetails?.userId === courseOwnerUid && video.quizId && (
              <>
                <IconButton
                  onClick={handleViewStudents}
                  sx={{
                    color: "#fff",
                    bgcolor: "#9041c1",
                    mr: 1,
                    p: 0.8,
                    "&:hover": {
                      bgcolor: "#7a35a3",
                    },
                  }}
                  title="Ver resultados dos estudantes"
                >
                  <PersonIcon sx={{ fontSize: "18px" }} />
                </IconButton>

                {onOpenQuizGigi && (
                  <IconButton
                    onClick={onOpenQuizGigi}
                    sx={{
                      color: "#fff",
                      bgcolor: "#9041c1",
                      mr: 1,
                      p: 0.8,
                      "&:hover": {
                        bgcolor: "#7a35a3",
                      },
                    }}
                    title="Abrir Quiz Gigi"
                  >
                    <SchoolIcon sx={{ fontSize: "18px" }} />
                  </IconButton>
                )}
              </>
            )}

            {canEditCourse() && (
              <IconButton
                onClick={handleEditCourse}
                sx={{
                  color: "#fff",
                  bgcolor: "#9041c1",
                  mr: 1,
                  p: 0.8,
                  "&:hover": {
                    bgcolor: "#7a35a3",
                  },
                }}
                title="Editar curso"
              >
                <EditIcon sx={{ fontSize: "18px" }} />
              </IconButton>
            )}

            <IconButton
              onClick={() => setReportModalOpen(true)}
              sx={{
                color: "#fff",
                bgcolor: "#f44336",
                mr: 1,
                p: 0.8,
                "&:hover": {
                  bgcolor: "#d32f2f",
                },
              }}
              title="Reportar problema"
            >
              <ReportIcon sx={{ fontSize: "18px" }} />
            </IconButton>
          </Box>
        </Box>

        <Box
          sx={{
            width: "100%",
            maxWidth: { xs: "100%", sm: "780px" },
            position: "relative",
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
            ml: { xs: 0, sm: 2 },
            backgroundColor: "#F5F5FA",
          }}
        >
          {isSlide ? (
            <Box
              sx={{
                width: "100%",
                paddingTop: "56.25%",
                position: "relative",
                backgroundColor: "#F5F5FA",
                overflow: "hidden",
              }}
            >
              <iframe
                src={formatSlideUrl(video.url)}
                title={video.title}
                className="slide-iframe"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  border: "none",
                }}
                allowFullScreen
                frameBorder="0"
              />
            </Box>
          ) : video.url.includes("youtube.com") ||
            video.url.includes("youtu.be") ? (
            <Box
              sx={{
                width: "100%",
                paddingTop: "56.25%",
                position: "relative",
                backgroundColor: "#F5F5FA",
                overflow: "hidden",
              }}
            >
              <YouTube
                videoId={getYouTubeID(video.url)}
                opts={{
                  width: "100%",
                  height: "100%",
                  playerVars: {
                    autoplay: 0,
                    modestbranding: 1,
                    rel: 0,
                    fs: 1,
                    iv_load_policy: 3,
                  },
                }}
                onReady={onReady}
                onError={(e) => {
                  setPlayerError(true);
                }}
                key={`player-${video.id}-${playerLoadAttempt}`}
                className="youtube-player"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  backgroundColor: "#F5F5FA",
                }}
              />
            </Box>
          ) : (
            <Box
              sx={{
                width: "100%",
                paddingTop: "56.25%",
                position: "relative",
                backgroundColor: "#F5F5FA",
                overflow: "hidden",
              }}
            >
              <Typography
                sx={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                }}
              >
                Formato de vídeo não suportado
              </Typography>
            </Box>
          )}
        </Box>

        {player && !isSlide && (
          <VideoWatcher
            player={player}
            videoId={video.id}
            courseId={courseId}
            onProgress={onProgress}
            hasNotifiedRef={hasNotifiedRef}
            watchTime={watchTime}
            setWatchTime={setWatchTime}
            percentageWatched={percentageWatched}
            setPercentageWatched={setPercentageWatched}
            videos={videos}
            currentVideo={video}
            onVideoChange={onVideoChange}
            setShowQuiz={setShowQuiz}
            setCurrentVideoId={setCurrentVideoId}
            onVideoProgressUpdate={onVideoProgressUpdate}
            advancedSettings={video.advancedSettings} // Adicione esta linha
          />
        )}

        {video.description && (
          <Box
            sx={{
              width: "100%",
              maxWidth: { xs: "100%", sm: "780px" },
              mt: { xs: 2, sm: 3 },
              ml: { xs: 0, sm: 2 },
              backgroundColor: "#F5F5FA",
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 600, mb: 1, color: "#555" }}
            >
              Descrição:
            </Typography>
            <Typography variant="body2" sx={{ color: "#666", lineHeight: 1.6 }}>
              {video.description.split("\n").map((line, index) => (
                <React.Fragment key={index}>
                  {line}
                  {index < video.description.split("\n").length - 1 && <br />}
                </React.Fragment>
              ))}
            </Typography>
          </Box>
        )}

        {isSlide && hasSlideQuiz && (
          <Button
            variant="contained"
            onClick={() => onShowQuiz && onShowQuiz(video.id)}
            sx={{
              backgroundColor: "#9041c1",
              color: "#fff",
              mt: 2,
              fontWeight: 600,
              "&:hover": {
                backgroundColor: "#7a35a3",
              },
            }}
            startIcon={<SchoolIcon />}
          >
            Responder Quiz
          </Button>
        )}

        <ReportModal
          open={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          reportType={isSlide ? "slide" : "video"}
          itemId={video?.id}
          courseId={video?.courseId || courseId}
          userId={userDetails?.userId || "anonymous"}
          userName={userDetails?.displayName || "Usuário Anônimo"}
          currentTime={
            !isSlide && player?.getCurrentTime ? player.getCurrentTime() : 0
          }
        />
      </Box>
    );
  }
);

VideoPlayer.propTypes = {
  video: PropTypes.shape({
    id: PropTypes.string,
    courseId: PropTypes.string,
    title: PropTypes.string,
    url: PropTypes.string.isRequired,
    description: PropTypes.string,
    progress: PropTypes.number,
    watchedTime: PropTypes.number,
    watched: PropTypes.bool,
    quizId: PropTypes.string,
    isSlide: PropTypes.bool,
    type: PropTypes.string,
  }).isRequired,
  onProgress: PropTypes.func,
  videos: PropTypes.array.isRequired,
  onVideoChange: PropTypes.func.isRequired,
  setShowQuiz: PropTypes.func.isRequired,
  setCurrentVideoId: PropTypes.func.isRequired,
  onVideoProgressUpdate: PropTypes.func,
  onOpenQuizGigi: PropTypes.func,
  onOpenSlide: PropTypes.func,
  hasSlide: PropTypes.bool,
  courseOwnerUid: PropTypes.string,
};

VideoPlayer.displayName = "VideoPlayer";

export default VideoPlayer;
