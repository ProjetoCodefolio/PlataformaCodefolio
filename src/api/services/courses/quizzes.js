import { ref, set, get, remove, update, push } from "firebase/database";
import { database } from "../../config/firebase";
import { v4 as uuidv4 } from "uuid";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { normalizeQuizResultId } from "./progressAudit";
import {
  normalizeQuestionList,
  recomputeQuizResult,
  summarizeRecalculation,
} from "./quizRecalculation";
import { gradedQuestions, normalizeGradedFlag } from "./quizGrading";

export const normalizeDiagnosticFlag = (value) =>
  value === true || value === "true" || value === 1 || value === "1";

/**
 * Normaliza a flag de "permitir repetição" de um quiz. O padrão é `true`
 * (comportamento histórico: repetição liberada) — só é `false` quando o
 * professor desativa explicitamente.
 */
export const normalizeAllowRetry = (value) => value !== false;

/**
 * Normaliza o limite máximo de tentativas. Retorna um inteiro positivo quando
 * informado, ou `null` quando ausente/ inválido (= tentativas ilimitadas).
 */
export const normalizeMaxAttempts = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

/**
 * Calcula o limite EFETIVO de tentativas de um quiz:
 * - repetição desativada  → 1 tentativa;
 * - repetição ativada com limite informado → esse número;
 * - repetição ativada sem limite → Infinity (ilimitado).
 * @param {Object} quiz - Quiz (ou objeto com allowRetry/maxAttempts)
 * @returns {number}
 */
export const getQuizAttemptLimit = (quiz) => {
  if (!quiz) return Infinity;
  if (!normalizeAllowRetry(quiz.allowRetry)) return 1;
  const max = normalizeMaxAttempts(quiz.maxAttempts);
  return max == null ? Infinity : max;
};

/**
 * Normaliza uma data da janela do quiz (abertura/fechamento) para ISO.
 * Retorna "" quando ausente ou inválida — o mesmo contrato usado nos enunciados
 * (`courseAssignments`), onde vazio significa "sem restrição".
 */
export const normalizeQuizDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
};

/**
 * Monta os campos de configuração de tentativas e janela para persistência.
 * Como vários pontos reescrevem o nó do quiz inteiro com `set`, este helper
 * garante que `allowRetry`/`maxAttempts`/`openDate`/`closeDate` sejam sempre
 * preservados. Campos ausentes não são incluídos (ausência = sem limite/janela).
 */
export const persistableQuizSettings = (quiz) => {
  const settings = { allowRetry: normalizeAllowRetry(quiz?.allowRetry) };
  const max = normalizeMaxAttempts(quiz?.maxAttempts);
  if (max != null) settings.maxAttempts = max;
  const openDate = normalizeQuizDate(quiz?.openDate);
  if (openDate) settings.openDate = openDate;
  const closeDate = normalizeQuizDate(quiz?.closeDate);
  if (closeDate) settings.closeDate = closeDate;
  return settings;
};

/**
 * ==============================
 * JANELA DE DISPONIBILIDADE DO QUIZ (openDate / closeDate)
 * ==============================
 *
 * Mesmo modelo dos enunciados: datas ISO, vazio = sem restrição. Serve para o
 * professor montar o quiz com calma (só abre na data marcada) e para impedir
 * que a turma deixe tudo para o fim do semestre (fecha na data marcada).
 */

/**
 * Indica se o quiz ainda não abriu (openDate no futuro).
 */
export const isQuizBeforeOpen = (quiz, now = new Date()) => {
  const openDate = normalizeQuizDate(quiz?.openDate);
  if (!openDate) return false;
  return now.getTime() < new Date(openDate).getTime();
};

/**
 * Indica se o quiz já encerrou (closeDate no passado).
 */
export const isQuizAfterClose = (quiz, now = new Date()) => {
  const closeDate = normalizeQuizDate(quiz?.closeDate);
  if (!closeDate) return false;
  return now.getTime() > new Date(closeDate).getTime();
};

/**
 * Estado da janela de disponibilidade de um quiz.
 * @returns {'scheduled'|'open'|'closed'} scheduled = ainda não abriu,
 *  open = disponível, closed = encerrado.
 */
export const getQuizWindowState = (quiz, now = new Date()) => {
  if (isQuizBeforeOpen(quiz, now)) return "scheduled";
  if (isQuizAfterClose(quiz, now)) return "closed";
  return "open";
};

/**
 * Formata uma data da janela para exibição em pt-BR (dd/mm/aaaa às hh:mm).
 * Devolve "" quando a data é ausente/inválida.
 */
export const formatQuizDate = (value) => {
  const iso = normalizeQuizDate(value);
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Mensagem explicando por que o quiz não pode ser aberto agora.
 * @returns {string|null} null quando o quiz está dentro da janela.
 */
export const getQuizWindowMessage = (quiz, now = new Date()) => {
  const state = getQuizWindowState(quiz, now);
  if (state === "scheduled")
    return `Este quiz ainda não abriu. Ele fica disponível a partir de ${formatQuizDate(
      quiz?.openDate
    )}.`;
  if (state === "closed")
    return `Este quiz foi encerrado em ${formatQuizDate(quiz?.closeDate)}.`;
  return null;
};

/**
 * Aplica os campos opcionais de imagem (imageUrl/imageWidth/imageHeight) a uma
 * questão. Como o Realtime Database não aceita valores `undefined`, os campos
 * só são adicionados quando há uma URL válida; caso contrário são removidos
 * (útil ao editar uma questão e apagar a imagem).
 * @param {Object} target - Objeto da questão a ser mutado
 * @param {Object} source - Dados da questão (de onde vêm os campos de imagem)
 * @returns {Object} - O próprio target, já com os campos ajustados
 */
/**
 * Aplica os campos de "esta questão tem resposta certa" numa questão de múltipla
 * escolha. `graded` só é gravado quando é `false`: a ausência já significa "vale
 * nota", e escrever `true` em toda questão inflaria o nó sem informação nova.
 * @param {Object} target - questão sendo montada (alterada no lugar)
 * @param {Object} source - dados vindos do formulário
 */
export const applyQuestionGradingFields = (target, source = {}) => {
  const valeNota = normalizeGradedFlag(source.graded);

  if (valeNota) {
    delete target.graded;
    target.correctOption = source.correctOption;
  } else {
    target.graded = false;
    // Sem gabarito: manter um `correctOption` de uma edição anterior faria a
    // questão voltar a "ter resposta certa" se a flag fosse perdida.
    delete target.correctOption;
  }

  if (source.scale) {
    target.scale = source.scale;
  } else {
    delete target.scale;
  }
};

export const applyQuestionImageFields = (target, source = {}) => {
  const url =
    typeof source.imageUrl === "string" ? source.imageUrl.trim() : "";

  if (url) {
    target.imageUrl = url;

    const width = Number(source.imageWidth);
    if (Number.isFinite(width) && width > 0) {
      target.imageWidth = width;
    } else {
      delete target.imageWidth;
    }

    const height = Number(source.imageHeight);
    if (Number.isFinite(height) && height > 0) {
      target.imageHeight = height;
    } else {
      delete target.imageHeight;
    }
  } else {
    delete target.imageUrl;
    delete target.imageWidth;
    delete target.imageHeight;
  }

  return target;
};

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

    return quizzesSnapshot.val() || {};
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
 * Adiciona uma questão a um quiz
 * @param {string} courseId - ID do curso
 * @param {Object} quiz - Quiz para adicionar a questão
 * @param {Object} questionData - Dados da questão
 * @returns {Promise<Object>} - Quiz atualizado
 */
export const addQuestionToQuiz = async (courseId, quiz, questionData) => {
  try {
    if (!courseId || !quiz || !questionData) {
      throw new Error("Parâmetros inválidos para adicionar questão");
    }

    const { videoId } = quiz;
    const questionId = questionData.id || uuidv4();

    const newQuestion = {
      id: questionId,
      question: questionData.question,
      questionType: questionData.questionType || 'multiple-choice', // 'multiple-choice' ou 'open-ended'
    };

    // Adicionar campos específicos baseado no tipo de questão
    if (questionData.questionType === 'open-ended') {
      // Questão aberta não precisa de campos extras
    } else {
      newQuestion.options = questionData.options;
      applyQuestionGradingFields(newQuestion, questionData);
    }

    // Imagem opcional da questão (URL + dimensões em px)
    applyQuestionImageFields(newQuestion, questionData);

    // Verificar se a questão já existe
    const existingQuestionIndex = quiz.questions.findIndex(
      (q) => q.id === questionId
    );

    let updatedQuestions;
    if (existingQuestionIndex >= 0) {
      // Atualizar questão existente
      updatedQuestions = quiz.questions.map((q) =>
        q.id === questionId ? newQuestion : q
      );
    } else {
      // Adicionar nova questão
      updatedQuestions = [...quiz.questions, newQuestion];
    }

    const updatedQuiz = {
      ...quiz,
      questions: updatedQuestions,
    };

    // Atualizar no Firebase
    const quizRef = ref(database, `courseQuizzes/${courseId}/${videoId}`);
    await set(quizRef, {
      questions: updatedQuestions,
      minPercentage: quiz.minPercentage,
      isDiagnostic: normalizeDiagnosticFlag(quiz.isDiagnostic),
      ...persistableQuizSettings(quiz),
      courseId: courseId,
      videoId: videoId,
    });

    return updatedQuiz;
  } catch (error) {
    console.error("Erro ao adicionar questão:", error);
    throw error;
  }
};

/**
 * Atualiza uma questão existente em um quiz
 * @param {string} courseId - ID do curso
 * @param {Object} quiz - Quiz para atualizar a questão
 * @param {Object} questionData - Dados da questão
 * @returns {Promise<Object>} - Quiz atualizado
 */
export const updateQuizQuestion = async (courseId, quiz, questionData) => {
  try {
    if (!courseId || !quiz || !questionData || !questionData.id) {
      throw new Error("Parâmetros inválidos para atualizar questão");
    }

    const { videoId } = quiz;

    const updatedQuestions = quiz.questions.map((q) => {
      if (q.id === questionData.id) {
        const updatedQuestion = {
          ...q,
          question: questionData.question,
          questionType: questionData.questionType || q.questionType || 'multiple-choice',
        };

        // Atualizar campos específicos baseado no tipo de questão
        if (questionData.questionType === 'open-ended') {
          // Questão aberta não precisa de campos extras
          // Remover campos de múltipla escolha se existirem
          delete updatedQuestion.options;
          delete updatedQuestion.correctOption;
          delete updatedQuestion.graded;
          delete updatedQuestion.scale;
        } else {
          updatedQuestion.options = questionData.options;
          applyQuestionGradingFields(updatedQuestion, questionData);
        }

        // Imagem opcional da questão (URL + dimensões em px)
        applyQuestionImageFields(updatedQuestion, questionData);

        return updatedQuestion;
      }
      return q;
    });

    const updatedQuiz = {
      ...quiz,
      questions: updatedQuestions,
    };

    // Atualizar no Firebase
    const quizRef = ref(database, `courseQuizzes/${courseId}/${videoId}`);
    await set(quizRef, {
      questions: updatedQuestions,
      minPercentage: quiz.minPercentage,
      isDiagnostic: normalizeDiagnosticFlag(quiz.isDiagnostic),
      ...persistableQuizSettings(quiz),
      courseId: courseId,
      videoId: videoId,
    });

    return updatedQuiz;
  } catch (error) {
    console.error("Erro ao atualizar questão:", error);
    throw error;
  }
};

/**
 * Remove uma questão de um quiz
 * @param {string} courseId - ID do curso
 * @param {Object} quiz - Quiz para remover a questão
 * @param {string} questionId - ID da questão a remover
 * @returns {Promise<Object>} - Quiz atualizado
 */
export const removeQuizQuestion = async (courseId, quiz, questionId) => {
  try {
    if (!courseId || !quiz || !questionId) {
      throw new Error("Parâmetros inválidos para remover questão");
    }

    const { videoId } = quiz;

    const updatedQuestions = quiz.questions.filter((q) => q.id !== questionId);

    const updatedQuiz = {
      ...quiz,
      questions: updatedQuestions,
    };

    // Atualizar no Firebase
    const quizRef = ref(database, `courseQuizzes/${courseId}/${videoId}`);
    await set(quizRef, {
      questions: updatedQuestions,
      minPercentage: quiz.minPercentage,
      isDiagnostic: normalizeDiagnosticFlag(quiz.isDiagnostic),
      ...persistableQuizSettings(quiz),
      courseId: courseId,
      videoId: videoId,
    });

    return updatedQuiz;
  } catch (error) {
    console.error("Erro ao remover questão:", error);
    throw error;
  }
};

/**
 * Reordena as questões de um quiz. A ordem é a própria ordem do array
 * `questions` no nó do quiz — não há campo `order` por questão.
 *
 * Recebe a lista JÁ reordenada e valida que ela é uma permutação da atual: sem
 * isso, um estado de UI defasado poderia gravar uma lista com questões a menos
 * e apagar trabalho do professor.
 *
 * @param {string} courseId - ID do curso
 * @param {Object} quiz - Quiz a reordenar
 * @param {Array} orderedQuestions - Questões na nova ordem
 * @returns {Promise<Object>} - Quiz atualizado
 */
export const reorderQuizQuestions = async (
  courseId,
  quiz,
  orderedQuestions
) => {
  try {
    if (!courseId || !quiz || !Array.isArray(orderedQuestions)) {
      throw new Error("Parâmetros inválidos para reordenar as questões");
    }

    const atuais = Array.isArray(quiz.questions) ? quiz.questions : [];
    const mesmaQuantidade = atuais.length === orderedQuestions.length;
    const mesmosIds =
      mesmaQuantidade &&
      new Set(atuais.map((q) => q.id)).size === atuais.length &&
      orderedQuestions.every((q) => atuais.some((a) => a.id === q.id));

    if (!mesmosIds) {
      throw new Error(
        "A lista reordenada não corresponde às questões atuais do quiz"
      );
    }

    const updatedQuiz = { ...quiz, questions: orderedQuestions };

    const quizRef = ref(database, `courseQuizzes/${courseId}/${quiz.videoId}`);
    await set(quizRef, {
      questions: orderedQuestions,
      minPercentage: quiz.minPercentage,
      isDiagnostic: normalizeDiagnosticFlag(quiz.isDiagnostic),
      ...persistableQuizSettings(quiz),
      courseId,
      videoId: quiz.videoId,
    });

    return updatedQuiz;
  } catch (error) {
    console.error("Erro ao reordenar as questões do quiz:", error);
    throw error;
  }
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
 * Adiciona múltiplas questões de uma vez ao quiz
 * @param {string} courseId - ID do curso
 * @param {Object} quiz - Quiz para adicionar as questões
 * @param {Array} questions - Array de questões a adicionar
 * @returns {Promise<Object>} - Quiz atualizado
 */
export const addMultipleQuestionsToQuiz = async (courseId, quiz, questions) => {
  try {
    if (!courseId || !quiz || !Array.isArray(questions)) {
      throw new Error("Parâmetros inválidos para adicionar múltiplas questões");
    }

    const { videoId } = quiz;

    // Adicionar IDs para questões que não possuem
    const questionsWithIds = questions.map((q) => ({
      ...q,
      id: q.id || uuidv4(),
    }));

    const updatedQuestions = [...quiz.questions, ...questionsWithIds];

    const updatedQuiz = {
      ...quiz,
      questions: updatedQuestions,
    };

    // Atualizar no Firebase
    const quizRef = ref(database, `courseQuizzes/${courseId}/${videoId}`);
    await set(quizRef, {
      questions: updatedQuestions,
      minPercentage: quiz.minPercentage,
      isDiagnostic: normalizeDiagnosticFlag(quiz.isDiagnostic),
      ...persistableQuizSettings(quiz),
      courseId: courseId,
      videoId: videoId,
    });

    return updatedQuiz;
  } catch (error) {
    console.error("Erro ao adicionar múltiplas questões:", error);
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

/**
 * ==============================
 * FUNÇÕES DE INTERAÇÃO DO ALUNO COM QUIZZES
 * ==============================
 */

/**
 * Valida as respostas do usuário para um quiz
 * @param {Object} userAnswers - Respostas do usuário
 * @param {string} quizId - ID do quiz
 * @param {number} minPercentage - Porcentagem mínima para aprovação
 * @returns {Promise<Object>} - Resultado da validação
 */
export const validateQuizAnswers = async (
  quizId,
  userAnswers,
  minPercentage = 70
) => {
  try {
    // Verificar se quizId é válido
    if (!quizId) {
      throw new Error("quizId é necessário para validar o quiz");
    }

    // Converter quizId para string se não for
    const quizIdStr = String(quizId);

    const quizData = await fetchQuizQuestions(quizIdStr);

    if (
      !quizData ||
      !quizData.questions ||
      !Array.isArray(quizData.questions)
    ) {
      return {
        isPassed: false,
        scorePercentage: 0,
        earnedPoints: 0,
        totalPoints: 0,
      };
    }

    // Só as questões que VALEM NOTA entram na conta: dissertativa é corrigida à
    // mão e questão sem resposta certa (escala Likert) não tem gabarito. Antes
    // daqui passar pelo seam, as dissertativas contavam no total e derrubavam a
    // nota de quem tinha acertado tudo o que dava para acertar.
    const questions = gradedQuestions(quizData.questions);
    const totalPoints = questions.length;
    let earnedPoints = 0;

    // Validar cada resposta
    for (const question of questions) {
      // Garantir que ambos sejam números para comparação
      const userAnswer = Number(userAnswers[question.id]);
      const correctAnswer = Number(question.correctOption);

      // Verificar se a resposta está correta
      if (userAnswer === correctAnswer) {
        earnedPoints++;
      }
    }

    // Sem questão valendo nota (questionário de opinião), responder já é
    // concluir: 100%, como o recálculo também trata. Assim o quiz não trava
    // progresso do curso nem presença.
    const scorePercentage =
      totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 100;

    // Garantir que minPercentage seja um número
    const requiredPercentage = Number(quizData.minPercentage || minPercentage);

    // Determinar aprovação
    const isPassed = scorePercentage >= requiredPercentage;

    return {
      isPassed,
      scorePercentage,
      earnedPoints,
      totalPoints,
      minPercentage: requiredPercentage,
    };
  } catch (error) {
    console.error("Erro ao validar respostas do quiz:", error);
    throw error;
  }
};

/**
 * Marca um quiz como completo.
 *
 * NÃO conta tentativa: `attemptCount` é escrito exclusivamente por
 * `saveQuizResults`, a única função que sabe que houve uma submissão de fato.
 * Semear a contagem aqui fazia com que qualquer caminho que "marcasse
 * conclusão" (inclusive por engano) queimasse uma tentativa do aluno.
 *
 * @param {string} userId - ID do usuário
 * @param {string} courseId - ID do curso
 * @param {string} videoId - ID do vídeo
 * @param {Object} quizResult - Resultado do quiz
 * @returns {Promise<boolean>} - Verdadeiro se bem-sucedido
 */
export const markQuizAsCompleted = async (
  userId,
  courseId,
  videoId,
  quizResult
) => {
  try {
    const quizResultRef = ref(
      database,
      `quizResults/${userId}/${courseId}/${videoId}`
    );
    
    // Check if there's existing data we need to preserve
    const existingSnapshot = await get(quizResultRef);
    let completeData = quizResult;
    
    if (existingSnapshot.exists()) {
      const existingData = existingSnapshot.val();
      // Only update, don't replace existing fields. A contagem de tentativas
      // gravada por saveQuizResults é preservada como está.
      completeData = {
        ...existingData,
        ...quizResult,
      };
    } else {
      // Sem submissão anterior não há tentativa a registrar: grava só a marca
      // de conclusão, sem inventar attemptCount.
      completeData = {
        ...quizResult,
        lastAttempt: quizResult.completedAt || new Date().toISOString()
      };
    }
    
    // Update with complete data
    await set(quizResultRef, completeData);

    // Atualizar o progresso do vídeo para mostrar que o quiz foi passado
    const videoProgressRef = ref(
      database,
      `videoProgress/${userId}/${courseId}/${videoId}`
    );
    await update(videoProgressRef, { quizPassed: quizResult.isPassed });

    return true;
  } catch (error) {
    console.error("Erro ao marcar quiz como completo:", error);
    throw error;
  }
};

/**
 * Salva os resultados do quiz
 * @param {string} userId - ID do usuário
 * @param {string} courseId - ID do curso
 * @param {string} videoId - ID do vídeo
 * @param {Object} quizData - Dados do resultado do quiz
 * @param {Object} userAnswers - Respostas do usuário
 * @param {Array} questions - Questões do quiz
 * @returns {Promise<Object>} - Resultado da operação
 */
export const saveQuizResults = async (
  userId,
  courseId,
  videoId,
  quizData,
  userAnswers,
  questions,
  answersDetails = null,
  quizResultId = null,
  isSlide = false
) => {

  try {
    if (!userId || !courseId || !videoId) {
      throw new Error("IDs obrigatórios não fornecidos");
    }

    const { isPassed, scorePercentage, earnedPoints, totalPoints } = quizData;

    // Obter dados do usuário
    const userRef = ref(database, `users/${userId}`);
    const userSnapshot = await get(userRef);
    const user = userSnapshot.val();

    if (!user) {
      console.error("Usuário não encontrado:", userId);
      throw new Error("Usuário não encontrado");
    }

    // Verificar se já existe um resultado anterior para este quiz
    const resultId = quizResultId || videoId;

    const quizResultRef = ref(
      database,
      `quizResults/${userId}/${courseId}/${resultId}`
    );
    const existingResultSnapshot = await get(quizResultRef);
    const existingResult = existingResultSnapshot.exists()
      ? existingResultSnapshot.val()
      : null;

    // Calcular número da tentativa
    const attemptCount = existingResult
      ? (existingResult.attemptCount || 1) + 1
      : 1;

    // Usar answersDetails se fornecido, caso contrário criar detailedAnswers
    let detailedAnswers = {};
    
    // Pergunta sem resposta certa: grava a escolha, e SÓ. Um `correctOption`
    // aqui viraria `Number(undefined)` = NaN, valor que o RTDB recusa — a
    // gravação inteira falharia e o aluno perderia a submissão.
    const escolhaSemGabarito = (question, options, userOption) => ({
      question,
      questionType: 'multiple-choice',
      graded: false,
      userAnswer: Number(userOption),
      userAnswerText: options?.[userOption] ?? "Não respondida",
      options: options || [],
    });

    if (answersDetails && Array.isArray(answersDetails)) {
      // Converter array de answersDetails para objeto indexado por questionId
      answersDetails.forEach((detail) => {
        if (detail.questionType !== 'open-ended' && detail.graded === false) {
          detailedAnswers[detail.questionId] = escolhaSemGabarito(
            detail.question,
            detail.options,
            detail.userOption
          );
          return;
        }

        detailedAnswers[detail.questionId] = {
          question: detail.question,
          questionType: detail.questionType || 'multiple-choice',
          ...(detail.questionType === 'open-ended' 
            ? {
                answer: detail.answer,
                userAnswer: detail.answer,
              }
            : {
                userAnswer: Number(detail.userOption),
                correctOption: Number(detail.correctOption),
                userAnswerText: detail.options[detail.userOption] || "Não respondida",
                correctOptionText: detail.options[detail.correctOption],
                options: detail.options,
                isCorrect: detail.isCorrect,
              }
          )
        };
      });
    } else {
      // Fallback: criar detailedAnswers apenas com questões de múltipla escolha
      questions.forEach((q) => {
        const userAnswer = userAnswers[q.id];

        if (!normalizeGradedFlag(q.graded)) {
          detailedAnswers[q.id] = escolhaSemGabarito(q.question, q.options, userAnswer);
          return;
        }

        const isCorrect = Number(userAnswer) === Number(q.correctOption);

        detailedAnswers[q.id] = {
          question: q.question,
          questionType: q.questionType || 'multiple-choice',
          userAnswer: Number(userAnswer),
          correctOption: Number(q.correctOption),
          userAnswerText: q.options[userAnswer] || "Não respondida",
          correctOptionText: q.options[q.correctOption],
          options: q.options,
          isCorrect,
        };
      });
    }

    const currentDate = new Date().toISOString();

    // Criar objeto de resultado completo
    const quizResultData = {
      name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
      email: user.email,
      scorePercentage,
      correctAnswers: earnedPoints,
      totalQuestions: totalPoints,
      isPassed,
      passed: isPassed,
      minPercentage: quizData.minPercentage || 0,
      submittedAt: currentDate,
      lastAttempt: currentDate,
      attemptCount,
      detailedAnswers,
      // Adicionar campos que podem estar sendo adicionados por outro código
      completedAt: currentDate,
      isSlide: Boolean(isSlide),
      quizId: resultId,
      videoId,
      // Adicionar flag para indicar que estes dados são completos
      isComplete: true,
    };

    // IMPORTANTE: Usar set para substituir completamente quaisquer dados anteriores
    await set(quizResultRef, quizResultData);

    // IMPORTANTE: Configurar um segundo salvamento após um pequeno delay
    // Isso ajuda a evitar que outro código sobrescreva os dados
    setTimeout(async () => {
      try {
        await set(quizResultRef, quizResultData);
      } catch (error) {
        console.error("Erro ao salvar dados novamente:", error);
      }
    }, 1500);

    // Atualizar também o progresso do vídeo
    const videoProgressRef = ref(
      database,
      `videoProgress/${userId}/${courseId}/${videoId}`
    );
    await update(videoProgressRef, {
      quizPassed: isPassed,
      hasQuizData: true, // Flag para indicar que existem dados de quiz
    });

    return { success: true, attemptCount };
  } catch (error) {
    console.error("❌ ERRO AO SALVAR RESULTADOS DO QUIZ:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Devolve UMA tentativa de quiz a um aluno (ação do professor).
 *
 * Só mexe no contador: nota, respostas e aprovação continuam gravadas, então o
 * histórico da tentativa já feita não se perde. Serve para casos legítimos de
 * tentativa perdida (queda de conexão, engano, problema técnico).
 *
 * @param {string} userId - ID do aluno
 * @param {string} courseId - ID do curso
 * @param {string} quizResultKey - chave do resultado (id do conteúdo; slides
 *   legados usam o prefixo `slide_`)
 * @returns {Promise<{success: boolean, attemptCount?: number, error?: string}>}
 */
export const restoreQuizAttempt = async (userId, courseId, quizResultKey) => {
  try {
    if (!userId || !courseId || !quizResultKey) {
      return { success: false, error: "Dados insuficientes." };
    }

    const resultRef = ref(
      database,
      `quizResults/${userId}/${courseId}/${quizResultKey}`
    );
    const snapshot = await get(resultRef);

    if (!snapshot.exists()) {
      return { success: false, error: "Este aluno não tem tentativas registradas neste quiz." };
    }

    const current = Number(snapshot.val()?.attemptCount) || 0;
    if (current <= 0) {
      return { success: false, error: "Não há tentativa a devolver neste quiz." };
    }

    const attemptCount = current - 1;
    await update(resultRef, { attemptCount });

    return { success: true, attemptCount };
  } catch (error) {
    console.error("Erro ao devolver tentativa de quiz:", error);
    return { success: false, error: error.message };
  }
};

/** Alunos processados por vez, para não abrir uma conexão por aluno de uma vez só. */
const RECALC_BATCH_SIZE = 25;

/**
 * Reprocessa as notas JÁ GRAVADAS de um quiz contra as questões ATUAIS.
 *
 * Ação do professor, para depois de corrigir uma ou mais questões: a nota é
 * calculada uma única vez, na submissão, então trocar o gabarito não muda nada
 * para quem já fez. O cálculo em si é puro e vive em `quizRecalculation.js`;
 * aqui só há o I/O.
 *
 * Escreve com `update()` no nó de cada aluno — é o único caminho que as regras
 * do banco liberam para o dono do curso (o nível `$courseId` só aceita escrita
 * quando o dado é removido) e preserva tentativas, datas e campos desconhecidos.
 *
 * ATENÇÃO: `saveQuizResults` regrava o nó inteiro 1,5s depois de uma submissão.
 * Um aluno que submeta exatamente durante o recálculo pode ter o recálculo
 * sobrescrito — o recálculo é idempotente, basta rodar de novo (de preferência
 * fora da janela do quiz).
 *
 * @param {string} courseId - ID do curso
 * @param {string} quizResultKey - chave do quiz/resultado (slides legados usam
 *   o prefixo `slide_`)
 * @param {Object} [opts]
 * @param {string} [opts.actorUserId] - quem disparou (gravado em recalculatedBy)
 * @param {boolean} [opts.dryRun=false] - só simula, para a prévia da confirmação
 * @param {boolean} [opts.keepOrphans=true] - manter respostas de questões removidas
 * @returns {Promise<{success: boolean, error?: string, report?: Object}>}
 */
export const recalculateQuizResults = async (
  courseId,
  quizResultKey,
  opts = {}
) => {
  const { actorUserId = null, dryRun = false, keepOrphans = true } = opts;

  try {
    if (!courseId || !quizResultKey) {
      return { success: false, error: "Dados insuficientes." };
    }

    const quizSnapshot = await get(
      ref(database, `courseQuizzes/${courseId}/${quizResultKey}`)
    );
    if (!quizSnapshot.exists()) {
      return { success: false, error: "Quiz não encontrado." };
    }

    const quiz = quizSnapshot.val();
    const questions = normalizeQuestionList(quiz.questions);

    // Trava contra o quiz meio-editado: sem questões, recalcular zeraria a nota
    // da turma inteira.
    if (questions.length === 0) {
      return {
        success: false,
        error: "O quiz está sem questões: recalcular zeraria a nota de todos.",
      };
    }

    const minPercentage = Number(quiz.minPercentage) || 0;

    const enrolledSnapshot = await get(ref(database, "studentCourses"));
    const enrolled = enrolledSnapshot.exists() ? enrolledSnapshot.val() : {};
    const userIds = Object.entries(enrolled)
      .filter(([, courses]) => courses && courses[courseId])
      .map(([userId]) => userId);

    const usersSnapshot = await get(ref(database, "users"));
    const usersData = usersSnapshot.exists() ? usersSnapshot.val() : {};

    const perStudent = [];
    const changes = [];
    const errors = [];

    for (let i = 0; i < userIds.length; i += RECALC_BATCH_SIZE) {
      const batch = userIds.slice(i, i + RECALC_BATCH_SIZE);

      await Promise.all(
        batch.map(async (userId) => {
          const resultRef = ref(
            database,
            `quizResults/${userId}/${courseId}/${quizResultKey}`
          );

          try {
            const snapshot = await get(resultRef);
            if (!snapshot.exists()) return; // aluno não fez o quiz

            const current = snapshot.val();
            const recalc = recomputeQuizResult(current, questions, minPercentage, {
              keepOrphans,
            });

            const userData = usersData[userId] || {};
            const name =
              userData.displayName ||
              `${userData.firstName || ""} ${userData.lastName || ""}`.trim() ||
              current.name ||
              userData.email ||
              userId;

            perStudent.push({ ...recalc, userId, name });

            if (recalc.skipped || !recalc.changed) return;

            changes.push({
              userId,
              name,
              before: recalc.before,
              after: recalc.after,
            });

            if (dryRun) return;

            await update(resultRef, {
              ...recalc.updates,
              recalculatedAt: new Date().toISOString(),
              recalculatedBy: actorUserId,
              // Estado anterior gravado junto: torna a operação auditável e
              // explicável para o aluno que questionar a mudança de nota.
              recalculatedFrom: recalc.before,
            });

            // Espelho usado pela lista de conteúdos. Como `isPassed` nunca é
            // rebaixado, este espelho também não é.
            const progressId = current.videoId || normalizeQuizResultId(quizResultKey);
            await update(
              ref(database, `videoProgress/${userId}/${courseId}/${progressId}`),
              { quizPassed: recalc.updates.isPassed, hasQuizData: true }
            );
          } catch (error) {
            // Falha de um aluno não pode abortar a turma.
            console.error(`Erro ao recalcular quiz de ${userId}:`, error);
            errors.push({ userId, error: error.message });
          }
        })
      );
    }

    // O percentual em studentCourses NÃO é escrito aqui: `updateCourseProgress`
    // é a fonte única e precisa da lista completa de conteúdo já resolvida com o
    // estado do aluno. Ele se reconcilia no próximo acesso do aluno ao curso.
    return {
      success: true,
      report: {
        quizId: quizResultKey,
        dryRun,
        totalQuestions: questions.length,
        multipleChoiceQuestions: questions.filter(
          (q) => q.questionType !== "open-ended"
        ).length,
        minPercentage,
        ...summarizeRecalculation(perStudent),
        changes,
        errors,
      },
    };
  } catch (error) {
    console.error("Erro ao recalcular notas do quiz:", error);
    return { success: false, error: error.message };
  }
};

/**
 * ==============================
 * FUNÇÕES AUXILIARES
 * ==============================
 */

/**
 * Verifica se o usuário atingiu o limite máximo de tentativas para um determinado quiz
 * @param {Object} userQuizAttempts - Tentativas de quiz do usuário
 * @param {string} quizId - ID do quiz
 * @param {number} maxAttempts - Máximo de tentativas permitidas
 * @returns {boolean} - Verdadeiro se o limite foi atingido
 */
export const hasUserReachedQuizAttemptLimit = (
  userQuizAttempts,
  quizId,
  maxAttempts = Infinity // Por padrão, sem limite de tentativas
) => {
  if (!userQuizAttempts || !quizId) return false;

  // Extract videoId from quizId (which may be in format "courseId/videoId")
  const videoId = quizId.includes("/") ? quizId.split("/")[1] : quizId;
  
  // Check direct match first
  if (userQuizAttempts[videoId] && userQuizAttempts[videoId].attemptCount >= maxAttempts) {
    return true;
  }
  
  // Also check for any key that ends with our videoId (for backward compatibility)
  const found = Object.keys(userQuizAttempts).some((key) => {
    if (key === videoId || key.endsWith(`/${videoId}`)) {
      const hasReached = userQuizAttempts[key]?.attemptCount >= maxAttempts;
      return hasReached;
    }
    return false;
  });

  return found;
};

/**
 * Verifica se um quiz está bloqueado
 * @param {Object} video - Objeto do vídeo
 * @returns {boolean} - Verdadeiro se o quiz estiver bloqueado
 */
export const isQuizLocked = (video) => {
  if (!video || !video.quizId) return false;

  // Quiz está bloqueado se o vídeo não foi assistido
  return !video.watched;
};

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
