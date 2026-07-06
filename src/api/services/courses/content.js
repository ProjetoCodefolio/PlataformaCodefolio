// Serviço da nova collection unificada de conteúdo do curso.
//
// `courseContent/{courseId}/{contentId}` guarda TANTO vídeos quanto slides num
// único formato, diferenciados pelo campo `category` ('video' | 'slide'):
//
//   { category, title, url, description, order, requiresPrevious }
//
// A ordem (`order`) é global e compartilhada com o conteúdo legado
// (courseVideos / courseSlides) para permitir intercalar tudo na renderização
// do aluno. Os quizzes de um conteúdo ficam em `courseQuizzes/{courseId}/{contentId}`
// (mesma mecânica dos vídeos legados, sem prefixo).

import { ref, get, push, set, update, remove } from "firebase/database";
import { database } from "../../config/firebase";
import { getNextContentOrder } from "./contentOrder";
import { isValidYouTubeUrl } from "./videos";
import { prepareSlideUrl } from "./slides";

export const CONTENT_CATEGORIES = ["video", "slide"];

/**
 * Valida a URL de um conteúdo conforme sua categoria.
 * - video: precisa ser uma URL válida do YouTube.
 * - slide: aceita link do Google Apresentações (ou iframe de incorporação).
 * @returns {{ isValid: boolean, message?: string }}
 */
export const validateContentUrl = (url, category) => {
  const trimmed = (url || "").trim();
  if (!trimmed) {
    return { isValid: false, message: "A URL é obrigatória" };
  }

  if (category === "video") {
    if (!isValidYouTubeUrl(trimmed)) {
      return {
        isValid: false,
        message:
          "URL inválida. Insira uma URL válida do YouTube (ex: https://youtube.com/watch?v=ID)",
      };
    }
  }
  // Para slides não há um validador estrito de domínio (mantém o comportamento
  // legado da aba de slides, que apenas exigia uma URL não vazia).

  return { isValid: true };
};

/**
 * Normaliza os dados de entrada de um conteúdo para gravação.
 */
const buildContentPayload = (data) => {
  const category = data.category === "slide" ? "slide" : "video";
  const url = (data.url || "").trim();

  return {
    category,
    title: (data.title || "").trim(),
    // Slides podem vir como iframe de incorporação; normaliza para a URL de src.
    url: category === "slide" ? prepareSlideUrl({ url }) : url,
    description: String(data.description || ""),
    requiresPrevious: !!data.requiresPrevious,
  };
};

/**
 * Verifica se um conteúdo possui quiz associado.
 * @returns {Promise<boolean>}
 */
export const hasContentQuiz = async (courseId, contentId) => {
  try {
    const snapshot = await get(
      ref(database, `courseQuizzes/${courseId}/${contentId}`)
    );
    return snapshot.exists();
  } catch (error) {
    console.error("Erro ao verificar quiz do conteúdo:", error);
    return false;
  }
};

/**
 * Busca os itens da nova collection de conteúdo (apenas os "novos"),
 * ordenados pela ordem global.
 * @param {string} courseId
 * @returns {Promise<Array>}
 */
export const fetchCourseContentItems = async (courseId) => {
  if (!courseId) return [];

  const snapshot = await get(ref(database, `courseContent/${courseId}`));
  if (!snapshot.exists()) return [];

  const raw = snapshot.val();
  if (!raw || typeof raw !== "object") return [];

  const items = Object.entries(raw)
    .filter(([, item]) => item && typeof item === "object")
    .map(([id, item]) => ({
      id,
      category: item.category === "slide" ? "slide" : "video",
      title: item.title || (item.category === "slide" ? "Slide sem título" : "Vídeo sem título"),
      url: item.url || "",
      description: item.description || "",
      order: typeof item.order === "number" ? item.order : undefined,
      requiresPrevious: !!item.requiresPrevious,
    }));

  return items.sort((a, b) => {
    const orderA = typeof a.order === "number" ? a.order : Number.POSITIVE_INFINITY;
    const orderB = typeof b.order === "number" ? b.order : Number.POSITIVE_INFINITY;
    if (orderA !== orderB) return orderA - orderB;
    return String(a.id).localeCompare(String(b.id));
  });
};

/**
 * Adiciona um novo item de conteúdo. Entra no fim da ordem global.
 * @param {string} courseId
 * @param {Object} data - { category, title, url, description, requiresPrevious }
 * @returns {Promise<Object>} item criado (com id)
 */
export const addCourseContent = async (courseId, data) => {
  if (!courseId) throw new Error("ID do curso é obrigatório");

  const payload = buildContentPayload(data);
  if (!payload.title) throw new Error("O título é obrigatório");

  const urlValidation = validateContentUrl(payload.url, payload.category);
  if (!urlValidation.isValid) throw new Error(urlValidation.message);

  const order = await getNextContentOrder(courseId);
  const contentRef = push(ref(database, `courseContent/${courseId}`));
  const item = { ...payload, order };

  await set(contentRef, item);
  return { ...item, id: contentRef.key };
};

/**
 * Atualiza um item de conteúdo existente (preserva `order`).
 * @param {string} courseId
 * @param {string} contentId
 * @param {Object} data
 * @returns {Promise<Object>} item atualizado
 */
export const updateCourseContent = async (courseId, contentId, data) => {
  if (!courseId || !contentId) {
    throw new Error("ID do curso e do conteúdo são obrigatórios");
  }

  const payload = buildContentPayload(data);
  if (!payload.title) throw new Error("O título é obrigatório");

  const urlValidation = validateContentUrl(payload.url, payload.category);
  if (!urlValidation.isValid) throw new Error(urlValidation.message);

  // `update` preserva o campo `order` (não incluído no payload).
  await update(ref(database, `courseContent/${courseId}/${contentId}`), payload);
  return { ...payload, id: contentId };
};

/**
 * Remove um item de conteúdo. Bloqueia se houver quiz associado (mesma regra do
 * vídeo legado) e limpa o progresso registrado para esse conteúdo em todos os
 * alunos.
 * @param {string} courseId
 * @param {string} contentId
 * @returns {Promise<boolean>}
 */
export const deleteCourseContent = async (courseId, contentId) => {
  if (!courseId || !contentId) {
    throw new Error("ID do curso e do conteúdo são obrigatórios");
  }

  if (await hasContentQuiz(courseId, contentId)) {
    throw new Error(
      "Não é possível excluir: existe um quiz associado a este conteúdo. Remova o quiz primeiro (aba Quiz)."
    );
  }

  const updates = {};
  updates[`courseContent/${courseId}/${contentId}`] = null;

  // Limpa o progresso deste conteúdo (videoProgress/{uid}/{courseId}/{contentId})
  // para todos os usuários que o tenham, evitando registros órfãos.
  const progressSnapshot = await get(ref(database, `videoProgress`));
  const progressData = progressSnapshot.val();
  if (progressData) {
    Object.keys(progressData).forEach((uid) => {
      if (
        progressData[uid] &&
        progressData[uid][courseId] &&
        progressData[uid][courseId][contentId] !== undefined
      ) {
        updates[`videoProgress/${uid}/${courseId}/${contentId}`] = null;
      }
    });
  }

  await update(ref(database), updates);
  return true;
};

/**
 * Carrega e formata os itens da nova collection para a lista/reprodução do
 * aluno. Cada item recebe os campos que o VideoList/VideoPlayer esperam
 * (isSlide, watched, quizId, etc.), casando com o formato do conteúdo legado.
 *
 * @param {string} courseId
 * @param {Object} deps - injeção das funções de progresso/quiz do aluno para
 *   evitar dependências circulares. { fetchVideoProgress, fetchUserQuizResults, userId }
 * @returns {Promise<Array>}
 */
export const loadCourseContentForStudent = async (courseId, deps = {}) => {
  const { fetchVideoProgress, userId, userQuizzesResults = {} } = deps;

  const items = await fetchCourseContentItems(courseId);
  if (items.length === 0) return [];

  return Promise.all(
    items.map(async (item) => {
      const isSlide = item.category === "slide";
      const hasQuiz = await hasContentQuiz(courseId, item.id);

      // Progresso: slides são sempre considerados vistos; vídeos usam o
      // progresso salvo (se o aluno estiver logado).
      let watched = isSlide;
      let progress = isSlide ? 100 : 0;
      if (!isSlide && userId && typeof fetchVideoProgress === "function") {
        try {
          const userProgress = await fetchVideoProgress(userId, courseId, item.id);
          watched = userProgress?.watched || false;
          progress = userProgress?.percentageWatched || 0;
        } catch (error) {
          console.error(`Erro ao buscar progresso do conteúdo ${item.id}:`, error);
        }
      }

      const quizPassed =
        userQuizzesResults?.[item.id]?.isPassed ||
        userQuizzesResults?.[item.id]?.passed ||
        false;

      return {
        ...item,
        isSlide,
        type: item.category,
        isContentItem: true, // marca itens da nova collection
        watched,
        progress,
        requiresPrevious: isSlide ? false : item.requiresPrevious,
        quizId: hasQuiz ? `${courseId}/${item.id}` : null,
        quizPassed,
      };
    })
  );
};
