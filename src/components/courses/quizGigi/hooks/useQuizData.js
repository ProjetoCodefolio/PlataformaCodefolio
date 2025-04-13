import { useState, useEffect } from "react";
import { ref, get, set, update, serverTimestamp } from "firebase/database";
import { database } from "../../../../service/firebase";

export const useQuizData = (courseId, quizData, selectedStudent) => {
  const [quizResults, setQuizResults] = useState({});
  const [courseTitle, setCourseTitle] = useState("");
  const [quizTitle, setQuizTitle] = useState("");
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [customQuestionResults, setCustomQuestionResults] = useState({
    correctAnswers: {},
    wrongAnswers: {},
  });
  const [courseInfoLoaded, setCourseInfoLoaded] = useState(false);

  // Primeiro, buscar as informações do curso
  useEffect(() => {
    if (courseId) {
      fetchCourseInfo();
    }
  }, [courseId]);

  // Depois de carregar as informações do curso, buscar resultados do quiz
  useEffect(() => {
    if (courseId && quizData?.id && courseInfoLoaded) {
      if (quizData.title) {
        setQuizTitle(quizData.title);
      }

      fetchQuizResults();
    }
  }, [courseId, quizData?.id, courseInfoLoaded]);

  // Adicione este efeito para resetar o feedback quando o estudante muda
  useEffect(() => {
    if (selectedStudent) {
      setSelectedAnswer(null);
      setShowFeedback(false);
    }
  }, [selectedStudent]);

  const fetchCourseInfo = async () => {
    try {
      const courseRef = ref(database, `courses/${courseId}`);
      const courseSnapshot = await get(courseRef);

      if (courseSnapshot.exists()) {
        const courseData = courseSnapshot.val();
        setCourseTitle(courseData.title || "Curso sem título");
      }

      // Marca que as informações do curso foram carregadas
      setCourseInfoLoaded(true);
    } catch (error) {
      console.error("Erro ao buscar informações do curso:", error);
      setCourseInfoLoaded(true); // Mesmo com erro, marca como carregado
    }
  };

  const fetchQuizResults = async () => {
    try {
      if (!courseId || !quizData?.id) {
        return;
      }

      setQuizTitle(quizData.question || "Quiz sem título");
      await initializeQuizData();

      const path = `quizGigi/courses/${courseId}/quizzes/${quizData.id}/results`;
      const resultsRef = ref(database, path);

      const resultsSnapshot = await get(resultsRef);
      if (resultsSnapshot.exists()) {
        const resultsData = resultsSnapshot.val();
        setQuizResults(resultsData);
      } else {
        setQuizResults({});
      }
    } catch (error) {
      console.error("Erro ao buscar resultados do quiz:", error);
    }
  };

  const initializeQuizData = async () => {
    try {
      if (!courseId || !quizData?.id) {
        return false;
      }

      // Se courseTitle ainda estiver vazio, tente buscar diretamente
      let finalCourseTitle = courseTitle;
      if (!finalCourseTitle) {
        try {
          const courseRef = ref(database, `courses/${courseId}`);
          const courseSnapshot = await get(courseRef);
          if (courseSnapshot.exists()) {
            const courseData = courseSnapshot.val();
            finalCourseTitle = courseData.title || "Curso sem título";
            setCourseTitle(finalCourseTitle);
          }
        } catch (e) {
          console.error("Erro ao buscar título do curso novamente:", e);
        }
      }

      const quizRef = ref(
        database,
        `quizGigi/courses/${courseId}/quizzes/${quizData.id}`
      );

      const quizMetadata = {
        id: quizData.id,
        courseId: courseId,
        courseName: finalCourseTitle || "Curso sem título",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (quizData.questions && quizData.questions.length > 0) {
        quizMetadata.questionsData = quizData.questions.map((q, index) => ({
          id: q.id || `question_${index}`,
          text: q.question,
          correctOption: q.correctOption,
        }));
        quizMetadata.totalQuestions = quizData.questions.length;
      }

      const quizSnapshot = await get(quizRef);
      if (!quizSnapshot.exists()) {
        await set(quizRef, quizMetadata);
      } else {
        await update(quizRef, {
          updatedAt: serverTimestamp(),
          courseName: finalCourseTitle || quizMetadata.courseName,
        });
      }

      return true;
    } catch (error) {
      console.error("Erro ao inicializar dados do quiz:", error);
      return false;
    }
  };

  const registerStudentAnswer = async (
    isCorrect,
    selectedOptionIndex,
    isCustomQuestion = false
  ) => {
    const currentQuestion = quizData?.questions?.[currentQuestionIndex];
    if (!selectedStudent || (!currentQuestion && !isCustomQuestion)) {
      return false;
    }

    try {
      const questionId = isCustomQuestion
        ? "custom_question"
        : currentQuestion.id || `question_${currentQuestionIndex}`;

      const resultType = isCorrect ? "correctAnswers" : "wrongAnswers";

      const path = isCustomQuestion
        ? `quizGigi/courses/${courseId}/quizzes/${quizData.id}/customResults/${resultType}/${selectedStudent.userId}`
        : `quizGigi/courses/${courseId}/quizzes/${quizData.id}/results/${questionId}/${resultType}/${selectedStudent.userId}`;

      const answerRef = ref(database, path);

      const answerData = {
        timestamp: serverTimestamp(),
        selectedOption: selectedOptionIndex,
        selectedOptionLetter:
          typeof selectedOptionIndex === "number" && selectedOptionIndex >= 0
            ? String.fromCharCode(65 + selectedOptionIndex)
            : "Personalizada",
        studentName: selectedStudent.name,
        photoURL: selectedStudent.photoURL || null,
        userId: selectedStudent.userId,
        isCorrect: isCorrect,
        isCustomQuestion: isCustomQuestion,
      };

      await set(answerRef, answerData);

      if (isCustomQuestion) {
        setCustomQuestionResults((prev) => {
          const updatedResults = { ...prev };

          if (!updatedResults[resultType]) {
            updatedResults[resultType] = {};
          }

          updatedResults[resultType][selectedStudent.userId] = {
            ...answerData,
            timestamp: Date.now(),
          };

          return updatedResults;
        });
      } else {
        setQuizResults((prev) => {
          const updatedResults = { ...prev };

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
            ...answerData,
            timestamp: Date.now(),
          };

          return updatedResults;
        });
      }

      return true;
    } catch (error) {
      console.error("Erro ao registrar resposta do aluno:", error);
      return false;
    }
  };

  const updateStudentCorrectAnswer = async (correct = true) => {
    if (!selectedStudent || !courseId || !quizData?.id) return;

    try {
      // Caminho para os resultados do quiz ao vivo
      const resultRef = ref(
        database,
        `liveQuizResults/${courseId}/${quizData.id}/${selectedStudent.userId}`
      );

      // Buscar dados atuais
      const snapshot = await get(resultRef);
      const currentData = snapshot.exists() ? snapshot.val() : {};

      // Preparar dados atualizados
      const updatedData = {
        ...currentData,
        correctAnswers: correct
          ? (currentData.correctAnswers || 0) + 1
          : currentData.correctAnswers || 0,
        wrongAnswers: !correct
          ? (currentData.wrongAnswers || 0) + 1
          : currentData.wrongAnswers || 0,
        lastAnswerDate: new Date().toISOString(),
      };

      // Salvar no Firebase
      await set(resultRef, updatedData);
      console.log(
        `Acerto registrado para ${selectedStudent.name} em Live Quiz`
      );
    } catch (error) {
      console.error("Erro ao registrar acerto:", error);
    }
  };

  const handleAnswerSelect = async (index, isCustomQuestion = false) => {
    if (!selectedStudent) {
      alert("Por favor, selecione ou sorteie um aluno primeiro!");
      return;
    }

    setSelectedAnswer(index);
    setShowFeedback(true);

    let isCorrect;

    if (isCustomQuestion) {
      isCorrect = index === 0;
    } else {
      isCorrect = isCorrectAnswer(index);
    }

    try {
      await registerStudentAnswer(isCorrect, index, isCustomQuestion);
      updateStudentCorrectAnswer(isCorrect);

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

  const isCorrectAnswer = (index) => {
    const currentQuestion = quizData?.questions?.[currentQuestionIndex];
    return currentQuestion && index === currentQuestion.correctOption;
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quizData?.questions?.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
      return { resetStudent: true };
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
      return { resetStudent: true };
    }
  };

  const currentQuestion = quizData?.questions?.[currentQuestionIndex];

  return {
    quizResults,
    customQuestionResults,
    courseTitle,
    quizTitle,
    selectedAnswer,
    setSelectedAnswer,
    showFeedback,
    setShowFeedback,
    currentQuestionIndex,
    setCurrentQuestionIndex,
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
