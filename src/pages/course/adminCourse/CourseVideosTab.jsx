import { ref as firebaseRef, set, push, get, remove } from 'firebase/database';
import { database } from "../../../service/firebase";
import { useAuth } from '../../../context/AuthContext';
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
import { hasVideoQuizzes } from "../../../utils/courseUtils";
import { updateAllUsersCourseProgress } from '../../../service/courses';

const CourseVideosTab = forwardRef((props, ref) => {
    const [videos, setVideos] = useState([]);
    const [videoTitle, setVideoTitle] = useState("");
    const [videoUrl, setVideoUrl] = useState("");
    const [videoDescription, setVideoDescription] = useState("");
    const [requiresPrevious, setRequiresPrevious] = useState(true);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [videoToDelete, setVideoToDelete] = useState(null);

    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const { currentUser } = useAuth();
    const courseId = params.get("courseId");

    async function fetchCourseVideos() {
        const courseVideosRef = firebaseRef(database, `courseVideos/${courseId}`);
        const snapshot = await get(courseVideosRef);
        const courseVideos = snapshot.val();

        if (courseVideos) {
            const filteredVideos = await Promise.all(
                Object.entries(courseVideos).map(async ([key, video]) => {
                    const hasQuizzes = await hasVideoQuizzes(courseId, key);
                    return {
                        id: key,
                        ...video,
                        requiresPrevious: video.requiresPrevious !== undefined ? video.requiresPrevious : true,
                        hasQuizzes: hasQuizzes.length > 0,
                    };
                })
            );
            setVideos(filteredVideos);
        }
    }

    const handleAddVideo = async () => {
        if (!videoTitle.trim() || !videoUrl.trim()) {
            toast.error("Título e URL são obrigatórios");
            return;
        }

        try {
            const courseVideosRef = firebaseRef(database, `courseVideos/${courseId}`);
            const newVideoRef = push(courseVideosRef);

            const videoData = {
                title: videoTitle.trim(),
                url: videoUrl.trim(),
                description: String(videoDescription || ''),
                order: videos.length,
                requiresPrevious,
            };

            await set(newVideoRef, videoData);

            const updatedVideos = [...videos, { ...videoData, id: newVideoRef.key }];
            setVideos(updatedVideos);
            setVideoTitle("");
            setVideoUrl("");
            setVideoDescription("");
            setRequiresPrevious(true);
            setShowSuccessModal(true);

            // Atualizar progresso do curso para todos os usuários
            await updateAllUsersCourseProgress(courseId, updatedVideos);
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
                // Verificar se o vídeo possui quizzes
                const courseQuizzes = await hasVideoQuizzes(courseId, videoToDelete.id);

                if (courseQuizzes.length > 0) {
                    toast.error("Não é possível deletar o vídeo pois existe um quiz associado a ele.");
                    setShowDeleteModal(false);
                    setVideoToDelete(null);
                    return;
                }

                // deletar video da tabela de courseVideos
                const videoRef = firebaseRef(database, `courseVideos/${courseId}/${videoToDelete.id}`);
                await remove(videoRef);
                setVideos((prev) => prev.filter((video) => video.id !== videoToDelete.id));

                // deletar vídeo da tabela de videoProgress
                const videoProgressRef = firebaseRef(database, `videoProgress/${currentUser.uid}/${courseId}/${videoToDelete.id}`);
                await remove(videoProgressRef);

                // atualizar progresso do curso para todos os usuários
                const updatedVideos = videos.filter((video) => video.id !== videoToDelete.id);
                await updateAllUsersCourseProgress(courseId, updatedVideos);

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

                const courseVideosRef = firebaseRef(database, `courseVideos/${targetCourseId}`);
                const snapshot = await get(courseVideosRef);
                const existingVideos = snapshot.val() || {};

                const existingVideoIds = new Set(Object.keys(existingVideos));
                const currentVideoIds = new Set(videos.map(video => video.id).filter(id => id));

                for (const id of existingVideoIds) {
                    if (!currentVideoIds.has(id)) {
                        await remove(firebaseRef(database, `courseVideos/${targetCourseId}/${id}`));
                    }
                }

                for (const [index, video] of videos.entries()) {
                    const videoData = {
                        title: video.title,
                        url: video.url,
                        description: video.description || '',
                        order: index,
                        requiresPrevious: video.requiresPrevious,
                    };

                    if (video.id && existingVideoIds.has(video.id)) {
                        await set(firebaseRef(database, `courseVideos/${targetCourseId}/${video.id}`), videoData);
                    } else {
                        const newVideoRef = push(courseVideosRef);
                        await set(newVideoRef, videoData);
                        video.id = newVideoRef.key;
                    }
                }
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
                <Grid item xs={12}>
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
                                        color: 'grey', // Cor quando desmarcado
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

            <Typography variant="h6" sx={{ mt: 4, mb: 2, fontWeight: "bold", color: "#333" }}>
                Vídeos do Curso
            </Typography>

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
                            secondary={
                                <Typography component="span" sx={{ color: '#666' }}>
                                    {`Exige anteriores: ${video.requiresPrevious ? "Sim" : "Não"}`} <br />
                                    {`Existe Quiz: ${video.hasQuizzes ? "Sim" : "Não"}`}
                                </Typography>
                            }
                            primaryTypographyProps={{ sx: { fontWeight: 500, color: '#333' } }}
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