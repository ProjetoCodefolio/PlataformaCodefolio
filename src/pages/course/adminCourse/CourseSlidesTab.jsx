import {
  ref as firebaseRef,
  set,
  push,
  get,
  remove,
  update,
} from "firebase/database";
import { database } from "../../../service/firebase";
import { useAuth } from "../../../context/AuthContext";
import { useLocation } from "react-router-dom";
import React, {
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { toast } from "react-toastify";

const CourseSlidesTab = forwardRef((props, ref) => {
  const [slides, setSlides] = useState([]);
  const [slideTitle, setSlideTitle] = useState("");
  const [slideUrl, setSlideUrl] = useState("");
  const [slideDescription, setSlideDescription] = useState("");
  const [slideVideoId, setSlideVideoId] = useState("");
  const [videos, setVideos] = useState([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [slideToDelete, setSlideToDelete] = useState(null);
  const [slideToEdit, setSlideToEdit] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [lastAction, setLastAction] = useState(null);

  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const { currentUser } = useAuth();
  const courseId = params.get("courseId");

  async function fetchCourseSlides() {
    try {
      const courseSlidesRef = firebaseRef(database, `courseSlides/${courseId}`);
      const snapshot = await get(courseSlidesRef);
      const courseSlides = snapshot.val();

      if (courseSlides) {
        const slidesArray = Object.entries(courseSlides).map(
          ([key, slide]) => ({
            id: key,
            ...slide,
          })
        );
        setSlides(slidesArray);
      } else {
        setSlides([]);
      }
    } catch (error) {
      console.error("Erro ao buscar slides:", error);
      toast.error("Erro ao carregar slides");
      setSlides([]);
    }
  }

  async function fetchCourseVideos() {
    try {
      const courseVideosRef = firebaseRef(database, `courseVideos/${courseId}`);
      const snapshot = await get(courseVideosRef);
      const courseVideos = snapshot.val();

      if (courseVideos) {
        const videosArray = Object.entries(courseVideos).map(
          ([key, video]) => ({
            id: key,
            ...video,
          })
        );
        setVideos(videosArray);

        // Se não houver vídeo selecionado e houver vídeos disponíveis
        if (!slideVideoId && videosArray.length > 0) {
          setSlideVideoId(videosArray[0].id);
        }
      } else {
        setVideos([]);
      }
    } catch (error) {
      console.error("Erro ao buscar vídeos:", error);
      toast.error("Erro ao carregar vídeos");
      setVideos([]);
    }
  }

  const handleAddSlide = async () => {
    if (!slideTitle.trim() || !slideUrl.trim() || !slideVideoId) {
      toast.error("Título, URL e vídeo associado são obrigatórios");
      return;
    }

    // Verificar se já existe um slide para este vídeo
    const existingSlide = slides.find(
      (slide) => slide.videoId === slideVideoId
    );
    if (existingSlide) {
      toast.error("Este vídeo já possui um slide associado");
      return;
    }

    try {
      const courseSlidesRef = firebaseRef(database, `courseSlides/${courseId}`);
      const newSlideRef = push(courseSlidesRef);

      const slideData = {
        title: slideTitle.trim(),
        url: slideUrl.trim(),
        description: String(slideDescription || ""),
        videoId: slideVideoId,
      };

      await set(newSlideRef, slideData);

      const updatedSlides = [...slides, { ...slideData, id: newSlideRef.key }];
      setSlides(updatedSlides);
      setSlideTitle("");
      setSlideUrl("");
      setSlideDescription("");
      setShowSuccessModal(true);
      setLastAction("add");
    } catch (error) {
      console.error("Erro ao adicionar slide:", error);
      toast.error("Erro ao adicionar slide");
    }
  };

  const handleEditSlide = (slide) => {
    setIsEditing(true);
    setSlideToEdit(slide.id);
    setSlideTitle(slide.title);
    setSlideUrl(slide.url);
    setSlideDescription(slide.description || "");
    setSlideVideoId(slide.videoId);
  };

  const handleEditSlideSubmit = async () => {
    if (!slideTitle.trim() || !slideUrl.trim() || !slideVideoId) {
      toast.error("Título, URL e vídeo associado são obrigatórios");
      return;
    }

    // Verificar se o vídeo selecionado já tem outro slide associado (exceto o atual)
    const existingSlide = slides.find(
      (slide) => slide.videoId === slideVideoId && slide.id !== slideToEdit
    );
    if (existingSlide) {
      toast.error("Este vídeo já possui um slide associado");
      return;
    }

    try {
      const slideData = {
        title: slideTitle.trim(),
        url: slideUrl.trim(),
        description: String(slideDescription || ""),
        videoId: slideVideoId,
      };

      const slideRef = firebaseRef(
        database,
        `courseSlides/${courseId}/${slideToEdit}`
      );
      await update(slideRef, slideData);

      const updatedSlides = slides.map((slide) =>
        slide.id === slideToEdit ? { ...slide, ...slideData } : slide
      );
      setSlides(updatedSlides);
      setSlideTitle("");
      setSlideUrl("");
      setSlideDescription("");
      setSlideVideoId(videos.length > 0 ? videos[0].id : "");
      setIsEditing(false);
      setShowSuccessModal(true);
      setLastAction("edit");
    } catch (error) {
      console.error("Erro ao editar slide:", error);
      toast.error("Erro ao editar slide");
    }
  };

  const handleSlide = () => {
    if (isEditing) {
      handleEditSlideSubmit();
    } else {
      handleAddSlide();
    }
  };

  const handleRemoveSlide = (id) => {
    const slide = slides.find((s) => s.id === id);
    setSlideToDelete(slide);
    setShowDeleteModal(true);
  };

  const confirmRemoveSlide = async () => {
    if (slideToDelete && slideToDelete.id) {
      try {
        const slideRef = firebaseRef(
          database,
          `courseSlides/${courseId}/${slideToDelete.id}`
        );
        await remove(slideRef);
        setSlides((prev) =>
          prev.filter((slide) => slide.id !== slideToDelete.id)
        );
        toast.success("Slide deletado com sucesso!");
      } catch (error) {
        console.error("Erro ao excluir slide:", error);
        toast.error("Erro ao excluir slide");
      }
    }
    setShowDeleteModal(false);
    setSlideToDelete(null);
  };

  useImperativeHandle(ref, () => ({
    async saveSlides(newCourseId = null) {
      try {
        const targetCourseId = newCourseId || courseId;
        if (!targetCourseId) throw new Error("ID do curso não disponível");

        const courseSlidesRef = firebaseRef(
          database,
          `courseSlides/${targetCourseId}`
        );
        const snapshot = await get(courseSlidesRef);
        const existingSlides = snapshot.val() || {};

        const existingSlideIds = new Set(Object.keys(existingSlides));
        const currentSlideIds = new Set(
          slides.map((slide) => slide.id).filter((id) => id)
        );

        // Remover slides que não existem mais
        for (const id of existingSlideIds) {
          if (!currentSlideIds.has(id)) {
            await remove(
              firebaseRef(database, `courseSlides/${targetCourseId}/${id}`)
            );
          }
        }

        // Adicionar ou atualizar slides
        for (const slide of slides) {
          const slideData = {
            title: slide.title,
            url: slide.url,
            description: slide.description || "",
            videoId: slide.videoId,
          };

          if (slide.id && existingSlideIds.has(slide.id)) {
            await set(
              firebaseRef(
                database,
                `courseSlides/${targetCourseId}/${slide.id}`
              ),
              slideData
            );
          } else {
            const newSlideRef = push(courseSlidesRef);
            await set(newSlideRef, slideData);
            slide.id = newSlideRef.key;
          }
        }
        return true;
      } catch (error) {
        console.error("Erro ao salvar slides:", error);
        throw error;
      }
    },
  }));

  useEffect(() => {
    if (courseId) {
      fetchCourseVideos();
      fetchCourseSlides();
    }
  }, [courseId]);

  // Verificar se existem vídeos disponíveis sem slides
  const getAvailableVideos = () => {
    const usedVideoIds = new Set(slides.map((slide) => slide.videoId));

    // Se estiver editando, não excluir o vídeo atualmente selecionado
    if (isEditing && slideToEdit) {
      const currentSlide = slides.find((slide) => slide.id === slideToEdit);
      if (currentSlide) {
        usedVideoIds.delete(currentSlide.videoId);
      }
    }

    return videos.filter(
      (video) =>
        !usedVideoIds.has(video.id) || (isEditing && video.id === slideVideoId)
    );
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Typography
        variant="h6"
        sx={{ mb: 2, fontWeight: "bold", color: "#333" }}
      >
        {isEditing ? "Editar Slide" : "Adicionar Slide"}
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth required>
            <InputLabel id="video-select-label">Vídeo Associado</InputLabel>
            <Select
              labelId="video-select-label"
              value={slideVideoId}
              label="Vídeo Associado"
              onChange={(e) => setSlideVideoId(e.target.value)}
              disabled={getAvailableVideos().length === 0 && !isEditing}
              sx={{
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: "#666" },
                  "&:hover fieldset": { borderColor: "#9041c1" },
                  "&.Mui-focused fieldset": { borderColor: "#9041c1" },
                },
              }}
            >
              {getAvailableVideos().map((video) => (
                <MenuItem key={video.id} value={video.id}>
                  {video.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {getAvailableVideos().length === 0 && !isEditing && (
            <Typography variant="caption" color="error">
              Todos os vídeos já possuem slides associados.
            </Typography>
          )}
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Título do Slide"
            fullWidth
            required
            value={slideTitle}
            onChange={(e) => setSlideTitle(e.target.value)}
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
        <Grid item xs={12}>
          <TextField
            label="URL do Slide (Google Apresentações)"
            fullWidth
            required
            value={slideUrl}
            onChange={(e) => setSlideUrl(e.target.value)}
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
        <Grid item xs={12}>
          <TextField
            label="Descrição do Slide"
            fullWidth
            value={slideDescription}
            onChange={(e) => setSlideDescription(e.target.value)}
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
      </Grid>

      <Button
        variant="contained"
        onClick={handleSlide}
        disabled={getAvailableVideos().length === 0 && !isEditing}
        sx={{
          mt: 3,
          p: 1.5,
          fontWeight: "bold",
          backgroundColor: "#9041c1",
          "&:hover": { backgroundColor: "#7d37a7" },
        }}
      >
        {isEditing ? "Editar Slide" : "Adicionar Slide"}
      </Button>

      {isEditing && (
        <Button
          variant="outlined"
          onClick={() => {
            setSlideTitle("");
            setSlideUrl("");
            setSlideDescription("");
            setSlideVideoId(videos.length > 0 ? videos[0].id : "");
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
        Slides do Curso
      </Typography>

      <List sx={{ mt: 4 }}>
        {slides.map((slide) => {
          const associatedVideo = videos.find((v) => v.id === slide.videoId);
          return (
            <ListItem
              key={slide.id}
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
                    onClick={() => handleEditSlide(slide)}
                    sx={{ color: "#9041c1" }}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    edge="end"
                    onClick={() => handleRemoveSlide(slide.id)}
                    sx={{ color: "#d32f2f" }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </>
              }
            >
              <ListItemText
                primary={slide.title}
                secondary={
                  <Typography component="span" sx={{ color: "#666" }}>
                    {`Vídeo: ${associatedVideo?.title || "Desconhecido"}`}{" "}
                    <br />
                    {`URL: ${slide.url}`}
                  </Typography>
                }
                primaryTypographyProps={{
                  sx: { fontWeight: 500, color: "#333" },
                }}
              />
            </ListItem>
          );
        })}
        {slides.length === 0 && (
          <Typography variant="body2" color="textSecondary">
            Nenhum slide adicionado.
          </Typography>
        )}
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
            {`Slide ${
              lastAction === "edit" ? "editado" : "adicionado"
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
            Tem certeza que deseja excluir "{slideToDelete?.title}"?
          </Typography>
          <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
            <Button
              variant="contained"
              color="error"
              onClick={confirmRemoveSlide}
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

export default CourseSlidesTab;
