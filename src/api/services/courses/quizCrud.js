import { ref, set, get, update } from "firebase/database";
import { database } from "../../config/firebase";
import {
  normalizeDiagnosticFlag,
  normalizeAllowRetry,
  normalizeMaxAttempts,
  normalizeQuizDate,
  persistableQuizSettings,
} from "./quizWindow";

/**
 * ==============================
 * FUNÇÕES DE ADMINISTRAÇÃO DE QUIZZES
 * ==============================
 */

/**
 * Adiciona um novo quiz para um vídeo específico
 * @param {string} courseId - ID do curso
 * @param {string} videoId - ID do vídeo
 * @param {number} minPercentage - Porcentagem mínima para aprovação
 * @param {{ openDate?: string, closeDate?: string }} [schedule] - Janela de
 *   disponibilidade (datas ISO; vazio = sem restrição)
 * @returns {Promise<Object>} - Novo quiz criado
 */
export const addQuiz = async (
  courseId,
  videoId,
  minPercentage = 0,
  isDiagnostic = false,
  allowRetry = true,
  maxAttempts = null,
  schedule = {}
) => {
  try {
    if (!courseId || !videoId) {
      throw new Error("IDs de curso e vídeo são obrigatórios");
    }

    const quizRef = ref(database, `courseQuizzes/${courseId}/${videoId}`);
    const snapshot = await get(quizRef);

    if (snapshot.exists()) {
      throw new Error("Já existe um quiz associado a este vídeo");
    }

    const newQuiz = {
      videoId,
      minPercentage,
      isDiagnostic: normalizeDiagnosticFlag(isDiagnostic),
      // Config de tentativas (padrão: permite repetição, sem limite) e janela
      // de disponibilidade (padrão: sempre aberto).
      ...persistableQuizSettings({
        allowRetry,
        maxAttempts,
        openDate: schedule?.openDate,
        closeDate: schedule?.closeDate,
      }),
      questions: [],
      courseId,
    };

    await set(quizRef, newQuiz);
    return newQuiz;
  } catch (error) {
    console.error("Erro ao adicionar quiz:", error);
    throw error;
  }
};

/**
 * Remove um quiz existente
 * @param {string} courseId - ID do curso
 * @param {string} videoId - ID do vídeo
 * @returns {Promise<boolean>} - Verdadeiro se a operação foi bem-sucedida
 */
export const removeQuiz = async (courseId, videoId) => {
  try {
    if (!courseId || !videoId) {
      throw new Error("IDs de curso e vídeo são obrigatórios");
    }

    // O quiz é chaveado por videoId (quizId === videoId). Ao removê-lo precisamos
    // limpar, em cascata, todos os nós de resultado que o referenciam — caso
    // contrário ficam órfãos no banco e poluem agregações/rankings.
    const updates = {};

    // O próprio quiz e os resultados chaveados por courseId/quizId
    updates[`courseQuizzes/${courseId}/${videoId}`] = null;
    updates[`customQuizResults/${courseId}/${videoId}`] = null;
    updates[`liveQuizResults/${courseId}/${videoId}`] = null;
    updates[`openEndedAnswers/${courseId}/${videoId}`] = null;
    updates[`quizGigi/${courseId}/${videoId}`] = null;

    // Resultados por usuário: quizResults/{userId}/{courseId}/{quizId}
    const quizResultsSnapshot = await get(ref(database, `quizResults`));
    const quizResultsData = quizResultsSnapshot.val();
    if (quizResultsData) {
      Object.keys(quizResultsData).forEach((uid) => {
        if (
          quizResultsData[uid] &&
          quizResultsData[uid][courseId] &&
          quizResultsData[uid][courseId][videoId] !== undefined
        ) {
          updates[`quizResults/${uid}/${courseId}/${videoId}`] = null;
        }
      });
    }

    // Desvincular o quiz de quaisquer slides que o referenciem (slide.quizId)
    const slidesSnapshot = await get(ref(database, `courseSlides/${courseId}`));
    const slidesData = slidesSnapshot.val();
    if (slidesData) {
      Object.keys(slidesData).forEach((slideId) => {
        if (slidesData[slideId] && slidesData[slideId].quizId === videoId) {
          updates[`courseSlides/${courseId}/${slideId}/quizId`] = null;
        }
      });
    }

    // Remove tudo de uma vez (atômico)
    await update(ref(database), updates);
    return true;
  } catch (error) {
    console.error("Erro ao remover quiz:", error);
    throw error;
  }
};

/**
 * Exclui um quiz (alias para removeQuiz)
 * @param {string} courseId - ID do curso
 * @param {string} videoId - ID do vídeo
 * @returns {Promise<boolean>} - Verdadeiro se bem-sucedido
 */
export const deleteQuiz = async (courseId, videoId) => {
  return await removeQuiz(courseId, videoId);
};

/**
 * Atualiza a nota mínima de um quiz
 * @param {string} courseId - ID do curso
 * @param {Object} quiz - Quiz para atualizar a nota mínima
 * @param {number} minPercentage - Nova nota mínima
 * @returns {Promise<Object>} - Quiz atualizado
 */
export const updateQuizMinPercentage = async (
  courseId,
  quiz,
  minPercentage
) => {
  try {
    if (!courseId || !quiz) {
      throw new Error("Parâmetros inválidos para atualizar nota mínima");
    }

    const { videoId } = quiz;

    const updatedQuiz = {
      ...quiz,
      minPercentage,
    };

    // Atualizar no Firebase
    const quizRef = ref(database, `courseQuizzes/${courseId}/${videoId}`);
    await update(quizRef, { minPercentage });

    return updatedQuiz;
  } catch (error) {
    console.error("Erro ao atualizar nota mínima:", error);
    throw error;
  }
};


/**
 * Atualiza o status de quiz diagnóstico
 * @param {string} courseId - ID do curso
 * @param {Object} quiz - Quiz para atualizar
 * @param {boolean} isDiagnostic - Se o quiz é diagnóstico
 * @returns {Promise<Object>} - Quiz atualizado
 */
export const updateQuizDiagnosticStatus = async (courseId, quiz, isDiagnostic) => {
  try {
    if (!courseId || !quiz) {
      throw new Error("Parâmetros inválidos para atualizar status diagnóstico");
    }

    const { videoId } = quiz;

    const updatedQuiz = {
      ...quiz,
      isDiagnostic: normalizeDiagnosticFlag(isDiagnostic),
    };

    // Atualizar no Firebase
    const quizRef = ref(database, `courseQuizzes/${courseId}/${videoId}`);
    await update(quizRef, { isDiagnostic: normalizeDiagnosticFlag(isDiagnostic) });

    return updatedQuiz;
  } catch (error) {
    console.error("Erro ao atualizar status diagnóstico:", error);
    throw error;
  }
};

/**
 * Atualiza a configuração de tentativas de um quiz (permitir repetição e o
 * limite máximo de tentativas).
 * @param {string} courseId - ID do curso
 * @param {Object} quiz - Quiz a atualizar
 * @param {{ allowRetry: boolean, maxAttempts: (number|string|null) }} settings
 * @returns {Promise<Object>} - Quiz atualizado
 */
export const updateQuizRetrySettings = async (
  courseId,
  quiz,
  { allowRetry, maxAttempts } = {}
) => {
  try {
    if (!courseId || !quiz) {
      throw new Error("Parâmetros inválidos para atualizar tentativas do quiz");
    }

    const { videoId } = quiz;
    const normalizedAllowRetry = normalizeAllowRetry(allowRetry);
    // Se a repetição estiver desativada, o limite não se aplica.
    const normalizedMaxAttempts = normalizedAllowRetry
      ? normalizeMaxAttempts(maxAttempts)
      : null;

    const updatedQuiz = {
      ...quiz,
      allowRetry: normalizedAllowRetry,
      maxAttempts: normalizedMaxAttempts,
    };

    // Atualizar no Firebase. `maxAttempts: null` remove a chave no RTDB, o que
    // representa "tentativas ilimitadas".
    const quizRef = ref(database, `courseQuizzes/${courseId}/${videoId}`);
    await update(quizRef, {
      allowRetry: normalizedAllowRetry,
      maxAttempts: normalizedMaxAttempts,
    });

    return updatedQuiz;
  } catch (error) {
    console.error("Erro ao atualizar tentativas do quiz:", error);
    throw error;
  }
};

/**
 * Atualiza a janela de disponibilidade de um quiz (abertura e encerramento).
 * @param {string} courseId - ID do curso
 * @param {Object} quiz - Quiz a atualizar
 * @param {{ openDate: (string|null), closeDate: (string|null) }} schedule
 * @returns {Promise<Object>} - Quiz atualizado
 */
export const updateQuizSchedule = async (
  courseId,
  quiz,
  { openDate, closeDate } = {}
) => {
  try {
    if (!courseId || !quiz) {
      throw new Error("Parâmetros inválidos para atualizar a janela do quiz");
    }

    const normalizedOpen = normalizeQuizDate(openDate);
    const normalizedClose = normalizeQuizDate(closeDate);

    if (
      normalizedOpen &&
      normalizedClose &&
      new Date(normalizedOpen).getTime() >= new Date(normalizedClose).getTime()
    ) {
      throw new Error(
        "A data de abertura deve ser anterior à data de encerramento."
      );
    }

    const updatedQuiz = {
      ...quiz,
      openDate: normalizedOpen,
      closeDate: normalizedClose,
    };

    // `null` remove a chave no RTDB, o que representa "sem restrição".
    const quizRef = ref(database, `courseQuizzes/${courseId}/${quiz.videoId}`);
    await update(quizRef, {
      openDate: normalizedOpen || null,
      closeDate: normalizedClose || null,
    });

    return updatedQuiz;
  } catch (error) {
    console.error("Erro ao atualizar a janela do quiz:", error);
    throw error;
  }
};

/**
 * Salva todos os quizzes de um curso
 * @param {string} courseId - ID do curso
 * @param {Array} quizzes - Array de quizzes
 * @param {string} newCourseId - ID do novo curso (opcional, para cópia)
 * @returns {Promise<boolean>} - Verdadeiro se a operação foi bem-sucedida
 */
export const saveAllCourseQuizzes = async (
  courseId,
  quizzes,
  newCourseId = null
) => {
  try {
    const targetCourseId = newCourseId || courseId;

    for (const quiz of quizzes) {
      const quizData = {
        questions: quiz.questions,
        minPercentage: quiz.minPercentage,
        isDiagnostic: normalizeDiagnosticFlag(quiz.isDiagnostic),
        ...persistableQuizSettings(quiz),
        courseId: targetCourseId,
        videoId: quiz.videoId,
      };

      const quizRef = ref(
        database,
        `courseQuizzes/${targetCourseId}/${quiz.videoId}`
      );
      await set(quizRef, quizData);
    }

    return true;
  } catch (error) {
    console.error("Erro ao salvar todos os quizzes:", error);
    throw error;
  }
};

/**
 * Salva um quiz novo ou atualiza um existente
 * @param {string} courseId - ID do curso
 * @param {string} videoId - ID do vídeo
 * @param {Object} quizData - Dados do quiz
 * @returns {Promise<boolean>} - Verdadeiro se bem-sucedido
 */
export const saveQuiz = async (courseId, videoId, quizData) => {
  try {
    const quizRef = ref(database, `courseQuizzes/${courseId}/${videoId}`);
    await set(quizRef, {
      questions: quizData.questions,
      minPercentage: quizData.minPercentage,
      isDiagnostic: normalizeDiagnosticFlag(quizData.isDiagnostic),
      ...persistableQuizSettings(quizData),
      courseId: courseId,
      videoId: videoId,
    });

    return true;
  } catch (error) {
    console.error("Erro ao salvar quiz:", error);
    throw error;
  }
};
