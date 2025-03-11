import React, { useState, useEffect, useRef, forwardRef } from "react";
import PropTypes from "prop-types";
import { ref, get } from "firebase/database";
import { database } from "../../service/firebase";
import { useAuth } from "../../context/AuthContext";
import { LinearProgress, Box, Typography, IconButton } from "@mui/material";
import YouTube from "react-youtube";
import { toast } from "react-toastify";
import { debounce } from "lodash";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

const styles = `
  .youtube-player .ytp-chrome-bottom,
  .youtube-player .html5-video-container {
    background-color: #F5F5FA !important;
  }
  .youtube-player iframe {
    background-color: #F5F5FA !important;
  }
`;

const VideoPlayer = forwardRef(({ video, onProgress, videos, onVideoChange }, ref) => {
    if (!video || !video.url) {
        return (
            <Box sx={{ p: { xs: 2, sm: 4 }, textAlign: "center", backgroundColor: "#F5F5FA" }}>
                <Typography variant="h6" color="error">
                    Erro: Nenhum vídeo disponível
                </Typography>
            </Box>
        );
    }

    const [player, setPlayer] = useState(null);
    const [percentageWatched, setPercentageWatched] = useState(video.progress || 0);
    const [watchTime, setWatchTime] = useState(video.watchedTime || 0);
    const videoRef = useRef(null);
    const hasNotifiedRef = useRef(video.watched || false);

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
        event.target.seekTo(video.watchedTime || 0);
    };

    useEffect(() => {
        const fetchWatchData = async () => {
            if (!video?.id || !video?.courseId) return;
            const { userDetails } = useAuth();
            if (!userDetails?.userId) return;

            try {
                const progressRef = ref(database, `videoProgress/${userDetails.userId}/${video.courseId}/${video.id}`);
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
    }, [video]);

    useEffect(() => {
        const styleSheet = document.createElement("style");
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
        return () => document.head.removeChild(styleSheet);
    }, []);

    return (
        <Box
            sx={{
                width: "100%",
                maxWidth: { xs: "100%", sm: "840px" }, // 100% em mobile
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
                    maxWidth: { xs: "100%", sm: "780px" }, // 100% em mobile
                    position: "relative",
                    borderRadius: "12px",
                    overflow: "hidden",
                    boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
                    ml: { xs: 0, sm: 2 }, // Sem margem lateral em mobile
                    backgroundColor: "#F5F5FA",
                }}
            >
                {video.url.includes("youtube.com") || video.url.includes("youtu.be") ? (
                    <Box
                        sx={{
                            width: "100%",
                            paddingTop: "56.25%", // Proporção 16:9 responsiva
                            position: "relative",
                            backgroundColor: "#F5F5FA",
                            overflow: "hidden",
                        }}
                    >
                        <YouTube
                            videoId={video.url.match(/(?:youtu\.be\/|youtube\.com\/.*v=)([^#&?]*)/)[1]}
                            opts={{
                                width: "100%",
                                height: "100%", // Ajusta à proporção
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
                />
            )}

            {video.description && (
                <Box
                    sx={{
                        width: "100%",
                        maxWidth: { xs: "100%", sm: "780px" }, // 100% em mobile
                        mt: { xs: 2, sm: 3 }, // Menor margem em mobile
                        ml: { xs: 0, sm: 2 }, // Sem margem lateral em mobile
                        backgroundColor: "#F5F5FA",
                    }}
                >
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: "#555" }}>
                        Descrição:
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#666", lineHeight: 1.6 }}>
                        {video.description}
                    </Typography>
                </Box>
            )}
        </Box>
    );
});

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
};

VideoPlayer.displayName = "VideoPlayer";

function VideoWatcher({
    player,
    videoId,
    courseId,
    onProgress,
    hasNotifiedRef,
    watchTime,
    setWatchTime,
    percentageWatched,
    setPercentageWatched,
    videos,
    currentVideo,
    onVideoChange,
}) {
    const { userDetails } = useAuth();
    const progressInterval = useRef(null);
    const [lastSavedPercentage, setLastSavedPercentage] = useState(percentageWatched);
    const hasNotified90Percent = useRef(false);

    const debouncedSaveProgress = debounce((currentTime, duration) => {
        if (onProgress) {
            onProgress(currentTime, duration);
        }
    }, 1000);

    useEffect(() => {
        if (!player) return;

        const monitorProgress = () => {
            try {
                const duration = player.getDuration() || 0;
                const currentTime = player.getCurrentTime() || 0;

                if (duration > 0) {
                    const newPercentage = Math.floor((currentTime / duration) * 100);
                    if (currentTime > watchTime) {
                        setWatchTime(currentTime);
                        setPercentageWatched(newPercentage);

                        if (lastSavedPercentage < 90 && newPercentage >= 90 && !hasNotified90Percent.current) {
                            toast.success("Progresso do vídeo salvo com sucesso!");
                            hasNotified90Percent.current = true;
                        }

                        if (newPercentage >= lastSavedPercentage) {
                            debouncedSaveProgress(currentTime, duration);
                            setLastSavedPercentage(newPercentage);
                        }
                    }
                }
            } catch (error) {
                console.error("Erro ao monitorar progresso:", error);
            }
        };

        progressInterval.current = setInterval(monitorProgress, 5000);

        return () => {
            if (progressInterval.current) {
                clearInterval(progressInterval.current);
            }
            hasNotified90Percent.current = false;
        };
    }, [player, videoId, watchTime, debouncedSaveProgress, setPercentageWatched, setWatchTime, lastSavedPercentage]);

    const currentIndex = videos.findIndex((v) => v.id === currentVideo.id);
    const hasPrevious = currentIndex > 0;
    const hasNext = currentIndex < videos.length - 1;

    const handlePrevious = () => {
        if (hasPrevious) {
            const previousVideo = videos[currentIndex - 1];
            if (isVideoLocked(previousVideo)) {
                toast.warn("Você precisa completar o vídeo anterior ou o quiz antes de prosseguir!");
                return;
            }
            onVideoChange(previousVideo);
        }
    };

    const handleNext = () => {
        if (hasNext) {
            const nextVideo = videos[currentIndex + 1];
            if (isVideoLocked(nextVideo)) {
                toast.warn("Você precisa completar o vídeo anterior ou o quiz antes de prosseguir!");
                return;
            }
            onVideoChange(nextVideo);
        }
    };

    const isVideoLocked = (video) => {
        const videoIndex = videos.findIndex((v) => v.id === video.id);
        const previousVideo = videoIndex > 0 ? videos[videoIndex - 1] : null;

        if (videoIndex === 0) return false;

        return (
            video.requiresPrevious &&
            previousVideo &&
            (!previousVideo.watched || (previousVideo.quizId && !previousVideo.quizPassed))
        );
    };

    return (
        <Box
            sx={{
                width: "100%",
                maxWidth: { xs: "100%", sm: "780px" }, // 100% em mobile
                mt: 1,
                ml: { xs: 0, sm: 2 }, // Sem margem lateral em mobile
                backgroundColor: "#F5F5FA",
            }}
        >
            <Box sx={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box sx={{ flex: 1, position: "relative" }}>
                    <LinearProgress
                        variant="determinate"
                        value={percentageWatched}
                        sx={{
                            width: "100%",
                            height: 10,
                            borderRadius: 5,
                            backgroundColor: "#e0e0e0",
                            "& .MuiLinearProgress-bar": {
                                backgroundColor: percentageWatched >= 90 ? "#4caf50" : "#9041c1",
                                borderRadius: 5,
                                transition: "transform 0.3s ease-in-out",
                            },
                        }}
                    />
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: 2 }}>
                    <IconButton
                        onClick={handlePrevious}
                        disabled={!hasPrevious}
                        sx={{ color: hasPrevious ? "#9041c1" : "#cccccc" }}
                    >
                        <ArrowBackIcon />
                    </IconButton>
                    <IconButton
                        onClick={handleNext}
                        disabled={!hasNext}
                        sx={{ color: hasNext ? "#9041c1" : "#cccccc" }}
                    >
                        <ArrowForwardIcon />
                    </IconButton>
                </Box>
            </Box>

            <Box sx={{ width: "100%", mt: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 500 }}>
                    {formatTime(watchTime)}
                </Typography>
                <Typography
                    variant="caption"
                    sx={{
                        fontWeight: 600,
                        color: percentageWatched >= 90 ? "#4caf50" : "#9041c1",
                        backgroundColor: percentageWatched >= 90 ? "rgba(76, 175, 80, 0.1)" : "rgba(144, 65, 193, 0.1)",
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 10,
                    }}
                >
                    {percentageWatched}% {percentageWatched >= 90 ? "✓" : ""}
                </Typography>
            </Box>
        </Box>
    );
}

function formatTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const formattedHrs = hrs > 0 ? `${hrs}:` : "";
    const formattedMins = mins < 10 && hrs > 0 ? `0${mins}:` : `${mins}:`;
    const formattedSecs = secs < 10 ? `0${secs}` : `${secs}`;

    return `${formattedHrs}${formattedMins}${formattedSecs}`;
}

export { VideoPlayer, VideoWatcher };