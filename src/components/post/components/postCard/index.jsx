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
import VideoWatcher from './VideoWatcher';
import { ref, get, child } from 'firebase/database';
import { database } from '../../../../service/firebase';
import * as S from './styles';

export default function PostCards ({
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
    const [initialWatchTime, setInitialWatchTime] = useState(0);
    const [initialPercentageWatched, setInitialPercentageWatched] = useState(0);

    useEffect(() => {
        if (isPostEdited) {
            onPostEdited();
            setIsPostEdited(false);
        }
    }, [isPostEdited, onPostEdited]);

    useEffect(() => {
        const fetchWatchTime = async () => {
            const watchTimeRef = ref(database, 'videoWatchTime');
            const userVideoRef = child(watchTimeRef, `${currentUser.uid}_${post.id}`);
            const snapshot = await get(userVideoRef);
            if (snapshot.exists()) {
                const data = snapshot.val();
                setInitialWatchTime(data.watchedTimeInSeconds || 0);
                setInitialPercentageWatched(parseFloat(data.percentageWatched) || 0);
            }
        };

        if (currentUser && post.id) {
            fetchWatchTime();
        }
    }, [currentUser, post.id]);

    const handlePlayerReady = (event) => {
        setPlayerInstance(event.target);
    };

    const handleStateChange = (event) => {
        if (event.data === 1 && initialWatchTime > 0) { // vídeo em reprodução
            event.target.seekTo(initialWatchTime);
            setInitialWatchTime(0); // Reseta o tempo inicial
        }  
    };

    return(
        <S.Wrapper>
            <S.LineWrapper>
                <S.ProfileButton>
                    <Avatar
                        src={post.userAvatar}
                        alt={post.user}
                        sx={{
                            width: 48,
                            height: 48
                        }}
                    />
                    <Typography component="div" variant="h6">
                        <MembroLink texto={post.user} user={post.uiUser} />
                    </Typography>
                </S.ProfileButton>
                <PostMenu post={post} onEdit={Edit} onDelete={Delete} />
            </S.LineWrapper>
            <S.LineWrapper style={{flexDirection: 'column'}}>
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
                <div style={{width: '100%'}}>
                {post.link ? (
                        <>
                            <Divider sx={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignSelf: 'center',
                                width: '95%',
                                borderBottom: '1px solid #ccc !important',
                                marginTop: '10px !important',
                                marginLeft: '6px',
                                marginBottom: '10px !important',
                            }} />
                            <YouTube videoId={getYouTubeID(post.link)} opts={{ width: "95%", heigth: "95%" }} onReady={handlePlayerReady} onStateChange={handleStateChange} />
                            <VideoWatcher player={playerInstance} videoId={post.id} initialWatchTime={initialWatchTime} initialPercentageWatched={initialPercentageWatched}/>
                        </>
                    ) : (
                        <img
                            className="postImage"
                            src={post.userAvatar}
                            alt={post.user} />
                    )}
                </div>
                <div style={{width: '100%', marginLeft: '-30px'}}>
                    <Informacoes post={post} comments={comments} setComments={setComments} />
                    <Divider className='divisor' />
                </div>
                <S.LineWrapper style={{width: '98%', display: 'flex', justifyContent: 'space-around'}}>
                    <Likes post={post} onLikeUpdate={updateLikes} />
                    <ShowComments onShowComments={() => setShowAddComment(showAddComment ? false : true)} />
                    <MyShare post={post} />
                </S.LineWrapper>
                {showAddComment && (
                    <>
                        <Divider className='divisor' />
                        <AddComment postId={post.id} comments={comments} setComments={setComments} />
                    </>
                )}
                {(userRole === 'admin' || currentUser?.uid === post?.uidUser) && (
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
            </S.LineWrapper>
        </S.Wrapper>
    );
}