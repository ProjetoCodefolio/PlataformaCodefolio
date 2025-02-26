import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { database } from "../../service/firebase";
import { ref, get, set } from "firebase/database";
import { VideoPlayer } from "../../components/videoPlayerClasses";
import VideoList from "../../components/videoList";
import MaterialExtra from "../../components/MaterialExtra";
import Quiz from "../../components/quiz";
import { Box, Paper, Tabs, Tab, Typography, CircularProgress, Divider } from "@mui/material";
import Topbar from "../../components/topbar/Topbar";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";

const Classes = () => {
    const [videos, setVideos] = useState([]);
    const [currentVideoId, setCurrentVideoId] = useState(null);
    const [selectedTab, setSelectedTab] = useState(0);
    const [showQuiz, setShowQuiz] = useState(false);
    const { userDetails } = useAuth();
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const courseId = params.get("courseId");
    const videoPlayerRef = useRef(null);
    const [loadingVideos, setLoadingVideos] = useState(false);

    useEffect(() => {
        const fetchVideos = async () => {
            setLoadingVideos(true);
            try {
                if (!courseId) return;
                const courseVideosRef = ref(database, "courseVideos");
                const snapshot = await get(courseVideosRef);
                const videosData = snapshot.val();

                if (videosData) {
                    const filteredVideos = Object.entries(videosData)
                        .filter(([_, video]) => video.courseId === courseId)
                        .map(([id, video]) => ({
                            id,
                            title: video.title || "Sem título",
                            url: video.url || "",
                            description: video.description || "Sem descrição",
                            duration: video.duration || "",
                            watched: false,
                            quizPassed: video.quizPassed || false,
                            order: video.order || 0,
                            courseId: video.courseId,
                            watchedTime: 0,
                            progress: 0,
                        }))
                        .sort((a, b) => a.order - b.order);

                    setVideos(filteredVideos);
                    if (filteredVideos.length > 0 && !currentVideoId) {
                        setCurrentVideoId(filteredVideos[0].id);
                    }
                }
            } catch (error) {
                console.error("Erro ao buscar vídeos:", error);
                toast.error("Erro ao carregar os vídeos do curso");
            } finally {
                setLoadingVideos(false);
            }
        };

        fetchVideos();
    }, [courseId]);

    const currentVideo = videos.find((video) => video.id === currentVideoId);

    const saveVideoProgress = async (currentTime, duration) => {
        if (!userDetails?.userId || !currentVideo?.id) return;

        const percentage = Math.floor((currentTime / duration) * 100);
        const progressRef = ref(database, `videoProgress/${userDetails.userId}/${courseId}/${currentVideo.id}`);

        try {
            await set(progressRef, {
                watchedTimeInSeconds: currentTime,
                percentageWatched: percentage,
                watched: percentage >= 90,
                lastUpdated: new Date().toISOString(),
            });

            if (percentage >= 90) {
                toast.success("Vídeo concluído! ✅");
            }
        } catch (error) {
            console.error("Erro ao salvar progresso:", error);
            toast.error("Erro ao salvar progresso do vídeo.");
        }
    };

    const handleVideoSelect = (video) => {
        setCurrentVideoId(video.id);
        setShowQuiz(false);
        videoPlayerRef.current?.seekTo(video.watchTime || 0);
    };

    return (
        <>
            <Topbar />
            <Box 
                sx={{ 
                    minHeight: "100vh", 
                    display: "flex", 
                    flexDirection: { xs: "column", md: "row" }, 
                    backgroundColor: "#f5f5fa", 
                    color: "#333", 
                    marginTop: "80px",
                    p: { xs: 1, sm: 2 },
                    gap: 2
                }}
            >
                <Box 
                    sx={{ 
                        flex: { xs: 1, md: 3 }, 
                        display: "flex", 
                        flexDirection: "column",
                        gap: 2
                    }}
                >
                    <Paper 
                        elevation={3} 
                        sx={{ 
                            width: "100%", 
                            overflow: "hidden", 
                            backgroundColor: "#ffffff", 
                            borderRadius: "16px"
                        }}
                    >
                        {showQuiz ? (
                            <Quiz quizId={currentVideo?.quizId} courseId={courseId} currentVideoId={currentVideoId} />
                        ) : loadingVideos ? (
                            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", p: 5, height: "400px" }}>
                                <CircularProgress color="secondary" />
                                <Typography variant="body1" sx={{ ml: 2, color: "#888" }}>Carregando vídeos...</Typography>
                            </Box>
                        ) : currentVideo ? (
                            <VideoPlayer 
                                ref={videoPlayerRef} 
                                video={currentVideo} 
                                onMarkAsWatched={() => {
                                    const updatedVideos = videos.map(v => 
                                        v.id === currentVideo.id ? {...v, watched: true} : v
                                    );
                                    setVideos(updatedVideos);
                                }} 
                            />
                        ) : (
                            <Box sx={{ p: 5, textAlign: "center" }}>
                                <Typography variant="h6" sx={{ color: "#888" }}>Nenhum vídeo disponível.</Typography>
                            </Box>
                        )}
                    </Paper>
                </Box>

                <Box 
                    sx={{ 
                        flex: { xs: 1, md: 2 }, 
                        height: { xs: "auto", md: "calc(100vh - 100px)" },
                        minWidth: { md: "320px" } 
                    }}
                >
                    <Paper 
                        elevation={3} 
                        sx={{ 
                            height: "100%", 
                            display: "flex", 
                            flexDirection: "column", 
                            backgroundColor: "#ffffff", 
                            borderRadius: "16px",
                            overflow: "hidden"
                        }}
                    >
                        <Tabs 
                            value={selectedTab} 
                            onChange={(e, newValue) => setSelectedTab(newValue)} 
                            textColor="secondary" 
                            indicatorColor="secondary"
                            variant="fullWidth"
                            sx={{
                                '& .MuiTab-root': { 
                                    fontWeight: 600,
                                    py: 2 
                                }
                            }}
                        >
                            <Tab label="Conteúdo" />
                            <Tab label="Materiais Extras" />
                        </Tabs>
                        <Divider />
                        <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
                            {selectedTab === 0 ? (
                                <VideoList 
                                    videos={videos} 
                                    currentVideoId={currentVideoId}
                                    setCurrentVideo={handleVideoSelect} 
                                />
                            ) : (
                                <MaterialExtra courseId={courseId} />
                            )}
                        </Box>
                    </Paper>
                </Box>
            </Box>
        </>
    );
};

export default Classes;