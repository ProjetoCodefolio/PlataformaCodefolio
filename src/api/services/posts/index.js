// import { ref, push, set, onValue, get, update } from "firebase/database";
// import { database } from "../../../service/firebase";
// import { fetchYouTubeComments, getYouTubeID } from "../../utils/postUtils";
// import axios from 'axios';

// // Create a new post
// export const createPost = async (postData, currentUser) => {
//     try {
//         const { title, link, selectedTags } = postData;

//         // Fetch YouTube comments if available
//         const commentsYouTube = await fetchYouTubeComments(link);

//         // Create post object
//         const newPostData = {
//             data: new Date().toLocaleDateString(),
//             link: link,
//             nome: title,
//             tags: selectedTags,
//             uidUser: currentUser.uid,
//             user: currentUser.displayName || currentUser.email,
//             userAvatar: currentUser.photoURL || "default-avatar-url",
//         };

//         // Add YouTube comments if any
//         if (commentsYouTube.length > 0) {
//             newPostData.comentarios = commentsYouTube;
//         }

//         // Save to database
//         const postsRef = ref(database, "post");
//         const newPostRef = push(postsRef);
//         await set(newPostRef, newPostData);

//         return { success: true, postId: newPostRef.key };
//     } catch (error) {
//         console.error("Error creating post:", error);
//         return { success: false, error: error.message };
//     }
// };

// // Edit an existing post
// export const editPost = async (postId, postData) => {
//     try {
//         const { title, link, tags } = postData;
//         const postRef = ref(database, `post/${postId}`);
//         await update(postRef, {
//             nome: title,
//             link: link,
//             tags: tags
//         });
//         return { success: true };
//     } catch (error) {
//         console.error("Error updating post:", error);
//         return { success: false, error: error.message };
//     }
// };

// // Fetch all available tags
// export const fetchTags = () => {
//     return new Promise((resolve, reject) => {
//         const tagsRef = ref(database, 'tags');

//         onValue(tagsRef, (snapshot) => {
//             const data = snapshot.val();
//             let tagsArray = [];

//             if (data) {
//                 for (let tag in data) {
//                     tagsArray.push(data[tag].nome);
//                 }
//             }

//             resolve(tagsArray);
//         }, (error) => {
//             console.error("Error fetching tags:", error);
//             reject(error);
//         });
//     });
// };

// // Generate YouTube embed URL from regular URL
// export const generateEmbedURL = (url) => {
//     try {
//         const objetoUrl = new URL(url);
//         const idDoVideo = objetoUrl.searchParams.get("v");
//         if (!idDoVideo) {
//             throw new Error("URL do YouTube inválida: ID do vídeo não encontrado.");
//         }
//         return `https://www.youtube.com/embed/${idDoVideo}`;
//     } catch (erro) {
//         console.error(erro.message);
//         return null;
//     }
// };

// // Fetch all posts
// export const fetchAllPosts = () => {
//     return new Promise((resolve, reject) => {
//         const postsRef = ref(database, "post");

//         get(postsRef)
//             .then((snapshot) => {
//                 const postsData = snapshot.val();
//                 if (postsData) {
//                     const postsList = Object.keys(postsData).map((key) => ({
//                         id: key,
//                         ...postsData[key],
//                     })).reverse();

//                     resolve(postsList);
//                 } else {
//                     resolve([]);
//                 }
//             })
//             .catch((error) => {
//                 console.error("Error fetching posts:", error);
//                 reject(error);
//             });
//     });
// };

// // Filter posts by tags
// export const filterPostsByTags = async (selectedTags) => {
//     try {
//         if (!Array.isArray(selectedTags) || selectedTags.length === 0) {
//             return { success: false, error: "No tags selected" };
//         }

//         const posts = await fetchAllPosts();

//         const filteredPosts = posts.filter((post) => {
//             if (!post.tags || !Array.isArray(post.tags)) {
//                 return false;
//             }
//             return selectedTags.some(tag => post.tags.includes(tag));
//         });

//         return { success: true, posts: filteredPosts };
//     } catch (error) {
//         console.error("Error filtering posts:", error);
//         return { success: false, error: error.message };
//     }
// };

// // Listen for post changes and get disabled tags
// export const listenToPostsAndGetDisabledTags = (tags, callback) => {
//     const postsRef = ref(database, 'post');

//     return onValue(postsRef, (snapshot) => {
//         const postsData = snapshot.val();
//         if (postsData) {
//             const postsList = Object.keys(postsData).map((key) => ({
//                 id: key,
//                 ...postsData[key],
//             })).reverse();

//             // Determine which tags have associated posts
//             const tagsWithPosts = new Set();
//             postsList.forEach(post => {
//                 if (Array.isArray(post.tags)) {
//                     post.tags.forEach(tag => tagsWithPosts.add(tag));
//                 }
//             });

//             const disabledTags = tags.filter(tag => !tagsWithPosts.has(tag));
//             callback(postsList, disabledTags);
//         } else {
//             callback([], tags);
//         }
//     }, (error) => {
//         console.error("Error listening to posts:", error);
//     });
// };

// // Listen for tags changes
// export const listenToTags = (callback) => {
//     const tagsRef = ref(database, 'tags');

//     return onValue(tagsRef, (snapshot) => {
//         const data = snapshot.val();
//         let tagsArray = [];

//         if (data) {
//             for (let tag in data) {
//                 tagsArray.push(data[tag].nome);
//             }
//         }

//         callback(tagsArray);
//     }, (error) => {
//         console.error("Error listening to tags:", error);
//     });
// };

// // Get YouTube likes count
// export const getLikesYouTubeCount = async (videoUrl) => {
//     try {
//         const API_KEY = import.meta.env.VITE_API_KEY;
//         const videoId = getYouTubeID(videoUrl);

//         if (!videoId) {
//             return 0;
//         }

//         const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
//             params: {
//                 part: 'statistics',
//                 id: videoId,
//                 key: API_KEY,
//             },
//         });

//         if (!response.data.items || response.data.items.length === 0) {
//             return 0;
//         }

//         const likeCount = response.data.items[0].statistics.likeCount;
//         return parseInt(likeCount, 10);
//     } catch (error) {
//         console.error('Error fetching YouTube likes:', error);
//         return 0;
//     }
// };

// // Listen to post likes and comments
// export const listenToPostLikesAndComments = (postId, callback) => {
//     if (!postId) return () => { };

//     const postRef = ref(database, `post/${postId}`);

//     return onValue(postRef, (snapshot) => {
//         const data = snapshot.val();
//         if (!data) {
//             callback({
//                 likes: 0,
//                 comments: []
//             });
//             return;
//         }

//         const likesCount = data.likes ? data.likes.length : 0;
//         const comments = data.comentarios || [];

//         callback({
//             likes: likesCount,
//             comments: comments
//         });
//     }, (error) => {
//         console.error("Error listening to post likes and comments:", error);
//         callback({
//             likes: 0,
//             comments: []
//         });
//     });
// };

// // Check if user has liked or disliked a post
// export const checkUserLikeStatus = (post, userId) => {
//     if (!post || !userId) {
//         return { liked: false, disliked: false };
//     }

//     const userLiked = post.likes && Array.isArray(post.likes) &&
//         post.likes.some(like => like.uidUsuario === userId);

//     const userDisliked = post.dislikes && Array.isArray(post.dislikes) &&
//         post.dislikes.some(dislike => dislike.uidUsuario === userId);

//     return { liked: userLiked, disliked: userDisliked };
// };

// // Toggle like on a post (add or remove like)
// export const togglePostLike = async (postId, currentUser) => {
//     try {
//         if (!currentUser) {
//             return { success: false, error: "User must be logged in" };
//         }

//         const postRef = ref(database, `post/${postId}`);
//         const snapshot = await get(postRef);
//         if (!snapshot.exists()) {
//             return { success: false, error: "Post not found" };
//         }

//         const postData = snapshot.val();
//         let updatedLikes = [];
//         let updatedDislikes = postData.dislikes || [];

//         // Check if user already liked post
//         const userLikeIndex = postData.likes ?
//             postData.likes.findIndex(like => like.uidUsuario === currentUser.uid) : -1;

//         // Check if user already disliked post (to remove dislike when liking)
//         const userDislikeIndex = postData.dislikes ?
//             postData.dislikes.findIndex(dislike => dislike.uidUsuario === currentUser.uid) : -1;

//         // Toggle like
//         if (userLikeIndex !== -1) {
//             // Remove like if it exists
//             updatedLikes = postData.likes.filter((_, index) => index !== userLikeIndex);
//         } else {
//             // Add like if it doesn't exist
//             updatedLikes = [...(postData.likes || []), {
//                 uidUsuario: currentUser.uid,
//                 nome: currentUser.displayName,
//                 data: new Date().toLocaleDateString()
//             }];

//             // Remove dislike if it exists
//             if (userDislikeIndex !== -1) {
//                 updatedDislikes = postData.dislikes.filter((_, index) => index !== userDislikeIndex);
//             }
//         }

//         // Update database
//         await update(postRef, { likes: updatedLikes, dislikes: updatedDislikes });

//         return {
//             success: true,
//             liked: userLikeIndex === -1, // true if like was added, false if removed
//             disliked: false,
//             likes: updatedLikes,
//             dislikes: updatedDislikes
//         };
//     } catch (error) {
//         console.error("Error updating post like:", error);
//         return { success: false, error: error.message };
//     }
// };

// // Toggle dislike on a post (add or remove dislike)
// export const togglePostDislike = async (postId, currentUser) => {
//     try {
//         if (!currentUser) {
//             return { success: false, error: "User must be logged in" };
//         }

//         const postRef = ref(database, `post/${postId}`);
//         const snapshot = await get(postRef);
//         if (!snapshot.exists()) {
//             return { success: false, error: "Post not found" };
//         }

//         const postData = snapshot.val();
//         let updatedDislikes = [];
//         let updatedLikes = postData.likes || [];

//         // Check if user already disliked post
//         const userDislikeIndex = postData.dislikes ?
//             postData.dislikes.findIndex(dislike => dislike.uidUsuario === currentUser.uid) : -1;

//         // Check if user already liked post (to remove like when disliking)
//         const userLikeIndex = postData.likes ?
//             postData.likes.findIndex(like => like.uidUsuario === currentUser.uid) : -1;

//         // Toggle dislike
//         if (userDislikeIndex !== -1) {
//             // Remove dislike if it exists
//             updatedDislikes = postData.dislikes.filter((_, index) => index !== userDislikeIndex);
//         } else {
//             // Add dislike if it doesn't exist
//             updatedDislikes = [...(postData.dislikes || []), {
//                 uidUsuario: currentUser.uid,
//                 nome: currentUser.displayName,
//                 data: new Date().toLocaleDateString()
//             }];

//             // Remove like if it exists
//             if (userLikeIndex !== -1) {
//                 updatedLikes = postData.likes.filter((_, index) => index !== userLikeIndex);
//             }
//         }

//         // Update database
//         await update(postRef, { likes: updatedLikes, dislikes: updatedDislikes });

//         return {
//             success: true,
//             disliked: userDislikeIndex === -1, // true if dislike was added, false if removed
//             liked: false,
//             likes: updatedLikes,
//             dislikes: updatedDislikes
//         };
//     } catch (error) {
//         console.error("Error updating post dislike:", error);
//         return { success: false, error: error.message };
//     }
// };

// // Get comments for a specific post
// export const getPostComments = (postId, onCommentsUpdate) => {
//   if (!postId) return () => {};

//   const postRef = ref(database, `post/${postId}`);
//   return onValue(postRef, (snapshot) => {
//     const data = snapshot.val();
//     const comments = data && data.comentarios ? data.comentarios : [];
//     onCommentsUpdate(comments);
//   }, (error) => {
//     console.error("Error fetching post comments:", error);
//     onCommentsUpdate([]);
//   });
// };

import { createPost, editPost, fetchAllPosts } from './postCrud';
import { checkUserLikeStatus, togglePostLike, togglePostDislike } from './postInteractions';
import { getPostComments, postComment } from './comments';
import { fetchTags, filterPostsByTags } from './tags';
import { generateEmbedURL, getLikesYouTubeCount } from './youtube';
import { listenToPostsAndGetDisabledTags, listenToTags, listenToPostLikesAndComments, listenToPostCount } from './listeners';

export {
    // Post CRUD operations
    createPost,
    editPost,
    fetchAllPosts,
    
    // Post interactions
    checkUserLikeStatus,
    togglePostLike,
    togglePostDislike,
    
    // Comments
    getPostComments,
    postComment,
    
    // Tags
    fetchTags,
    filterPostsByTags,
    
    // YouTube
    generateEmbedURL,
    getLikesYouTubeCount,
    
    // Listeners
    listenToPostsAndGetDisabledTags,
    listenToTags,
    listenToPostLikesAndComments,
    listenToPostCount
};