import React, { useEffect, useRef, useState } from "react";
import { Box, IconButton, Tooltip, Typography, Grid, Chip, Avatar } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import QuestionMarkIcon from "@mui/icons-material/QuestionMark";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import logo from "../../../assets/img/codefolio.png";
import { ref, get, set, serverTimestamp } from "firebase/database"; // Adicione estas importações
import { database } from "../../../service/firebase"; // Adicione esta importação

import ErrorBoundary from "./components/ErrorBoundary";
import QuestionDisplay from "./components/QuestionDisplay";
import NavigationButtons from "./components/NavigationButtons";
import QuizSummary from "./components/QuizSummary";
import StudentSelector from "./components/StudentSelector"; // Adicione esta importação
import CustomQuestion from "./components/CustomQuestion";
import { useQuizData } from "./hooks/useQuizData";
import { useStudentData } from "./hooks/useStudentData";
import { useCustomQuestion } from "./hooks/useCustomQuestion"; // Novo hook

const QuizGigi = ({ onClose, quizData, courseId }) => {
  const contentContainerRef = useRef(null);
  const [waitingForNextStudent, setWaitingForNextStudent] = useState(false);
  const [showCustomQuestion, setShowCustomQuestion] = useState(false);

  // Hooks para gerenciar dados
  const {
    enrolledStudents,
    selectedStudent,
    setSelectedStudent,
    loading,
    studentsLoaded,
    filteredStudents,
    searchTerm,
    menuOpen,
    anchorEl,
    sortStudent,
    handleOpenMenu,
    handleCloseMenu,
    handleSelectStudent,
    handleSearchChange,
    handleAbleStudent,
    setMenuOpen, // <-- Adicione esta linha
  } = useStudentData(courseId);

  const {
    quizResults,
    customQuestionResults, // Adicionar resultados de perguntas personalizadas
    courseTitle,
    quizTitle,
    selectedAnswer,
    showFeedback,
    setSelectedAnswer,
    setShowFeedback,
    currentQuestionIndex,
    showSummary,
    setShowSummary,
    currentQuestion,
    handleAnswerSelect,
    isCorrectAnswer,
    handleNextQuestion,
    handlePreviousQuestion,
  } = useQuizData(courseId, quizData, selectedStudent);

  const {
    customResults,
    correctFeedback,
    incorrectFeedback,
    buttonsDisabled,
    handleCustomCorrectAnswer,
    handleCustomIncorrectAnswer,
    processCustomResults
  } = useCustomQuestion(courseId, quizData?.id, selectedStudent);

  // Efeito para sortear aluno automaticamente
  useEffect(() => {
    if (
      studentsLoaded &&
      !loading &&
      !selectedStudent &&
      enrolledStudents.length > 0
    ) {
      sortStudent();
    }
  }, [studentsLoaded, loading, enrolledStudents, selectedStudent]);

  // Configurações de scroll personalizado
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      document.body.style.overflow = originalOverflow || "";
      document.body.style.paddingRight = originalPaddingRight || "";
    };
  }, []);

  useEffect(() => {
    const contentContainer = contentContainerRef.current;
    if (!contentContainer) return;

    const updateScrollbar = () => {
      const { scrollTop, scrollHeight, clientHeight } = contentContainer;
      const scrollRatio = clientHeight / scrollHeight;
      const thumbHeight = Math.max(scrollRatio * clientHeight, 30);
      const thumbTop = (scrollTop / scrollHeight) * clientHeight;

      document.documentElement.style.setProperty(
        "--scrollbar-thumb-height",
        `${thumbHeight}px`
      );
      document.documentElement.style.setProperty(
        "--scrollbar-thumb-top",
        `${thumbTop}px`
      );

      const showScrollbar = scrollHeight > clientHeight;
      document.documentElement.style.setProperty(
        "--scrollbar-opacity",
        showScrollbar ? "1" : "0"
      );
    };

    contentContainer.addEventListener("scroll", updateScrollbar);
    window.addEventListener("resize", updateScrollbar);

    updateScrollbar();

    return () => {
      contentContainer.removeEventListener("scroll", updateScrollbar);
      window.removeEventListener("resize", updateScrollbar);

      document.documentElement.style.removeProperty("--scrollbar-thumb-height");
      document.documentElement.style.removeProperty("--scrollbar-thumb-top");
      document.documentElement.style.removeProperty("--scrollbar-opacity");
    };
  }, []);

  // Efeito para limpeza ao desmontar
  useEffect(() => {
    const cleanupOrphanElements = () => {
      const orphanElements = document.querySelectorAll(
        ".MuiPopover-root:not(.MuiModal-open), .MuiMenu-root:not(.MuiModal-open)"
      );
      orphanElements.forEach((elem) => {
        try {
          elem.parentNode?.removeChild(elem);
        } catch (e) {
          // Silenciar erros
        }
      });
    };

    cleanupOrphanElements();
    const interval = setInterval(cleanupOrphanElements, 3000);

    return () => {
      clearInterval(interval);
      setMenuOpen(false);
      setTimeout(cleanupOrphanElements, 100);
    };
  }, [setMenuOpen]); // Adicione setMenuOpen como dependência

  // Handler para navegação de questões
  const handleNextWithStudentReset = () => {
    const result = handleNextQuestion();
    if (result?.resetStudent) {
      setSelectedStudent(null);

      // Aguarda um momento para o estado ser atualizado antes de sortear
      setTimeout(() => {
        if (enrolledStudents.length > 0) {
          sortStudent();
        }
      }, 100);
    }
  };

  const handlePreviousWithStudentReset = () => {
    const result = handlePreviousQuestion();
    if (result?.resetStudent) {
      setSelectedStudent(null);

      // Aguarda um momento para o estado ser atualizado antes de sortear
      setTimeout(() => {
        if (enrolledStudents.length > 0) {
          sortStudent();
        }
      }, 100);
    }
  };

  const handleAnswerSelectWithReset = async (index) => {
    const result = await handleAnswerSelect(index);

    if (result?.resetStudent) {
      if (result?.autoSelectNext) {
        // Definir estado de espera
        setWaitingForNextStudent(true);

        // Esperar o feedback antes de sortear próximo aluno
        setTimeout(() => {
          if (enrolledStudents.length > 0) {
            sortStudent(); // Sorteia novo estudante
          } else {
            setSelectedStudent(null);
          }
          setWaitingForNextStudent(false);
        }, 2000);
      } else {
        setSelectedStudent(null);
      }
    }
  };

  const handleCustomQuestionClick = () => {
    setShowCustomQuestion(true);
  };

  const handleBackToNormalMode = () => {
    setShowCustomQuestion(false);
    setSelectedAnswer(null);
    setShowFeedback(false);
  };

  const handleCustomCorrect = () => {
    handleCustomCorrectAnswer(() => {
      if (enrolledStudents.length > 0) {
        sortStudent();
      } else {
        setSelectedStudent(null);
      }
    });
  };

  const handleCustomIncorrect = () => {
    handleCustomIncorrectAnswer(() => {
      if (enrolledStudents.length > 0) {
        sortStudent();
      } else {
        setSelectedStudent(null);
      }
    });
  };

  return (
    <ErrorBoundary onClose={onClose}>
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "#700cac",
          backgroundImage: "linear-gradient(135deg, #700cac 0%, #9041c1 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          zIndex: 1399,
          p: { xs: 2, sm: 3 },
          overflow: "hidden",
        }}
      >
        <IconButton
          onClick={onClose}
          sx={{
            position: "absolute",
            top: 20,
            left: 20,
            color: "#fff",
            zIndex: 1400,
            fontSize: "1.3rem",
          }}
        >
          <CloseIcon fontSize="large" />
        </IconButton>

        <Tooltip 
          title={showCustomQuestion ? "Voltar ao modo normal" : "Pergunta Personalizada"} 
          placement="left"
        >
          <IconButton
            onClick={showCustomQuestion ? handleBackToNormalMode : handleCustomQuestionClick}
            sx={{
              position: "absolute",
              top: 20,
              right: { xs: 35, sm: 45, md: 55 },
              color: "#fff",
              zIndex: 1500,
              padding: { xs: "8px", sm: "10px", md: "12px" },
            }}
          >
            {showCustomQuestion ? (
              <QuestionMarkIcon fontSize="large" />
            ) : (
              <AddCircleIcon fontSize="large" />
            )}
          </IconButton>
        </Tooltip>

        <Box
          sx={{
            position: "absolute",
            top: 16,
            display: "flex",
            justifyContent: "center",
            width: "100%",
          }}
        >
          <img src={logo} alt="Codefolio Logo" style={{ height: "50px" }} />
        </Box>

        {currentQuestion && !showSummary && !showCustomQuestion && (
          <NavigationButtons
            currentQuestionIndex={currentQuestionIndex}
            totalQuestions={quizData?.questions?.length || 0}
            onPrevious={handlePreviousWithStudentReset}
            onNext={handleNextWithStudentReset}
            onSummary={() => setShowSummary(true)}
          />
        )}

        <Box
          sx={{
            width: "100%",
            maxWidth: "980px",
            height: "auto",
            maxHeight: "calc(100% - 120px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            mt: 7,
            px: { xs: 2, sm: 3 },
            pl: { xs: 4, sm: 5 },
            pr: { xs: 4, sm: 5 },
            overflowY: "auto",
            overflowX: "hidden",
            position: "relative",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            "&::-webkit-scrollbar": {
              display: "none",
            },
            "&::after": {
              content: '""',
              position: "fixed",
              right: 0,
              top: 0,
              width: "8px",
              height: "100vh",
              backgroundColor: "transparent",
              zIndex: 1500,
              pointerEvents: "none",
            },
            "&:hover::after": {
              backgroundColor: "rgba(255, 255, 255, 0.1)",
            },
            "&::before": {
              content: '""',
              position: "fixed",
              right: 0,
              top: 0,
              width: "8px",
              height: "0",
              backgroundColor: "rgba(255, 255, 255, 0.3)",
              borderRadius: "4px",
              opacity: 0,
              zIndex: 1501,
              transition: "opacity 0.2s",
              pointerEvents: "none",
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.4)",
              },
            },
            "&:hover::before": {
              opacity: 1,
            },
          }}
          id="quiz-content-container"
          ref={contentContainerRef}
        >
          {showCustomQuestion && !showSummary && (
            <Box
              sx={{
                width: "100%",
                mb: 3,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                position: "relative",
              }}
            >
              {/* Sorteador de alunos - Agora vem PRIMEIRO */}
              <StudentSelector
                loading={loading}
                selectedStudent={selectedStudent}
                onSortStudent={sortStudent}
                onOpenMenu={handleOpenMenu}
                menuOpen={menuOpen}
                anchorEl={anchorEl}
                onCloseMenu={handleCloseMenu}
                searchTerm={searchTerm}
                onSearchChange={handleSearchChange}
                filteredStudents={filteredStudents}
                onSelectStudent={handleSelectStudent}
                onAbleStudent={handleAbleStudent}
                enrolledStudents={enrolledStudents}
                waitingForNextStudent={waitingForNextStudent}
              />

              {/* Título da pergunta personalizada */}
              <Typography
                variant="h5"
                component="h2"
                sx={{
                  fontWeight: 600,
                  textAlign: "center",
                  my: 3,
                  color: "white",
                  textShadow: "0px 2px 4px rgba(0,0,0,0.3)",
                }}
              >
                Pergunta personalizada para {selectedStudent?.name || "..."}
              </Typography>

              {/* Botões de acerto e erro */}
              <Grid
                container
                spacing={4}
                justifyContent="center"
                alignItems="center"
                sx={{ mb: 4 }} /* Adicionei margem abaixo dos botões */
              >
                <Grid item xs={6} sm={5} md={5} lg={4}>
                  <Box
                    onClick={!buttonsDisabled ? handleCustomCorrect : undefined}
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      backgroundColor: correctFeedback 
                        ? "rgba(76, 175, 80, 0.5)" 
                        : "rgba(255, 255, 255, 0.15)",
                      borderRadius: "16px",
                      p: 3,
                      cursor: buttonsDisabled ? "default" : "pointer",
                      pointerEvents: buttonsDisabled ? "none" : "auto",
                      transition: "all 0.2s ease",
                      transform: correctFeedback ? "translateY(-10px) scale(1.05)" : "translateY(0) scale(1)",
                      "&:hover": buttonsDisabled 
                        ? {} 
                        : {
                            backgroundColor: correctFeedback 
                              ? "rgba(76, 175, 80, 0.6)"
                              : "rgba(255, 255, 255, 0.25)",
                            transform: correctFeedback 
                              ? "translateY(-10px) scale(1.05)"
                              : "translateY(-5px) scale(1.02)",
                          },
                      boxShadow: correctFeedback 
                        ? "0 8px 16px rgba(76, 175, 80, 0.4)"
                        : "0 4px 8px rgba(0,0,0,0.15)",
                    }}
                  >
                    <CheckCircleIcon
                      sx={{
                        fontSize: { xs: 60, sm: 80, md: 100 },
                        color: correctFeedback ? "#ffffff" : "#4caf50",
                        filter: "drop-shadow(0px 4px 8px rgba(0,0,0,0.3))",
                        transition: "all 0.2s ease",
                      }}
                    />
                    <Typography
                      variant="h5"
                      sx={{
                        mt: 2,
                        fontWeight: 600,
                        color: "white",
                      }}
                    >
                      {correctFeedback ? "ACERTOU!" : "Correto"}
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={6} sm={5} md={5} lg={4}>
                  <Box
                    onClick={!buttonsDisabled ? handleCustomIncorrect : undefined}
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      backgroundColor: incorrectFeedback 
                        ? "rgba(244, 67, 54, 0.5)" 
                        : "rgba(255, 255, 255, 0.15)",
                      borderRadius: "16px",
                      p: 3,
                      cursor: buttonsDisabled ? "default" : "pointer",
                      pointerEvents: buttonsDisabled ? "none" : "auto",
                      transition: "all 0.2s ease",
                      transform: incorrectFeedback ? "translateY(-10px) scale(1.05)" : "translateY(0) scale(1)",
                      "&:hover": buttonsDisabled
                        ? {}
                        : {
                            backgroundColor: incorrectFeedback 
                              ? "rgba(244, 67, 54, 0.6)"
                              : "rgba(255, 255, 255, 0.25)",
                            transform: incorrectFeedback 
                              ? "translateY(-10px) scale(1.05)"
                              : "translateY(-5px) scale(1.02)",
                          },
                      boxShadow: incorrectFeedback 
                        ? "0 8px 16px rgba(244, 67, 54, 0.4)"
                        : "0 4px 8px rgba(0,0,0,0.15)",
                    }}
                  >
                    <CancelIcon
                      sx={{
                        fontSize: { xs: 60, sm: 80, md: 100 },
                        color: incorrectFeedback ? "#ffffff" : "#f44336",
                        filter: "drop-shadow(0px 4px 8px rgba(0,0,0,0.3))",
                        transition: "all 0.2s ease",
                      }}
                    />
                    <Typography
                      variant="h5"
                      sx={{
                        mt: 2,
                        fontWeight: 600,
                        color: "white",
                      }}
                    >
                      {incorrectFeedback ? "ERROU!" : "Incorreto"}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
              
              {/* Lista de alunos que acertaram perguntas personalizadas - AGORA VEM POR ÚLTIMO */}
              <Box 
                sx={{ 
                  width: "100%", 
                  maxWidth: "600px", 
                  mt: 3, // Mudei para margin-top
                  px: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                {/* Só exibir o título e os chips se houver alunos com acertos */}
                {Object.keys(customResults?.correctAnswers || {}).length > 0 && (
                  <>
                    <Box sx={{ 
                      display: "flex", 
                      flexWrap: "wrap", 
                      gap: 0.8, 
                      justifyContent: "center",
                      mb: 2,
                    }}>
                      {processCustomResults(customResults.correctAnswers).map((student, idx) => (
                        <Chip
                          key={idx}
                          size="large"
                          label={`${student.studentName} ${student.count > 1 ? student.count + 'x' : ''}`}
                          avatar={
                            <Avatar src={student.photoURL}>
                              {(student.studentName || "?").charAt(0)}
                            </Avatar>
                          }
                          sx={{
                            backgroundColor: "rgba(76, 175, 80, 0.3)",
                            color: "#fff",
                            fontSize: "1.1rem",
                            mb: 1,
                            "& .MuiChip-label": {
                              fontWeight: student.count > 1 ? 600 : 400
                            }
                          }}
                        />
                      ))}
                    </Box>
                  </>
                )}
              </Box>
            </Box>
          )}

          {currentQuestion && !showSummary && !showCustomQuestion && (
            <QuestionDisplay
              currentQuestion={currentQuestion}
              currentQuestionIndex={currentQuestionIndex}
              totalQuestions={quizData?.questions?.length || 0}
              quizResults={quizResults}
              courseTitle={courseTitle}
              quizTitle={quizTitle}
              loading={loading}
              selectedStudent={selectedStudent}
              onSortStudent={sortStudent}
              onOpenMenu={handleOpenMenu}
              menuOpen={menuOpen}
              anchorEl={anchorEl}
              onCloseMenu={handleCloseMenu}
              searchTerm={searchTerm}
              onSearchChange={handleSearchChange}
              filteredStudents={filteredStudents}
              onSelectStudent={handleSelectStudent}
              onAbleStudent={handleAbleStudent}
              enrolledStudents={enrolledStudents}
              selectedAnswer={selectedAnswer}
              showFeedback={showFeedback}
              onAnswerSelect={handleAnswerSelectWithReset}
              isCorrectAnswer={isCorrectAnswer}
              waitingForNextStudent={waitingForNextStudent} // Passa a nova prop
            />
          )}

          {showSummary && (
            <QuizSummary
              quizData={quizData}
              quizResults={quizResults}
              customQuestionResults={customResults} // Passar os resultados de perguntas personalizadas
              onClose={() => setShowSummary(false)}
            />
          )}
        </Box>
      </Box>
    </ErrorBoundary>
  );
};

export default QuizGigi;
