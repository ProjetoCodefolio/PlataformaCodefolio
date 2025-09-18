import React, {
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";
import { useAuth } from "$context/AuthContext";
import { useLocation } from "react-router-dom";
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
  Switch
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { toast } from "react-toastify";
import {
  fetchCourseVideos,
  addCourseVideo,
  updateCourseVideo,
  deleteCourseVideo,
  saveAllCourseVideos,
  validateCourseVideos,
  isValidYouTubeUrl,
} from "$api/services/courses/videos";

const CourseVideosTab = forwardRef((props, ref) => {
  const [videos, setVideos] = useState([]);
  const [videoTitle, setVideoTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoDescription, setVideoDescription] = useState("");
  const [videoOrder, setVideoOrder] = useState(0);
  const [videoRequiresPrevious, setVideoRequiresPrevious] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState(null);
  const [videoToEdit, setVideoToEdit] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [lastAction, setLastAction] = useState(null);
  const [videoUrlError, setVideoUrlError] = useState("");

  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const { currentUser } = useAuth();
  const courseId = params.get("courseId");

  const videosTabRef = useRef(null);

  const loadVideos = async () => {
    try {
      if (courseId) {
        const fetchedVideos = await fetchCourseVideos(courseId);
        setVideos(fetchedVideos);
      }
    } catch (error) {
      console.error("Erro ao buscar vídeos:", error);
      toast.error("Erro ao carregar os vídeos do curso");
    }
  };

  // Modificar a função handleAddVideo
  const handleAddVideo = async () => {
    if (!videoTitle.trim() || !videoUrl.trim()) {
      toast.error("Título e URL são obrigatórios");
      return;
    }

    try {
      const videoData = {
        title: videoTitle.trim(),
        url: videoUrl.trim(),
        description: videoDescription,
        order: videos.length,
        requiresPrevious: videoRequiresPrevious
      };

      const newVideo = await addCourseVideo(courseId, videoData);

      setVideos((prev) => [...prev, newVideo]);
      setVideoTitle("");
      setVideoUrl("");
      setVideoDescription("");
      setShowSuccessModal(true);
      setLastAction("add");
    } catch (error) {
      console.error("Erro ao adicionar vídeo:", error);
      toast.error(error.message || "Erro ao adicionar vídeo");
    }
  };

  const handleEditVideo = (video) => {
    setIsEditing(true);
    setVideoToEdit(video.id);
    setVideoTitle(video.title);
    setVideoUrl(video.url);
    setVideoDescription(video.description || "");
    setVideoRequiresPrevious(video.requiresPrevious || false);
    setVideoOrder(video.order || 0);
  };

  // Modificar a função handleEditVideoSubmit
  const handleEditVideoSubmit = async () => {
    if (!videoTitle.trim() || !videoUrl.trim()) {
      toast.error("Título e URL são obrigatórios");
      return;
    }

    try {
      const videoData = {
        title: videoTitle.trim(),
        url: videoUrl.trim(),
        description: videoDescription,
        requiresPrevious: videoRequiresPrevious,
        order: videoOrder,
      };

      const updatedVideo = await updateCourseVideo(
        courseId,
        videoToEdit,
        videoData
      );

      setVideos((prev) =>
        prev.map((video) =>
          video.id === videoToEdit ? { ...video, ...updatedVideo } : video
        )
      );

      setVideoTitle("");
      setVideoUrl("");
      setVideoDescription("");
      setIsEditing(false);
      setShowSuccessModal(true);
      setLastAction("edit");
    } catch (error) {
      console.error("Erro ao editar vídeo:", error);
      toast.error(error.message || "Erro ao editar vídeo");
    }
  };

  const handleVideo = () => {
    if (isEditing) {
      handleEditVideoSubmit();
    } else {
      handleAddVideo();
    }
  };

  const handleRemoveVideo = (id) => {
    const video = videos.find((v) => v.id === id);
    setVideoToDelete(video);
    setShowDeleteModal(true);
  };

  const confirmRemoveVideo = async () => {
    if (!videoToDelete || !videoToDelete.id) return;

    try {
      await deleteCourseVideo(courseId, videoToDelete.id, currentUser.uid);

      setVideos((prev) =>
        prev.filter((video) => video.id !== videoToDelete.id)
      );
      toast.success("Vídeo deletado com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir vídeo:", error);
      toast.error(error.message || "Erro ao excluir vídeo");
    } finally {
      setShowDeleteModal(false);
      setVideoToDelete(null);
    }
  };

  // Adicionar uma função para validar em tempo real
  const handleVideoUrlChange = (e) => {
    const value = e.target.value;
    setVideoUrl(value);

    if (value.trim()) {
      if (!isValidYouTubeUrl(value)) {
        setVideoUrlError(
          "URL inválida. Insira uma URL válida do YouTube (ex: https://youtube.com/watch?v=ID ou https://youtu.be/ID)"
        );
      } else {
        setVideoUrlError("");
      }
    } else {
      setVideoUrlError("");
    }
  };

  useImperativeHandle(ref, () => ({
    async saveVideos(newCourseId = null) {
      try {
        const targetCourseId = newCourseId || courseId;
        if (!targetCourseId) throw new Error("ID do curso não disponível");

        // Usar a função da API para salvar todos os vídeos
        await saveAllCourseVideos(targetCourseId, videos);
        return true;
      } catch (error) {
        console.error("Erro ao salvar vídeos:", error);
        throw error;
      }
    },
    async validateVideos() {
      // Usar a função da API para validar vídeos
      const validation = await validateCourseVideos(videos);

      if (!validation.isValid) {
        throw new Error(validation.errorMessage);
      }

      return true;
    },
  }));

  useEffect(() => {
    if (courseId) {
      loadVideos();
    }
  }, [courseId]);

  return (
    <Box sx={{ mt: 4 }} ref={videosTabRef}>
      <Typography
        variant="h6"
        sx={{ mb: 2, fontWeight: "bold", color: "#333" }}
      >
        {isEditing ? "Editar Vídeo" : "Adicionar Vídeo"}
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={6}>
          <TextField
            label="Título do Vídeo"
            fullWidth
            value={videoTitle}
            onChange={(e) => setVideoTitle(e.target.value)}
            variant="outlined"
            sx={{
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: "#666" },
                "&:hover fieldset": { borderColor: "#9041c1" },
                "&.Mui-focused fieldset": { borderColor: "#9041c1" },
              },
              "& .MuiInputLabel-root": {
                color: "#666",
                "&.Mui-focused": { color: "#9041c1" },
              },
            }}
          />
        </Grid>

        <Grid item xs={6}>
          <TextField
            label="URL do Vídeo"
            fullWidth
            value={videoUrl}
            onChange={handleVideoUrlChange}
            error={!!videoUrlError}
            helperText={videoUrlError}
            variant="outlined"
            sx={{
              "& .MuiOutlinedInput-root": {
                "& fieldset": {
                  borderColor: videoUrlError ? "#d32f2f" : "#666",
                },
                "&:hover fieldset": {
                  borderColor: videoUrlError ? "#d32f2f" : "#9041c1",
                },
                "&.Mui-focused fieldset": {
                  borderColor: videoUrlError ? "#d32f2f" : "#9041c1",
                },
              },
              "& .MuiInputLabel-root": {
                color: videoUrlError ? "#d32f2f" : "#666",
                "&.Mui-focused": {
                  color: videoUrlError ? "#d32f2f" : "#9041c1",
                },
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
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: "#666" },
                "&:hover fieldset": { borderColor: "#9041c1" },
                "&.Mui-focused fieldset": { borderColor: "#9041c1" },
              },
              "& .MuiInputLabel-root": {
                color: "#666",
                "&.Mui-focused": { color: "#9041c1" },
              },
            }}
          />
        </Grid>

        {/* Switch para requiresPrevious */}
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={videoRequiresPrevious}
                onChange={(e) => setVideoRequiresPrevious(e.target.checked)}
                sx={{
                  "& .MuiSwitch-switchBase": {
                    color: "grey",
                    "&.Mui-checked": {
                      color: "#9041c1",
                    },
                    "&.Mui-checked + .MuiSwitch-track": {
                      backgroundColor: "#9041c1",
                    },
                  },
                  "& .MuiSwitch-track": {
                    backgroundColor: "#666",
                  },
                }}
              />
            }
            label="Exige Vídeos Anteriores"
            sx={{
              "& .MuiFormControlLabel-label": {
                color: "#666",
              },
            }}
          />
        </Grid>
      </Grid>

      <Button
        variant="contained"
        onClick={handleVideo}
        sx={{
          mt: 3,
          p: 1.5,
          fontWeight: "bold",
          backgroundColor: "#9041c1",
          "&:hover": { backgroundColor: "#7d37a7" },
        }}
      >
        {isEditing ? "Editar Vídeo" : "Adicionar Vídeo"}
      </Button>

      {isEditing && (
        <Button
          variant="outlined"
          onClick={() => {
            setVideoTitle("");
            setVideoUrl("");
            setVideoDescription("");
            setIsEditing(false);
          }}
          sx={{
            mt: 3,
            ml: 2,
            p: 1.5,
            fontWeight: "bold",
            color: "#9041c1",
            borderColor: "#9041c1",
            "&:hover": { backgroundColor: "rgba(144, 65, 193, 0.04)" },
          }}
        >
          Cancelar
        </Button>
      )}

      <Typography
        variant="h6"
        sx={{ mt: 4, mb: 2, fontWeight: "bold", color: "#333" }}
      >
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
              "&:hover": { backgroundColor: "rgba(144, 65, 193, 0.04)" },
            }}
            secondaryAction={
              <>
                <IconButton
                  onClick={() => {
                    handleEditVideo(video);
                    // Scroll to form area with a better approach
                    const headerOffset = 150;
                    const formElement = videosTabRef.current;

                    if (formElement) {
                      const formPosition =
                        formElement.getBoundingClientRect().top;
                      const offsetPosition =
                        formPosition + window.pageYOffset - headerOffset;

                      window.scrollTo({
                        top: offsetPosition,
                        behavior: "smooth",
                      });
                    }
                  }}
                  sx={{ color: "#9041c1" }}
                >
                  <EditIcon />
                </IconButton>
                <IconButton
                  edge="end"
                  onClick={() => handleRemoveVideo(video.id)}
                  sx={{ color: "#d32f2f" }}
                >
                  <DeleteIcon />
                </IconButton>
              </>
            }
          >
            <ListItemText
              primary={video.title}
              secondary={
                <Typography component="span" sx={{ color: "#666" }}>
                  {`Exige anteriores: ${video.requiresPrevious ? "Sim" : "Não"
                    }`}{" "}
                  <br />
                  {`Existe Quiz: ${video.hasQuizzes ? "Sim" : "Não"}`}
                </Typography>
              }
              primaryTypographyProps={{
                sx: { fontWeight: 500, color: "#333" },
              }}
            />
          </ListItem>
        ))}
      </List>

      <Modal
        open={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        aria-labelledby="success-modal-title"
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 24,
            p: 4,
            textAlign: "center",
          }}
        >
          <CheckCircleOutlineIcon
            sx={{ fontSize: 60, color: "#4caf50", mb: 2 }}
          />
          <Typography id="success-modal-title" variant="h6" sx={{ mb: 2 }}>
            {`Vídeo ${lastAction === "edit" ? "editado" : "adicionado"
              } com sucesso!`}
          </Typography>
          <Button
            variant="contained"
            onClick={() => setShowSuccessModal(false)}
            sx={{
              backgroundColor: "#9041c1",
              "&:hover": { backgroundColor: "#7d37a7" },
            }}
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
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 24,
            p: 4,
            textAlign: "center",
          }}
        >
          <Typography id="delete-modal-title" variant="h6" sx={{ mb: 2 }}>
            Tem certeza que deseja excluir "{videoToDelete?.title}"?
          </Typography>
          <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
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
