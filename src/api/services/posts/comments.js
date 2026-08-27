import { ref, push, remove, onValue } from "firebase/database";
import { database } from "../../config/firebase";

/**
 * Os comentários do feed vivem em `post/{postId}/comentarios/{comentarioId}`,
 * com chave gerada por `push`. Antes eram uma lista reescrita por inteiro a cada
 * comentário novo, o que exigia permissão de escrita no post todo e perdia
 * comentários simultâneos; agora cada um escreve só a própria folha.
 *
 * Posts antigos ainda podem vir no formato de lista (chaves "0", "1", ...) até a
 * migração rodar — `normalizeComments` lê os dois e devolve sempre um array em
 * ordem cronológica.
 */
const ordemLegado = (a, b) => {
    const numerico = /^\d+$/;
    if (numerico.test(a) && numerico.test(b)) return Number(a) - Number(b);
    return a < b ? -1 : a > b ? 1 : 0;
};

export const normalizeComments = (raw) => {
    if (!raw || typeof raw !== "object") return [];

    return Object.entries(raw)
        .filter(([, valor]) => valor && typeof valor === "object")
        .map(([id, valor]) => ({ id, ...valor }))
        // Comentários migrados não têm `criadoEm` e são os mais antigos; entre
        // eles vale a ordem da chave, que preserva a sequência original.
        .sort((a, b) => (a.criadoEm || 0) - (b.criadoEm || 0) || ordemLegado(a.id, b.id));
};

export const getPostComments = (postId, onCommentsUpdate) => {
  if (!postId) return () => {};

  const comentariosRef = ref(database, `post/${postId}/comentarios`);
  return onValue(comentariosRef, (snapshot) => {
    onCommentsUpdate(normalizeComments(snapshot.val()));
  }, (error) => {
    console.error("Erro ao ler comentários: ", error);
    onCommentsUpdate([]);
  });
};

export const postComment = async (postId, comentario, currentUser) => {
  try {
    await push(ref(database, `post/${postId}/comentarios`), {
      uidUsuario: currentUser.uid,
      nome: currentUser.displayName || currentUser.email || "Usuário",
      comentario,
      data: new Date().toLocaleDateString(),
      foto: currentUser.photoURL || "",
      criadoEm: Date.now(),
    });
    return true; // Success indicator
  } catch (error) {
    console.error("Erro ao postar comentário: ", error);
    return false; // Failure indicator
  }
};

export const deleteComment = async (postId, comentarioId) => {
  try {
    await remove(ref(database, `post/${postId}/comentarios/${comentarioId}`));
    return true;
  } catch (error) {
    console.error("Erro ao apagar comentário: ", error);
    return false;
  }
};
