import { database } from "../../config/firebase";
import { ref, push, serverTimestamp, set, get } from "firebase/database";

/**
 * Obtém o próximo número de reporte de forma simples
 * @returns {Promise<number>} - Próximo número para o reporte
 */
const getNextReportNumber = async () => {
  try {
    const reportsRef = ref(database, "reports");
    const snapshot = await get(reportsRef);

    // Se não existirem reportes, começamos do 1
    if (!snapshot.exists()) return 1;

    // Conta o número de reportes existentes e adiciona 1
    return Object.keys(snapshot.val()).length + 1;
  } catch (error) {
    console.error("Erro ao obter número do reporte:", error);
    // Fallback: timestamp como número
    return Date.now();
  }
};

/**
 * Busca informações adicionais do vídeo ou quiz
 * @param {string} type - Tipo de conteúdo (video ou quiz)
 * @param {string} itemId - ID do item
 * @param {string} courseId - ID do curso
 * @returns {Promise<object>} - Informações do conteúdo
 */
const fetchContentDetails = async (type, itemId, courseId) => {
  try {
    if (!itemId || !courseId) return {};

    if (type === "video") {
      const videoRef = ref(database, `courses/${courseId}/videos/${itemId}`);
      const snapshot = await get(videoRef);

      if (snapshot.exists()) {
        const videoData = snapshot.val();
        return {
          contentTitle: videoData.title || "Vídeo sem título",
          contentUrl: videoData.url || null,
        };
      }
    } else if (type === "quiz") {
      const quizRef = ref(database, `courses/${courseId}/quizzes/${itemId}`);
      const snapshot = await get(quizRef);

      if (snapshot.exists()) {
        const quizData = snapshot.val();
        return {
          contentTitle: quizData.title || "Quiz sem título",
          questionCount: quizData.questions?.length || 0,
        };
      }
    }

    return {};
  } catch (error) {
    console.error(`Erro ao buscar detalhes do ${type}:`, error);
    return {};
  }
};

/**
 * Busca informações do curso e do progresso do usuário
 * @param {string} courseId - ID do curso
 * @param {string} userId - ID do usuário
 * @returns {Promise<object>} - Informações do curso e progresso
 */
const fetchCourseAndProgress = async (courseId, userId) => {
  try {
    if (!courseId) return {};

    // Informações do curso
    const courseData = {};
    const courseRef = ref(database, `courses/${courseId}`);
    const courseSnapshot = await get(courseRef);

    if (courseSnapshot.exists()) {
      const course = courseSnapshot.val();
      courseData.courseName = course.title || "Curso sem título";
      courseData.courseInstructor =
        course.ownerName || "Instrutor desconhecido";
    }

    // Progresso do usuário no curso
    if (userId && userId !== "anonymous") {
      const progressRef = ref(database, `courseProgress/${courseId}/${userId}`);
      const progressSnapshot = await get(progressRef);

      if (progressSnapshot.exists()) {
        const progress = progressSnapshot.val();

        // Calcular o status do curso baseado no progresso
        let courseStatus = "não iniciado";
        let percentComplete = 0;

        if (progress.totalVideos && progress.watchedVideos) {
          percentComplete = Math.round(
            (progress.watchedVideos / progress.totalVideos) * 100
          );

          if (percentComplete === 0) courseStatus = "não iniciado";
          else if (percentComplete === 100) courseStatus = "concluído";
          else courseStatus = "em andamento";
        }

        courseData.userProgress = {
          percentComplete,
          status: courseStatus,
          videosWatched: progress.watchedVideos || 0,
          totalVideos: progress.totalVideos || 0,
          lastActivity: progress.lastActivity || null,
        };
      } else {
        courseData.userProgress = {
          percentComplete: 0,
          status: "não iniciado",
        };
      }
    }

    return courseData;
  } catch (error) {
    console.error("Erro ao buscar detalhes do curso:", error);
    return {};
  }
};

/**
 * Remove propriedades undefined ou null de um objeto
 * @param {object} obj - Objeto a ser sanitizado
 * @returns {object} - Objeto limpo
 */
const sanitizeForFirebase = (obj) => {
  const sanitized = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

/**
 * Busca informações adicionais do usuário
 * @param {string} userId - ID do usuário
 * @returns {Promise<object>} - Dados complementares do usuário
 */
const fetchUserDetails = async (userId) => {
  try {
    if (!userId || userId === "anonymous") {
      return {
        userType: "anônimo",
      };
    }

    const userRef = ref(database, `users/${userId}`);
    const snapshot = await get(userRef);

    if (snapshot.exists()) {
      const userData = snapshot.val();
      return {
        userEmail: userData.email || null,
        userPhotoURL: userData.photoURL || null,
        userType: userData.type || "estudante",
        userCreatedAt: userData.createdAt || null,
      };
    }

    return {};
  } catch (error) {
    console.error("Erro ao buscar detalhes do usuário:", error);
    return {};
  }
};

/**
 * Envia um reporte para o banco de dados
 * @param {object} reportData - Dados do reporte
 * @returns {Promise<object>} - Resultado da operação
 */
export const sendReport = async (reportData) => {
  try {
    if (!reportData.message || !reportData.type) {
      return {
        success: false,
        message: "Dados incompletos. Mensagem e tipo são obrigatórios.",
      };
    }

    // Obter número simples para o reporte
    const reportNumber = await getNextReportNumber();

    // Dados sanitizados do reporte original
    const sanitizedReportData = sanitizeForFirebase(reportData);

    // Buscar dados adicionais
    const contentDetails = await fetchContentDetails(
      reportData.type,
      reportData.itemId,
      reportData.courseId
    );

    const courseDetails = await fetchCourseAndProgress(
      reportData.courseId,
      reportData.userId
    );

    const userDetails = await fetchUserDetails(reportData.userId);

    // Detalhes específicos da questão (para quiz)
    let questionDetails = {};
    if (
      reportData.type === "quiz" &&
      reportData.currentQuestionIndex !== undefined &&
      reportData.currentQuestionIndex !== null
    ) {
      questionDetails = {
        questionNumber: parseInt(reportData.currentQuestionIndex) + 1,
        questionTitle: reportData.questionTitle || "Questão sem título",
      };
    }

    // Criar o reporte completo com um nome simples
    const reportsRef = ref(database, "reports");
    const newReportRef = push(reportsRef);

    // Montar o objeto final, sanitizado
    const report = sanitizeForFirebase({
      ...sanitizedReportData,
      ...contentDetails,
      ...courseDetails,
      ...userDetails,
      ...questionDetails,
      reportName: `Reporte ${reportNumber}`,
      status: "pendente",
      createdAt: serverTimestamp(),
      readableDate: new Date().toISOString(),
    });

    // Salvar no banco
    await set(newReportRef, report);


    return {
      success: true,
      reportNumber: reportNumber,
      key: newReportRef.key,
    };
  } catch (error) {
    console.error("Erro ao enviar reporte:", error);
    return {
      success: false,
      message: "Erro ao enviar reporte. Tente novamente mais tarde.",
    };
  }
};
