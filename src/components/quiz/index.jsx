import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  Paper,
  LinearProgress,
} from "@mui/material";
import {
  fetchQuizQuestions,
  validateQuizAnswers,
  markVideoAsWatched,
} from "../../service/courses";
import { useAuth } from "../../context/AuthContext";

const Quiz = ({ quizId, courseId, currentVideoId, onComplete }) => {
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [userAnswers, setUserAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [result, setResult] = useState(null);
  const { userDetails } = useAuth();

  useEffect(() => {
    const loadQuiz = async () => {
      try {
        const quizQuestions = await fetchQuizQuestions(quizId);
        setQuestions(quizQuestions);
        setLoading(false);
      } catch (error) {
        console.error("Erro ao carregar o quiz:", error);
        setLoading(false);
      }
    };

    loadQuiz();
  }, [quizId]);

  const currentQuestion = questions[currentQuestionIndex];

  const handleNext = () => {
    if (selectedOption !== null) {
      const updatedAnswers = {
        ...userAnswers,
        [currentQuestion.id]: selectedOption,
      };
      setUserAnswers(updatedAnswers);

      if (currentQuestionIndex === questions.length - 1) {
        evaluateQuiz(updatedAnswers);
      } else {
        setCurrentQuestionIndex((prevIndex) => prevIndex + 1);
        setSelectedOption(
          userAnswers[questions[currentQuestionIndex + 1]?.id] || null
        );
      }
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prevIndex) => prevIndex - 1);
      setSelectedOption(
        userAnswers[questions[currentQuestionIndex - 1]?.id] || null
      );
    }
  };

  const evaluateQuiz = async (answers) => {
    try {
      const { isPassed, scorePercentage, earnedPoints, totalPoints } =
        await validateQuizAnswers(
          answers,
          quizId,
          userDetails.userId,
          courseId
        );

      setResult({ isPassed, scorePercentage, earnedPoints, totalPoints });
      setQuizCompleted(true);

      if (isPassed) {
        await markVideoAsWatched(userDetails.userId, courseId, currentVideoId);
        console.log("Quiz aprovado e vídeo marcado como assistido!");
      }

      onComplete(isPassed);
    } catch (error) {
      console.error("Erro ao validar o quiz:", error);
    }
  };

  if (loading) {
    return (
      <Typography sx={{ textAlign: "center", mt: 4 }}>
        Carregando o quiz...
      </Typography>
    );
  }

  if (quizCompleted) {
    return (
      <Box
        sx={{
          textAlign: "center",
          mt: 4,
          padding: 3,
          maxWidth: "500px",
          margin: "auto",
        }}
      >
        <Typography variant="h5" sx={{ mb: 2 }}>
          Resultado do Quiz
        </Typography>
        {result && (
          <>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Pontuação: {result.earnedPoints}/{result.totalPoints}
            </Typography>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Acertos: {result.scorePercentage.toFixed(2)}%
            </Typography>
            <Typography
              sx={{
                mt: 1,
                color: result.isPassed ? "green" : "red",
                fontWeight: "bold",
              }}
            >
              {result.isPassed
                ? "Parabéns, aprovado!"
                : "Reprovado, tente novamente."}
            </Typography>
          </>
        )}
        <Button
          variant="contained"
          color="primary"
          onClick={() => onComplete(result?.isPassed)}
          sx={{ mt: 2 }}
        >
          Continuar
        </Button>
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
        padding: 3,
      }}
    >
      <Paper
        sx={{
          width: "100%",
          maxWidth: "600px",
          padding: 4,
          borderRadius: "8px",
        }}
      >
        <Typography variant="h5" sx={{ mb: 2, textAlign: "center" }}>
          {`Questão ${currentQuestionIndex + 1} de ${questions.length}`}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={((currentQuestionIndex + 1) / questions.length) * 100}
          sx={{ mb: 3 }}
        />
        <Typography variant="body1" sx={{ mb: 4 }}>
          {currentQuestion?.question || "Pergunta indisponível"}
        </Typography>
        <RadioGroup
          value={selectedOption}
          onChange={(e) => setSelectedOption(e.target.value)}
        >
          {Object.entries(currentQuestion?.options || {}).map(
            ([key, option]) => (
              <FormControlLabel
                key={key}
                value={key}
                control={<Radio />}
                label={option}
              />
            )
          )}
        </RadioGroup>
        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 3 }}>
          <Button
            variant="outlined"
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
          >
            Voltar
          </Button>
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={selectedOption === null}
          >
            {currentQuestionIndex === questions.length - 1
              ? "Finalizar"
              : "Próxima"}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default Quiz;
