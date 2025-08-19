import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Button,
  CircularProgress,
} from "@mui/material";
import { toast } from "react-toastify";
import { sendReport } from "$api/services/courses/report";

const ReportModal = ({
  open,
  onClose,
  reportType,
  itemId,
  courseId,
  userId = "anonymous",
  userName = "Usuário Anônimo",
  currentQuestionIndex,
  questionTitle,
  currentTime,
}) => {
  const [reportMessage, setReportMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSendReport = async () => {
    if (!reportMessage.trim()) {
      toast.error("Por favor, descreva o problema antes de enviar.");
      return;
    }

    try {
      setIsSubmitting(true);

      // Prepare o objeto de dados, tratando valores undefined
      const reportData = {
        type: reportType || "unknown",
        message: reportMessage.trim(),
        itemId: itemId || null,
        courseId: courseId || null,
        userId: userId || "anonymous",
        userName: userName || "Usuário Anônimo",
        userAgent: navigator.userAgent,
        screenResolution: `${window.innerWidth}x${window.innerHeight}`,
        reportDate: new Date().toISOString(),
      };

      // Adicione dados específicos apenas se existirem
      if (currentQuestionIndex !== undefined && currentQuestionIndex !== null) {
        reportData.currentQuestionIndex = currentQuestionIndex;
      }

      if (questionTitle) {
        reportData.questionTitle = questionTitle;
      }

      if (currentTime !== undefined && currentTime !== null) {
        reportData.currentTime = currentTime;
      }

      const result = await sendReport(reportData);

      if (result.success) {
        toast.success(`Reporte #${result.reportId} enviado com sucesso!`);
        handleClose();
      } else {
        toast.error(
          result.message || "Erro ao enviar reporte. Tente novamente."
        );
      }
    } catch (error) {
      console.error("Erro ao enviar reporte:", error);
      toast.error("Erro ao enviar reporte. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setReportMessage("");
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={!isSubmitting ? handleClose : undefined}
      aria-labelledby="report-dialog-title"
      maxWidth="sm"
      fullWidth
      PaperProps={{
        style: {
          backgroundColor: "#f5f5fa",
          borderRadius: "12px",
        },
      }}
      sx={{
        zIndex: 9999,
        "& .MuiBackdrop-root": {
          backgroundColor: "rgba(0, 0, 0, 0.7)",
        },
      }}
    >
      <DialogTitle id="report-dialog-title">
        Reportar problema no {reportType === "video" ? "vídeo" : "quiz"}
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          Descreva o problema que você está enfrentando com este{" "}
          {reportType === "video" ? "vídeo" : "quiz"}:
        </DialogContentText>
        <TextField
          autoFocus
          margin="dense"
          id="report"
          label="Descrição do problema"
          type="text"
          fullWidth
          multiline
          rows={4}
          variant="outlined"
          value={reportMessage}
          onChange={(e) => setReportMessage(e.target.value)}
          disabled={isSubmitting}
          sx={{
            mt: 2,
            "& .MuiOutlinedInput-root": {
              "&.Mui-focused fieldset": {
                borderColor: "#9041c1",
              },
            },
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="inherit" disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button
          onClick={handleSendReport}
          variant="contained"
          disabled={!reportMessage.trim() || isSubmitting}
          startIcon={
            isSubmitting ? <CircularProgress size={20} color="inherit" /> : null
          }
          sx={{
            bgcolor: "#9041c1",
            "&:hover": {
              bgcolor: "#7d37a7",
            },
            "&.Mui-disabled": {
              bgcolor: "rgba(144, 65, 193, 0.5)",
            },
          }}
        >
          {isSubmitting ? "Enviando..." : "Enviar Reporte"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReportModal;
