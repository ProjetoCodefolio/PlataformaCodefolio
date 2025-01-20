import React, { useState, useEffect } from "react";
import ReactPlayer from "react-player";
import { Typography, Box } from "@mui/material";

const VideoPlayer = ({ video, onMarkAsWatched, onNext, hasNext }) => {
  const [played, setPlayed] = useState(0);

  useEffect(() => {
    setPlayed(0);
  }, [video]);

  const handleProgress = (progress) => {
    setPlayed(progress.played);
  };

  const handleEnded = () => {
    if (played >= 0.95) {
      onMarkAsWatched();
    }
    if (hasNext) {
      onNext();
    }
  };

  return (
    <Box>
      <ReactPlayer
        url={video.url}
        controls
        playing
        onProgress={handleProgress}
        onEnded={handleEnded}
        width="100%"
        height="600px"
      />
      {/* <Typography variant="body1" sx={{ mt: 2 }}>
        Progresso: {(played * 100).toFixed(2)}%
      </Typography> */}
    </Box>
  );
};

export default VideoPlayer;
