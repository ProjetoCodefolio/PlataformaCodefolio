import { ref, get, update } from "firebase/database";
import { database } from "../../config/firebase";

/**
 * As curtidas do feed vivem em mapas indexados pelo uid de quem curtiu:
 *
 *   post/{postId}/likes/{uid}    = { nome, data }
 *   post/{postId}/dislikes/{uid} = { nome, data }
 *
 * É esse formato que as regras do banco conseguem proteger por dono — cada um
 * escreve só na própria folha —, e é o que dispensa reescrever a lista inteira
 * a cada clique (o que perdia curtidas quando duas pessoas clicavam juntas).
 *
 * Até a migração dos posts antigos rodar, o banco ainda pode devolver o formato
 * anterior (uma lista de { uidUsuario, ... }); por isso toda LEITURA passa por
 * `normalizeInteractions`, que entende os dois.
 */
export const normalizeInteractions = (raw) => {
    if (!raw || typeof raw !== "object") return {};

    return Object.entries(raw).reduce((mapa, [chave, valor]) => {
        if (!valor || typeof valor !== "object") return mapa;
        // No formato novo a chave já é o uid; no antigo ele vem no registro.
        mapa[valor.uidUsuario || chave] = valor;
        return mapa;
    }, {});
};

export const countInteractions = (raw) => Object.keys(normalizeInteractions(raw)).length;

// Check if user has liked or disliked a post
export const checkUserLikeStatus = (post, userId) => {
    if (!post || !userId) {
        return { liked: false, disliked: false };
    }

    return {
        liked: Boolean(normalizeInteractions(post.likes)[userId]),
        disliked: Boolean(normalizeInteractions(post.dislikes)[userId]),
    };
};

const registroDe = (currentUser) => ({
    nome: currentUser.displayName || currentUser.email || "Usuário",
    data: new Date().toLocaleDateString(),
});

/**
 * Marca ou desmarca a interação do usuário, sempre removendo a oposta.
 *
 * O update é multi-caminho a partir da raiz do post: o banco avalia cada folha
 * com a regra do seu dono (`auth.uid === $uid`) e aplica as duas de uma vez, sem
 * janela em que a pessoa aparece curtindo e descurtindo ao mesmo tempo.
 */
const alternarInteracao = async (postId, currentUser, campo) => {
    const oposto = campo === "likes" ? "dislikes" : "likes";
    const snapshot = await get(ref(database, `post/${postId}/${campo}/${currentUser.uid}`));
    const jaMarcado = snapshot.exists();

    await update(ref(database, `post/${postId}`), {
        [`${campo}/${currentUser.uid}`]: jaMarcado ? null : registroDe(currentUser),
        [`${oposto}/${currentUser.uid}`]: null,
    });

    return !jaMarcado;
};

// Toggle like on a post (add or remove like)
export const togglePostLike = async (postId, currentUser) => {
    try {
        if (!currentUser) {
            return { success: false, error: "User must be logged in" };
        }

        const liked = await alternarInteracao(postId, currentUser, "likes");
        return { success: true, liked, disliked: false };
    } catch (error) {
        console.error("Error updating post like:", error);
        return { success: false, error: error.message };
    }
};

// Toggle dislike on a post (add or remove dislike)
export const togglePostDislike = async (postId, currentUser) => {
    try {
        if (!currentUser) {
            return { success: false, error: "User must be logged in" };
        }

        const disliked = await alternarInteracao(postId, currentUser, "dislikes");
        return { success: true, disliked, liked: false };
    } catch (error) {
        console.error("Error updating post dislike:", error);
        return { success: false, error: error.message };
    }
};
