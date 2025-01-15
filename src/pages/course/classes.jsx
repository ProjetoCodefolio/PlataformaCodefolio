import React, { useState } from "react";
import VideoPlayer from "../../components/videoPlayerClasses";
import VideoList from "../../components/videoList";
import MaterialExtra from "../../components/MaterialExtra";
import Quiz from "../../components/quiz";
import { Box, Paper, Tabs, Tab, Typography, Button } from "@mui/material";
import Topbar from "../../components/topbar/Topbar";

const Classes = () => {
  const [videos, setVideos] = useState([
    {
      id: 1,
      title: "Introdução ao JavaScript",
      url: "https://www.youtube.com/watch?v=PRspkxdIi2w&list=PL-R1FQNkywO55236fniVp6LKGAVZXcmnr&index=2",
      watched: false,
      description: "Este é um vídeo introdutório ao JavaScript.",
      duration: "00:05:28",
    },
    {
      id: 2,
      title: "Variáveis e Tipos de Dados",
      url: "https://www.youtube.com/watch?v=gxx_1WGhgOY&list=PL-R1FQNkywO55236fniVp6LKGAVZXcmnr&index=3",
      watched: false,
      description: "Aprenda sobre variáveis e tipos de dados no JavaScript.",
      duration: "00:04:29",
    },
    {
      id: 3,
      title: "Funções",
      url: "https://www.youtube.com/watch?v=Jp59hG62XKY&list=PL-R1FQNkywO55236fniVp6LKGAVZXcmnr&index=8",
      watched: false,
      description: "Entenda como criar e utilizar funções no JavaScript.",
      duration: "00:04:52",
    },
  ]);

  const [currentVideoId, setCurrentVideoId] = useState(videos[0].id);
  const [selectedTab, setSelectedTab] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);

  const currentVideo = videos.find((video) => video.id === currentVideoId);

  // Marca o vídeo atual como assistido
  const handleMarkAsWatched = () => {
    setVideos((prevVideos) =>
      prevVideos.map((video) =>
        video.id === currentVideoId ? { ...video, watched: true } : video
      )
    );
  };

  // Avança para o próximo vídeo
  const handleNextVideo = () => {
    const currentIndex = videos.findIndex(
      (video) => video.id === currentVideoId
    );
    if (currentIndex < videos.length - 1) {
      setCurrentVideoId(videos[currentIndex + 1].id);
    }
  };

  // Alterna entre as abas
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
        {/* Player de vídeo e descrição */}
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
            {/* Verifica se é para exibir o vídeo ou o quiz */}
            {showQuiz ? (
              <Quiz onClose={() => setShowQuiz(false)} />
            ) : (
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
                  onNext={handleNextVideo}
                  hasNext={
                    videos.findIndex((video) => video.id === currentVideoId) <
                    videos.length - 1
                  }
                />
              </>
            )}
          </Paper>

          {/* Descrição do vídeo e botão para o quiz */}
          {!showQuiz && (
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
              <Button
                variant="contained"
                color="secondary"
                onClick={() => setShowQuiz(true)}
              >
                Acessar Quiz
              </Button>
            </Paper>
          )}
        </Box>

        {/* Abas de Conteúdo e Materiais Extras */}
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
            {/* Abas */}
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

            {/* Conteúdo da aba selecionada */}
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
