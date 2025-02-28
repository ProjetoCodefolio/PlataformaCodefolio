import React, { useState, useEffect, useRef, forwardRef } from "react";
import PropTypes from "prop-types";
import { ref, get } from "firebase/database";
import { database } from "../../service/firebase";
import { useAuth } from "../../context/AuthContext";
import { LinearProgress, Box, Typography, Paper } from "@mui/material";
import YouTube from "react-youtube";
import { toast } from "react-toastify";
import { debounce } from "lodash";

const VideoPlayer = forwardRef(({ video, onProgress }, ref) => {
    if (!video || !video.url) {
        return (
            <Paper elevation={3} sx={{ p: 4, textAlign: "center", borderRadius: "12px" }}>
                <Typography variant="h6" color="error">Erro: Nenhum vídeo disponível</Typography>
            </Paper>
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
        event.target.seekTo(video.watchedTime || 0); // Apenas define o início, sem forçar
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

    return (
        <Paper
            elevation={4}
            sx={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                borderRadius: "16px",
                overflow: "hidden",
                background: "linear-gradient(to bottom, rgb(255, 255, 255), #ffffff)",
                p: 3,
            }}
        >
            <Typography
                variant="h5"
                sx={{
                    mb: 2,
                    fontWeight: 600,
                    color: "#333",
                    marginRight: "5%",
                    textAlign: "center",
                    width: "100%",
                }}
            >
                {video.title || "Vídeo"}
            </Typography>

            <Box
                sx={{
                    width: "100%",
                    maxWidth: "780px",
                    position: "relative",
                    display: "flex",
                    justifyContent: "center",
                    borderRadius: "12px",
                    overflow: "hidden",
                    marginRight: "5%",
                }}
            >
                {video.url.includes("youtube.com") || video.url.includes("youtu.be") ? (
                    <YouTube
                        videoId={video.url.match(/(?:youtu\.be\/|youtube\.com\/.*v=)([^#&?]*)/)[1]}
                        opts={{
                            width: "780px",
                            height: "450",
                            playerVars: {
                                autoplay: 0,
                                modestbranding: 1,
                                rel: 0,
                                fs: 1,
                            },
                        }}
                        onReady={onReady}
                        className="youtube-player"
                    />
                ) : (
                    <video
                        ref={videoRef}
                        src={video.url}
                        controls
                        style={{
                            width: "100%",
                            height: "450px",
                            borderRadius: "12px",
                            objectFit: "cover",
                            background: "#000",
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
                />
            )}

            {video.description && (
                <Box sx={{ width: "100%", mt: 3, px: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: "#555" }}>
                        Descrição:
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#666", lineHeight: 1.6 }}>
                        {video.description}
                    </Typography>
                </Box>
            )}
        </Paper>
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
}) {
    const { userDetails } = useAuth();
    const progressInterval = useRef(null);
    const [lastSavedPercentage, setLastSavedPercentage] = useState(percentageWatched);

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
                    // Só atualiza se o tempo atual for maior que o registrado
                    if (currentTime > watchTime) {
                        setWatchTime(currentTime);
                        setPercentageWatched(newPercentage);
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
        };
    }, [player, videoId, watchTime, debouncedSaveProgress, setPercentageWatched, setWatchTime]);

    return (
        <Box sx={{ width: "90%", maxWidth: "780px", mt: 3, mb: 1 }}>
            <Box sx={{ position: "relative", height: "10px", mb: 1 }}>
                <LinearProgress
                    variant="determinate"
                    value={percentageWatched}
                    sx={{
                        height: 10,
                        borderRadius: 5,
                        marginRight: "5.5%",
                        backgroundColor: "#e0e0e0",
                        "& .MuiLinearProgress-bar": {
                            backgroundColor: percentageWatched >= 90 ? "#4caf50" : "#9041c1",
                            borderRadius: 5,
                            transition: "transform 0.3s ease-in-out",
                        },
                    }}
                />
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
                        marginRight: "4.5%",
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