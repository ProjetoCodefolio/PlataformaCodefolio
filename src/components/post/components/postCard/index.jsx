import React, { useState, useEffect } from 'react';
import { Typography, Divider, Avatar } from '@mui/material';
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
        // Lógica para controle do estado do vídeo, se necessário
    };

    return (
        <S.Wrapper>
            <S.LineWrapper>
                <S.ProfileButton>
                    <Avatar
                        src={post.userAvatar}
                        alt={post.user}
                        sx={{ width: 48, height: 48 }}
                    />
                    <Typography component="div" variant="h6">
                        <MembroLink texto={post.user} user={post.uiUser} />
                    </Typography>
                </S.ProfileButton>
                <PostMenu post={post} onEdit={Edit} onDelete={Delete} />
            </S.LineWrapper>

            <S.LineWrapper style={{ flexDirection: 'column' }}>
                <Typography
                    component="div"
                    sx={{
                        width: '100%',
                        fontSize: '15px',
                        marginBottom: '10px',
                        textAlign: 'left',
                        marginLeft: '3% !important',
                    }}
                >
                    <b>{post.nome}</b>
                </Typography>

                <div style={{ width: '100%' }}>
                    {post.link ? (
                        <>
                            <Divider
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignSelf: 'center',
                                    width: '95%',
                                    borderBottom: '1px solid #ccc !important',
                                    marginTop: '10px !important',
                                    marginLeft: '6px',
                                    marginBottom: '10px !important',
                                }}
                            />
                            <div style={{ position: 'relative', paddingTop: '56.25%', height: 0, overflow: 'hidden', width: '95%', margin: '0 auto', marginLeft: '2%' }}>
                                <YouTube
                                    videoId={getYouTubeID(post.link)}
                                    opts={{
                                        width: '100%',
                                        height: '100%',
                                        playerVars: { autoplay: 0 },
                                    }}
                                    onReady={handlePlayerReady}
                                    onStateChange={handleStateChange}
                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                                />
                            </div>
                        </>
                    ) : (
                        <img className="postImage" src={post.userAvatar} alt={post.user} />
                    )}
                </div>

                <div style={{ width: '100%', marginLeft: '-30px' }}>
                    <Informacoes post={post} comments={comments} setComments={setComments} />
                    <Divider className="divisor" />
                </div>

                <S.LineWrapper style={{ width: '98%', display: 'flex', justifyContent: 'space-around' }}>
                    <Likes post={post} onLikeUpdate={updateLikes} />
                    <ShowComments onShowComments={() => setShowAddComment(!showAddComment)} />
                    <MyShare post={post} />
                </S.LineWrapper>

                {showAddComment && (
                    <>
                        <Divider className="divisor" />
                        <AddComment postId={post.id} comments={comments} setComments={setComments} />
                    </>
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