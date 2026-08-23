import { ref, onValue } from "firebase/database";
import { database } from "../../config/firebase";
import { normalizeInteractions } from "./postInteractions";
import { normalizeComments } from "./comments";

// Listen for post changes and get disabled tags
export const listenToPostsAndGetDisabledTags = (tags, callback) => {
    const postsRef = ref(database, 'post');

    return onValue(postsRef, (snapshot) => {
        const postsData = snapshot.val();
        if (postsData) {
            const postsList = Object.keys(postsData).map((key) => ({
                id: key,
                ...postsData[key],
            })).reverse();

            // Determine which tags have associated posts
            const tagsWithPosts = new Set();
            postsList.forEach(post => {
                if (Array.isArray(post.tags)) {
                    post.tags.forEach(tag => tagsWithPosts.add(tag));
                }
            });

            const disabledTags = tags.filter(tag => !tagsWithPosts.has(tag));
            callback(postsList, disabledTags);
        } else {
            callback([], tags);
        }
    }, (error) => {
        console.error("Error listening to posts:", error);
    });
};

// Listen for tags changes
export const listenToTags = (callback) => {
    const tagsRef = ref(database, 'tags');

    return onValue(tagsRef, (snapshot) => {
        const data = snapshot.val();
        let tagsArray = [];

        if (data) {
            for (let tag in data) {
                tagsArray.push(data[tag].nome);
            }
        }

        callback(tagsArray);
    }, (error) => {
        console.error("Error listening to tags:", error);
    });
};

/**
 * Escuta, num único listener, tudo o que muda quando alguém interage com o post:
 * curtidas, descurtidas e comentários. É a fonte única do card do feed — antes
 * havia três `onValue` sobre o mesmo nó (contagem, lista de comentários e o
 * estado dos botões), e o card ficava com dados de épocas diferentes.
 */
export const listenToPostInteractions = (postId, callback) => {
    if (!postId) return () => { };

    const vazio = { likes: {}, dislikes: {}, comments: [] };
    const postRef = ref(database, `post/${postId}`);

    return onValue(postRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) {
            callback(vazio);
            return;
        }

        callback({
            likes: normalizeInteractions(data.likes),
            dislikes: normalizeInteractions(data.dislikes),
            comments: normalizeComments(data.comentarios),
        });
    }, (error) => {
        console.error("Error listening to post interactions:", error);
        callback(vazio);
    });
};

// Listen to post count
export const listenToPostCount = (callback) => {
  const postsRef = ref(database, 'post');
  
  return onValue(postsRef, (snapshot) => {
    const postsData = snapshot.val();
    const count = postsData ? Object.keys(postsData).length : 0;
    callback(count);
  }, (error) => {
    console.error("Error listening to post count:", error);
    callback(0);
  });
};