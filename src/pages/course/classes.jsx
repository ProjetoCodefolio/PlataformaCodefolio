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
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { fetchQuizQuestions, validateQuizAnswers } from "../../service/courses";
import LoginModal from '../../components/modals/LoginModal';
import CompletionModal from '../../components/modals/CompletionModal';

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

            // Carregar progresso do sessionStorage
            let localProgress = {};
            const storedProgress = sessionStorage.getItem('videoProgress');
            if (storedProgress) {
                const progressArray = JSON.parse(storedProgress);
                localProgress = progressArray.reduce((acc, video) => ({
                    ...acc,
                    [video.id]: {
                        watched: video.watched,
                        watchedTimeInSeconds: video.watchedTime,
                        percentageWatched: video.progress,
                        quizPassed: video.quizPassed
                    }
                }), {});
            }

            // Carregar progresso do Firebase
            if (userDetails?.userId) {
                const progressRef = ref(database, `videoProgress/${userDetails.userId}/${courseId}`);
                const progressSnapshot = await get(progressRef);
                const firebaseProgress = progressSnapshot.val() || {};

                // Comparar e manter o maior progresso
                progressData = Object.keys({ ...localProgress, ...firebaseProgress })
                    .reduce((acc, videoId) => {
                        const local = localProgress[videoId] || {};
                        const firebase = firebaseProgress[videoId] || {};

                        acc[videoId] = {
                            watched: local.watched || firebase.watched || false,
                            watchedTimeInSeconds: Math.max(local.watchedTimeInSeconds || 0, firebase.watchedTimeInSeconds || 0),
                            percentageWatched: Math.max(local.percentageWatched || 0, firebase.percentageWatched || 0),
                            quizPassed: local.quizPassed || firebase.quizPassed || false
                        };
                        return acc;
                    }, {});

                // Se houver progresso local maior, atualizar no Firebase
                for (const [videoId, progress] of Object.entries(progressData)) {
                    if ((progress.percentageWatched > (firebaseProgress[videoId]?.percentageWatched || 0)) ||
                        (progress.watchedTimeInSeconds > (firebaseProgress[videoId]?.watchedTimeInSeconds || 0))) {
                        const progressRef = ref(database, `videoProgress/${userDetails.userId}/${courseId}/${videoId}`);
                        await set(progressRef, {
                            ...progress,
                            lastUpdated: new Date().toISOString()
                        });
                    }
                }
            } else {
                progressData = localProgress;
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

                // Encontrar o próximo vídeo a ser assistido
                if (!currentVideoId) {
                    const nextVideo = sortedVideos.find(video => {
                        return !video.watched || (video.quizId && !video.quizPassed);
                    });

                    // Se não encontrar um próximo vídeo (todos completos), usar o último
                    setCurrentVideoId(nextVideo ? nextVideo.id : sortedVideos[sortedVideos.length - 1].id);
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
        const transferSessionStorageToFirebase = async () => {
            if (userDetails?.userId) {
                const storedProgress = sessionStorage.getItem('videoProgress');
                if (storedProgress) {
                    // Primeiro, buscar o progresso atual do Firebase
                    const progressRef = ref(database, `videoProgress/${userDetails.userId}/${courseId}`);
                    const firebaseSnapshot = await get(progressRef);
                    const firebaseProgress = firebaseSnapshot.val() || {};

                    const progressData = JSON.parse(storedProgress);

                    // Para cada vídeo, comparar e manter o maior progresso
                    for (const video of progressData) {
                        const firebaseVideoProgress = firebaseProgress[video.id] || {};
                        const progressRef = ref(database, `videoProgress/${userDetails.userId}/${courseId}/${video.id}`);

                        // Comparar e usar o maior valor
                        await set(progressRef, {
                            watchedTimeInSeconds: Math.max(video.watchedTime || 0, firebaseVideoProgress.watchedTimeInSeconds || 0),
                            percentageWatched: Math.max(video.progress || 0, firebaseVideoProgress.percentageWatched || 0),
                            watched: video.watched || firebaseVideoProgress.watched || false,
                            quizPassed: video.quizPassed || firebaseVideoProgress.quizPassed || false,
                            lastUpdated: new Date().toISOString(),
                        });
                    }
                    sessionStorage.removeItem('videoProgress');
                    fetchVideosData(); // Recarregar dados do Firebase
                }
            }
        };

        transferSessionStorageToFirebase();
    }, [userDetails, courseId]);

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

            // Salvar no sessionStorage
            sessionStorage.setItem('videoProgress', JSON.stringify(updatedVideos));
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
                    sessionStorage.setItem('videoProgress', JSON.stringify(updatedVideos));
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
        navigate("/login");
    };

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
                        <Box sx={{ backgroundColor: "#F5F5FA", width: "100%" }}>
                            <VideoPlayer
                                ref={videoPlayerRef}
                                video={{ ...currentVideo, title: `${courseTitle} - ${currentVideo.title}` }}
                                onProgress={saveVideoProgress}
                                videos={videos}
                                onVideoChange={handleVideoSelect}
                                setShowQuiz={setShowQuiz}
                                setCurrentVideoId={setCurrentVideoId}
                            />
                        </Box>
                    ) : (
                        <Box sx={{ p: { xs: 2, sm: 5 }, textAlign: "center", backgroundColor: "#F5F5FA" }}>
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
                                "& .MuiTab-root": { color: "#666", "&.Mui-selected": { color: "#9041c1" } },
                                "& .MuiTabs-indicator": { backgroundColor: "#9041c1" },
                            }}
                        >
                            <Tab label="Conteúdo" />
                            <Tab label="Materiais Extras" />
                        </Tabs>
                        <Divider />
                        <Box sx={{ flex: 1, overflowY: "auto", p: { xs: 1, sm: 2 }, backgroundColor: "#F5F5FA" }}>
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
        </>
    );
};

export default Classes;