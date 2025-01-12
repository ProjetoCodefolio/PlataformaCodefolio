import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, Grid, Divider, Avatar } from '@mui/material';
import PostMenu from '../../Menu';
import MembroLink from '../../../MembroLink';
import EditPostModal from '../../EditPost';
import AddComment from '../../AddComment';
import ShowComments from '../../ShowComments';
import Likes from '../../Likes';
import YouTube from 'react-youtube';
import '../../post.css';
import { getYouTubeID } from '../../utils';
import Informacoes from '../../Informacoes';
import MyShare from '../../MyShare';
import Tags from '../../PostTags';
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

    useEffect(() => {
        if (isPostEdited) {
            onPostEdited();
            setIsPostEdited(false);
        }
    }, [isPostEdited, onPostEdited]);

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
                {post.link ? (
                        <>
                            <Divider className='divisor' />
                            <YouTube videoId={getYouTubeID(post.link)} opts={{ width: "95%", heigth: "95%" }} />
                            {/* <Divider className='divisor' /> */}
                            { /*<Tags tags={post.tags} />*/}
                            {/* <Divider className='divisor' /> */}
                            { /*<Comentarios postId={post.id} comments={comments} setComments={setComments} />*/}
                        </>
                    ) : (
                        <img
                            className="postImage"
                            src={post.userAvatar}
                            alt={post.user} />
                    )}
            </S.LineWrapper>
        </S.Wrapper>
    );
}