import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";
import { toast } from "react-toastify";
import {
  exportOpinionAnswersToCSV,
  fetchOpinionResults,
} from "$api/services/courses/quizOpinionResults";

/**
 * Distribuição das respostas de um questionário de opinião.
 *
 * Perguntas sem resposta certa não têm nota, então nenhuma das telas de
 * acompanhamento mostrava o que a turma respondeu. Aqui a leitura é por
 * pergunta: quantos marcaram cada ponto da escala.
 */
export default function OpinionResultsModal({
  open,
  onClose,
  courseId,
  quizId,
  quizTitle = "",
}) {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [distribution, setDistribution] = useState([]);
  const [submissions, setSubmissions] = useState([]);

  useEffect(() => {
    if (!open || !courseId || !quizId) return undefined;

    let cancelled = false;

    const carregar = async () => {
      setLoading(true);
      setErro("");
      try {
        const dados = await fetchOpinionResults(courseId, quizId);
        if (cancelled) return;
        setDistribution(dados.distribution);
        setSubmissions(dados.submissions);
      } catch (e) {
        if (!cancelled) setErro(e.message || "Erro ao carregar as respostas");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    carregar();
    return () => {
      cancelled = true;
    };
  }, [open, courseId, quizId]);

  const exportar = () => {
    try {
      const csv = exportOpinionAnswersToCSV(distribution, submissions);
      if (!csv) {
        toast.info("Não há respostas para exportar");
        return;
      }

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `respostas_${quizTitle || quizId}_${new Date().toISOString().split("T")[0]}.csv`
      );
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Arquivo CSV exportado com sucesso!");
    } catch (e) {
      console.error("Erro ao exportar respostas:", e);
      toast.error("Erro ao exportar arquivo");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ fontWeight: "bold", color: "#333", pr: 6 }}>
        Respostas do questionário
        {quizTitle && (
          <Typography variant="body2" sx={{ color: "#666", mt: 0.5 }}>
            {quizTitle}
          </Typography>
        )}
      </DialogTitle>
      <IconButton
        aria-label="Fechar"
        onClick={onClose}
        sx={{ position: "absolute", top: 8, right: 8, color: "#666" }}
      >
        <CloseIcon />
      </IconButton>

      <DialogContent dividers>
        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress sx={{ color: "#9041c1" }} />
          </Box>
        )}

        {!loading && erro && <Alert severity="error">{erro}</Alert>}

        {!loading && !erro && distribution.length === 0 && (
          <Alert severity="info">
            Este questionário não tem perguntas sem resposta certa.
          </Alert>
        )}

        {!loading &&
          !erro &&
          distribution.map((pergunta, indice) => (
            <Box key={pergunta.questionId} sx={{ mb: 4 }}>
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 1,
                  alignItems: "baseline",
                  mb: 1.5,
                }}
              >
                <Typography sx={{ fontWeight: 600, color: "#333", flexGrow: 1 }}>
                  {indice + 1}. {pergunta.question}
                </Typography>
                <Typography variant="caption" sx={{ color: "#666" }}>
                  {pergunta.totalRespondents === 1
                    ? "1 resposta"
                    : `${pergunta.totalRespondents} respostas`}
                  {pergunta.unanswered > 0 && ` · ${pergunta.unanswered} em branco`}
                </Typography>
              </Box>

              {pergunta.totalRespondents === 0 ? (
                <Typography variant="body2" sx={{ color: "#888", fontStyle: "italic" }}>
                  Ninguém respondeu ainda.
                </Typography>
              ) : (
                pergunta.options.map((opcao, i) => (
                  <Box key={i} sx={{ mb: 1 }}>
                    <Box sx={{ display: "flex", gap: 1, mb: 0.25 }}>
                      <Typography variant="body2" sx={{ color: "#444", flexGrow: 1 }}>
                        {opcao}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#666", fontWeight: 600 }}>
                        {pergunta.counts[i]} ({pergunta.percentages[i].toFixed(0)}%)
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={pergunta.percentages[i]}
                      sx={{
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: "#ede7f6",
                        "& .MuiLinearProgress-bar": {
                          backgroundColor: "#9041c1",
                          borderRadius: 5,
                        },
                      }}
                    />
                  </Box>
                ))
              )}
            </Box>
          ))}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} sx={{ color: "#666", textTransform: "none" }}>
          Fechar
        </Button>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={exportar}
          disabled={loading || submissions.length === 0}
          sx={{
            backgroundColor: "#9041c1",
            color: "white",
            borderRadius: "8px",
            fontWeight: "bold",
            textTransform: "none",
            "&:hover": { backgroundColor: "#7d37a7" },
          }}
        >
          Exportar CSV
        </Button>
      </DialogActions>
    </Dialog>
  );
}
