import { database } from "../../config/firebase";
import { ref, serverTimestamp, set, get } from "firebase/database";
import { sendReportEmail } from "../emailService";

/**
 * Obtém o próximo número de reporte
 * @returns {Promise<number>} - Próximo número sequencial
 */
const getNextReportNumber = async () => {
  try {
    const reportsRef = ref(database, "reports");
    const snapshot = await get(reportsRef);

    if (!snapshot.exists()) return 1;

    const reports = snapshot.val();
    const numbers = Object.values(reports)
      .map(report => report.reportNumber || 0)
      .filter(num => num > 0);

    return numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  } catch (error) {
    console.error("Erro ao obter número do reporte:", error);
    return Date.now();
  }
};

/**
 * Busca informações do curso
 * @param {string} courseId - ID do curso
 * @returns {Promise<object>} - Dados do curso
 */
const fetchCourseDetails = async (courseId) => {
  try {
    if (!courseId) return {};

    const courseRef = ref(database, `courses/${courseId}`);
    const snapshot = await get(courseRef);

    if (snapshot.exists()) {
      const course = snapshot.val();
      return {
        courseTitle: course.title || "Curso sem título",
        courseDescription: course.description || "",
        courseOwner: course.userId || null,
      };
    }

    return {};
  } catch (error) {
    console.error("Erro ao buscar detalhes do curso:", error);
    return {};
  }
};

/**
 * Busca informações do vídeo ou quiz
 * @param {string} type - Tipo (video/quiz/slide)
 * @param {string} itemId - ID do item
 * @param {string} courseId - ID do curso
 * @returns {Promise<object>} - Dados do conteúdo
 */
const fetchContentDetails = async (type, itemId, courseId) => {
  try {
    if (!itemId || !courseId) return {};

    if (type === "video") {
      const videoRef = ref(database, `courseVideos/${courseId}/${itemId}`);
      const snapshot = await get(videoRef);

      if (snapshot.exists()) {
        const videoData = snapshot.val();
        return {
          contentTitle: videoData.title || "Vídeo sem título",
          contentUrl: videoData.url || null,
        };
      }
    } else if (type === "quiz") {
      // Buscar quiz em courseQuizzes
      const quizRef = ref(database, `courseQuizzes/${courseId}`);
      const snapshot = await get(quizRef);

      if (snapshot.exists()) {
        const quizzes = snapshot.val();
        // Procurar o quiz específico
        for (const quizId in quizzes) {
          const quiz = quizzes[quizId];
          if (quiz.id === itemId || quizId === itemId) {
            return {
              contentTitle: quiz.title || "Quiz sem título",
              questionCount: quiz.questions?.length || 0,
            };
          }
        }
      }
    } else if (type === "slide") {
      const slideRef = ref(database, `courseSlides/${courseId}/${itemId}`);
      const snapshot = await get(slideRef);

      if (snapshot.exists()) {
        const slideData = snapshot.val();
        return {
          contentTitle: slideData.title || "Slide sem título",
          contentUrl: slideData.url || null,
        };
      }
    }

    return {};
  } catch (error) {
    console.error("Erro ao buscar detalhes do conteúdo:", error);
    return {};
  }
};

/**
 * Busca informações do usuário
 * @param {string} userId - ID do usuário
 * @returns {Promise<object>} - Dados do usuário
 */
const fetchUserDetails = async (userId) => {
  try {
    if (!userId || userId === "anonymous") {
      return {
        userEmail: "Anônimo",
        userName: "Usuário Anônimo",
        userType: "anônimo",
      };
    }

    const userRef = ref(database, `users/${userId}`);
    const snapshot = await get(userRef);

    if (snapshot.exists()) {
      const userData = snapshot.val();
      return {
        userEmail: userData.email || "Email não disponível",
        userName: userData.displayName || 
                  `${userData.firstName || ""} ${userData.lastName || ""}`.trim() || 
                  "Usuário sem nome",
        userPhotoURL: userData.photoURL || null,
        userType: userData.role || "estudante",
      };
    }

    return {
      userEmail: "Email não disponível",
      userName: "Usuário não encontrado",
    };
  } catch (error) {
    console.error("Erro ao buscar detalhes do usuário:", error);
    return {};
  }
};

/**
 * Remove propriedades undefined ou null
 * @param {object} obj - Objeto a ser sanitizado
 * @returns {object} - Objeto limpo
 */
const sanitizeForFirebase = (obj) => {
  const sanitized = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null && value !== "") {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

/**
 * Envia um reporte para o banco de dados
 * @param {object} reportData - Dados do reporte
 * @returns {Promise<object>} - Resultado da operação
 */
export const sendReport = async (reportData) => {
  try {
    // Validação básica
    if (!reportData.reportName || !reportData.message) {
      return {
        success: false,
        message: "Nome e descrição do reporte são obrigatórios.",
      };
    }

    // Obter número sequencial
    const reportNumber = await getNextReportNumber();

    // Buscar informações adicionais
    const courseDetails = await fetchCourseDetails(reportData.courseId);
    const contentDetails = await fetchContentDetails(
      reportData.type,
      reportData.itemId,
      reportData.courseId
    );
    const userDetails = await fetchUserDetails(reportData.userId);

    // Criar reporte completo com ID organizado
    const reportKey = `report-${reportNumber}`;
    const newReportRef = ref(database, `reports/${reportKey}`);

    const report = sanitizeForFirebase({
      // Dados principais
      reportNumber,
      reportName: reportData.reportName.trim(),
      message: reportData.message.trim(),
      type: reportData.type || "geral",
      
      // Dados do curso
      courseId: reportData.courseId,
      ...courseDetails,
      
      // Dados do conteúdo
      itemId: reportData.itemId,
      ...contentDetails,
      
      // Dados do usuário
      userId: reportData.userId,
      ...userDetails,
      
      // Dados técnicos
      userAgent: reportData.userAgent,
      screenResolution: reportData.screenResolution,
      
      // Dados específicos (se aplicável)
      currentQuestionIndex: reportData.currentQuestionIndex,
      questionTitle: reportData.questionTitle,
      currentTime: reportData.currentTime,
      
      // Imagem anexada (se houver)
      imageUrl: reportData.imageUrl,
      hasImage: !!reportData.imageUrl,
      
      // Metadados
      status: "pendente",
      createdAt: serverTimestamp(),
      readableDate: new Date().toISOString(),
    });

    // Salvar no banco
    await set(newReportRef, report);

    console.log(`✅ Reporte #${reportNumber} salvo com sucesso!`, report);

    // Enviar email de notificação (não bloqueia se falhar)
    sendReportEmail({
      ...report,
      reportNumber,
    }).catch((error) => {
      console.error('⚠️ Erro ao enviar email de notificação:', error);
    });

    return {
      success: true,
      reportId: reportNumber,
      reportKey: reportKey,
      message: "Reporte enviado com sucesso!",
    };
  } catch (error) {
    console.error("❌ Erro ao enviar reporte:", error);
    
    let errorMessage = "Erro ao enviar reporte. Tente novamente mais tarde.";
    
    if (error.code === "PERMISSION_DENIED") {
      errorMessage = "Você não tem permissão para enviar reportes. Tente fazer login novamente.";
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return {
      success: false,
      message: errorMessage,
      error: error.code || error.message,
    };
  }
};

/**
 * Busca todos os reportes
 * @returns {Promise<Array>} - Lista de reportes
 */
export const fetchAllReports = async () => {
  try {
    const reportsRef = ref(database, "reports");
    const snapshot = await get(reportsRef);

    if (!snapshot.exists()) return [];

    const reports = [];
    snapshot.forEach((childSnapshot) => {
      reports.push({
        id: childSnapshot.key,
        ...childSnapshot.val(),
      });
    });

    // Ordenar por número de reporte (mais recente primeiro)
    return reports.sort((a, b) => (b.reportNumber || 0) - (a.reportNumber || 0));
  } catch (error) {
    console.error("Erro ao buscar reportes:", error);
    return [];
  }
};

/**
 * Atualiza o status de um reporte
 * @param {string} reportId - ID do reporte
 * @param {string} status - Novo status
 * @returns {Promise<boolean>} - Sucesso da operação
 */
export const updateReportStatus = async (reportId, status) => {
  try {
    const reportRef = ref(database, `reports/${reportId}`);
    await set(reportRef, {
      status,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error("Erro ao atualizar status do reporte:", error);
    return false;
  }
};
