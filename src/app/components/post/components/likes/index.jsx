import React, { useState } from 'react';
import { Button } from "@mui/material";
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import { useAuth } from "$context/AuthContext";
import * as S from "./styles";
import MyAlert from '../alert/Alert';
import { abrirAlert } from '../../../../utils/postUtils';
import { togglePostLike, togglePostDislike } from "$api/services/posts/";

/**
 * Os botões refletem direto os mapas `likes`/`dislikes` que o card recebe do
 * listener do post — sem cópia local do estado. O Firebase aplica a escrita
 * localmente antes mesmo do servidor confirmar, então o clique responde na hora
 * e, se a regra recusar, o próprio banco desfaz e o botão volta sozinho.
 */
const Likes = React.memo(({ post, likes = {}, dislikes = {} }) => {
    const [isUpdating, setIsUpdating] = useState(false);
    const [alertOpen, setAlertOpen] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [alertSeverity, setAlertSeverity] = useState('success');
    const { currentUser } = useAuth();

    const liked = Boolean(currentUser && likes[currentUser.uid]);
    const disliked = Boolean(currentUser && dislikes[currentUser.uid]);

    const alternar = (acao, rotulo) => async () => {
        if (!currentUser) {
            abrirAlert(
                setAlertMessage,
                setAlertSeverity,
                setAlertOpen,
                `Você precisa estar logado para dar ${rotulo} em um post.`,
                "error"
            );
            return;
        }

        if (isUpdating) return;
        setIsUpdating(true);

        try {
            const result = await acao(post.id, currentUser);

            if (!result.success) {
                abrirAlert(
                    setAlertMessage,
                    setAlertSeverity,
                    setAlertOpen,
                    `Erro ao atualizar ${rotulo}: ${result.error}`,
                    "error"
                );
            }
        } catch (error) {
            console.error(`Erro ao processar ${rotulo}:`, error);
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <>
            <S.Wrapper>
                <S.ButtonWrapper>
                    <Button 
                        onClick={alternar(togglePostLike, "like")}
                        disabled={isUpdating}
                        aria-label="Curtir"
                        aria-pressed={liked}
                        sx={{
                            minWidth: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            padding: '8px',
                            backgroundColor: liked ? '#9041c1' : 'transparent',
                            '&:hover': {
                                backgroundColor: liked ? '#7d37a7' : 'rgba(144, 65, 193, 0.04)'
                            }
                        }}
                    >
                        <ThumbUpIcon
                            sx={{
                                width: '24px',
                                height: '24px',
                                color: liked ? 'white' : '#666'
                            }}
                        />
                    </Button>
                    <Button 
                        onClick={alternar(togglePostDislike, "dislike")}
                        disabled={isUpdating}
                        aria-label="Descurtir"
                        aria-pressed={disliked}
                        sx={{
                            minWidth: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            padding: '8px',
                            backgroundColor: disliked ? '#666' : 'transparent',
                            '&:hover': {
                                backgroundColor: disliked ? '#555' : 'rgba(0, 0, 0, 0.04)'
                            }
                        }}
                    >
                        <ThumbDownIcon
                            sx={{
                                width: '24px',
                                height: '24px',
                                color: disliked ? 'white' : '#666'
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

Likes.displayName = "Likes";

export default Likes;
