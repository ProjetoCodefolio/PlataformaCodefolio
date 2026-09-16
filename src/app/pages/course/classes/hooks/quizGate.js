import { toast } from "react-toastify";
import {
  getQuizWindowMessage,
  getQuizAttemptLimit,
  hasUserReachedQuizAttemptLimit,
  isQuizLocked,
} from "$api/services/courses/quizWindow";

/**
 * Porta ÚNICA de entrada no quiz: todo caminho que abre o quiz passa por
 * aqui. Devolve `true` quando o aluno pode entrar; avisa (toast) e devolve
 * `false` quando o vídeo ainda não foi assistido, quando o quiz está fora da
 * janela de disponibilidade (openDate/closeDate) ou quando as tentativas já
 * esgotaram (allowRetry=false → 1; ou maxAttempts).
 *
 * Função pura (sem hooks) para ser testável isoladamente — `useQuizGate`
 * acrescenta por cima só o estado de confirmação (`pendingQuizStart`).
 */
export function canEnterQuizPure({
  quizId,
  contentItems,
  quizSettings,
  userAttempts,
  getQuizResultKey,
}) {
  if (!quizId) return true;
  const quizKey = quizId.includes("/") ? quizId.split("/")[1] : quizId;

  // Assistir o vídeo é a primeira trava, na mesma precedência da lista de
  // conteúdos (que mostra "Quiz Bloqueado" antes de qualquer outro motivo).
  // Slides não têm o que assistir, então passam direto.
  const content = contentItems.find(
    (item) => item && getQuizResultKey(item.id) === quizKey
  );
  if (content && !content.isSlide && isQuizLocked(content)) {
    toast.warn(
      `Você precisa assistir o vídeo "${content.title}" para liberar o quiz!`
    );
    return false;
  }

  // Janela depois: fora dela nem faz sentido falar de tentativas.
  const windowMessage = getQuizWindowMessage(quizSettings[quizKey]);
  if (windowMessage) {
    toast.info(windowMessage);
    return false;
  }

  const attemptLimit = getQuizAttemptLimit(quizSettings[quizKey]);
  if (!hasUserReachedQuizAttemptLimit(userAttempts, quizKey, attemptLimit)) {
    return true;
  }
  toast.info(
    attemptLimit === 1
      ? "Este quiz permite apenas 1 tentativa, que você já utilizou."
      : `Você já atingiu o limite de ${attemptLimit} tentativas para este quiz.`
  );
  return false;
}
