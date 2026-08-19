// Dúvidas/considerações que os alunos registram em um conteúdo do curso.
//
// Formato do nó:
//   courseQuestions/{courseId}/{questionId}
//     contentId, contentTitle, text,
//     userId, userName, userPhotoURL,
//     createdAt (ISO), discussed, discussedAt (ISO|null)
//
// O `contentTitle` é gravado junto de propósito: o conteúdo pode ser excluído
// depois (a exclusão de vídeo/slide não cascateia para cá), e sem o título
// congelado a linha da tabela viraria "conteúdo desconhecido".
//
// ANONIMATO: a autoria fica gravada porque o professor precisa saber quem
// perguntou (aba "Dúvidas"). O anonimato é de INTERFACE — a apresentação em
// aula nunca mostra o autor. Como a raiz das regras do banco é `".read": true`,
// não é possível esconder a autoria no nível do banco sem mudar essa regra
// global, que está fora do escopo desta funcionalidade.

import { ref, get, onValue, push, set, update, remove } from "firebase/database";
import { database } from "../../config/firebase";

/** Limite de caracteres do texto da dúvida. */
export const MAX_QUESTION_LENGTH = 1000;

/**
 * Valida o texto de uma dúvida.
 * @param {string} text
 * @returns {{ isValid: boolean, message?: string }}
 */
export const validateQuestionText = (text) => {
  const trimmed = (text || "").trim();
  if (!trimmed) {
    return { isValid: false, message: "Escreva sua dúvida antes de enviar" };
  }
  if (trimmed.length > MAX_QUESTION_LENGTH) {
    return {
      isValid: false,
      message: `A dúvida deve ter no máximo ${MAX_QUESTION_LENGTH} caracteres`,
    };
  }
  return { isValid: true };
};

/**
 * Monta o nome exibido do autor a partir dos dados do usuário logado.
 */
const buildUserName = (user) => {
  const nome = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();
  return nome || user?.displayName || user?.name || "Aluno";
};

/**
 * Registra uma dúvida de um aluno em um conteúdo do curso.
 * @param {string} courseId
 * @param {{ contentId: string, contentTitle?: string, text: string }} data
 * @param {Object} user - userDetails do aluno (precisa de userId)
 * @returns {Promise<Object>} - dúvida criada (com id)
 */
export const addCourseQuestion = async (courseId, data, user) => {
  if (!courseId) throw new Error("ID do curso é obrigatório");
  if (!user?.userId) throw new Error("É preciso estar logado para enviar uma dúvida");
  if (!data?.contentId) throw new Error("Selecione o vídeo da dúvida");

  const validation = validateQuestionText(data.text);
  if (!validation.isValid) throw new Error(validation.message);

  const question = {
    contentId: data.contentId,
    contentTitle: (data.contentTitle || "").trim() || "Conteúdo sem título",
    text: data.text.trim(),
    userId: user.userId,
    userName: buildUserName(user),
    userPhotoURL: user.photoURL || "",
    createdAt: new Date().toISOString(),
    discussed: false,
    discussedAt: null,
  };

  const questionRef = push(ref(database, `courseQuestions/${courseId}`));
  await set(questionRef, question);

  return { ...question, id: questionRef.key };
};

/**
 * Converte o nó cru do Firebase na lista de dúvidas usada pelas telas, da mais
 * recente para a mais antiga. Fica separada da leitura porque as duas formas de
 * ler o nó — a busca pontual e o observador em tempo real — precisam entregar
 * exatamente o mesmo formato: uma tela que troca `get` por `onValue` não pode
 * mudar de comportamento por causa disso.
 * @param {Object|null} raw - valor do nó `courseQuestions/{courseId}`
 * @returns {Array}
 */
export const normalizeCourseQuestions = (raw) => {
  if (!raw || typeof raw !== "object") return [];

  return Object.entries(raw)
    .filter(([, item]) => item && typeof item === "object")
    .map(([id, item]) => ({
      id,
      contentId: item.contentId || "",
      contentTitle: item.contentTitle || "Conteúdo sem título",
      text: item.text || "",
      userId: item.userId || "",
      userName: item.userName || "Aluno",
      userPhotoURL: item.userPhotoURL || "",
      createdAt: item.createdAt || "",
      discussed: !!item.discussed,
      discussedAt: item.discussedAt || null,
    }))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
};

/**
 * Busca todas as dúvidas de um curso, da mais recente para a mais antiga.
 * @param {string} courseId
 * @returns {Promise<Array>}
 */
export const fetchCourseQuestions = async (courseId) => {
  if (!courseId) return [];

  try {
    const snapshot = await get(ref(database, `courseQuestions/${courseId}`));
    return normalizeCourseQuestions(snapshot.val());
  } catch (error) {
    console.error("Erro ao buscar dúvidas do curso:", error);
    return [];
  }
};

/**
 * Observa as dúvidas do curso EM TEMPO REAL (`onValue`).
 *
 * É o que faz a aula funcionar ao vivo: o aluno registra a dúvida no celular e
 * ela entra na projeção do professor sozinha, sem ninguém recarregar a página.
 * Por isso as telas do professor (apresentação e aba "Dúvidas") observam em vez
 * de buscar uma vez — `fetchCourseQuestions` continua para leituras pontuais.
 *
 * O callback é chamado JÁ na primeira leitura, com o estado atual do nó, então
 * quem observa não precisa buscar antes de assinar (seriam duas leituras e um
 * piscar de lista). Um curso sem nenhuma dúvida devolve `[]`, não erro.
 *
 * @param {string} courseId
 * @param {(questions: Array) => void} onChange - recebe a lista completa a cada mudança
 * @param {(error: Error) => void} [onError] - falha na assinatura (ex.: permissão)
 * @returns {() => void} função que encerra a observação (chamar no cleanup do efeito)
 */
export const observeCourseQuestions = (courseId, onChange, onError) => {
  if (!courseId || typeof onChange !== "function") return () => {};

  return onValue(
    ref(database, `courseQuestions/${courseId}`),
    (snapshot) => onChange(normalizeCourseQuestions(snapshot.val())),
    (error) => {
      console.error("Erro ao observar as dúvidas do curso:", error);
      if (typeof onError === "function") onError(error);
    }
  );
};

/**
 * Busca as dúvidas de UM aluno no curso (para ele revisar/excluir as próprias).
 * @param {string} courseId
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export const fetchUserCourseQuestions = async (courseId, userId) => {
  if (!courseId || !userId) return [];
  const all = await fetchCourseQuestions(courseId);
  return all.filter((question) => question.userId === userId);
};

/**
 * Observa em tempo real as dúvidas de UM aluno no curso.
 *
 * Serve à lista "minhas dúvidas" dentro do modal: com o observador, uma dúvida
 * recém-enviada aparece na lista sem recarregá-la à mão, e uma que o professor
 * excluiu some da tela do aluno que está com o modal aberto.
 *
 * @param {string} courseId
 * @param {string} userId
 * @param {(questions: Array) => void} onChange
 * @param {(error: Error) => void} [onError]
 * @returns {() => void} função que encerra a observação
 */
export const observeUserCourseQuestions = (courseId, userId, onChange, onError) => {
  if (!courseId || !userId || typeof onChange !== "function") return () => {};

  return observeCourseQuestions(
    courseId,
    (questions) => onChange(questions.filter((question) => question.userId === userId)),
    onError
  );
};

/**
 * Marca/desmarca uma dúvida como já discutida em aula. Dúvidas discutidas saem
 * da apresentação (para não repetirem na aula seguinte) mas continuam na aba.
 * @param {string} courseId
 * @param {string} questionId
 * @param {boolean} discussed
 * @returns {Promise<boolean>}
 */
export const setQuestionDiscussed = async (courseId, questionId, discussed) => {
  if (!courseId || !questionId) {
    throw new Error("ID do curso e da dúvida são obrigatórios");
  }

  await update(ref(database, `courseQuestions/${courseId}/${questionId}`), {
    discussed: !!discussed,
    discussedAt: discussed ? new Date().toISOString() : null,
  });

  return true;
};

/**
 * Exclui uma dúvida.
 * @param {string} courseId
 * @param {string} questionId
 * @returns {Promise<boolean>}
 */
export const deleteCourseQuestion = async (courseId, questionId) => {
  if (!courseId || !questionId) {
    throw new Error("ID do curso e da dúvida são obrigatórios");
  }

  await remove(ref(database, `courseQuestions/${courseId}/${questionId}`));
  return true;
};

/**
 * Aplica os filtros da aba "Dúvidas": recorte por conteúdo e busca por aluno.
 *
 * A busca é aplicada DEPOIS do filtro de conteúdo (e não sobre a lista inteira),
 * porque a tela promete "busca por aluno respeitando os filtros aplicados".
 * Lógica pura, separada da tela para poder ser testada.
 *
 * @param {Array} questions - lista completa
 * @param {{ contentId?: string, searchTerm?: string, onlyPending?: boolean }} filters
 * @returns {Array}
 */
export const filterCourseQuestions = (questions, filters = {}) => {
  if (!Array.isArray(questions)) return [];

  const { contentId = "", searchTerm = "", onlyPending = false } = filters;
  const term = searchTerm.trim().toLowerCase();

  return questions.filter((question) => {
    if (!question) return false;
    if (contentId && question.contentId !== contentId) return false;
    if (onlyPending && question.discussed) return false;
    if (term && !String(question.userName || "").toLowerCase().includes(term)) {
      return false;
    }
    return true;
  });
};

/**
 * Agrupa as dúvidas por conteúdo, com a contagem de cada um. Usado para montar
 * o seletor de vídeo do filtro.
 *
 * A ordem é alfabética e sensível a números ("Aula 2" antes de "Aula 10"), e
 * não a de chegada das dúvidas: o seletor precisa ficar parado no mesmo lugar
 * entre uma abertura e outra da aba.
 * @param {Array} questions
 * @returns {Array<{ contentId: string, contentTitle: string, total: number }>}
 */
export const summarizeQuestionsByContent = (questions) => {
  if (!Array.isArray(questions)) return [];

  const porConteudo = new Map();
  questions.forEach((question) => {
    if (!question?.contentId) return;
    const atual = porConteudo.get(question.contentId);
    if (atual) {
      atual.total += 1;
      return;
    }
    porConteudo.set(question.contentId, {
      contentId: question.contentId,
      contentTitle: question.contentTitle || "Conteúdo sem título",
      total: 1,
    });
  });

  return Array.from(porConteudo.values()).sort((a, b) =>
    a.contentTitle.localeCompare(b.contentTitle, "pt-BR", { numeric: true })
  );
};
