import { useEffect, useState } from "react";
import { database } from "../../service/firebase";
import { ref, get } from "firebase/database";
import { Box, Card, CardContent, Typography } from "@mui/material";
import YouTube from "react-youtube";
import ComentariosYouTube from "../../components/youtube/comments";
import LikesYouTube from "../../components/youtube/likes";
import { useLocation } from 'react-router-dom';

function MembroPage() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(false);
    const location = useLocation();
    const userName = location.state?.userName || ""; // Simplified state access


    function getYouTubeID(url) {
        var ID = '';
        url = url.replace(/(>|<)/gi, '').split(/(vi\/|v=|\/v\/|youtu\.be\/|\/embed\/)/);
        if (url[2] !== undefined) {
            ID = url[2].split(/[^0-9a-z_\-]/i);
            ID = ID[0];
        } else {
            ID = url;
        }
        return ID;
    }

    const fetchPosts = async () => {
        setLoading(true);
        const postsQuery = ref(database, "post");

        const snapshot = await get(postsQuery);
        const postsData = snapshot.val();
        if (postsData) {
            const postsList = Object.keys(postsData).map((key) => ({
                id: key,
                ...postsData[key],
            })).reverse();

            setPosts(postsList);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchPosts();
    }, []);

    return (
        <div>
            <h1>Vídeos de {userName}</h1>
            {loading ? (
                <span>Loading...</span>
            ) : (
                posts.filter(post => post.user === userName).map(post => (
                    <Card
                        key={post.id}
                        sx={{
                            width: "100%",
                            maxWidth: { xs: "100%", sm: "800px", md: "1200px" },
                            mx: "auto",
                            boxShadow: 1,
                            borderRadius: 2,
                            overflow: "hidden",
                            backgroundColor: "white",
                            mb: 2,
                        }}
                    >
                        <CardContent>
                            <Box className="postTop">
                                <Box className="postTopLeft">
                                    <img
                                        className="postProfileImage"
                                        src={post.userAvatar}
                                        alt={post.user}
                                    />
                                    <Typography className="postUsername">
                                        {post.user}
                                    </Typography>
                                    -
                                    <Typography className="postDate">
                                        {post.data}
                                    </Typography>
                                </Box>
                            </Box>
                            <Box className="postCenter">
                                <Typography className="postText"><b>{post.nome}</b> <br /> {post.user}</Typography>
                                {post.link ? (
                                    <>
                                        <YouTube videoId={getYouTubeID(post.link)} />
                                        <br />
                                        <h4> Tag(s): </h4>
                                        {post.tags && post.tags.map((tag, index) => (
                                            <p key={index} className="tags">{tag}</p>
                                        ))}
                                        <br />
                                        <br />
                                        <ComentariosYouTube videoId={getYouTubeID(post.link)} />
                                    </>
                                ) : (
                                    <img
                                        className="postImage"
                                        src={post.userAvatar}
                                        alt={post.nome}
                                    />
                                )}
                            </Box>
                            <Box className="postBottom">
                                <Box className="postBottomLeft">
                                    <Box style={{ display: "flex" }}>
                                        <LikesYouTube videoId={getYouTubeID(post.link)} />
                                    </Box>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                ))
            )}
        </div>
    );
}

export default MembroPage;