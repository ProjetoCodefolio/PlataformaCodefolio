import { useState, useEffect, useCallback } from "react";

export const useQuizNavigation = (
  quizData,
  handleNextQuestion,
  handlePreviousQuestion,
  setSelectedStudent,
  enrolledStudents,
  sortStudent
) => {
  const [showSummary, setShowSummary] = useState(false);

  // Registra eventos de teclado para navegação
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Evita processamento se estiver editando em um input ou textarea
      if (
        document.activeElement.tagName === "INPUT" ||
        document.activeElement.tagName === "TEXTAREA"
      ) {
        return;
      }

      // Setas para navegação
      if (event.key === "ArrowRight") {
        handleNextWithStudentReset();
      } else if (event.key === "ArrowLeft") {
        handlePreviousWithStudentReset();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleNextQuestion, handlePreviousQuestion]);

  // Função para avançar e resetar aluno se necessário
  const handleNextWithStudentReset = useCallback(() => {
    if (showSummary) return;

    const result = handleNextQuestion();
    if (result?.resetStudent) {
      if (result?.autoSelectNext) {
        // Não redefina selectedStudent imediatamente
        // Espere um pouco e depois sorteie automaticamente
        setTimeout(() => {
          if (enrolledStudents.length > 0) {
            sortStudent();
          } else {
            setSelectedStudent(null);
          }
        }, 100);
      } else {
        setSelectedStudent(null);
      }
    }
  }, [
    showSummary,
    handleNextQuestion,
    setSelectedStudent,
    enrolledStudents,
    sortStudent,
  ]);

  // Função para voltar e resetar aluno se necessário
  const handlePreviousWithStudentReset = useCallback(() => {
    if (showSummary) {
      setShowSummary(false);
      return;
    }

    const result = handlePreviousQuestion();
    if (result?.resetStudent) {
      if (result?.autoSelectNext) {
        // Mesma lógica para navegação para trás
        setTimeout(() => {
          if (enrolledStudents.length > 0) {
            sortStudent();
          } else {
            setSelectedStudent(null);
          }
        }, 100);
      } else {
        setSelectedStudent(null);
      }
    }
  }, [
    showSummary,
    handlePreviousQuestion,
    setSelectedStudent,
    enrolledStudents,
    sortStudent,
  ]);

  // Função para ativar o sumário
  const handleShowSummary = useCallback(() => {
    setShowSummary(true);
  }, []);

  // Função para voltar do sumário
  const handleCloseSummary = useCallback(() => {
    setShowSummary(false);
  }, []);

  return {
    showSummary,
    setShowSummary,
    handleNextWithStudentReset,
    handlePreviousWithStudentReset,
    handleShowSummary,
    handleCloseSummary,
  };
};

export default useQuizNavigation;
