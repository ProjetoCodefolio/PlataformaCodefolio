import React from "react";
import { Box, Typography, Chip, Avatar } from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

const QuestionResultDisplay = ({
  currentQuestion,
  quizResults,
  courseTitle,
  quizTitle,
  currentQuestionIndex,
}) => {
  if (!currentQuestion) return null;

  const questionId = currentQuestion.id || `question_${currentQuestionIndex}`;
  const results = quizResults[questionId];

  if (!results) return null;

  const correctAnswers = results.correctAnswers || {};
  const hasCorrect = Object.keys(correctAnswers).length > 0;

  if (!hasCorrect) return null;

  return (
    <Box
      sx={{
        mt: 1,
        mb: 2,
        px: 2,
        py: 1.5,
        borderRadius: 2,
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        border: "1px solid rgba(255, 255, 255, 0.2)",
      }}
    >
      <Typography
        variant="caption"
        sx={{
          display: "block",
          mb: 1,
          color: "rgba(255, 255, 255, 0.7)",
          fontSize: "0.75rem",
        }}
      >
        {`${courseTitle || "Curso"} • ${quizTitle || "Quiz"} • Questão ${
          currentQuestionIndex + 1
        }`}
      </Typography>

      {hasCorrect && (
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
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, ml: 2 }}>
            {Object.values(correctAnswers).map((answer, idx) => (
              <Chip
                key={idx}
                size="small"
                label={answer.student?.name || answer.studentName}
                avatar={
                  <Avatar src={answer.student?.photoURL || answer.photoURL}>
                    {(answer.student?.name || answer.studentName || "?").charAt(
                      0
                    )}
                  </Avatar>
                }
                sx={{
                  backgroundColor: "rgba(76, 175, 80, 0.3)",
                  color: "#fff",
                  fontSize: "0.8rem",
                }}
              />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default QuestionResultDisplay;
