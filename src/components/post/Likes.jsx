import React, { useState, useEffect } from 'react';
import { ref, get, update, onValue } from "firebase/database";
import { Button, Typography } from "@mui/material";
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import { useAuth } from "../../context/AuthContext";
import { database } from "../../service/firebase";

const Likes = React.memo(({ post, onLikeUpdate }) => {
    const [likes, setLikes] = useState(post.likes ? post.likes.length : 0);
    const [likedPosts, setLikedPosts] = useState({});
    const [isUpdating, setIsUpdating] = useState(false);
    const { currentUser } = useAuth();

    useEffect(() => {
        verificarLike(post.id);
    }, [post.id]);

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
        <Button onClick={computarLike} disabled={isUpdating}>
            <ThumbUpIcon
                style={{
                    width: '35px',
                    height: '35px',
                    marginRight: '8px',
                    color: likedPosts[post.id] ? 'purple' : 'black',
                }}
            />
            <Typography style={{ color: 'black' }}> {likes} </Typography>
        </Button>
    );
});

export default Likes;