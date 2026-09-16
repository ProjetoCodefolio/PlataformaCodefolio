import { Box, Chip, Paper, Typography } from "@mui/material";
import { MarkdownView } from "$components/common/MarkdownEditor";
import { capitalizeWords } from "$api/services/courses/studentDashboard";
import { answerVerdict } from "$api/services/courses/quizGrading";

/**
 * Painel "Respostas detalhadas" de um aluno. Usado pela linha expandida da
 * tabela (desktop) E pelo card expandido (mobile) — antes o bloco existia
 * apenas dentro da tabela, e no celular o professor ficava sem nenhuma forma
 * de ver o que o aluno respondeu.
 */
const StudentAnswersDetail = ({ student }) => (
  <Paper
    elevation={0}
    sx={{
      p: 2,
      bgcolor: "#f9f9fa",
      borderRadius: 2,
    }}
  >
    <Typography
      variant="h6"
      sx={{
        mb: 2,
        color: "#9041c1",
        fontWeight: "bold",
      }}
    >
      Respostas detalhadas de{" "}
      {capitalizeWords(student.name)}
    </Typography>

    {/* Verificamos se existem respostas detalhadas */}
    {student.detailedAnswers ? (
      <Box>
        {Object.entries(student.detailedAnswers)
          // Sort questions by their keys or try to extract question numbers
          .sort(([keyA], [keyB]) => {
            // Try to extract numbers from the keys (e.g., "q2" -> 2)
            const numA = parseInt(keyA.replace(/\D/g, '')) || 0;
            const numB = parseInt(keyB.replace(/\D/g, '')) || 0;

            if (numA !== numB) return numA - numB;

            // If numbers are the same or not available, sort alphabetically
            return keyA.localeCompare(keyB);
          })
          .map(([questionId, detail], index) => {
            const isOpenEnded = detail.questionType === 'open-ended';

            return (
            <Box
              key={questionId}
              sx={{
                mb: 2,
                p: 1.5,
                bgcolor: "white",
                borderRadius: 1,
                border: isOpenEnded ? "1px solid #9041c1" : "1px solid #e0e0e0",
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                {/* Mesmo markdown que o aluno viu ao responder. */}
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 500, flexShrink: 0 }}>
                    {index + 1}.
                  </Typography>
                  <MarkdownView
                    markdown={detail.question}
                    sx={{ fontWeight: 500, fontSize: '1rem', color: 'inherit' }}
                  />
                </Box>
                {isOpenEnded && (
                  <Box
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 5,
                      bgcolor: 'rgba(144, 65, 193, 0.1)',
                      color: '#9041c1',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}
                  >
                    Questão Aberta
                  </Box>
                )}
                {/* Marcas deixadas pelo recálculo de notas */}
                {detail.removedFromQuiz && (
                  <Chip
                    size="small"
                    label="Removida do quiz"
                    title="Esta questão não existe mais no quiz e não conta na nota"
                    sx={{ bgcolor: "#eeeeee", color: "#555", fontWeight: 600 }}
                  />
                )}
                {detail.recalcAmbiguous && (
                  <Chip
                    size="small"
                    label="Reconhecida pela posição"
                    title="A alternativa foi editada depois da resposta; o recálculo manteve a posição original marcada pelo aluno"
                    sx={{ bgcolor: "#fff3e0", color: "#b26a00", fontWeight: 600 }}
                  />
                )}
              </Box>

              {isOpenEnded ? (
                // Renderização para questões abertas
                <Box sx={{ mt: 1 }}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 1,
                      backgroundColor: "rgba(144, 65, 193, 0.08)",
                      border: "1px solid rgba(144, 65, 193, 0.3)",
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 600,
                        color: "#9041c1",
                        display: "block",
                        mb: 1,
                      }}
                    >
                      Resposta do aluno:
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        color: "#333",
                      }}
                    >
                      {detail.answer || detail.userAnswer || "(Nenhuma resposta fornecida)"}
                    </Typography>
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{
                      display: "block",
                      mt: 1,
                      color: "#666",
                      fontStyle: "italic",
                    }}
                  >
                    Esta questão não afeta a nota final e será avaliada pelo professor.
                  </Typography>
                </Box>
              ) : answerVerdict(detail) === "ungraded" ? (
                // Pergunta de opinião: só a escolha do aluno, sem certo nem
                // errado. O verde/vermelho aqui daria a entender que havia uma
                // resposta esperada.
                <Box sx={{ mt: 1 }}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 1,
                      backgroundColor: "rgba(144, 65, 193, 0.06)",
                      border: "1px solid rgba(144, 65, 193, 0.35)",
                    }}
                  >
                    <Typography variant="body2" sx={{ color: "#4a148c", fontWeight: 500 }}>
                      Resposta do aluno:{" "}
                      {detail.userAnswerText || "(Nenhuma resposta fornecida)"}
                    </Typography>
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{ display: "block", mt: 1, color: "#666", fontStyle: "italic" }}
                  >
                    Pergunta sem resposta certa, não afeta a nota.
                  </Typography>
                </Box>
              ) : (
                // Renderização para múltipla escolha
                <Box
                  sx={{
                    mt: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1.5,
                  }}
                >
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 1,
                      backgroundColor:
                        detail.userAnswerText === detail.correctOptionText
                          ? "rgba(76, 175, 80, 0.15)"
                          : "rgba(211, 47, 47, 0.12)",
                      border: `1px solid ${
                        detail.userAnswerText === detail.correctOptionText
                          ? "rgba(76, 175, 80, 0.5)"
                          : "rgba(211, 47, 47, 0.5)"
                      }`,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 500,
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        color: detail.userAnswerText === detail.correctOptionText
                          ? "#2e7d32"
                          : "#c62828",
                      }}
                    >
                      {detail.userAnswerText === detail.correctOptionText ? "✓" : "✗"}{" "}
                      Resposta do aluno:{" "}
                      <Box
                        component="span"
                        sx={{ fontWeight: 600 }}
                      >
                        {detail.userAnswerText}
                      </Box>
                    </Typography>
                  </Box>

                  {detail.userAnswerText !== detail.correctOptionText && (
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 1,
                        backgroundColor: "rgba(76, 175, 80, 0.12)",
                        border: "1px solid rgba(76, 175, 80, 0.5)",
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 500,
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                          color: "#2e7d32",
                        }}
                      >
                        ✓ Resposta correta:{" "}
                        <Box
                          component="span"
                          sx={{ fontWeight: 600 }}
                        >
                          {detail.correctOptionText}
                        </Box>
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          );
          })}
      </Box>
    ) : (
      <Typography
        variant="body1"
        color="text.secondary"
      >
        Nenhuma resposta detalhada disponível para
        este estudante.
      </Typography>
    )}
  </Paper>
);

export default StudentAnswersDetail;
