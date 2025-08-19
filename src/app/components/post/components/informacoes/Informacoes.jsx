import { useState, useEffect } from "react";
import '../../post.css';
import { 
    getLikesYouTubeCount,
    listenToPostLikesAndComments 
} from "$api/services/posts/";

const Informacoes = ({ post = {}, comments = {}, setComments }) => {
    const commentsLength = comments[post.id] ? comments[post.id].length : 0;
    const [likesYouTube, setLikesYouTube] = useState(0);
    const [likes, setLikes] = useState(post.likes ? post.likes.length : 0);
    const [likesLength, setLikesLength] = useState(0);

    // Fetch YouTube likes when post changes
    useEffect(() => {
        const fetchYouTubeLikes = async () => {
            if (!post.link) return;
            
            const likeCount = await getLikesYouTubeCount(post.link);
            setLikesYouTube(likeCount);
        };
        
        fetchYouTubeLikes();
    }, [post.link]);

    // Listen for changes to post likes and comments in Firebase
    useEffect(() => {
        const unsubscribe = listenToPostLikesAndComments(post.id, (data) => {
            setLikes(data.likes);
            
            // Update comments in parent component
            setComments((prevComments) => ({
                ...prevComments,
                [post.id]: data.comments,
            }));
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, [post.id, setComments]);

    // Calculate total likes when either source changes
    useEffect(() => {
        setLikesLength(likes + likesYouTube);
    }, [likes, likesYouTube]);

    return (
        <>
            <div className="info-container">
                <div className="info-likes"> {`${likesLength} ${likesLength === 1 ? "like" : "likes"}`} </div>
                <div className="info-comentarios"> {`${commentsLength} ${commentsLength === 1 ? "comentário" : "comentários"}`} </div>
            </div>
        </>
    );
}

export default Informacoes;