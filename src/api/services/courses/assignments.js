import { database } from "$api/config/firebase";
import { ref, push, set, get, update, remove } from "firebase/database";

/**
 * Serviço de Enunciados (Trabalhos/Atividades) de um curso.
 *
 * Estrutura no Realtime Database:
 *   courseAssignments/{courseId}/{assignmentId}
 *     title, descriptionMarkdown, descriptionHtml, createdBy, createdAt, updatedAt
 *     // descriptionMarkdown é o enunciado como o professor escreveu (fonte da
 *     // verdade); descriptionHtml é a renderização derivada dele, mantida por
 *     // compatibilidade com os enunciados criados antes do markdown.
 *     attachments: [{ name, url }]
 *     openDate (ISO)   // a partir de quando a entrega abre (vazio = já aberta)
 *     dueDate (ISO), allowLate (bool)
 *     submissionTypes: { text, link }
 *     flippedClassroom (bool)      // habilita entrega em vídeo do YouTube
 *     mode: 'individual' | 'group'
 *     linkedAssessmentId (string|null)  // liga a courseAssessments para a nota
 *     groups: { enabled, maxGroups, maxPerGroup, changeDeadline }
 */

export const DEFAULT_ASSIGNMENT = {
  title: "",
  descriptionMarkdown: "",
  descriptionHtml: "",
  attachments: [],
  openDate: "",
  dueDate: "",
  allowLate: false,
  submissionTypes: { text: true, link: true },
  flippedClassroom: false,
  mode: "individual",
  linkedAssessmentId: null,
  groups: { enabled: false, maxGroups: 0, maxPerGroup: 0, changeDeadline: "" },
};

/**
 * Normaliza um enunciado vindo do banco garantindo os campos padrão.
 */
const normalizeAssignment = (id, raw) => ({
  id,
  ...DEFAULT_ASSIGNMENT,
  ...raw,
  attachments: Array.isArray(raw?.attachments) ? raw.attachments : [],
  submissionTypes: {
    ...DEFAULT_ASSIGNMENT.submissionTypes,
    ...(raw?.submissionTypes || {}),
  },
  groups: { ...DEFAULT_ASSIGNMENT.groups, ...(raw?.groups || {}) },
});

/**
 * Busca todos os enunciados de um curso.
 * @param {string} courseId
 * @returns {Promise<Array>}
 */
export const fetchAssignmentsByCourse = async (courseId) => {
  if (!courseId) return [];
  try {
    const snapshot = await get(ref(database, `courseAssignments/${courseId}`));
    if (!snapshot.exists()) return [];
    const data = snapshot.val();
    return Object.keys(data).map((id) => normalizeAssignment(id, data[id]));
  } catch (error) {
    console.error("Erro ao buscar enunciados:", error);
    throw new Error("Falha ao carregar enunciados");
  }
};

/**
 * Busca um enunciado específico.
 */
export const fetchAssignment = async (courseId, assignmentId) => {
  if (!courseId || !assignmentId) return null;
  try {
    const snapshot = await get(
      ref(database, `courseAssignments/${courseId}/${assignmentId}`)
    );
    if (!snapshot.exists()) return null;
    return normalizeAssignment(assignmentId, snapshot.val());
  } catch (error) {
    console.error("Erro ao buscar enunciado:", error);
    throw new Error("Falha ao carregar enunciado");
  }
};

/**
 * Cria um novo enunciado.
 * @param {string} courseId
 * @param {Object} assignment
 * @returns {Promise<string>} id do enunciado criado
 */
export const createAssignment = async (courseId, assignment) => {
  if (!courseId) throw new Error("ID do curso é obrigatório");
  if (!assignment?.title?.trim()) throw new Error("Título é obrigatório");

  try {
    const listRef = ref(database, `courseAssignments/${courseId}`);
    const newRef = push(listRef);

    const payload = {
      ...DEFAULT_ASSIGNMENT,
      ...assignment,
      title: assignment.title.trim(),
      courseId,
      createdAt: new Date().toISOString(),
    };

    await set(newRef, payload);
    return newRef.key;
  } catch (error) {
    console.error("Erro ao criar enunciado:", error);
    throw new Error("Falha ao criar enunciado");
  }
};

/**
 * Atualiza um enunciado existente.
 */
export const updateAssignment = async (courseId, assignmentId, updatedData) => {
  if (!courseId || !assignmentId)
    throw new Error("IDs do curso e do enunciado são obrigatórios");
  try {
    await update(
      ref(database, `courseAssignments/${courseId}/${assignmentId}`),
      { ...updatedData, updatedAt: new Date().toISOString() }
    );
  } catch (error) {
    console.error("Erro ao atualizar enunciado:", error);
    throw new Error("Falha ao atualizar enunciado");
  }
};

/**
 * Exclui um enunciado e, em cascata, seus grupos e entregas.
 * O courseAssessment vinculado NÃO é removido para preservar as notas já
 * lançadas — o professor pode removê-lo pela aba de Avaliações se quiser.
 */
export const deleteAssignment = async (courseId, assignmentId) => {
  if (!courseId || !assignmentId)
    throw new Error("IDs do curso e do enunciado são obrigatórios");
  try {
    const updates = {};
    updates[`courseAssignments/${courseId}/${assignmentId}`] = null;
    updates[`assignmentGroups/${courseId}/${assignmentId}`] = null;
    updates[`assignmentSubmissions/${courseId}/${assignmentId}`] = null;
    await update(ref(database), updates);
  } catch (error) {
    console.error("Erro ao excluir enunciado:", error);
    throw new Error("Falha ao excluir enunciado");
  }
};

/**
 * Indica se um enunciado já passou do prazo de entrega.
 * @param {Object} assignment
 * @param {Date} [now]
 * @returns {boolean}
 */
export const isPastDue = (assignment, now = new Date()) => {
  if (!assignment?.dueDate) return false;
  const due = new Date(assignment.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  return now.getTime() > due.getTime();
};

/**
 * Indica se a entrega ainda não abriu (openDate no futuro).
 */
export const isBeforeOpen = (assignment, now = new Date()) => {
  if (!assignment?.openDate) return false;
  const open = new Date(assignment.openDate);
  if (Number.isNaN(open.getTime())) return false;
  return now.getTime() < open.getTime();
};

/**
 * Estado da janela de entrega de um enunciado.
 * @returns {'scheduled'|'open'|'late'|'closed'} scheduled = ainda não abriu,
 *  open = dentro do prazo, late = após o prazo mas aceita atraso,
 *  closed = após o prazo e não aceita atraso.
 */
export const getWindowState = (assignment, now = new Date()) => {
  if (isBeforeOpen(assignment, now)) return "scheduled";
  if (isPastDue(assignment, now)) return assignment?.allowLate ? "late" : "closed";
  return "open";
};

/**
 * Formata a distância entre agora e uma data-alvo de forma amigável em pt-BR.
 * Ex.: "em 3 dias", "em 5 h", "há 2 dias".
 */
export const formatTimeRemaining = (targetIso, now = new Date()) => {
  if (!targetIso) return "";
  const target = new Date(targetIso);
  if (Number.isNaN(target.getTime())) return "";
  const diffMs = target.getTime() - now.getTime();
  const past = diffMs < 0;
  const abs = Math.abs(diffMs);
  const min = Math.round(abs / 60000);
  const hours = Math.round(abs / 3600000);
  const days = Math.round(abs / 86400000);

  let value;
  if (min < 60) value = `${min} min`;
  else if (hours < 24) value = `${hours} h`;
  else if (days < 30) value = `${days} dia${days === 1 ? "" : "s"}`;
  else value = `${Math.round(days / 30)} ${Math.round(days / 30) === 1 ? "mês" : "meses"}`;

  return past ? `há ${value}` : `em ${value}`;
};
