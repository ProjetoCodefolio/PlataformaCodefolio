// /**
//  * Salva o progresso de visualização de um vídeo
//  */
// export const saveVideoProgress = async (userId, courseId, videoId, currentTime, duration, forceSave = false) => {
//   if (!userId || !videoId || !courseId) return null;

//   try {
//     // Calcular o percentual assistido
//     let percentageWatched = Math.floor((currentTime / duration) * 100);
    
//     // Se forçar salvamento ou se percentual >= 90%, marca como assistido
//     const watched = forceSave || percentageWatched >= 90;
    
//     // Verificar se existe um registro anterior
//     const progressRef = ref(database, `videoProgress/${userId}/${courseId}/${videoId}`);
//     const snapshot = await get(progressRef);
    
//     let currentSaved = 0;
//     if (snapshot.exists()) {
//       const data = snapshot.val();
//       currentSaved = data.percentageWatched || 0;
//     }
    
//     // Usar o maior valor entre o atual e o salvo
//     percentageWatched = Math.max(percentageWatched, currentSaved);
    
//     // Dados para salvar
//     const progressData = {
//       watchedTimeInSeconds: currentTime,
//       percentageWatched: percentageWatched,
//       watched: watched,
//       lastUpdated: new Date().toISOString(),
//       videoId: videoId,
//     };
    
//     // Salvar no banco
//     await set(progressRef, progressData);
    
//     return { percentageWatched, watched };
//   } catch (error) {
//     console.error("Erro ao salvar progresso de vídeo:", error);
//     return null;
//   }
// };

import { ref, get, push, set, update, remove } from "firebase/database";
import { database } from "../../config/firebase";
import { updateAllUsersCourseProgress } from "./courses";

/**
 * Valida se uma URL é uma URL válida do YouTube
 * @param {string} url - URL para validar
 * @returns {boolean} - Verdadeiro se a URL for válida
 */
export const isValidYouTubeUrl = (url) => {
  try {
    const validUrl = new URL(url);

    // Verifica se é do domínio youtube.com ou youtu.be
    const isYouTubeDomain =
      validUrl.hostname === "youtube.com" ||
      validUrl.hostname === "www.youtube.com" ||
      validUrl.hostname === "youtu.be" ||
      validUrl.hostname === "www.youtu.be";

    // Para youtube.com, verificar se tem o parâmetro v
    if (
      validUrl.hostname === "youtube.com" ||
      validUrl.hostname === "www.youtube.com"
    ) {
      const videoId = validUrl.searchParams.get("v");
      return isYouTubeDomain && !!videoId;
    }

    // Para youtu.be, verificar se tem caminho na URL (formato: youtu.be/{ID})
    if (
      validUrl.hostname === "youtu.be" ||
      validUrl.hostname === "www.youtu.be"
    ) {
      return isYouTubeDomain && validUrl.pathname.length > 1;
    }

    return false;
  } catch (error) {
    return false;
  }
};

/**
 * Busca os vídeos de um curso
 * @param {string} courseId - ID do curso
 * @returns {Promise<Array>} - Array de vídeos
 */
export const fetchCourseVideos = async (courseId) => {
  try {
    const videosRef = ref(database, `courseVideos/${courseId}`);
    const snapshot = await get(videosRef);
    
    if (!snapshot.exists()) {
      return [];
    }
    
    const courseVideos = snapshot.val();
    
    // Processar os vídeos com informações adicionais
    const videoEntries = Object.entries(courseVideos);
    const enrichedVideos = [];
    
    for (const [key, video] of videoEntries) {
      const hasQuizzes = await hasVideoQuizzes(courseId, key);
      enrichedVideos.push({
        id: key,
        ...video,
        requiresPrevious: video.requiresPrevious !== undefined ? video.requiresPrevious : true,
        hasQuizzes: hasQuizzes.length > 0,
      });
    }
    
    return enrichedVideos;
  } catch (error) {
    console.error("Erro ao buscar vídeos do curso:", error);
    throw error;
  }
};

/**
 * Verifica se um vídeo possui quizzes
 * @param {string} courseId - ID do curso
 * @param {string} videoId - ID do vídeo
 * @returns {Promise<Array>} - Array de quizzes associados
 */
export const hasVideoQuizzes = async (courseId, videoId) => {
  try {
    const quizzesRef = ref(database, `courseQuizzes/${courseId}/${videoId}`);
    const snapshot = await get(quizzesRef);
    
    if (snapshot.exists()) {
      return [videoId];
    }
    
    return [];
  } catch (error) {
    console.error("Erro ao verificar quizzes do vídeo:", error);
    return [];
  }
};

/**
 * Adiciona um novo vídeo ao curso
 * @param {string} courseId - ID do curso
 * @param {Object} videoData - Dados do vídeo
 * @returns {Promise<Object>} - Vídeo adicionado com ID
 */
export const addCourseVideo = async (courseId, videoData) => {
  try {
    // Validar URL do YouTube
    if (!isValidYouTubeUrl(videoData.url)) {
      throw new Error("URL inválida. Insira uma URL válida do YouTube");
    }
    
    const courseVideosRef = ref(database, `courseVideos/${courseId}`);
    const newVideoRef = push(courseVideosRef);
    
    const video = {
      title: videoData.title.trim(),
      url: videoData.url.trim(),
      description: String(videoData.description || ""),
      order: videoData.order || 0,
      requiresPrevious: videoData.requiresPrevious || true
    };
    
    await set(newVideoRef, video);
    
    // Buscar todos os vídeos para atualizar progresso
    const allVideos = await fetchCourseVideos(courseId);
    
    // Atualizar progresso do curso para todos os usuários
    await updateAllUsersCourseProgress(courseId, allVideos);
    
    return { ...video, id: newVideoRef.key };
  } catch (error) {
    console.error("Erro ao adicionar vídeo:", error);
    throw error;
  }
};

/**
 * Atualiza um vídeo existente
 * @param {string} courseId - ID do curso
 * @param {string} videoId - ID do vídeo
 * @param {Object} videoData - Dados atualizados do vídeo
 * @returns {Promise<Object>} - Vídeo atualizado
 */
export const updateCourseVideo = async (courseId, videoId, videoData) => {
  try {
    // Validar URL do YouTube
    if (!isValidYouTubeUrl(videoData.url)) {
      throw new Error("URL inválida. Insira uma URL válida do YouTube");
    }
    
    const videoRef = ref(database, `courseVideos/${courseId}/${videoId}`);
    
    const video = {
      title: videoData.title.trim(),
      url: videoData.url.trim(),
      description: String(videoData.description || ""),
      requiresPrevious: videoData.requiresPrevious
    };
    
    await update(videoRef, video);
    
    return { ...video, id: videoId };
  } catch (error) {
    console.error("Erro ao atualizar vídeo:", error);
    throw error;
  }
};

/**
 * Exclui um vídeo do curso
 * @param {string} courseId - ID do curso
 * @param {string} videoId - ID do vídeo
 * @param {string} userId - ID do usuário atual
 * @returns {Promise<boolean>} - Verdadeiro se a exclusão foi bem-sucedida
 */
export const deleteCourseVideo = async (courseId, videoId, userId) => {
  try {
    // Verificar se o vídeo possui quizzes
    const courseQuizzes = await hasVideoQuizzes(courseId, videoId);
    
    if (courseQuizzes.length > 0) {
      throw new Error("Não é possível deletar o vídeo pois existe um quiz associado a ele.");
    }
    
    // Deletar video da tabela de courseVideos
    const videoRef = ref(database, `courseVideos/${courseId}/${videoId}`);
    const videoSnapshot = await get(videoRef);
    const video = videoSnapshot.val();
    await remove(videoRef);

    // Buscar vídeos atualizados após a remoção
    const allVideos = await fetchCourseVideos(courseId);

    // Criar um objeto de atualizações para cada vídeo
    const updates = {};
    
    // Atualizar a ordem de cada vídeo remanescente
    allVideos.forEach(v => {
      if (v.order > video.order) {
        updates[`courseVideos/${courseId}/${v.id}/order`] = v.order - 1;
      }
    });
    
    // Aplicar as atualizações se houver alguma
    if (Object.keys(updates).length > 0) {
      await update(ref(database), updates);
    }
    
    // Deletar vídeo da tabela de videoProgress
    const videoProgressRef = ref(database, `videoProgress/${userId}/${courseId}/${videoId}`);
    await remove(videoProgressRef);
    
    // Buscar vídeos atualizados
    const updatedVideos = await fetchCourseVideos(courseId);
    
    // Atualizar progresso do curso para todos os usuários
    await updateAllUsersCourseProgress(courseId, updatedVideos);
    
    return true;
  } catch (error) {
    console.error("Erro ao excluir vídeo:", error);
    throw error;
  }
};

/**
 * Salva todos os vídeos de um curso
 * @param {string} courseId - ID do curso
 * @param {Array} videos - Array de vídeos
 * @returns {Promise<boolean>} - Verdadeiro se os vídeos foram salvos com sucesso
 */
export const saveAllCourseVideos = async (courseId, videos) => {
  try {
    if (!courseId) {
      throw new Error("ID do curso não disponível");
    }
    
    // Verificar se todos os vídeos têm URLs válidas
    const invalidVideos = videos.filter(video => !isValidYouTubeUrl(video.url));
    if (invalidVideos.length > 0) {
      // Construir mensagem de erro com títulos dos vídeos inválidos
      const invalidVideoTitles = invalidVideos.map(v => `"${v.title}"`).join(", ");
      throw new Error(`O curso contém vídeos com URLs inválidas: ${invalidVideoTitles}`);
    }
    
    const courseVideosRef = ref(database, `courseVideos/${courseId}`);
    const snapshot = await get(courseVideosRef);
    const existingVideos = snapshot.val() || {};
    
    const existingVideoIds = new Set(Object.keys(existingVideos));
    const currentVideoIds = new Set(videos.map(video => video.id).filter(id => id));
    
    // Remover vídeos que não existem mais
    for (const id of existingVideoIds) {
      if (!currentVideoIds.has(id)) {
        await remove(ref(database, `courseVideos/${courseId}/${id}`));
      }
    }
    
    // Adicionar ou atualizar vídeos
    for (const [index, video] of videos.entries()) {
      const videoData = {
        title: video.title,
        url: video.url,
        description: video.description || "",
        order: index,
        requiresPrevious: video.requiresPrevious,
      };
      
      if (video.id && existingVideoIds.has(video.id)) {
        await set(ref(database, `courseVideos/${courseId}/${video.id}`), videoData);
      } else {
        const newVideoRef = push(courseVideosRef);
        await set(newVideoRef, videoData);
        video.id = newVideoRef.key;
      }
    }
    
    return true;
  } catch (error) {
    console.error("Erro ao salvar vídeos:", error);
    throw error;
  }
};

/**
 * Valida todos os vídeos de um curso
 * @param {Array} videos - Array de vídeos para validar
 * @returns {Promise<{isValid: boolean, invalidVideos: Array}>} - Resultado da validação
 */
export const validateCourseVideos = async (videos) => {
  try {
    // Verificar se todos os vídeos têm URLs válidas
    const invalidVideos = videos.filter(video => !isValidYouTubeUrl(video.url));
    
    if (invalidVideos.length > 0) {
      // Construir mensagem de erro com títulos dos vídeos inválidos
      const invalidVideoTitles = invalidVideos.map(v => `"${v.title}"`).join(", ");
      return { 
        isValid: false, 
        invalidVideos,
        errorMessage: `O curso contém vídeos com URLs inválidas: ${invalidVideoTitles}`
      };
    }
    
    return { isValid: true, invalidVideos: [] };
  } catch (error) {
    console.error("Erro ao validar vídeos:", error);
    return { isValid: false, invalidVideos: [], errorMessage: error.message };
  }
};

/**
 * Verifica se um vídeo está bloqueado
 */
export const isVideoLocked = (video, videos) => {
  if (!video || !videos || !Array.isArray(videos)) return false;
  
  // Encontrar o índice do vídeo atual
  const currentIndex = videos.findIndex(v => v.id === video.id);
  if (currentIndex <= 0) return false; // O primeiro vídeo nunca está bloqueado
  
  const previousVideo = videos[currentIndex - 1];
  
  // Um vídeo está bloqueado se requerer o anterior E
  // o anterior não foi assistido OU tem um quiz não concluído
  return video.requiresPrevious && 
         previousVideo && 
         (!previousVideo.watched || (previousVideo.quizId && !previousVideo.quizPassed));
};