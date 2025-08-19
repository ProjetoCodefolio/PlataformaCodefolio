import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Button,
  Typography,
  Paper,
  Chip,
  Avatar,
  Fade,
  Grow,
  IconButton,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import {
  fetchCustomQuizResults,
  processCustomQuizResults,
} from "$api/services/courses/quizGigi";

const AnswerButton = ({
  onClick,
  disabled,
  isCorrect,
  feedback,
  isSelected,
}) => (
  <Box
    onClick={!disabled ? onClick : undefined}
    sx={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      backgroundColor: feedback
        ? isCorrect
          ? "rgba(76, 175, 80, 0.5)"
          : "rgba(255, 87, 34, 0.5)"
        : isSelected
        ? "rgba(255, 255, 255, 0.4)"
        : "rgba(255, 255, 255, 0.15)",
      borderRadius: "16px",
      p: 3,
      cursor: disabled ? "default" : "pointer",
      pointerEvents: disabled ? "none" : "auto",
      transition: "all 0.2s ease",
      filter: feedback ? "brightness(1.2)" : "brightness(1)",
      transform: isSelected
        ? "scale(1.08)"
        : feedback
        ? "scale(1.03)"
        : "scale(1)",
      boxShadow: isSelected
        ? "0 0 0 3px rgba(255, 255, 255, 0.9), 0 8px 16px rgba(0,0,0,0.3)"
        : feedback
        ? "0 6px 12px rgba(0,0,0,0.2)"
        : "0 4px 8px rgba(0,0,0,0.1)",
      position: "relative",
      outline: "none",
    }}
  >
    {isCorrect ? (
      <CheckIcon sx={{ fontSize: 64, color: "#4caf50", mb: 1 }} />
    ) : (
      <CloseIcon sx={{ fontSize: 64, color: "#ff5722", mb: 1 }} />
    )}
    <Typography
      variant="h6"
      sx={{
        color: "white",
        textAlign: "center",
        fontWeight: 500,
        mt: 1,
      }}
    >
      {isCorrect ? "Resposta Correta" : "Resposta Incorreta"}
    </Typography>
  </Box>
);

const FeedbackOverlay = ({ show, wasCorrect, studentName }) => (
  <Fade in={show}>
    <Paper
      elevation={3}
      sx={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        backgroundColor: wasCorrect
          ? "rgba(76, 175, 80, 0.85)"
          : "rgba(255, 87, 34, 0.85)",
        p: 3,
        borderRadius: 2,
        textAlign: "center",
        zIndex: 10,
        minWidth: 250,
      }}
    >
      <Typography variant="h6" sx={{ color: "#fff", mb: 1, fontWeight: 600 }}>
        {wasCorrect ? "ACERTO!" : "ERRO!"}
      </Typography>
      <Typography variant="body1" sx={{ color: "#fff" }}>
        {wasCorrect
          ? `${studentName} respondeu corretamente!`
          : `${studentName} errou a resposta.`}
      </Typography>
    </Paper>
  </Fade>
);

const StudentChips = ({ correctAnswers, eyeOpen }) => {
  const hasCorrectAnswers =
    correctAnswers && Object.keys(correctAnswers).length > 0;

  if (!eyeOpen) return null;

  return (
    <Box sx={{ mt: 3, textAlign: "center" }}>
      <Typography
        variant="subtitle2"
        sx={{ color: "rgba(255,255,255,0.8)", mb: 1 }}
      >
        Alunos que acertaram perguntas personalizadas:
      </Typography>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 0.5,
          justifyContent: "center",
        }}
      >
        {hasCorrectAnswers ? (
          Object.entries(correctAnswers).map(([userId, answer], idx) => (
            <Chip
              key={`${userId}-${idx}`}
              size="small"
              label={answer.studentName}
              avatar={
                <Avatar src={answer.photoURL}>
                  {(answer.studentName || "?").charAt(0)}
                </Avatar>
              }
              sx={{
                backgroundColor: "rgba(76, 175, 80, 0.3)",
                color: "#fff",
                fontSize: "0.75rem",
              }}
            />
          ))
        ) : (
          <Typography
            variant="body2"
            sx={{
              color: "rgba(255,255,255,0.6)",
              fontStyle: "italic",
              fontSize: "0.8rem",
            }}
          >
            Nenhum aluno acertou ainda.
          </Typography>
        )}
      </Box>
    </Box>
  );
};

const CustomQuestion = ({
  onCorrect,
  onIncorrect,
  onBack,
  selectedStudent,
  correctFeedback,
  incorrectFeedback,
  buttonsDisabled,
  customResults,
  eyeOpen,
  onEyeToggle,
  courseId,
  quizId,
}) => {
  const showFeedback = correctFeedback || incorrectFeedback;
  const [selectedOption, setSelectedOption] = useState(null);
  const [results, setResults] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    // Usando o serviço
    const loadResults = async () => {
      if (!courseId || !quizId) return;

      try {
        const data = await fetchCustomQuizResults(courseId, quizId);
        setResults(data);
      } catch (error) {
        console.error("Erro ao carregar resultados:", error);
      }
    };

    loadResults();
  }, [courseId, quizId]);

  const canUseControls = selectedStudent && !showFeedback && !buttonsDisabled;

  const handleCorrectClick = () => {
    setSelectedOption("correct");
    onCorrect();
  };

  const handleIncorrectClick = () => {
    setSelectedOption("incorrect");
    onIncorrect();
  };

  const toggleEye = () => {
    if (onEyeToggle) {
      onEyeToggle(!eyeOpen);
    }
  };

  return (
    <Box
      ref={containerRef}
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        position: "relative",
        padding: 2,
      }}
    >
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={onBack}
        sx={{
          position: "absolute",
          top: 0,
          right: 0,
          color: "rgba(255,255,255,0.8)",
          textTransform: "none",
          "&:hover": { backgroundColor: "rgba(255,255,255,0.1)" },
        }}
      >
        Voltar ao Quiz
      </Button>

      <Box
        sx={{
          width: "100%",
          mt: 5,
          mb: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <Box sx={{ flexGrow: 1, maxWidth: "calc(100% - 50px)" }}>
          {/* Área onde o StudentSelector seria renderizado */}
        </Box>

        <IconButton
          onClick={toggleEye}
          sx={{
            ml: 1,
            color: "white",
            "&:hover": { backgroundColor: "rgba(255,255,255,0.1)" },
          }}
        >
          {eyeOpen ? (
            <VisibilityIcon fontSize="medium" />
          ) : (
            <VisibilityOffIcon fontSize="medium" />
          )}
        </IconButton>
      </Box>

      <FeedbackOverlay
        show={showFeedback}
        wasCorrect={correctFeedback}
        studentName={selectedStudent?.name}
      />

      <Paper
        elevation={3}
        sx={{
          p: 4,
          mt: 2,
          borderRadius: 2,
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Typography variant="h5" sx={{ mb: 3, color: "#fff", fontWeight: 600 }}>
          {selectedStudent ? (
            <>
              Resposta de{" "}
              <span style={{ color: "#ffd54f" }}>{selectedStudent.name}</span>
            </>
          ) : (
            "Selecione um aluno primeiro"
          )}
        </Typography>

        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            gap: 3,
            mt: 2,
            position: "relative",
            zIndex: 1,
          }}
        >
          <Grow in={!showFeedback}>
            <Box>
              <AnswerButton
                onClick={handleCorrectClick}
                disabled={!selectedStudent || buttonsDisabled}
                isCorrect={true}
                feedback={correctFeedback}
                isSelected={selectedOption === "correct"}
              />
            </Box>
          </Grow>

          <Grow in={!showFeedback}>
            <Box>
              <AnswerButton
                onClick={handleIncorrectClick}
                disabled={!selectedStudent || buttonsDisabled}
                isCorrect={false}
                feedback={incorrectFeedback}
                isSelected={selectedOption === "incorrect"}
              />
            </Box>
          </Grow>
        </Box>
      </Paper>

      <StudentChips
        correctAnswers={customResults?.correctAnswers || {}}
        eyeOpen={eyeOpen}
      />
    </Box>
  );
};

export default CustomQuestion;
