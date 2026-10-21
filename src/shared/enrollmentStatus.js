// Estado da matrícula (studentCourses/{uid}/{courseId}), sem Firebase. Usado
// pelo app e pelo Worker do Cloudflare (avisos de publicação programada), para
// que os dois decidam do mesmo jeito quem está na turma.
//
// A matrícula encerrada (saída do curso ou remoção da turma) continua
// existindo, com `endedAt`, `endedBy` e `endReason`. Por isso "o registro
// existe" não quer dizer "está na turma": todo leitor passa por
// `isActiveEnrollment`. Ver docs/adr/0001.

export const END_REASONS = {
  LEFT: "left",
  REMOVED: "removed",
};

/**
 * A matrícula faz parte da turma agora?
 * @param {Object} matricula - studentCourses/{uid}/{courseId}
 * @returns {boolean}
 */
export const isActiveEnrollment = (matricula) =>
  Boolean(matricula) && !matricula.endedAt;

/**
 * Estado da matrícula para o gate de acesso.
 * @param {Object} matricula
 * @returns {{ state: "none"|"active"|"ended", reason?: string, endedAt?: string }}
 */
export const getEnrollmentState = (matricula) => {
  if (!matricula) return { state: "none" };
  if (isActiveEnrollment(matricula)) return { state: "active" };
  return {
    state: "ended",
    reason: matricula.endReason || END_REASONS.LEFT,
    endedAt: matricula.endedAt,
  };
};

/**
 * Campos que as listas do professor carregam em cada linha para marcar quem
 * está fora da turma.
 * @param {Object} matricula
 * @returns {{ enrollmentEnded: boolean, endReason: string|null, endedAt: string|null }}
 */
export const enrollmentRowFlags = (matricula) => {
  const { state, reason, endedAt } = getEnrollmentState(matricula);
  const ended = state === "ended";
  return {
    enrollmentEnded: ended,
    endReason: ended ? reason : null,
    endedAt: ended ? endedAt || null : null,
  };
};

/**
 * Quem está fora da turma vai para o fim da lista, sem mexer na ordem de
 * cada grupo (a ordenação que a tela já fazia continua valendo).
 * @param {Array<{ enrollmentEnded?: boolean }>} rows
 * @returns {Array}
 */
export const sortEndedLast = (rows) => [
  ...rows.filter((row) => !row.enrollmentEnded),
  ...rows.filter((row) => row.enrollmentEnded),
];

/**
 * Ids de quem tem matrícula ATIVA no curso, a partir do nó `studentCourses`
 * inteiro.
 * @param {Object} studentCourses - { uid: { courseId: matricula } }
 * @param {string} courseId
 * @returns {string[]}
 */
export const activeStudentIds = (studentCourses, courseId) =>
  Object.keys(studentCourses || {}).filter((uid) =>
    isActiveEnrollment(studentCourses[uid]?.[courseId])
  );

/**
 * Data curta (dd/mm/aaaa) das mensagens de matrícula encerrada.
 * @param {string} iso
 * @param {{ timeZone?: string }} [options]
 */
export const formatEndedDate = (iso, { timeZone } = {}) => {
  const data = new Date(iso);
  if (!iso || Number.isNaN(data.getTime())) return "";
  return data.toLocaleDateString("pt-BR", timeZone ? { timeZone } : {});
};

/**
 * Selo de quem está fora da turma, para as listas e os CSV do professor.
 * "" para quem está na turma.
 * @param {{ enrollmentEnded?: boolean, endReason?: string, endedAt?: string }} row
 * @param {{ withDate?: boolean, timeZone?: string }} [options]
 */
export const enrollmentEndedLabel = (row, { withDate = true, timeZone } = {}) => {
  if (!row?.enrollmentEnded) return "";
  const base = row.endReason === END_REASONS.REMOVED ? "Removido da turma" : "Saiu da turma";
  const data = withDate ? formatEndedDate(row.endedAt, { timeZone }) : "";
  return data ? `${base} em ${data}` : base;
};
