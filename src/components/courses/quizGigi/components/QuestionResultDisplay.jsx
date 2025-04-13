import React from "react";
import { Box, Typography, Chip, Avatar } from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

const QuestionResultDisplay = ({
  currentQuestion,
  quizResults,
  courseTitle,
  quizTitle,
  currentQuestionIndex,
  eyeOpen,
}) => {
  if (!currentQuestion || !quizResults) return null;

  const questionId = currentQuestion.id || `question_${currentQuestionIndex}`;
  const questionResults = quizResults[questionId] || {};
  const correctAnswers = questionResults.correctAnswers || {};
  const hasCorrect = Object.keys(correctAnswers).length > 0;

  // Se não houver acertos OU se o olho estiver fechado, não renderiza nada
  if (!hasCorrect || !eyeOpen) return null;

  // Só renderiza quando há acertos E o olho está aberto
  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "600px",
        mb: 2,
        p: 2,
        borderRadius: 2,
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        backdropFilter: "blur(5px)",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        mx: "auto",
      }}
    >
      <Box>
        <Typography
          variant="subtitle2"
          sx={{
            color: "rgba(255, 255, 255, 0.9)",
            mb: 0.5,
            display: "flex",
            alignItems: "center",
          }}
        >
          <CheckCircleOutlineIcon
            sx={{ fontSize: 18, mr: 0.5, color: "#4caf50" }}
          />
          Resposta correta:{" "}
          {String.fromCharCode(65 + currentQuestion.correctOption)}
        </Typography>

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 1 }}>
          {Object.values(correctAnswers).map((student, idx) => (
            <Chip
              key={idx}
              size="small"
              label={student.studentName}
              avatar={
                <Avatar src={student.photoURL}>
                  {(student.studentName || "?").charAt(0)}
                </Avatar>
              }
              sx={{
                backgroundColor: "rgba(76, 175, 80, 0.3)",
                color: "#fff",
                fontSize: "0.75rem",
              }}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default QuestionResultDisplay;
