import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { toast } from "react-toastify";
import CourseSourcePicker from "./CourseSourcePicker";
import {
  fetchImportableQuizzes,
  importQuizFromCourse,
} from "$api/services/courses/quizImport";

/**
 * Importa um questionário pronto de outro curso para um conteúdo deste.
 *
 * O terceiro campo existe porque o quiz é chaveado pelo conteúdo a que se
 * prende: sem escolher o alvo aqui, não há onde gravar a cópia.
 */
export default function ImportQuizModal({
  open,
  onClose,
  courseId,
  targets = [],
  existingQuizIds = [],
  onImported,
}) {
  const [sourceCourseId, setSourceCourseId] = useState("");
  const [quizzes, setQuizzes] = useState([]);
  const [sourceQuizId, setSourceQuizId] = useState("");
  const [targetContentId, setTargetContentId] = useState("");
  const [copySettings, setCopySettings] = useState(true);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  // Conteúdos que já têm quiz não podem receber outro (o serviço recusa), então
  // saem da lista em vez de virarem um erro depois do clique.
  const livres = targets.filter((t) => !existingQuizIds.includes(t.id));

  useEffect(() => {
    if (!open) {
      setSourceCourseId("");
      setQuizzes([]);
      setSourceQuizId("");
      setTargetContentId("");
      setCopySettings(true);
    }
  }, [open]);

  useEffect(() => {
    if (!sourceCourseId) {
      setQuizzes([]);
      setSourceQuizId("");
      return;
    }

    let cancelled = false;

    const carregar = async () => {
      setLoading(true);
      try {
        const lista = await fetchImportableQuizzes(sourceCourseId);
        if (cancelled) return;
        setQuizzes(lista);
        setSourceQuizId(lista[0]?.quizId || "");
      } catch {
        if (!cancelled) toast.error("Erro ao carregar os questionários do curso de origem");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    carregar();
    return () => {
      cancelled = true;
    };
  }, [sourceCourseId]);

  const importar = async () => {
    setImporting(true);
    try {
      await importQuizFromCourse({
        sourceCourseId,
        sourceQuizId,
        targetCourseId: courseId,
        targetContentId,
        copySettings,
      });
      toast.success("Questionário importado com sucesso!");
      if (onImported) await onImported();
      onClose();
    } catch (error) {
      toast.error(error.message || "Erro ao importar o questionário");
    } finally {
      setImporting(false);
    }
  };

  const quizEscolhido = quizzes.find((q) => q.quizId === sourceQuizId);
  const podeImportar = Boolean(sourceQuizId && targetContentId) && !importing;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: "bold", color: "#333", pr: 6 }}>
        Importar questionário de outro curso
      </DialogTitle>
      <IconButton
        aria-label="Fechar"
        onClick={onClose}
        sx={{ position: "absolute", top: 8, right: 8, color: "#666" }}
      >
        <CloseIcon />
      </IconButton>

      <DialogContent dividers>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          <CourseSourcePicker
            value={sourceCourseId}
            onChange={setSourceCourseId}
            excludeCourseId={courseId}
            disabled={importing}
          />

          {loading && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
              <CircularProgress size={28} sx={{ color: "#9041c1" }} />
            </Box>
          )}

          {!loading && sourceCourseId && quizzes.length === 0 && (
            <Alert severity="info">
              Esse curso não tem questionário com questões cadastradas.
            </Alert>
          )}

          {!loading && quizzes.length > 0 && (
            <FormControl fullWidth disabled={importing}>
              <InputLabel sx={{ "&.Mui-focused": { color: "#9041c1" } }}>
                Questionário
              </InputLabel>
              <Select
                value={sourceQuizId}
                label="Questionário"
                onChange={(e) => setSourceQuizId(e.target.value)}
              >
                {quizzes.map((quiz) => (
                  <MenuItem key={quiz.quizId} value={quiz.quizId}>
                    {quiz.title} — {quiz.questionCount}{" "}
                    {quiz.questionCount === 1 ? "questão" : "questões"}
                    {quiz.isDiagnostic ? " · diagnóstico" : ""}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {sourceQuizId && (
            <FormControl fullWidth disabled={importing}>
              <InputLabel sx={{ "&.Mui-focused": { color: "#9041c1" } }}>
                Prender ao conteúdo
              </InputLabel>
              <Select
                value={targetContentId}
                label="Prender ao conteúdo"
                onChange={(e) => setTargetContentId(e.target.value)}
              >
                {livres.map((target) => (
                  <MenuItem key={target.id} value={target.id}>
                    {target.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {sourceQuizId && livres.length === 0 && (
            <Alert severity="warning">
              Todos os conteúdos deste curso já têm questionário. Exclua um antes
              de importar.
            </Alert>
          )}

          {sourceQuizId && (
            <Box>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={copySettings}
                    onChange={(e) => setCopySettings(e.target.checked)}
                    disabled={importing}
                    sx={{ color: "#9041c1", "&.Mui-checked": { color: "#9041c1" } }}
                  />
                }
                label="Trazer as configurações do original"
              />
              <Typography variant="caption" sx={{ display: "block", ml: 4, color: "#666" }}>
                Nota mínima
                {quizEscolhido ? ` (${quizEscolhido.minPercentage}%)` : ""}, limite de
                tentativas e a marcação de diagnóstico. A janela de datas nunca vem
                junto: o questionário nasce aberto aqui.
              </Typography>
            </Box>
          )}

          <Alert severity="info" sx={{ mt: 0.5 }}>
            As respostas dos alunos do curso de origem não vêm junto — o
            questionário chega zerado.
          </Alert>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} sx={{ color: "#666", textTransform: "none" }}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={importar}
          disabled={!podeImportar}
          sx={{
            backgroundColor: "#9041c1",
            color: "white",
            borderRadius: "8px",
            fontWeight: "bold",
            textTransform: "none",
            "&:hover": { backgroundColor: "#7d37a7" },
          }}
        >
          {importing ? "Importando..." : "Importar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
