import React from "react";
import {
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Box,
  Typography,
} from "@mui/material";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

const VideoList = ({ videos, setCurrentVideo }) => {
  return (
    <Box>
      <List>
        {videos.map((video) => (
          <ListItem
            key={video.id}
            button
            onClick={() => setCurrentVideo(video)}
            sx={{
              backgroundColor: "#ffffff",
              color: "#333",
              mb: 1,
              borderRadius: "8px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
              "&:hover": { backgroundColor: "#f0f0f0" },
            }}
          >
            <ListItemIcon>
              {video.watched ? (
                <CheckCircleIcon sx={{ color: "#4caf50" }} />
              ) : (
                <PlayCircleOutlineIcon sx={{ color: "#333" }} />
              )}
            </ListItemIcon>
            <ListItemText
              primary={video.title}
              secondary={video.duration}
              sx={{
                "& .MuiListItemText-primary": {
                  fontWeight: video.watched ? 700 : 400,
                },
                "& .MuiListItemText-secondary": { color: "#888" },
              }}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default VideoList;
