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

    // Adicione validação de URL
    const validateVideoUrl = (url) => {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    };

    // Modifique a função handleAddVideo
    const handleAddVideo = async () => {
        if (!videoTitle.trim() || !videoUrl.trim()) {
            alert("Título e URL são obrigatórios");
            return;
        }
    
        try {
            const courseVideosRef = firebaseRef(database, "courseVideos");
            const newVideoRef = push(courseVideosRef);
            
            // Estrutura igual aos vídeos antigos
            const videoData = {
                courseId: courseId,
                title: videoTitle.trim(),
                url: videoUrl.trim(),
                duration: videoDuration || '',
                description: videoDescription || ''
            };
    
            await set(newVideoRef, videoData);
    
            setVideos(prev => [...prev, { 
                ...videoData, 
                id: newVideoRef.key 
            }]);
    
            // Limpa os campos
            setVideoTitle("");
            setVideoUrl("");
            setVideoDuration("");
            setVideoDescription("");
    
            alert("Vídeo adicionado com sucesso!");
    
        } catch (error) {
            console.error("Erro ao adicionar vídeo:", error);
            alert("Erro ao adicionar vídeo");
        }
    };

    const handleRemoveVideo = (id) => {
        let response = window.confirm("Deseja realmente deletar este vídeo?")
        if (response) {
            setVideos((prev) => prev.filter((video) => video.id !== id));
        }
    };

    useImperativeHandle(ref, () => ({
        async saveVideos(newCourseId = null) {
            try {
              const targetCourseId = newCourseId || courseId;
              
              if (!targetCourseId) {
                throw new Error("ID do curso não disponível");
              }
      
              const courseVideosRef = firebaseRef(database, "courseVideos");
              
              // Salva cada vídeo
              for (const video of videos) {
                const videoData = {
                  courseId: targetCourseId,
                  title: video.title,
                  url: video.url,
                  duration: video.duration || '',
                  description: video.description || ''
                };
      
                if (video.id) {
                  // Atualiza vídeo existente
                  await set(firebaseRef(database, `courseVideos/${video.id}`), videoData);
                } else {
                  // Cria novo vídeo
                  const newVideoRef = push(courseVideosRef);
                  await set(newVideoRef, videoData);
                }
              }
      
              console.log("Vídeos salvos com sucesso!");
              return true;
            } catch (error) {
              console.error("Erro ao salvar vídeos:", error);
              throw error;
            }
          }
      }));

      useEffect(() => {
        const loadCourse = async () => {
            if (courseId) {
                console.log("Buscando vídeos para o curso:", courseId);
                await fetchCourseVideos();
            }
        };
        loadCourse();
    }, [courseId]);

    // Adicione um console.log para debug
    useEffect(() => {
        console.log("Videos atuais:", videos);
    }, [videos]);

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
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                '& fieldset': {
                                    borderColor: '#666',
                                },
                                '&:hover fieldset': {
                                    borderColor: '#9041c1',
                                },
                                '&.Mui-focused fieldset': {
                                    borderColor: '#9041c1',
                                },
                            },
                            '& .MuiInputLabel-root': {
                                color: '#666',
                                '&.Mui-focused': {
                                    color: '#9041c1',
                                },
                            },
                            '& .MuiInputBase-input': {
                                '&::selection': {
                                    backgroundColor: 'rgba(144, 65, 193, 0.1)',
                                },
                            },
                        }}
                    />
                </Grid>
                <Grid item xs={6}>
                    <TextField
                        label="URL do Vídeo"
                        fullWidth
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        variant="outlined"
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                '& fieldset': {
                                    borderColor: '#666',
                                },
                                '&:hover fieldset': {
                                    borderColor: '#9041c1',
                                },
                                '&.Mui-focused fieldset': {
                                    borderColor: '#9041c1',
                                },
                            },
                            '& .MuiInputLabel-root': {
                                color: '#666',
                                '&.Mui-focused': {
                                    color: '#9041c1',
                                },
                            },
                            '& .MuiInputBase-input': {
                                '&::selection': {
                                    backgroundColor: 'rgba(144, 65, 193, 0.1)',
                                },
                            },
                        }}
                    />
                </Grid>
                <Grid item xs={6}>
                    <TextField
                        label="Duração (hh:mm:ss)"
                        fullWidth
                        value={videoDuration}
                        onChange={(e) => setVideoDuration(e.target.value)}
                        variant="outlined"
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                '& fieldset': {
                                    borderColor: '#666',
                                },
                                '&:hover fieldset': {
                                    borderColor: '#9041c1',
                                },
                                '&.Mui-focused fieldset': {
                                    borderColor: '#9041c1',
                                },
                            },
                            '& .MuiInputLabel-root': {
                                color: '#666',
                                '&.Mui-focused': {
                                    color: '#9041c1',
                                },
                            },
                            '& .MuiInputBase-input': {
                                '&::selection': {
                                    backgroundColor: 'rgba(144, 65, 193, 0.1)',
                                },
                            },
                        }}
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
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                '& fieldset': {
                                    borderColor: '#666',
                                },
                                '&:hover fieldset': {
                                    borderColor: '#9041c1',
                                },
                                '&.Mui-focused fieldset': {
                                    borderColor: '#9041c1',
                                },
                            },
                            '& .MuiInputLabel-root': {
                                color: '#666',
                                '&.Mui-focused': {
                                    color: '#9041c1',
                                },
                            },
                            '& .MuiInputBase-input': {
                                '&::selection': {
                                    backgroundColor: 'rgba(144, 65, 193, 0.1)',
                                },
                            },
                        }}
                    />
                </Grid>
            </Grid>

            <Button
                variant="contained"
                onClick={handleAddVideo}
                sx={{
                    mt: 3,
                    p: 1.5,
                    fontWeight: "bold",
                    backgroundColor: "#9041c1",
                    '&:hover': {
                        backgroundColor: "#7d37a7"
                    }
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
                            backgroundColor: "white",
                            '&:hover': {
                                backgroundColor: "rgba(144, 65, 193, 0.04)"
                            }
                        }}
                        secondaryAction={
                            <IconButton
                                edge="end"
                                onClick={() => handleRemoveVideo(video.id)}
                                sx={{
                                    color: '#666',
                                    '&:hover': {
                                        color: '#d32f2f'
                                    }
                                }}
                            >
                                <DeleteIcon />
                            </IconButton>
                        }
                    >
                        <ListItemText
                            primary={video.title}
                            secondary={`URL: ${video.url} | Duração: ${video.duration}`}
                            primaryTypographyProps={{
                                sx: {
                                    fontWeight: 500,
                                    color: '#333',
                                    '&:hover': {
                                        color: '#9041c1'
                                    }
                                }
                            }}
                            secondaryTypographyProps={{
                                sx: {
                                    color: '#666'
                                }
                            }}
                        />
                    </ListItem>
                ))}
            </List>
        </Box>
    );
});

export default CourseVideosTab;