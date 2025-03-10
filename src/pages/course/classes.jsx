import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ref, get, set } from "firebase/database";
import { database } from "../../service/firebase";
import { VideoPlayer } from "../../components/videoPlayerClasses";
import VideoList from "../../components/videoList";
import MaterialExtra from "../../components/MaterialExtra";
import Quiz from "../../components/quiz";
import { Box, Tabs, Tab, Typography, CircularProgress, Divider, Button, Modal } from "@mui/material";
import Topbar from "../../components/topbar/Topbar";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";
import { fetchQuizQuestions, validateQuizAnswers } from "../../service/courses";
import Confetti from "react-confetti";
import { setLogLevel } from "firebase/app";

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
    const [modalDimensions, setModalDimensions] = useState({ width: 0, height: 0 });

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

    useEffect(() => {
        console.log("userDetails (on mount/update):", userDetails);
    }, [userDetails]);

    const fetchVideosData = async () => {
        console.log("userDetails (fetchVideosData):", userDetails);
        setLoadingVideos(true);
        try {
            if (!courseId) return;

            const courseRef = ref(database, `courses/${courseId}`);
            const courseSnapshot = await get(courseRef);
            const courseData = courseSnapshot.val();
            setCourseTitle(courseData?.title || "Curso sem título");

            const courseVideosRef = ref(database, "courseVideos");
            const snapshot = await get(courseVideosRef);
            const videosData = snapshot.val();

            let progressData = {};
            let quizzesData = {};

            if (userDetails?.userId) {
                const progressRef = ref(database, `videoProgress/${userDetails.userId}/${courseId}`);
                const progressSnapshot = await get(progressRef);
                progressData = progressSnapshot.val() || {};

            }

            const quizzesRef = ref(database, `courseQuizzes/${courseId}`);
            const quizzesSnapshot = await get(quizzesRef);
            quizzesData = quizzesSnapshot.val() || {};

            if (videosData) {
                const filteredVideos = await Promise.all(
                    Object.entries(videosData)
                        .filter(([_, video]) => video.courseId === courseId)
                        .map(async ([id, video], index) => {
                            const quizData = quizzesData[id] || null;
                            const userProgress = progressData[id] || {};
                            const videoObj = {
                                id,
                                title: video.title || "Sem título",
                                url: video.url || "",
                                description: video.description || "Sem descrição",
                                duration: video.duration || "",
                                watched: userProgress.watched || false,
                                quizPassed: userProgress.quizPassed || false,
                                order: video.order || 0,
                                courseId: video.courseId,
                                watchedTime: userProgress.watchedTimeInSeconds || 0,
                                progress: userProgress.percentageWatched || 0,
                                quizId: quizData ? `${courseId}/${id}` : null,
                                minPercentage: quizData ? quizData.minPercentage : 0,
                                requiresPrevious: video.requiresPrevious !== undefined ? video.requiresPrevious : true,
                            };
                            console.log(`Video ${video.title} quizId:`, videoObj.quizId);
                            return videoObj;
                        })
                );

                const sortedVideos = filteredVideos.sort((a, b) => a.order - b.order);
                setVideos(sortedVideos);
                if (sortedVideos.length > 0 && !currentVideoId) {
                    setCurrentVideoId(sortedVideos[0].id);
                }
                if (userDetails?.userId) {
                    updateCourseProgress(sortedVideos);
                }
            }
        } catch (error) {
            toast.error("Erro ao carregar os dados do curso.");
        } finally {
            setLoadingVideos(false);
        }
    };

    useEffect(() => {
        fetchVideosData();
    }, [courseId, userDetails?.userId]);

    const currentVideo = videos.find((video) => video.id === currentVideoId);

    const updateCourseProgress = async (updatedVideos) => {
        const totalVideos = updatedVideos.length;
        const completedVideos = updatedVideos.filter((v) => v.watched && (!v.quizId || v.quizPassed)).length;
        const progressPercentage = (completedVideos / totalVideos) * 100;

        console.log("Atualizando progresso do curso:", { completedVideos, totalVideos, progressPercentage });

        const courseProgressRef = ref(database, `studentCourses/${userDetails.userId}/${courseId}`);
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
        } catch (error) {
            toast.error("Erro ao atualizar progresso do curso.");
        }
    };

    const saveVideoProgress = async (currentTime, duration) => {
        const percentage = Math.floor((currentTime / duration) * 100);

        if (!userDetails?.userId) {
            const updatedVideos = videos.map((v) =>
                v.id === currentVideo.id
                    ? { ...v, watched: percentage >= 90, progress: percentage, watchedTime: currentTime }
                    : v
            );
            setVideos(updatedVideos);
            console.log("Videos atualizados (não logado):", updatedVideos);
            return;
        }

        const progressRef = ref(database, `videoProgress/${userDetails.userId}/${courseId}/${currentVideo.id}`);

        try {
            const wasWatched = currentVideo.watched;
            await set(progressRef, {
                watchedTimeInSeconds: currentTime,
                percentageWatched: percentage,
                watched: percentage >= 90,
                quizPassed: currentVideo.quizPassed || false,
                lastUpdated: new Date().toISOString(),
            });

            const updatedVideos = videos.map((v) =>
                v.id === currentVideo.id ? { ...v, watched: percentage >= 90, progress: percentage } : v
            );
            setVideos(updatedVideos);

            if (!wasWatched && percentage >= 90) {
                await updateCourseProgress(updatedVideos);
            }
        } catch (error) {
            toast.error("Erro ao salvar progresso do vídeo.");
        }
    };

    const handleQuizPassed = async (videoId) => {
        const progressRef = ref(database, `videoProgress/${userDetails.userId}/${courseId}/${videoId}`);
        try {
            const currentVideoData = videos.find((v) => v.id === videoId);
            await set(progressRef, {
                watchedTimeInSeconds: currentVideoData.watchedTime,
                percentageWatched: currentVideoData.progress,
                watched: currentVideoData.watched,
                quizPassed: true,
                lastUpdated: new Date().toISOString(),
            });

            const updatedVideos = videos.map((v) => (v.id === videoId ? { ...v, quizPassed: true } : v));
            setVideos(updatedVideos);
            await updateCourseProgress(updatedVideos);
            toast.success("Quiz concluído com sucesso! ✅");
        } catch (error) {
            toast.error("Erro ao salvar progresso do quiz.");
        }
    };

    const handleVideoSelect = (video) => {
        if (!userDetails?.userId) {
            const videoIndex = videos.findIndex((v) => v.id === video.id);
            if (videoIndex > 1) {
                toast.warn("Faça login para acessar este conteúdo!");
                setShowLogInModal(true);
                return;
            }

            if (videoIndex === 1) {
                const previousVideo = videos[0];
                if (!previousVideo.watched || (previousVideo.quizId && !previousVideo.quizPassed)) {
                    toast.warn("Complete o vídeo anterior primeiro!");
                    return;
                }
            }
        }

        setCurrentVideoId(video.id);
        setShowQuiz(false);
        if (videoPlayerRef.current) {
            videoPlayerRef.current.seekTo(video.watchedTime || 0);
            videoPlayerRef.current.updateProgress(video.progress || 0, video.watchedTime || 0);
        }
    };

    const handleQuizStart = (quizId) => {
        setShowQuiz(true);
    };

    const handleQuizSubmit = async (userAnswers) => {
        try {
            if (!userDetails?.userId) {
                const currentVideoIndex = videos.findIndex((v) => v.id === currentVideoId);
                if (currentVideoIndex > 1) {
                    toast.warn("Faça login para acessar este conteúdo!");
                    setShowLogInModal(true);
                    return;
                }
    
                // Buscar as questões do quiz
                const quizData = await fetchQuizQuestions(`${courseId}/${currentVideoId}`);
                let correctAnswersCount = 0;
                
                // Calcular respostas corretas
                Object.entries(userAnswers).forEach(([questionId, userAnswer]) => {
                    const question = quizData.questions[questionId];
                    if (question && userAnswer === question.correctOption) {
                        correctAnswersCount++;
                    }
                });
    
                const scorePercentage = (correctAnswersCount / quizData.questions.length) * 100;
                const isPassed = scorePercentage >= (currentVideo.minPercentage || 70);
    
                if (isPassed) {
                    const updatedVideos = videos.map((v) =>
                        v.id === currentVideoId ? { ...v, quizPassed: true } : v
                    );
                    setVideos(updatedVideos);
                    toast.success("Quiz concluído com sucesso! ✅");
                } else {
                    toast.warn(`Pontuação insuficiente: ${scorePercentage.toFixed(2)}%. Tente novamente!`);
                }
                return;
            }
    
            // Para usuários logados
            const { isPassed, scorePercentage } = await validateQuizAnswers(
                userAnswers,
                `${courseId}/${currentVideoId}`,
                currentVideo.minPercentage
            );
    
            if (isPassed) {
                await handleQuizPassed(currentVideoId);
            } else {
                toast.warn(`Pontuação insuficiente: ${scorePercentage.toFixed(2)}%. Tente novamente!`);
            }
        } catch (error) {
            console.error("Erro ao validar quiz:", error);
            toast.error("Erro ao validar o quiz.");
        }
    };

    const handleNextVideo = () => {
        const currentVideoIndex = videos.findIndex((v) => v.id === currentVideoId);
        if (currentVideoIndex < videos.length - 1) {
            const nextVideo = videos[currentVideoIndex + 1];
            handleVideoSelect(nextVideo);
        } else {
            toast.info("Este é o último vídeo do curso!");
        }
    };

    const handleLogin = () => {
        console.log("Redirecionando para a página de login...");
    };

    return (
        <>
            <Topbar />
            <Box
                sx={{
                    minHeight: "calc(100vh - 64px)",
                    display: "flex",
                    flexDirection: { xs: "column", md: "row" },
                    backgroundColor: "#F5F5FA",
                    color: "#333",
                    pt: !userDetails?.userId ? 2 : 10,
                    pb: { xs: 1, sm: 2 },
                    px: { xs: 1, sm: 2 },
                    gap: 2,
                    alignItems: "flex-start",
                }}
            >
                <Box
                    sx={{
                        flex: { xs: 1, md: 3 },
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        backgroundColor: "#F5F5FA",
                    }}
                >
                    {showQuiz ? (
                        <Quiz
                            quizId={`${courseId}/${currentVideoId}`}
                            courseId={courseId}
                            currentVideoId={currentVideoId}
                            videos={videos}
                            onComplete={(isPassed) => {
                                if (isPassed) handleQuizPassed(currentVideoId);
                                setShowQuiz(false);
                            }}
                            onSubmit={handleQuizSubmit}
                            onNextVideo={handleNextVideo}
                        />
                    ) : loadingVideos ? (
                        <Box
                            sx={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                p: 5,
                                height: "400px",
                                backgroundColor: "#F5F5FA",
                            }}
                        >
                            <CircularProgress color="secondary" />
                            <Typography variant="body1" sx={{ ml: 2, color: "#888" }}>
                                Carregando vídeos...
                            </Typography>
                        </Box>
                    ) : currentVideo ? (
                        <Box sx={{ backgroundColor: "#F5F5FA" }}>
                            <VideoPlayer
                                ref={videoPlayerRef}
                                video={{ ...currentVideo, title: `${courseTitle} - ${currentVideo.title}` }}
                                onProgress={saveVideoProgress}
                                videos={videos}
                                onVideoChange={handleVideoSelect}
                            />
                        </Box>
                    ) : (
                        <Box sx={{ p: 5, textAlign: "center", backgroundColor: "#F5F5FA" }}>
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
                                "& .MuiTab-root": { color: "#666", "&.Mui-selected": { color: "#9041c1" } },
                                "& .MuiTabs-indicator": { backgroundColor: "#9041c1" },
                            }}
                        >
                            <Tab label="Conteúdo" />
                            <Tab label="Materiais Extras" />
                        </Tabs>
                        <Divider />
                        <Box sx={{ flex: 1, overflowY: "auto", p: 2, backgroundColor: "#F5F5FA" }}>
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

            <Modal open={showLogInModal} onClose={() => setShowLogInModal(false)}>
                <Box
                    ref={modalRef}
                    sx={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        width: { xs: "90%", sm: 500 },
                        bgcolor: "#fff",
                        borderRadius: "20px",
                        boxShadow: "0 12px 40px rgba(0, 0, 0, 0.3)",
                        p: { xs: 3, sm: 4 },
                        textAlign: "center",
                        background: "linear-gradient(135deg, #9041c1 0%, #7d37a7 100%)",
                        color: "#fff",
                        animation: "zoomIn 0.5s ease-in-out",
                        "@keyframes zoomIn": {
                            "0%": { transform: "translate(-50%, -50%) scale(0.5)", opacity: 0 },
                            "100%": { transform: "translate(-50%, -50%) scale(1)", opacity: 1 },
                        },
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 2,
                    }}
                >
                    {showLogInModal && (
                    <>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                        Faça login para prosseguir com o curso!
                    </Typography>
                    <Box sx={{ display: "flex", gap: 3, justifyContent: "center", flexWrap: "wrap" }}>
                        <Button
                            variant="contained"
                            onClick={() => {
                                setShowLogInModal(true);
                                handleLogin();
                            }}
                            sx={{
                                backgroundColor: "#fff",
                                color: "#9041c1",
                                borderRadius: "16px",
                                "&:hover": { backgroundColor: "#f5f5fa", color: "#7d37a7" },
                                textTransform: "none",
                                fontWeight: 600,
                                px: 4,
                                py: 1.5,
                                minWidth: 180,
                            }}
                        >
                            Fazer Login
                        </Button>
                    </Box>
                    </>
                    )}
                </Box>
            </Modal>

            <Modal open={showCompletionModal} onClose={() => setShowCompletionModal(false)}>
                <Box
                    ref={modalRef}
                    sx={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        width: { xs: "90%", sm: 500 },
                        bgcolor: "#fff",
                        borderRadius: "20px",
                        boxShadow: "0 12px 40px rgba(0, 0, 0, 0.3)",
                        p: { xs: 3, sm: 4 },
                        textAlign: "center",
                        background: "linear-gradient(135deg, #9041c1 0%, #7d37a7 100%)",
                        color: "#fff",
                        animation: "zoomIn 0.5s ease-in-out",
                        "@keyframes zoomIn": {
                            "0%": { transform: "translate(-50%, -50%) scale(0.5)", opacity: 0 },
                            "100%": { transform: "translate(-50%, -50%) scale(1)", opacity: 1 },
                        },
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 2,
                    }}
                >
                    {showCompletionModal && (
                        <Confetti
                            width={modalDimensions.width}
                            height={modalDimensions.height}
                            recycle={false}
                            numberOfPieces={150}
                            colors={["#9041c1", "#7d37a7", "#4caf50", "#f5f5fa"]}
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                pointerEvents: "none",
                            }}
                        />
                    )}
                    <Typography
                        variant="h4"
                        fontWeight="bold"
                        sx={{
                            mb: 1,
                            background: "linear-gradient(45deg, #fff 0%, #ffeb3b 100%)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            textShadow: "2px 2px 4px rgba(0, 0, 0, 0.2)",
                        }}
                    >
                        🎉 Parabéns, {userDetails?.firstName || "Aluno"}!
                    </Typography>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                        Você conquistou o curso "{courseTitle}" com sucesso!
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 3, opacity: 0.8, maxWidth: "80%", mx: "auto" }}>
                        Continue aprendendo e explorando novos desafios.
                    </Typography>
                    <Box sx={{ display: "flex", gap: 3, justifyContent: "center", flexWrap: "wrap" }}>
                        <Button
                            variant="contained"
                            onClick={() => {
                                setShowCompletionModal(false);
                                navigate("/dashboard");
                            }}
                            sx={{
                                backgroundColor: "#fff",
                                color: "#9041c1",
                                borderRadius: "16px",
                                "&:hover": { backgroundColor: "#f5f5fa", color: "#7d37a7" },
                                textTransform: "none",
                                fontWeight: 600,
                                px: 4,
                                py: 1.5,
                                minWidth: 180,
                            }}
                        >
                            Explorar Outros Cursos
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={() => setShowCompletionModal(false)}
                            sx={{
                                borderColor: "#fff",
                                color: "#fff",
                                borderRadius: "16px",
                                "&:hover": { borderColor: "#f5f5fa", color: "#f5f5fa" },
                                textTransform: "none",
                                fontWeight: 500,
                                px: 4,
                                py: 1.5,
                                minWidth: 120,
                            }}
                        >
                            Fechar
                        </Button>
                    </Box>
                </Box>
            </Modal>
        </>
    );
};

export default Classes;