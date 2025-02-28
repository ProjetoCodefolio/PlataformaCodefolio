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

const VideoList = ({ videos, setCurrentVideo, onQuizStart }) => {
    console.log("Videos no VideoList:", videos);

    return (
        <Box>
            {videos.map((video, index) => {
                const previousVideo = index > 0 ? videos[index - 1] : null;
                const isLocked =
                    video.requiresPrevious &&
                    previousVideo &&
                    (!previousVideo.watched || (previousVideo.quizId && !previousVideo.quizPassed));
                const isCompleted = video.watched && (!video.quizId || video.quizPassed);

                return (
                    <Card
                        key={video.id}
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            padding: 2,
                            marginBottom: 2,
                            backgroundColor: isLocked ? "#f0f0f0" : "#fff",
                            borderRadius: "16px",
                            boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
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
                                    {video.quizId && (
                                        <Typography variant="body2" color="textSecondary">
                                            {video.quizPassed ? "Quiz concluído ✅" : "Quiz pendente"}
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
                            {!isLocked && (
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
                            )}

                            {video.quizId && !video.quizPassed && !isLocked && (
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
                            )}

                            {video.quizId && video.quizPassed && !isLocked && (
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
                            )}

                            {isLocked && (
                                <Button
                                    variant="contained"
                                    disabled
                                    fullWidth
                                    startIcon={<LockIcon />}
                                    sx={{
                                        backgroundColor: "#e0e0e0",
                                        borderRadius: "12px",
                                        color: "#666",
                                        textTransform: "none",
                                        fontWeight: 500,
                                    }}
                                >
                                    Bloqueado
                                </Button>
                            )}
                        </CardActions>
                    </Card>
                );
            })}
        </Box>
    );
};

export default VideoList;