import { fetchCourseVideos } from "./videos";
import { fetchCourseDetails } from "./courses";
import { fetchCourseSlides } from "./slides";
import { updateCourseProgress } from "./students";
import {
  fetchQuizQuestions,
  validateQuizAnswers,
  fetchUserQuizResults,
  fetchCourseQuizzes,
  markQuizAsCompleted,
} from "./quizzes";
import {
  saveVideoProgress,
  markVideoAsCompleted,
  fetchVideoProgress,
  getLocalVideoProgress,
} from "./videoProgress";

/**
 * Carrega todos os dados necessários para a página de aulas
 * @param {string} courseId - ID do curso
 * @param {object} userDetails - Detalhes do usuário logado
 * @param {string} currentVideoId - ID do vídeo atual (opcional)
 * @returns {Promise<object>} - Dados processados do curso
 */
export const loadCourseData = async (
  courseId,
  userDetails,
  currentVideoId = null
) => {
  try {
    if (!courseId) {
      throw new Error("ID do curso é obrigatório");
    }

    // Buscar dados do curso
    const courseData = await fetchCourseDetails(courseId);

    // Buscar vídeos do curso
    const courseVideos = await fetchCourseVideos(courseId);

    // Buscar quizzes do curso
    const quizzesData = await fetchCourseQuizzes(courseId);

    // Buscar resultados de quizzes do usuário se estiver logado
    let userQuizzesResults = {};
    if (userDetails?.userId) {
      userQuizzesResults =
        (await fetchUserQuizResults(userDetails.userId, courseId)) || {};
    }

    // Processamento de vídeos
    const processedVideos = await Promise.all(
      courseVideos.map(async (video) => {
        const quizData = quizzesData[video.id] || null;

        // Obter progresso do vídeo
        let userProgress = {};
        if (userDetails?.userId) {
          try {
            userProgress = await fetchVideoProgress(
              userDetails.userId,
              courseId,
              video.id
            );
          } catch (error) {
            console.error(
              `Erro ao buscar progresso do vídeo ${video.id}:`,
              error
            );
          }
        } else {
          // Usar progresso local se não estiver logado
          const localProgress = getLocalVideoProgress();
          userProgress = localProgress[video.id] || {};
        }

        // Status de aprovação no quiz
        const quizPassed =
          userQuizzesResults?.[video.id]?.isPassed ||
          userQuizzesResults?.[video.id]?.passed ||
          false;

        return {
          ...video,
          watched: userProgress.watched || false,
          quizPassed: quizPassed,
          watchedTime: userProgress.watchedTime || 0,
          progress: userProgress.percentageWatched || 0,
          quizId: quizData ? `${courseId}/${video.id}` : null,
          minPercentage: quizData ? quizData.minPercentage : 70,
        };
      })
    );

    // Ordenar vídeos por ordem
    const sortedVideos = processedVideos.sort((a, b) => a.order - b.order);

    // Atualizar progresso do curso se usuário estiver logado
    if (userDetails?.userId) {
      updateCourseProgress(userDetails.userId, courseId, sortedVideos);
    }

    // Definir vídeo atual se não foi especificado
    let nextVideoId = currentVideoId;
    if (!nextVideoId && sortedVideos.length > 0) {
      const nextVideo =
        sortedVideos.find(
          (video) => !video.watched || (video.quizId && !video.quizPassed)
        ) || sortedVideos[0];
      nextVideoId = nextVideo.id;
    }

    return {
      courseData,
      videos: sortedVideos,
      userQuizzesResults,
      nextVideoId,
      courseTitle: courseData?.title || "Curso sem título",
      courseOwnerUid: courseData?.userId || "",
    };
  } catch (error) {
    console.error("Erro ao carregar dados do curso:", error);
    throw error;
  }
};

/**
 * Salva progresso de vídeo e verifica se deve notificar sobre urgência
 * @param {object} userData - Dados do usuário e do vídeo atual
 * @returns {Promise<object>} - Resultado da operação
 */
export const saveVideoProgressWithUrgency = async (userData) => {
  const { userId, courseId, videoId, currentTime, duration, urgent } = userData;

  try {
    if (urgent) {
      // Salvar localmente para recuperação em caso de saída brusca
      localStorage.setItem("lastVideoProgress", JSON.stringify(userData));
    }

    // Salvar no Firebase
    if (userId && courseId && videoId && currentTime > 0 && duration > 0) {
      return await saveVideoProgress(
        userId,
        courseId,
        videoId,
        currentTime,
        duration
      );
    }

    return {
      success: false,
      error: "Dados insuficientes para salvar progresso",
    };
  } catch (error) {
    console.error("Erro ao salvar progresso com urgência:", error);
    throw error;
  }
};

/**
 * Processa a conclusão de um quiz
 * @param {boolean} isPassed - Se o usuário passou no quiz
 * @param {string} userId - ID do usuário
 * @param {string} courseId - ID do curso
 * @param {string} videoId - ID do vídeo
 * @param {number} duration - Duração do vídeo
 * @returns {Promise<object>} - Resultados atualizados e status
 */
export const processQuizCompletion = async (
  isPassed,
  userId,
  courseId,
  videoId,
  duration,
  isSlide = false
) => {
  try {
    if (isPassed) {
      // Para slides, salvar em uma estrutura específica ou usar o mesmo caminho
      // Marcar como concluído (vídeo ou slide)
      await markVideoAsCompleted(userId, courseId, videoId, duration);

      // Marcar quiz como concluído
      const quizResult = {
        isPassed: true,
        completedAt: new Date().toISOString(),
        isSlide: isSlide, // Marcando se é um quiz de slide para referência futura
      };
      await markQuizAsCompleted(userId, courseId, videoId, quizResult);

      // Buscar resultados atualizados
      const attempts = await fetchUserQuizResults(userId, courseId);

      return {
        success: true,
        attempts,
      };
    }

    return {
      success: false,
      attempts: null,
    };
  } catch (error) {
    console.error("Erro ao processar conclusão do quiz:", error);
    throw error;
  }
};

/**
 * Verifica se o curso foi concluído
 * @param {Array} videos - Lista de vídeos com status
 * @param {string} userId - ID do usuário
 * @param {string} courseId - ID do curso
 * @returns {Promise<boolean>} - Se o curso foi concluído
 */
export const checkCourseCompletion = async (videos, userId, courseId) => {
  try {
    if (!videos || videos.length === 0) return false;

    // Filtrar apenas conteúdos reais do curso (não independentes, a menos que tenham quiz)
    const courseContent = videos.filter(
      (v) => !v.isIndependent || (v.isIndependent && v.quizId)
    );

    const totalContent = courseContent.length;
    const completedContent = courseContent.filter(
      (v) => v.watched && (!v.quizId || v.quizPassed)
    ).length;

    const progressPercentage = (completedContent / totalContent) * 100;

    if (progressPercentage === 100) {
      if (userId) {
        // Passar o array de vídeos em vez do percentual
        await updateCourseProgress(userId, courseId, videos);
      }
      return true;
    }

    return false;
  } catch (error) {
    console.error("Erro ao verificar conclusão do curso:", error);
    return false;
  }
};

/**
 * Carrega os slides associados a um curso
 * @param {string} courseId - ID do curso
 * @returns {Promise<Array>} - Lista de slides do curso
 */
export const loadCourseSlides = async (courseId) => {
  try {
    if (!courseId) return [];

    const slides = await fetchCourseSlides(courseId);

    // Formatar slides para exibição na lista e no player
    return slides.map((slide) => ({
      ...slide,
      id: slide.id,
      isSlide: true,
      type: "slide",
      title: slide.title,
      description: slide.description || "",
      url: slide.url,
      watched: true,
      progress: 1, // Slides são sempre considerados 100% vistos
      thumbnail: "https://img.icons8.com/color/96/000000/google-slides.png",
    }));
  } catch (error) {
    console.error("Erro ao carregar slides:", error);
    return [];
  }
};

/**
 * Busca e prepara dados de quiz para exibição
 * @param {string} quizId - ID do quiz
 * @returns {Promise<object>} - Dados do quiz
 */
export const loadQuizData = async (quizId) => {
  try {
    if (!quizId) {
      throw new Error("ID do quiz é obrigatório");
    }

    const quiz = await fetchQuizQuestions(quizId);
    return quiz;
  } catch (error) {
    console.error("Erro ao carregar dados do quiz:", error);
    throw error;
  }
};

/**
 * Recupera progresso não salvo de sessão anterior
 */
export const recoverUnsavedProgress = async (courseId, userId) => {
  try {
    const savedProgressString = localStorage.getItem("lastVideoProgress");
    if (!savedProgressString) return false;

    const savedProgress = JSON.parse(savedProgressString);

    // Verificar se os dados são válidos e pertencem ao curso/usuário atual
    if (
      savedProgress.courseId === courseId &&
      savedProgress.userId === userId &&
      savedProgress.urgent
    ) {
      // Salvar no Firebase
      await saveVideoProgress(
        savedProgress.userId,
        savedProgress.courseId,
        savedProgress.videoId,
        savedProgress.currentTime,
        savedProgress.duration
      );

      // Limpar flag de urgência
      localStorage.setItem(
        "lastVideoProgress",
        JSON.stringify({
          ...savedProgress,
          urgent: false,
        })
      );

      return true;
    }

    return false;
  } catch (error) {
    console.error("Erro ao recuperar progresso anterior:", error);
    return false;
  }
};

/**
 * Busca slides do curso organizados independentemente
 * @param {string} courseId - ID do curso
 * @returns {Promise<Object>} - Slides organizados
 */
export const fetchIndependentCourseSlides = async (courseId) => {
  try {
    if (!courseId) return {};

    const slides = await fetchCourseSlides(courseId);

    // Coloque todos os slides na categoria 'independent_slides'
    const result = {
      independent_slides: slides,
    };

    return result;
  } catch (error) {
    console.error("Erro ao buscar slides independentes:", error);
    return {};
  }
};
