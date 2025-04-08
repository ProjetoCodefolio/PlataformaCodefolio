import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ref, get, set } from "firebase/database";
import { database } from "../../service/firebase";
import { VideoPlayer } from "../../components/courses/videoPlayerClasses";
import VideoList from "../../components/courses/videoList";
import MaterialExtra from "../../components/courses/extraMaterials";
import Quiz from "../../components/courses/quiz";
import {
  Box,
  Tabs,
  Tab,
  Typography,
  CircularProgress,
  Divider,
  Button,
  Modal,
} from "@mui/material";
import Topbar from "../../components/topbar/Topbar";
import { useAuth } from "../../context/AuthContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { fetchQuizQuestions, validateQuizAnswers } from "../../service/courses";
import LoginModal from "../../components/modals/LoginModal";
import CompletionModal from "../../components/modals/CompletionModal";
import SchoolIcon from "@mui/icons-material/School"; // Importe o ícone de professor
import QuizGigi from "../../components/courses/quizGigi";

const Classes = () => {
  const [videos, setVideos] = useState([]);
  const [currentVideoId, setCurrentVideoId] = useState(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [courseTitle, setCourseTitle] = useState("");
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showLogInModal, setShowLogInModal] = useState(false);
  const { userDetails } = useAuth();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const courseId = params.get("courseId");
  const videoPlayerRef = useRef(null);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const navigate = useNavigate();
  const modalRef = useRef(null);
  const [modalDimensions, setModalDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [showQuizGigi, setShowQuizGigi] = useState(false);
  const [quizData, setQuizData] = useState(null);

  useEffect(() => {
    if (showCompletionModal && modalRef.current) {
      const { offsetWidth, offsetHeight } = modalRef.current;
      setModalDimensions({ width: offsetWidth, height: offsetHeight });
    }

    if (showLogInModal && modalRef.current) {
      const { offsetWidth, offsetHeight } = modalRef.current;
      setModalDimensions({ width: offsetWidth, height: offsetHeight });
    }
  }, [showCompletionModal, showLogInModal]);

  const fetchVideosData = async () => {
    setLoadingVideos(true);
    try {
      if (!courseId) return;

      const courseRef = ref(database, `courses/${courseId}`);
      const courseSnapshot = await get(courseRef);
      const courseData = courseSnapshot.val();
      setCourseTitle(courseData?.title || "Curso sem título");

      const courseVideosRef = ref(database, `courseVideos/${courseId}`);
      const snapshot = await get(courseVideosRef);
      const videosData = snapshot.val();

      let progressData = {};
      let quizzesData = {};

      let localProgress = {};
      const storedProgress = sessionStorage.getItem("videoProgress");
      if (storedProgress) {
        const progressArray = JSON.parse(storedProgress);
        localProgress = progressArray.reduce(
          (acc, video) => ({
            ...acc,
            [video.id]: {
              watched: video.watched,
              watchedTimeInSeconds: video.watchedTime,
              percentageWatched: video.progress,
              quizPassed: video.quizPassed,
            },
          }),
          {}
        );
      }

      if (userDetails?.userId) {
        const progressRef = ref(
          database,
          `videoProgress/${userDetails.userId}/${courseId}`
        );
        const progressSnapshot = await get(progressRef);
        const firebaseProgress = progressSnapshot.val() || {};

        progressData = Object.keys({
          ...localProgress,
          ...firebaseProgress,
        }).reduce((acc, videoId) => {
          const local = localProgress[videoId] || {};
          const firebase = firebaseProgress[videoId] || {};
          acc[videoId] = {
            watched: local.watched || firebase.watched || false,
            watchedTimeInSeconds: Math.max(
              local.watchedTimeInSeconds || 0,
              firebase.watchedTimeInSeconds || 0
            ),
            percentageWatched: Math.max(
              local.percentageWatched || 0,
              firebase.percentageWatched || 0
            ),
            quizPassed: local.quizPassed || firebase.quizPassed || false,
          };
          return acc;
        }, {});
      } else {
        progressData = localProgress;
      }

      const quizzesRef = ref(database, `courseQuizzes/${courseId}`);
      const quizzesSnapshot = await get(quizzesRef);
      quizzesData = quizzesSnapshot.val() || {};

      if (videosData) {
        const filteredVideos = Object.entries(videosData).map(([id, video]) => {
          const quizData = quizzesData[id] || null;
          const userProgress = progressData[id] || {};
          return {
            id,
            title: video.title || "Sem título",
            url: video.url || "",
            description: video.description || "Sem descrição",
            watched: userProgress.watched || false,
            quizPassed: userProgress.quizPassed || false,
            order: video.order || 0,
            courseId: courseId,
            watchedTime: userProgress.watchedTimeInSeconds || 0,
            progress: userProgress.percentageWatched || 0,
            quizId: quizData ? `${courseId}/${id}` : null,
            minPercentage: quizData ? quizData.minPercentage : 70,
            requiresPrevious:
              video.requiresPrevious !== undefined
                ? video.requiresPrevious
                : true,
          };
        });

        const sortedVideos = filteredVideos.sort((a, b) => a.order - b.order);
        setVideos(sortedVideos);

        if (!currentVideoId) {
          const nextVideo = sortedVideos.find((video) => {
            return !video.watched || (video.quizId && !video.quizPassed);
          });
          setCurrentVideoId(nextVideo ? nextVideo.id : sortedVideos[0].id);
        }

        if (userDetails?.userId) {
          updateCourseProgress(sortedVideos);
        }
      }
    } catch (error) {
    } finally {
      setLoadingVideos(false);
    }
  };

  useEffect(() => {
    const transferSessionStorageToFirebase = async () => {
      if (userDetails?.userId) {
        const storedProgress = sessionStorage.getItem("videoProgress");
        if (storedProgress) {
          const progressRef = ref(
            database,
            `videoProgress/${userDetails.userId}/${courseId}`
          );
          const firebaseSnapshot = await get(progressRef);
          const firebaseProgress = firebaseSnapshot.val() || {};

          const progressData = JSON.parse(storedProgress);
          for (const video of progressData) {
            const firebaseVideoProgress = firebaseProgress[video.id] || {};
            const progressRef = ref(
              database,
              `videoProgress/${userDetails.userId}/${courseId}/${video.id}`
            );
            await set(progressRef, {
              watchedTimeInSeconds: Math.max(
                video.watchedTime || 0,
                firebaseVideoProgress.watchedTimeInSeconds || 0
              ),
              percentageWatched: Math.max(
                video.progress || 0,
                firebaseVideoProgress.percentageWatched || 0
              ),
              watched: video.watched || firebaseVideoProgress.watched || false,
              quizPassed:
                video.quizPassed || firebaseVideoProgress.quizPassed || false,
              lastUpdated: new Date().toISOString(),
            });
          }
          sessionStorage.removeItem("videoProgress");
          fetchVideosData();
        }
      }
    };

    transferSessionStorageToFirebase();
  }, [userDetails, courseId]);

  useEffect(() => {
    fetchVideosData();
  }, [courseId, userDetails?.userId]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (videoPlayerRef.current) {
        const currentTime = videoPlayerRef.current.getCurrentTime() || 0;
        const duration = videoPlayerRef.current.getDuration() || 0;
        saveVideoProgress(currentTime, duration, true);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    // Adicionar listener para o evento personalizado como backup
    const handleReturnToVideo = (event) => {
      setShowQuiz(false);
      if (event.detail && event.detail.videoId) {
        setCurrentVideoId(event.detail.videoId);
      }
    };

    window.addEventListener("returnToVideo", handleReturnToVideo);

    return () => {
      window.removeEventListener("returnToVideo", handleReturnToVideo);
    };
  }, []);

  const currentVideo = videos.find((video) => video.id === currentVideoId);

  const updateCourseProgress = async (updatedVideos) => {
    const totalVideos = updatedVideos.length;
    const completedVideos = updatedVideos.filter(
      (v) => v.watched && (!v.quizId || v.quizPassed)
    ).length;
    const progressPercentage = (completedVideos / totalVideos) * 100;

    if (userDetails?.userId) {
      const courseProgressRef = ref(
        database,
        `studentCourses/${userDetails.userId}/${courseId}`
      );
      try {
        await set(courseProgressRef, {
          courseId,
          progress: progressPercentage,
          status: progressPercentage === 100 ? "completed" : "in_progress",
          lastUpdated: new Date().toISOString(),
        });

        if (progressPercentage === 100) {
          setShowCompletionModal(true);
        }
      } catch (error) {}
    } else {
      if (progressPercentage === 100) {
        setShowCompletionModal(true);
      }
    }
  };

  const saveVideoProgress = async (
    currentTime,
    duration,
    forceSave = false
  ) => {
    const percentage = Math.floor((currentTime / duration) * 100);
    const roundedPercentage = Math.floor(percentage / 10) * 10; // Arredonda para o múltiplo de 10 mais próximo

    // Verificar se o progresso já está em 100% e já foi salvo anteriormente
    const [lastVideoSavedPercentage, setLastVideoSavedPercentage] = useState(0);
    if (lastVideoSavedPercentage === 100 && percentage >= 100 && !forceSave)
      return;

    const updatedVideos = videos.map((v) =>
      v.id === currentVideo.id
        ? {
            ...v,
            watched: percentage >= 90,
            progress: percentage,
            watchedTime: currentTime,
          }
        : v
    );
    setVideos(updatedVideos);

    if (!userDetails?.userId) {
      sessionStorage.setItem("videoProgress", JSON.stringify(updatedVideos));
      return;
    }

    // Salvar no banco de dados a cada múltiplo de 10% ou se for um salvamento forçado
    if (forceSave || percentage % 10 === 0) {
      const progressRef = ref(
        database,
        `videoProgress/${userDetails.userId}/${courseId}/${currentVideo.id}`
      );

      try {
        const wasWatched = currentVideo.watched;
        const progressData = {
          watchedTimeInSeconds: currentTime,
          percentageWatched: roundedPercentage,
          watched: percentage >= 90,
          quizPassed: currentVideo.quizPassed || false,
          lastUpdated: new Date().toISOString(),
        };

        // Adicionar data de conclusão se o vídeo foi completado
        if (percentage === 100) {
          progressData.completedAt = new Date().toISOString();
          setLastVideoSavedPercentage(100); // Marcar como completado
        }

        await set(progressRef, progressData);

        if (!wasWatched && percentage >= 90) {
          await updateCourseProgress(updatedVideos);
        }
      } catch (error) {
        console.error("Erro ao salvar progresso do vídeo:", error);
      }
    }
  };

  const handleQuizComplete = async (isPassed, action, videoId) => {
    // Verifica se a ação é returnToVideo
    if (action === "returnToVideo") {
      setShowQuiz(false); // Isso vai mostrar o vídeo novamente
      if (videoId) {
        setCurrentVideoId(videoId);
      }
      return; // Retorna mais cedo para não executar o resto da função
    }

    // O código existente para quando o quiz é aprovado
    if (isPassed) {
      const updatedVideos = videos.map((v) =>
        v.id === currentVideoId ? { ...v, quizPassed: true } : v
      );
      setVideos(updatedVideos);

      if (!userDetails?.userId) {
        sessionStorage.setItem("videoProgress", JSON.stringify(updatedVideos));
        await updateCourseProgress(updatedVideos);
      } else {
        const progressRef = ref(
          database,
          `videoProgress/${userDetails.userId}/${courseId}/${currentVideoId}`
        );
        await set(progressRef, {
          watchedTimeInSeconds: currentVideo.watchedTime,
          percentageWatched: currentVideo.progress,
          watched: currentVideo.watched,
          quizPassed: true,
          lastUpdated: new Date().toISOString(),
        });
        await updateCourseProgress(updatedVideos);
      }
    }
  };

  const handleVideoSelect = (video) => {
    const videoIndex = videos.findIndex((v) => v.id === video.id);

    if (!userDetails?.userId && videoIndex > 1) {
      setShowLogInModal(true);
      return;
    }

    if (video.requiresPrevious && videoIndex > 0) {
      const previousVideo = videos[videoIndex - 1];
      if (
        !previousVideo.watched ||
        (previousVideo.quizId && !previousVideo.quizPassed)
      ) {
        return;
      }
    }

    setCurrentVideoId(video.id);
    setShowQuiz(false);
    if (videoPlayerRef.current) {
      videoPlayerRef.current.seekTo(video.watchedTime || 0);
      videoPlayerRef.current.updateProgress(
        video.progress || 0,
        video.watchedTime || 0
      );
    }
  };

  const handleQuizStart = (quizId, videoId) => {
    setCurrentVideoId(videoId); // Atualize o ID do vídeo atual para o vídeo do quiz
    setShowQuiz(true);
  };

  const handleQuizSubmit = async (userAnswers) => {
    try {
      const { isPassed } = await validateQuizAnswers(
        userAnswers,
        `${courseId}/${currentVideoId}`,
        currentVideo?.minPercentage || 70
      );

      if (isPassed) {
        await handleQuizComplete(true);
      } else {
        await handleQuizComplete(false);
      }
    } catch (error) {}
  };

  const handleNextVideo = () => {
    const currentVideoIndex = videos.findIndex((v) => v.id === currentVideoId);
    if (currentVideoIndex < videos.length - 1) {
      const nextVideo = videos[currentVideoIndex + 1];
      handleVideoSelect(nextVideo);
      setShowQuiz(false);
    }
  };

  const handleLogin = () => {
    navigate("/login");
  };

  // Adicione a função handleVideoProgressUpdate
  const handleVideoProgressUpdate = (
    videoId,
    percentage,
    hasReached90Percent
  ) => {
    if (hasReached90Percent) {
      // Atualiza o estado local imediatamente para marcar o vídeo como assistido
      const updatedVideos = videos.map((v) =>
        v.id === videoId ? { ...v, watched: true, progress: percentage } : v
      );
      setVideos(updatedVideos);

      // Se o vídeo tiver um quiz e ele não estiver passado, mostrar o quiz automaticamente
      const currentVideo = videos.find((v) => v.id === videoId);
      if (currentVideo && currentVideo.quizId && !currentVideo.quizPassed) {
        // Atualize o curso no banco também
        updateCourseProgress(updatedVideos);
      }
    }
  };

  const handleOpenQuizGigi = async () => {
    if (currentVideo?.quizId) {

      // Pausar o vídeo antes de abrir o quiz
      if (
        videoPlayerRef.current &&
        typeof videoPlayerRef.current.pause === "function"
      ) {
        videoPlayerRef.current.pause();
      }

      try {
        const quiz = await fetchQuizQuestions(currentVideo.quizId);
        setQuizData(quiz);
        setShowQuizGigi(true);
      } catch (error) {
      }
    } else {
    }
  };

  // Adicione uma propriedade id ao quizData
  if (quizData) {
    quizData.id = currentVideo?.quizId.split("/")[1] || null;
  }

  return (
    <>
      <style>
        {`
                    @media (max-width: 600px) { 
                        .Toastify__toast {
                            width: 90vw !important;
                            min-height: auto !important;
                            font-size: 0.9rem !important;
                            padding: 8px 12px !important;
                            margin: 8px auto !important;
                            border-radius: 8px !important;
                            margin-top: 50px !important;
                        }
                        .Toastify__toast-body {
                            margin: 0 !important;
                        }
                    }
                `}
      </style>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        style={{
          width: { xs: "90%", sm: "auto" },
          fontSize: { xs: "0.9rem", sm: "1rem" },
        }}
      />
      <style>
        {`
                    body {
                        background: #F5F5FA
                    }
                `}
      </style>

      <Box
        sx={{
          minHeight: "100vh",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#F5F5FA",
          padding: 0,
          margin: 0,
        }}
      >
        <Topbar hideSearch={true} />
        <Box
          sx={{
            minHeight: "calc(100vh - 64px)",
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            backgroundColor: "#F5F5FA",
            color: "#333",
            pt: { xs: 8, md: 10 },
            pb: { xs: 1, md: 2 },
            px: { xs: 0, md: 2 },
            gap: { xs: 1, md: 2 },
            alignItems: "flex-start",
          }}
        >
          <Box
            sx={{
              flex: { xs: 1, md: 3 },
              display: "flex",
              flexDirection: "column",
              gap: { xs: 1, md: 2 },
              backgroundColor: "#F5F5FA",
              width: "100%",
              marginRight: { md: "16px" },
            }}
          >
            {showQuiz ? (
              <Quiz
                quizId={`${courseId}/${currentVideoId}`}
                courseId={courseId}
                currentVideoId={currentVideoId}
                videos={videos}
                onComplete={handleQuizComplete}
                onSubmit={handleQuizSubmit}
                onNextVideo={handleNextVideo}
              />
            ) : loadingVideos ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  p: { xs: 2, sm: 5 },
                  height: { xs: "200px", sm: "400px" },
                  backgroundColor: "#F5F5FA",
                }}
              >
                <CircularProgress color="secondary" />
                <Typography variant="body1" sx={{ ml: 2, color: "#888" }}>
                  Carregando vídeos...
                </Typography>
              </Box>
            ) : currentVideo ? (
              <Box
                sx={{
                  backgroundColor: "#F5F5FA",
                  width: "100%",
                  position: "relative",
                }}
              >
                <VideoPlayer
                  ref={videoPlayerRef}
                  video={{
                    ...currentVideo,
                    title: `${courseTitle} - ${currentVideo.title}`,
                  }}
                  onProgress={saveVideoProgress}
                  videos={videos}
                  onVideoChange={handleVideoSelect}
                  setShowQuiz={setShowQuiz}
                  setCurrentVideoId={setCurrentVideoId}
                  onVideoProgressUpdate={handleVideoProgressUpdate}
                  onOpenQuizGigi={handleOpenQuizGigi}
                />
              </Box>
            ) : (
              <Box
                sx={{
                  p: { xs: 2, sm: 5 },
                  textAlign: "center",
                  backgroundColor: "#F5F5FA",
                }}
              >
                <Typography variant="h6" sx={{ color: "#888" }}>
                  Nenhum vídeo disponível.
                </Typography>
              </Box>
            )}
          </Box>
          <Box
            sx={{
              flex: { xs: 1, md: 2 },
              height: { xs: "auto", md: "calc(100vh - 100px)" },
              minWidth: { md: "320px" },
              width: "100%",
            }}
          >
            <Box
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                backgroundColor: "#F5F5FA",
                borderRadius: "16px",
                overflow: "hidden",
                border: "1px solid #e0e0e0",
              }}
            >
              <Tabs
                value={selectedTab}
                onChange={(e, newValue) => setSelectedTab(newValue)}
                textColor="inherit"
                indicatorColor="primary"
                variant="fullWidth"
                sx={{
                  "& .MuiTab-root": {
                    color: "#666",
                    "&.Mui-selected": { color: "#9041c1" },
                  },
                  "& .MuiTabs-indicator": { backgroundColor: "#9041c1" },
                }}
              >
                <Tab label="Conteúdo" />
                <Tab label="Materiais Extras" />
              </Tabs>
              <Divider />
              <Box
                sx={{
                  flex: 1,
                  overflowY: "auto",
                  p: { xs: 1, sm: 2 },
                  backgroundColor: "#F5F5FA",
                }}
              >
                {selectedTab === 0 ? (
                  <VideoList
                    videos={videos}
                    setCurrentVideo={handleVideoSelect}
                    onQuizStart={handleQuizStart}
                    currentVideoId={currentVideoId}
                  />
                ) : (
                  <MaterialExtra courseId={courseId} />
                )}
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      <LoginModal
        open={showLogInModal}
        onClose={() => setShowLogInModal(false)}
        modalRef={modalRef}
      />

      <CompletionModal
        open={showCompletionModal}
        onClose={() => setShowCompletionModal(false)}
        onExplore={() => {
          setShowCompletionModal(false);
          navigate("/dashboard");
        }}
        modalRef={modalRef}
        modalDimensions={modalDimensions}
        userName={userDetails?.firstName}
        courseTitle={courseTitle}
      />
      {showQuizGigi && (
        <QuizGigi
          onClose={() => setShowQuizGigi(false)}
          quizData={quizData}
          courseId={courseId} // Adicionando o courseId
        />
      )}
    </>
  );
};

export default Classes;
