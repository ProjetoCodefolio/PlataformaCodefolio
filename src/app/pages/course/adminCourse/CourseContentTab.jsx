import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Box,
  Typography,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  List,
  ListItem,
  ListItemText,
  Chip,
  IconButton,
  CircularProgress,
  Modal,
  Tooltip,
} from "@mui/material";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import HistoryIcon from "@mui/icons-material/History";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import OndemandVideoIcon from "@mui/icons-material/OndemandVideo";
import ViewCarouselIcon from "@mui/icons-material/ViewCarousel";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { toast } from "react-toastify";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  fetchCourseContent,
  saveCourseContentOrder,
} from "$api/services/courses/contentOrder";
import {
  fetchCourseContentItems,
  addCourseContent,
  updateCourseContent,
  deleteCourseContent,
  validateContentUrl,
} from "$api/services/courses/content";
import {
  fetchCourseVideos,
  updateCourseVideo,
  deleteCourseVideo,
} from "$api/services/courses/videos";
import {
  fetchCourseSlides,
  updateCourseSlide,
  deleteCourseSlide,
} from "$api/services/courses/slides";
import { useAuth } from "$context/AuthContext";

const PURPLE = "#9041c1";

const categoryMeta = (category) =>
  category === "slide"
    ? { label: "Slide", color: PURPLE, bg: "rgba(144, 65, 193, 0.12)", Icon: ViewCarouselIcon }
    : { label: "Vídeo", color: "#1565c0", bg: "rgba(25, 118, 210, 0.12)", Icon: OndemandVideoIcon };

/** Item arrastável do conteúdo (novo ou legado). */
const SortableContentItem = ({ item, index, onEdit, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 1 : "auto",
  };

  const meta = categoryMeta(item.category);

  return (
    <ListItem
      ref={setNodeRef}
      style={style}
      sx={{
        p: { xs: 1.5, sm: 2 },
        border: isDragging ? `2px solid ${PURPLE}` : "1px solid #ddd",
        borderRadius: "8px",
        mb: 1.5,
        backgroundColor: item.legacy ? "#fafafa" : "white",
        boxShadow: isDragging ? "0 6px 16px rgba(0,0,0,0.18)" : "none",
      }}
      secondaryAction={
        // Vídeos de entrega (source 'flipped') não são editáveis aqui — são
        // gerenciados na entrega do aluno. Todo o resto (novo + legado) é editável.
        item.source === "flipped" ? null : (
          <>
            <IconButton
              aria-label="Editar"
              onClick={() => onEdit(item)}
              sx={{ color: PURPLE }}
            >
              <EditIcon />
            </IconButton>
            <IconButton
              aria-label="Excluir"
              onClick={() => onDelete(item)}
              sx={{ color: "#d32f2f" }}
            >
              <DeleteIcon />
            </IconButton>
          </>
        )
      }
    >
      <IconButton
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label="Arrastar para reordenar"
        disableRipple
        sx={{
          cursor: isDragging ? "grabbing" : "grab",
          color: "#999",
          mr: 1,
          touchAction: "none",
          "&:hover": { color: PURPLE },
        }}
      >
        <DragIndicatorIcon />
      </IconButton>

      <Chip
        icon={<meta.Icon />}
        label={meta.label}
        size="small"
        sx={{
          mr: 1.5,
          fontWeight: 600,
          backgroundColor: meta.bg,
          color: meta.color,
          "& .MuiChip-icon": { color: meta.color },
        }}
      />

      {item.source === "flipped" ? (
        <Tooltip title="Vídeo enviado por um aluno/grupo em um trabalho (sala de aula invertida). Você pode reordená-lo aqui; o conteúdo é gerenciado na entrega do aluno.">
          <Chip
            icon={<AssignmentIndIcon />}
            label="Entrega"
            size="small"
            variant="outlined"
            sx={{
              mr: 1.5,
              color: "#2e7d32",
              borderColor: "#c8e6c9",
              backgroundColor: "#f1f8f2",
              "& .MuiChip-icon": { color: "#66bb6a" },
            }}
          />
        </Tooltip>
      ) : (
        item.legacy && (
          <Tooltip title="Cadastrado no formato anterior (vídeos/slides). É editável normalmente por aqui.">
            <Chip
              icon={<HistoryIcon />}
              label="Anterior"
              size="small"
              variant="outlined"
              sx={{
                mr: 1.5,
                color: "#9e9e9e",
                borderColor: "#e0e0e0",
                backgroundColor: "#fafafa",
                "& .MuiChip-icon": { color: "#bdbdbd" },
              }}
            />
          </Tooltip>
        )
      )}

      <ListItemText
        primary={`${index + 1}. ${item.title}`}
        primaryTypographyProps={{
          sx: {
            fontWeight: 500,
            color: "#333",
            fontSize: { xs: "0.875rem", sm: "1rem" },
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: { xs: "140px", sm: "60%" },
          },
        }}
        sx={{ pr: item.source === "flipped" ? 1 : 10 }}
      />
    </ListItem>
  );
};

const emptyForm = {
  category: "video",
  title: "",
  url: "",
  description: "",
  requiresPrevious: false,
};

/**
 * Aba "Conteúdo": cadastro unificado de vídeos e slides na nova collection
 * (courseContent), com lista arrastável que também exibe o conteúdo legado
 * (courseVideos / courseSlides) — este apenas reordenável, marcado "Legado".
 */
const CourseContentTab = ({ courseId }) => {
  const { userDetails } = useAuth();
  const [items, setItems] = useState([]); // lista unificada ordenada (nova + legada)
  const [fullById, setFullById] = useState({}); // dados completos p/ edição (nova + legada)
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(emptyForm);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  // Origem do item em edição: 'content' (nova collection) | 'video' | 'slide'
  // (legados). Define para onde a atualização/exclusão é roteada.
  const [editingSource, setEditingSource] = useState("content");
  const [urlError, setUrlError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [itemToDelete, setItemToDelete] = useState(null);

  const formRef = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const loadContent = useCallback(async () => {
    if (!courseId) {
      setItems([]);
      setNewItemsById({});
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      // Além da lista unificada (para exibir/ordenar), carregamos os dados
      // completos das origens EDITÁVEIS (nova collection + vídeos/slides legados)
      // para popular o formulário de edição. Entregas de alunos não são editáveis.
      const [unified, contentItems, legacyVideos, legacySlides] =
        await Promise.all([
          fetchCourseContent(courseId),
          fetchCourseContentItems(courseId),
          fetchCourseVideos(courseId),
          fetchCourseSlides(courseId),
        ]);
      setItems(unified);

      const map = {};
      contentItems.forEach((it) => {
        map[it.id] = {
          category: it.category,
          title: it.title,
          url: it.url,
          description: it.description || "",
          requiresPrevious: !!it.requiresPrevious,
        };
      });
      legacyVideos.forEach((v) => {
        map[v.id] = {
          category: "video",
          title: v.title || "",
          url: v.url || "",
          description: v.description || "",
          requiresPrevious: !!v.requiresPrevious,
        };
      });
      legacySlides.forEach((s) => {
        map[s.id] = {
          category: "slide",
          title: s.title || "",
          url: s.url || "",
          description: s.description || "",
          requiresPrevious: false,
        };
      });
      setFullById(map);
    } catch (error) {
      console.error("Erro ao carregar conteúdo do curso:", error);
      toast.error("Erro ao carregar o conteúdo do curso");
      setItems([]);
      setFullById({});
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  const resetForm = () => {
    setForm(emptyForm);
    setIsEditing(false);
    setEditingId(null);
    setEditingSource("content");
    setUrlError("");
  };

  const handleUrlChange = (value) => {
    setForm((f) => ({ ...f, url: value }));
    if (value.trim()) {
      const validation = validateContentUrl(value, form.category);
      setUrlError(validation.isValid ? "" : validation.message);
    } else {
      setUrlError("");
    }
  };

  const handleCategoryChange = (value) => {
    setForm((f) => ({ ...f, category: value }));
    // Revalida a URL com a nova categoria.
    if (form.url.trim()) {
      const validation = validateContentUrl(form.url, value);
      setUrlError(validation.isValid ? "" : validation.message);
    }
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      toast.error("O título é obrigatório");
      return;
    }
    const validation = validateContentUrl(form.url, form.category);
    if (!validation.isValid) {
      setUrlError(validation.message);
      toast.error(validation.message);
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing && editingId) {
        // Roteia a atualização para a collection de origem do item.
        if (editingSource === "video") {
          await updateCourseVideo(courseId, editingId, form);
        } else if (editingSource === "slide") {
          await updateCourseSlide(courseId, editingId, form);
        } else {
          await updateCourseContent(courseId, editingId, form);
        }
        toast.success("Conteúdo atualizado com sucesso!");
      } else {
        // Itens novos são sempre criados na nova collection unificada.
        await addCourseContent(courseId, form);
        toast.success("Conteúdo adicionado com sucesso!");
      }
      resetForm();
      await loadContent();
    } catch (error) {
      console.error("Erro ao salvar conteúdo:", error);
      toast.error(error.message || "Erro ao salvar o conteúdo");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item) => {
    const full = fullById[item.id];
    if (!full) return;
    setForm({
      category: full.category,
      title: full.title,
      url: full.url,
      description: full.description || "",
      requiresPrevious: !!full.requiresPrevious,
    });
    setIsEditing(true);
    setEditingId(item.id);
    setEditingSource(item.source);
    setUrlError("");
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      // Roteia a exclusão para a collection de origem (com as cascatas de cada
      // uma: bloqueio por quiz, limpeza de progresso, etc.).
      if (itemToDelete.source === "video") {
        await deleteCourseVideo(courseId, itemToDelete.id, userDetails?.userId);
      } else if (itemToDelete.source === "slide") {
        await deleteCourseSlide(courseId, itemToDelete.id);
      } else {
        await deleteCourseContent(courseId, itemToDelete.id);
      }
      toast.success("Conteúdo excluído com sucesso!");
      if (editingId === itemToDelete.id) resetForm();
      await loadContent();
    } catch (error) {
      console.error("Erro ao excluir conteúdo:", error);
      toast.error(error.message || "Erro ao excluir o conteúdo");
    } finally {
      setItemToDelete(null);
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const previousItems = items;
    const reordered = arrayMove(items, oldIndex, newIndex);
    // Atualização otimista imediata da UI.
    setItems(reordered);
    setSaving(true);
    try {
      // A ordem é persistida NESTE momento (ao soltar o item), sem depender do
      // botão "Salvar Curso".
      await saveCourseContentOrder(courseId, reordered);
      // Mantém o campo `order` local coerente com a posição recém-salva.
      setItems(reordered.map((it, idx) => ({ ...it, order: idx })));
      toast.success("Ordem salva!", { autoClose: 1200 });
    } catch (error) {
      console.error("Erro ao salvar a ordem do conteúdo:", error);
      toast.error("Não foi possível salvar a nova ordem. Tente novamente.");
      setItems(previousItems);
    } finally {
      setSaving(false);
    }
  };

  const isSlide = form.category === "slide";

  return (
    <Box
      sx={{
        mt: 4,
        p: { xs: 2, sm: 3 },
        backgroundColor: "#fff",
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }}
      ref={formRef}
    >
      <Typography
        variant="h6"
        sx={{ mb: 2, fontWeight: "bold", color: "#333", fontSize: { xs: "1.1rem", sm: "1.25rem" } }}
      >
        {isEditing ? "Editar Conteúdo" : "Adicionar Conteúdo"}
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth>
            <InputLabel sx={{ color: "#666", "&.Mui-focused": { color: PURPLE } }}>
              Categoria
            </InputLabel>
            <Select
              value={form.category}
              label="Categoria"
              onChange={(e) => handleCategoryChange(e.target.value)}
              // Ao editar um item legado (courseVideos/courseSlides) a categoria
              // é travada, pois trocá-la exigiria mover entre collections.
              disabled={isEditing && editingSource !== "content"}
              sx={{
                "& .MuiOutlinedInput-notchedOutline": { borderColor: "#666" },
                "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: PURPLE },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: PURPLE },
              }}
            >
              <MenuItem value="video">Vídeo (YouTube)</MenuItem>
              <MenuItem value="slide">Slide (Google Apresentações)</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={8}>
          <TextField
            label="Título"
            fullWidth
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            variant="outlined"
            sx={{
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: "#666" },
                "&:hover fieldset": { borderColor: PURPLE },
                "&.Mui-focused fieldset": { borderColor: PURPLE },
              },
              "& .MuiInputLabel-root": { color: "#666", "&.Mui-focused": { color: PURPLE } },
            }}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            label={isSlide ? "URL do Slide (Google Apresentações)" : "URL do Vídeo (YouTube)"}
            fullWidth
            value={form.url}
            onChange={(e) => handleUrlChange(e.target.value)}
            error={!!urlError}
            helperText={
              urlError ||
              (isSlide
                ? "Cole o link de incorporação do Google Apresentações"
                : "Ex: https://youtube.com/watch?v=ID ou https://youtu.be/ID")
            }
            variant="outlined"
            sx={{
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: urlError ? "#d32f2f" : "#666" },
                "&:hover fieldset": { borderColor: urlError ? "#d32f2f" : PURPLE },
                "&.Mui-focused fieldset": { borderColor: urlError ? "#d32f2f" : PURPLE },
              },
              "& .MuiInputLabel-root": { color: "#666", "&.Mui-focused": { color: PURPLE } },
            }}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Descrição (opcional)"
            fullWidth
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            multiline
            rows={3}
            variant="outlined"
            sx={{
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: "#666" },
                "&:hover fieldset": { borderColor: PURPLE },
                "&.Mui-focused fieldset": { borderColor: PURPLE },
              },
              "& .MuiInputLabel-root": { color: "#666", "&.Mui-focused": { color: PURPLE } },
            }}
          />
        </Grid>

        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={form.requiresPrevious}
                onChange={(e) => setForm((f) => ({ ...f, requiresPrevious: e.target.checked }))}
                sx={{
                  "& .MuiSwitch-switchBase.Mui-checked": { color: PURPLE },
                  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: PURPLE },
                }}
              />
            }
            label="Exige conclusão do conteúdo anterior"
            sx={{ "& .MuiFormControlLabel-label": { color: "#666" } }}
          />
        </Grid>
      </Grid>

      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2, mt: 2 }}>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting}
          sx={{
            p: 1.5,
            fontWeight: "bold",
            backgroundColor: PURPLE,
            "&:hover": { backgroundColor: "#7d37a7" },
            minWidth: { xs: "100%", sm: "auto" },
          }}
        >
          {isEditing ? "Salvar Alterações" : "Adicionar Conteúdo"}
        </Button>
        {isEditing && (
          <Button
            variant="outlined"
            onClick={resetForm}
            sx={{
              p: 1.5,
              fontWeight: "bold",
              color: PURPLE,
              borderColor: PURPLE,
              "&:hover": { backgroundColor: "rgba(144, 65, 193, 0.04)" },
              minWidth: { xs: "100%", sm: "auto" },
            }}
          >
            Cancelar
          </Button>
        )}
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 5, mb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: "bold", color: "#333", fontSize: { xs: "1.1rem", sm: "1.25rem" } }}>
          Ordem do Conteúdo
        </Typography>
        {saving && <CircularProgress size={20} sx={{ color: PURPLE }} />}
      </Box>
      <Typography variant="body2" sx={{ mb: 2, color: "#666", fontSize: { xs: "0.8rem", sm: "0.9rem" } }}>
        Arraste pela alça para definir a ordem exibida ao aluno. A ordem é salva
        automaticamente ao soltar. Itens com o selo "Anterior" vêm do formato
        antigo e continuam editáveis por aqui. Itens com o selo "Entrega" são
        vídeos enviados pelos alunos nos trabalhos — esses só podem ser reordenados.
      </Typography>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress sx={{ color: PURPLE }} />
        </Box>
      ) : items.length === 0 ? (
        <Typography sx={{ color: "#999", textAlign: "center", py: 4 }}>
          Nenhum conteúdo cadastrado ainda. Use o formulário acima para adicionar.
        </Typography>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <List sx={{ p: 0 }}>
              {items.map((item, index) => (
                <SortableContentItem
                  key={item.id}
                  item={item}
                  index={index}
                  onEdit={handleEdit}
                  onDelete={setItemToDelete}
                />
              ))}
            </List>
          </SortableContext>
        </DndContext>
      )}

      <Modal open={!!itemToDelete} onClose={() => setItemToDelete(null)}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: { xs: "90%", sm: 400 },
            maxWidth: 400,
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 24,
            p: { xs: 3, sm: 4 },
            textAlign: "center",
          }}
        >
          <Typography variant="h6" sx={{ mb: 2, fontSize: { xs: "1rem", sm: "1.25rem" } }}>
            Excluir "{itemToDelete?.title}"?
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, color: "text.secondary" }}>
            Esta ação não pode ser desfeita.
          </Typography>
          <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, justifyContent: "center", gap: 2 }}>
            <Button variant="contained" color="error" onClick={confirmDelete} sx={{ minWidth: { xs: "100%", sm: "auto" } }}>
              Sim, Excluir
            </Button>
            <Button variant="outlined" onClick={() => setItemToDelete(null)} sx={{ minWidth: { xs: "100%", sm: "auto" } }}>
              Cancelar
            </Button>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
};

export default CourseContentTab;
