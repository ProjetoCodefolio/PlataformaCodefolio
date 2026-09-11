import { useState } from "react";

/**
 * Índice da questão atual e as respostas dadas até aqui. `recordCurrentAnswer`
 * grava a resposta da questão exibida no momento (múltipla escolha OU
 * dissertativa, nunca as duas) e devolve os dois mapas de resposta já
 * atualizados, prontos para envio a `useQuizSubmission`.
 */
export function useQuizNavigation(questions) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [openEndedAnswer, setOpenEndedAnswer] = useState("");
  const [userAnswers, setUserAnswers] = useState({});
  const [openEndedAnswers, setOpenEndedAnswers] = useState({});

  const currentQuestion = questions[currentQuestionIndex];
  const isOpenEnded = currentQuestion?.questionType === "open-ended";

  const syncFieldsFor = (question) => {
    if (question?.questionType === "open-ended") {
      setOpenEndedAnswer(openEndedAnswers[question.id] || "");
      setSelectedOption(null);
    } else {
      setSelectedOption(userAnswers[question?.id]?.toString() || null);
      setOpenEndedAnswer("");
    }
  };

  const recordCurrentAnswer = () => {
    if (isOpenEnded) {
      const updated = { ...openEndedAnswers, [currentQuestion.id]: openEndedAnswer };
      setOpenEndedAnswers(updated);
      return { userAnswers, openEndedAnswers: updated };
    }
    const updated = { ...userAnswers, [currentQuestion.id]: selectedOption };
    setUserAnswers(updated);
    return { userAnswers: updated, openEndedAnswers };
  };

  const goToNextQuestion = () => {
    const nextIndex = currentQuestionIndex + 1;
    setCurrentQuestionIndex(nextIndex);
    syncFieldsFor(questions[nextIndex]);
  };

  const goToPreviousQuestion = () => {
    const prevIndex = currentQuestionIndex - 1;
    setCurrentQuestionIndex(prevIndex);
    syncFieldsFor(questions[prevIndex]);
  };

  const resetNavigation = () => {
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setOpenEndedAnswer("");
    setUserAnswers({});
    setOpenEndedAnswers({});
  };

  return {
    currentQuestionIndex,
    selectedOption,
    setSelectedOption,
    openEndedAnswer,
    setOpenEndedAnswer,
    userAnswers,
    openEndedAnswers,
    currentQuestion,
    isOpenEnded,
    recordCurrentAnswer,
    goToNextQuestion,
    goToPreviousQuestion,
    resetNavigation,
  };
}
