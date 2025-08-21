import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { VideoPlayer } from "$components/courses/videoPlayerClasses";
import VideoList from "$components/courses/videoList";
import MaterialExtra from "$components/courses/extraMaterials";
import Quiz from "$components/courses/quiz";
import {
  Box,
  Tabs,
  Tab,
  Typography,
  CircularProgress,
  Divider,
  Button,
  Modal,
  Grid,
  Card,
  CardContent,
  CardActions,
} from "@mui/material";
import Topbar from "$components/topbar/Topbar";
import { useAuth } from "$context/AuthContext";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import LoginModal from "$components/modals/LoginModal";
import CompletionModal from "$components/modals/CompletionModal";
import QuizGigi from "$components/courses/quizGigi";
import SlidePlayer from "$components/courses/slidePlayer";
import { validateQuizAnswers } from "$api/services/courses/quizzes";
import { saveVideoProgress } from "$api/services/courses/videoProgress";
import {
  loadCourseData,
  saveVideoProgressWithUrgency,
  processQuizCompletion,
  checkCourseCompletion,
  loadCourseSlides,
  loadQuizData,
  recoverUnsavedProgress,
} from "$api/services/courses/classes";
import { checkSlideHasQuiz } from "$api/services/courses/slides";
import SlideshowIcon from "@mui/icons-material/Slideshow";
import { fetchAdvancedSettings } from "$api/services/courses/advancedSettings";
import AdvancedSettingsModal from "../../components/courses/advancedSettingsModal";

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
  const videoPlayerRef = useRef({
    pause: () => {},
    getCurrentTime: () => 0,
    getDuration: () => 0,
    seekTo: () => {},
  });
  const [loadingVideos, setLoadingVideos] = useState(false);
  const navigate = useNavigate();
  const modalRef = useRef(null);
  const [modalDimensions, setModalDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [showQuizGigi, setShowQuizGigi] = useState(false);
  const [quizData, setQuizData] = useState(null);
  const [courseOwnerUid, setCourseOwnerUid] = useState("");
  const [showSlidePlayer, setShowSlidePlayer] = useState(false);
  const [slideData, setSlideData] = useState(null);
  const [videoSlides, setVideoSlides] = useState({});
  const [userAttempts, setUserAttempts] = useState({});
  const [slides, setSlides] = useState([]); // Novo estado para armazenar slides independentes
  // Adicionar uma verificação para determinar se o quiz é de vídeo ou slide
  const [quizSource, setQuizSource] = useState("video"); // Pode ser "video" ou "slide"

  // Adicione um estado para armazenar as configurações avançadas
  const [advancedSettings, setAdvancedSettings] = useState({
    videos: { requirePreviousCompletion: true },
    quiz: { allowRetry: true, showResultAfterCompletion: true },
  });
  const [openAdvancedSettings, setOpenAdvancedSettings] = useState(false);

  const currentVideo = videos.find((video) => video.id === currentVideoId);

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

  // Carrega os dados iniciais do curso
  useEffect(() => {
    const fetchData = async () => {
      setLoadingVideos(true);
      try {
        // Carrega dados do curso usando o serviço
        const courseData = await loadCourseData(
          courseId,
          userDetails,
          currentVideoId
        );

        // Carregar slides independentes
        const slidesData = await loadCourseSlides(courseId);

        // Formatar cada slide para aparecer como um item na lista de vídeos
        const formattedSlides = await Promise.all(
          slidesData.map(async (slide) => {
            // Verificar se este slide tem quiz associado
            const hasQuiz = await checkSlideHasQuiz(courseId, slide.id);

            return {
              ...slide,
              id: slide.id,
              isSlide: true,
              type: "slide",
              title: slide.title,
              description: slide.description || "",
              url: slide.url,
              watched: true,
              progress: 100, // Slides são sempre considerados 100% vistos
              order: 1000 + parseInt(Math.random() * 1000), // Para aparecer após os vídeos
              quizId: hasQuiz ? `${courseId}/slide_${slide.id}` : null,
              quizPassed: false, // Inicialmente não completado
            };
          })
        );

        // Combinar vídeos com slides
        const combinedContent = [...courseData.videos, ...formattedSlides];

        setCourseTitle(courseData.courseTitle);
        setCourseOwnerUid(courseData.courseOwnerUid);
        setVideos(combinedContent);
        setUserAttempts(courseData.userQuizzesResults);

        if (!currentVideoId && courseData.nextVideoId) {
          setCurrentVideoId(courseData.nextVideoId);
        }
      } catch (error) {
        console.error("Erro ao carregar dados do curso:", error);
        toast.error(
          "Houve um erro ao carregar o curso. Por favor, tente novamente."
        );
      } finally {
        setLoadingVideos(false);
      }
    };

    if (courseId) {
      fetchData();
    }
  }, [courseId, userDetails?.userId]);

  // Recupera progresso não salvo da sessão anterior
  useEffect(() => {
    if (courseId && userDetails?.userId) {
      recoverUnsavedProgress(courseId, userDetails?.userId);
    }
  }, [courseId, userDetails?.userId]);

  // Salva progresso ao fechar a página
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (videoPlayerRef.current && currentVideo && userDetails?.userId) {
        const currentTime = videoPlayerRef.current.getCurrentTime() || 0;
        const duration = videoPlayerRef.current.getDuration() || 0;

        if (currentTime > 0 && duration > 0) {
          // Salvar com urgência
          saveVideoProgressWithUrgency({
            userId: userDetails.userId,
            courseId,
            videoId: currentVideo.id,
            currentTime,
            duration,
            urgent: true,
          });

          event.preventDefault();
          event.returnValue = "";
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [currentVideo, userDetails?.userId, courseId]);

  // Escuta evento de retorno ao vídeo
  useEffect(() => {
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

  // Salvamento automático de progresso
  useEffect(() => {
    if (
      !videoPlayerRef.current ||
      !currentVideo ||
      !userDetails?.userId ||
      !courseId
    )
      return;

    // Salvar progresso a cada 30 segundos
    const saveInterval = setInterval(() => {
      try {
        const currentTime = videoPlayerRef.current.getCurrentTime?.() || 0;
        const duration = videoPlayerRef.current.getDuration?.() || 0;

        if (currentTime > 0 && duration > 0) {
          saveVideoProgress(
            userDetails.userId,
            courseId,
            currentVideo.id,
            currentTime,
            duration
          );
        }
      } catch (error) {
        console.error("Erro no salvamento automático:", error);
      }
    }, 30000);

    return () => {
      clearInterval(saveInterval);
    };
  }, [videoPlayerRef.current, currentVideo, userDetails?.userId, courseId]);

  // Carrega slides do curso
  useEffect(() => {
    const loadSlides = async () => {
      try {
        if (courseId) {
          const slidesData = await loadCourseSlides(courseId);

          // Verificar quais slides têm quiz associado e adicionar a propriedade quizId
          const slidesWithQuizInfo = await Promise.all(
            slidesData.map(async (slide) => {
              const hasQuiz = await checkSlideHasQuiz(courseId, slide.id);

              if (hasQuiz) {
                // Adiciona o quizId no formato correto
                return {
                  ...slide,
                  quizId: `${courseId}/slide_${slide.id}`,
                };
              }
              return slide;
            })
          );

          setSlides(slidesWithQuizInfo);
        }
      } catch (error) {
        console.error("Erro ao carregar slides:", error);
      }
    };

    loadSlides();
  }, [courseId]);

  // Verifica conclusão do curso quando os vídeos mudam
  useEffect(() => {
    const verifyCourseCompletion = async () => {
      const isCompleted = await checkCourseCompletion(
        videos,
        userDetails?.userId,
        courseId
      );
      if (isCompleted) {
        setShowCompletionModal(true);
      }
    };

    verifyCourseCompletion();
  }, [videos]);

  // Atualiza tentativas de quiz quando fecha o quiz
  const [previousShowQuiz, setPreviousShowQuiz] = useState(showQuiz);
  useEffect(() => {
    if (previousShowQuiz && !showQuiz && userDetails?.userId && courseId) {
      const updateAttempts = async () => {
        try {
          const result = await processQuizCompletion(
            true,
            userDetails.userId,
            courseId,
            currentVideoId,
            0
          );
          if (result.attempts) {
            setUserAttempts(result.attempts);
          }
        } catch (error) {
          console.error("Erro ao atualizar tentativas:", error);
        }
      };

      updateAttempts();
    }

    setPreviousShowQuiz(showQuiz);
  }, [showQuiz]);

  // Tratamento de erros do player
  useEffect(() => {
    const handlePlayerError = (e) => {
      if (e.message && e.message.includes("Cannot read properties of null")) {
        console.warn(
          "[Classes] Detectado erro de inicialização do YouTube player"
        );
      }
    };

    window.addEventListener("error", handlePlayerError);

    return () => {
      window.removeEventListener("error", handlePlayerError);
    };
  }, []);

  // Manipuladores de eventos

  const handleQuizComplete = async (isPassed, action, videoId) => {
    try {
      console.log("Quiz completado:", { isPassed, action, videoId });

      // IMPORTANTE: Garantir que isPassed seja um booleano
      const wasApproved = Boolean(isPassed);
      console.log("Aluno foi aprovado?", wasApproved);
      
      // Identifica se é um slide ou um vídeo que estamos atualizando
      const contentId = videoId || currentVideoId;
      
      // Immediately update attempts for the UI - we'll do this regardless of pass/fail
      // to ensure the "Limite Atingido" message appears right away
      if (userDetails?.userId) {
        // Create a synthetic attempt update that will be replaced by the real one later
        const updatedAttempts = { ...userAttempts };
        const quizIdForAttempts = contentId.includes("/") ? contentId.split("/")[1] : contentId;
        
        if (!updatedAttempts[quizIdForAttempts]) {
          updatedAttempts[quizIdForAttempts] = { attemptCount: 1 };
        } else {
          updatedAttempts[quizIdForAttempts] = { 
            ...updatedAttempts[quizIdForAttempts], 
            attemptCount: (updatedAttempts[quizIdForAttempts].attemptCount || 0) + 1 
          };
        }
        
        // Update the attempts immediately to trigger UI changes
        setUserAttempts(updatedAttempts);
      }

      // Continue with the rest of the function
      if (wasApproved) {
        // Identifica se é um slide ou um vídeo que estamos atualizando
        const contentId = videoId || currentVideoId;

        // Atualiza estado local de vídeos/slides
        const updatedVideos = videos.map((v) =>
          v.id === contentId ? { ...v, quizPassed: true, watched: true } : v
        );
        setVideos(updatedVideos);

        // Se o usuário está logado, processa a conclusão do quiz
        if (userDetails?.userId) {
          // Obter duração do vídeo ou valor padrão para slides
          const duration =
            quizSource === "video" && videoPlayerRef.current
              ? videoPlayerRef.current.getDuration?.() ||
                currentVideo?.watchedTime ||
                0
              : 1; // Para slides, usamos 1 como duração padrão

          // Processa conclusão no serviço
          const result = await processQuizCompletion(
            true,
            userDetails.userId,
            courseId,
            contentId,
            duration,
            quizSource === "slide"
          );

          if (result?.attempts) {
            setUserAttempts(result.attempts);
            
            // Force immediate update to ensure limit is applied right away
            console.log("Atualizando contagem de tentativas:", result.attempts);
          }
        } else {
          // Salva progresso local para usuários não logados
          sessionStorage.setItem(
            "videoProgress",
            JSON.stringify(updatedVideos)
          );
        }

        // Verifica conclusão do curso
        const isCompleted = await checkCourseCompletion(
          updatedVideos,
          userDetails?.userId,
          courseId
        );

        if (isCompleted) {
          setShowCompletionModal(true);
        }
      } else {
        console.log("Aluno não passou no quiz, não atualizando progresso");
      }

      // IMPORTANTE: Esta parte deve estar FORA do bloco if(wasApproved)
      // para que os botões funcionem independentemente do resultado do quiz
      if (action === "returnToVideo") {
        setShowQuiz(false);
        if (videoId) {
          setCurrentVideoId(videoId);
        }
      } else if (action === "nextVideo") {
        handleNextVideo();
      }
    } catch (error) {
      console.error("Erro ao processar conclusão do quiz:", error);
      toast.error("Erro ao processar o quiz. Por favor, tente novamente.");
    }
  };

  // Função para navegar para o próximo vídeo
  const handleNextVideo = () => {
    const currentVideoIndex = videos.findIndex((v) => v.id === currentVideoId);
    if (currentVideoIndex < videos.length - 1) {
      const nextVideo = videos[currentVideoIndex + 1];
      setCurrentVideoId(nextVideo.id);
      setShowQuiz(false);
    }
  };

  const handleVideoSelect = (video) => {
    console.log("Tentando selecionar vídeo:", video?.title);
    console.log("Configurações atuais:", advancedSettings);

    // Se for slide ou se a configuração não exigir completar vídeo anterior, permitir acesso direto
    if (
      video.isSlide ||
      advancedSettings?.videos?.requirePreviousCompletion === false
    ) {
      console.log("Permitindo acesso direto ao vídeo");
      setCurrentVideoId(video.id);
      return;
    }

    // Lógica padrão para verificar bloqueio
    const videoIndex = videos.findIndex((v) => v.id === video.id);
    const previousVideo = videoIndex > 0 ? videos[videoIndex - 1] : null;

    if (
      videoIndex === 0 ||
      !previousVideo ||
      previousVideo.watched ||
      (previousVideo.quizId && previousVideo.quizPassed) ||
      !video.requiresPrevious
    ) {
      setCurrentVideoId(video.id);
    } else {
      toast.warning("Você precisa assistir ao vídeo anterior primeiro!");
    }
  };

  const handleQuizStart = (quizId, videoId) => {
    setCurrentVideoId(videoId);

    // Detectar se é um quiz de slide ou de vídeo
    const isSlideQuiz =
      quizId.includes("slide_") ||
      videos.find((v) => v.id === videoId)?.isSlide;
    setQuizSource(isSlideQuiz ? "slide" : "video");

    setShowQuiz(true);
  };

  const handleQuizSubmit = async (userAnswers) => {
    try {
      // Verificar se userAnswers é um objeto válido
      if (!userAnswers || typeof userAnswers !== "object") {
        console.error("Respostas do quiz inválidas:", userAnswers);
        return;
      }

      const { isPassed } = await validateQuizAnswers(
        `${courseId}/${currentVideoId}`,
        userAnswers,
        currentVideo?.minPercentage || 70
      );

      await handleQuizComplete(isPassed);
    } catch (error) {
      console.error("Erro ao validar respostas do quiz:", error);
      toast.error("Erro ao processar o quiz. Por favor, tente novamente.");
    }
  };

  const handleVideoProgressUpdate = (
    videoId,
    percentage,
    hasReached90Percent
  ) => {
    if (hasReached90Percent) {
      const updatedVideos = videos.map((v) =>
        v.id === videoId ? { ...v, watched: true, progress: percentage } : v
      );
      setVideos(updatedVideos);
    }
  };

  const handleOpenQuizGigi = async () => {
    if (currentVideo?.quizId) {
      if (
        videoPlayerRef.current &&
        typeof videoPlayerRef.current.pause === "function"
      ) {
        videoPlayerRef.current.pause();
      }

      try {
        const quiz = await loadQuizData(currentVideo.quizId);
        setQuizData({
          ...quiz,
          id: currentVideo?.quizId.split("/")[1] || null,
        });
        setShowQuizGigi(true);
      } catch (error) {
        console.error("Erro ao carregar quiz:", error);
      }
    }
  };

  // Modificar a função handleOpenSlide para que funcione com slides independentes
  const handleOpenSlide = (slide) => {
    if (
      videoPlayerRef.current &&
      typeof videoPlayerRef.current.pause === "function"
    ) {
      videoPlayerRef.current.pause();
    }

    // Se recebemos o slide diretamente (novo caso para slides independentes)
    if (slide && slide.isSlide) {
      setCurrentVideo(slide);
      return;
    }

    // Caso contrário, procura pelos slides associados a vídeo ou quiz
    let slideToShow = null;

    if (slide.videoId) {
      const slidesForVideo = slides.filter((s) => s.videoId === slide.videoId);
      if (slidesForVideo.length > 0) {
        slideToShow = slidesForVideo[0];
      }
    } else if (slide.quizId) {
      const slidesForQuiz = slides.filter((s) => s.quizId === slide.quizId);
      if (slidesForQuiz.length > 0) {
        slideToShow = slidesForQuiz[0];
      }
    }

    if (slideToShow) {
      setCurrentVideo(slideToShow);
    }
  };

  const handleReturnToVideo = () => {
    setShowSlidePlayer(false);
    setSlideData(null);
  };

  const handleProgress = (currentTime, duration) => {
    if (userDetails?.userId && currentVideo?.id && courseId) {
      return saveVideoProgress(
        userDetails.userId,
        courseId,
        currentVideo.id,
        currentTime,
        duration
      );
    }
    return { success: false, error: "Parâmetros insuficientes" };
  };

  const hasQuizSlide = (quizId) => {
    if (!quizId) return false;
    const quizKey = `quiz_${quizId}`;
    return videoSlides[quizKey] && videoSlides[quizKey].length > 0;
  };

  // Modificar a função que mostra o quiz
  const handleShowQuiz = (videoId, source = "video") => {
    if (typeof videoId === "string") {
      setCurrentVideoId(videoId);
    }
    setQuizSource(source);
    setShowQuiz(true);
  };

  // Função para verificar se um slide possui quiz
  const hasSlideQuiz = async (slideId) => {
    if (!slideId || !courseId) return false;

    try {
      return await checkSlideHasQuiz(courseId, slideId);
    } catch (error) {
      console.error("Erro ao verificar quiz do slide:", error);
      return false;
    }
  };

  // Adicionar esta função de verificação de slides antes do retorno do componente
  const hasSlide = (videoId) => {
    if (!videoId || !slides) return false;

    // Verificar se existe algum slide associado a este videoId
    const slideForVideo = slides.find((slide) => slide.videoId === videoId);
    return !!slideForVideo;
  };

  // Adicione este useEffect para carregar as configurações avançadas
  useEffect(() => {
    const loadAdvancedSettings = async () => {
      try {
        if (courseId) {
          const settings = await fetchAdvancedSettings(courseId);
          setAdvancedSettings(settings);
          console.log("Configurações avançadas carregadas:", settings);
        }
      } catch (error) {
        console.error("Erro ao carregar configurações avançadas:", error);
      }
    };

    loadAdvancedSettings();
  }, [courseId]);

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
                quizId={
                  quizSource === "video"
                    ? `${courseId}/${currentVideoId}`
                    : `${courseId}/slide_${currentVideoId}`
                }
                courseId={courseId}
                currentVideoId={currentVideoId}
                userDetails={userDetails}
                videos={videos}
                onComplete={handleQuizComplete}
                onSubmit={handleQuizSubmit}
                onNextVideo={handleNextVideo}
                hasSlide={
                  quizSource === "video" && hasQuizSlide(currentVideoId)
                }
                onOpenSlide={() => handleOpenSlide(null, currentVideoId)}
                isSlideQuiz={quizSource === "slide"}
                allowRetry={advancedSettings.quiz.allowRetry}
                showResultAfterCompletion={
                  advancedSettings.quiz.showResultAfterCompletion
                }
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
                {showSlidePlayer && slideData ? (
                  <SlidePlayer
                    slideData={slideData}
                    onReturnToVideo={handleReturnToVideo}
                    courseTitle={courseTitle}
                  />
                ) : (
                  <VideoPlayer
                    ref={videoPlayerRef}
                    video={{
                      ...currentVideo,
                      title: `${courseTitle} - ${currentVideo.title}`,
                      advancedSettings: advancedSettings, // Adicione esta linha
                    }}
                    courseId={courseId}
                    onProgress={handleProgress}
                    videos={videos}
                    onVideoChange={handleVideoSelect}
                    setShowQuiz={(videoId) => handleShowQuiz(videoId, "video")}
                    setCurrentVideoId={setCurrentVideoId}
                    onVideoProgressUpdate={handleVideoProgressUpdate}
                    courseOwnerUid={courseOwnerUid}
                    onOpenQuizGigi={
                      currentVideo?.quizId ? handleOpenQuizGigi : undefined
                    }
                    onShowSlideQuiz={(slideId) =>
                      handleShowQuiz(slideId, "slide")
                    }
                    hasSlide={hasSlide(currentVideo?.id)}
                    onOpenSlide={handleOpenSlide}
                  />
                )}
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
                    userQuizAttempts={userAttempts}
                    advancedSettings={advancedSettings} // Adicione esta linha
                  />
                ) : (
                  <MaterialExtra courseId={courseId} />
                )}
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
            navigate("/listcurso");
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
            courseId={courseId}
          />
        )}

        {/* Quando abrir o modal de configurações avançadas: */}
        {openAdvancedSettings && (
          <AdvancedSettingsModal
            open={openAdvancedSettings}
            onClose={() => setOpenAdvancedSettings(false)}
            courseId={courseId}
            onSave={(newSettings) => {
              setAdvancedSettings(newSettings);
            }}
          />
        )}
      </Box>
    </>
  );
};

export default Classes;
