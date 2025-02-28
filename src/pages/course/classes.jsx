import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { ref, get, set } from "firebase/database";
import { database } from "../../service/firebase";
import { VideoPlayer } from "../../components/videoPlayerClasses";
import VideoList from "../../components/videoList";
import MaterialExtra from "../../components/MaterialExtra";
import Quiz from "../../components/quiz";
import { Box, Paper, Tabs, Tab, Typography, CircularProgress, Divider, Button, Modal } from "@mui/material";
import Topbar from "../../components/topbar/Topbar";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";
import { fetchQuizQuestions, validateQuizAnswers } from "../../service/courses";

const Classes = () => {
    const [videos, setVideos] = useState([]);
    const [currentVideoId, setCurrentVideoId] = useState(null);
    const [selectedTab, setSelectedTab] = useState(0);
    const [showQuiz, setShowQuiz] = useState(false);
    const [courseTitle, setCourseTitle] = useState("");
    const [showCompletionModal, setShowCompletionModal] = useState(false);
    const { userDetails } = useAuth();
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const courseId = params.get("courseId");
    const videoPlayerRef = useRef(null);
    const [loadingVideos, setLoadingVideos] = useState(false);

    const fetchVideosData = async () => {
        setLoadingVideos(true);
        try {
            if (!courseId || !userDetails?.userId) return;

            const courseRef = ref(database, `courses/${courseId}`);
            const courseSnapshot = await get(courseRef);
            const courseData = courseSnapshot.val();
            setCourseTitle(courseData?.title || "Curso sem título");

            const courseVideosRef = ref(database, "courseVideos");
            const snapshot = await get(courseVideosRef);
            const videosData = snapshot.val();

            const progressRef = ref(database, `videoProgress/${userDetails.userId}/${courseId}`);
            const progressSnapshot = await get(progressRef);
            const progressData = progressSnapshot.val() || {};

            const quizzesRef = ref(database, `courseQuizzes/${courseId}`);
            const quizzesSnapshot = await get(quizzesRef);
            const quizzesData = quizzesSnapshot.val() || {};

            if (videosData) {
                const filteredVideos = await Promise.all(
                    Object.entries(videosData)
                        .filter(([_, video]) => video.courseId === courseId)
                        .map(async ([id, video]) => {
                            const quizData = quizzesData[id] || null;
                            const userProgress = progressData[id] || {};
                            return {
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
                        })
                );

                const sortedVideos = filteredVideos.sort((a, b) => a.order - b.order);
                setVideos(sortedVideos);
                if (sortedVideos.length > 0 && !currentVideoId) {
                    setCurrentVideoId(sortedVideos[0].id);
                }
                updateCourseProgress(sortedVideos);
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
        const completedVideos = updatedVideos.filter(v => 
            v.watched && (!v.quizId || v.quizPassed)
        ).length;
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
        if (!userDetails?.userId || !currentVideo?.id) return;

        const percentage = Math.floor((currentTime / duration) * 100);
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

            const updatedVideos = videos.map((v) =>
                v.id === videoId ? { ...v, quizPassed: true } : v
            );
            setVideos(updatedVideos);
            await updateCourseProgress(updatedVideos);
            toast.success("Quiz concluído com sucesso! ✅");
        } catch (error) {
            toast.error("Erro ao salvar progresso do quiz.");
        }
    };

    const handleVideoSelect = (video) => {
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
            const { isPassed, scorePercentage } = await validateQuizAnswers(
                userAnswers,
                `${courseId}/${currentVideoId}`,
                userDetails.userId,
                courseId,
                currentVideo.minPercentage
            );

            if (isPassed) {
                await handleQuizPassed(currentVideoId);
            } else {
                toast.warn(`Pontuação insuficiente: ${scorePercentage.toFixed(2)}%. Tente novamente!`);
            }
        } catch (error) {
            toast.error("Erro ao validar o quiz.");
        }
    };

    return (
        <>
            <Topbar />
            <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: { xs: "column", md: "row" }, backgroundColor: "#f5f5fa", color: "#333", marginTop: "80px", p: { xs: 1, sm: 2 }, gap: 2 }}>
                <Box sx={{ flex: { xs: 1, md: 3 }, display: "flex", flexDirection: "column", gap: 2 }}>
                    <Paper elevation={3} sx={{ width: "100%", overflow: "hidden", backgroundColor: "#ffffff", borderRadius: "16px" }}>
                        {showQuiz ? (
                            <Quiz
                                quizId={`${courseId}/${currentVideoId}`}
                                courseId={courseId}
                                currentVideoId={currentVideoId}
                                onComplete={(isPassed) => {
                                    if (isPassed) handleQuizPassed(currentVideoId);
                                    setShowQuiz(false);
                                }}
                                onSubmit={handleQuizSubmit}
                            />
                        ) : loadingVideos ? (
                            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", p: 5, height: "400px" }}>
                                <CircularProgress color="secondary" />
                                <Typography variant="body1" sx={{ ml: 2, color: "#888" }}>Carregando vídeos...</Typography>
                            </Box>
                        ) : currentVideo ? (
                            <VideoPlayer
                                ref={videoPlayerRef}
                                video={{ ...currentVideo, title: `${courseTitle} - ${currentVideo.title}` }}
                                onProgress={saveVideoProgress}
                            />
                        ) : (
                            <Box sx={{ p: 5, textAlign: "center" }}>
                                <Typography variant="h6" sx={{ color: "#888" }}>Nenhum vídeo disponível.</Typography>
                            </Box>
                        )}
                    </Paper>
                </Box>
                <Box sx={{ flex: { xs: 1, md: 2 }, height: { xs: "auto", md: "calc(100vh - 100px)" }, minWidth: { md: "320px" } }}>
                    <Paper elevation={3} sx={{ height: "100%", display: "flex", flexDirection: "column", backgroundColor: "#ffffff", borderRadius: "16px", overflow: "hidden" }}>
                        <Tabs value={selectedTab} onChange={(e, newValue) => setSelectedTab(newValue)} textColor="inherit" indicatorColor="primary" variant="fullWidth" sx={{ '& .MuiTab-root': { color: '#666', '&.Mui-selected': { color: '#9041c1' } }, '& .MuiTabs-indicator': { backgroundColor: '#9041c1' } }}>
                            <Tab label="Conteúdo" />
                            <Tab label="Materiais Extras" />
                        </Tabs>
                        <Divider />
                        <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
                            {selectedTab === 0 ? (
                                <VideoList videos={videos} setCurrentVideo={handleVideoSelect} onQuizStart={handleQuizStart} />
                            ) : (
                                <MaterialExtra courseId={courseId} />
                            )}
                        </Box>
                    </Paper>
                </Box>
            </Box>

            <Modal open={showCompletionModal} onClose={() => setShowCompletionModal(false)}>
                <Box
                    sx={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        width: 400,
                        bgcolor: "background.paper",
                        borderRadius: 2,
                        boxShadow: 24,
                        p: 4,
                        textAlign: "center",
                    }}
                >
                    <Typography variant="h6" sx={{ mb: 2 }}>
                        Parabéns! Você concluiu o curso "{courseTitle}"!
                    </Typography>
                    <Button
                        variant="contained"
                        onClick={() => setShowCompletionModal(false)}
                        sx={{ backgroundColor: "#9041c1", "&:hover": { backgroundColor: "#7d37a7" } }}
                    >
                        Fechar
                    </Button>
                </Box>
            </Modal>
        </>
    );
};

export default Classes;