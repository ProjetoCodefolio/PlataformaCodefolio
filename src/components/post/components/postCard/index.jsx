import React, { useState, useEffect } from 'react';
import { Typography, Divider, Avatar, Chip, Box } from '@mui/material';
import PostMenu from '../menu/Menu';
import MembroLink from '../../../MembroLink';
import EditPostModal from '../editPost/EditPost';
import AddComment from '../addComment/AddComment';
import ShowComments from '../showComments/ShowComments';
import Likes from '../likes';
import Informacoes from '../informacoes/Informacoes';
import MyShare from '../myShare/MyShare';
import { getYouTubeID } from '../../utils';
import YouTube from 'react-youtube';
import * as S from './styles';


const capitalizeName = (name) => {
    if (!name) return '';
    return name
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
};

export default function PostCards({
    post,
    Edit,
    isEditModalOpen,
    setIsEditModalOpen,
    editingPost,
    Delete,
    comments,
    setComments,
    updateLikes,
    userRole,
    currentUser,
    onPostEdited
}) {
    const [isPostEdited, setIsPostEdited] = useState(false);
    const [showAddComment, setShowAddComment] = useState(false);
    const [playerInstance, setPlayerInstance] = useState(null);

    useEffect(() => {
        if (isPostEdited) {
            onPostEdited();
            setIsPostEdited(false);
        }
    }, [isPostEdited, onPostEdited]);

    const handlePlayerReady = (event) => {
        setPlayerInstance(event.target);
    };

    const handleStateChange = (event) => {
        
    };

    return (
        <S.Wrapper>
            <S.LineWrapper>
                <S.ProfileButton
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '16px',
                        width: 'auto',
                    }}
                >
                    <Avatar
                        src={post.userAvatar}
                        alt={post.user}
                        sx={{
                            width: 48,
                            height: 48,
                        }}
                    />
                    <Typography
                        component="div"
                        variant="h6"
                        sx={{
                            fontSize: '1rem',
                            fontWeight: '600',
                            color: '#1a1a1a',
                            letterSpacing: '-0.01em',
                            margin: '0 4px',
                            backgroundColor: 'transparent',
                        }}
                    >
                        {capitalizeName(post.user)}{/* <MembroLink texto={capitalizeName(post.user)} user={post.uiUser} /> */}
                    </Typography>
                </S.ProfileButton>
                {userRole === "admin" && <PostMenu post={post} onEdit={Edit} onDelete={Delete} />}
            </S.LineWrapper>

            <S.LineWrapper style={{ flexDirection: 'column' }}>
                <Typography
                    component="div"
                    sx={{
                        width: '98%',
                        fontSize: '1.2rem',
                        marginBottom: '8px',
                        marginTop: '12px',
                        textAlign: 'left',
                        marginLeft: '1%',
                        color: '#1a1a1a',
                        fontWeight: '600',
                        padding: '0 8px',
                        letterSpacing: '-0.01em',
                        lineHeight: '1.3'
                    }}
                >
                    {post.nome}
                </Typography>

                {/* Exibição das Tags com distância mínima */}
                {post.tags && post.tags.length > 0 && (
                    <Box
                        sx={{
                            width: '98%',
                            marginLeft: '1%',
                            marginBottom: '0px', 
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '4px',
                            padding: '0 8px'
                        }}
                    >
                        {post.tags.map((tag, index) => (
                            <Chip
                                key={index}
                                label={tag}
                                sx={{
                                    backgroundColor: '#e0c7f0',
                                    color: '#1a1a1a',
                                    fontWeight: '500',
                                    fontSize: '0.8rem',
                                    padding: '4px 8px',
                                    borderRadius: '16px',
                                    height: '24px',
                                    '&:hover': {
                                        backgroundColor: '#d1b3e8'
                                    }
                                }}
                            />
                        ))}
                    </Box>
                )}

                <div
                    style={{
                        position: 'relative',
                        paddingTop: '56.25%',
                        height: 0,
                        overflow: 'hidden',
                        width: '100%',
                        margin: '4px auto 8px',
                        borderRadius: '12px',
                        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                    }}
                >
                    <YouTube
                        videoId={getYouTubeID(post.link)}
                        opts={{
                            width: '100%',
                            height: '100%',
                            playerVars: {
                                autoplay: 0,
                                modestbranding: 1,
                                rel: 0
                            },
                        }}
                        onReady={handlePlayerReady}
                        onStateChange={handleStateChange}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            marginTop: 0,
                            borderRadius: '12px'
                        }}
                    />
                </div>

                <div
                    style={{
                        width: '98%',
                        margin: '8px auto',
                        padding: '0 8px'
                    }}
                >
                    <Informacoes post={post} comments={comments} setComments={setComments} />
                    <Divider
                        sx={{
                            margin: '4px 0',
                            backgroundColor: 'rgba(0, 0, 0, 0.1)'
                        }}
                    />
                </div>

                <S.LineWrapper
                    style={{
                        width: '98%',
                        display: 'flex',
                        justifyContent: 'space-around',
                        margin: '4px auto',
                    }}
                >
                    <Likes post={post} onLikeUpdate={updateLikes} />
                    <ShowComments onShowComments={() => setShowAddComment(!showAddComment)} />
                    <MyShare post={post} />
                </S.LineWrapper>

                {showAddComment && (
                    <AddComment postId={post.id} comments={comments} setComments={setComments} />
                )}

                {(userRole === 'admin' || currentUser?.uid === post?.uidUser) && (
                    isEditModalOpen && (
                        <EditPostModal
                            isOpen={isEditModalOpen}
                            onClose={() => setIsEditModalOpen(false)}
                            post={editingPost}
                            onSave={() => {
                                setIsPostEdited(true);
                                setIsEditModalOpen(false);
                            }}
                        />
                    )
                )}
            </S.LineWrapper>
        </S.Wrapper>
    );
}