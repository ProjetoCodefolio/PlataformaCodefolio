import React, { useState, useEffect } from 'react';
import { Button } from "@mui/material";
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import { useAuth } from "$context/AuthContext";
import * as S from "./styles";
import MyAlert from '../alert/Alert';
import { abrirAlert } from '../../../../utils/postUtils';
import { checkUserLikeStatus, togglePostLike, togglePostDislike } from "$api/services/posts/";

const Likes = React.memo(({ post, onLikeUpdate }) => {
    const [likedPosts, setLikedPosts] = useState({});
    const [dislikedPosts, setDislikedPosts] = useState({});
    const [isUpdating, setIsUpdating] = useState(false);
    const [alertOpen, setAlertOpen] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [alertSeverity, setAlertSeverity] = useState('success');
    const { currentUser } = useAuth();

    useEffect(() => {
        if (post && post.id) {
            const status = checkUserLikeStatus(post, currentUser?.uid);
            setLikedPosts(prev => ({ ...prev, [post.id]: status.liked }));
            setDislikedPosts(prev => ({ ...prev, [post.id]: status.disliked }));
        }
    }, [post.id, post.likes, post.dislikes, currentUser]);
    
    const computarLike = async () => {
        if (!currentUser) {
            abrirAlert(
                setAlertMessage, 
                setAlertSeverity, 
                setAlertOpen, 
                "Você precisa estar logado para dar like em um post.", 
                "error"
            );
            return;
        }

        if (isUpdating) return;
        setIsUpdating(true);

        try {
            const result = await togglePostLike(post.id, currentUser);
            
            if (result.success) {
                setLikedPosts(prev => ({ ...prev, [post.id]: result.liked }));
                setDislikedPosts(prev => ({ ...prev, [post.id]: result.disliked }));
                
                // Update parent component
                onLikeUpdate(post.id, result.likes, result.dislikes);
            } else {
                abrirAlert(
                    setAlertMessage,
                    setAlertSeverity,
                    setAlertOpen,
                    `Erro ao atualizar like: ${result.error}`,
                    "error"
                );
            }
        } catch (error) {
            console.error("Erro ao processar like:", error);
        } finally {
            setIsUpdating(false);
        }
    };

    const computarDislike = async () => {
        if (!currentUser) {
            abrirAlert(
                setAlertMessage, 
                setAlertSeverity, 
                setAlertOpen, 
                "Você precisa estar logado para dar dislike em um post.", 
                "error"
            );
            return;
        }

        if (isUpdating) return;
        setIsUpdating(true);

        try {
            const result = await togglePostDislike(post.id, currentUser);
            
            if (result.success) {
                setDislikedPosts(prev => ({ ...prev, [post.id]: result.disliked }));
                setLikedPosts(prev => ({ ...prev, [post.id]: result.liked }));
                
                // Update parent component
                onLikeUpdate(post.id, result.likes, result.dislikes);
            } else {
                abrirAlert(
                    setAlertMessage,
                    setAlertSeverity,
                    setAlertOpen,
                    `Erro ao atualizar dislike: ${result.error}`,
                    "error"
                );
            }
        } catch (error) {
            console.error("Erro ao processar dislike:", error);
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <>
            <S.Wrapper>
                <S.ButtonWrapper>
                    <Button 
                        onClick={computarLike} 
                        disabled={isUpdating}
                        sx={{
                            minWidth: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            padding: '8px',
                            backgroundColor: likedPosts[post.id] ? '#9041c1' : 'transparent',
                            '&:hover': {
                                backgroundColor: likedPosts[post.id] ? '#7d37a7' : 'rgba(144, 65, 193, 0.04)'
                            }
                        }}
                    >
                        <ThumbUpIcon
                            sx={{
                                width: '24px',
                                height: '24px',
                                color: likedPosts[post.id] ? 'white' : '#666'
                            }}
                        />
                    </Button>
                    <Button 
                        onClick={computarDislike} 
                        disabled={isUpdating}
                        sx={{
                            minWidth: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            padding: '8px',
                            backgroundColor: dislikedPosts[post.id] ? '#666' : 'transparent',
                            '&:hover': {
                                backgroundColor: dislikedPosts[post.id] ? '#555' : 'rgba(0, 0, 0, 0.04)'
                            }
                        }}
                    >
                        <ThumbDownIcon
                            sx={{
                                width: '24px',
                                height: '24px',
                                color: dislikedPosts[post.id] ? 'white' : '#666'
                            }}
                        />
                    </Button>
                </S.ButtonWrapper>
            </S.Wrapper>

            <MyAlert
                open={alertOpen}
                onClose={() => setAlertOpen(false)}
                message={alertMessage}
                severity={alertSeverity}
            />
        </>
    );
});

export default Likes;
