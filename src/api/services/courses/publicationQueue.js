// Fila de publicações programadas (`publicationQueue`).
//
// Um índice pequeno do que ainda vai ser publicado, para o cron do Worker do
// Cloudflare avisar a turma na hora certa sem varrer o banco inteiro. Cada
// entrada é uma DÍVIDA DE AVISO: existe enquanto o item não foi anunciado.
//
//   publicationQueue/{courseId}__{kind}__{itemKey}
//     courseId, kind ("content" | "quiz"), itemKey, contentId, source, publishAt
//
// A fila é só um índice. Quem decide se avisa é o Worker, relendo o item na
// hora; por isso uma entrada desatualizada nunca manda aviso errado, no máximo
// atrasa ou se descarta.
//
// Regra de manutenção (`syncPublicationQueue`), chamada depois de toda gravação
// que mexe na data de um conteúdo ou de um quiz, e das exclusões:
//  - item programado: a entrada fica com a data efetiva dele;
//  - item que tinha entrada e passou a estar publicado (o professor clicou em
//    "Publicar agora", antecipou para o passado): a entrada vence AGORA, e o
//    Worker avisa no próximo ciclo, como se o item tivesse sido cadastrado
//    naquele momento;
//  - item publicado sem entrada: nada (já foi avisado no cadastro, ou avisado
//    pelo Worker);
//  - item excluído: a entrada some.

import { ref, get, update } from "firebase/database";
import { database } from "../../config/firebase";
import { effectiveQuizPublishAt, isScheduled, normalizePublishAt, serverNow } from "./publication";

const SOURCE_NODES = {
  content: "courseContent",
  video: "courseVideos",
  slide: "courseSlides",
};

/** Chave da entrada na fila. */
export const queueEntryKey = (courseId, kind, itemKey) => `${courseId}__${kind}__${itemKey}`;

/** Chave do quiz de um conteúdo em courseQuizzes (slide legado usa `slide_`). */
export const quizKeyFor = (contentId, source) =>
  source === "slide" ? `slide_${contentId}` : contentId;

/**
 * Valor da entrada da fila, ou null para removê-la. Puro: recebe o estado do
 * item e da entrada atual.
 *
 * @param {Object} params
 * @param {boolean} params.exists - o item existe
 * @param {string} params.publishAt - data efetiva do item
 * @param {Object|null} params.current - entrada que já está na fila
 * @param {Object} params.base - campos fixos da entrada
 * @param {Date} params.now
 */
export const nextQueueEntry = ({ exists, publishAt, current, base, now }) => {
  if (!exists) return null;
  if (isScheduled(publishAt, now)) return { ...base, publishAt: normalizePublishAt(publishAt) };
  // Publicado. Se ainda devia o aviso, o aviso vence agora.
  return current ? { ...base, publishAt: now.toISOString() } : null;
};

/**
 * Acerta as entradas do conteúdo e do quiz dele depois de uma gravação.
 * Nunca derruba quem chamou: a gravação principal já aconteceu, e uma fila
 * errada só atrasa um aviso. O erro vai para o console.
 *
 * @param {string} courseId
 * @param {{contentId: string, source?: "content"|"video"|"slide"}} target
 */
export const syncPublicationQueue = async (courseId, { contentId, source = "content" }) => {
  if (!courseId || !contentId || !SOURCE_NODES[source]) return;
  try {
    const quizKey = quizKeyFor(contentId, source);
    const contentEntry = queueEntryKey(courseId, "content", contentId);
    const quizEntry = queueEntryKey(courseId, "quiz", quizKey);

    const [contentSnap, quizSnap, contentQueued, quizQueued] = await Promise.all([
      get(ref(database, `${SOURCE_NODES[source]}/${courseId}/${contentId}`)),
      get(ref(database, `courseQuizzes/${courseId}/${quizKey}`)),
      get(ref(database, `publicationQueue/${contentEntry}`)),
      get(ref(database, `publicationQueue/${quizEntry}`)),
    ]);

    const content = contentSnap.val();
    const quiz = quizSnap.val();
    const now = serverNow();
    const base = { courseId, contentId, source };

    await update(ref(database), {
      [`publicationQueue/${contentEntry}`]: nextQueueEntry({
        exists: !!content,
        publishAt: content?.publishAt,
        current: contentQueued.val(),
        base: { ...base, kind: "content", itemKey: contentId },
        now,
      }),
      [`publicationQueue/${quizEntry}`]: nextQueueEntry({
        exists: !!content && !!quiz,
        publishAt: effectiveQuizPublishAt(quiz, content),
        current: quizQueued.val(),
        base: { ...base, kind: "quiz", itemKey: quizKey },
        now,
      }),
    });
  } catch (error) {
    console.error("Erro ao atualizar a fila de publicações:", error);
  }
};

/**
 * Mesma coisa, partindo da chave de um quiz: descobre em que nó está o
 * conteúdo dele. Vídeo de entrega (sala invertida) não tem data de
 * publicação, então não entra na fila.
 *
 * @param {string} courseId
 * @param {string} quizKey - chave em courseQuizzes/{courseId}
 */
export const syncPublicationQueueForQuiz = async (courseId, quizKey) => {
  if (!courseId || !quizKey) return;
  if (quizKey.startsWith("slide_")) {
    return syncPublicationQueue(courseId, { contentId: quizKey.slice(6), source: "slide" });
  }
  try {
    const [novo, legado] = await Promise.all([
      get(ref(database, `courseContent/${courseId}/${quizKey}`)),
      get(ref(database, `courseVideos/${courseId}/${quizKey}`)),
    ]);
    const source = novo.exists() ? "content" : legado.exists() ? "video" : null;
    if (source) await syncPublicationQueue(courseId, { contentId: quizKey, source });
  } catch (error) {
    console.error("Erro ao atualizar a fila de publicações do quiz:", error);
  }
};
