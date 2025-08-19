import { ref, get, update, onValue } from "firebase/database";
import { database } from "../../config/firebase";

export const getPostComments = (postId, onCommentsUpdate) => {
  const postRef = ref(database, `post/${postId}`);
  return onValue(postRef, (snapshot) => {
    const data = snapshot.val();
    const comments = data && data.comentarios ? data.comentarios : [];
    onCommentsUpdate(comments);
  });
};

export const postComment = async (postId, comentario, currentUser) => {
  const dataComentario = new Date().toLocaleDateString();
  const novoComentario = {
    uidUsuario: currentUser.uid,
    nome: currentUser.displayName,
    comentario: comentario,
    data: dataComentario,
    foto: currentUser.photoURL
  };

  const postRef = ref(database, `post/${postId}`);

  try {
    const snapshot = await get(postRef);
    const postData = snapshot.val();

    let comentarioPostar = [];
    if (postData && postData.comentarios) {
      comentarioPostar = [...postData.comentarios, novoComentario];
    } else {
      comentarioPostar = [novoComentario];
    }

    await update(postRef, { comentarios: comentarioPostar });
    return true; // Success indicator
  } catch (error) {
    console.error("Erro ao postar comentário: ", error);
    return false; // Failure indicator
  }
};