import { ref as databaseRef, set, get, update } from "firebase/database";
import { database } from "../../config/firebase";
import { isNearEnd } from "../../utils/videoUtils";

/**
 * Salva o progresso atual de um vídeo no Firebase
 * @param {string} userId - ID do usuário
 * @param {string} courseId - ID do curso
 * @param {string} videoId - ID do vídeo
 * @param {number} currentTime - Tempo atual do vídeo
 * @param {number} duration - Duração total do vídeo
 * @param {Object} videoState - Estado do vídeo
 * @returns {Promise<Object>} - Resultado da operação
 */
export const saveVideoProgress = async (
  userId,
  courseId,
  videoId,
  currentTime,
  duration,
  videoState = {}
) => {
  try {

    if (!userId || !courseId || !videoId || !duration) {
      console.warn("Missing required parameters:", {
        userId,
        courseId,
        videoId,
        currentTime,
        duration,
      });
      return { success: false, error: "Parâmetros insuficientes" };
    }

    let currentPercentage = Math.floor((currentTime / duration) * 100);

    // Arredonda para o múltiplo de 10 mais próximo (para baixo)
    let newPercentage = Math.floor(currentPercentage / 10) * 10;

    if (videoState.lastSaved10Percentage) {
      newPercentage = Math.max(newPercentage, videoState.lastSaved10Percentage);
    }

    // Verificar se já existe um registro anterior no Firebase
    const progressRef = databaseRef(
      database,
      `videoProgress/${userId}/${courseId}/${videoId}`
    );
    const snapshot = await get(progressRef);

    let currentDbPercentage = 0;

    if (snapshot.exists()) {
      const data = snapshot.val();
      currentDbPercentage = data.percentageWatched || 0;
    }

    // Usa o maior valor entre o atual e o do banco
    newPercentage = Math.max(newPercentage, currentDbPercentage);

    // Se for 100%, mantém 100% sem arredondar
    if (currentPercentage >= 100 || isNearEnd(currentTime, duration)) {
      newPercentage = 100;
      videoState.videoCompleted = true;
    }

    const progressData = {
      watchedTimeInSeconds: currentTime,
      percentageWatched: newPercentage,
      watched: newPercentage >= 90,
      lastUpdated: new Date().toISOString(),
      completed: newPercentage >= 100,
      videoId: videoId,
    };


    // Salva no banco
    const userProgressRef = databaseRef(
      database,
      `videoProgress/${userId}/${courseId}`
    );
    await update(userProgressRef, {
      [videoId]: progressData,
    });

    // Verify the data was saved
    const verifySnapshot = await get(progressRef);
    if (verifySnapshot.exists()) {
    } else {
      console.warn(
        "⚠️ Failed to verify saved data - snapshot does not exist after save"
      );
    }

    return {
      success: true,
      newPercentage,
      isCompleted: newPercentage >= 100,
      hasReached90Percent: newPercentage >= 90,
    };
  } catch (error) {
    console.error("❌ Error saving progress to Firebase:", error);
    console.error(
      "Error details:",
      JSON.stringify(error, Object.getOwnPropertyNames(error))
    );
    return { success: false, error: error.message };
  }
};

/**
 * Busca o progresso de um vídeo do Firebase
 * @param {string} userId - ID do usuário
 * @param {string} courseId - ID do curso
 * @param {string} videoId - ID do vídeo
 * @returns {Promise<Object>} - Dados de progresso
 */
export const fetchVideoProgress = async (userId, courseId, videoId) => {
  try {
    if (!userId || !courseId || !videoId) {
      console.warn("Missing required parameters for fetchVideoProgress");
      return { watchedTime: 0, percentageWatched: 0 };
    }

    const progressRef = databaseRef(
      database,
      `videoProgress/${userId}/${courseId}/${videoId}`
    );
    const snapshot = await get(progressRef);

    if (snapshot.exists()) {
      const data = snapshot.val();
      return {
        watchedTime: data.watchedTimeInSeconds || 0,
        percentageWatched: data.percentageWatched || 0,
        watched: data.watched || false,
        completed: data.completed || false,
        quizPassed: data.quizPassed || false,
      };
    }

    return {
      watchedTime: 0,
      percentageWatched: 0,
      watched: false,
      completed: false,
      quizPassed: false,
    };
  } catch (error) {
    console.error("Erro ao buscar progresso:", error);
    return {
      watchedTime: 0,
      percentageWatched: 0,
      watched: false,
      completed: false,
      quizPassed: false,
    };
  }
};

/**
 * Marca um vídeo como assistido (ao atingir 100% ou próximo do final)
 * @param {string} userId - ID do usuário
 * @param {string} courseId - ID do curso
 * @param {string} videoId - ID do vídeo
 * @param {number} duration - Duração total do vídeo
 * @returns {Promise<Object>} - Resultado da operação
 */
export const markVideoAsCompleted = async (
  userId,
  courseId,
  videoId,
  duration
) => {
  try {
    const progressRef = databaseRef(
      database,
      `videoProgress/${userId}/${courseId}/${videoId}`
    );

    const progressData = {
      watchedTimeInSeconds: duration,
      percentageWatched: 100,
      watched: true,
      lastUpdated: new Date().toISOString(),
      completed: true,
      videoId: videoId,
    };

    await set(progressRef, progressData);

    return { success: true };
  } catch (error) {
    console.error("Erro ao marcar vídeo como concluído:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Monitora e processa o estado do player para calcular o progresso
 * @param {Object} player - Referência ao player de vídeo
 * @param {Object} videoState - Estado do vídeo
 * @returns {Object} - Informações sobre o progresso atual
 */
export const processPlayerState = (player, videoState = {}) => {
  try {
    if (!player) return null;

    // Obter valores do player
    const duration = player.getDuration() || 0;
    const currentTime = player.getCurrentTime() || 0;

    if (duration <= 0) return null;

    // Verificar se houve um seek significativo
    const timeDifference = Math.abs(currentTime - (videoState.lastTime || 0));
    const isSeek = timeDifference > 2; // Um seek é detectado se a diferença for maior que 2 segundos

    // Atualizar lastTime
    videoState.lastTime = currentTime;

    // Calcular o percentual atual
    const nearEnd = isNearEnd(currentTime, duration);
    const newPercentage = nearEnd
      ? 100
      : Math.min(100, Math.floor((currentTime / duration) * 100));

    return {
      currentTime,
      duration,
      percentage: newPercentage,
      isSeek,
      isNearEnd: nearEnd,
      shouldUpdate:
        newPercentage > (videoState.percentageWatched || 0) || isSeek,
    };
  } catch (error) {
    console.error("Erro ao processar estado do player:", error);
    return null;
  }
};

/**
 * Processa o progresso armazenado localmente na sessão
 * @returns {Object} - Objeto com o progresso dos vídeos
 */
export const getLocalVideoProgress = () => {
  try {
    const storedProgress = sessionStorage.getItem("videoProgress");
    if (!storedProgress) {
      return {};
    }

    const progressArray = JSON.parse(storedProgress);
    return progressArray.reduce(
      (acc, video) => ({
        ...acc,
        [video.id]: {
          watched: video.watched,
          watchedTimeInSeconds: video.watchedTime,
          percentageWatched: video.progress,
          quizPassed: video.quizPassed,
        },
      }),
      {}
    );
  } catch (error) {
    console.error("Erro ao processar progresso local:", error);
    return {};
  }
};
