import React, {
  useState,
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
} from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Modal,
} from "@mui/material";
import { toast } from "react-toastify";
import { Edit, Delete, CheckCircleOutline } from "@mui/icons-material";
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
  const slidesTabRef = useRef(null);

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

    setTimeout(() => {
      slidesTabRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
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
    <Box
      sx={{
        mt: 4,
        p: 3,
        backgroundColor: "#fff",
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }}
      ref={slidesTabRef}
    >
      <Typography
        variant="h6"
        sx={{ mb: 2, fontWeight: "bold", color: "#333", fontSize: { xs: "1.1rem", sm: "1.25rem" } }}
      >
        {isEditing ? "Editar Slide" : "Adicionar Slide"}
      </Typography>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <TextField
            label="Título do Slide"
            fullWidth
            value={slideTitle}
            onChange={(e) => setSlideTitle(e.target.value)}
            required
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
                fontSize: { xs: '0.875rem', sm: '1rem' }
              },
              "& .MuiInputBase-input": {
                fontSize: { xs: '0.875rem', sm: '1rem' }
              }
            }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            label="URL do Slide (Google Apresentações)"
            fullWidth
            value={slideUrl}
            onChange={(e) => setSlideUrl(e.target.value)}
            required
            variant="outlined"
            placeholder="https://docs.google.com/presentation/d/..."
            helperText="Cole o link de incorporação do Google Apresentações"
            sx={{
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: "#666" },
                "&:hover fieldset": { borderColor: "#9041c1" },
                "&.Mui-focused fieldset": { borderColor: "#9041c1" },
              },
              "& .MuiInputLabel-root": {
                color: "#666",
                "&.Mui-focused": { color: "#9041c1" },
                fontSize: { xs: '0.875rem', sm: '1rem' }
              },
              "& .MuiInputBase-input": {
                fontSize: { xs: '0.875rem', sm: '1rem' }
              },
              "& .MuiFormHelperText-root": {
                fontSize: { xs: '0.75rem', sm: '0.875rem' }
              }
            }}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Descrição (opcional)"
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
                fontSize: { xs: '0.875rem', sm: '1rem' }
              },
              "& .MuiInputBase-input": {
                fontSize: { xs: '0.875rem', sm: '1rem' }
              }
            }}
          />
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 4 }}>
        <Button
          variant="contained"
          onClick={handleSlide}
          disabled={!slideTitle.trim() || !slideUrl.trim()}
          sx={{
            p: 1.5,
            fontWeight: "bold",
            backgroundColor: "#9041c1",
            "&:hover": { backgroundColor: "#7d37a7" },
            fontSize: { xs: '0.875rem', sm: '1rem' },
            minWidth: { xs: '100%', sm: 'auto' }
          }}
        >
          {isEditing ? "Salvar Alterações" : "Adicionar Slide"}
        </Button>

        {isEditing && (
          <Button
            variant="outlined"
            onClick={() => {
              setIsEditing(false);
              setSlideTitle("");
              setSlideUrl("");
              setSlideDescription("");
              setSlideToEdit(null);
            }}
            sx={{
              p: 1.5,
              fontWeight: "bold",
              color: "#9041c1",
              borderColor: "#9041c1",
              "&:hover": { backgroundColor: "rgba(144, 65, 193, 0.04)" },
              fontSize: { xs: '0.875rem', sm: '1rem' },
              minWidth: { xs: '100%', sm: 'auto' }
            }}
          >
            Cancelar
          </Button>
        )}
      </Box>

      <Typography variant="h6" gutterBottom sx={{ mt: 4, fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
        Slides Cadastrados
      </Typography>

      {slides.length > 0 ? (
        <List sx={{ mt: 2 }}>
          {slides.map((slide) => (
            <ListItem
              key={slide.id}
              sx={{
                p: { xs: 1.5, sm: 2 },
                border: "1px solid #ddd",
                borderRadius: "8px",
                mb: 2,
                backgroundColor: "white",
                "&:hover": { backgroundColor: "rgba(144, 65, 193, 0.04)" },
                alignItems: "flex-start",
                flexWrap: { xs: "wrap", sm: "nowrap" },
              }}
              secondaryAction={
                <>
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
                </>
              }
              >
              <ListItemText
                primary={slide.title || "Slide sem título"}
                secondary={
                  <Typography component="span" sx={{ color: "#666", fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    {slide.description || "Sem descrição"}
                  </Typography>
                }
                primaryTypographyProps={{
                  sx: {
                    fontWeight: 500,
                    color: "#333",
                    fontSize: { xs: '0.875rem', sm: '1rem' },
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: { xs: 'calc(100vw - 96px)', sm: 'calc(100% - 96px)' },
                    display: 'block'
                  },
                }}
                sx={{
                  maxWidth: { xs: 'calc(100% - 96px)', sm: 'calc(100% - 96px)' },
                  pr: 1,
                }}
              />
            </ListItem>
          ))}
        </List>
      ) : (
        <Typography sx={{ color: "#999", textAlign: "center", py: 4 }}>
          Nenhum slide adicionado ao curso ainda.
        </Typography>
      )}

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
            width: { xs: '90%', sm: 400 },
            maxWidth: 400,
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 24,
            p: { xs: 3, sm: 4 },
            textAlign: "center",
          }}
        >
          <Typography id="delete-modal-title" variant="h6" sx={{ mb: 2, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            Tem certeza que deseja excluir "{slideToDelete?.title}"?
          </Typography>
          <Box sx={{ display: "flex", flexDirection: { xs: 'column', sm: 'row' }, justifyContent: "center", gap: 2 }}>
            <Button
              variant="contained"
              color="error"
              onClick={handleDeleteSlide}
              fullWidth={false}
              sx={{
                fontSize: { xs: '0.875rem', sm: '1rem' },
                minWidth: { xs: '100%', sm: 'auto' }
              }}
            >
              Sim, Excluir
            </Button>
            <Button
              variant="outlined"
              onClick={() => setShowDeleteModal(false)}
              fullWidth={false}
              sx={{
                fontSize: { xs: '0.875rem', sm: '1rem' },
                minWidth: { xs: '100%', sm: 'auto' }
              }}
            >
              Cancelar
            </Button>
          </Box>
        </Box>
      </Modal>

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
            width: { xs: '90%', sm: 400 },
            maxWidth: 400,
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 24,
            p: { xs: 3, sm: 4 },
            textAlign: "center",
          }}
        >
          <CheckCircleOutline
            sx={{ fontSize: { xs: 50, sm: 60 }, color: "#4caf50", mb: 2 }}
          />
          <Typography id="success-modal-title" variant="h6" sx={{ mb: 2, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            {lastAction === "add" ? "Slide adicionado com sucesso!" : "Slide atualizado com sucesso!"}
          </Typography>
          <Button
            variant="contained"
            onClick={() => setShowSuccessModal(false)}
            sx={{
              backgroundColor: "#9041c1",
              "&:hover": { backgroundColor: "#7d37a7" },
              fontSize: { xs: '0.875rem', sm: '1rem' }
            }}
          >
            OK
          </Button>
        </Box>
      </Modal>
    </Box>
  );
});

CourseSlidesTab.displayName = "CourseSlidesTab";

export default CourseSlidesTab;
