import { database } from "$api/config/firebase";
import { ref, set, get, update } from "firebase/database";
import { fetchAssignmentsByCourse } from "./assignments";

/**
 * Serviço de Entregas (submissions) de enunciados.
 *
 * Estrutura:
 *   assignmentSubmissions/{courseId}/{assignmentId}/{submitterKey}
 *     submittedBy (userId), submittedAt, isLate (bool)
 *     content: { text, link, video: { youtubeUrl, title, description } }
 *
 * submitterKey:
 *   - individual: o próprio userId
 *   - grupo: "group_{groupId}"
 */

/**
 * Monta a chave de quem entrega conforme o modo do enunciado.
 * @param {'individual'|'group'} mode
 * @param {string} userId
 * @param {string} [groupId]
 * @returns {string}
 */
export const submitterKeyFor = (mode, userId, groupId) =>
  mode === "group" ? `group_${groupId}` : userId;

/**
 * Verifica se uma entrega está atrasada em relação ao prazo do enunciado.
 */
export const computeIsLate = (dueDate, submittedAt = new Date()) => {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return false;
  return new Date(submittedAt).getTime() > due.getTime();
};

/**
 * Busca a entrega de um submitter específico.
 */
export const fetchSubmission = async (courseId, assignmentId, submitterKey) => {
  if (!courseId || !assignmentId || !submitterKey) return null;
  try {
    const snapshot = await get(
      ref(
        database,
        `assignmentSubmissions/${courseId}/${assignmentId}/${submitterKey}`
      )
    );
    if (!snapshot.exists()) return null;
    return { submitterKey, ...snapshot.val() };
  } catch (error) {
    console.error("Erro ao buscar entrega:", error);
    return null;
  }
};

/**
 * Busca todas as entregas de um enunciado.
 * @returns {Promise<Array>} lista de entregas com submitterKey
 */
export const fetchAllSubmissions = async (courseId, assignmentId) => {
  if (!courseId || !assignmentId) return [];
  try {
    const snapshot = await get(
      ref(database, `assignmentSubmissions/${courseId}/${assignmentId}`)
    );
    if (!snapshot.exists()) return [];
    const data = snapshot.val();
    return Object.keys(data).map((submitterKey) => ({
      submitterKey,
      ...data[submitterKey],
    }));
  } catch (error) {
    console.error("Erro ao buscar entregas:", error);
    throw new Error("Falha ao carregar entregas");
  }
};

/**
 * Salva (cria ou substitui) uma entrega.
 * @param {Object} params
 * @param {string} params.courseId
 * @param {string} params.assignmentId
 * @param {string} params.submitterKey
 * @param {string} params.submittedBy - userId de quem entregou
 * @param {Object} params.content - { text, link, video }
 * @param {string} [params.dueDate] - usado para calcular atraso
 * @returns {Promise<Object>} a entrega salva
 */
export const saveSubmission = async ({
  courseId,
  assignmentId,
  submitterKey,
  submittedBy,
  content,
  dueDate,
}) => {
  if (!courseId || !assignmentId || !submitterKey || !submittedBy) {
    throw new Error("Dados insuficientes para salvar a entrega");
  }

  try {
    const submittedAt = new Date().toISOString();
    const payload = {
      submittedBy,
      submittedAt,
      isLate: computeIsLate(dueDate, submittedAt),
      content: content || {},
    };
    await set(
      ref(
        database,
        `assignmentSubmissions/${courseId}/${assignmentId}/${submitterKey}`
      ),
      payload
    );
    return { submitterKey, ...payload };
  } catch (error) {
    console.error("Erro ao salvar entrega:", error);
    throw new Error("Falha ao salvar entrega");
  }
};

/**
 * Marca em uma entrega que a nota foi lançada (metadado auxiliar para o
 * dashboard). A nota em si vive em courseAssessments.
 */
export const markSubmissionGraded = async (
  courseId,
  assignmentId,
  submitterKey,
  grade
) => {
  try {
    await update(
      ref(
        database,
        `assignmentSubmissions/${courseId}/${assignmentId}/${submitterKey}`
      ),
      { grade, gradedAt: new Date().toISOString() }
    );
  } catch (error) {
    console.error("Erro ao marcar entrega como avaliada:", error);
  }
};

/**
 * Coleta os vídeos entregues no modelo "sala de aula invertida" de um curso,
 * já formatados como itens de conteúdo para serem mesclados na tela de aulas
 * (mesmo formato usado por vídeos/slides em classes.jsx).
 *
 * Não escreve em courseVideos — os vídeos permanecem nas entregas dos alunos e
 * só são exibidos aqui.
 *
 * @param {string} courseId
 * @returns {Promise<Array>} itens { id, isFlippedVideo, title, url, description, author, assignmentId }
 */
export const fetchFlippedClassroomVideos = async (courseId) => {
  if (!courseId) return [];
  try {
    const assignments = await fetchAssignmentsByCourse(courseId);
    const flipped = assignments.filter((a) => a.flippedClassroom);
    if (flipped.length === 0) return [];

    const results = [];
    await Promise.all(
      flipped.map(async (assignment) => {
        const submissions = await fetchAllSubmissions(courseId, assignment.id);
        submissions.forEach((sub) => {
          const video = sub?.content?.video;
          if (video?.youtubeUrl && video?.title) {
            results.push({
              id: `flip_${assignment.id}_${sub.submitterKey}`,
              isFlippedVideo: true,
              assignmentId: assignment.id,
              submitterKey: sub.submitterKey,
              submittedBy: sub.submittedBy,
              title: video.title,
              url: video.youtubeUrl,
              description: video.description || "",
              type: "video",
            });
          }
        });
      })
    );
    return results;
  } catch (error) {
    console.error("Erro ao buscar vídeos de sala de aula invertida:", error);
    return [];
  }
};
