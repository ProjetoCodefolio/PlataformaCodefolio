import React, { useState, useEffect, useRef, forwardRef } from "react";
import PropTypes from "prop-types";
import { ref as databaseRef, get } from "firebase/database";
import { database } from "../../../service/firebase";
import { useAuth } from "../../../context/AuthContext";
import { Box, Typography, IconButton, Button } from "@mui/material";
import YouTube from "react-youtube";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import LockIcon from "@mui/icons-material/Lock";
import SchoolIcon from "@mui/icons-material/School";
import { handleGoogleSignIn } from "../../../utils/authUtils";
import { useNavigate } from "react-router-dom";
import { getYouTubeID } from "../../../utils/postUtils";
import { VideoWatcher } from "./VideoWatcher";

export const styles = `
  .youtube-player .ytp-chrome-bottom,
  .youtube-player .html5-video-container {
    background-color: #F5F5FA !important;
  }
  .youtube-player iframe {
    background-color: #F5F5FA !important;
  }
`;

const VideoPlayer = forwardRef(
  (
    {
      video,
      onProgress,
      videos,
      onVideoChange,
      setShowQuiz,
      setCurrentVideoId,
      onVideoProgressUpdate,
      onOpenQuizGigi,
    },
    ref
  ) => {
    const { userDetails } = useAuth();
    const [player, setPlayer] = useState(null);
    const [percentageWatched, setPercentageWatched] = useState(
      video?.progress || 0
    );
    const [watchTime, setWatchTime] = useState(video?.watchedTime || 0);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [isVideoLocked, setIsVideoLocked] = useState(false);
    const videoRef = useRef(null);
    const hasNotifiedRef = useRef(video?.watched || false);
    const navigate = useNavigate();

    const handleLogin = async () => {
      try {
        await handleGoogleSignIn(null);
      } catch (error) {
        console.error("Erro no login:", error);
      }
    };

    const onReady = (event) => {
      ref.current = {
        seekTo: (time) => event.target.seekTo(time),
        updateProgress: (progress, time) => {
          setPercentageWatched(progress);
          setWatchTime(time);
        },
        player: event.target,
      };
      setPlayer(event.target);
      event.target.seekTo(video?.watchedTime || 0);
    };

    useEffect(() => {
      if (!userDetails?.userId && video && videos) {
        const videoIndex = videos.findIndex((v) => v.id === video.id);
        if (videoIndex > 1) {
          setIsVideoLocked(true);
          setShowLoginModal(true);
        } else {
          setIsVideoLocked(false);
        }
      } else {
        setIsVideoLocked(false);
      }
    }, [video, videos, userDetails]);

    useEffect(() => {
      const fetchWatchData = async () => {
        if (!video?.id || !video?.courseId || !userDetails?.userId) return;

        try {
          const progressRef = databaseRef(
            database,
            `videoProgress/${userDetails.userId}/${video.courseId}/${video.id}`
          );
          const snapshot = await get(progressRef);
          if (snapshot.exists()) {
            const data = snapshot.val();
            setWatchTime(data.watchedTimeInSeconds || 0);
            setPercentageWatched(data.percentageWatched || 0);
            hasNotifiedRef.current = data.watched || false;
          } else {
            setWatchTime(video.watchedTime || 0);
            setPercentageWatched(video.progress || 0);
          }
        } catch (error) {
          console.error("Erro ao buscar tempo assistido:", error);
        }
      };

      fetchWatchData();
    }, [video, userDetails]);

    useEffect(() => {
      const styleSheet = document.createElement("style");
      styleSheet.textContent = styles;
      document.head.appendChild(styleSheet);
      return () => document.head.removeChild(styleSheet);
    }, []);

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
            Erro: Nenhum vídeo disponível
          </Typography>
        </Box>
      );
    }

    if (isVideoLocked) {
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

    // Função auxiliar para pausar vídeo
    const pauseVideo = () => {
      try {
        // Tentativa 1: Pausar vídeo HTML5
        if (videoRef.current && typeof videoRef.current.pause === "function") {
          videoRef.current.pause();
          return true;
        }

        // Tentativa 2: Pausar YouTube player
        if (player && typeof player.pauseVideo === "function") {
          player.pauseVideo();
          return true;
        }

        console.warn("Nenhum método de pausa disponível");
        return false;
      } catch (error) {
        console.error("Erro ao pausar vídeo:", error);
        return false;
      }
    };

    // Expor métodos via ref
    useEffect(() => {
      if (ref) {
        ref.current = {
          pause: pauseVideo,
          // Outros métodos que você já tenha...
          seekTo: (time) => {
            if (player && player.seekTo) {
              player.seekTo(time);
            }
          },
          // ... outros métodos
        };
      }
    }, [player, ref]);

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

          {userDetails?.role === "admin" && onOpenQuizGigi && (
            <IconButton
              onClick={onOpenQuizGigi}
              sx={{
                color: "#fff",
                bgcolor: "#9041c1",
                ml: "auto",
                mr: 1,
                p: 0.8,
                "&:hover": {
                  bgcolor: "#7a35a3",
                },
              }}
            >
              <SchoolIcon sx={{ fontSize: "18px" }} />
            </IconButton>
          )}
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
          {video.url.includes("youtube.com") ||
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
            <video
              ref={videoRef}
              src={video.url}
              controls
              style={{
                width: "100%",
                borderRadius: "12px",
                objectFit: "cover",
                backgroundColor: "#F5F5FA",
              }}
            />
          )}
        </Box>

        {player && (
          <VideoWatcher
            player={player}
            videoId={video.id}
            courseId={video.courseId}
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
  }).isRequired,
  onProgress: PropTypes.func,
  videos: PropTypes.array.isRequired,
  onVideoChange: PropTypes.func.isRequired,
  setShowQuiz: PropTypes.func.isRequired,
  setCurrentVideoId: PropTypes.func.isRequired,
  onVideoProgressUpdate: PropTypes.func,
  onOpenQuizGigi: PropTypes.func,
};

VideoPlayer.displayName = "VideoPlayer";

export default VideoPlayer;
