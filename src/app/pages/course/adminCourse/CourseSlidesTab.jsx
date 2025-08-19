import React, {
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Paper,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import { toast } from "react-toastify";
import { Edit, Delete, CheckCircle } from "@mui/icons-material";
import {
  fetchCourseSlides,
  addCourseSlide,
  updateCourseSlide,
  deleteCourseSlide,
  saveAllCourseSlides,
} from "$api/services/courses/slides";

const CourseSlidesTab = forwardRef(({ courseId }, ref) => {
  // Estados
  const [slides, setSlides] = useState([]);
  const [slideTitle, setSlideTitle] = useState("");
  const [slideUrl, setSlideUrl] = useState("");
  const [slideDescription, setSlideDescription] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [slideToEdit, setSlideToEdit] = useState(null);
  const [slideToDelete, setSlideToDelete] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastAction, setLastAction] = useState("");

  // Carregar slides ao inicializar
  const loadSlides = async () => {
    try {
      if (courseId) {
        const slidesData = await fetchCourseSlides(courseId);
        setSlides(slidesData);
      }
    } catch (error) {
      console.error("Erro ao buscar slides:", error);
      toast.error("Erro ao carregar slides");
      setSlides([]);
    }
  };

  useEffect(() => {
    if (courseId) {
      loadSlides();
    }
  }, [courseId]);

  // Manipuladores de evento
  const handleAddSlide = async () => {
    try {
      const slideData = {
        title: slideTitle,
        url: slideUrl,
        description: slideDescription,
      };

      const newSlide = await addCourseSlide(courseId, slideData);

      setSlides((prev) => [...prev, newSlide]);
      setSlideTitle("");
      setSlideUrl("");
      setSlideDescription("");
      setShowSuccessModal(true);
      setLastAction("add");
    } catch (error) {
      console.error("Erro ao adicionar slide:", error);
      toast.error(error.message || "Erro ao adicionar slide");
    }
  };

  const handleEditSlide = (slide) => {
    setIsEditing(true);
    setSlideToEdit(slide.id);
    setSlideTitle(slide.title);
    setSlideUrl(slide.url);
    setSlideDescription(slide.description || "");
  };

  const handleEditSlideSubmit = async () => {
    try {
      const slideData = {
        title: slideTitle,
        url: slideUrl,
        description: slideDescription,
      };

      const updatedSlide = await updateCourseSlide(
        courseId,
        slideToEdit,
        slideData
      );

      setSlides((prev) =>
        prev.map((slide) =>
          slide.id === slideToEdit ? { ...slide, ...updatedSlide } : slide
        )
      );

      setSlideToEdit(null);
      setSlideTitle("");
      setSlideUrl("");
      setSlideDescription("");
      setIsEditing(false);
      setShowSuccessModal(true);
      setLastAction("edit");
    } catch (error) {
      console.error("Erro ao editar slide:", error);
      toast.error(error.message || "Erro ao editar slide");
    }
  };

  const handleSlide = () => {
    if (isEditing) {
      handleEditSlideSubmit();
    } else {
      handleAddSlide();
    }
  };

  const handleDeleteSlide = async () => {
    try {
      if (slideToDelete) {
        await deleteCourseSlide(courseId, slideToDelete.id);
        setSlides((prev) =>
          prev.filter((slide) => slide.id !== slideToDelete.id)
        );
        toast.success("Slide excluído com sucesso!");
      }
    } catch (error) {
      console.error("Erro ao excluir slide:", error);
      toast.error(error.message || "Erro ao excluir slide");
    }
    setShowDeleteModal(false);
    setSlideToDelete(null);
  };

  // Implementar função saveSlides para a ref
  useImperativeHandle(ref, () => ({
    async saveSlides(newCourseId = null) {
      try {
        const targetCourseId = newCourseId || courseId;
        if (!targetCourseId) throw new Error("ID do curso não disponível");

        await saveAllCourseSlides(targetCourseId, slides);
        return true;
      } catch (error) {
        console.error("Erro ao salvar slides:", error);
        throw error;
      }
    },
  }));

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" gutterBottom>
        Gerenciar Slides
      </Typography>

      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          {isEditing ? "Editar Slide" : "Adicionar Novo Slide"}
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              label="Título do Slide"
              fullWidth
              value={slideTitle}
              onChange={(e) => setSlideTitle(e.target.value)}
              required
              size="small"
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="URL do Slide (Google Apresentações)"
              fullWidth
              value={slideUrl}
              onChange={(e) => setSlideUrl(e.target.value)}
              required
              size="small"
              placeholder="https://docs.google.com/presentation/d/..."
              helperText="Cole o link de incorporação do Google Apresentações"
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Descrição (opcional)"
              fullWidth
              value={slideDescription}
              onChange={(e) => setSlideDescription(e.target.value)}
              multiline
              rows={2}
              size="small"
            />
          </Grid>

          <Grid item xs={12}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSlide}
              disabled={!slideTitle.trim() || !slideUrl.trim()}
            >
              {isEditing ? "Salvar Alterações" : "Adicionar Slide"}
            </Button>

            {isEditing && (
              <Button
                variant="outlined"
                sx={{ ml: 2 }}
                onClick={() => {
                  setIsEditing(false);
                  setSlideTitle("");
                  setSlideUrl("");
                  setSlideDescription("");
                  setSlideToEdit(null);
                }}
              >
                Cancelar
              </Button>
            )}
          </Grid>
        </Grid>
      </Paper>

      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
        Slides Cadastrados
      </Typography>

      {slides.length > 0 ? (
        <Grid container spacing={2}>
          {slides.map((slide) => (
            <Grid item xs={12} sm={6} md={4} key={slide.id}>
              <Paper
                elevation={2}
                sx={{
                  p: 2,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                }}
              >
                <Typography variant="subtitle1" fontWeight="bold">
                  {slide.title}
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  {slide.description || "Sem descrição"}
                </Typography>

                <Box sx={{ position: "absolute", top: 8, right: 8 }}>
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => handleEditSlide(slide)}
                    sx={{ mr: 1 }}
                  >
                    <Edit fontSize="small" />
                  </IconButton>

                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => {
                      setSlideToDelete(slide);
                      setShowDeleteModal(true);
                    }}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Paper
          elevation={0}
          sx={{ p: 3, backgroundColor: "#f5f5f5", textAlign: "center" }}
        >
          <Typography variant="body1" color="text.secondary">
            Nenhum slide cadastrado.
          </Typography>
        </Paper>
      )}

      {/* Modal de confirmação de exclusão */}
      <Dialog open={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
        <DialogTitle>Excluir Slide</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem certeza que deseja excluir o slide "{slideToDelete?.title}"?
            Esta ação não pode ser desfeita.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteModal(false)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={handleDeleteSlide}>
            Excluir
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de sucesso */}
      <Dialog
        open={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        aria-labelledby="success-dialog-title"
        aria-describedby="success-dialog-description"
      >
        <DialogTitle id="success-dialog-title">
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CheckCircle color="success" />
            {lastAction === "add" ? "Slide Adicionado" : "Slide Atualizado"}
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="success-dialog-description">
            {lastAction === "add"
              ? "O slide foi adicionado com sucesso!"
              : "O slide foi atualizado com sucesso!"}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setShowSuccessModal(false)}
            color="primary"
            variant="contained"
            autoFocus
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
});

export default CourseSlidesTab;
