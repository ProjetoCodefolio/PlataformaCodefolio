import { ref, get, set, update } from "firebase/database";
import { database } from "../../config/firebase";

/**
 * ==============================
 * FUNÇÕES DE QUESTÕES ABERTAS
 * ==============================
 */

/**
 * Salva resposta de questão aberta
 * @param {string} userId - ID do usuário
 * @param {string} courseId - ID do curso
 * @param {string} quizId - ID do quiz
 * @param {string} questionId - ID da questão
 * @param {string} answer - Resposta do aluno
 * @returns {Promise<boolean>}
 */
export const saveOpenEndedAnswer = async (userId, courseId, quizId, questionId, answer) => {
  try {
    if (!userId || !courseId || !quizId || !questionId) {
      throw new Error("Parâmetros obrigatórios não fornecidos");
    }

    const path = `openEndedAnswers/${courseId}/${quizId}/${questionId}/${userId}`;
    console.log('💾 Salvando no caminho Firebase:', path);

    const answerRef = ref(database, path);

    const answerData = {
      userId,
      answer,
      submittedAt: new Date().toISOString(),
      graded: false,
      grade: null,
      feedback: null,
    };

    console.log('📝 Dados para salvar:', {
      userId,
      answerPreview: answer.substring(0, 50) + (answer.length > 50 ? '...' : ''),
      submittedAt: answerData.submittedAt
    });

    await set(answerRef, answerData);
    console.log('✅ Resposta aberta salva com sucesso no Firebase!');
    return true;
  } catch (error) {
    console.error("❌ Erro ao salvar resposta aberta:", error);
    throw error;
  }
};

/**
 * Busca respostas de questões abertas de um quiz
 * @param {string} courseId - ID do curso
 * @param {string} quizId - ID do quiz
 * @returns {Promise<Object>}
 */
export const fetchOpenEndedAnswers = async (courseId, quizId) => {
  try {
    const answersRef = ref(database, `openEndedAnswers/${courseId}/${quizId}`);
    const snapshot = await get(answersRef);

    if (!snapshot.exists()) {
      console.log('Nenhuma resposta aberta encontrada em:', `openEndedAnswers/${courseId}/${quizId}`);
      return {};
    }

    const data = snapshot.val();
    console.log('✅ Respostas abertas carregadas com sucesso');
    return data;
  } catch (error) {
    console.error("❌ Erro ao buscar respostas abertas:", error);
    return {};
  }
};

/**
 * Avalia uma resposta de questão aberta
 * @param {string} courseId - ID do curso
 * @param {string} quizId - ID do quiz
 * @param {string} questionId - ID da questão
 * @param {string} userId - ID do usuário
 * @param {number} grade - Nota (0-100)
 * @param {string} feedback - Feedback do professor
 * @returns {Promise<boolean>}
 */
export const gradeOpenEndedAnswer = async (
  courseId,
  quizId,
  questionId,
  userId,
  grade,
  feedback
) => {
  try {
    // Tentar atualizar em liveQuizResults
    const liveResultRef = ref(
      database,
      `liveQuizResults/${courseId}/${quizId}/${userId}/detailedAnswers/${questionId}`
    );
    const liveSnapshot = await get(liveResultRef);

    if (liveSnapshot.exists()) {
      await update(liveResultRef, {
        graded: true,
        grade,
        feedback,
        gradedAt: new Date().toISOString(),
      });
      console.log('✅ Nota salva em liveQuizResults');
      return true;
    }

    // Se não estiver em live, tentar em customQuizResults
    const customResultRef = ref(
      database,
      `customQuizResults/${courseId}/${quizId}/${userId}/detailedAnswers/${questionId}`
    );
    const customSnapshot = await get(customResultRef);

    if (customSnapshot.exists()) {
      await update(customResultRef, {
        graded: true,
        grade,
        feedback,
        gradedAt: new Date().toISOString(),
      });
      console.log('✅ Nota salva em customQuizResults');
      return true;
    }

    console.warn('⚠️ Resposta não encontrada em liveQuizResults nem customQuizResults');
    return false;
  } catch (error) {
    console.error("Erro ao avaliar resposta aberta:", error);
    throw error;
  }
};
