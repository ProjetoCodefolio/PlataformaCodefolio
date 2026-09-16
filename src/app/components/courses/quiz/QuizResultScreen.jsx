import { Box, Button, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import { MarkdownView } from "$components/common/MarkdownEditor";
import { answerVerdict } from "$api/services/courses/quizGrading";

/** Tela exibida ao final do quiz: nota, aprovação/reprovação e revisão das questões. */
export default function QuizResultScreen({
  result,
  quizMinPercentage,
  canRetryQuiz,
  shouldShowResults,
  canGoNextVideo,
  onFinish,
  onNextVideo,
  onRetry,
}) {
  const getRequiredCorrectAnswers = () => {
    if (!result) return "";
    return `${result.minPercentage}%`;
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        minHeight: "70vh",
        padding: { xs: 1, sm: 3 },
        backgroundColor: "#F5F5FA",
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: { xs: "100%", sm: "780px" },
          p: { xs: 2, sm: 4 },
          borderRadius: "16px",
          backgroundColor: "#F5F5FA",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
          border: "1px solid #e0e0e0",
        }}
      >
        <Typography
          variant="h4"
          sx={{
            mb: { xs: 2, sm: 3 },
            textAlign: "center",
            color: "#333",
            fontWeight: 600,
            fontSize: { xs: "1.5rem", sm: "2.25rem" },
          }}
        >
          Resultado do Quiz
        </Typography>
        <Typography
          variant="h6"
          sx={{
            mb: { xs: 1, sm: 2 },
            textAlign: "center",
            color: "#666",
            fontSize: { xs: "1rem", sm: "1.25rem" },
          }}
        >
          {result.totalPoints > 0
            ? `Pontuação: ${result.earnedPoints}/${result.totalPoints} (${result.scorePercentage.toFixed(2)}%)`
            : "Suas respostas foram registradas"}
        </Typography>
        <Typography
          variant="h5"
          sx={{
            mb: { xs: 2, sm: 3 },
            textAlign: "center",
            color:
              quizMinPercentage === 0
                ? "#000000"
                : result.isPassed
                ? "#4caf50"
                : "#d32f2f",
            fontWeight: "bold",
            fontSize: { xs: "1.25rem", sm: "1.75rem" },
          }}
        >
          {result.totalPoints === 0
            ? "Obrigado por responder!"
            : quizMinPercentage === 0
            ? "Quiz Finalizado!"
            : result.isPassed
            ? "Parabéns, você passou!"
            : `Você não atingiu a nota mínima de ${getRequiredCorrectAnswers()}`}
        </Typography>

        {shouldShowResults && result.answersDetails && (
          <Box sx={{ mt: 3 }}>
            <Typography
              variant="h6"
              sx={{ mb: 2, fontWeight: 600, textAlign: "center" }}
            >
              Revisão das questões
            </Typography>
            {result.answersDetails?.map((answer, index) => {
              const isOpenEndedQuestion = answer.questionType === "open-ended";

              return (
                <Box
                  key={answer.questionId}
                  sx={{
                    mb: 4,
                    p: 3,
                    borderRadius: 2,
                    bgcolor: "#f9f9f9",
                    border: `1px solid ${
                      {
                        "open-ended": "#9041c1",
                        ungraded: "#9041c1",
                        correct: "#4caf50",
                        incorrect: "#f44336",
                      }[answerVerdict(answer)]
                    }`,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 1,
                      mb: 2,
                      flexWrap: "wrap",
                    }}
                  >
                    {/* Mesmo markdown que o aluno viu ao responder. */}
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
                    ) : answerVerdict(answer) === "ungraded" ? (
                      /* Sem gabarito não há veredito: o selo "Incorreto" aqui
                         contradiz o aviso logo abaixo e faz o aluno achar que
                         havia uma resposta esperada. */
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

                  {/* Renderizar resposta baseada no tipo de questão */}
                  {isOpenEndedQuestion ? (
                    <Box sx={{ pl: 2 }}>
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
                          sx={{
                            color: "#666",
                            fontWeight: 600,
                            display: "block",
                            mb: 1,
                          }}
                        >
                          Sua resposta:
                        </Typography>
                        <Typography
                          variant="body1"
                          sx={{
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}
                        >
                          {answer.answer || "(Nenhuma resposta fornecida)"}
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
                        Esta questão não afeta sua nota final e será avaliada pelo professor.
                      </Typography>
                    </Box>
                  ) : answerVerdict(answer) === "ungraded" ? (
                    /* Pergunta de opinião: nem certo nem errado. Pintar de
                       verde ou vermelho aqui é exatamente o que faria o aluno
                       achar que existe uma resposta esperada. */
                    <Box sx={{ pl: 2 }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          p: 1.5,
                          my: 0.5,
                          borderRadius: 1,
                          bgcolor: "rgba(144, 65, 193, 0.06)",
                          border: "1px solid #d1b3e8",
                        }}
                      >
                        <Typography variant="body1" sx={{ fontWeight: 500, color: "#4a148c" }}>
                          {Number(answer.userOption) >= 0
                            ? answer.options?.[Number(answer.userOption)] ||
                              "Resposta não encontrada"
                            : "Não respondida"}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ ml: "auto", color: "#6a1b9a", fontWeight: 600 }}
                        >
                          Sua resposta
                        </Typography>
                      </Box>
                      <Typography
                        variant="caption"
                        sx={{ display: "block", mt: 1, color: "#666", fontStyle: "italic" }}
                      >
                        Esta pergunta não tem resposta certa e não afeta sua nota.
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ pl: 2 }}>
                      {/* Opção selecionada pelo usuário */}
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          p: 1.5,
                          my: 0.5,
                          borderRadius: 1,
                          bgcolor: answer.isCorrect
                            ? "rgba(76, 175, 80, 0.1)"
                            : "rgba(244, 67, 54, 0.1)",
                          border: answer.isCorrect
                            ? "1px solid #4caf50"
                            : "1px solid #f44336",
                        }}
                      >
                        <Typography
                          variant="body1"
                          sx={{
                            fontWeight: 500,
                            color: answer.isCorrect ? "#2e7d32" : "#d32f2f",
                          }}
                        >
                          {String.fromCharCode(65 + Number(answer.userOption))}
                          ) {answer.options[Number(answer.userOption)] || "Resposta não encontrada"}
                        </Typography>
                        <Box
                          sx={{
                            ml: "auto",
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              color: answer.isCorrect ? "#4caf50" : "#f44336",
                              fontWeight: 600,
                            }}
                          >
                            {answer.isCorrect ? "Resposta correta" : "Sua resposta"}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Mostrar a resposta correta apenas se o usuário errou
                          E o quiz não permitir refazer. Se o aluno pode refazer,
                          revelar o gabarito permitiria memorizar a alternativa
                          certa e passar na próxima tentativa. */}
                      {!answer.isCorrect && !canRetryQuiz && (
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
                            sx={{
                              fontWeight: 500,
                              color: "#2e7d32",
                            }}
                          >
                            {String.fromCharCode(65 + Number(answer.correctOption))}
                            ) {answer.options[Number(answer.correctOption)] || "Resposta não encontrada"}
                          </Typography>
                          <Box
                            sx={{
                              ml: "auto",
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{
                                color: "#4caf50",
                                fontWeight: 600,
                              }}
                            >
                              Resposta correta
                            </Typography>
                          </Box>
                        </Box>
                      )}
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>
        )}

        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "center",
            gap: { xs: 1, sm: 2 },
            mt: 4,
          }}
        >
          <Button
            variant="contained"
            onClick={onFinish}
            sx={{
              backgroundColor: "#9041c1",
              borderRadius: "12px",
              "&:hover": { backgroundColor: "#7d37a7" },
              textTransform: "none",
              fontWeight: 500,
              px: { xs: 2, sm: 4 },
              py: { xs: 0.5, sm: 1.5 },
              fontSize: { xs: "0.8rem", sm: "0.875rem" },
              width: { xs: "100%", sm: "auto" },
            }}
          >
            Voltar ao Vídeo
          </Button>

          {result && result.isPassed && canGoNextVideo && (
            <Button
              variant="contained"
              onClick={onNextVideo}
              sx={{
                backgroundColor: "#4caf50",
                borderRadius: "12px",
                "&:hover": { backgroundColor: "#388e3c" },
                textTransform: "none",
                fontWeight: 500,
                px: { xs: 2, sm: 4 },
                py: { xs: 0.5, sm: 1.5 },
                fontSize: { xs: "0.8rem", sm: "0.875rem" },
                width: { xs: "100%", sm: "auto" },
              }}
            >
              Próximo Vídeo
            </Button>
          )}

          {!result.isPassed && canRetryQuiz && (
            <Button
              variant="outlined"
              onClick={onRetry}
              sx={{
                borderColor: "#9041c1",
                color: "#9041c1",
                borderRadius: "12px",
                "&:hover": { borderColor: "#7d37a7", color: "#7d37a7" },
                textTransform: "none",
                fontWeight: 500,
                px: { xs: 2, sm: 4 },
                py: { xs: 0.5, sm: 1.5 },
                fontSize: { xs: "0.8rem", sm: "0.875rem" },
                width: { xs: "100%", sm: "auto" },
              }}
            >
              Refazer Quiz
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
}
