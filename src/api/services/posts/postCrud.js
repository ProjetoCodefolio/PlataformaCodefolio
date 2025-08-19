import { ref, push, set, onValue, get, update } from "firebase/database";
import { database } from "../../config/firebase";
import { fetchYouTubeComments, getYouTubeID } from "../../utils/postUtils";

// Create a new post
export const createPost = async (postData, currentUser) => {
    try {
        const { title, link, selectedTags } = postData;

        // Fetch YouTube comments if available
        const commentsYouTube = await fetchYouTubeComments(link);

        // Create post object
        const newPostData = {
            data: new Date().toLocaleDateString(),
            link: link,
            nome: title,
            tags: selectedTags,
            uidUser: currentUser.uid,
            user: currentUser.displayName || currentUser.email,
            userAvatar: currentUser.photoURL || "default-avatar-url",
        };

        // Add YouTube comments if any
        if (commentsYouTube.length > 0) {
            newPostData.comentarios = commentsYouTube;
        }

        // Save to database
        const postsRef = ref(database, "post");
        const newPostRef = push(postsRef);
        await set(newPostRef, newPostData);

        return { success: true, postId: newPostRef.key };
    } catch (error) {
        console.error("Error creating post:", error);
        return { success: false, error: error.message };
    }
};

// Edit an existing post
export const editPost = async (postId, postData) => {
    try {
        const { title, link, tags } = postData;
        const postRef = ref(database, `post/${postId}`);
        await update(postRef, {
            nome: title,
            link: link,
            tags: tags
        });
        return { success: true };
    } catch (error) {
        console.error("Error updating post:", error);
        return { success: false, error: error.message };
    }
};

// Fetch all available tags
export const fetchTags = () => {
    return new Promise((resolve, reject) => {
        const tagsRef = ref(database, 'tags');

        onValue(tagsRef, (snapshot) => {
            const data = snapshot.val();
            let tagsArray = [];

            if (data) {
                for (let tag in data) {
                    tagsArray.push(data[tag].nome);
                }
            }

            resolve(tagsArray);
        }, (error) => {
            console.error("Error fetching tags:", error);
            reject(error);
        });
    });
};

// Generate YouTube embed URL from regular URL
export const generateEmbedURL = (url) => {
    try {
        const objetoUrl = new URL(url);
        const idDoVideo = objetoUrl.searchParams.get("v");
        if (!idDoVideo) {
            throw new Error("URL do YouTube inválida: ID do vídeo não encontrado.");
        }
        return `https://www.youtube.com/embed/${idDoVideo}`;
    } catch (erro) {
        console.error(erro.message);
        return null;
    }
};

// Fetch all posts
export const fetchAllPosts = () => {
    return new Promise((resolve, reject) => {
        const postsRef = ref(database, "post");

        get(postsRef)
            .then((snapshot) => {
                const postsData = snapshot.val();
                if (postsData) {
                    const postsList = Object.keys(postsData).map((key) => ({
                        id: key,
                        ...postsData[key],
                    })).reverse();

                    resolve(postsList);
                } else {
                    resolve([]);
                }
            })
            .catch((error) => {
                console.error("Error fetching posts:", error);
                reject(error);
            });
    });
};
