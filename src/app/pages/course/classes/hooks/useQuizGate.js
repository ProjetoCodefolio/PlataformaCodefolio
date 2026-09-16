import { useState } from "react";
import { getQuizAttemptLimit } from "$api/services/courses/quizWindow";
import { canEnterQuizPure } from "./quizGate";

/**
 * Quizzes com tentativas contadas pedem confirmação antes de abrir: um clique
 * errado não deve custar nada, e o aluno precisa saber quantas tentativas
 * ainda tem. Quizzes ilimitados abrem direto.
 */
export function useQuizGate({ contentItems, quizSettings, userAttempts, getQuizResultKey }) {
  const [pendingQuizStart, setPendingQuizStart] = useState(null);

  const canEnterQuiz = (quizId) =>
    canEnterQuizPure({
      quizId,
      contentItems,
      quizSettings,
      userAttempts,
      getQuizResultKey,
    });

  const requestQuizStart = (quizId, start) => {
    if (!canEnterQuiz(quizId)) return;

    const quizKey = quizId?.includes("/") ? quizId.split("/")[1] : quizId;
    const attemptLimit = getQuizAttemptLimit(quizSettings[quizKey]);
    if (Number.isFinite(attemptLimit)) {
      setPendingQuizStart({
        attemptLimit,
        attemptsUsed: userAttempts[quizKey]?.attemptCount || 0,
        closeDate: quizSettings[quizKey]?.closeDate || null,
        start,
      });
      return;
    }

    start();
  };

  return { canEnterQuiz, requestQuizStart, pendingQuizStart, setPendingQuizStart };
}
