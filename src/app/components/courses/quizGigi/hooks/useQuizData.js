import { useState, useEffect } from "react";
import {
  initializeQuizMetadata,
  fetchQuizResults,
  registerStudentAnswer,
  updateStudentCorrectAnswer,
} from "$api/services/courses/quizGigi";

export const useQuizData = (courseId, quizData, selectedStudent) => {
  const [quizResults, setQuizResults] = useState({});
  const [courseTitle, setCourseTitle] = useState("");
  const [quizTitle, setQuizTitle] = useState("");
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showSummary, setShowSummary] = useState(false);

  // Pergunta atual
  const currentQuestion = quizData?.questions?.[currentQuestionIndex];

  // Efeito para inicializar dados do quiz
  useEffect(() => {
    const initQuiz = async () => {
      if (!quizData || !courseId) return;

      try {
        setCourseTitle(quizData.courseName || "");
        setQuizTitle(quizData.question || "Quiz sem título");

        // Inicializa metadados do quiz usando o serviço
        await initializeQuizMetadata(courseId, quizData, courseTitle);

        // Busca resultados do quiz usando o serviço
        const results = await fetchQuizResults(courseId, quizData.id);
        setQuizResults(results || {});
      } catch (error) {
        console.error("Erro ao inicializar quiz:", error);
      }
    };

    initQuiz();
  }, [quizData, courseId, courseTitle]);

  // Função para registrar resposta do estudante
  const registerStudentAnswer = async (
    isCorrect,
    selectedOption,
    isCustomMode = false
  ) => {
    if (!selectedStudent || !courseId || !quizData?.id) return false;

    try {
      const questionId =
        currentQuestion?.id || `question_${currentQuestionIndex}`;

      // Usa o serviço para registrar resposta
      await registerStudentAnswer(
        courseId,
        quizData.id,
        questionId,
        selectedStudent,
        isCorrect,
        selectedOption,
        isCustomMode
      );

      // Atualiza estado local
      if (!isCustomMode) {
        setQuizResults((prev) => {
          const updatedResults = { ...prev };
          const resultType = isCorrect ? "correctAnswers" : "wrongAnswers";

          if (!updatedResults[questionId]) {
            updatedResults[questionId] = {
              correctAnswers: {},
              wrongAnswers: {},
            };
          }

          if (!updatedResults[questionId][resultType]) {
            updatedResults[questionId][resultType] = {};
          }

          updatedResults[questionId][resultType][selectedStudent.userId] = {
            studentId: selectedStudent.userId,
            studentName: selectedStudent.name,
            photoURL: selectedStudent.photoURL || "",
            selectedOption,
            timestamp: Date.now(),
          };

          return updatedResults;
        });
      }

      return true;
    } catch (error) {
      console.error("Erro ao registrar resposta:", error);
      return false;
    }
  };

  // Função para atualizar contador de acertos do estudante
  const updateStudentCorrectAnswer = async (correct = true) => {
    if (!selectedStudent || !courseId || !quizData?.id) return;

    try {
      // Usa o serviço para atualizar contador
      await updateStudentCorrectAnswer(
        courseId,
        quizData.id,
        selectedStudent,
        correct
      );
    } catch (error) {
      console.error("Erro ao atualizar acertos:", error);
    }
  };

  // Função para selecionar resposta
  const handleAnswerSelect = async (index) => {
    if (showFeedback) return null;
    if (!selectedStudent) {
      alert("Por favor, selecione ou sorteie um aluno primeiro!");
      return;
    }

    setSelectedAnswer(index);
    setShowFeedback(true);

    const isCorrect = isCorrectAnswer(index);

    try {
      await registerStudentAnswer(isCorrect, index, false);
      await updateStudentCorrectAnswer(isCorrect);

      if (!isCorrect) {
        setTimeout(() => {
          setSelectedAnswer(null);
          setShowFeedback(false);
        }, 1900);

        return { resetStudent: true, autoSelectNext: true };
      }
    } catch (error) {
      console.error("Erro ao processar resposta:", error);
    }
  };

  // Função para verificar se a resposta está correta
  const isCorrectAnswer = (index) => {
    return currentQuestion && index === currentQuestion.correctOption;
  };

  // Função para navegar para próxima questão
  const handleNextQuestion = () => {
    if (currentQuestionIndex < (quizData?.questions?.length || 0) - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
      return { resetStudent: true };
    }
    return null;
  };

  // Função para navegar para questão anterior
  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
      return { resetStudent: true };
    }
    return null;
  };

  return {
    quizResults,
    setQuizResults,
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
  };
};

export default useQuizData;
