// Aviso à turma do que chega por IMPORTAÇÃO de outro curso.
//
// Regra: importar avisa EXATAMENTE como cadastrar à mão naquele momento.
// Vídeo/slide: só sino. Quiz: sino + e-mail. Item programado (ele ou o
// conteúdo a que o quiz se prende) não avisa agora: a importação já o pôs na
// fila de publicações, e o cron do Worker avisa na data.
//
// Antes não havia aviso nenhum, e o quiz importado aparecia para a turma sem
// sino nem e-mail.

import { get, ref } from "firebase/database";
import { database } from "../../config/firebase";
import { notifyNewContent, notifyNewQuiz } from "../notifications";
import { effectiveQuizPublishAt, isScheduled } from "./publication";

const fetchCourseTitle = async (courseId) => {
  try {
    return (await get(ref(database, `courses/${courseId}/title`))).val() || "";
  } catch {
    return "";
  }
};

/** Os campos do quiz que o aviso usa, como na criação pelo formulário. */
const quizNotice = (quizKey, title, quiz) => ({
  id: quizKey,
  title: title || "Novo quiz",
  openDate: quiz?.openDate,
  closeDate: quiz?.closeDate,
  minPercentage: quiz?.minPercentage,
  isDiagnostic: quiz?.isDiagnostic,
  allowRetry: quiz?.allowRetry,
  maxAttempts: quiz?.maxAttempts,
});

/**
 * Anuncia o conteúdo trazido por `importContentFromCourse`.
 *
 * @param {string} courseId - curso de destino
 * @param {Array<{id: string, title: string, category: string, publishAt?: string, quiz?: Object|null}>} imported
 */
export const announceImportedContent = async (courseId, imported = []) => {
  const publicados = imported.filter((item) => !isScheduled(item.publishAt));
  if (!courseId || publicados.length === 0) return;

  // Quiz trazido junto não tem data própria: aparece quando o conteúdo
  // aparece, então segue a publicação do conteúdo.
  const comQuiz = publicados.filter(
    (item) => item.quiz && !isScheduled(effectiveQuizPublishAt(item.quiz, item))
  );
  const courseTitle = comQuiz.length > 0 ? await fetchCourseTitle(courseId) : "";

  for (const item of publicados) {
    await notifyNewContent(courseId, {
      id: item.id,
      title: item.title,
      category: item.category,
    });
  }
  for (const item of comQuiz) {
    await notifyNewQuiz(courseId, quizNotice(item.id, item.title, item.quiz), courseTitle);
  }
};

/**
 * Anuncia o quiz trazido por `importQuizFromCourse` para um conteúdo que já
 * existe aqui (o conteúdo em si não é novo, então só o quiz é avisado).
 *
 * @param {string} courseId - curso de destino
 * @param {Object} quiz - o quiz gravado (`videoId` é a chave dele)
 * @param {{title?: string, publishAt?: string}} [target] - o conteúdo a que ele se prende
 */
export const announceImportedQuiz = async (courseId, quiz, target = {}) => {
  if (!courseId || !quiz?.videoId) return;
  if (isScheduled(effectiveQuizPublishAt(quiz, target))) return;
  const courseTitle = await fetchCourseTitle(courseId);
  await notifyNewQuiz(courseId, quizNotice(quiz.videoId, target?.title, quiz), courseTitle);
};
