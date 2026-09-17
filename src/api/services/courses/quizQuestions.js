import { ref, set } from "firebase/database";
import { database } from "../../config/firebase";
import { v4 as uuidv4 } from "uuid";
import {
  normalizeDiagnosticFlag,
  persistableQuizSettings,
} from "./quizWindow";
import { normalizeGradedFlag } from "./quizGrading";

/**
 * Id de reposição de uma questão sem id (ou com id repetido). É POSICIONAL, e
 * não aleatório: a mesma questão precisa receber o mesmo id em toda leitura,
 * senão a revisão das respostas e o recálculo de nota deixariam de casar com o
 * que o aluno respondeu.
 * @param {number} index - posição da questão na lista
 * @param {Set<string>} ocupados - ids já usados na mesma lista
 * @returns {string}
 */
const fallbackQuestionId = (index, ocupados) => {
  let candidato = `q${index + 1}`;
  let sufixo = 2;

  while (ocupados.has(candidato)) {
    candidato = `q${index + 1}-${sufixo}`;
    sufixo += 1;
  }

  return candidato;
};

/**
 * Garante que cada questão da lista tenha um id próprio e único.
 *
 * TODA a plataforma endereça questão por `id`: o rascunho do editor inline do
 * professor (`QuestionList`), a resposta do aluno (`userAnswers[question.id]`),
 * o mapa gravado em `detailedAnswers` e o recálculo de nota. Questão sem id —
 * ou com o id repetido de outra — faz todas essas chaves colidirem: editar uma
 * questão aparece como edição de todas, e responder uma responde todas.
 *
 * Questões assim existem no banco (quizzes anteriores ao id por questão), por
 * isso a normalização acontece na LEITURA, antes de a lista chegar a qualquer
 * tela; a primeira gravação de questão persiste os ids junto.
 *
 * Devolve a MESMA lista quando não há nada a consertar — o caso comum —, para
 * não trocar a identidade do array a cada leitura.
 *
 * @param {Array} questions - questões como vieram do banco
 * @returns {Array} - lista com ids garantidos (ou a original, se já estava boa)
 */
export const ensureQuestionIds = (questions) => {
  if (!Array.isArray(questions)) return questions;

  const idDe = (q) =>
    q && typeof q === "object" && q.id !== null && q.id !== undefined
      ? String(q.id).trim()
      : "";

  // Todos os ids que a lista já usa: um substituto não pode roubar o id de uma
  // questão que ainda está mais abaixo.
  const ocupados = new Set(questions.map(idDe).filter(Boolean));
  const vistos = new Set();
  let mudou = false;

  const normalizadas = questions.map((question, index) => {
    if (!question || typeof question !== "object") return question;

    const id = idDe(question);
    if (id && !vistos.has(id)) {
      vistos.add(id);
      return question;
    }

    const novoId = fallbackQuestionId(index, ocupados);
    ocupados.add(novoId);
    vistos.add(novoId);
    mudou = true;

    return { ...question, id: novoId };
  });

  return mudou ? normalizadas : questions;
};

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

/**
 * Aplica os campos opcionais de imagem (imageUrl/imageWidth/imageHeight) a uma
 * questão. Como o Realtime Database não aceita valores `undefined`, os campos
 * só são adicionados quando há uma URL válida; caso contrário são removidos
 * (útil ao editar uma questão e apagar a imagem).
 * @param {Object} target - Objeto da questão a ser mutado
 * @param {Object} source - Dados da questão (de onde vêm os campos de imagem)
 * @returns {Object} - O próprio target, já com os campos ajustados
 */
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
