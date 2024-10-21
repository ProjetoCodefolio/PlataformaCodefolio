import React, { useState, useEffect } from 'react';
import { ref, get, update } from "firebase/database";
import { Button } from "@mui/material";
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import { useAuth } from "../../context/AuthContext";
import { database } from "../../service/firebase";

const Likes = React.memo(({ post, onLikeUpdate }) => {
    const [likedPosts, setLikedPosts] = useState({});
    const [dislikedPosts, setDislikedPosts] = useState({});
    const [isUpdating, setIsUpdating] = useState(false);
    const { currentUser } = useAuth();

    useEffect(() => {
        verificarLike(post.id);
        verificarDislike(post.id);
    }, [post.id]);
    
    const computarLike = async () => {
        if (isUpdating) return; // Evitar múltiplas atualizações simultâneas
        setIsUpdating(true);

        const postRef = ref(database, `post/${post.id}`);

        try {
            const snapshot = await get(postRef);
            const postData = snapshot.val();

            let updatedLikes = [];
            let updatedDislikes = postData.dislikes || [];

            const userLikeIndex = postData.likes ? postData.likes.findIndex(like => like.uidUsuario === currentUser.uid) : -1;
            const userDislikeIndex = postData.dislikes ? postData.dislikes.findIndex(dislike => dislike.uidUsuario === currentUser.uid) : -1;

            if (userLikeIndex !== -1) {
                updatedLikes = postData.likes.filter((_, index) => index !== userLikeIndex);
            } else {
                updatedLikes = [...(postData.likes || []), {
                    uidUsuario: currentUser.uid,
                    nome: currentUser.displayName,
                    data: new Date().toLocaleDateString()
                }];
                if (userDislikeIndex !== -1) {
                    updatedDislikes = postData.dislikes.filter((_, index) => index !== userDislikeIndex);
                }
            }

            // Atualizar o estado localmente
            setLikedPosts((prevLikedPosts) => ({
                ...prevLikedPosts,
                [post.id]: updatedLikes.some(like => like.uidUsuario === currentUser.uid),
            }));
            setDislikedPosts((prevDislikedPosts) => ({
                ...prevDislikedPosts,
                [post.id]: false,
            }));

            // Atualizar o post.likes e post.dislikes no componente pai
            onLikeUpdate(post.id, updatedLikes, updatedDislikes);

            await update(postRef, { likes: updatedLikes, dislikes: updatedDislikes });
        } catch (error) {
            console.error("Erro ao atualizar likes:", error);
        } finally {
            setIsUpdating(false);
        }
    };

    const computarDislike = async () => {
        if (isUpdating) return; // Evitar múltiplas atualizações simultâneas
        setIsUpdating(true);

        const postRef = ref(database, `post/${post.id}`);

        try {
            const snapshot = await get(postRef);
            const postData = snapshot.val();

            let updatedDislikes = [];
            let updatedLikes = postData.likes || [];

            const userDislikeIndex = postData.dislikes ? postData.dislikes.findIndex(dislike => dislike.uidUsuario === currentUser.uid) : -1;
            const userLikeIndex = postData.likes ? postData.likes.findIndex(like => like.uidUsuario === currentUser.uid) : -1;

            if (userDislikeIndex !== -1) {
                updatedDislikes = postData.dislikes.filter((_, index) => index !== userDislikeIndex);
            } else {
                updatedDislikes = [...(postData.dislikes || []), {
                    uidUsuario: currentUser.uid,
                    nome: currentUser.displayName,
                    data: new Date().toLocaleDateString()
                }];
                if (userLikeIndex !== -1) {
                    updatedLikes = postData.likes.filter((_, index) => index !== userLikeIndex);
                }
            }

            // Atualizar o estado localmente
            setDislikedPosts((prevDislikedPosts) => ({
                ...prevDislikedPosts,
                [post.id]: updatedDislikes.some(dislike => dislike.uidUsuario === currentUser.uid),
            }));
            setLikedPosts((prevLikedPosts) => ({
                ...prevLikedPosts,
                [post.id]: false,
            }));

            // Atualizar o post.likes e post.dislikes no componente pai
            onLikeUpdate(post.id, updatedLikes, updatedDislikes);

            await update(postRef, { likes: updatedLikes, dislikes: updatedDislikes });
        } catch (error) {
            console.error("Erro ao atualizar dislikes:", error);
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

    const verificarDislike = (postId) => {
        if (post.dislikes) {
            const userDislikeIndex = post.dislikes.findIndex(dislike => dislike.uidUsuario === currentUser.uid);
            setDislikedPosts((prevDislikedPosts) => ({
                ...prevDislikedPosts,
                [postId]: userDislikeIndex !== -1,
            }));
        } else {
            setDislikedPosts((prevDislikedPosts) => ({
                ...prevDislikedPosts,
                [postId]: false,
            }));
        }
    };

    return (
        <>
            <div className='ThumbUpIcon'>
                <div className='like' style={{
                    borderRadius: '50px',
                    backgroundColor: likedPosts[post.id] ? '#6A1B9A' : 'white',
                }}>
                    <Button onClick={computarLike} disabled={isUpdating} className="">
                        <ThumbUpIcon
                            style={{
                                width: '30px',
                                height: '30px',
                                marginRight: '8px',
                                color: likedPosts[post.id] ? 'white' : 'black',
                                marginLeft: '7%'
                            }}
                        />
                    </Button>
                </div>
                {/* <p>|</p> */}
                <div className='dislike' style={{
                    borderRadius: '50px',
                    backgroundColor: dislikedPosts[post.id] ? '#3E3E3E' : 'white',
                }}>
                    <Button onClick={computarDislike} disabled={isUpdating} className="">
                        <ThumbDownIcon
                            style={{
                                width: '30px',
                                height: '30px',
                                marginRight: '8px',
                                color: dislikedPosts[post.id] ? 'white' : 'black',
                                marginLeft: '7%'
                            }}
                        />
                    </Button>
                </div>
            </div>
        </>
    );
});

export default Likes;