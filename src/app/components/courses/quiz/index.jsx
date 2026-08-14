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
  TextField,
} from "@mui/material";
import {
  fetchQuizQuestions,
  validateQuizAnswers,
  saveQuizResults,
  normalizeAllowRetry,
  normalizeMaxAttempts,
} from "$api/services/courses/quizzes";
import { useAuth } from "$context/AuthContext";
import SlideshowIcon from "@mui/icons-material/Slideshow";
import { toast } from "react-toastify";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import QuestionImage from "$components/common/QuestionImage";
import { MarkdownView } from "$components/common/MarkdownEditor";

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
  attemptsUsed = 0,
}) => {
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [openEndedAnswer, setOpenEndedAnswer] = useState('');
  const [userAnswers, setUserAnswers] = useState({});
  const [openEndedAnswers, setOpenEndedAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizMinPercentage, setQuizMinPercentage] = useState(70);
  const [result, setResult] = useState(null);
  const { userDetails: authUserDetails } = useAuth();

  // Configuração de tentativas deste quiz (por quiz, vinda do próprio quizData).
  const [quizAllowRetry, setQuizAllowRetry] = useState(true);
  const [quizMaxAttempts, setQuizMaxAttempts] = useState(null);
  // Tentativas já feitas antes desta sessão (capturadas uma vez na montagem)
  // somadas às submissões feitas agora, para saber quando o limite é atingido.
  const [baseAttempts] = useState(() => Number(attemptsUsed) || 0);
  const [sessionAttempts, setSessionAttempts] = useState(0);

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
        setQuizAllowRetry(normalizeAllowRetry(quizData.allowRetry));
        setQuizMaxAttempts(normalizeMaxAttempts(quizData.maxAttempts));

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
  const isOpenEnded = currentQuestion?.questionType === 'open-ended';

  const handleNext = () => {
    if (isOpenEnded) {
      if (!openEndedAnswer.trim()) {
        toast.warn("Por favor, escreva sua resposta.");
        return;
      }
    } else {
      if (selectedOption === null) {
        toast.warn("Por favor, selecione uma opção.");
        return;
      }
    }

    const updatedAnswers = isOpenEnded
      ? { ...openEndedAnswers, [currentQuestion.id]: openEndedAnswer }
      : { ...userAnswers, [currentQuestion.id]: selectedOption };

    if (isOpenEnded) {
      setOpenEndedAnswers(updatedAnswers);
    } else {
      setUserAnswers(updatedAnswers);
    }

    if (currentQuestionIndex === questions.length - 1) {
      setTimeout(() => {
        handleSubmitAnswers(isOpenEnded ? userAnswers : updatedAnswers, isOpenEnded ? updatedAnswers : openEndedAnswers);
      }, 100);
    } else {
      setCurrentQuestionIndex((prev) => prev + 1);
      
      const nextQuestion = questions[currentQuestionIndex + 1];
      if (nextQuestion?.questionType === 'open-ended') {
        setOpenEndedAnswer(openEndedAnswers[nextQuestion.id] || '');
        setSelectedOption(null);
      } else {
        setSelectedOption(userAnswers[nextQuestion.id]?.toString() || null);
        setOpenEndedAnswer('');
      }
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
      
      const prevQuestion = questions[currentQuestionIndex - 1];
      if (prevQuestion?.questionType === 'open-ended') {
        setOpenEndedAnswer(openEndedAnswers[prevQuestion.id] || '');
        setSelectedOption(null);
      } else {
        setSelectedOption(userAnswers[prevQuestion.id]?.toString() || null);
        setOpenEndedAnswer('');
      }
    } else {
      handleFinish();
    }
  };

  const handleSubmit = () => {
    if (isOpenEnded) {
      if (!openEndedAnswer.trim()) {
        toast.warn("Por favor, escreva sua resposta antes de continuar.");
        return;
      }

      const updatedAnswers = {
        ...openEndedAnswers,
        [currentQuestion.id]: openEndedAnswer,
      };

      setOpenEndedAnswers(updatedAnswers);
      handleSubmitAnswers(userAnswers, updatedAnswers);
    } else {
      if (selectedOption === null) {
        toast.warn("Por favor, selecione uma resposta antes de continuar.");
        return;
      }

      const updatedAnswers = {
        ...userAnswers,
        [currentQuestion.id]: selectedOption,
      };

      setUserAnswers(updatedAnswers);
      handleSubmitAnswers(updatedAnswers, openEndedAnswers);
    }
  };

  const handleSubmitAnswers = async (multipleChoiceAnswers, openAnswers) => {
    try {
      setLoading(true);
      const finalMultipleChoiceAnswers = multipleChoiceAnswers || userAnswers;
      const finalOpenEndedAnswers = openAnswers || openEndedAnswers;

      let earnedPoints = 0;
      let totalMultipleChoice = 0;
      const answersDetails = [];

      const userId = authUserDetails?.userId || userDetails?.userId;

      if (!userId) {
        console.error("Erro: Nenhum ID de usuário disponível");
        toast.error("Não foi possível salvar seus resultados. Por favor, faça login.");
        return;
      }

      const quizResultId = quizId?.includes("/") ? quizId.split("/")[1] : quizId;
      const isSlideQuiz = quizSource === "slide" || quizResultId?.startsWith("slide_");

      // Processar questões
      for (const question of questions) {
        if (question.questionType === 'open-ended') {
          // Adicionar resposta aberta aos detalhes (será salva junto com o resultado do quiz)
          const answer = finalOpenEndedAnswers[question.id] || '';
          console.log('📝 Preparando resposta aberta para salvar:', { 
            userId, 
            courseId, 
            quizId, 
            questionId: question.id,
            answerLength: answer.length,
            answerPreview: answer.substring(0, 50) + (answer.length > 50 ? '...' : '')
          });
          
          answersDetails.push({
            questionId: question.id,
            question: question.question,
            questionType: 'open-ended',
            answer: answer,
            isCorrect: null, // Não aplicável para questões abertas
          });
        } else {
          // Processar resposta de múltipla escolha (afeta a nota)
          totalMultipleChoice++;
          const userAnswer = Number(finalMultipleChoiceAnswers[question.id] || 0);
          const correctOption = Number(question.correctOption);
          const isCorrect = userAnswer === correctOption;

          if (isCorrect) {
            earnedPoints++;
          }

          answersDetails.push({
            questionId: question.id,
            question: question.question,
            questionType: 'multiple-choice',
            options: question.options,
            correctOption: correctOption,
            userOption: userAnswer,
            isCorrect: isCorrect,
          });
        }
      }

      // Calcular porcentagem baseada APENAS em questões de múltipla escolha
      const calculatedPercentage =
        totalMultipleChoice > 0 ? (earnedPoints / totalMultipleChoice) * 100 : 100;

      const userScore = Number(calculatedPercentage);
      const minRequired = Number(quizMinPercentage);

      const isPassed = userScore >= minRequired;

      setResult({
        isPassed,
        scorePercentage: calculatedPercentage,
        minPercentage: minRequired,
        earnedPoints,
        totalPoints: totalMultipleChoice,
        hasOpenEnded: Object.keys(finalOpenEndedAnswers).length > 0,
        answersDetails,
      });

      setQuizCompleted(true);

      // Salvar resultados (apenas das questões de múltipla escolha)
      // Filtrar apenas as questões e respostas de múltipla escolha
      const multipleChoiceQuestions = questions.filter(q => q.questionType !== 'open-ended');
      const filteredMultipleChoiceAnswers = {};
      multipleChoiceQuestions.forEach(q => {
        if (finalMultipleChoiceAnswers[q.id] !== undefined) {
          filteredMultipleChoiceAnswers[q.id] = finalMultipleChoiceAnswers[q.id];
        }
      });

      const result = await saveQuizResults(
        userId,
        courseId,
        currentVideoId,
        {
          isPassed,
          scorePercentage: calculatedPercentage,
          earnedPoints,
          totalPoints: totalMultipleChoice,
          minPercentage: quizMinPercentage,
        },
        filteredMultipleChoiceAnswers,
        multipleChoiceQuestions,
        answersDetails, // Passar todas as respostas detalhadas (múltipla escolha + abertas)
        quizResultId,
        isSlideQuiz
      );

      // Verificar e exibir o resultado
      if (!result.success) {
        toast.error(`Falha ao salvar resultados: ${result.error}`);
        return;
      }

      // Cada submissão conta como uma tentativa (independe de passar ou não),
      // acompanhando o incremento feito no banco por saveQuizResults.
      setSessionAttempts((prev) => prev + 1);

      if (isPassed) {
        if (onComplete) {
          await onComplete(true);
        }
      }

      if (onSubmit) {
        await onSubmit(finalMultipleChoiceAnswers, isPassed);
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
    setOpenEndedAnswers({});
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setOpenEndedAnswer('');

    const loadQuizAgain = async () => {
      try {
        setLoading(true);
        const quizData = await fetchQuizQuestions(quizId);

        if (!quizData || !quizData.questions) {
          toast.error("Erro ao recarregar o quiz.");
          return;
        }

        setQuestions(quizData.questions);
        setQuizAllowRetry(normalizeAllowRetry(quizData.allowRetry));
        setQuizMaxAttempts(normalizeMaxAttempts(quizData.maxAttempts));

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

  // Total de tentativas já consumidas (antes desta sessão + submissões atuais).
  const totalAttempts = baseAttempts + sessionAttempts;
  // O aluno pode refazer se o quiz permite repetição E ainda não atingiu o
  // limite de tentativas (quando houver um limite definido).
  const canRetryQuiz =
    quizAllowRetry &&
    (quizMaxAttempts == null || totalAttempts < quizMaxAttempts);
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
              {result.answersDetails?.map((answer, index) => {
                const isOpenEndedQuestion = answer.questionType === 'open-ended';
                
                return (
                  <Box
                    key={answer.questionId}
                    sx={{
                      mb: 4,
                      p: 3,
                      borderRadius: 2,
                      bgcolor: "#f9f9f9",
                      border: `1px solid ${
                        isOpenEndedQuestion ? "#9041c1" : (answer.isCorrect ? "#4caf50" : "#f44336")
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
                          {answer.isCorrect
                            ? "Resposta correta"
                            : "Sua resposta"}
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

            {!result.isPassed && canRetryQuiz && (
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
        {/* O enunciado é markdown: o professor formata negrito, links, listas e
            código. Renderizado pelo mesmo MarkdownView do enunciado do trabalho,
            que sanitiza o HTML — sem isso, um `<script>` digitado na questão
            chegaria ao aluno. */}
        <MarkdownView
          markdown={currentQuestion?.question || "Pergunta indisponível"}
          sx={{
            mb: { xs: 2, sm: 4 },
            color: "#333",
            fontWeight: 500,
            fontSize: { xs: "1rem", sm: "1.25rem" },
            hyphens: "auto",
            maxWidth: "100%",
          }}
        />

        <QuestionImage
          imageUrl={currentQuestion?.imageUrl}
          imageWidth={currentQuestion?.imageWidth}
          imageHeight={currentQuestion?.imageHeight}
        />

        {/* Renderizar campo apropriado baseado no tipo de questão */}
        {isOpenEnded ? (
          <Box sx={{ mb: { xs: 2, sm: 4 } }}>
            <TextField
              multiline
              minRows={6}
              maxRows={20}
              fullWidth
              value={openEndedAnswer}
              onChange={(e) => setOpenEndedAnswer(e.target.value)}
              placeholder="Digite sua resposta aqui..."
              sx={{
                "& .MuiOutlinedInput-root": {
                  "&.Mui-focused fieldset": {
                    borderColor: "#9041c1",
                  },
                },
              }}
            />
          </Box>
        ) : (
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
        )}

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
