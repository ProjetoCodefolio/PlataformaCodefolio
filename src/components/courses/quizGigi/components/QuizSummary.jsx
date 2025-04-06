import React from "react";
import { Box, Typography, Button, Chip, Avatar } from "@mui/material";

const QuizSummary = ({ quizData, quizResults, onClose }) => {
  return (
    <Box
      sx={{
        width: "100%",
        p: 2,
        borderRadius: 2,
        backgroundColor: "rgba(255, 255, 255, 0.15)",
        border: "1px solid rgba(255, 255, 255, 0.25)",
        mt: 2,
        mb: 4,
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 600, color: "#fff" }}>
          Resumo de Acertos do Quiz
        </Typography>
        <Button
          variant="outlined"
          size="small"
          onClick={onClose}
          sx={{
            color: "#fff",
            borderColor: "rgba(255, 255, 255, 0.5)",
            "&:hover": {
              borderColor: "#fff",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
            },
          }}
        >
          Voltar
        </Button>
      </Box>

      {quizData?.questions?.map((question, index) => {
        const questionId = question.id || `question_${index}`;
        const results = quizResults[questionId] || {};
        const correctAnswers = results?.correctAnswers || {};
        const correctCount = Object.keys(correctAnswers).length;

        return (
          <Box
            key={index}
            sx={{
              mt: 2,
              p: 2,
              borderRadius: 2,
              backgroundColor: "rgba(76, 175, 80, 0.15)",
              border: "1px solid rgba(76, 175, 80, 0.3)",
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                color: "#fff",
              }}
            >
              <span style={{ fontWeight: "bold", marginRight: "8px" }}>
                {index + 1}.
              </span>
              {question.question}
            </Typography>

            {correctCount > 0 && (
              <Box sx={{ display: "flex", alignItems: "center", mt: 1, mb: 1 }}>
                <Typography
                  variant="body2"
                  sx={{
                    backgroundColor: "rgba(76, 175, 80, 0.7)",
                    color: "#fff",
                    px: 1,
                    py: 0.3,
                    borderRadius: 1,
                    fontWeight: 500,
                    fontSize: "0.8rem",
                  }}
                >
                  Resposta: {String.fromCharCode(65 + question.correctOption)}
                </Typography>
              </Box>
            )}

            {correctCount > 0 ? (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 1 }}>
                {Object.values(correctAnswers).map((answer, idx) => (
                  <Chip
                    key={idx}
                    size="small"
                    label={answer.student?.name || answer.studentName}
                    avatar={
                      <Avatar src={answer.student?.photoURL || answer.photoURL}>
                        {(
                          answer.student?.name ||
                          answer.studentName ||
                          "?"
                        ).charAt(0)}
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
            ) : (
              <Typography
                variant="body2"
                sx={{
                  fontStyle: "italic",
                  mt: 1,
                  color: "rgba(255, 255, 255, 0.7)",
                }}
              >
                Nenhum aluno acertou esta questão.
              </Typography>
            )}
          </Box>
        );
      })}
    </Box>
  );
};

export default QuizSummary;
