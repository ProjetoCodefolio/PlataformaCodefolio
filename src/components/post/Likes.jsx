import React, { useState, useEffect } from 'react';
import { ref, get, update } from "firebase/database";
import { Button, Typography } from "@mui/material";
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import { useAuth } from "../../context/AuthContext";
import { database } from "../../service/firebase";
import { getYouTubeID } from "./utils";
import axios from 'axios';

const Likes = React.memo(({ post, onLikeUpdate }) => {
    const [likes, setLikes] = useState(post.likes ? post.likes.length : 0);
    const [likesYouTube, setLikesYouTube] = useState(0);
    const [likedPosts, setLikedPosts] = useState({});
    const [isUpdating, setIsUpdating] = useState(false);
    const { currentUser } = useAuth();
    const API_KEY = import.meta.env.VITE_API_KEY;

    useEffect(() => {
        verificarLike(post.id);
    }, [post.id]);

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

    const computarLike = async () => {
        if (isUpdating) return; // Evitar múltiplas atualizações simultâneas
        setIsUpdating(true);

        const postRef = ref(database, `post/${post.id}`);

        try {
            const snapshot = await get(postRef);
            const postData = snapshot.val();

            let updatedLikes = [];
            if (postData && postData.likes) {
                const userLikeIndex = postData.likes.findIndex(like => like.uidUsuario === currentUser.uid);
                if (userLikeIndex !== -1) {
                    updatedLikes = postData.likes.filter((_, index) => index !== userLikeIndex);
                } else {
                    updatedLikes = [...postData.likes, {
                        uidUsuario: currentUser.uid,
                        nome: currentUser.displayName,
                        data: new Date().toLocaleDateString()
                    }];
                }
            } else {
                updatedLikes = [{
                    uidUsuario: currentUser.uid,
                    nome: currentUser.displayName,
                    data: new Date().toLocaleDateString()
                }];
            }

            // Atualizar o estado localmente
            setLikes(updatedLikes.length);
            setLikedPosts((prevLikedPosts) => ({
                ...prevLikedPosts,
                [post.id]: updatedLikes.some(like => like.uidUsuario === currentUser.uid),
            }));

            // Atualizar o post.likes no componente pai
            onLikeUpdate(post.id, updatedLikes);

            await update(postRef, { likes: updatedLikes });
        } catch (error) {
            console.error("Erro ao atualizar likes:", error);
        } finally {
            setIsUpdating(false);
        }
    };

    const verificarLike = (postId) => {
        if (post.likes) {
            const userLikeIndex = post.likes.findIndex(like => like.uidUsuario === currentUser.uid);
            setLikedPosts((prevLikedPosts) => ({
                ...prevLikedPosts,
                [postId]: userLikeIndex !== -1,
            }));
        } else {
            setLikedPosts((prevLikedPosts) => ({
                ...prevLikedPosts,
                [postId]: false,
            }));
        }
    };

    return (
        <Button onClick={computarLike} disabled={isUpdating} className="ThumbUpIcon">
            <ThumbUpIcon
                style={{
                    width: '35px',
                    height: '35px',
                    marginRight: '8px',
                    color: likedPosts[post.id] ? '#6a0dad' : 'black',
                    marginLeft: '7%'
                }}
            />
            {/* <Typography style={{ color: 'black' }}> {likes + likesYouTube} </Typography> */}
            <Typography style={{ color: 'black' }}> {likedPosts[post.id] ? 'Curtido' : 'Curtir'} </Typography>
        </Button>
    );
});

export default Likes;
