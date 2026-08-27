// Comentários da turma num conteúdo do curso.
//
// Formato do nó:
//   courseVideoComments/{courseId}/{contentId}/{commentId}
//     text, userId, userName, userPhotoURL, createdAt (ISO), parentId
//
// É uma discussão PÚBLICA da turma, e é isso que a distingue das Dúvidas
// (`courseQuestions`): a dúvida é um canal para o professor levar a questão para
// a aula, com uma linha na tabela dele; o comentário é conversa entre alunos,
// visível para todos, com resposta escrita ali mesmo.
//
// As respostas têm UM nível: `parentId` aponta sempre para um comentário raiz.
// Aninhar sem limite transformaria a leitura no celular numa escada.
//
// Ao contrário do progresso do aluno, o comentário NÃO é apagado quando o vídeo
// é excluído — pelo mesmo motivo que o progresso não é: reenviar uma versão
// corrigida do vídeo não deve varrer a discussão da turma. A limpeza acontece só
// na exclusão do curso (cascata de `deleteCourse`).

import { ref, onValue, push, set, update } from "firebase/database";
import { database } from "../../config/firebase";

/** Limite de caracteres de um comentário (o mesmo que a regra do banco valida). */
export const MAX_COMMENT_LENGTH = 1000;

/**
 * Valida o texto de um comentário.
 * @param {string} text
 * @returns {{ isValid: boolean, message?: string }}
 */
export const validateCommentText = (text) => {
  const trimmed = (text || "").trim();
  if (!trimmed) {
    return { isValid: false, message: "Escreva algo antes de enviar" };
  }
  if (trimmed.length > MAX_COMMENT_LENGTH) {
    return {
      isValid: false,
      message: `O comentário deve ter no máximo ${MAX_COMMENT_LENGTH} caracteres`,
    };
  }
  return { isValid: true };
};

/** Monta o nome exibido do autor a partir dos dados do usuário logado. */
const buildUserName = (user) => {
  const nome = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();
  return nome || user?.displayName || user?.name || "Aluno";
};

/**
 * Organiza os comentários crus em raízes com suas respostas, em ordem
 * cronológica dos dois lados.
 * @param {Object} raw - nó `courseVideoComments/{courseId}/{contentId}`
 * @returns {Array} - raízes, cada uma com `replies`
 */
export const buildCommentThreads = (raw) => {
  if (!raw || typeof raw !== "object") return [];

  const todos = Object.entries(raw)
    .filter(([, valor]) => valor && typeof valor === "object" && valor.text)
    .map(([id, valor]) => ({ id, ...valor, replies: [] }));

  const porData = (a, b) =>
    String(a.createdAt || "").localeCompare(String(b.createdAt || ""));

  const porId = new Map(todos.map((c) => [c.id, c]));
  const raizes = [];

  todos.sort(porData).forEach((comentario) => {
    const pai = comentario.parentId ? porId.get(comentario.parentId) : null;
    // Resposta cujo comentário raiz foi apagado sobe para a raiz: escondê-la
    // faria a mensagem sumir da tela sem ninguém ter apagado nada.
    if (pai && pai.id !== comentario.id) {
      pai.replies.push(comentario);
    } else {
      raizes.push(comentario);
    }
  });

  raizes.forEach((raiz) => raiz.replies.sort(porData));
  return raizes;
};

/** Total de comentários de uma lista de threads (raízes + respostas). */
export const countComments = (threads) =>
  (threads || []).reduce((total, raiz) => total + 1 + (raiz.replies?.length || 0), 0);

/**
 * Escuta os comentários de um conteúdo.
 * @param {string} courseId
 * @param {string} contentId
 * @param {(threads: Array) => void} callback
 * @returns {() => void} - cancela a escuta
 */
export const listenToVideoComments = (courseId, contentId, callback) => {
  if (!courseId || !contentId) return () => {};

  const comentariosRef = ref(database, `courseVideoComments/${courseId}/${contentId}`);
  return onValue(
    comentariosRef,
    (snapshot) => callback(buildCommentThreads(snapshot.val())),
    (error) => {
      console.error("Erro ao ler comentários do conteúdo:", error);
      callback([]);
    }
  );
};

/**
 * Publica um comentário (ou uma resposta, com `parentId`).
 * @param {string} courseId
 * @param {string} contentId
 * @param {{ text: string, parentId?: string|null }} data
 * @param {Object} user - userDetails do autor (precisa de userId)
 * @returns {Promise<Object>} - comentário criado (com id)
 */
export const addVideoComment = async (courseId, contentId, data, user) => {
  if (!courseId || !contentId) throw new Error("Curso e conteúdo são obrigatórios");
  if (!user?.userId) throw new Error("É preciso estar logado para comentar");

  const validation = validateCommentText(data?.text);
  if (!validation.isValid) throw new Error(validation.message);

  const comentario = {
    text: data.text.trim(),
    userId: user.userId,
    userName: buildUserName(user),
    userPhotoURL: user.photoURL || "",
    createdAt: new Date().toISOString(),
    parentId: data.parentId || null,
  };

  const comentarioRef = push(
    ref(database, `courseVideoComments/${courseId}/${contentId}`)
  );
  await set(comentarioRef, comentario);

  return { ...comentario, id: comentarioRef.key, replies: [] };
};

/**
 * Edita o texto do próprio comentário. A regra do banco impede trocar o autor.
 */
export const editVideoComment = async (courseId, contentId, commentId, text) => {
  const validation = validateCommentText(text);
  if (!validation.isValid) throw new Error(validation.message);

  await update(
    ref(database, `courseVideoComments/${courseId}/${contentId}/${commentId}`),
    { text: text.trim(), editedAt: new Date().toISOString() }
  );
  return true;
};

/**
 * Apaga um comentário. Quem pode: o autor, o dono do curso, quem é professor do
 * curso e o admin — a regra do banco é a fonte, esta função só chama.
 *
 * Apagar uma raiz leva junto as respostas dela: deixá-las órfãs numa thread que
 * não existe mais só confundiria a leitura.
 */
export const deleteVideoComment = async (courseId, contentId, comment) => {
  if (!courseId || !contentId || !comment?.id) {
    throw new Error("Comentário inválido");
  }

  const base = `courseVideoComments/${courseId}/${contentId}`;
  const updates = { [`${base}/${comment.id}`]: null };
  (comment.replies || []).forEach((resposta) => {
    updates[`${base}/${resposta.id}`] = null;
  });

  await update(ref(database), updates);
  return true;
};

/**
 * Indica se o usuário pode apagar o comentário.
 *
 * É o mesmo critério que a regra do banco aplica — autor, dono do curso,
 * professor do curso ou admin —, replicado aqui só para decidir se o botão
 * aparece. Quem manda continua sendo a regra: burlar isto no cliente não
 * consegue apagar nada.
 * @param {Object} comment
 * @param {Object} userDetails
 * @param {{ courseId?: string, courseOwnerUid?: string }} contexto
 * @returns {boolean}
 */
export const canDeleteComment = (comment, userDetails, contexto = {}) => {
  const { courseId, courseOwnerUid } = contexto;
  if (!comment || !userDetails?.userId) return false;
  if (comment.userId === userDetails.userId) return true;
  if (courseOwnerUid && userDetails.userId === courseOwnerUid) return true;
  if (userDetails.role === "admin") return true;
  return Boolean(courseId && userDetails.coursesTeacher?.[courseId]);
};
