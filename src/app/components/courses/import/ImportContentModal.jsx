import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SlideshowIcon from "@mui/icons-material/Slideshow";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import { toast } from "react-toastify";
import CourseSourcePicker from "./CourseSourcePicker";
import {
  fetchImportableContent,
  importContentFromCourse,
  markAlreadyImportedContent,
} from "$api/services/courses/contentImport";

const ROXO = "#9041c1";

/**
 * Importa conteúdo (vídeo ou slide) de outro curso para o curso atual.
 *
 * Cada item que tinha questionário na origem traz uma segunda caixa, para o
 * professor decidir item a item se o quiz vem junto. É escolha e não automático
 * porque reaproveitar a aula sem reaproveitar a avaliação é comum — a turma
 * muda, a prova nem sempre.
 *
 * Conteúdo cuja URL já existe aqui vem marcado como repetido e desmarcado:
 * importar de novo criaria um item duplicado que conta duas vezes no progresso.
 */
export default function ImportContentModal({
  open,
  onClose,
  courseId,
  existingContent = [],
  onImported,
}) {
  const [sourceCourseId, setSourceCourseId] = useState("");
  const [items, setItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [comQuizIds, setComQuizIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  // Reabrir o modal recomeça a escolha do zero.
  useEffect(() => {
    if (!open) {
      setSourceCourseId("");
      setItems([]);
      setSelectedIds([]);
      setComQuizIds([]);
    }
  }, [open]);

  useEffect(() => {
    if (!sourceCourseId) {
      setItems([]);
      setSelectedIds([]);
      setComQuizIds([]);
      return;
    }

    let cancelled = false;

    const carregar = async () => {
      setLoading(true);
      try {
        const lista = await fetchImportableContent(sourceCourseId);
        if (cancelled) return;

        const comMarcacao = markAlreadyImportedContent(lista, existingContent);
        const novos = comMarcacao.filter((i) => !i.alreadyImported);
        setItems(comMarcacao);
        setSelectedIds(novos.map((i) => i.id));
        // O questionário vem junto por padrão para o que já veio marcado —
        // desmarcar é um clique, e reconstruir um quiz à mão não é.
        setComQuizIds(novos.filter((i) => i.hasQuiz).map((i) => i.id));
      } catch {
        if (!cancelled) toast.error("Erro ao carregar o conteúdo do curso de origem");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    carregar();
    return () => {
      cancelled = true;
    };
  }, [sourceCourseId, existingContent]);

  const alternar = (contentId) => {
    setSelectedIds((anterior) => {
      const marcado = anterior.includes(contentId);
      if (marcado) {
        // Desmarcar o conteúdo desmarca o quiz junto: quiz sem a aula dele não
        // teria a que se prender.
        setComQuizIds((quizzes) => quizzes.filter((id) => id !== contentId));
        return anterior.filter((id) => id !== contentId);
      }
      return [...anterior, contentId];
    });
  };

  const alternarQuiz = (contentId) => {
    setComQuizIds((anterior) =>
      anterior.includes(contentId)
        ? anterior.filter((id) => id !== contentId)
        : [...anterior, contentId]
    );
  };

  const todosMarcados = items.length > 0 && selectedIds.length === items.length;

  const alternarTodos = () => {
    if (todosMarcados) {
      setSelectedIds([]);
      setComQuizIds([]);
      return;
    }
    setSelectedIds(items.map((i) => i.id));
  };

  const importar = async () => {
    setImporting(true);
    try {
      const { imported, skipped, quizzes } = await importContentFromCourse({
        sourceCourseId,
        targetCourseId: courseId,
        selections: selectedIds.map((contentId) => ({
          contentId,
          withQuiz: comQuizIds.includes(contentId),
        })),
      });

      const conteudo =
        imported.length === 1 ? "1 conteúdo importado" : `${imported.length} conteúdos importados`;
      const comQuiz =
        quizzes === 0 ? "" : quizzes === 1 ? ", 1 com questionário" : `, ${quizzes} com questionário`;
      toast.success(`${conteudo}${comQuiz}.`);

      if (skipped.length > 0) {
        toast.warning(
          skipped.length === 1
            ? `"${skipped[0].title}" ficou de fora: ${skipped[0].reason}`
            : `${skipped.length} itens ficaram de fora por links ou questionários inválidos.`
        );
      }

      if (onImported) await onImported();
      onClose();
    } catch (error) {
      toast.error(error.message || "Erro ao importar conteúdo");
    } finally {
      setImporting(false);
    }
  };

  const repetidos = items.filter((i) => i.alreadyImported).length;
  const quizzesMarcados = comQuizIds.filter((id) => selectedIds.includes(id)).length;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: "bold", color: "#333", pr: 6 }}>
        Importar conteúdo de outro curso
      </DialogTitle>
      <IconButton
        aria-label="Fechar"
        onClick={onClose}
        sx={{ position: "absolute", top: 8, right: 8, color: "#666" }}
      >
        <CloseIcon />
      </IconButton>

      <DialogContent dividers>
        <CourseSourcePicker
          value={sourceCourseId}
          onChange={setSourceCourseId}
          excludeCourseId={courseId}
          disabled={importing}
        />

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
            <CircularProgress size={28} sx={{ color: ROXO }} />
          </Box>
        )}

        {!loading && sourceCourseId && items.length === 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Esse curso não tem vídeos nem slides cadastrados.
          </Alert>
        )}

        {!loading && items.length > 0 && (
          <>
            {repetidos > 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                {repetidos === 1
                  ? "1 conteúdo já existe neste curso e veio desmarcado."
                  : `${repetidos} conteúdos já existem neste curso e vieram desmarcados.`}
              </Alert>
            )}

            <FormControlLabel
              sx={{ mt: 1 }}
              control={
                <Checkbox
                  checked={todosMarcados}
                  indeterminate={selectedIds.length > 0 && !todosMarcados}
                  onChange={alternarTodos}
                  sx={{ color: ROXO, "&.Mui-checked": { color: ROXO } }}
                />
              }
              label="Selecionar todos"
            />

            <List dense>
              {items.map((item) => {
                const marcado = selectedIds.includes(item.id);
                return (
                  <ListItem
                    key={item.id}
                    disableGutters
                    alignItems="flex-start"
                    sx={{ flexDirection: "column", alignItems: "stretch", py: 0.5 }}
                  >
                    <Box sx={{ display: "flex", alignItems: "flex-start" }}>
                      <Checkbox
                        checked={marcado}
                        onChange={() => alternar(item.id)}
                        sx={{ color: ROXO, "&.Mui-checked": { color: ROXO } }}
                      />
                      <ListItemText
                        primary={
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                            {item.category === "slide" ? (
                              <SlideshowIcon sx={{ fontSize: 18, color: "#666" }} />
                            ) : (
                              <PlayCircleOutlineIcon sx={{ fontSize: 18, color: "#666" }} />
                            )}
                            <Typography sx={{ fontWeight: 500 }}>{item.title}</Typography>
                            {item.hasQuiz && (
                              <Chip
                                label="tem questionário"
                                size="small"
                                sx={{
                                  height: 20,
                                  fontSize: "0.7rem",
                                  bgcolor: "#f5f0fb",
                                  color: ROXO,
                                }}
                              />
                            )}
                            {item.alreadyImported && (
                              <Typography
                                component="span"
                                variant="caption"
                                sx={{ color: "#b26a00" }}
                              >
                                já existe aqui
                              </Typography>
                            )}
                          </Box>
                        }
                        secondary={
                          <Typography
                            variant="caption"
                            sx={{ color: "#666", wordBreak: "break-all" }}
                          >
                            {item.url}
                          </Typography>
                        }
                      />
                    </Box>

                    {item.hasQuiz && marcado && (
                      <FormControlLabel
                        sx={{ ml: 5, mt: -0.5 }}
                        control={
                          <Checkbox
                            size="small"
                            checked={comQuizIds.includes(item.id)}
                            onChange={() => alternarQuiz(item.id)}
                            sx={{ color: ROXO, "&.Mui-checked": { color: ROXO } }}
                          />
                        }
                        label={
                          <Typography variant="caption" sx={{ color: "#5B5566" }}>
                            Trazer o questionário junto
                          </Typography>
                        }
                      />
                    )}
                  </ListItem>
                );
              })}
            </List>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, flexWrap: "wrap", gap: 1 }}>
        {quizzesMarcados > 0 && (
          <Typography variant="caption" sx={{ color: "#666", mr: "auto" }}>
            {quizzesMarcados === 1
              ? "1 questionário virá junto"
              : `${quizzesMarcados} questionários virão junto`}
          </Typography>
        )}
        <Button onClick={onClose} sx={{ color: "#666", textTransform: "none" }}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={importar}
          disabled={importing || selectedIds.length === 0}
          sx={{
            backgroundColor: ROXO,
            color: "white",
            borderRadius: "8px",
            fontWeight: "bold",
            textTransform: "none",
            "&:hover": { backgroundColor: "#7d37a7" },
          }}
        >
          {importing
            ? "Importando..."
            : `Importar ${selectedIds.length > 0 ? selectedIds.length : ""}`.trim()}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
