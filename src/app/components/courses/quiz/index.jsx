import {
  Box,
  Button,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  LinearProgress,
  TextField,
} from "@mui/material";
import { useAuth } from "$context/AuthContext";
import { toast } from "react-toastify";
import QuestionImage from "$components/common/QuestionImage";
import { MarkdownView } from "$components/common/MarkdownEditor";
import { useQuizQuestions } from "./hooks/useQuizQuestions";
import { useQuizAttempts } from "./hooks/useQuizAttempts";
import { useQuizNavigation } from "./hooks/useQuizNavigation";
import { useQuizSubmission } from "./hooks/useQuizSubmission";
import QuizResultScreen from "./QuizResultScreen";

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
  attemptsUsed = 0,
}) => {
  const { userDetails: authUserDetails } = useAuth();
  const userId = authUserDetails?.userId || userDetails?.userId;

  const {
    questions,
    loading: loadingQuestions,
    quizAllowRetry,
    quizMaxAttempts,
    quizMinPercentage,
    reload,
  } = useQuizQuestions(quizId);

  const { canRetryQuiz, registerAttempt } = useQuizAttempts({
    attemptsUsed,
    quizAllowRetry,
    quizMaxAttempts,
  });

  const navigation = useQuizNavigation(questions);

  const { submitting, quizCompleted, result, submitAnswers, resetSubmission } =
    useQuizSubmission({
      quizId,
      courseId,
      currentVideoId,
      quizSource,
      quizMinPercentage,
      userId,
      onAttemptRegistered: registerAttempt,
      onComplete,
      onSubmit,
    });

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

  const handleRetry = () => {
    resetSubmission();
    navigation.resetNavigation();
    reload({ isRetry: true });
  };

  const handleNext = () => {
    if (navigation.isOpenEnded) {
      if (!navigation.openEndedAnswer.trim()) {
        toast.warn("Por favor, escreva sua resposta.");
        return;
      }
    } else if (navigation.selectedOption === null) {
      toast.warn("Por favor, selecione uma opção.");
      return;
    }

    const { userAnswers, openEndedAnswers } = navigation.recordCurrentAnswer();

    if (navigation.currentQuestionIndex === questions.length - 1) {
      setTimeout(() => {
        submitAnswers(questions, userAnswers, openEndedAnswers);
      }, 100);
    } else {
      navigation.goToNextQuestion();
    }
  };

  const handlePrevious = () => {
    if (navigation.currentQuestionIndex > 0) {
      navigation.goToPreviousQuestion();
    } else {
      handleFinish();
    }
  };

  const handleSubmit = () => {
    if (navigation.isOpenEnded) {
      if (!navigation.openEndedAnswer.trim()) {
        toast.warn("Por favor, escreva sua resposta antes de continuar.");
        return;
      }
    } else if (navigation.selectedOption === null) {
      toast.warn("Por favor, selecione uma resposta antes de continuar.");
      return;
    }

    const { userAnswers, openEndedAnswers } = navigation.recordCurrentAnswer();
    submitAnswers(questions, userAnswers, openEndedAnswers);
  };

  const hasNextVideo = () => {
    const currentVideoIndex = videos.findIndex((v) => v.id === currentVideoId);
    return currentVideoIndex < videos.length - 1;
  };

  const shouldShowResults =
    advancedSettings?.quiz?.showResultAfterCompletion !== false;

  // O texto de "carregando" cobre tanto a busca das questões (montagem/refazer)
  // quanto a submissão em si: sem isso, a tela de resultado piscaria vazia
  // enquanto saveQuizResults ainda está em voo.
  const loading = loadingQuestions || submitting;

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
      <QuizResultScreen
        result={result}
        quizMinPercentage={quizMinPercentage}
        canRetryQuiz={canRetryQuiz}
        shouldShowResults={shouldShowResults}
        canGoNextVideo={hasNextVideo()}
        onFinish={handleFinish}
        onNextVideo={handleNextVideoClick}
        onRetry={handleRetry}
      />
    );
  }

  const { currentQuestion, currentQuestionIndex, isOpenEnded, selectedOption, setSelectedOption, openEndedAnswer, setOpenEndedAnswer } =
    navigation;

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
