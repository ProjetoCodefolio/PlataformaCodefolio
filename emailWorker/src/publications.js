// Avisa a turma na hora de uma publicação programada.
//
// Regra: o aviso é EXATAMENTE o que o professor mandaria se cadastrasse o item
// naquele momento. Vídeo/slide: só sino. Quiz: sino + e-mail. Mesmos
// destinatários (matriculados que não são professores da turma), mesmas
// preferências por curso, mesmo texto (src/shared/notificationText.js).
//
// A fila (`publicationQueue`, mantida pelo app) é só um índice. Para cada
// entrada vencida, o item é relido e é ELE quem decide:
//  - não existe mais: a entrada é descartada;
//  - ainda está no futuro (o professor adiou): a entrada é reagendada;
//  - publicado: a turma é avisada e a entrada sai da fila.
//
// Duas execuções sobrepostas não mandam aviso em dobro: antes de avisar, a
// entrada é reservada com gravação condicional (ETag). Quem perde a corrida
// pula. Uma reserva que ficou para trás (execução que morreu no meio) vale de
// novo depois de `staleMs`.

import { PreconditionFailed } from "./firebaseRest.js";
import {
  buildContentNotification,
  buildQuizNotification,
  recipientName,
  TURMA_TIME_ZONE,
} from "../../src/shared/notificationText.js";
import {
  effectiveQuizPublishAt,
  isScheduledAt,
  normalizePublishAt,
} from "../../src/shared/publicationDates.js";

const SOURCE_NODES = {
  content: "courseContent",
  video: "courseVideos",
  slide: "courseSlides",
};

const STALE_MS = 15 * 60 * 1000;

// Mesmo critério de `acceptsInApp` do app: tudo ligado por padrão; só
// desliga o que o aluno desligou.
const aceita = (prefs, type) => {
  if (!prefs) return true;
  if (prefs.inAppEnabled === false) return false;
  return prefs[type] !== false;
};

/**
 * Destinatários de um curso, como `fetchCourseStudentsEnriched` filtrado por
 * `role !== "teacher"`: matriculados que não são professores daquela turma.
 */
const makeRecipientLoader = (db) => {
  let studentCourses = null;
  const cache = new Map();

  return async (courseId) => {
    if (cache.has(courseId)) return cache.get(courseId);
    studentCourses ??= (await db.get("studentCourses")) || {};

    const uids = Object.keys(studentCourses).filter((uid) => studentCourses[uid]?.[courseId]);
    const recipients = (
      await Promise.all(
        uids.map(async (uid) => {
          const user = await db.get(`users/${uid}`);
          if (!user || user.coursesTeacher?.[courseId] === true) return null;
          const prefs = await db.get(`notificationPrefs/${uid}/${courseId}`);
          return { uid, email: user.email || "", name: recipientName(uid, user), prefs };
        })
      )
    ).filter(Boolean);

    cache.set(courseId, recipients);
    return recipients;
  };
};

/** Mesmo objeto que `createNotification` grava no app. */
const notificationRecord = (notification, now) => ({
  type: notification.type || "info",
  courseId: notification.courseId || "",
  assignmentId: "",
  quizId: notification.quizId || "",
  title: notification.title || "",
  message: notification.message || "",
  link: notification.link || "",
  read: false,
  createdAt: now.toISOString(),
});

/**
 * Processa as entradas vencidas da fila.
 *
 * @param {Object} params
 * @param {ReturnType<import("./firebaseRest.js").createDb>} params.db
 * @param {Date} [params.now]
 * @param {(job: Object) => Promise<void>} params.enqueueEmail - põe um e-mail na fila do Brevo
 * @param {string} [params.timeZone]
 * @param {(key: string) => boolean} [params.only] - restringe as entradas
 *   processadas (os testes usam para não tocar nos dados locais de quem roda)
 * @returns {Promise<{notified: number, rescheduled: number, dropped: number, skipped: number}>}
 */
export const processDuePublications = async ({
  db,
  now = new Date(),
  enqueueEmail,
  timeZone = TURMA_TIME_ZONE,
  staleMs = STALE_MS,
  only = () => true,
}) => {
  const resumo = { notified: 0, rescheduled: 0, dropped: 0, skipped: 0 };
  const vencidas =
    (await db.get("publicationQueue", {
      orderBy: JSON.stringify("publishAt"),
      endAt: JSON.stringify(now.toISOString()),
    })) || {};

  const recipientsOf = makeRecipientLoader(db);
  const courseTitles = new Map();
  const courseTitleOf = async (courseId) => {
    if (!courseTitles.has(courseId)) {
      courseTitles.set(courseId, (await db.get(`courses/${courseId}/title`)) || "");
    }
    return courseTitles.get(courseId);
  };

  for (const key of Object.keys(vencidas).filter(only)) {
    const caminho = `publicationQueue/${key}`;
    try {
      // Reserva: relê com ETag e marca `sendingAt` só se ninguém mexeu.
      const { value: entrada, etag } = await db.getWithEtag(caminho);
      if (!entrada || isScheduledAt(entrada.publishAt, now)) {
        resumo.skipped += 1;
        continue;
      }
      if (entrada.sendingAt && now - new Date(entrada.sendingAt) < staleMs) {
        resumo.skipped += 1;
        continue;
      }
      await db.put(caminho, { ...entrada, sendingAt: now.toISOString() }, { ifMatch: etag });

      const { courseId, kind, itemKey, contentId, source } = entrada;
      const content = SOURCE_NODES[source]
        ? await db.get(`${SOURCE_NODES[source]}/${courseId}/${contentId}`)
        : null;
      const quiz = kind === "quiz" ? await db.get(`courseQuizzes/${courseId}/${itemKey}`) : null;

      if (!content || (kind === "quiz" && !quiz)) {
        await db.remove(caminho);
        resumo.dropped += 1;
        continue;
      }

      const dataEfetiva =
        kind === "quiz" ? effectiveQuizPublishAt(quiz, content) : normalizePublishAt(content.publishAt);
      if (isScheduledAt(dataEfetiva, now)) {
        // Adiado depois de entrar na fila: volta para a data nova.
        const { sendingAt: _sendingAt, ...semReserva } = entrada;
        await db.put(caminho, { ...semReserva, publishAt: dataEfetiva });
        resumo.rescheduled += 1;
        continue;
      }

      const recipients = await recipientsOf(courseId);

      if (kind === "content") {
        // Igual ao cadastro na aba Conteúdo, que não passa o título do curso.
        const notification = buildContentNotification({
          courseId,
          content: {
            id: contentId,
            title: content.title,
            category: source === "slide" ? "slide" : content.category,
          },
        });
        for (const r of recipients) {
          if (!aceita(r.prefs, "newContent")) continue;
          await db.post(`notifications/${r.uid}`, notificationRecord(notification, now));
        }
      } else {
        const courseTitle = await courseTitleOf(courseId);
        const { email, ...notification } = buildQuizNotification({
          courseId,
          quiz: { ...quiz, id: itemKey, title: content.title },
          courseTitle,
          now,
          timeZone,
        });
        for (const r of recipients) {
          if (!aceita(r.prefs, "newQuiz")) continue;
          await db.post(`notifications/${r.uid}`, notificationRecord(notification, now));
          if (r.email) {
            await enqueueEmail({
              to: r.email,
              name: r.name,
              courseId,
              courseTitle,
              link: notification.link,
              ...email,
            });
          }
        }
      }

      await db.remove(caminho);
      resumo.notified += 1;
    } catch (error) {
      if (error instanceof PreconditionFailed) {
        // Outra execução reservou ou o app mexeu na entrada: fica para ela.
        resumo.skipped += 1;
        continue;
      }
      // Uma entrada com problema não segura as outras; ela fica reservada e
      // volta a ser tentada depois de `staleMs`.
      console.error(`Erro ao processar ${caminho}:`, error);
    }
  }

  return resumo;
};
