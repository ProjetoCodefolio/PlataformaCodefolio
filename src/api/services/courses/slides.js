// Importações no topo do arquivo
import { ref, set, get, update, remove, push } from "firebase/database";

import { database } from "../../config/firebase";

/**
 * Busca slides de um curso específico
 * @param {string} courseId - ID do curso
 * @returns {Promise<Array>} - Array de slides
 */
export const fetchCourseSlides = async (courseId) => {
  try {
    if (!courseId) return [];

    const courseSlidesRef = ref(database, `courseSlides/${courseId}`);
    const snapshot = await get(courseSlidesRef);

    if (!snapshot.exists()) {
      return [];
    }

    const courseSlides = snapshot.val();
    const slidesArray = Object.entries(courseSlides).map(([key, slide]) => ({
      id: key,
      ...slide,
    }));

    return slidesArray;
  } catch (error) {
    console.error("Erro ao buscar slides:", error);
    throw error;
  }
};

/**
 * Busca vídeos de um curso específico
 * @param {string} courseId - ID do curso
 * @returns {Promise<Array>} - Array de vídeos
 */
export const fetchAdminCourseVideos = async (courseId) => {
  try {
    if (!courseId) return [];

    const courseVideosRef = ref(database, `courseVideos/${courseId}`);
    const snapshot = await get(courseVideosRef);

    if (!snapshot.exists()) {
      return [];
    }

    const courseVideos = snapshot.val();
    const videosArray = Object.entries(courseVideos).map(([key, video]) => ({
      id: key,
      ...video,
    }));

    return videosArray;
  } catch (error) {
    console.error("Erro ao buscar vídeos:", error);
    throw error;
  }
};

/**
 * Adiciona um novo slide ao curso
 * @param {string} courseId - ID do curso
 * @param {Object} slideData - Dados do slide a ser adicionado
 * @returns {Promise<Object>} - Slide adicionado com ID
 */
export const addCourseSlide = async (courseId, slideData) => {
  try {
    if (!courseId) {
      throw new Error("ID do curso é necessário");
    }

    if (!slideData.title.trim() || !slideData.url.trim()) {
      throw new Error("Título e URL são obrigatórios");
    }

    const courseSlidesRef = ref(database, `courseSlides/${courseId}`);
    const newSlideRef = push(courseSlidesRef);

    const slide = {
      title: slideData.title.trim(),
      url: slideData.url.trim(),
      description: String(slideData.description || ""),
    };

    await set(newSlideRef, slide);

    return { ...slide, id: newSlideRef.key };
  } catch (error) {
    console.error("Erro ao adicionar slide:", error);
    throw error;
  }
};

/**
 * Atualiza um slide existente
 * @param {string} courseId - ID do curso
 * @param {string} slideId - ID do slide
 * @param {Object} slideData - Dados do slide a serem atualizados
 * @returns {Promise<Object>} - Slide atualizado
 */
export const updateCourseSlide = async (courseId, slideId, slideData) => {
  try {
    if (!courseId || !slideId) {
      throw new Error("ID do curso e do slide são necessários");
    }

    if (!slideData.title.trim() || !slideData.url.trim()) {
      throw new Error("Título e URL são obrigatórios");
    }

    const slide = {
      title: slideData.title.trim(),
      url: slideData.url.trim(),
      description: String(slideData.description || ""),
    };

    const slideRef = ref(database, `courseSlides/${courseId}/${slideId}`);
    await update(slideRef, slide);

    return { ...slide, id: slideId };
  } catch (error) {
    console.error("Erro ao editar slide:", error);
    throw error;
  }
};

/**
 * Remove um slide de um curso
 * @param {string} courseId - ID do curso
 * @param {string} slideId - ID do slide a ser removido
 * @returns {Promise<boolean>} - Verdadeiro se a operação for bem-sucedida
 */
export const deleteCourseSlide = async (courseId, slideId) => {
  try {
    if (!courseId || !slideId) {
      throw new Error("ID do curso e do slide são necessários");
    }

    const slideRef = ref(database, `courseSlides/${courseId}/${slideId}`);
    await remove(slideRef);

    return true;
  } catch (error) {
    console.error("Erro ao excluir slide:", error);
    throw error;
  }
};

/**
 * Salva todos os slides de um curso
 * @param {string} courseId - ID do curso
 * @param {Array} slides - Lista de slides a serem salvos
 * @param {string} targetCourseId - ID do curso de destino (opcional)
 * @returns {Promise<boolean>} - Verdadeiro se a operação for bem-sucedida
 */
export const saveAllCourseSlides = async (
  courseId,
  slides,
  targetCourseId = null
) => {
  try {
    const finalCourseId = targetCourseId || courseId;
    if (!finalCourseId) {
      throw new Error("ID do curso não disponível");
    }

    const courseSlidesRef = ref(database, `courseSlides/${finalCourseId}`);
    const snapshot = await get(courseSlidesRef);
    const existingSlides = snapshot.val() || {};

    const existingSlideIds = new Set(Object.keys(existingSlides));
    const currentSlideIds = new Set(
      slides.map((slide) => slide.id).filter((id) => id)
    );

    // Remover slides que não existem mais
    for (const id of existingSlideIds) {
      if (!currentSlideIds.has(id)) {
        await remove(ref(database, `courseSlides/${finalCourseId}/${id}`));
      }
    }

    // Adicionar ou atualizar slides
    for (const slide of slides) {
      const slideData = {
        title: slide.title,
        url: slide.url,
        description: slide.description || "",
        isIndependent: true,
      };

      if (slide.id && existingSlideIds.has(slide.id)) {
        await set(
          ref(database, `courseSlides/${finalCourseId}/${slide.id}`),
          slideData
        );
      } else {
        const newSlideRef = push(courseSlidesRef);
        await set(newSlideRef, slideData);
        slide.id = newSlideRef.key;
      }
    }

    return true;
  } catch (error) {
    console.error("Erro ao salvar slides:", error);
    throw error;
  }
};

/**
 * Verifica se há vídeos disponíveis para associar a slides
 * @param {Array} videos - Lista de vídeos
 * @param {Array} slides - Lista de slides
 * @param {boolean} isEditing - Se está editando um slide existente
 * @param {string} slideToEdit - ID do slide sendo editado
 * @param {string} currentVideoId - ID do vídeo atualmente selecionado
 * @returns {Array} - Lista de vídeos disponíveis
 */
export const getAvailableVideosForSlides = (
  videos,
  slides,
  isEditing,
  slideToEdit,
  currentVideoId
) => {
  const usedVideoIds = new Set(slides.map((slide) => slide.videoId));

  // Se estiver editando, não excluir o vídeo atualmente selecionado
  if (isEditing && slideToEdit) {
    const currentSlide = slides.find((slide) => slide.id === slideToEdit);
    if (currentSlide) {
      usedVideoIds.delete(currentSlide.videoId);
    }
  }

  return videos.filter(
    (video) =>
      !usedVideoIds.has(video.id) || (isEditing && video.id === currentVideoId)
  );
};

/**
 * Extrai a URL de src de uma string HTML de iframe
 * @param {string} iframeString - String HTML contendo um iframe
 * @returns {string} - URL extraída ou a string original se não for encontrada
 */
export const extractSrcFromIframe = (iframeString) => {
  if (!iframeString || typeof iframeString !== "string") {
    return "";
  }

  const match = iframeString.match(/src="([^"]+)"/);
  return match ? match[1] : iframeString;
};

/**
 * Prepara a URL do slide para exibição
 * @param {Object} slideData - Dados do slide
 * @returns {string} - URL formatada para exibição
 */
export const prepareSlideUrl = (slideData) => {
  if (!slideData || !slideData.url) {
    return "";
  }

  return slideData.url.includes("<iframe")
    ? extractSrcFromIframe(slideData.url)
    : slideData.url;
};

/**
 * Busca slides do curso organizados por vídeo
 * @param {string} courseId - ID do curso
 * @returns {Promise<Object>} - Slides organizados por vídeo
 */
export const fetchCourseSlidesByVideo = async (courseId) => {
  try {
    if (!courseId) return {};

    const slides = await fetchCourseSlides(courseId);

    // Organizar slides por videoId
    return slides.reduce((acc, slide) => {
      if (!acc[slide.videoId]) {
        acc[slide.videoId] = [];
      }
      acc[slide.videoId].push(slide);
      return acc;
    }, {});
  } catch (error) {
    console.error("Erro ao buscar slides por vídeo:", error);
    return {};
  }
};

// Adicionar esta função para vincular um quiz a um slide
export const attachQuizToSlide = async (courseId, slideId, quizId = null) => {
  try {
    if (!courseId || !slideId) {
      throw new Error("IDs de curso e slide são obrigatórios");
    }

    const slideRef = ref(database, `courseSlides/${courseId}/${slideId}`);
    await update(slideRef, { quizId });

    return true;
  } catch (error) {
    console.error("Erro ao vincular quiz ao slide:", error);
    throw error;
  }
};

/**
 * Verifica se um slide tem um quiz associado
 * @param {string} courseId - ID do curso
 * @param {string} slideId - ID do slide
 * @returns {Promise<boolean>} - Verdadeiro se o slide tiver um quiz
 */
export const checkSlideHasQuiz = async (courseId, slideId) => {
  try {
    const quizRef = ref(
      database,
      `courseQuizzes/${courseId}/slide_${slideId}`
    );
    const snapshot = await get(quizRef);
    return snapshot.exists();
  } catch (error) {
    console.error("Erro ao verificar quiz do slide:", error);
    return false;
  }
};
