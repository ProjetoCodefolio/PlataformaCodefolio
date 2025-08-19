import { ref, onValue } from "firebase/database";
import { database } from "../../config/firebase";
import { fetchAllPosts } from "./postCrud";

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

// Filter posts by tags
export const filterPostsByTags = async (selectedTags) => {
    try {
        if (!Array.isArray(selectedTags) || selectedTags.length === 0) {
            return { success: false, error: "No tags selected" };
        }

        const posts = await fetchAllPosts();

        const filteredPosts = posts.filter((post) => {
            if (!post.tags || !Array.isArray(post.tags)) {
                return false;
            }
            return selectedTags.some(tag => post.tags.includes(tag));
        });

        return { success: true, posts: filteredPosts };
    } catch (error) {
        console.error("Error filtering posts:", error);
        return { success: false, error: error.message };
    }
};