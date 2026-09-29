export const normalizeDiagnosticFlag = (value) =>
  value === true || value === "true" || value === 1 || value === "1";

/**
 * Normaliza a flag de "permitir repetição" de um quiz. O padrão é `true`
 * (comportamento histórico: repetição liberada) — só é `false` quando o
 * professor desativa explicitamente.
 */
export const normalizeAllowRetry = (value) => value !== false;

/**
 * Normaliza o limite máximo de tentativas. Retorna um inteiro positivo quando
 * informado, ou `null` quando ausente/ inválido (= tentativas ilimitadas).
 */
export const normalizeMaxAttempts = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

/**
 * Calcula o limite EFETIVO de tentativas de um quiz:
 * - repetição desativada  → 1 tentativa;
 * - repetição ativada com limite informado → esse número;
 * - repetição ativada sem limite → Infinity (ilimitado).
 * @param {Object} quiz - Quiz (ou objeto com allowRetry/maxAttempts)
 * @returns {number}
 */
export const getQuizAttemptLimit = (quiz) => {
  if (!quiz) return Infinity;
  if (!normalizeAllowRetry(quiz.allowRetry)) return 1;
  const max = normalizeMaxAttempts(quiz.maxAttempts);
  return max == null ? Infinity : max;
};

/**
 * Normaliza uma data da janela do quiz (abertura/fechamento) para ISO.
 * Retorna "" quando ausente ou inválida — o mesmo contrato usado nos enunciados
 * (`courseAssignments`), onde vazio significa "sem restrição".
 */
export const normalizeQuizDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
};

/**
 * Monta os campos de configuração de tentativas e janela para persistência.
 * Como vários pontos reescrevem o nó do quiz inteiro com `set`, este helper
 * garante que `allowRetry`/`maxAttempts`/`openDate`/`closeDate`/`publishAt` sejam sempre
 * preservados. Campos ausentes não são incluídos (ausência = sem limite/janela).
 */
export const persistableQuizSettings = (quiz) => {
  const settings = { allowRetry: normalizeAllowRetry(quiz?.allowRetry) };
  const max = normalizeMaxAttempts(quiz?.maxAttempts);
  if (max != null) settings.maxAttempts = max;
  const openDate = normalizeQuizDate(quiz?.openDate);
  if (openDate) settings.openDate = openDate;
  const closeDate = normalizeQuizDate(quiz?.closeDate);
  if (closeDate) settings.closeDate = closeDate;
  const publishAt = normalizeQuizDate(quiz?.publishAt);
  if (publishAt) settings.publishAt = publishAt;
  return settings;
};

/**
 * ==============================
 * JANELA DE DISPONIBILIDADE DO QUIZ (openDate / closeDate)
 * ==============================
 *
 * Mesmo modelo dos enunciados: datas ISO, vazio = sem restrição. Serve para o
 * professor montar o quiz com calma (só abre na data marcada) e para impedir
 * que a turma deixe tudo para o fim do semestre (fecha na data marcada).
 */

/**
 * Indica se o quiz ainda não abriu (openDate no futuro).
 */
export const isQuizBeforeOpen = (quiz, now = new Date()) => {
  const openDate = normalizeQuizDate(quiz?.openDate);
  if (!openDate) return false;
  return now.getTime() < new Date(openDate).getTime();
};

/**
 * Indica se o quiz já encerrou (closeDate no passado).
 */
export const isQuizAfterClose = (quiz, now = new Date()) => {
  const closeDate = normalizeQuizDate(quiz?.closeDate);
  if (!closeDate) return false;
  return now.getTime() > new Date(closeDate).getTime();
};

/**
 * Estado da janela de disponibilidade de um quiz.
 * @returns {'scheduled'|'open'|'closed'} scheduled = ainda não abriu,
 *  open = disponível, closed = encerrado.
 */
export const getQuizWindowState = (quiz, now = new Date()) => {
  if (isQuizBeforeOpen(quiz, now)) return "scheduled";
  if (isQuizAfterClose(quiz, now)) return "closed";
  return "open";
};

/**
 * Formata uma data da janela para exibição em pt-BR (dd/mm/aaaa às hh:mm).
 * Devolve "" quando a data é ausente/inválida.
 */
export const formatQuizDate = (value) => {
  const iso = normalizeQuizDate(value);
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Mensagem explicando por que o quiz não pode ser aberto agora.
 * @returns {string|null} null quando o quiz está dentro da janela.
 */
export const getQuizWindowMessage = (quiz, now = new Date()) => {
  const state = getQuizWindowState(quiz, now);
  if (state === "scheduled")
    return `Este quiz ainda não abriu. Ele fica disponível a partir de ${formatQuizDate(
      quiz?.openDate
    )}.`;
  if (state === "closed")
    return `Este quiz foi encerrado em ${formatQuizDate(quiz?.closeDate)}.`;
  return null;
};

// Limiares de urgência do prazo de fechamento, usados para colorir o aviso.
const DEADLINE_URGENT_MS = 24 * 60 * 60 * 1000;
const DEADLINE_SOON_MS = 3 * DEADLINE_URGENT_MS;

/**
 * Próximo marco da janela que interessa ao aluno, para o aviso de prazo:
 * - quiz agendado → quando abre;
 * - quiz aberto com data de fechamento → quando fecha, com a urgência;
 * - sem fechamento ou já encerrado → null (não há prazo a avisar).
 * @returns {{kind:'opens'|'closes', date:string, urgency:'normal'|'soon'|'urgent'|null}|null}
 */
export const getQuizDeadline = (quiz, now = new Date()) => {
  const state = getQuizWindowState(quiz, now);
  if (state === "scheduled") {
    return { kind: "opens", date: normalizeQuizDate(quiz?.openDate), urgency: null };
  }
  const closeDate = normalizeQuizDate(quiz?.closeDate);
  if (state !== "open" || !closeDate) return null;
  const remaining = new Date(closeDate).getTime() - now.getTime();
  const urgency =
    remaining < DEADLINE_URGENT_MS ? "urgent" : remaining < DEADLINE_SOON_MS ? "soon" : "normal";
  return { kind: "closes", date: closeDate, urgency };
};

/**
 * Verifica se o usuário atingiu o limite máximo de tentativas para um determinado quiz
 * @param {Object} userQuizAttempts - Tentativas de quiz do usuário
 * @param {string} quizId - ID do quiz
 * @param {number} maxAttempts - Máximo de tentativas permitidas
 * @returns {boolean} - Verdadeiro se o limite foi atingido
 */
export const hasUserReachedQuizAttemptLimit = (
  userQuizAttempts,
  quizId,
  maxAttempts = Infinity // Por padrão, sem limite de tentativas
) => {
  if (!userQuizAttempts || !quizId) return false;

  // Extract videoId from quizId (which may be in format "courseId/videoId")
  const videoId = quizId.includes("/") ? quizId.split("/")[1] : quizId;

  // Check direct match first
  if (userQuizAttempts[videoId] && userQuizAttempts[videoId].attemptCount >= maxAttempts) {
    return true;
  }

  // Also check for any key that ends with our videoId (for backward compatibility)
  const found = Object.keys(userQuizAttempts).some((key) => {
    if (key === videoId || key.endsWith(`/${videoId}`)) {
      const hasReached = userQuizAttempts[key]?.attemptCount >= maxAttempts;
      return hasReached;
    }
    return false;
  });

  return found;
};

/**
 * Verifica se um quiz está bloqueado
 * @param {Object} video - Objeto do vídeo
 * @returns {boolean} - Verdadeiro se o quiz estiver bloqueado
 */
export const isQuizLocked = (video) => {
  if (!video || !video.quizId) return false;

  // Quiz está bloqueado se o vídeo não foi assistido
  return !video.watched;
};
