import React, { useState, forwardRef } from "react";
import PropTypes from "prop-types";
import { Box, Typography, IconButton, Button } from "@mui/material";
import YouTube from "react-youtube";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SchoolIcon from "@mui/icons-material/School";
import { handleGoogleSignIn } from "$api/services/auth";
import { useNavigate } from "react-router-dom";
import { getYouTubeID } from "../../../utils/postUtils";
import { VideoWatcher } from "./VideoWatcher";
import { useAuth } from "$context/AuthContext";
import ReportModal from "$components/common/reportModal";
import VideoComments from "$components/courses/videoComments/VideoComments";
import LockedVideoGate from "./LockedVideoGate";
import VideoPlayerActionBar from "./VideoPlayerActionBar";
import { useInjectedPlayerStyles } from "./hooks/useInjectedPlayerStyles";
import { useVideoLockGate } from "./hooks/useVideoLockGate";
import { useYoutubePlayerImperative } from "./hooks/useYoutubePlayerImperative";
import { useVideoWatchProgress } from "./hooks/useVideoWatchProgress";
import { useSlidePlayer } from "./hooks/useSlidePlayer";

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
      onShowSlideQuiz,
      onAskQuestion,
      onOpenQuestions,
    },
    ref
  ) => {
    const { userDetails, refreshUserDetails } = useAuth();
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const navigate = useNavigate();

    useInjectedPlayerStyles();

    const isVideoLockedState = useVideoLockGate({ video, videos, userDetails });
    const { isSlide, hasSlideQuiz, formatSlideUrl } = useSlidePlayer({ video });

    const { player, playerError, playerLoadAttempt, onReady, setPlayerError } =
      useYoutubePlayerImperative({ ref, video });

    const { percentageWatched, setPercentageWatched, watchTime, setWatchTime, hasNotifiedRef } =
      useVideoWatchProgress({ video, userDetails, player });

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

    const handleViewStudents = () => {
      navigate(
        `/studentDashboard?quizId=${
          video.quizId?.split("/")[1] || video.quizId
        }`
      );
    };

    const handleOpenSlidesClick = () => {
      if (typeof onOpenSlide !== "function") return;
      onOpenSlide({ videoId: video?.id, quizId: video?.quizId });
    };

    const handleEditCourse = () => {
      navigate(`/adm-cursos?courseId=${courseId}`);
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
      return <LockedVideoGate onLogin={handleLogin} />;
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
              // No celular o título disputa a linha com até cinco botões (entre
              // eles os dois de dúvidas). Sem o corte com reticências, um título
              // longo empurra os botões para fora da tela; é o título que cede.
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {video.title.split(" - ")[0]}
          </Typography>

          <VideoPlayerActionBar
            video={video}
            userDetails={userDetails}
            courseOwnerUid={courseOwnerUid}
            courseId={courseId}
            hasSlide={hasSlide}
            onOpenSlidesClick={handleOpenSlidesClick}
            onAskQuestion={onAskQuestion}
            onOpenQuestions={onOpenQuestions}
            onViewStudents={handleViewStudents}
            onOpenQuizGigi={onOpenQuizGigi}
            onEditCourse={handleEditCourse}
            onReport={() => setReportModalOpen(true)}
          />
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
              {playerError && playerLoadAttempt >= 3 ? (
                <Box
                  sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 1.5,
                    textAlign: "center",
                    p: 2,
                  }}
                >
                  <Typography variant="body2" sx={{ color: "#666" }}>
                    Não foi possível carregar o vídeo aqui.
                  </Typography>
                  <Button
                    variant="outlined"
                    component="a"
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      color: "#9041c1",
                      borderColor: "#9041c1",
                      "&:hover": {
                        borderColor: "#7a35a3",
                        backgroundColor: "rgba(144, 65, 193, 0.08)",
                      },
                    }}
                  >
                    Assistir no YouTube
                  </Button>
                </Box>
              ) : (
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
                  onReady={(event) => onReady(event, setPercentageWatched, setWatchTime)}
                  onError={() => {
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
              )}
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
            onClick={() => onShowSlideQuiz && onShowSlideQuiz(video.id)}
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

        <VideoComments
          courseId={video?.courseId || courseId}
          contentId={video?.id}
          courseOwnerUid={courseOwnerUid}
        />

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
  onShowSlideQuiz: PropTypes.func,
  onAskQuestion: PropTypes.func,
  onOpenQuestions: PropTypes.func,
  hasSlide: PropTypes.bool,
  courseOwnerUid: PropTypes.string,
};

VideoPlayer.displayName = "VideoPlayer";

export default VideoPlayer;
