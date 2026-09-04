import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  FormControlLabel,
  Checkbox,
  CircularProgress,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import { toast } from "react-toastify";
import QuizAttemptsSettings from "./QuizAttemptsSettings";
import QuizScheduleSettings from "./QuizScheduleSettings";
import {
  updateQuizMinPercentage,
  updateQuizDiagnosticStatus,
  updateQuizRetrySettings,
  updateQuizSchedule,
  normalizeDiagnosticFlag,
  normalizeAllowRetry,
  normalizeMaxAttempts,
  normalizeQuizDate,
} from "$api/services/courses/quizzes";

/**
 * Configuração de UM quiz: nota mínima, diagnóstico, tentativas e janela de
 * disponibilidade. Não trata de questões — elas vivem no card expandido da
 * lista, para que "editar o quiz" e "editar as questões" sejam duas coisas.
 *
 * Cada campo é gravado ao perder o foco (ou ao alternar, no caso dos toggles);
 * o botão "Salvar" regrava tudo e fecha. Por isso o botão de saída é "Fechar",
 * e não "Cancelar": o que foi digitado já está no banco.
 */
const QuizSettingsModal = ({
  open,
  onClose,
  courseId,
  quiz,
  contentTitle = "",
  onSaved,
}) => {
  // `current` é o quiz mais recente conhecido — cada gravação devolve uma versão
  // atualizada, e as gravações seguintes precisam partir dela.
  const [current, setCurrent] = useState(quiz);
  const [minPercentage, setMinPercentage] = useState(0);
  const [isDiagnostic, setIsDiagnostic] = useState(false);
  const [allowRetry, setAllowRetry] = useState(true);
  const [maxAttempts, setMaxAttempts] = useState("");
  const [openDate, setOpenDate] = useState("");
  const [closeDate, setCloseDate] = useState("");
  const [saving, setSaving] = useState(false);

  // Recarrega os campos apenas ao ABRIR o modal para outro quiz. Reagir a toda
  // mudança de `quiz` sobrescreveria o que o professor está digitando, já que
  // cada gravação devolve um objeto novo para a lista.
  useEffect(() => {
    if (!open || !quiz) return;
    setCurrent(quiz);
    setMinPercentage(Number(quiz.minPercentage) || 0);
    setIsDiagnostic(normalizeDiagnosticFlag(quiz.isDiagnostic));
    setAllowRetry(normalizeAllowRetry(quiz.allowRetry));
    const max = normalizeMaxAttempts(quiz.maxAttempts);
    setMaxAttempts(max == null ? "" : max);
    setOpenDate(normalizeQuizDate(quiz.openDate));
    setCloseDate(normalizeQuizDate(quiz.closeDate));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, quiz?.videoId]);

  // Executa uma gravação, propaga o quiz atualizado e avisa. Devolve o quiz
  // atualizado (ou null em caso de erro) para quem precise encadear.
  const persist = async (fn, successMessage) => {
    try {
      const updated = await fn(current);
      setCurrent(updated);
      onSaved?.(updated);
      if (successMessage) toast.success(successMessage);
      return updated;
    } catch (error) {
      console.error("Erro ao salvar configuração do quiz:", error);
      toast.error(error.message || "Erro ao salvar a configuração do quiz");
      return null;
    }
  };

  const handleBlurMinPercentage = () => {
    if (Number(current?.minPercentage) === Number(minPercentage)) return;
    persist(
      (q) => updateQuizMinPercentage(courseId, q, minPercentage),
      "Nota mínima atualizada!"
    );
  };

  const handleDiagnosticToggle = (checked) => {
    setIsDiagnostic(checked);
    persist(
      (q) => updateQuizDiagnosticStatus(courseId, q, checked),
      checked
        ? "Quiz marcado como diagnóstico!"
        : "Quiz desmarcado como diagnóstico!"
    );
  };

  const handleAllowRetryToggle = (checked) => {
    setAllowRetry(checked);
    // Sem repetição o limite não se aplica: só existe 1 tentativa.
    if (!checked) setMaxAttempts("");
    persist(
      (q) =>
        updateQuizRetrySettings(courseId, q, {
          allowRetry: checked,
          maxAttempts: checked ? maxAttempts : null,
        }),
      checked ? "Repetição do quiz ativada!" : "Repetição do quiz desativada!"
    );
  };

  const handleBlurMaxAttempts = async () => {
    if (!allowRetry) return;
    if (normalizeMaxAttempts(current?.maxAttempts) === normalizeMaxAttempts(maxAttempts))
      return;
    const updated = await persist(
      (q) =>
        updateQuizRetrySettings(courseId, q, { allowRetry: true, maxAttempts }),
      "Limite de tentativas atualizado!"
    );
    if (updated) {
      // Reflete o valor normalizado (ex.: campo inválido vira "ilimitado").
      const normalized = normalizeMaxAttempts(updated.maxAttempts);
      setMaxAttempts(normalized == null ? "" : normalized);
    }
  };

  const handleBlurSchedule = () => {
    if (
      normalizeQuizDate(current?.openDate) === openDate &&
      normalizeQuizDate(current?.closeDate) === closeDate
    ) {
      return;
    }
    persist(
      (q) => updateQuizSchedule(courseId, q, { openDate, closeDate }),
      "Janela de disponibilidade atualizada!"
    );
  };

  // Regrava tudo de uma vez e fecha. Serve para quem prefere um botão explícito
  // a confiar no salvamento por perda de foco.
  const handleSave = async () => {
    setSaving(true);
    try {
      let working = current;
      working = await updateQuizMinPercentage(courseId, working, minPercentage);
      working = await updateQuizDiagnosticStatus(courseId, working, isDiagnostic);
      working = await updateQuizRetrySettings(courseId, working, {
        allowRetry,
        maxAttempts: allowRetry ? maxAttempts : null,
      });
      working = await updateQuizSchedule(courseId, working, {
        openDate,
        closeDate,
      });

      setCurrent(working);
      onSaved?.(working);
      toast.success("Configurações do quiz salvas!");
      onClose?.();
    } catch (error) {
      console.error("Erro ao salvar configurações do quiz:", error);
      toast.error(error.message || "Erro ao salvar as configurações do quiz");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        Editar Quiz
        {contentTitle ? `: ${contentTitle}` : ""}
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 1 }}>
          <TextField
            label="Nota Mínima (%)"
            type="number"
            fullWidth
            value={minPercentage}
            onChange={(e) =>
              setMinPercentage(
                Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0))
              )
            }
            onBlur={handleBlurMinPercentage}
            inputProps={{ min: 0, max: 100 }}
            helperText="0 a 100%. Se 0, o quiz não será obrigatório."
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

          <Box
            sx={{
              p: 2,
              borderRadius: 1,
              backgroundColor: isDiagnostic
                ? "rgba(33, 150, 243, 0.08)"
                : "transparent",
              border: "1px solid",
              borderColor: isDiagnostic ? "#2196f3" : "#e0e0e0",
              transition: "all 0.3s ease",
            }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={isDiagnostic}
                  onChange={(e) => handleDiagnosticToggle(e.target.checked)}
                  sx={{
                    color: "#9041c1",
                    "&.Mui-checked": { color: "#2196f3" },
                  }}
                />
              }
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography sx={{ fontWeight: 500 }}>
                    Quiz Diagnóstico
                  </Typography>
                  <InfoIcon sx={{ fontSize: 18, color: "#666" }} />
                </Box>
              }
            />
            <Typography
              variant="caption"
              sx={{ display: "block", ml: 4, color: "#666", mt: 0.5 }}
            >
              Quizzes diagnósticos registram a nota do aluno, mas não são
              considerados em somatórios de avaliação do curso.
            </Typography>
          </Box>

          <QuizAttemptsSettings
            allowRetry={allowRetry}
            maxAttempts={maxAttempts}
            setMaxAttempts={setMaxAttempts}
            onToggle={handleAllowRetryToggle}
            onBlurSave={handleBlurMaxAttempts}
          />

          <QuizScheduleSettings
            openDate={openDate}
            closeDate={closeDate}
            setOpenDate={setOpenDate}
            setCloseDate={setCloseDate}
            onBlurSave={handleBlurSchedule}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} sx={{ color: "#666", textTransform: "none" }}>
          Fechar
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving}
          sx={{
            backgroundColor: "#9041c1",
            "&:hover": { backgroundColor: "#7d37a7" },
            textTransform: "none",
          }}
        >
          {saving ? <CircularProgress size={20} color="inherit" /> : "Salvar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuizSettingsModal;
