import { useState, useEffect } from "react";
import '../../post.css';
import { getLikesYouTubeCount } from "$api/services/posts/";

/**
 * Contadores do card. As curtidas e os comentários da plataforma chegam prontos
 * do listener único do post (em `Post`); aqui só somamos as curtidas do próprio
 * vídeo no YouTube, que vêm da API deles.
 */
const Informacoes = ({ post = {}, likesCount = 0, commentsCount = 0 }) => {
    const [likesYouTube, setLikesYouTube] = useState(0);

    // Fetch YouTube likes when post changes
    useEffect(() => {
        const fetchYouTubeLikes = async () => {
            if (!post.link) return;

            const likeCount = await getLikesYouTubeCount(post.link);
            setLikesYouTube(likeCount);
        };

        fetchYouTubeLikes();
    }, [post.link]);

    const likesLength = likesCount + likesYouTube;

    return (
        <>
            <div className="info-container">
                <div className="info-likes"> {`${likesLength} ${likesLength === 1 ? "like" : "likes"}`} </div>
                <div className="info-comentarios"> {`${commentsCount} ${commentsCount === 1 ? "comentário" : "comentários"}`} </div>
            </div>
        </>
    );
}

export default Informacoes;
