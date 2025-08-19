import { useState, useEffect } from "react";
import {
  registerStudentAnswer,
  updateStudentCorrectAnswer,
  fetchCustomQuizResults,
} from "$api/services/courses/quizGigi";

export const useCustomQuestion = (courseId, quizId, selectedStudent) => {
  const [customResults, setCustomResults] = useState(null);
  const [correctFeedback, setCorrectFeedback] = useState(false);
  const [incorrectFeedback, setIncorrectFeedback] = useState(false);
  const [buttonsDisabled, setButtonsDisabled] = useState(false);

  // Carregar resultados do quiz personalizado
  useEffect(() => {
    const loadCustomResults = async () => {
      if (!courseId || !quizId) return;

      try {
        // Usa o serviço para buscar resultados
        const results = await fetchCustomQuizResults(courseId, quizId);
        setCustomResults(results);
      } catch (error) {
        console.error("Erro ao carregar resultados personalizados:", error);
      }
    };

    loadCustomResults();
  }, [courseId, quizId]);

  // Função para processar resultados personalizados
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

  // Função para lidar com resposta correta personalizada
  const handleCustomCorrectAnswer = async (callback) => {
    if (!selectedStudent || !courseId || !quizId) {
      alert("Por favor, selecione ou sorteie um aluno primeiro!");
      return;
    }

    setCorrectFeedback(true);
    setButtonsDisabled(true);

    try {
      // Gerar ID único para a questão personalizada
      const customQuestionId = `custom_${Date.now()}`;

      // Registrar resposta usando o serviço
      await registerStudentAnswer(
        courseId,
        quizId,
        customQuestionId,
        selectedStudent,
        true,
        0,
        true
      );

      // Atualizar contador de acertos
      await updateStudentCorrectAnswer(courseId, quizId, selectedStudent, true);

      // Atualizar estado local
      setCustomResults((prev) => {
        const currentResults = prev || { correctAnswers: {} };
        const correctAnswers = { ...(currentResults.correctAnswers || {}) };

        if (!correctAnswers[selectedStudent.userId]) {
          correctAnswers[selectedStudent.userId] = {};
        }

        correctAnswers[selectedStudent.userId][customQuestionId] = {
          studentId: selectedStudent.userId,
          studentName: selectedStudent.name,
          photoURL: selectedStudent.photoURL || "",
          timestamp: Date.now(),
        };

        return {
          ...currentResults,
          correctAnswers,
        };
      });

      // Mostrar feedback e resetar
      setTimeout(() => {
        setCorrectFeedback(false);
        setButtonsDisabled(false);
        if (callback) callback();
      }, 1500);
    } catch (error) {
      console.error("Erro ao processar resposta correta personalizada:", error);
      setCorrectFeedback(false);
      setButtonsDisabled(false);
    }
  };

  // Função para lidar com resposta incorreta personalizada
  const handleCustomIncorrectAnswer = async () => {
    if (!selectedStudent) {
      alert("Por favor, selecione ou sorteie um aluno primeiro!");
      return;
    }

    setIncorrectFeedback(true);
    setButtonsDisabled(true);

    setTimeout(() => {
      setIncorrectFeedback(false);
      setButtonsDisabled(false);
    }, 1500);
  };

  return {
    customResults,
    correctFeedback,
    incorrectFeedback,
    buttonsDisabled,
    handleCustomCorrectAnswer,
    handleCustomIncorrectAnswer,
    processCustomResults,
  };
};

export default useCustomQuestion;
