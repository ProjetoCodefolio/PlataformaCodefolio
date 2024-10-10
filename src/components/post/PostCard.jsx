import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, Grid } from '@mui/material';
import PostMenu from './Menu';
import MembroLink from '../MembroLink';
import EditPostModal from './EditPost';
import Comentarios from './Comentarios';
import Likes from './Likes';
import YouTube from 'react-youtube';
import './post.css';
import { getYouTubeID } from './utils';
import Tags from './PostTags';

function PostCard({ post, Edit, isEditModalOpen, setIsEditModalOpen, editingPost, Delete, comments, setComments, updateLikes, userRole, currentUser, onPostEdited }) {
    const [isPostEdited, setIsPostEdited] = useState(false);

    useEffect(() => {
        if (isPostEdited) {
            onPostEdited();
            setIsPostEdited(false);
        }
    }, [isPostEdited, onPostEdited]);

    return (
        <Card
            key={post.id}
            sx={{
                width: "100%",
                maxWidth: { xs: "100%", sm: "600px", md: "1000px" },
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
                            alt={post.user} />
                        <Typography component="div" variant="h6" className="postUsername">
                            <MembroLink texto={post.user} user={post.uidUser} />
                        </Typography>
                    </Box>

                    <Box className="postTopRight">
                        <PostMenu post={post} onEdit={Edit} onDelete={Delete} />
                    </Box>
                </Box>
                <Box className="postCenter">
                    <Typography component="div" variant="h6" className="postTittle">
                        <b>{post.nome}</b>
                    </Typography>

                    {/* <Typography component="div" variant="h6" className="postUser">
                        {post.user}
                    </Typography> */}
                    {post.link ? (
                        <>
                            <br />
                            <YouTube videoId={getYouTubeID(post.link)} opts={{ width: "95%", heigth: "95%" }} />
                            <br />
                            { /*<Tags tags={post.tags} />*/}
                            <br />
                            { /*<Comentarios postId={post.id} comments={comments} setComments={setComments} />*/}
                        </>
                    ) : (
                        <img
                            className="postImage"
                            src={post.userAvatar}
                            alt={post.user} />
                    )}
                </Box>
                <Grid container spacing={2}>
                    <Grid item xs={2}>
                        <Box className="postBottom">
                            <Box className="postBottomLeft">
                                <Box style={{ display: "flex" }}>
                                    <Likes post={post} onLikeUpdate={updateLikes} />
                                </Box>
                            </Box>
                        </Box>
                    </Grid>
                    <Grid item xs={10}>
                        <Comentarios postId={post.id} comments={comments} setComments={setComments} />

                    </Grid>
                </Grid>
                {(userRole === 'admin' || currentUser.uid === post.uidUser) && (
                    <>
                        {isEditModalOpen && (
                            <EditPostModal
                                isOpen={isEditModalOpen}
                                onClose={() => setIsEditModalOpen(false)}
                                post={editingPost}
                                onSave={() => {
                                    setIsPostEdited(true);
                                    setIsEditModalOpen(false);
                                }}
                            />
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}

export default PostCard;