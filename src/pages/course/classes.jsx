import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  fetchCourseVideosWithWatchedStatus,
  markVideoAsWatched,
} from "../../service/courses";
import VideoPlayer from "../../components/videoPlayerClasses";
import VideoList from "../../components/videoList";
import MaterialExtra from "../../components/MaterialExtra";
import Quiz from "../../components/quiz";
import { Box, Paper, Tabs, Tab, Typography } from "@mui/material";
import Topbar from "../../components/topbar/Topbar";
import { useAuth } from "../../context/AuthContext";

const Classes = () => {
  const [videos, setVideos] = useState([]);
  const [currentVideoId, setCurrentVideoId] = useState(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const { userDetails } = useAuth();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const courseId = params.get("courseId");

  useEffect(() => {
    const loadVideos = async () => {
      if (courseId && userDetails?.userId) {
        try {
          const courseVideos = await fetchCourseVideosWithWatchedStatus(
            courseId,
            userDetails.userId
          );

          const sortedVideos = courseVideos
            .map((video) => ({
              ...video,
              quizPassed: video.quizPassed || false,
            }))
            .sort((a, b) => a.order - b.order);

          setVideos(sortedVideos);

          const firstUnlockVideo = sortedVideos.find(
            (video, index) =>
              index === 0 ||
              (sortedVideos[index - 1].watched &&
                sortedVideos[index - 1].quizPassed)
          );
          setCurrentVideoId(firstUnlockVideo?.id || sortedVideos[0]?.id);
        } catch (error) {
          console.error("Erro ao carregar vídeos do curso:", error);
        }
      }
    };

    loadVideos();
  }, [courseId, userDetails]);

  const currentVideo = videos.find((video) => video.id === currentVideoId);

  const handleMarkAsWatched = async () => {
    try {
      await markVideoAsWatched(userDetails.userId, courseId, currentVideoId);
      setVideos((prevVideos) =>
        prevVideos.map((video) =>
          video.id === currentVideoId ? { ...video, watched: true } : video
        )
      );
    } catch (error) {
      console.error("Erro ao marcar vídeo como assistido:", error);
    }
  };

  const handleQuizCompletion = async (isPassed) => {
    setShowQuiz(false);

    if (isPassed) {
      setVideos((prevVideos) =>
        prevVideos.map((video) =>
          video.id === currentVideoId ? { ...video, quizPassed: true } : video
        )
      );

      try {
        await markVideoAsWatched(userDetails.userId, courseId, currentVideoId);
      } catch (error) {
        console.error("Erro ao atualizar status de quiz:", error);
      }
    } else {
      alert("Você precisa passar no quiz para acessar o próximo vídeo.");
    }
  };

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  return (
    <>
      <Topbar />
      <Box
        sx={{
          height: "100vh",
          display: "flex",
          flexDirection: "row",
          backgroundColor: "#f9f9f9",
          color: "#333",
          marginTop: "80px",
        }}
      >
        <Box sx={{ flex: 3, display: "flex", flexDirection: "column", p: 2 }}>
          <Paper
            elevation={3}
            sx={{
              flex: 3,
              mb: 2,
              overflow: "hidden",
              backgroundColor: "#ffffff",
              p: 2,
              borderRadius: "8px",
            }}
          >
            {showQuiz ? (
              <Quiz
                quizId={currentVideo?.quizId}
                onComplete={handleQuizCompletion}
              />
            ) : currentVideo ? (
              <>
                <Typography
                  variant="h5"
                  sx={{ mb: 2, fontWeight: "bold", color: "#333" }}
                >
                  {currentVideo.title}
                </Typography>
                <VideoPlayer
                  video={currentVideo}
                  onMarkAsWatched={handleMarkAsWatched}
                  hasNext={videos.some(
                    (video, index) =>
                      index >
                        videos.findIndex((v) => v.id === currentVideoId) &&
                      video.watched &&
                      video.quizPassed
                  )}
                />
              </>
            ) : (
              <Typography variant="h6" sx={{ color: "#888" }}>
                Nenhum vídeo disponível.
              </Typography>
            )}
          </Paper>
          {!showQuiz && currentVideo && (
            <Paper
              elevation={3}
              sx={{
                flex: 1,
                p: 2,
                overflowY: "auto",
                backgroundColor: "#ffffff",
                borderRadius: "8px",
              }}
            >
              <Typography
                variant="h6"
                sx={{ mb: 1, fontWeight: "bold", color: "#555" }}
              >
                Descrição
              </Typography>
              <Typography
                variant="body1"
                sx={{ lineHeight: 1.6, color: "#666", mb: 2 }}
              >
                {currentVideo.description}
              </Typography>
            </Paper>
          )}
        </Box>
        <Box sx={{ flex: 2, p: 2, height: "100%" }}>
          <Paper
            elevation={3}
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              backgroundColor: "#ffffff",
              borderRadius: "8px",
            }}
          >
            <Tabs
              value={selectedTab}
              onChange={handleTabChange}
              textColor="secondary"
              indicatorColor="secondary"
              sx={{
                "& .MuiTab-root": { color: "#333" },
                "& .Mui-selected": { color: "#555" },
              }}
            >
              <Tab label="Conteúdo" />
              <Tab label="Materiais Extras" />
            </Tabs>
            <Box
              sx={{
                flex: 1,
                overflowY: selectedTab === 0 ? "auto" : "hidden",
                p: 2,
              }}
            >
              {selectedTab === 0 ? (
                <VideoList
                  videos={videos}
                  setCurrentVideo={(video) => {
                    setCurrentVideoId(video.id);
                    setShowQuiz(false);
                  }}
                  onQuizStart={(quizId) => setShowQuiz(true)}
                />
              ) : (
                <MaterialExtra />
              )}
            </Box>
          </Paper>
        </Box>
      </Box>
    </>
  );
};

export default Classes;