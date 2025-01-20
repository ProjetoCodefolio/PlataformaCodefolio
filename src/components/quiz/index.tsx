import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
} from "@mui/material";
import { fetchQuizQuestions, validateQuizAnswers } from "../../service/courses";
import { useAuth } from "../../context/AuthContext";

const Quiz = ({ quizId, onComplete, courseId }) => {
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
      setUserAnswers((prevAnswers) => {
        const updatedAnswers = {
          ...prevAnswers,
          [currentQuestion.id]: selectedOption,
        };

        if (currentQuestionIndex === questions.length - 1) {
          console.log(
            "Respostas do usuário enviadas para validação:",
            updatedAnswers
          );
          evaluateQuiz(updatedAnswers);
        }

        return updatedAnswers;
      });

      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex((prevIndex) => prevIndex + 1);
        setSelectedOption(null);
      }
    }
  };

  const evaluateQuiz = async (answers) => {
    console.log("Iniciando validação do quiz com respostas:", answers);

    try {
      const { isPassed, scorePercentage, earnedPoints, totalPoints } =
        await validateQuizAnswers(
          answers,
          quizId,
          userDetails.userId,
          userDetails.courseId
        );

      console.log("Resultado da validação:", {
        isPassed,
        scorePercentage,
        earnedPoints,
        totalPoints,
      });

      onComplete(isPassed);
    } catch (error) {
      console.error("Erro ao validar o quiz:", error);
    }
  };

  if (loading) {
    return <Typography>Carregando o quiz...</Typography>;
  }

  if (!currentQuestion) {
    return <Typography>Quiz não encontrado ou sem questões.</Typography>;
  }

  if (quizCompleted) {
    return (
      <Box sx={{ textAlign: "center" }}>
        <Typography variant="h5" sx={{ mb: 2 }}>
          Resultado do Quiz
        </Typography>
        {result ? (
          <>
            <Typography variant="h6">
              Você acertou {result.scorePercentage.toFixed(2)}% das questões!
            </Typography>
            <Typography sx={{ mt: 1 }}>
              {result.isPassed
                ? " Parabéns, você passou!"
                : " Você não passou. Tente novamente!"}
            </Typography>
          </>
        ) : (
          <Typography>Erro ao calcular o resultado.</Typography>
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
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        {`Questão ${currentQuestionIndex + 1} de ${questions.length}`}
      </Typography>
      <Typography variant="body1" sx={{ mt: 2 }}>
        {currentQuestion?.question || "Pergunta indisponível"}
      </Typography>
      <RadioGroup
        value={selectedOption}
        onChange={(e) => setSelectedOption(e.target.value)}
      >
        {currentQuestion?.options?.map((option, index) => (
          <FormControlLabel
            key={index}
            value={option}
            control={<Radio />}
            label={option}
          />
        ))}
      </RadioGroup>
      <Button
        variant="contained"
        color="primary"
        onClick={handleNext}
        sx={{ mt: 2 }}
        disabled={selectedOption === null}
      >
        {currentQuestionIndex === questions.length - 1
          ? "Finalizar Quiz"
          : "Próxima"}
      </Button>
    </Box>
  );
};

export default Quiz;
