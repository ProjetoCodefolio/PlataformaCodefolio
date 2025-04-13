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
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import KeyboardReturnIcon from "@mui/icons-material/KeyboardReturn";

const AnswerButton = ({ onClick, disabled, isCorrect, feedback, isSelected }) => (
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
          ? "rgba(255, 255, 255, 0.4)"  // Aumentado contraste quando selecionado
          : "rgba(255, 255, 255, 0.15)",
      borderRadius: "16px",
      p: 3,
      cursor: disabled ? "default" : "pointer",
      pointerEvents: disabled ? "none" : "auto",
      transition: "all 0.2s ease",
      filter: feedback ? "brightness(1.2)" : "brightness(1)",
      transform: isSelected 
        ? "scale(1.08)" // Aumentado escala quando selecionado 
        : feedback 
          ? "scale(1.03)" 
          : "scale(1)",
      boxShadow: isSelected 
        ? "0 0 0 3px rgba(255, 255, 255, 0.9), 0 8px 16px rgba(0,0,0,0.3)" // Borda mais pronunciada
        : feedback 
          ? "0 6px 12px rgba(0,0,0,0.2)" 
          : "0 4px 8px rgba(0,0,0,0.1)",
      position: "relative", // Para posicionar os ícones de seta
      outline: isSelected ? "none" : "none", // Sem outline padrão do navegador
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

    {/* Indicadores de teclas quando o botão estiver selecionado */}
    {isSelected && (
      <Box sx={{ 
        position: "absolute", 
        bottom: "8px", 
        width: "100%", 
        display: "flex", 
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.2)",
        borderRadius: "0 0 16px 16px",
        p: 0.5
      }}>
        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.9)", display: "flex", alignItems: "center" }}>
          <KeyboardReturnIcon sx={{ fontSize: 16, mr: 0.5 }} />
          Pressione Enter para confirmar
        </Typography>
      </Box>
    )}
    
    {/* Indicador de seleção à esquerda (apenas se for o botão correto) */}
    {isSelected && isCorrect && (
      <Box sx={{ 
        position: "absolute", 
        left: "-30px",
        top: "50%",
        transform: "translateY(-50%)",
        display: { xs: 'none', md: 'flex' },
        color: "rgba(255,255,255,0.7)"
      }}>
        <KeyboardArrowLeftIcon sx={{ fontSize: 24 }} />
      </Box>
    )}

    {/* Indicador de seleção à direita (apenas se for o botão incorreto) */}
    {isSelected && !isCorrect && (
      <Box sx={{ 
        position: "absolute", 
        right: "-30px",
        top: "50%",
        transform: "translateY(-50%)",
        display: { xs: 'none', md: 'flex' },
        color: "rgba(255,255,255,0.7)"
      }}>
        <KeyboardArrowRightIcon sx={{ fontSize: 24 }} />
      </Box>
    )}
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
          : `${studentName} errou a resposta.`
        }
      </Typography>
    </Paper>
  </Fade>
);

const StudentChips = ({ correctAnswers }) => {
  const hasCorrectAnswers = correctAnswers && Object.keys(correctAnswers).length > 0;
  
  return (
    <Box sx={{ mt: 3, textAlign: "center" }}>
      <Typography variant="subtitle2" sx={{ color: "rgba(255,255,255,0.8)", mb: 1 }}>
        Alunos que acertaram perguntas personalizadas:
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, justifyContent: "center" }}>
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
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.6)", fontStyle: "italic", fontSize: "0.8rem" }}>
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
}) => {
  const showFeedback = correctFeedback || incorrectFeedback;
  const containerRef = useRef(null);
  
  // Estado para controlar qual botão está selecionado
  const [selectedOption, setSelectedOption] = useState(null);
  
  // Reescrevendo para uma abordagem mais simples e direta
  useEffect(() => {
    function keyListener(event) {
      // Debug para ver o que está acontecendo
      console.log("Tecla pressionada:", event.key);
      
      // Verificar condições básicas
      if (!selectedStudent || showFeedback || buttonsDisabled) {
        console.log("Condições não permitem navegação por teclado");
        return;
      }
      
      // Lidar com as teclas
      if (event.key === "ArrowLeft") {
        console.log("Selecionando CORRETO");
        event.preventDefault();
        setSelectedOption("correct");
      } 
      else if (event.key === "ArrowRight") {
        console.log("Selecionando INCORRETO");
        event.preventDefault();
        setSelectedOption("incorrect");
      }
      else if (event.key === "Enter" && selectedOption) {
        console.log("CONFIRMANDO seleção:", selectedOption);
        event.preventDefault();
        
        if (selectedOption === "correct") {
          onCorrect();
        } else if (selectedOption === "incorrect") {
          onIncorrect();
        }
      }
    }
    
    // Adicionar o listener globalmente
    window.addEventListener("keydown", keyListener);
    
    // Remover ao desmontar
    return () => {
      window.removeEventListener("keydown", keyListener);
    };
  }, [selectedStudent, showFeedback, buttonsDisabled, selectedOption, onCorrect, onIncorrect]);
  
  // Resetar seleção quando o estudante muda ou quando tem feedback
  useEffect(() => {
    setSelectedOption(null);
  }, [selectedStudent, showFeedback]);
  
  // Manipuladores de clique para as opções - Simplificados
  const handleCorrectClick = () => {
    if (!selectedStudent || buttonsDisabled) return;
    
    if (selectedOption === "correct") {
      onCorrect();
    } else {
      setSelectedOption("correct");
    }
  };
  
  const handleIncorrectClick = () => {
    if (!selectedStudent || buttonsDisabled) return;
    
    if (selectedOption === "incorrect") {
      onIncorrect();
    } else {
      setSelectedOption("incorrect");
    }
  };
  
  // Verificar se podemos usar teclas
  const canUseKeyboard = selectedStudent && !showFeedback && !buttonsDisabled;
  
  // Resto do componente com pequenas alterações
  return (
    <Box 
      ref={containerRef}
      tabIndex="-1" // Isso remove a necessidade de ter foco visual, mas ainda permite captura de eventos
      sx={{ 
        display: "flex", 
        flexDirection: "column", 
        alignItems: "center", 
        width: "100%", 
        position: "relative",
        outline: "none" // Remove outline ao focar
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

      {/* Indicação de teclas diretamente no card principal */}
      {canUseKeyboard && (
        <Paper
          sx={{
            position: "absolute",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            color: "#fff",
            py: 1,
            px: 2,
            borderRadius: "20px",
            zIndex: 1200,
          }}
        >
          <Typography variant="caption" sx={{ display: "flex", alignItems: "center" }}>
            Use <KeyboardArrowLeftIcon sx={{ mx: 0.5 }} /> <KeyboardArrowRightIcon sx={{ mx: 0.5 }} /> 
            para selecionar e <KeyboardReturnIcon sx={{ mx: 0.5 }} /> para confirmar
          </Typography>
        </Paper>
      )}

      <FeedbackOverlay 
        show={showFeedback} 
        wasCorrect={correctFeedback} 
        studentName={selectedStudent?.name} 
      />

      <Paper
        elevation={3}
        sx={{
          p: 4,
          mt: selectedStudent && !showFeedback ? 0 : 2,
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
            <>Resposta de <span style={{ color: "#ffd54f" }}>{selectedStudent.name}</span></>
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
      
      <StudentChips correctAnswers={customResults?.correctAnswers || {}} />
    </Box>
  );
};

export default CustomQuestion;