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
  return (
    <Box>
      {videos.map((video, index) => {
        const previousVideo = index > 0 ? videos[index - 1] : null;

        const isLocked =
          previousVideo &&
          (!previousVideo.watched ||
            (previousVideo.quizId && !previousVideo.quizPassed));

        console.log(
          `Vídeo: ${video.title} | Bloqueado: ${isLocked} | Assistido: ${video.watched} | Quiz passado: ${video.quizPassed}`
        );

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
              borderRadius: "8px",
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
                  <Typography variant="h6" fontWeight="bold">
                    {video.title}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {video.duration}
                  </Typography>
                </Box>
                {video.watched && (
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
              sx={{ display: "flex", flexDirection: "column", gap: 1 }}
            >
              {!isLocked && (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => setCurrentVideo(video)}
                  fullWidth
                  startIcon={<PlayCircleIcon />}
                  sx={{ marginLeft: "8px" }}
                >
                  {video.watched ? "Rever Vídeo" : "Assistir"}
                </Button>
              )}

              {video.quizId && !video.quizPassed && !isLocked && (
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={() => onQuizStart(video.quizId)}
                  fullWidth
                  startIcon={<QuizIcon />}
                >
                  Fazer Quiz
                </Button>
              )}

              {video.quizId && video.quizPassed && !isLocked && (
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={() => onQuizStart(video.quizId)}
                  fullWidth
                  startIcon={<ReplayIcon />}
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
