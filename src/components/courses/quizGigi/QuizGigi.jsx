import React, { useEffect, useRef, useState } from "react";
import { Box, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import logo from "../../../assets/img/codefolio.png";

import ErrorBoundary from "./components/ErrorBoundary";
import QuestionDisplay from "./components/QuestionDisplay";
import NavigationButtons from "./components/NavigationButtons";
import QuizSummary from "./components/QuizSummary";
import { useQuizData } from "./hooks/useQuizData";
import { useStudentData } from "./hooks/useStudentData";

const QuizGigi = ({ onClose, quizData, courseId }) => {
  const contentContainerRef = useRef(null);
  const [waitingForNextStudent, setWaitingForNextStudent] = useState(false);

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

        {/* Botões de navegação */}
        {currentQuestion && !showSummary && (
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
          {currentQuestion && !showSummary && (
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
              onClose={() => setShowSummary(false)}
            />
          )}
        </Box>
      </Box>
    </ErrorBoundary>
  );
};

export default QuizGigi;
