import { ref, get, update } from "firebase/database";
import { database } from "../../config/firebase";

// Check if user has liked or disliked a post
export const checkUserLikeStatus = (post, userId) => {
    if (!post || !userId) {
        return { liked: false, disliked: false };
    }

    const userLiked = post.likes && Array.isArray(post.likes) &&
        post.likes.some(like => like.uidUsuario === userId);

    const userDisliked = post.dislikes && Array.isArray(post.dislikes) &&
        post.dislikes.some(dislike => dislike.uidUsuario === userId);

    return { liked: userLiked, disliked: userDisliked };
};

// Toggle like on a post (add or remove like)
export const togglePostLike = async (postId, currentUser) => {
    try {
        if (!currentUser) {
            return { success: false, error: "User must be logged in" };
        }

        const postRef = ref(database, `post/${postId}`);
        const snapshot = await get(postRef);
        if (!snapshot.exists()) {
            return { success: false, error: "Post not found" };
        }

        const postData = snapshot.val();
        let updatedLikes = [];
        let updatedDislikes = postData.dislikes || [];

        // Check if user already liked post
        const userLikeIndex = postData.likes ?
            postData.likes.findIndex(like => like.uidUsuario === currentUser.uid) : -1;

        // Check if user already disliked post (to remove dislike when liking)
        const userDislikeIndex = postData.dislikes ?
            postData.dislikes.findIndex(dislike => dislike.uidUsuario === currentUser.uid) : -1;

        // Toggle like
        if (userLikeIndex !== -1) {
            // Remove like if it exists
            updatedLikes = postData.likes.filter((_, index) => index !== userLikeIndex);
        } else {
            // Add like if it doesn't exist
            updatedLikes = [...(postData.likes || []), {
                uidUsuario: currentUser.uid,
                nome: currentUser.displayName,
                data: new Date().toLocaleDateString()
            }];

            // Remove dislike if it exists
            if (userDislikeIndex !== -1) {
                updatedDislikes = postData.dislikes.filter((_, index) => index !== userDislikeIndex);
            }
        }

        // Update database
        await update(postRef, { likes: updatedLikes, dislikes: updatedDislikes });

        return {
            success: true,
            liked: userLikeIndex === -1, // true if like was added, false if removed
            disliked: false,
            likes: updatedLikes,
            dislikes: updatedDislikes
        };
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

        const postRef = ref(database, `post/${postId}`);
        const snapshot = await get(postRef);
        if (!snapshot.exists()) {
            return { success: false, error: "Post not found" };
        }

        const postData = snapshot.val();
        let updatedDislikes = [];
        let updatedLikes = postData.likes || [];

        // Check if user already disliked post
        const userDislikeIndex = postData.dislikes ?
            postData.dislikes.findIndex(dislike => dislike.uidUsuario === currentUser.uid) : -1;

        // Check if user already liked post (to remove like when disliking)
        const userLikeIndex = postData.likes ?
            postData.likes.findIndex(like => like.uidUsuario === currentUser.uid) : -1;

        // Toggle dislike
        if (userDislikeIndex !== -1) {
            // Remove dislike if it exists
            updatedDislikes = postData.dislikes.filter((_, index) => index !== userDislikeIndex);
        } else {
            // Add dislike if it doesn't exist
            updatedDislikes = [...(postData.dislikes || []), {
                uidUsuario: currentUser.uid,
                nome: currentUser.displayName,
                data: new Date().toLocaleDateString()
            }];

            // Remove like if it exists
            if (userLikeIndex !== -1) {
                updatedLikes = postData.likes.filter((_, index) => index !== userLikeIndex);
            }
        }

        // Update database
        await update(postRef, { likes: updatedLikes, dislikes: updatedDislikes });

        return {
            success: true,
            disliked: userDislikeIndex === -1, // true if dislike was added, false if removed
            liked: false,
            likes: updatedLikes,
            dislikes: updatedDislikes
        };
    } catch (error) {
        console.error("Error updating post dislike:", error);
        return { success: false, error: error.message };
    }
};