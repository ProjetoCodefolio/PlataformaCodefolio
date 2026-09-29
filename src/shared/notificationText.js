// Texto das notificações (sino e e-mail) de conteúdo e quiz.
//
// Módulo PURO, sem Firebase e sem alias do Vite: é importado pelo app
// (notifications.js) e pelo Worker do Cloudflare (emailWorker/), que avisa a
// turma na hora de uma publicação programada. A regra é que o aviso da
// publicação programada seja igual ao do cadastro na hora; com o texto num
// lugar só, os dois não têm como divergir.
//
// Datas: o app formata no fuso do navegador (timeZone ausente); o Worker roda
// em UTC e passa o fuso da turma explicitamente.

import { normalizeAllowRetry, normalizeMaxAttempts } from "../api/services/courses/quizWindow.js";

export const TURMA_TIME_ZONE = "America/Sao_Paulo";

const toIso = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
};

/** dd/mm/aaaa hh:mm em pt-BR. "" quando ausente ou inválida. */
export const formatDateTime = (value, timeZone) => {
  const iso = toIso(value);
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...(timeZone && { timeZone }),
  });
};

/**
 * Link que abre a sala já no conteúdo certo. Sem o `videoId` o aluno cai no
 * primeiro item do curso e tem que caçar o que mudou.
 */
export const contentLink = (courseId, contentId) =>
  contentId
    ? `/classes?courseId=${courseId}&videoId=${contentId}`
    : `/classes?courseId=${courseId}`;

/**
 * O id de quiz de slide legado vem com o prefixo `slide_` (chave em
 * courseQuizzes), mas o deep link precisa do id do CONTEÚDO.
 */
export const contentIdFromQuizId = (quizId) => String(quizId || "").replace(/^slide_/, "");

/**
 * Nome do destinatário, com o mesmo critério da lista de alunos
 * (fetchCourseStudentsEnriched): `name` do perfil, se houver; senão o nome de
 * exibição derivado.
 */
export const recipientName = (userId, userData = {}) => {
  let displayName = "Usuário Desconhecido";
  if (userData.displayName) displayName = userData.displayName;
  else if (userData.firstName) displayName = `${userData.firstName} ${userData.lastName || ""}`;
  else if (userData.name) displayName = userData.name;
  else if (userData.email) displayName = userData.email.split("@")[0];
  return userData.name || displayName.trim() || "Usuário " + String(userId).substring(0, 6);
};

/**
 * Aviso de vídeo/slide novo. Só sino: conteúdo é o evento mais frequente do
 * curso e não justifica e-mail.
 * @param {{courseId: string, content: {id: string, title?: string, category?: string}, courseTitle?: string}} params
 */
export const buildContentNotification = ({ courseId, content, courseTitle = "" }) => {
  const isSlide = content?.category === "slide";
  return {
    type: "new_content",
    courseId,
    title: isSlide ? "Novo slide publicado" : "Novo vídeo publicado",
    message: `${courseTitle ? courseTitle + ": " : ""}${
      content?.title || (isSlide ? "Slide" : "Vídeo")
    }`,
    link: contentLink(courseId, content?.id),
  };
};

/**
 * Segunda linha do aviso de quiz: quando abre e até quando dá para responder.
 */
export const quizWindowSummary = (quiz, { now = new Date(), timeZone } = {}) => {
  const opensAt = formatDateTime(quiz?.openDate, timeZone);
  const closesAt = formatDateTime(quiz?.closeDate, timeZone);
  // Só anuncia a abertura quando ela ainda está por vir: data já passada
  // significa que o quiz está disponível agora.
  const opensLater = opensAt && new Date(quiz.openDate).getTime() > now.getTime();

  if (opensLater && closesAt) return ` Abre em ${opensAt} e encerra em ${closesAt}.`;
  if (opensLater) return ` Abre em ${opensAt}.`;
  if (closesAt) return ` Disponível até ${closesAt}.`;
  return " Já está disponível.";
};

/**
 * Campos do quiz que o e-mail mostra, já formatados. Tudo que estiver vazio
 * some do e-mail em vez de virar bloco em branco.
 */
export const quizEmailFields = (quiz, { timeZone } = {}) => {
  const opensAt = formatDateTime(quiz?.openDate, timeZone);
  const closesAt = formatDateTime(quiz?.closeDate, timeZone);
  const janela = [opensAt ? `Abre ${opensAt}` : "", closesAt ? `Encerra ${closesAt}` : ""]
    .filter(Boolean)
    .join("\n");

  const maxAttempts = normalizeMaxAttempts(quiz?.maxAttempts);
  const tentativas = !normalizeAllowRetry(quiz?.allowRetry)
    ? "1 (sem nova tentativa)"
    : maxAttempts != null
      ? String(maxAttempts)
      : "Ilimitadas";

  // Em quiz diagnóstico a nota mínima fica de fora: anunciar "mínima de 40%"
  // logo acima de "não entra na média" confunde mais do que informa.
  const isDiagnostic = Boolean(quiz?.isDiagnostic);

  return {
    videoTitle: quiz?.title || "",
    window: janela || "Já está disponível",
    minPercentage: !isDiagnostic && quiz?.minPercentage ? `${quiz.minPercentage}%` : "",
    attempts: tentativas,
    graded: isDiagnostic ? "Não — quiz diagnóstico" : "Sim",
  };
};

/**
 * Aviso de quiz novo ou alterado: o objeto do sino e o que vai no e-mail.
 * @param {Object} params
 * @param {string} params.courseId
 * @param {Object} params.quiz - { id, title, openDate, closeDate, minPercentage, allowRetry, maxAttempts, isDiagnostic }
 * @param {string} [params.courseTitle]
 * @param {string[]} [params.changes] - o que mudou; vazio significa quiz novo
 */
export const buildQuizNotification = ({
  courseId,
  quiz,
  courseTitle = "",
  changes = [],
  now = new Date(),
  timeZone,
}) => {
  const isUpdate = changes.length > 0;
  const link = contentLink(courseId, contentIdFromQuizId(quiz?.id));
  return {
    type: "new_quiz",
    courseId,
    quizId: quiz?.id,
    title: isUpdate ? "Quiz atualizado" : "Novo quiz publicado",
    message: `${courseTitle ? courseTitle + ": " : ""}${
      quiz?.title || "Novo quiz"
    }.${quizWindowSummary(quiz, { now, timeZone })}`,
    link,
    email: {
      type: isUpdate ? "quiz_updated" : "new_quiz",
      itemTitle: quiz?.title,
      changes,
      fields: quizEmailFields(quiz, { timeZone }),
    },
  };
};
