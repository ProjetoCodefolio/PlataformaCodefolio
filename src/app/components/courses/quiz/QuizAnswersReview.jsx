import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Box,
  Typography,
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import { fetchQuizQuestions } from "$api/services/courses/quizzes";
import { answerVerdict } from "$api/services/courses/quizGrading";
import { MarkdownView } from "$components/common/MarkdownEditor";

/**
 * Revisão somente-leitura de uma tentativa de quiz já submetida.
 *
 * O gabarito revelado (`canRetryQuiz`) segue a MESMA regra de
 * `quiz/index.jsx` na hora da submissão: só aparece quando o aluno não tem
 * mais tentativa disponível — com tentativa sobrando, mostrar a alternativa
 * certa deixaria memorizar e "acertar" na próxima sem entender o conteúdo.
 *
 * `detailedAnswers` é o nó já gravado em `quizResults/{uid}/{courseId}/{key}`
 * (objeto indexado por questionId, não um array) — funciona para qualquer
 * tentativa histórica, mesmo de antes desta tela existir. A ORDEM das
 * questões não é confiável nesse objeto (chaves de push do Firebase), então
 * a lista oficial vem de `fetchQuizQuestions`; só a ORDEM é usada de lá —
 * o texto exibido é sempre o que foi salvo na hora da resposta, para não
 * mudar o que o aluno revisa se o professor editar a questão depois.
 */
const QuizAnswersReview = ({
  open,
  onClose,
  quizId,
  detailedAnswers,
  canRetryQuiz,
  fullScreen = false,
}) => {
  const [orderedIds, setOrderedIds] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !quizId) return;
    let cancelled = false;

    setLoading(true);
    fetchQuizQuestions(quizId)
      .then((quizData) => {
        if (cancelled) return;
        setOrderedIds((quizData?.questions || []).map((q) => q.id));
      })
      .catch(() => {
        if (!cancelled) setOrderedIds([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, quizId]);

  useEffect(() => {
    if (!open) setOrderedIds(null);
  }, [open]);

  const answers = detailedAnswers || {};
  const entries = orderedIds
    ? orderedIds.filter((id) => answers[id]).map((id) => [id, answers[id]])
    : Object.entries(answers);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={fullScreen}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", pr: 6 }}>
        Revisar tentativa
        <IconButton
          onClick={onClose}
          sx={{ position: "absolute", right: 8, top: 8, color: "#666" }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ backgroundColor: "#F5F5FA" }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={28} sx={{ color: "#9041c1" }} />
          </Box>
        ) : entries.length === 0 ? (
          <Typography sx={{ color: "#666", textAlign: "center", py: 2 }}>
            Não há respostas registradas para esta tentativa.
          </Typography>
        ) : (
          entries.map(([questionId, answer], index) => {
            const isOpenEndedQuestion = answer.questionType === "open-ended";
            const verdict = answerVerdict(answer);

            return (
              <Box
                key={questionId}
                sx={{
                  mb: 3,
                  p: 2.5,
                  borderRadius: 2,
                  bgcolor: "#fff",
                  border: `1px solid ${
                    {
                      "open-ended": "#9041c1",
                      ungraded: "#9041c1",
                      correct: "#4caf50",
                      incorrect: "#f44336",
                    }[verdict]
                  }`,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 1,
                    mb: 1.5,
                    flexWrap: "wrap",
                  }}
                >
                  <Box
                    sx={{
                      flex: 1,
                      minWidth: "200px",
                      display: "flex",
                      alignItems: "baseline",
                      gap: 0.5,
                    }}
                  >
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 600, flexShrink: 0 }}
                    >
                      Questão {index + 1}:
                    </Typography>
                    <MarkdownView
                      markdown={answer.question}
                      sx={{ fontWeight: 600, fontSize: "1rem", color: "inherit" }}
                    />
                  </Box>

                  {isOpenEndedQuestion ? (
                    <Box
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 5,
                        bgcolor: "rgba(144, 65, 193, 0.1)",
                        color: "#9041c1",
                        fontWeight: 600,
                        fontSize: "0.875rem",
                      }}
                    >
                      Questão Aberta
                    </Box>
                  ) : verdict === "ungraded" ? (
                    <Box
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 5,
                        bgcolor: "rgba(144, 65, 193, 0.1)",
                        color: "#9041c1",
                        fontWeight: 600,
                        fontSize: "0.875rem",
                      }}
                    >
                      Respondida
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 5,
                        bgcolor: answer.isCorrect
                          ? "rgba(76, 175, 80, 0.1)"
                          : "rgba(244, 67, 54, 0.1)",
                        color: answer.isCorrect ? "#2e7d32" : "#d32f2f",
                        fontWeight: 600,
                        fontSize: "0.875rem",
                      }}
                    >
                      {answer.isCorrect ? (
                        <>
                          <CheckCircleIcon fontSize="small" sx={{ mr: 0.5 }} />
                          Correto
                        </>
                      ) : (
                        <>
                          <CancelIcon fontSize="small" sx={{ mr: 0.5 }} />
                          Incorreto
                        </>
                      )}
                    </Box>
                  )}
                </Box>

                {isOpenEndedQuestion ? (
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 1,
                      bgcolor: "rgba(144, 65, 193, 0.05)",
                      border: "1px solid rgba(144, 65, 193, 0.2)",
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ color: "#666", fontWeight: 600, display: "block", mb: 1 }}
                    >
                      Sua resposta:
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                    >
                      {answer.answer || "(Nenhuma resposta fornecida)"}
                    </Typography>
                  </Box>
                ) : (
                  <Box>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        p: 1.5,
                        my: 0.5,
                        borderRadius: 1,
                        bgcolor:
                          verdict === "ungraded"
                            ? "rgba(144, 65, 193, 0.06)"
                            : answer.isCorrect
                            ? "rgba(76, 175, 80, 0.1)"
                            : "rgba(244, 67, 54, 0.1)",
                        border:
                          verdict === "ungraded"
                            ? "1px solid #d1b3e8"
                            : answer.isCorrect
                            ? "1px solid #4caf50"
                            : "1px solid #f44336",
                      }}
                    >
                      <Typography
                        variant="body1"
                        sx={{
                          fontWeight: 500,
                          color:
                            verdict === "ungraded"
                              ? "#4a148c"
                              : answer.isCorrect
                              ? "#2e7d32"
                              : "#d32f2f",
                        }}
                      >
                        {answer.userAnswerText || "Não respondida"}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          ml: "auto",
                          fontWeight: 600,
                          color:
                            verdict === "ungraded"
                              ? "#6a1b9a"
                              : answer.isCorrect
                              ? "#4caf50"
                              : "#f44336",
                        }}
                      >
                        {verdict === "ungraded"
                          ? "Sua resposta"
                          : answer.isCorrect
                          ? "Resposta correta"
                          : "Sua resposta"}
                      </Typography>
                    </Box>

                    {/* Mesma regra da tela de resultado logo após submeter:
                        só revela a certa quando não há mais tentativa. */}
                    {verdict === "incorrect" && !canRetryQuiz && (
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          p: 1.5,
                          my: 0.5,
                          borderRadius: 1,
                          bgcolor: "rgba(76, 175, 80, 0.1)",
                          border: "1px solid #4caf50",
                        }}
                      >
                        <Typography
                          variant="body1"
                          sx={{ fontWeight: 500, color: "#2e7d32" }}
                        >
                          {answer.correctOptionText || "Não disponível"}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ ml: "auto", fontWeight: 600, color: "#4caf50" }}
                        >
                          Resposta correta
                        </Typography>
                      </Box>
                    )}
                    {verdict === "ungraded" && (
                      <Typography
                        variant="caption"
                        sx={{ display: "block", mt: 1, color: "#666", fontStyle: "italic" }}
                      >
                        Esta pergunta não tem resposta certa e não afeta sua nota.
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
            );
          })
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          variant="contained"
          onClick={onClose}
          sx={{
            backgroundColor: "#9041c1",
            borderRadius: "12px",
            "&:hover": { backgroundColor: "#7d37a7" },
            textTransform: "none",
          }}
        >
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuizAnswersReview;
