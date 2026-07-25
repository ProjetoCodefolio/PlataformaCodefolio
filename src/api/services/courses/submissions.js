import { database } from "$api/config/firebase";
import { ref, set, get, update, remove } from "firebase/database";
import { fetchAssignmentsByCourse } from "./assignments";
import { fetchCourseQuizzes } from "./quizzes";

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
 * Valida se a URL é um link do Google Drive / Google Docs (Docs, Sheets,
 * Slides, arquivos e pastas compartilhadas).
 * @param {string} url
 * @returns {boolean}
 */
export const isValidGoogleDriveUrl = (url) => {
  if (!url || typeof url !== "string") return false;
  try {
    const { hostname } = new URL(url.trim());
    return (
      hostname === "drive.google.com" ||
      hostname === "docs.google.com" ||
      hostname.endsWith(".docs.google.com")
    );
  } catch {
    return false;
  }
};

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
    // Preserva a ordem que o professor definiu para o vídeo desta entrega na
    // aba "Conteúdo". Como saveSubmission faz `set` (sobrescreve a entrega), sem
    // isto reenviar a entrega apagaria a ordenação do vídeo de sala invertida.
    let preservedOrder;
    const existingSnap = await get(
      ref(
        database,
        `assignmentSubmissions/${courseId}/${assignmentId}/${submitterKey}`
      )
    );
    if (existingSnap.exists()) {
      preservedOrder = existingSnap.val()?.content?.video?.order;
    }

    const submittedAt = new Date().toISOString();
    const payload = {
      submittedBy,
      submittedAt,
      isLate: computeIsLate(dueDate, submittedAt),
      content: content || {},
    };
    if (typeof preservedOrder === "number" && payload.content?.video) {
      payload.content.video.order = preservedOrder;
    }
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
 * Remove (retira) uma entrega inteira, incluindo eventual vídeo de sala de aula
 * invertida — que deixa de aparecer na lista de conteúdo do curso.
 *
 * Permissões (ver database.rules.json):
 *  - individual: o próprio aluno (submitterKey === auth.uid) ou o professor/admin
 *  - grupo (submitterKey "group_..."): qualquer membro autenticado ou o professor/admin
 *
 * @param {string} courseId
 * @param {string} assignmentId
 * @param {string} submitterKey
 */
export const deleteSubmission = async (courseId, assignmentId, submitterKey) => {
  if (!courseId || !assignmentId || !submitterKey) {
    throw new Error("Dados insuficientes para remover a entrega");
  }
  try {
    await remove(
      ref(
        database,
        `assignmentSubmissions/${courseId}/${assignmentId}/${submitterKey}`
      )
    );
  } catch (error) {
    console.error("Erro ao remover entrega:", error);
    throw new Error("Falha ao remover entrega");
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
              // Ordem definida pelo professor na aba "Conteúdo" (opcional).
              order: typeof video.order === "number" ? video.order : undefined,
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

/**
 * Persiste a ordem (definida pela reordenação do professor) de um vídeo de sala
 * de aula invertida, gravando em `.../content/video/order` da entrega.
 * @param {string} courseId
 * @param {string} assignmentId
 * @param {string} submitterKey
 * @param {number} order
 */
export const setFlippedVideoOrder = async (
  courseId,
  assignmentId,
  submitterKey,
  order
) => {
  if (!courseId || !assignmentId || !submitterKey) return;
  await set(
    ref(
      database,
      `assignmentSubmissions/${courseId}/${assignmentId}/${submitterKey}/content/video/order`
    ),
    order
  );
};

/**
 * Carrega e formata os vídeos de sala de aula invertida para a lista/reprodução
 * do aluno, no MESMO formato dos demais conteúdos (vídeos/slides). Diferente do
 * comportamento antigo, estes vídeos agora:
 *  - respeitam a ordem definida pelo professor (campo `order`);
 *  - contam no progresso do curso (não são mais `isIndependent`);
 *  - podem ter um quiz associado (courseQuizzes/{courseId}/{flipId}).
 *
 * @param {string} courseId
 * @param {Object} deps - { fetchVideoProgress, userId, userQuizzesResults }
 * @returns {Promise<Array>}
 */
export const loadFlippedClassroomForStudent = async (courseId, deps = {}) => {
  const { fetchVideoProgress, userId, userQuizzesResults = {} } = deps;

  const flipped = await fetchFlippedClassroomVideos(courseId);
  if (flipped.length === 0) return [];

  // Um único fetch dos quizzes do curso para descobrir quais vídeos de entrega
  // têm quiz (chaveado pelo id `flip_...`).
  const quizzes = await fetchCourseQuizzes(courseId);

  return Promise.all(
    flipped.map(async (v, i) => {
      const hasQuiz = !!quizzes?.[v.id];

      let watched = false;
      let progress = 0;
      let progressError = false;
      if (userId && typeof fetchVideoProgress === "function") {
        try {
          const up = await fetchVideoProgress(userId, courseId, v.id);
          watched = up?.watched || false;
          progress = up?.percentageWatched || 0;
          if (up?.readError) progressError = true;
        } catch (error) {
          console.error(`Erro ao buscar progresso do vídeo de entrega ${v.id}:`, error);
          progressError = true;
        }
      }

      const quizPassed =
        userQuizzesResults?.[v.id]?.isPassed ||
        userQuizzesResults?.[v.id]?.passed ||
        false;

      return {
        ...v,
        isFlippedVideo: true,
        type: "video",
        requiresPrevious: false,
        watched,
        progress,
        progressError,
        // Sem ordem definida ainda → vai para o fim (mas com valor finito e
        // estável, para não "embaralhar" a cada carregamento).
        order: typeof v.order === "number" ? v.order : 100000 + i,
        quizId: hasQuiz ? `${courseId}/${v.id}` : null,
        quizPassed,
      };
    })
  );
};
