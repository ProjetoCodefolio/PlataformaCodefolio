import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  LinearProgress,
  FormControl,
} from "@mui/material";
import {
  fetchQuizQuestions,
  validateQuizAnswers,
  saveQuizResults,
} from "$api/services/courses/quizzes";
import { useAuth } from "$context/AuthContext";
import SlideshowIcon from "@mui/icons-material/Slideshow";
import { toast } from "react-toastify";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";

const Quiz = ({
  quizId,
  courseId,
  currentVideoId,
  videos,
  onComplete,
  onSubmit,
  onNextVideo,
  userDetails,
  quizSource = "video",
  advancedSettings,
  hasSlide,
  onOpenSlide,
}) => {
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [userAnswers, setUserAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizMinPercentage, setQuizMinPercentage] = useState(70);
  const [result, setResult] = useState(null);
  const { userDetails: authUserDetails } = useAuth();

  useEffect(() => {
    const loadQuiz = async () => {
      try {
        setLoading(true);

        const quizData = await fetchQuizQuestions(quizId);

        if (!quizData) {
          toast.error("Erro ao carregar o quiz. Dados não encontrados.");
          setLoading(false);
          return;
        }

        setQuestions(quizData.questions || []);

        if (
          quizData.minPercentage !== undefined &&
          !isNaN(Number(quizData.minPercentage))
        ) {
          const minPercentage = Number(quizData.minPercentage);
          setQuizMinPercentage(minPercentage);
        } else {
          setQuizMinPercentage(70);
        }
      } catch (error) {
        console.error("Erro ao carregar quiz:", error);
        toast.error("Erro ao carregar o quiz. Tente novamente mais tarde.");
      } finally {
        setLoading(false);
      }
    };

    loadQuiz();
  }, [quizId]);

  const currentQuestion = questions[currentQuestionIndex];

  const handleNext = () => {
    if (selectedOption === null) {
      toast.warn("Por favor, selecione uma opção.");
      return;
    }

    const updatedAnswers = {
      ...userAnswers,
      [currentQuestion.id]: selectedOption,
    };

    setUserAnswers(updatedAnswers);

    if (currentQuestionIndex === questions.length - 1) {
      setTimeout(() => {
        handleSubmitAnswers(updatedAnswers);
      }, 100);
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
    } else {
      handleFinish();
    }
  };

  const handleSubmit = () => {
    if (selectedOption === null) {
      toast.warn("Por favor, selecione uma resposta antes de continuar.");
      return;
    }

    const updatedAnswers = {
      ...userAnswers,
      [currentQuestion.id]: selectedOption,
    };

    setUserAnswers(updatedAnswers);
    handleSubmitAnswers(updatedAnswers);
  };

  const handleSubmitAnswers = async (answersToSubmit) => {
    try {
      setLoading(true);
      const finalAnswers = answersToSubmit || userAnswers;

      let earnedPoints = 0;
      const totalPoints = questions.length;
      const answersDetails = [];

      questions.forEach((question) => {
        const userAnswer = String(finalAnswers[question.id] || "");
        const correctOption = String(question.correctOption);

        const isCorrect = userAnswer === correctOption;

        if (isCorrect) {
          earnedPoints++;
        }

        answersDetails.push({
          questionId: question.id,
          question: question.question,
          options: question.options,
          correctOption: correctOption,
          userOption: userAnswer,
          isCorrect: isCorrect,
        });
      });

      const calculatedPercentage =
        totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;

      const userScore = Number(calculatedPercentage);
      const minRequired = Number(quizMinPercentage);

      const isPassed = userScore >= minRequired;

      setResult({
        isPassed,
        scorePercentage: calculatedPercentage,
        minPercentage: minRequired,
        earnedPoints,
        totalPoints,
        answersDetails,
      });

      setQuizCompleted(true);

      // IMPORTANTE: Obter o userId do contexto de autenticação
      const userId = authUserDetails?.userId || userDetails?.userId;

      // Verificar se temos userId válido
      if (!userId) {
        console.error(
          "Erro: Nenhum ID de usuário disponível para salvar resultados"
        );
        toast.error(
          "Não foi possível salvar seus resultados. Por favor, faça login."
        );
        return;
      }

      // Logs de debug antes de salvar
      console.log("SALVANDO QUIZ COM OS SEGUINTES DADOS:");
      console.log("userId:", userId);
      console.log("courseId:", courseId);
      console.log("videoId:", currentVideoId);
      console.log("isPassed:", isPassed);
      console.log("scorePercentage:", calculatedPercentage);
      console.log("earnedPoints:", earnedPoints);
      console.log("totalPoints:", totalPoints);
      console.log("userAnswers:", finalAnswers);
      console.log("questions:", questions);

      // Garantir que todos os parâmetros obrigatórios sejam passados
      const result = await saveQuizResults(
        userId,
        courseId,
        currentVideoId,
        {
          isPassed,
          scorePercentage: calculatedPercentage,
          earnedPoints,
          totalPoints,
          minPercentage: quizMinPercentage,
        },
        finalAnswers, // Certifique-se de que estamos passando as respostas corretas
        questions
      );

      // Verificar e exibir o resultado
      console.log("RESULTADO DO SALVAMENTO:", result);
      if (!result.success) {
        toast.error(`Falha ao salvar resultados: ${result.error}`);
        return;
      }

      if (isPassed) {
        if (onComplete) {
          await onComplete(true);
        }
      }

      if (onSubmit) {
        await onSubmit(userAnswers, isPassed);
      }
    } catch (error) {
      console.error("❌ ERRO AO SALVAR QUIZ:", error);
      toast.error("Erro ao processar respostas. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const validateAnswers = (questions, userAnswers) => {
    let earnedPoints = 0;
    const totalPoints = questions.length;

    questions.forEach((question) => {
      const userAnswer = userAnswers[question.id];
      if (userAnswer === question.correctOption) {
        earnedPoints++;
      }
    });

    return { earnedPoints, totalPoints };
  };

  const handleRetry = () => {
    setQuizCompleted(false);
    setResult(null);
    setUserAnswers({});
    setCurrentQuestionIndex(0);
    setSelectedOption(null);

    const loadQuizAgain = async () => {
      try {
        setLoading(true);
        const quizData = await fetchQuizQuestions(quizId);

        if (!quizData || !quizData.questions) {
          toast.error("Erro ao recarregar o quiz.");
          return;
        }

        setQuestions(quizData.questions);

        if (quizData.minPercentage !== undefined) {
          setQuizMinPercentage(Number(quizData.minPercentage));
        } else {
          setQuizMinPercentage(70);
        }
      } catch (error) {
        console.error("Erro ao recarregar quiz:", error);
        toast.error("Não foi possível recarregar o quiz.");
      } finally {
        setLoading(false);
      }
    };

    loadQuizAgain();
  };

  const handleFinish = () => {
    if (onComplete) {
      onComplete(result?.isPassed || false, "returnToVideo", currentVideoId);
    }
  };

  const handleNextVideoClick = () => {
    if (onComplete) {
      onComplete(result?.isPassed || false, "nextVideo");
    }
    if (onNextVideo) {
      onNextVideo();
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

  const canRetryQuiz = advancedSettings?.quiz?.allowRetry !== false;
  const shouldShowResults =
    advancedSettings?.quiz?.showResultAfterCompletion !== false;

  const checkHasSlide = (videoId) => {
    if (typeof hasSlide === "function") {
      return hasSlide(videoId);
    }
    return false;
  };

  const videoHasSlide = checkHasSlide(currentVideoId);

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
            {quizMinPercentage === 0
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
              {result.answersDetails?.map((answer, index) => (
                <Box
                  key={answer.questionId}
                  sx={{
                    mb: 4,
                    p: 3,
                    borderRadius: 2,
                    bgcolor: "#f9f9f9",
                    border: `1px solid ${
                      answer.isCorrect ? "#4caf50" : "#f44336"
                    }`,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 1,
                      mb: 2,
                    }}
                  >
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: 600,
                        flex: 1,
                      }}
                    >
                      Questão {index + 1}: {answer.question}
                    </Typography>

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
                  </Box>

                  {/* Apenas mostra a opção que o usuário selecionou e a correta (se forem diferentes) */}
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
                        {String.fromCharCode(
                          65 + parseInt(answer.userOption, 10)
                        )}
                        ) {answer.options[answer.userOption]}
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
                          {answer.isCorrect
                            ? "Resposta correta"
                            : "Sua resposta"}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Mostrar a resposta correta apenas se o usuário errou */}
                    {!answer.isCorrect && (
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
                          {String.fromCharCode(
                            65 + parseInt(answer.correctOption, 10)
                          )}
                          ) {answer.options[answer.correctOption]}
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
                </Box>
              ))}
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

            {result && result.isPassed && hasNextVideo() && (
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
                Próximo Vídeo
              </Button>
            )}

            {!result.isPassed &&
              advancedSettings?.quiz?.allowRetry !== false && (
                <Button
                  variant="outlined"
                  onClick={handleRetry}
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
            wordWrap: "break-word",
            overflowWrap: "break-word",
            hyphens: "auto",
            maxWidth: "100%",
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
            onClick={
              currentQuestionIndex === questions.length - 1
                ? handleSubmit
                : handleNext
            }
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
