import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Chip,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
} from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import MilitaryTechIcon from "@mui/icons-material/MilitaryTech";
import { keyframes } from "@mui/system";

// Animações para o pódio
const fadeIn = keyframes`
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
`;

const bounce = keyframes`
  0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-30px); }
  60% { transform: translateY(-15px); }
`;

const gentlePulse = keyframes`
  0% { transform: scale(1); opacity: 0.9; }
  50% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); opacity: 0.9; }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

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
  const [showSecondPlace, setShowSecondPlace] = useState(false);
  const [showFirstPlace, setShowFirstPlace] = useState(false);
  const [showThirdPlace, setShowThirdPlace] = useState(false);
  const [showList, setShowList] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);

  // Processar os dados dos alunos para formar o ranking
  const processarRankingTotal = () => {
    const contadorAlunos = {};

    // Processar resultados do Live Quiz (questões normais)
    if (quizResults) {
      Object.entries(quizResults).forEach(([questionId, questionData]) => {
        if (questionData && questionData.correctAnswers) {
          Object.entries(questionData.correctAnswers).forEach(
            ([userId, answerData]) => {
              if (!contadorAlunos[userId]) {
                contadorAlunos[userId] = {
                  id: userId,
                  nome:
                    answerData.studentName ||
                    answerData.name ||
                    "Aluno " + userId.slice(0, 5),
                  photoURL: answerData.photoURL || null,
                  avatar: (
                    answerData.studentName ||
                    answerData.name ||
                    "?"
                  ).charAt(0),
                  acertosLive: 1,
                  acertosCustom: 0,
                  acertosTotal: 1,
                };
              } else {
                contadorAlunos[userId].acertosLive += 1;
                contadorAlunos[userId].acertosTotal =
                  contadorAlunos[userId].acertosLive +
                  contadorAlunos[userId].acertosCustom;
              }
            }
          );
        }
      });
    }

    // Processar resultados de perguntas personalizadas
    if (customQuestionResults && customQuestionResults.correctAnswers) {
      Object.entries(customQuestionResults.correctAnswers).forEach(
        ([userId, answers]) => {
          if (typeof answers === "object" && !Array.isArray(answers)) {
            let acertosCustom = 0;
            let nome = null;
            let photoURL = null;

            Object.values(answers).forEach((answer) => {
              acertosCustom++;
              if (!nome && answer.studentName) {
                nome = answer.studentName;
              }
              if (!photoURL && answer.photoURL) {
                photoURL = answer.photoURL;
              }
            });

            if (nome && acertosCustom > 0) {
              if (!contadorAlunos[userId]) {
                contadorAlunos[userId] = {
                  id: userId,
                  nome: nome,
                  photoURL: photoURL,
                  avatar: nome ? nome.charAt(0) : "?",
                  acertosLive: 0,
                  acertosCustom: acertosCustom,
                  acertosTotal: acertosCustom,
                };
              } else {
                contadorAlunos[userId].acertosCustom = acertosCustom;
                contadorAlunos[userId].acertosTotal =
                  contadorAlunos[userId].acertosLive + acertosCustom;
                if (!contadorAlunos[userId].nome && nome) {
                  contadorAlunos[userId].nome = nome;
                }
                if (!contadorAlunos[userId].photoURL && photoURL) {
                  contadorAlunos[userId].photoURL = photoURL;
                }
              }
            }
          }
        }
      );
    }

    // Converter para array e ordenar
    const ranking = Object.values(contadorAlunos).sort(
      (a, b) => b.acertosTotal - a.acertosTotal
    );

    return ranking;
  };

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
        if (typeof answers === "object" && !Array.isArray(answers)) {
          // Para cada resposta do usuário, criar uma entrada única
          Object.entries(answers).forEach(([answerId, answer]) => {
            processedResults[`${userId}-${answerId}`] = answer;
          });
        } else {
          // Caso seja um formato mais simples, usar diretamente
          processedResults[userId] = answers;
        }
      });

      return processedResults;
    }

    return correctAnswers;
  };

  const processedCustomCorrect = processCustomResults(
    customQuestionResults?.correctAnswers
  );
  const hasCustomCorrect = Object.keys(processedCustomCorrect).length > 0;

  // Gerar o ranking completo
  const ranking = processarRankingTotal();
  const podio = ranking.slice(0, 3);

  useEffect(() => {
    if (podio.length > 1) setTimeout(() => setShowSecondPlace(true), 800);
    if (podio.length > 2) setTimeout(() => setShowThirdPlace(true), 1600);
    if (podio.length > 0) setTimeout(() => setShowFirstPlace(true), 2400);
    setTimeout(() => setShowList(true), 3200);
    setTimeout(() => setShowQuestions(true), 4000);
  }, [podio.length]);

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
        <Box />
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

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mb: 3,
          animation: `${bounce} 1.5s ease`,
        }}
      >
        <EmojiEventsIcon
          sx={{
            fontSize: 40,
            color: "#FFD700",
            mr: 1,
            animation: `${gentlePulse} 2s infinite ease-in-out`,
          }}
        />
        <Typography
          variant="h4"
          sx={{
            color: "#fff",
            fontWeight: 600,
            backgroundImage:
              "linear-gradient(90deg, rgba(255,255,255,0.5) 0%, rgba(255,215,0,1) 25%, rgba(255,255,255,0.8) 50%, rgba(255,215,0,1) 75%, rgba(255,255,255,0.5) 100%)",
            backgroundSize: "200% auto",
            color: "transparent",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            animation: `${shimmer} 5s linear infinite`,
          }}
        >
          Ranking do Quiz
        </Typography>
      </Box>

      {ranking.length > 0 ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            mb: 4,
            flexWrap: "wrap",
            position: "relative",
            minHeight: "220px",
          }}
        >
          {/* 2º Lugar */}
          {podio.length > 1 && (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                mx: 2,
                mt: 2,
                opacity: 0,
                animation: showSecondPlace
                  ? `${fadeIn} 0.8s ease forwards`
                  : "none",
              }}
            >
              <Avatar
                src={podio[1].photoURL}
                sx={{
                  width: 70,
                  height: 70,
                  bgcolor: "#C0C0C0",
                  mb: 1,
                  border: "2px solid #C0C0C0",
                  boxShadow: "0 0 15px rgba(192, 192, 192, 0.8)",
                }}
              >
                {podio[1].avatar}
              </Avatar>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: "rgba(192, 192, 192, 0.3)",
                  borderRadius: "12px",
                  px: 2,
                  py: 0.5,
                  backdropFilter: "blur(5px)",
                  maxWidth: "100%",
                }}
              >
                <MilitaryTechIcon sx={{ color: "#C0C0C0", mr: 0.5 }} />
                <Typography
                  variant="body2"
                  sx={{ color: "#fff", fontWeight: 500 }}
                >
                  {podio[1].nome}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: "#C0C0C0", mt: 0.5 }}>
                {podio[1].acertosTotal}{" "}
                {podio[1].acertosTotal === 1 ? "acerto" : "acertos"}
              </Typography>
            </Box>
          )}

          {/* 1º Lugar */}
          {podio.length > 0 && (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                mx: 2,
                zIndex: 1,
                opacity: 0,
                animation: showFirstPlace
                  ? `${fadeIn} 1s ease forwards, ${bounce} 1s ease 1s`
                  : "none",
              }}
            >
              <Avatar
                src={podio[0].photoURL}
                sx={{
                  width: 90,
                  height: 90,
                  bgcolor: "#FFD700",
                  mb: 1,
                  border: "3px solid #FFD700",
                  boxShadow: "0 0 20px rgba(255, 215, 0, 0.9)",
                  animation: `${gentlePulse} 1.5s infinite ease-in-out`,
                }}
              >
                {podio[0].avatar}
              </Avatar>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: "rgba(255, 215, 0, 0.3)",
                  borderRadius: "12px",
                  px: 2,
                  py: 0.5,
                  backdropFilter: "blur(5px)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <MilitaryTechIcon sx={{ color: "#FFD700", mr: 0.5 }} />
                <Typography
                  variant="body1"
                  sx={{ color: "#fff", fontWeight: 600 }}
                >
                  {podio[0].nome}
                </Typography>
              </Box>
              <Typography
                variant="body1"
                sx={{ color: "#FFD700", mt: 0.5, fontWeight: 600 }}
              >
                {podio[0].acertosTotal}{" "}
                {podio[0].acertosTotal === 1 ? "acerto" : "acertos"}
              </Typography>
            </Box>
          )}

          {/* 3º Lugar */}
          {podio.length > 2 && (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                mx: 2,
                mt: 3,
                opacity: 0,
                animation: showThirdPlace
                  ? `${fadeIn} 0.8s ease forwards`
                  : "none",
              }}
            >
              <Avatar
                src={podio[2].photoURL}
                sx={{
                  width: 60,
                  height: 60,
                  bgcolor: "#CD7F32",
                  mb: 1,
                  border: "2px solid #CD7F32",
                }}
              >
                {podio[2].avatar}
              </Avatar>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: "rgba(205, 127, 50, 0.3)",
                  borderRadius: "12px",
                  px: 2,
                  py: 0.5,
                  backdropFilter: "blur(5px)",
                }}
              >
                <MilitaryTechIcon sx={{ color: "#CD7F32", mr: 0.5 }} />
                <Typography
                  variant="body2"
                  sx={{ color: "#fff", fontWeight: 500 }}
                >
                  {podio[2].nome}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: "#CD7F32", mt: 0.5 }}>
                {podio[2].acertosTotal}{" "}
                {podio[2].acertosTotal === 1 ? "acerto" : "acertos"}
              </Typography>
            </Box>
          )}
        </Box>
      ) : (
        <Typography
          variant="body1"
          sx={{ color: "#fff", textAlign: "center", my: 3 }}
        >
          Nenhum aluno acertou perguntas ainda.
        </Typography>
      )}

      {/* Lista completa de participantes */}
      {ranking.length > 0 && (
        <Box
          sx={{
            opacity: showList ? 1 : 0,
            transform: showList ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.8s ease, transform 0.8s ease",
          }}
        >
         
        </Box>
      )}

      <Divider
        sx={{
          my: 3,
          bgcolor: "rgba(255, 255, 255, 0.2)",
          opacity: showQuestions ? 1 : 0,
          transition: "opacity 0.8s ease",
        }}
      />

      <Box
        sx={{
          opacity: showQuestions ? 1 : 0,
          transform: showQuestions ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 0.8s ease, transform 0.8s ease",
        }}
      >

        <ResultSection
          results={processedCustomCorrect}
          answerLabel="Alunos com acertos em perguntas personalizadas"
        />

        {hasCustomCorrect && quizData?.questions?.length > 0 && (
          <Box
            sx={{ my: 3, borderTop: "1px solid rgba(255, 255, 255, 0.2)" }}
          />
        )}

        {quizData?.questions?.map((question, index) => (
          <QuestionSummary
            key={index}
            question={question}
            index={index}
            results={quizResults}
          />
        ))}
      </Box>
    </Box>
  );
};

export default QuizSummary;
