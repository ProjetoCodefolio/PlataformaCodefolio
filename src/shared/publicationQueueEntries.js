// Forma das entradas da fila de publicações (`publicationQueue`), sem
// Firebase: usada pelo app (publicationQueue.js, a cada gravação) e pelo
// script que preenche a fila com o que já estava programado
// (scripts/backfillPublicationQueue.mjs).

import { effectiveQuizPublishAt, isScheduledAt, normalizePublishAt } from "./publicationDates.js";

/** Chave da entrada na fila. Começa pelo courseId (a regra do banco exige). */
export const queueEntryKey = (courseId, kind, itemKey) => `${courseId}__${kind}__${itemKey}`;

/** Chave do quiz de um conteúdo em courseQuizzes (slide legado usa `slide_`). */
export const quizKeyFor = (contentId, source) =>
  source === "slide" ? `slide_${contentId}` : contentId;

/**
 * Valor da entrada da fila, ou null para removê-la.
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
  if (isScheduledAt(publishAt, now)) return { ...base, publishAt: normalizePublishAt(publishAt) };
  // Publicado. Se ainda devia o aviso, o aviso vence agora.
  return current ? { ...base, publishAt: now.toISOString() } : null;
};

const SOURCES = [
  ["content", "courseContent"],
  ["video", "courseVideos"],
  ["slide", "courseSlides"],
];

/**
 * Todas as entradas que a fila DEVERIA ter para o que está programado no
 * banco agora: cada conteúdo com data futura e cada quiz cuja data efetiva
 * (a maior entre a dele e a do conteúdo) é futura.
 *
 * @param {Object} nodes - os nós inteiros: { courseContent, courseVideos, courseSlides, courseQuizzes }
 * @param {Date} now
 * @returns {Object<string, Object>} chave → entrada
 */
export const buildQueueEntriesFromNodes = (nodes, now) => {
  const entradas = {};
  const quizzesDe = (courseId) => nodes.courseQuizzes?.[courseId] || {};

  for (const [source, node] of SOURCES) {
    for (const [courseId, itens] of Object.entries(nodes[node] || {})) {
      for (const [contentId, content] of Object.entries(itens || {})) {
        if (!content || typeof content !== "object") continue;
        const base = { courseId, contentId, source };

        if (isScheduledAt(content.publishAt, now)) {
          entradas[queueEntryKey(courseId, "content", contentId)] = {
            ...base,
            kind: "content",
            itemKey: contentId,
            publishAt: normalizePublishAt(content.publishAt),
          };
        }

        const quizKey = quizKeyFor(contentId, source);
        const quiz = quizzesDe(courseId)[quizKey];
        const efetiva = quiz ? effectiveQuizPublishAt(quiz, content) : "";
        if (quiz && isScheduledAt(efetiva, now)) {
          entradas[queueEntryKey(courseId, "quiz", quizKey)] = {
            ...base,
            kind: "quiz",
            itemKey: quizKey,
            publishAt: efetiva,
          };
        }
      }
    }
  }
  return entradas;
};
