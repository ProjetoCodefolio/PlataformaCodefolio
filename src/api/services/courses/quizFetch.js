import { ref, get } from "firebase/database";
import { database } from "../../config/firebase";
import { normalizeDiagnosticFlag } from "./quizWindow";
import { ensureQuestionIds } from "./quizQuestions";

/**
 * ==============================
 * FUNÇÕES DE BUSCA DE QUIZZES
 * ==============================
 */

/**
 * Busca todos os vídeos de um curso
 * @param {string} courseId - ID do curso
 * @returns {Promise<Array>} - Array de vídeos
 */
export const fetchCourseVideosForQuiz = async (courseId) => {
  try {
    if (!courseId) {
      return [];
    }

    const courseVideosRef = ref(database, `courseVideos/${courseId}`);
    const snapshot = await get(courseVideosRef);
    const courseVideos = snapshot.val();

    if (!courseVideos) {
      return [];
    }

    return Object.entries(courseVideos).map(([key, video]) => ({
      id: key,
      title: video.title,
    }));
  } catch (error) {
    console.error("Erro ao buscar vídeos do curso:", error);
    throw error;
  }
};

/**
 * Busca todos os quizzes de um curso
 * @param {string} courseId - ID do curso
 * @returns {Promise<Object>} - Objeto com os quizzes do curso
 */
export const fetchCourseQuizzes = async (courseId) => {
  try {
    if (!courseId) {
      return {};
    }

    const quizzesRef = ref(database, `courseQuizzes/${courseId}`);
    const quizzesSnapshot = await get(quizzesRef);

    if (!quizzesSnapshot.exists()) {
      return {};
    }

    const quizzes = quizzesSnapshot.val() || {};

    // Ponto único em que as questões de um curso inteiro entram na aplicação:
    // é aqui que uma lista com id faltando ou repetido é consertada, antes de
    // virar estado de tela.
    return Object.fromEntries(
      Object.entries(quizzes).map(([quizId, quiz]) => [
        quizId,
        quiz && typeof quiz === "object"
          ? { ...quiz, questions: ensureQuestionIds(quiz.questions) }
          : quiz,
      ])
    );
  } catch (error) {
    console.error("Erro ao buscar quizzes do curso:", error);
    return {};
  }
};

/**
 * Busca um quiz específico
 * @param {string} quizId - ID do quiz no formato 'courseId/videoId' ou 'courseId/slide_slideId'
 * @returns {Promise<Object>} - Dados do quiz
 */
export const fetchQuizQuestions = async (quizId) => {
  try {
    if (!quizId) return null;

    // Separar o ID do quiz em courseId e elementId (video ou slide)
    const [courseId, elementId] = quizId.split("/");

    if (!courseId || !elementId) {
      console.error("ID do quiz inválido:", quizId);
      return null;
    }

    // Determinar o caminho correto do quiz
    let quizPath;
    if (elementId.startsWith("slide_")) {
      // É um quiz de slide
      quizPath = `courseQuizzes/${courseId}/${elementId}`;
    } else {
      // É um quiz de vídeo
      quizPath = `courseQuizzes/${courseId}/${elementId}`;
    }

    const quizRef = ref(database, quizPath);
    const snapshot = await get(quizRef);

    if (!snapshot.exists()) {
      return null;
    }

    const quizData = snapshot.val();
    return {
      ...quizData,
      // Sem id por questão o aluno responderia todas de uma vez: as respostas
      // são chaveadas por `question.id`.
      questions: ensureQuestionIds(quizData.questions),
      id: elementId,
      isDiagnostic: normalizeDiagnosticFlag(quizData.isDiagnostic),
    };
  } catch (error) {
    console.error("Erro ao buscar perguntas do quiz:", error, quizId);
    throw error;
  }
};

/**
 * Busca as tentativas de quiz do usuário
 * @param {string} userId - ID do usuário
 * @param {string} courseId - ID do curso
 * @returns {Promise<Object>} - Objeto com tentativas de quiz
 */
export const fetchUserQuizAttempts = async (userId, courseId) => {
  if (!userId || !courseId) {
    return {};
  }

  try {
    // Buscar dados de quizResults para o usuário específico e curso
    const quizResultsRef = ref(database, `quizResults/${userId}/${courseId}`);
    const quizResultsSnapshot = await get(quizResultsRef);

    if (!quizResultsSnapshot.exists()) {
      return {};
    }

    return quizResultsSnapshot.val();
  } catch (error) {
    console.error("Erro ao buscar tentativas de quiz do usuário:", error);
    return {};
  }
};

/**
 * Busca as tentativas de quiz do usuário para um curso
 * @param {string} userId - ID do usuário
 * @param {string} courseId - ID do curso
 * @returns {Promise<Object>} - Resultado das tentativas de quiz
 */
export const fetchUserQuizResults = async (userId, courseId) => {
  if (!userId || !courseId) {
    return {};
  }

  try {
    const quizResultsRef = ref(database, `quizResults/${userId}/${courseId}`);
    const quizResultsSnapshot = await get(quizResultsRef);

    if (!quizResultsSnapshot.exists()) {
      return {};
    }

    const quizResultsData = quizResultsSnapshot.val();

    return Object.entries(quizResultsData).reduce((acc, [videoId, result]) => {
      acc[videoId] = {
        ...result,
        // Ensure both fields exist for compatibility
        passed: result.isPassed || result.passed || false,
        isPassed: result.isPassed || result.passed || false,
      };
      return acc;
    }, {});
  } catch (error) {
    console.error("Erro ao buscar resultados de quiz do usuário:", error);
    return {};
  }
};

/**
 * Busca resultados de quiz para todos os estudantes
 * @param {string} courseId - ID do curso
 * @param {string} quizId - ID do quiz (videoId)
 * @returns {Promise<Array>} - Array de resultados dos estudantes
 */
export const fetchQuizStudentResults = async (courseId, quizId) => {
  try {
    // Buscar dados do quiz
    const quizRef = ref(database, `courseQuizzes/${courseId}/${quizId}`);
    const quizSnapshot = await get(quizRef);

    if (!quizSnapshot.exists()) {
      throw new Error("Quiz não encontrado");
    }

    const quizObj = quizSnapshot.val();

    // Buscar todos os estudantes matriculados no curso
    const enrolledStudentsRef = ref(database, `studentCourses`);
    const enrolledStudentsSnapshot = await get(enrolledStudentsRef);

    const results = [];

    if (enrolledStudentsSnapshot.exists()) {
      const enrolledData = enrolledStudentsSnapshot.val();

      // Para cada usuário, verificar se está matriculado no curso
      for (const [userId, courses] of Object.entries(enrolledData)) {
        if (!courses[courseId]) continue;

        // Buscar dados do usuário
        const userRef = ref(database, `users/${userId}`);
        const userSnapshot = await get(userRef);

        if (!userSnapshot.exists()) continue;

        const userData = userSnapshot.val();
        const userName = userData.name || "Usuário " + userId.substring(0, 6);

        // Buscar resultados do quiz para este usuário
        const quizResultRef = ref(
          database,
          `quizResults/${userId}/${courseId}/${quizId}`
        );
        const quizResultSnapshot = await get(quizResultRef);

        if (quizResultSnapshot.exists()) {
          const quizResult = quizResultSnapshot.val();

          // Calcular métricas
          const scorePercentage = quizResult.scorePercentage;
          const isPassed = quizResult.isPassed;
          const correctAnswers = quizResult.earnedPoints || 0;
          const totalQuestionsInQuiz =
            quizResult.totalPoints || quizObj.questions?.length || 0;

          // Formatar data
          const lastAttemptDate = quizResult.lastAttempt
            ? new Date(quizResult.lastAttempt).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Data não disponível";

          // Adicionar aos resultados
          results.push({
            userId,
            name: userName,
            email: userData.email || "Email não disponível",
            photoURL: userData.photoURL || "",
            score: scorePercentage,
            correctAnswers,
            totalQuestions: totalQuestionsInQuiz,
            passed: isPassed,
            attemptCount: quizResult.attemptCount || "#",
            lastAttemptDate: lastAttemptDate,
            detailedAnswers: quizResult.detailedAnswers || null,
          });
        }
      }
    }

    return results;
  } catch (error) {
    console.error("Erro ao buscar resultados de estudantes:", error);
    return [];
  }
};
