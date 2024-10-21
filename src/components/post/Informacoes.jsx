import { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { Typography } from "@mui/material";
import { database } from "../../service/firebase";
import { getYouTubeID } from "./utils";
import axios from 'axios';
import './post.css';

const Informacoes = ({ post, comments, setComments }) => {
    const quantidadeComentarios = comments[post.id] ? comments[post.id].length : 0;
    const [likesYouTube, setLikesYouTube] = useState(0);
    const [likes, setLikes] = useState(post.likes ? post.likes.length : 0);
    const API_KEY = import.meta.env.VITE_API_KEY;

    useEffect(() => {
        if (post.link) {
            const videoId = getYouTubeID(post.link);
            if (videoId) {
                getLikesYouTubeCount(videoId).then(setLikesYouTube);
            }
        }
    }, [post.link]);

    const getLikesYouTubeCount = async (videoId) => {
        try {
            const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
                params: {
                    part: 'statistics',
                    id: videoId,
                    key: API_KEY,
                },
            });
            const likeCount = response.data.items[0].statistics.likeCount;
            return parseInt(likeCount, 10); // Certifique-se de retornar um número
        } catch (error) {
            console.error('Error fetching likes:', error);
            return 0; // Retorne 0 em caso de erro
        }
    };

    useEffect(() => {
        const postRef = ref(database, `post/${post.id}`);
        const unsubscribe = onValue(postRef, (snapshot) => {
            const data = snapshot.val();
            if (data && data.likes) {
                setLikes(data.likes.length);
            } else {
                setLikes(0);
            }
            if (data && data.comentarios) {
                setComments((prevComments) => ({
                    ...prevComments,
                    [post.id]: data.comentarios,
                }));
            } else {
                setComments((prevComments) => ({
                    ...prevComments,
                    [post.id]: [],
                }));
            }
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, [post.id, setLikes, setComments]);

    return (
        <>
            <div className="info-container">
                <div className="info-likes"> {likes + likesYouTube} likes </div>
                <div className="info-comentarios"> {quantidadeComentarios} comentários </div>
            </div>
        </>
    );
}

export default Informacoes;