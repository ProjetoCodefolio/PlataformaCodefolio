import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import GroupsIcon from "@mui/icons-material/Groups";
import PersonIcon from "@mui/icons-material/Person";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { toast } from "react-toastify";
import {
  isPastDue,
  isBeforeOpen,
  getWindowState,
  formatTimeRemaining,
} from "$api/services/courses/assignments";
import {
  fetchSubmission,
  saveSubmission,
  deleteSubmission,
  submitterKeyFor,
} from "$api/services/courses/submissions";
import SubmissionForm from "./SubmissionForm";
import GroupPicker from "./GroupPicker";
import { RichTextView } from "$components/common/RichTextEditor";

const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Sem prazo";

/**
 * Faixa de prazo com destaque e contagem de tempo restante.
 */
function DeadlineBanner({ assignment }) {
  const now = new Date();
  const scheduled = isBeforeOpen(assignment, now);
  const past = isPastDue(assignment, now);

  // Antes de abrir: destacar a abertura.
  if (scheduled) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          bgcolor: "#eef7ff",
          border: "1px solid #cfe4fb",
          borderRadius: 2,
          px: 2,
          py: 1.5,
          mt: 2,
        }}
      >
        <EventAvailableIcon sx={{ color: "#1565c0" }} />
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 700, color: "#1565c0", display: "block" }}>
            Abre {formatTimeRemaining(assignment.openDate, now)}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "#0d3f76" }}>
            {fmtDate(assignment.openDate)}
          </Typography>
        </Box>
      </Box>
    );
  }

  if (!assignment?.dueDate) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          bgcolor: "#f4f6f8",
          borderRadius: 2,
          px: 2,
          py: 1.5,
          mt: 2,
        }}
      >
        <AccessTimeIcon sx={{ color: "#607d8b" }} />
        <Typography variant="body2" sx={{ fontWeight: 700, color: "#455a64" }}>
          Sem prazo de entrega definido
        </Typography>
      </Box>
    );
  }

  const msLeft = new Date(assignment.dueDate).getTime() - now.getTime();
  const urgent = !past && msLeft < 24 * 3600 * 1000;

  const palette = past
    ? { bg: "#fdecea", border: "#f6c9c4", fg: "#c62828", accent: "#c62828" }
    : urgent
    ? { bg: "#fff4e5", border: "#ffd8a8", fg: "#e65100", accent: "#e65100" }
    : { bg: "#eafaf0", border: "#c3ecd2", fg: "#1b7a3d", accent: "#2e7d32" };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 1,
        bgcolor: palette.bg,
        border: `1px solid ${palette.border}`,
        borderRadius: 2,
        px: 2,
        py: 1.5,
        mt: 2,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <AccessTimeIcon sx={{ color: palette.accent }} />
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 700, color: palette.fg, display: "block" }}>
            {past ? "Prazo encerrado" : "Prazo final"}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "#333" }}>
            {fmtDate(assignment.dueDate)}
          </Typography>
        </Box>
      </Box>
      <Chip
        label={
          past
            ? `Encerrou ${formatTimeRemaining(assignment.dueDate, now)}`
            : `Faltam ${formatTimeRemaining(assignment.dueDate, now).replace(/^em /, "")}`
        }
        sx={{ bgcolor: "#fff", color: palette.fg, fontWeight: 800, border: `1px solid ${palette.border}` }}
      />
    </Box>
  );
}

/**
 * Detalhe de um enunciado para o aluno, incluindo materiais, grupos (se for o
 * caso) e o formulário de entrega.
 */
export default function AssignmentDetail({ assignment, courseId, userId, onBack }) {
  const isGroup = assignment?.mode === "group";
  const [currentGroupId, setCurrentGroupId] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [loadingSub, setLoadingSub] = useState(false);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const windowState = getWindowState(assignment);
  const scheduled = windowState === "scheduled";
  const disabled = windowState === "closed" || scheduled;
  const isLate = windowState === "late";

  const submitterKey = isGroup
    ? currentGroupId
      ? submitterKeyFor("group", userId, currentGroupId)
      : null
    : submitterKeyFor("individual", userId);

  const loadSubmission = useCallback(async () => {
    if (!submitterKey) {
      setSubmission(null);
      return;
    }
    setLoadingSub(true);
    try {
      const sub = await fetchSubmission(courseId, assignment.id, submitterKey);
      setSubmission(sub);
    } finally {
      setLoadingSub(false);
    }
  }, [courseId, assignment.id, submitterKey]);

  useEffect(() => {
    loadSubmission();
  }, [loadSubmission]);

  const handleSubmit = async (content) => {
    await saveSubmission({
      courseId,
      assignmentId: assignment.id,
      submitterKey,
      submittedBy: userId,
      content,
      dueDate: assignment.dueDate,
    });
    await loadSubmission();
  };

  const handleWithdraw = async () => {
    if (!submitterKey) return;
    setWithdrawing(true);
    try {
      await deleteSubmission(courseId, assignment.id, submitterKey);
      setConfirmWithdraw(false);
      await loadSubmission();
      toast.success("Entrega retirada.");
    } catch (err) {
      toast.error(err.message || "Erro ao retirar a entrega.");
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ color: "#9041c1", mb: 1 }}>
        Voltar aos trabalhos
      </Button>

      <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, border: "1px solid #e0e0e0" }}>
        <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: "wrap", gap: 1 }}>
          <Chip
            size="small"
            icon={isGroup ? <GroupsIcon /> : <PersonIcon />}
            label={isGroup ? "Trabalho em grupo" : "Trabalho individual"}
            sx={{ bgcolor: "#f0e9f8", color: "#7d37a7", fontWeight: 700 }}
          />
          {assignment.flippedClassroom && (
            <Chip size="small" label="Sala invertida" sx={{ bgcolor: "#ede7f6", color: "#5e35b1", fontWeight: 700 }} />
          )}
        </Stack>

        <Typography variant="h5" sx={{ fontWeight: 800, color: "#333" }}>
          {assignment.title}
        </Typography>

        {/* Prazo em destaque com tempo restante */}
        <DeadlineBanner assignment={assignment} />

        {assignment.descriptionHtml && (
          <RichTextView html={assignment.descriptionHtml} sx={{ mt: 2.5, fontSize: "1rem" }} />
        )}

        {Array.isArray(assignment.attachments) && assignment.attachments.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#555", mb: 1.5 }}>
              Materiais de apoio
            </Typography>
            <Stack spacing={1.5}>
              {assignment.attachments.map((att, idx) =>
                att.url?.startsWith("data:") ? (
                  // Imagem: sem exibir o nome do arquivo
                  <Box
                    key={idx}
                    component="img"
                    src={att.url}
                    alt=""
                    sx={{
                      maxWidth: "100%",
                      borderRadius: 2,
                      border: "1px solid #eee",
                      display: "block",
                    }}
                  />
                ) : (
                  // Link externo estilizado conforme a plataforma
                  <Button
                    key={idx}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    component="a"
                    startIcon={<OpenInNewIcon />}
                    variant="outlined"
                    sx={{
                      justifyContent: "flex-start",
                      textTransform: "none",
                      color: "#7d37a7",
                      borderColor: "#e0d3f0",
                      bgcolor: "#faf7fe",
                      fontWeight: 600,
                      "&:hover": { borderColor: "#9041c1", bgcolor: "#f3ebfb" },
                      maxWidth: "100%",
                    }}
                  >
                    <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {att.name}
                    </Box>
                  </Button>
                )
              )}
            </Stack>
          </Box>
        )}

        <Divider sx={{ my: 3 }} />

        {isGroup && (
          <Box sx={{ mb: 3 }}>
            <GroupPicker
              courseId={courseId}
              assignment={assignment}
              userId={userId}
              onGroupChange={setCurrentGroupId}
            />
          </Box>
        )}

        <Typography variant="h6" sx={{ fontWeight: 700, color: "#333", mb: 2 }}>
          Sua entrega
        </Typography>

        {scheduled ? (
          <Alert severity="info">
            As entregas ainda não abriram. Você poderá enviar a partir de {fmtDate(assignment.openDate)}.
          </Alert>
        ) : isGroup && !currentGroupId ? (
          <Alert severity="warning">
            Você precisa <b>entrar em um grupo</b> acima para poder enviar a entrega.
          </Alert>
        ) : loadingSub ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
            <CircularProgress size={22} sx={{ color: "#9041c1" }} />
          </Box>
        ) : (
          <>
            {submission && (
              <>
                <Alert
                  icon={<CheckCircleIcon fontSize="inherit" />}
                  severity={submission.isLate ? "warning" : "success"}
                  sx={{ mb: 2 }}
                >
                  Entregue em {fmtDate(submission.submittedAt)}
                  {submission.isLate ? " (com atraso)" : ""}.
                  {isGroup ? " Entrega do grupo." : ""}
                </Alert>
                {!disabled && (
                  <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
                    <Button
                      size="small"
                      color="error"
                      variant="outlined"
                      startIcon={<DeleteOutlineIcon />}
                      onClick={() => setConfirmWithdraw(true)}
                      sx={{ textTransform: "none", fontWeight: 700 }}
                    >
                      Retirar entrega
                    </Button>
                  </Box>
                )}
              </>
            )}
            <SubmissionForm
              assignment={assignment}
              existingSubmission={submission}
              disabled={disabled}
              isLate={isLate}
              onSubmit={handleSubmit}
            />
          </>
        )}
      </Paper>

      <Dialog open={confirmWithdraw} onClose={() => !withdrawing && setConfirmWithdraw(false)}>
        <DialogTitle>Retirar entrega?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {isGroup
              ? "Isso remove a entrega do grupo inteiro (inclusive vídeos enviados). Todos os integrantes precisarão enviar novamente. Deseja continuar?"
              : "Isso remove a sua entrega, incluindo eventual vídeo enviado (ele deixará de aparecer na lista de conteúdo do curso). Deseja continuar?"}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmWithdraw(false)} disabled={withdrawing} sx={{ color: "#666" }}>
            Cancelar
          </Button>
          <Button
            onClick={handleWithdraw}
            disabled={withdrawing}
            variant="contained"
            color="error"
            startIcon={withdrawing ? <CircularProgress size={16} color="inherit" /> : <DeleteOutlineIcon />}
          >
            Retirar entrega
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
