import { ref as firebaseRef, set, push, get, remove } from 'firebase/database';
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
    Modal,
    Typography,
    FormControlLabel,
    Switch,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { toast } from "react-toastify";

const CourseVideosTab = forwardRef((props, ref) => {
    const [videos, setVideos] = useState([]);
    const [videoTitle, setVideoTitle] = useState("");
    const [videoUrl, setVideoUrl] = useState("");
    const [videoDuration, setVideoDuration] = useState("");
    const [videoDescription, setVideoDescription] = useState("");
    const [requiresPrevious, setRequiresPrevious] = useState(true);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [videoToDelete, setVideoToDelete] = useState(null);

    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const courseId = params.get("courseId");

    async function fetchCourseVideos() {
        const courseVideosRef = firebaseRef(database, 'courseVideos');
        const snapshot = await get(courseVideosRef);
        const courseVideos = snapshot.val();

        if (courseVideos) {
            const filteredVideos = Object.entries(courseVideos)
                .filter(([_, video]) => video.courseId === courseId)
                .map(([key, video]) => ({
                    id: key,
                    ...video,
                    requiresPrevious: video.requiresPrevious !== undefined ? video.requiresPrevious : true,
                }));
            setVideos(filteredVideos);
        }
    }

    const handleAddVideo = async () => {
        if (!videoTitle.trim() || !videoUrl.trim()) {
            toast.error("Título e URL são obrigatórios");
            return;
        }

        try {
            const courseVideosRef = firebaseRef(database, "courseVideos");
            const newVideoRef = push(courseVideosRef);
            
            const videoData = {
                courseId: courseId || null,
                title: videoTitle.trim(),
                url: videoUrl.trim(),
                duration: videoDuration || '',
                description: videoDescription || '',
                order: videos.length,
                requiresPrevious,
            };

            await set(newVideoRef, videoData);

            setVideos(prev => [...prev, { ...videoData, id: newVideoRef.key }]);
            setVideoTitle("");
            setVideoUrl("");
            setVideoDuration("");
            setVideoDescription("");
            setRequiresPrevious(true);
            setShowSuccessModal(true);
        } catch (error) {
            console.error("Erro ao adicionar vídeo:", error);
            toast.error("Erro ao adicionar vídeo");
        }
    };

    const handleRemoveVideo = (id) => {
        const video = videos.find((v) => v.id === id);
        setVideoToDelete(video);
        setShowDeleteModal(true);
    };

    const confirmRemoveVideo = async () => {
        if (videoToDelete && videoToDelete.id) {
            try {
                const videoRef = firebaseRef(database, `courseVideos/${videoToDelete.id}`);
                await remove(videoRef);
                setVideos((prev) => prev.filter((video) => video.id !== videoToDelete.id));
                toast.success("Vídeo deletado com sucesso!");
            } catch (error) {
                console.error("Erro ao excluir vídeo:", error);
                toast.error("Erro ao excluir vídeo");
            }
        }
        setShowDeleteModal(false);
        setVideoToDelete(null);
    };

    useImperativeHandle(ref, () => ({
        async saveVideos(newCourseId = null) {
            try {
                const targetCourseId = newCourseId || courseId;
                if (!targetCourseId) throw new Error("ID do curso não disponível");

                const courseVideosRef = firebaseRef(database, "courseVideos");
                const snapshot = await get(courseVideosRef);
                const existingVideos = snapshot.val() || {};

                const existingVideoIds = new Set(Object.keys(existingVideos));
                const currentVideoIds = new Set(videos.map(video => video.id).filter(id => id));

                for (const id of existingVideoIds) {
                    if (!currentVideoIds.has(id) && existingVideos[id].courseId === targetCourseId) {
                        await remove(firebaseRef(database, `courseVideos/${id}`));
                    }
                }

                for (const [index, video] of videos.entries()) {
                    const videoData = {
                        courseId: targetCourseId,
                        title: video.title,
                        url: video.url,
                        duration: video.duration || '',
                        description: video.description || '',
                        order: index,
                        requiresPrevious: video.requiresPrevious,
                    };

                    if (video.id && existingVideoIds.has(video.id)) {
                        await set(firebaseRef(database, `courseVideos/${video.id}`), videoData);
                    } else {
                        const newVideoRef = push(courseVideosRef);
                        await set(newVideoRef, videoData);
                        video.id = newVideoRef.key;
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
        if (courseId) {
            fetchCourseVideos();
        }
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
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                '& fieldset': { borderColor: '#666' },
                                '&:hover fieldset': { borderColor: '#9041c1' },
                                '&.Mui-focused fieldset': { borderColor: '#9041c1' },
                            },
                            '& .MuiInputLabel-root': {
                                color: '#666',
                                '&.Mui-focused': { color: '#9041c1' },
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
                                '& fieldset': { borderColor: '#666' },
                                '&:hover fieldset': { borderColor: '#9041c1' },
                                '&.Mui-focused fieldset': { borderColor: '#9041c1' },
                            },
                            '& .MuiInputLabel-root': {
                                color: '#666',
                                '&.Mui-focused': { color: '#9041c1' },
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
                                '& fieldset': { borderColor: '#666' },
                                '&:hover fieldset': { borderColor: '#9041c1' },
                                '&.Mui-focused fieldset': { borderColor: '#9041c1' },
                            },
                            '& .MuiInputLabel-root': {
                                color: '#666',
                                '&.Mui-focused': { color: '#9041c1' },
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
                                '& fieldset': { borderColor: '#666' },
                                '&:hover fieldset': { borderColor: '#9041c1' },
                                '&.Mui-focused fieldset': { borderColor: '#9041c1' },
                            },
                            '& .MuiInputLabel-root': {
                                color: '#666',
                                '&.Mui-focused': { color: '#9041c1' },
                            },
                        }}
                    />
                </Grid>
                <Grid item xs={12}>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={requiresPrevious}
                                onChange={(e) => setRequiresPrevious(e.target.checked)}
                                sx={{
                                    '& .MuiSwitch-switchBase': {
                                        color: '#9041c1', // Cor quando desmarcado
                                        '&.Mui-checked': {
                                            color: '#9041c1', // Cor quando marcado
                                        },
                                        '&.Mui-checked + .MuiSwitch-track': {
                                            backgroundColor: '#9041c1', // Cor da trilha quando marcado
                                        },
                                    },
                                    '& .MuiSwitch-track': {
                                        backgroundColor: '#666', // Cor da trilha quando desmarcado
                                    },
                                }}
                            />
                        }
                        label="Exige completar vídeos anteriores"
                        sx={{ color: '#666' }}
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
                    '&:hover': { backgroundColor: "#7d37a7" }
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
                            '&:hover': { backgroundColor: "rgba(144, 65, 193, 0.04)" }
                        }}
                        secondaryAction={
                            <IconButton
                                edge="end"
                                onClick={() => handleRemoveVideo(video.id)}
                                sx={{ color: '#666', '&:hover': { color: '#d32f2f' } }}
                            >
                                <DeleteIcon />
                            </IconButton>
                        }
                    >
                        <ListItemText
                            primary={video.title}
                            secondary={`Exige anteriores: ${video.requiresPrevious ? "Sim" : "Não"}`}
                            primaryTypographyProps={{ sx: { fontWeight: 500, color: '#333' } }}
                            secondaryTypographyProps={{ sx: { color: '#666' } }}
                        />
                    </ListItem>
                ))}
            </List>

            <Modal
                open={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                aria-labelledby="success-modal-title"
            >
                <Box sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 400,
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                    boxShadow: 24,
                    p: 4,
                    textAlign: 'center',
                }}>
                    <CheckCircleOutlineIcon sx={{ fontSize: 60, color: '#4caf50', mb: 2 }} />
                    <Typography id="success-modal-title" variant="h6" sx={{ mb: 2 }}>
                        Vídeo adicionado com sucesso!
                    </Typography>
                    <Button
                        variant="contained"
                        onClick={() => setShowSuccessModal(false)}
                        sx={{ backgroundColor: "#9041c1", '&:hover': { backgroundColor: "#7d37a7" } }}
                    >
                        OK
                    </Button>
                </Box>
            </Modal>

            <Modal
                open={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                aria-labelledby="delete-modal-title"
            >
                <Box sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 400,
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                    boxShadow: 24,
                    p: 4,
                    textAlign: 'center',
                }}>
                    <Typography id="delete-modal-title" variant="h6" sx={{ mb: 2 }}>
                        Tem certeza que deseja excluir "{videoToDelete?.title}"?
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                        <Button
                            variant="contained"
                            color="error"
                            onClick={confirmRemoveVideo}
                        >
                            Sim, Excluir
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={() => setShowDeleteModal(false)}
                        >
                            Cancelar
                        </Button>
                    </Box>
                </Box>
            </Modal>
        </Box>
    );
});

export default CourseVideosTab;