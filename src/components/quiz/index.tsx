import React, { useState } from "react";
import {
  Box,
  Button,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

const questions = [
  {
    id: 1,
    question: "O que são algoritmos?",
    options: [
      "Uma linguagem de programação.",
      "Uma lista desordenada que não precisa ter ordem alguma.",
      "Uma sequência de passos / conjunto de regras bem definidas que seguem uma ordem lógica.",
      "Uma sequência de passos que não segue uma lógica específica.",
    ],
    answer: 2,
  },
  {
    id: 2,
    question: "O que é JavaScript?",
    options: [
      "Uma linguagem de estilização.",
      "Uma linguagem de programação voltada para interatividade web.",
      "Uma linguagem para gerenciamento de banco de dados.",
      "Uma linguagem para controle de estoque.",
    ],
    answer: 1,
  },
];

const Quiz = ({ onClose }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [quizFinished, setQuizFinished] = useState(false);
  const [userAnswers, setUserAnswers] = useState(
    Array(questions.length).fill(null)
  );

  const currentQuestion = questions[currentQuestionIndex];

  const handleNext = () => {
    if (selectedOption !== null) {
      const updatedAnswers = [...userAnswers];
      updatedAnswers[currentQuestionIndex] = selectedOption;
      setUserAnswers(updatedAnswers);

      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
        setSelectedOption(null);
      }
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
      setSelectedOption(userAnswers[currentQuestionIndex - 1]);
    }
  };

  const handleFinish = () => {
    const updatedAnswers = [...userAnswers];
    updatedAnswers[currentQuestionIndex] = selectedOption;
    setUserAnswers(updatedAnswers);
    setQuizFinished(true);
  };

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        backgroundColor: "#1c1c1c",
        color: "#fff",
        borderRadius: "8px",
        p: 3,
      }}
    >
      {!quizFinished ? (
        <>
          <Typography
            variant="h6"
            sx={{ mb: 2, fontWeight: "bold", color: "#fff" }}
          >
            {`Questão ${currentQuestionIndex + 1} de ${questions.length}`}
          </Typography>
          <Typography
            variant="h5"
            sx={{ mb: 3, fontWeight: "bold", color: "#fff" }}
          >
            {currentQuestion.question}
          </Typography>

          <RadioGroup
            value={selectedOption}
            onChange={(e) => setSelectedOption(parseInt(e.target.value, 10))}
          >
            {currentQuestion.options.map((option, index) => (
              <FormControlLabel
                key={index}
                value={index}
                control={<Radio sx={{ color: "#fff" }} />}
                label={option}
                sx={{ color: "#aaa" }}
              />
            ))}
          </RadioGroup>

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              mt: 4,
              width: "100%",
              maxWidth: "400px",
            }}
          >
            <Button
              variant="contained"
              color="secondary"
              disabled={currentQuestionIndex === 0}
              onClick={handlePrevious}
            >
              Anterior
            </Button>
            {currentQuestionIndex < questions.length - 1 ? (
              <Button
                variant="contained"
                color="secondary"
                disabled={selectedOption === null}
                onClick={handleNext}
              >
                Próxima
              </Button>
            ) : (
              <Button
                variant="contained"
                color="primary"
                onClick={handleFinish}
              >
                Finalizar Quiz
              </Button>
            )}
          </Box>
        </>
      ) : (
        <>
          <Typography
            variant="h5"
            sx={{ mb: 4, fontWeight: "bold", color: "#fff" }}
          >
            Respostas
          </Typography>
          {questions.map((question, index) => (
            <Accordion
              key={question.id}
              sx={{
                backgroundColor: "#2a2a2a",
                color: "#fff",
                mb: 2,
                borderRadius: "8px",
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon sx={{ color: "#fff" }} />}
              >
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <CheckCircleIcon
                    sx={{
                      color:
                        userAnswers[index] === question.answer
                          ? "#4caf50"
                          : "#f44336",
                      mr: 1,
                    }}
                  />
                  <Typography>{`Questão ${index + 1}`}</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Typography>
                  <strong>Pergunta:</strong> {question.question}
                </Typography>
                <Typography>
                  <strong>Sua resposta:</strong>{" "}
                  {userAnswers[index] !== null
                    ? question.options[userAnswers[index]]
                    : "Não respondida"}
                </Typography>
                <Typography>
                  <strong>Resposta correta:</strong>{" "}
                  {question.options[question.answer]}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}

          <Button
            variant="contained"
            color="secondary"
            sx={{ mt: 4 }}
            onClick={onClose}
          >
            Voltar
          </Button>
        </>
      )}
    </Box>
  );
};

export default Quiz;
