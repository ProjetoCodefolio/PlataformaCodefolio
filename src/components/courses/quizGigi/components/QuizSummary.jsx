import React from "react";
import { Box, Typography, Button, Chip, Avatar } from "@mui/material";

const ResultSection = ({ title, results, answerLabel }) => {
  const hasResults = results && Object.keys(results).length > 0;

  if (!hasResults) return null;

  // Agrupar resultados por aluno e contar ocorrências
  const studentCounts = {};

  Object.values(results).forEach((answer) => {
    const studentName = answer.student?.name || answer.studentName;
    const studentId = answer.student?.uid || answer.studentId || studentName;

    if (!studentCounts[studentId]) {
      studentCounts[studentId] = {
        name: studentName,
        photoURL: answer.student?.photoURL || answer.photoURL,
        count: 0,
      };
    }

    studentCounts[studentId].count += 1;
  });

  return (
    <Box
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
        {title}
      </Typography>

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
          {answerLabel}
        </Typography>
      </Box>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 1 }}>
        {Object.values(studentCounts).map((student, idx) => (
          <Chip
            key={idx}
            size="small"
            label={`${student.name} ${
              student.count > 1 ? `${student.count}x` : ""
            }`}
            avatar={
              <Avatar src={student.photoURL}>
                {(student.name || "?").charAt(0)}
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
  );
};

const QuestionSummary = ({ question, index, results }) => {
  const questionId = question.id || `question_${index}`;
  const questionResults = results[questionId] || {};
  const correctAnswers = questionResults?.correctAnswers || {};
  const correctCount = Object.keys(correctAnswers).length;

  // Agrupar alunos por ID/nome e contar ocorrências
  const studentCounts = {};

  Object.values(correctAnswers).forEach((answer) => {
    const studentName = answer.student?.name || answer.studentName;
    const studentId = answer.student?.uid || answer.studentId || studentName;

    if (!studentCounts[studentId]) {
      studentCounts[studentId] = {
        name: studentName,
        photoURL: answer.student?.photoURL || answer.photoURL,
        count: 0,
      };
    }

    studentCounts[studentId].count += 1;
  });

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
          {Object.values(studentCounts).map((student, idx) => (
            <Chip
              key={idx}
              size="small"
              label={`${student.name} ${
                student.count > 1 ? `${student.count}x` : ""
              }`}
              avatar={
                <Avatar src={student.photoURL}>
                  {(student.name || "?").charAt(0)}
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
          sx={{ fontStyle: "italic", mt: 1, color: "rgba(255, 255, 255, 0.7)" }}
        >
          Nenhum aluno acertou esta questão.
        </Typography>
      )}
    </Box>
  );
};

const QuizSummary = ({
  quizData,
  quizResults,
  customQuestionResults,
  onClose,
}) => {
  // Processamento de resultados de perguntas personalizadas
  const processCustomResults = (correctAnswers) => {
    if (!correctAnswers) return {};

    // Se tiver estrutura aninhada, processar
    if (
      Object.values(correctAnswers).some(
        (value) => typeof value === "object" && !Array.isArray(value)
      )
    ) {
      const processedResults = {};

      Object.entries(correctAnswers).forEach(([userId, answers]) => {
        Object.entries(answers).forEach(([answerId, answer]) => {
          processedResults[`${userId}-${answerId}`] = answer;
        });
      });

      return processedResults;
    }

    return correctAnswers;
  };

  const processedCustomCorrect = processCustomResults(
    customQuestionResults?.correctAnswers
  );
  const hasCustomCorrect = Object.keys(processedCustomCorrect).length > 0;

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

      {/* Mostrar primeiro os resultados de perguntas personalizadas */}
      <ResultSection
        results={processedCustomCorrect}
        answerLabel="Alunos com acertos em perguntas personalizadas"
      />

      {/* Dividir para separar as seções */}
      {hasCustomCorrect && quizData?.questions?.length > 0 && (
        <Box sx={{ my: 3, borderTop: "1px solid rgba(255, 255, 255, 0.2)" }} />
      )}

      {/* Resultados de perguntas normais */}
      {quizData?.questions?.map((question, index) => (
        <QuestionSummary
          key={index}
          question={question}
          index={index}
          results={quizResults}
        />
      ))}
    </Box>
  );
};

export default QuizSummary;
