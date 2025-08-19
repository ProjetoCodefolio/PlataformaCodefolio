import axios from 'axios';
import { getYouTubeID } from "../../utils/postUtils";

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

// Get YouTube likes count
export const getLikesYouTubeCount = async (videoUrl) => {
    try {
        const API_KEY = import.meta.env.VITE_API_KEY;
        const videoId = getYouTubeID(videoUrl);

        if (!videoId) {
            return 0;
        }

        const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
            params: {
                part: 'statistics',
                id: videoId,
                key: API_KEY,
            },
        });

        if (!response.data.items || response.data.items.length === 0) {
            return 0;
        }

        const likeCount = response.data.items[0].statistics.likeCount;
        return parseInt(likeCount, 10);
    } catch (error) {
        console.error('Error fetching YouTube likes:', error);
        return 0;
    }
};