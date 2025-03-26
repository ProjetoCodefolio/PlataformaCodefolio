import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  LinearProgress,
} from "@mui/material";
import {
  fetchQuizQuestions,
  validateQuizAnswers,
} from "../../../service/courses";
import { useAuth } from "../../../context/AuthContext";
import { ref, set, get, update } from "firebase/database";
import { database } from "../../../service/firebase";

const Quiz = ({
  quizId,
  courseId,
  currentVideoId,
  videos,
  onComplete,
  onSubmit,
  onNextVideo,
}) => {
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [userAnswers, setUserAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizMinPercentage, setQuizMinPercentage] = useState(0);
  const [result, setResult] = useState(null);
  const { userDetails } = useAuth();

  useEffect(() => {
    const loadQuiz = async () => {
      try {
        const quizData = await fetchQuizQuestions(quizId);
        if (quizData?.questions?.length > 0) {
          setQuestions(quizData.questions);
          setQuizMinPercentage(quizData.minPercentage || 0);
        } else {
          setQuestions([]);
        }
        setLoading(false);
      } catch (error) {
        setQuestions([]);
        setLoading(false);
      }
    };
    loadQuiz();
  }, [quizId]);

  const currentQuestion = questions[currentQuestionIndex];

  const handleNext = () => {
    if (selectedOption === null) {
      return;
    }
    const updatedAnswers = {
      ...userAnswers,
      [currentQuestion.id]: parseInt(selectedOption),
    };
    setUserAnswers(updatedAnswers);

    if (currentQuestionIndex === questions.length - 1) {
      handleSubmit(updatedAnswers);
    } else {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedOption(
        userAnswers[questions[currentQuestionIndex + 1]?.id]?.toString() || null
      );
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
      setSelectedOption(
        userAnswers[questions[currentQuestionIndex - 1]?.id]?.toString() || null
      );
    }
  };

  const handleSubmit = async (answers) => {
    try {
      // const quizMinPercentage =
      //   questions[0]?.minPercentage !== undefined
      //     ? questions[0]?.minPercentage
      //     : 0;

      // Valida as respostas
      const result = await validateQuizAnswers(
        answers,
        quizId,
        quizMinPercentage
      );

      const calculatedPercentage =
        (result.earnedPoints / result.totalPoints) * 100;
      const isPassed = calculatedPercentage >= quizMinPercentage;

      setResult({
        ...result,
        userAnswers: answers,
        isPassed,
        scorePercentage: calculatedPercentage,
        minPercentage: quizMinPercentage,
      });
      setQuizCompleted(true);
      onSubmit(answers);

      // Se o usuário estiver logado, salvar o resultado no banco
      if (userDetails?.userId) {
        const userRef = ref(database, `users/${userDetails.userId}`);
        const userSnapshot = await get(userRef);
        const user = userSnapshot.val();

        // Verificar se já existe um resultado anterior para este quiz
        const quizResultRef = ref(
          database,
          `quizResults/${userDetails.userId}/${courseId}/${currentVideoId}`
        );
        const existingResultSnapshot = await get(quizResultRef);
        const existingResult = existingResultSnapshot.exists()
          ? existingResultSnapshot.val()
          : null;

        // Se já existe um resultado anterior, verificar se a pontuação atual é maior
        if (
          existingResult &&
          (existingResult.scorePercentage > calculatedPercentage ||
            existingResult.correctAnswers > result.earnedPoints)
        ) {
          // Opcional: Apenas incrementa o contador de tentativas
          await update(quizResultRef, {
            attemptCount: (existingResult.attemptCount || 1) + 1,
            lastAttempt: new Date().toISOString(),
          });
        } else {
          // Se não existe resultado anterior ou a pontuação atual é maior, salvar o novo resultado
          const attemptCount = existingResult
            ? (existingResult.attemptCount || 1) + 1
            : 1;

          await set(quizResultRef, {
            name: `${userDetails.firstName} ${userDetails.lastName}`,
            email: user.email,
            scorePercentage: calculatedPercentage,
            correctAnswers: result.earnedPoints,
            totalQuestions: result.totalPoints,
            isPassed,
            minPercentage: quizMinPercentage,
            submittedAt: new Date().toISOString(),
            lastAttempt: new Date().toISOString(),
            attemptCount: attemptCount,
          });
        }
      }
    } catch (error) {
      setQuizCompleted(false);
    }
  };

  const handleRetry = () => {
    setQuizCompleted(false);
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setUserAnswers({});
    setResult(null);
  };

  const handleFinish = () => {
    onComplete(result?.isPassed || false, "returnToVideo", currentVideoId);
  };

  const handleNextVideoClick = () => {
    if (result?.isPassed && hasNextVideo()) {
      onNextVideo();
    } else {
      onComplete(result?.isPassed || false, "complete");
    }
  };

  const hasNextVideo = () => {
    const currentVideoIndex = videos.findIndex((v) => v.id === currentVideoId);
    return currentVideoIndex < videos.length - 1;
  };

  const getRequiredCorrectAnswers = () => {
    if (!result) return "";
    const minPercentage = result.minPercentage;
    return `${minPercentage}%`;
  };

  if (loading)
    return (
      <Typography
        sx={{ textAlign: "center", mt: { xs: 2, sm: 4 }, color: "#666" }}
      >
        Carregando o quiz...
      </Typography>
    );
  if (questions.length === 0)
    return (
      <Box sx={{ textAlign: "center", mt: { xs: 2, sm: 4 } }}>
        <Typography variant="h6" color="error">
          Nenhuma pergunta disponível.
        </Typography>
      </Box>
    );

  if (quizCompleted && result) {
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
            Pontuação: {result.earnedPoints}/{result.totalPoints} (
            {result.scorePercentage.toFixed(2)}%)
          </Typography>
          <Typography
            variant="h5"
            sx={{
              mb: { xs: 2, sm: 3 },
              textAlign: "center",
              color: result.isPassed ? "#4caf50" : "#d32f2f",
              fontWeight: "bold",
              fontSize: { xs: "1.25rem", sm: "1.75rem" },
            }}
          >
            {result.isPassed
              ? "Parabéns, você passou!"
              : `Você não atingiu a nota mínima de ${getRequiredCorrectAnswers()}`}
          </Typography>
          <Box sx={{ mb: { xs: 2, sm: 4 } }}>
            {questions.map((q) => {
              const userAnswer = result.userAnswers[q.id];
              const isCorrect = userAnswer === q.correctOption;
              return (
                <Box
                  key={q.id}
                  sx={{
                    mb: { xs: 1, sm: 3 },
                    p: { xs: 1, sm: 2 },
                    border: "1px solid #e0e0e0",
                    borderRadius: "8px",
                    backgroundColor: isCorrect ? "#e8f5e9" : "#ffebee",
                  }}
                >
                  <Typography
                    variant="body1"
                    sx={{
                      mb: 1,
                      fontWeight: 500,
                      color: "#333",
                      fontSize: { xs: "0.9rem", sm: "1rem" },
                      wordWrap: "break-word",
                      overflowWrap: "break-word",
                      hyphens: "auto",
                      maxWidth: "100%",
                    }}
                  >
                    {q.question}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: isCorrect ? "#4caf50" : "#d32f2f",
                      fontSize: { xs: "0.85rem", sm: "0.875rem" },
                      display: "flex",
                      flexDirection: { xs: "column", sm: "row" },
                      alignItems: { xs: "flex-start", sm: "flex-start" },
                      gap: { xs: 0.5, sm: 1 },
                      width: "100%",
                    }}
                  >
                    <Box
                      component="span"
                      sx={{
                        fontWeight: "bold",
                        flexShrink: 0,
                      }}
                    >
                      Sua resposta:
                    </Box>
                    <Box
                      component="span"
                      sx={{
                        wordWrap: "break-word",
                        overflowWrap: "break-word",
                        whiteSpace: "normal",
                        width: "86%",
                        hyphens: "auto",
                      }}
                    >
                      {q.options[userAnswer] || "Não respondida"}
                    </Box>
                  </Typography>
                  {!isCorrect && (
                    <Typography
                      variant="body2"
                      sx={{
                        color: "#4caf50",
                        fontSize: { xs: "0.85rem", sm: "0.875rem" },
                        mt: 1,
                        display: "flex",
                        flexDirection: { xs: "column", sm: "row" },
                        alignItems: { xs: "flex-start", sm: "flex-start" },
                        gap: { xs: 0.5, sm: 1 },
                        width: "100%",
                      }}
                    >
                      <Box
                        component="span"
                        sx={{
                          fontWeight: "bold",
                          flexShrink: 0,
                        }}
                      >
                        Resposta correta:
                      </Box>
                      <Box
                        component="span"
                        sx={{
                          wordWrap: "break-word",
                          overflowWrap: "break-word",
                          whiteSpace: "normal",
                          width: "100%",
                          hyphens: "auto",
                        }}
                      >
                        {q.options[q.correctOption]}
                      </Box>
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Box>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              justifyContent: "center",
              gap: { xs: 1, sm: 2 },
            }}
          >
            {!result.isPassed && (
              <Button
                variant="contained"
                onClick={handleRetry}
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
                Refazer Quiz
              </Button>
            )}
            <Button
              variant="contained"
              onClick={handleFinish}
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
            {result.isPassed && hasNextVideo() && (
              <Button
                variant="contained"
                onClick={handleNextVideoClick}
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
                Ir para o Próximo Vídeo
              </Button>
            )}
          </Box>
        </Box>
      </Box>
    );
  }

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
            mb: { xs: 1, sm: 2 },
            textAlign: "center",
            color: "#333",
            fontWeight: 600,
            fontSize: { xs: "1.5rem", sm: "2.25rem" },
          }}
        >
          Quiz
        </Typography>
        <Typography
          variant="h6"
          sx={{
            mb: { xs: 1, sm: 3 },
            textAlign: "center",
            color: "#666",
            fontSize: { xs: "1rem", sm: "1.25rem" },
          }}
        >
          {`Questão ${currentQuestionIndex + 1} de ${questions.length}`}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={((currentQuestionIndex + 1) / questions.length) * 100}
          sx={{
            mb: { xs: 2, sm: 4 },
            height: 10,
            borderRadius: 5,
            backgroundColor: "#e0e0e0",
            "& .MuiLinearProgress-bar": {
              backgroundColor: "#9041c1",
              borderRadius: 5,
            },
          }}
        />
        <Typography
          variant="h6"
          sx={{
            mb: { xs: 2, sm: 4 },
            color: "#333",
            fontWeight: 500,
            fontSize: { xs: "1rem", sm: "1.25rem" },
            wordWrap: "break-word", // Adiciona quebra de linha baseada em palavras
            overflowWrap: "break-word", // Suporte adicional para navegadores modernos
            hyphens: "auto", // Adiciona hifenização automática quando necessário
            maxWidth: "100%", // Garante que o texto não ultrapasse seu contêiner
          }}
        >
          {currentQuestion?.question || "Pergunta indisponível"}
        </Typography>
        <RadioGroup
          value={selectedOption}
          onChange={(e) => setSelectedOption(e.target.value)}
          sx={{ mb: { xs: 2, sm: 4 } }}
        >
          {currentQuestion?.options.map((option, index) => (
            <FormControlLabel
              key={index}
              value={index.toString()}
              control={
                <Radio
                  sx={{
                    color: "#9041c1",
                    "&.Mui-checked": { color: "#9041c1" },
                    fontSize: { xs: "0.9rem", sm: "1rem" },
                  }}
                />
              }
              label={
                <Box
                  sx={{
                    wordWrap: "break-word",
                    overflowWrap: "break-word",
                    whiteSpace: "normal",
                    width: "93%",
                  }}
                >
                  {option}
                </Box>
              }
              sx={{
                display: "flex",
                backgroundColor: "#F5F5FA",
                borderRadius: "8px",
                mb: { xs: 0.5, sm: 1 },
                p: { xs: 0.5, sm: 1 },
                width: "100%",
                "&:hover": {
                  backgroundColor: "#f0f0f0",
                },
                "& .MuiFormControlLabel-label": {
                  fontSize: { xs: "0.9rem", sm: "1rem" },
                  width: "100%",
                  display: "flex",
                },
              }}
            />
          ))}
        </RadioGroup>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            gap: { xs: 1, sm: 2 },
          }}
        >
          <Button
            variant="outlined"
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
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
            Voltar
          </Button>
          <Button
            variant="contained"
            onClick={handleNext}
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
            {currentQuestionIndex === questions.length - 1
              ? "Finalizar"
              : "Próxima"}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default Quiz;
