import React, { useState, useEffect } from "react";
import ReactPlayer from "react-player";
import { Box } from "@mui/material";
import VideoWatcher from "../post/components/postCard/VideoWatcher";
import { ref, get, child } from "firebase/database";
import { database } from "../../service/firebase";

const VideoPlayer = ({ video, onMarkAsWatched, onNext, hasNext, currentUser }) => {
  const [playerInstance, setPlayerInstance] = useState(null);
  const [initialWatchTime, setInitialWatchTime] = useState(0);
  const [initialPercentageWatched, setInitialPercentageWatched] = useState(0);

  useEffect(() => {
    const fetchWatchTime = async () => {
      if (!currentUser || !video.id) return;

      const watchTimeRef = ref(database, "videoWatchTime");
      const userVideoRef = child(watchTimeRef, `${currentUser.uid}_${video.id}`);
      const snapshot = await get(userVideoRef);

      if (snapshot.exists()) {
        const data = snapshot.val();
        setInitialWatchTime(data.watchedTimeInSeconds || 0);
        setInitialPercentageWatched(parseFloat(data.percentageWatched) || 0);
      }
    };

    fetchWatchTime();
  }, [currentUser, video.id]);

  const handlePlayerReady = (reactPlayer) => {
    setPlayerInstance(reactPlayer.getInternalPlayer());
  };

  return (
    <Box>
      <ReactPlayer
        url={video.url}
        controls
        playing
        width="100%"
        height="600px"
        onReady={handlePlayerReady}
      />
      {playerInstance && (
        <VideoWatcher
          player={playerInstance}
          videoId={video.id}
          initialWatchTime={initialWatchTime}
          initialPercentageWatched={initialPercentageWatched}
          onMarkAsWatched={onMarkAsWatched}
        />
      )}
    </Box>
  );
};
export default VideoPlayer;
