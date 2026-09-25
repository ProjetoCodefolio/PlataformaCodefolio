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
} from "$api/services/courses/quizCrud";
import {
  normalizeDiagnosticFlag,
  normalizeAllowRetry,
  normalizeMaxAttempts,
  normalizeQuizDate,
} from "$api/services/courses/quizWindow";
import { notifyNewQuiz } from "$api/services/notifications";
import {
  effectiveQuizPublishAt,
  isScheduled,
  normalizePublishAt,
} from "$api/services/courses/publication";

/**
 * Mudanças que valem um aviso para a turma. Marcar/desmarcar "diagnóstico"
 * fica de fora: muda a contabilidade da média, não o que o aluno precisa
 * fazer, e não justifica um e-mail para todo mundo.
 */
const CHANGE_LABELS = {
  minPercentage: "Nota mínima",
  attempts: "Tentativas",
  schedule: "Prazo",
};

/**
 * Configuração de UM quiz: nota mínima, diagnóstico, tentativas e janela de
 * disponibilidade. Não trata de questões — elas vivem no card expandido da
 * lista, para que "editar o quiz" e "editar as questões" sejam duas coisas.
 *
 * Cada campo é gravado ao perder o foco (ou ao alternar, no caso dos toggles);
 * o botão "Salvar" regrava tudo e fecha. Por isso o botão de saída é "Fechar",
 * e não "Cancelar": o que foi digitado já está no banco.
 *
 * O aviso para a turma é DESLIGADO por padrão e sai uma única vez, ao fechar,
 * com o resumo do que mudou na sessão — justamente porque aqui cada campo é
 * uma gravação: avisar por gravação mandaria um e-mail por campo mexido.
 */
const QuizSettingsModal = ({
  open,
  onClose,
  courseId,
  courseTitle = "",
  quiz,
  contentTitle = "",
  contentPublishAt = "",
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
  const [publishAt, setPublishAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [notifyClass, setNotifyClass] = useState(false);
  // Campos materiais mexidos nesta sessão de edição, acumulados até o fechamento.
  const [changed, setChanged] = useState([]);

  const markChanged = (key) =>
    setChanged((prev) => (prev.includes(key) ? prev : [...prev, key]));

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
    setPublishAt(normalizePublishAt(quiz.publishAt));
    setNotifyClass(false);
    setChanged([]);
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
    markChanged("minPercentage");
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
    markChanged("attempts");
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
    markChanged("attempts");
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
    markChanged("schedule");
    persist(
      (q) => updateQuizSchedule(courseId, q, { openDate, closeDate }),
      "Janela de disponibilidade atualizada!"
    );
  };

  // Recebe o valor do campo porque o "Publicar agora" dispara antes de o
  // estado atualizar.
  const handleBlurPublishAt = async (value) => {
    if (normalizePublishAt(current?.publishAt) === normalizePublishAt(value)) return;
    const updated = await persist(
      (q) => updateQuizSchedule(courseId, q, { openDate, closeDate, publishAt: value }),
      isScheduled(value) ? "Publicação do quiz programada!" : "Quiz publicado!"
    );
    // Data no passado vira "publicado agora": o campo reflete o que foi gravado.
    if (updated) setPublishAt(normalizePublishAt(updated.publishAt));
  };

  // Enquanto o quiz estiver oculto, avisar a turma revelaria o que o professor
  // programou para depois.
  const quizOculto = isScheduled(
    effectiveQuizPublishAt({ publishAt }, { publishAt: contentPublishAt })
  );

  /**
   * União entre o que os blurs já marcaram e o que ainda está só no formulário
   * (quem clica direto em "Salvar" não dispara blur). Calculado na hora porque
   * `setChanged` é assíncrono e o disparo acontece no mesmo tick.
   */
  const collectChanges = (baseline) => {
    const keys = new Set(changed);
    if (Number(baseline?.minPercentage) !== Number(minPercentage))
      keys.add("minPercentage");
    if (
      normalizeAllowRetry(baseline?.allowRetry) !== allowRetry ||
      normalizeMaxAttempts(baseline?.maxAttempts) !==
        normalizeMaxAttempts(maxAttempts)
    )
      keys.add("attempts");
    if (
      normalizeQuizDate(baseline?.openDate) !== openDate ||
      normalizeQuizDate(baseline?.closeDate) !== closeDate
    )
      keys.add("schedule");
    return [...keys];
  };

  /**
   * Avisa a turma UMA vez, no fim da edição, com o resumo do que mudou. Sem
   * mudança material ou sem a caixinha marcada, não sai nada.
   */
  const notifyIfRequested = (finalQuiz, changeKeys) => {
    if (!notifyClass || changeKeys.length === 0 || quizOculto) return;
    const changeLabels = changeKeys.map((key) => CHANGE_LABELS[key]).filter(Boolean);
    if (changeLabels.length === 0) return;

    notifyNewQuiz(
      courseId,
      {
        id: finalQuiz?.isSlideQuiz
          ? `slide_${finalQuiz.slideId}`
          : finalQuiz?.videoId,
        title: contentTitle || "Quiz",
        openDate: finalQuiz?.openDate,
        closeDate: finalQuiz?.closeDate,
        minPercentage: finalQuiz?.minPercentage,
        isDiagnostic: finalQuiz?.isDiagnostic,
        allowRetry: finalQuiz?.allowRetry,
        maxAttempts: finalQuiz?.maxAttempts,
      },
      courseTitle,
      changeLabels
    );
    toast.info("A turma será avisada sobre as alterações.");
  };

  const handleClose = () => {
    notifyIfRequested(current, collectChanges(current));
    onClose?.();
  };

  // Regrava tudo de uma vez e fecha. Serve para quem prefere um botão explícito
  // a confiar no salvamento por perda de foco.
  const handleSave = async () => {
    setSaving(true);
    try {
      const changeKeys = collectChanges(current);
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
        publishAt,
      });

      setCurrent(working);
      onSaved?.(working);
      toast.success("Configurações do quiz salvas!");
      notifyIfRequested(working, changeKeys);
      onClose?.();
    } catch (error) {
      console.error("Erro ao salvar configurações do quiz:", error);
      toast.error(error.message || "Erro ao salvar as configurações do quiz");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
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
            publishAt={publishAt}
            setPublishAt={setPublishAt}
            contentPublishAt={contentPublishAt}
            onBlurPublishAt={handleBlurPublishAt}
          />

          <Box sx={{ p: 2, borderRadius: 1, border: "1px solid #e0e0e0" }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={notifyClass && !quizOculto}
                  disabled={quizOculto}
                  onChange={(e) => setNotifyClass(e.target.checked)}
                  sx={{ color: "#9041c1", "&.Mui-checked": { color: "#9041c1" } }}
                />
              }
              label="Avisar a turma sobre estas alterações"
            />
            <Typography
              variant="caption"
              sx={{ display: "block", ml: 4, color: "#666", mt: 0.5 }}
            >
              {quizOculto
                ? "Indisponível enquanto o quiz estiver programado: o aviso revelaria o quiz antes da data."
                : "Manda um e-mail para todos os alunos matriculados ao fechar, com o resumo do que mudou. Só vale para prazo, nota mínima e tentativas."}
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} sx={{ color: "#666", textTransform: "none" }}>
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
