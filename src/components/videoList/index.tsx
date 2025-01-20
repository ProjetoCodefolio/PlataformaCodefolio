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

const VideoList = ({ videos, setCurrentVideo, onQuizStart }) => {
  return (
    <Box>
      {videos.map((video, index) => {
        const isLocked =
          index > 0 &&
          (!videos[index - 1]?.watched || !videos[index - 1]?.quizPassed);

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
              </Box>
            </CardContent>
            <CardActions>
              {video.watched && video.quizId ? (
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={() => onQuizStart(video.quizId)}
                  fullWidth
                  disabled={isLocked}
                >
                  Faça o Quiz
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => setCurrentVideo(video)}
                  fullWidth
                  disabled={isLocked}
                >
                  {video.watched ? "Rever Vídeo" : "Assistir"}
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
