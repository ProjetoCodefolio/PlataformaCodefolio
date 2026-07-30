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
import { getNextContentOrder } from "./contentOrder";

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
    
    // Validar se courseVideos é um objeto válido
    if (!courseVideos || typeof courseVideos !== 'object') {
      return [];
    }
    
    // Processar os vídeos com informações adicionais
    const videoEntries = Object.entries(courseVideos);
    const enrichedVideos = [];
    
    for (const [key, video] of videoEntries) {
      // Validar se video não é nulo e tem as propriedades necessárias
      if (!video || typeof video !== 'object') {
        continue;
      }
      
      const hasQuizzes = await hasVideoQuizzes(courseId, key);
      enrichedVideos.push({
        id: key,
        ...video,
        order: video.order ?? 0,
        title: video.title || "Vídeo sem título",
        url: video.url || "",
        description: video.description || "",
        requiresPrevious: video.requiresPrevious !== undefined ? video.requiresPrevious : true,
        hasQuizzes: hasQuizzes.length > 0,
      });
    }
    
    // Ordenar pelos vídeos ordem
    return enrichedVideos.sort((a, b) => (a.order || 0) - (b.order || 0));
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

    // Novo vídeo entra no fim da ordem global do conteúdo (vídeos + slides),
    // para que a ordenação arrastável unificada permaneça coerente.
    const order = await getNextContentOrder(courseId);

    const video = {
      title: videoData.title.trim(),
      url: videoData.url.trim(),
      description: String(videoData.description || ""),
      order,
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

    // Verificar se algum slide está vinculado a este vídeo. Como o slide referencia
    // o vídeo por videoId, deletar o vídeo deixaria o slide apontando para um vídeo
    // inexistente — então bloqueamos (mesma lógica do bloqueio por quiz).
    const slidesSnapshot = await get(ref(database, `courseSlides/${courseId}`));
    if (slidesSnapshot.exists()) {
      const linkedSlides = Object.values(slidesSnapshot.val())
        .filter((slide) => slide && slide.videoId === videoId);
      if (linkedSlides.length > 0) {
        const titles = linkedSlides
          .map((s) => `"${s.title || "Sem título"}"`)
          .join(", ");
        throw new Error(
          `Não é possível deletar o vídeo pois há slides vinculados a ele: ${titles}. Remova ou desvincule esses slides primeiro.`
        );
      }
    }

    // Deletar video da tabela de courseVideos
    const videoRef = ref(database, `courseVideos/${courseId}/${videoId}`);
    const videoSnapshot = await get(videoRef);

    if (!videoSnapshot.exists()) {
      throw new Error("Vídeo não encontrado");
    }

    const video = videoSnapshot.val();

    // Validar se o vídeo tem a propriedade order
    if (!video || typeof video !== 'object') {
      throw new Error("Dados do vídeo inválidos");
    }

    const videoOrder = video.order ?? 0;
    await remove(videoRef);

    // Buscar vídeos atualizados após a remoção
    const allVideos = await fetchCourseVideos(courseId);

    // Reordenar os vídeos remanescentes (fechar o "buraco" na ordem global).
    //
    // IMPORTANTE: NÃO apagamos o progresso (videoProgress) deste vídeo dos
    // alunos. O progresso do curso é recalculado a partir da lista de conteúdo
    // carregada (updateCourseProgress em classes.jsx), que já não inclui itens
    // deletados — então nós de progresso "órfãos" não inflam o progresso. Apagá-
    // los era destrutivo: um professor que deletava um vídeo para recadastrar
    // uma versão corrigida eliminava silenciosamente o progresso de TODOS os
    // alunos naquele vídeo, sem chance de recuperação.
    const updates = {};

    // Atualizar a ordem de cada vídeo remanescente
    allVideos.forEach(v => {
      if (v && v.order !== undefined && v.order > videoOrder) {
        updates[`courseVideos/${courseId}/${v.id}/order`] = v.order - 1;
      }
    });

    // Aplicar as atualizações se houver alguma
    if (Object.keys(updates).length > 0) {
      await update(ref(database), updates);
    }

    // O progresso agregado de cada aluno é reconciliado no próximo carregamento
    // do curso (updateCourseProgress, com a lista completa e a definição única).
    // Não fazemos recálculo em massa aqui: o antigo recalcCourseProgressFromWatched
    // considerava só os vídeos legados como universo, ignorando courseContent e
    // slides, o que gerava um agregado errado até o aluno reabrir o curso.

    return true;
  } catch (error) {
    console.error("Erro ao excluir vídeo:", error);
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
  // Validar entrada
  if (!video || typeof video !== 'object') return false;
  if (!videos || !Array.isArray(videos)) return false;
  
  // Encontrar o índice do vídeo atual
  const currentIndex = videos.findIndex(v => v && v.id === video.id);
  if (currentIndex <= 0) return false; // O primeiro vídeo nunca está bloqueado
  
  const previousVideo = videos[currentIndex - 1];
  
  // Validar vídeo anterior
  if (!previousVideo || typeof previousVideo !== 'object') return false;
  
  // Um vídeo está bloqueado se requerer o anterior E
  // o anterior não foi assistido OU tem um quiz não concluído.
  //
  // Exceção: um quiz cuja janela já ENCERROU (`quizClosed`) não trava mais nada.
  // Quem perdeu o prazo não tem como fazê-lo, e prender o aluno no resto do
  // curso por causa disso seria uma punição sem saída. Não assistir ao vídeo
  // anterior continua travando — o prazo do quiz não desculpa isso.
  //
  // Coage para booleano: sem o `!!`, a expressão pode devolver null/"" (ex.:
  // quizId ausente), o que funciona como "falsy" na UI mas suja o contrato.
  return !!(
    video.requiresPrevious === true &&
    previousVideo &&
    (!previousVideo.watched ||
      (previousVideo.quizId &&
        !previousVideo.quizPassed &&
        !previousVideo.quizClosed))
  );
};