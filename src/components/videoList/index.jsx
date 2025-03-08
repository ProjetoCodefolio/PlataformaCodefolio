import React from "react";
import {
    Box,
    Typography,
    Button,
    Card,
    CardContent,
    CardActions,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import LockIcon from "@mui/icons-material/Lock";
import ReplayIcon from "@mui/icons-material/Replay";
import QuizIcon from "@mui/icons-material/Quiz";
import { toast } from "react-toastify";

const VideoList = ({ videos, setCurrentVideo, onQuizStart, currentVideoId }) => {
    console.log("Videos no VideoList:", videos);

    const handleLockedClick = (video, previousVideo) => {
        if (previousVideo) {
            if (!previousVideo.watched) {
                toast.warn(`Você precisa assistir o vídeo anterior: "${previousVideo.title}" antes de prosseguir!`);
            } else if (previousVideo.quizId && !previousVideo.quizPassed) {
                toast.warn(`Você precisa completar o quiz do vídeo anterior: "${previousVideo.title}" antes de prosseguir!`);
            }
        }
    };

    const handleQuizLockedClick = (video) => {
        toast.warn(`Você precisa assistir o vídeo "${video.title}" para liberar o quiz!`);
    };

    return (
        <Box>
            {videos.map((video, index) => {
                const previousVideo = index > 0 ? videos[index - 1] : null;
                const isLocked =
                    video.requiresPrevious &&
                    previousVideo &&
                    (!previousVideo.watched || (previousVideo.quizId && !previousVideo.quizPassed));
                const isCompleted = video.watched && (!video.quizId || video.quizPassed);
                const isCurrent = video.id === currentVideoId;
                const isQuizLocked = !video.watched;

                return (
                    <Card
                        key={video.id}
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            padding: 2,
                            marginBottom: 2,
                            backgroundColor: "#F5F5FA",
                            borderRadius: "16px",
                            border: isCurrent
                                ? "2px solid #9041c1"
                                : "1px solid #e0e0e0",
                            opacity: isLocked ? 0.5 : 1,
                            position: "relative",
                        }}
                    >
                        <CardContent>
                            <Box
                                display="flex"
                                alignItems="center"
                                justifyContent="space-between"
                            >
                                <Box>
                                    <Typography variant="h6" fontWeight="bold" sx={{ color: "#333" }}>
                                        {video.title}
                                    </Typography>
                                    {isCurrent && (
                                        <Typography
                                            variant="body2"
                                            sx={{ color: "#9041c1", fontWeight: "bold", mt: 0.5 }}
                                        >
                                            Vídeo atual
                                        </Typography>
                                    )}
                                    {isLocked && (
                                        <Typography
                                            variant="body2"
                                            sx={{ color: "#d32f2f", fontWeight: "bold", mt: 0.5 }}
                                        >
                                            Vídeo bloqueado
                                        </Typography>
                                    )}
                                    {video.quizId && !isLocked && !isCurrent && (
                                        <Typography variant="body2" color="textSecondary">
                                            {video.quizPassed ? "Quiz concluído ✅" : isQuizLocked ? "Quiz bloqueado 🔒" : "Quiz pendente"}
                                        </Typography>
                                    )}
                                </Box>
                                {isCompleted && (
                                    <CheckCircleIcon
                                        sx={{
                                            color: "#4caf50",
                                            fontSize: 24,
                                            marginLeft: "10px",
                                        }}
                                    />
                                )}
                                {isLocked && (
                                    <LockIcon
                                        sx={{
                                            color: "#d32f2f",
                                            fontSize: 24,
                                            marginLeft: "10px",
                                        }}
                                    />
                                )}
                            </Box>
                        </CardContent>

                        <CardActions
                            sx={{
                                display: "flex",
                                flexDirection: "row",
                                justifyContent: "space-between",
                                gap: 2,
                                px: 2,
                                pb: 2,
                            }}
                        >
                            {!isLocked ? (
                                <Button
                                    variant="contained"
                                    onClick={() => setCurrentVideo(video)}
                                    startIcon={<PlayCircleIcon />}
                                    sx={{
                                        backgroundColor: "#9041c1",
                                        borderRadius: "12px",
                                        "&:hover": { backgroundColor: "#7d37a7" },
                                        textTransform: "none",
                                        fontWeight: 500,
                                        flex: 1,
                                    }}
                                >
                                    {video.watched ? "Rever Vídeo" : "Assistir"}
                                </Button>
                            ) : (
                                <Button
                                    variant="contained"
                                    onClick={() => handleLockedClick(video, previousVideo)}
                                    startIcon={<LockIcon />}
                                    sx={{
                                        backgroundColor: "#e0e0e0",
                                        borderRadius: "12px",
                                        color: "#666",
                                        textTransform: "none",
                                        fontWeight: 500,
                                        flex: 1,
                                    }}
                                >
                                    Bloqueado
                                </Button>
                            )}

                            {video.quizId && !video.quizPassed && !isLocked && (
                                isQuizLocked ? (
                                    <Button
                                        variant="contained"
                                        onClick={() => handleQuizLockedClick(video)}
                                        startIcon={<LockIcon />}
                                        sx={{
                                            backgroundColor: "#e0e0e0",
                                            borderRadius: "12px",
                                            color: "#666",
                                            textTransform: "none",
                                            fontWeight: 500,
                                            flex: 1,
                                        }}
                                    >
                                        Quiz Bloqueado
                                    </Button>
                                ) : (
                                    <Button
                                        variant="contained"
                                        onClick={() => onQuizStart(video.quizId)}
                                        startIcon={<QuizIcon />}
                                        sx={{
                                            backgroundColor: "#9041c1",
                                            borderRadius: "12px",
                                            "&:hover": { backgroundColor: "#7d37a7" },
                                            textTransform: "none",
                                            fontWeight: 500,
                                            flex: 1,
                                        }}
                                    >
                                        Fazer Quiz
                                    </Button>
                                )
                            )}

                            {video.quizId && video.quizPassed && !isLocked && (
                                isQuizLocked ? (
                                    <Button
                                        variant="contained"
                                        onClick={() => handleQuizLockedClick(video)}
                                        startIcon={<LockIcon />}
                                        sx={{
                                            backgroundColor: "#e0e0e0",
                                            borderRadius: "12px",
                                            color: "#666",
                                            textTransform: "none",
                                            fontWeight: 500,
                                            flex: 1,
                                        }}
                                    >
                                        Quiz Bloqueado
                                    </Button>
                                ) : (
                                    <Button
                                        variant="outlined"
                                        onClick={() => onQuizStart(video.quizId)}
                                        startIcon={<ReplayIcon />}
                                        sx={{
                                            borderColor: "#9041c1",
                                            color: "#9041c1",
                                            borderRadius: "12px",
                                            "&:hover": { borderColor: "#7d37a7", color: "#7d37a7" },
                                            textTransform: "none",
                                            fontWeight: 500,
                                            flex: 1,
                                        }}
                                    >
                                        Refazer Quiz
                                    </Button>
                                )
                            )}
                        </CardActions>
                    </Card>
                );
            })}
        </Box>
    );
};

export default VideoList;