import { ref as firebaseRef, set, push, get } from 'firebase/database';
import { database } from "../../../service/firebase";
import { useLocation } from "react-router-dom";
import React, { useEffect, useState, forwardRef, useImperativeHandle } from "react";

import {
    Box,
    TextField,
    Button,
    IconButton,
    List,
    ListItem,
    ListItemText,
    Grid,
} from "@mui/material";

import DeleteIcon from "@mui/icons-material/Delete";

const CourseVideosTab = forwardRef((props, ref) => {

    const [videos, setVideos] = useState([]);

    const [videoTitle, setVideoTitle] = useState("");
    const [videoUrl, setVideoUrl] = useState("");
    const [videoDuration, setVideoDuration] = useState("");
    const [videoDescription, setVideoDescription] = useState("");

    const location = useLocation();

    const params = new URLSearchParams(location.search);
    const courseId = params.get("courseId");

    async function fetchCourseVideos() {
        const courseVideosRef = firebaseRef(database, 'courseVideos');
        const snapshot = await get(courseVideosRef);
        const courseVideos = snapshot.val();

        if (courseVideos) {
            const filteredVideos = Object.entries(courseVideos)
                .filter(([key, video]) => video.courseId === courseId)
                .map(([key, video]) => ({ id: key, ...video }));
            setVideos(filteredVideos);
        }
    }

    const handleAddVideo = () => {
        const newVideo = {
            id: videos.length + 1,
            title: videoTitle,
            url: videoUrl,
            duration: videoDuration,
            description: videoDescription,
        };
        setVideos((prev) => [...prev, newVideo]);
        setVideoTitle("");
        setVideoUrl("");
        setVideoDuration("");
        setVideoDescription("");
    };

    const handleRemoveVideo = (id) => {
        let response = window.confirm("Deseja realmente deletar este vídeo?")
        if (response) {
            setVideos((prev) => prev.filter((video) => video.id !== id));
        }
    };

    const saveVideos = async () => {
        const courseVideosRef = firebaseRef(database, "courseVideos");
        const snapshot = await get(courseVideosRef);
        const existingVideos = snapshot.val() || {};

        const existingVideoIds = new Set(Object.keys(existingVideos));
        const currentVideoIds = new Set(videos.map(video => video.id));

        // Remove videos that are no longer in the state and belong to the current course
        for (const id of existingVideoIds) {
            const video = existingVideos[id];
            if (video.courseId === courseId && !currentVideoIds.has(id)) {
                const videoRef = firebaseRef(database, `courseVideos/${id}`);
                await set(videoRef, null);
            }
        }

        // Add or update videos in the state
        videos.forEach(async (video) => {
            const videoData = {
                courseId: courseId,
                title: video.title,
                url: video.url,
                duration: video.duration,
                description: video.description,
            };

            try {
                if (!existingVideoIds.has(video.id)) {
                    const newVideoRef = push(courseVideosRef);
                    await set(newVideoRef, videoData);
                } else {
                    const videoRef = firebaseRef(database, `courseVideos/${video.id}`);
                    await set(videoRef, videoData);
                }
            } catch (error) {
                console.error("Erro ao salvar os vídeos:", error);
                alert("Erro ao salvar os vídeos.");
            }
        });

        alert("Vídeos salvos com sucesso!");
    };

    useImperativeHandle(ref, () => ({
        saveVideos,
      }));

      useEffect(() => {
        const loadCourse = async () => {
            if (courseId) {
                await fetchCourseVideos();
            }
        };
        loadCourse();
    }, [courseId]);

    return (
        <Box sx={{ mt: 4 }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label="Título do Vídeo"
                    fullWidth
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="URL do Vídeo"
                    fullWidth
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Duração (hh:mm:ss)"
                    fullWidth
                    value={videoDuration}
                    onChange={(e) => setVideoDuration(e.target.value)}
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Descrição do Vídeo"
                    fullWidth
                    value={videoDescription}
                    onChange={(e) => setVideoDescription(e.target.value)}
                    multiline
                    rows={3}
                    variant="outlined"
                  />
                </Grid>
              </Grid>
              <Button
                variant="contained"
                color="primary"
                onClick={handleAddVideo}
                sx={{
                  mt: 3,
                  p: 1.5,
                  fontWeight: "bold",
                }}
              >
                Adicionar Vídeo
              </Button>

              <List sx={{ mt: 4 }}>
                {videos.map((video) => (
                  <ListItem
                    key={video.id}
                    sx={{
                      p: 2,
                      border: "1px solid #ddd",
                      borderRadius: "8px",
                      mb: 2,
                    }}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        onClick={() => handleRemoveVideo(video.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    }
                  >
                    <ListItemText
                      primary={video.title}
                      secondary={`URL: ${video.url} | Duração: ${video.duration}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
    );
});

export default CourseVideosTab;