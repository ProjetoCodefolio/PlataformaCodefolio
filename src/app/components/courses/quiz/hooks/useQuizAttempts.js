import { useState } from "react";

/**
 * Contagem de tentativas do quiz: `attemptsUsed` (prop) é capturado uma única
 * vez na montagem e somado às submissões feitas nesta sessão, para saber
 * quando o limite de tentativas é atingido.
 */
export function useQuizAttempts({ attemptsUsed, quizAllowRetry, quizMaxAttempts }) {
  const [baseAttempts] = useState(() => Number(attemptsUsed) || 0);
  const [sessionAttempts, setSessionAttempts] = useState(0);

  const totalAttempts = baseAttempts + sessionAttempts;
  // O aluno pode refazer se o quiz permite repetição E ainda não atingiu o
  // limite de tentativas (quando houver um limite definido).
  const canRetryQuiz =
    quizAllowRetry && (quizMaxAttempts == null || totalAttempts < quizMaxAttempts);

  const registerAttempt = () => setSessionAttempts((prev) => prev + 1);

  return { totalAttempts, sessionAttempts, canRetryQuiz, registerAttempt };
}
