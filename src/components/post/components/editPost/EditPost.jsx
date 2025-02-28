import React, { useEffect, useState } from 'react';
import { database } from "../../../../service/firebase";
import { ref, get, update } from "firebase/database";
import { Box, Typography, Modal, Button, TextField, MenuItem } from "@mui/material";
import "../../post.css";

export const editarPost = async (postId, newTitle, newLink, newTags) => {
    const postRef = ref(database, `post/${postId}`);
    await update(postRef, { nome: newTitle, link: newLink, tags: newTags });
};

const EditPostModal = ({ isOpen, onClose, post, onSave }) => {
    const [title, setTitle] = useState('');
    const [link, setLink] = useState('');
    const [videoEmbedURL, setVideoEmbedURL] = useState('');
    const [allTags, setAllTags] = useState([]);
    const [tagsSelecionadas, setTagsSelecionadas] = useState([]);

    const fetchAllTags = async () => {
        const tagsRef = ref(database, 'tags');
        const snapshot = await get(tagsRef);
        const data = snapshot.val();
        let tagsArray = [];
        for (let tag in data) {
            tagsArray.push(data[tag].nome);
        }
        return tagsArray;
    };

    useEffect(() => {
        fetchAllTags().then(setAllTags);
    }, []);

    useEffect(() => {
        if (isOpen) {
            setTitle(post.nome || '');
            setLink(post.link || '');
            setTagsSelecionadas(post.tags || []);
        }
    }, [isOpen, post]);

    useEffect(() => {
        const generateEmbedURL = (url) => {
            try {
                const urlObj = new URL(url);
                const videoId = urlObj.searchParams.get("v");
                if (!videoId) {
                    throw new Error("Invalid YouTube URL: Video ID not found.");
                }
                return `https://www.youtube.com/embed/${videoId}`;
            } catch (error) {
                console.error(error.message);
                return '';
            }
        };

        setVideoEmbedURL(generateEmbedURL(link));
    }, [link]);

    const handleSave = async (e) => {
        e.preventDefault(); 
        const postId = post.id;
        await editarPost(postId, title, link, tagsSelecionadas);
        if (onSave) {
            onSave();
        }
        onClose(); 
    };

    return (
        <Modal
            open={isOpen}
            onClose={onClose}
            aria-labelledby="modal-modal-title"
            aria-describedby="modal-modal-description"
        >
            <Box
                sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '90%',
                    maxWidth: '600px', 
                    maxHeight: '80vh', 
                    bgcolor: 'background.paper',
                    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
                    borderRadius: '12px',
                    p: 3, 
                    outline: 'none',
                    overflow: 'auto',
                }}
            >
                <Typography 
                    component="div" 
                    variant="h6"
                    sx={{
                        fontWeight: 'bold',
                        color: '#333',
                        mb: 2, 
                        fontSize: '1.1rem' 
                    }}
                >
                    Editar Post
                </Typography>
                <Box
                    component="form"
                    onSubmit={handleSave}
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px', 
                        width: '100%',
                    }}
                >
                    <TextField
                        label="Título"
                        variant="outlined"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                '&:hover fieldset': {
                                    borderColor: '#9041c1',
                                },
                                '&.Mui-focused fieldset': {
                                    borderColor: '#9041c1',
                                },
                            },
                            '& .MuiInputLabel-root.Mui-focused': {
                                color: '#9041c1',
                            },
                        }}
                    />

                    <TextField
                        label="Link do YouTube"
                        variant="outlined"
                        value={link}
                        onChange={(e) => setLink(e.target.value)}
                        required
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                '&:hover fieldset': {
                                    borderColor: '#9041c1',
                                },
                                '&.Mui-focused fieldset': {
                                    borderColor: '#9041c1',
                                },
                            },
                            '& .MuiInputLabel-root.Mui-focused': {
                                color: '#9041c1',
                            },
                        }}
                    />

                    <TextField
                        select
                        label="Tags"
                        value={tagsSelecionadas}
                        onChange={(e) => setTagsSelecionadas(e.target.value)}
                        SelectProps={{
                            multiple: true,
                            renderValue: (selected) => selected.join(', '),
                        }}
                        helperText="Selecione as tags para o post"
                        required
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                '&:hover fieldset': {
                                    borderColor: '#9041c1',
                                },
                                '&.Mui-focused fieldset': {
                                    borderColor: '#9041c1',
                                },
                            },
                            '& .MuiInputLabel-root.Mui-focused': {
                                color: '#9041c1',
                            },
                        }}
                    >
                        {allTags.map((tag) => (
                            <MenuItem key={tag} value={tag}>
                                {tag}
                            </MenuItem>
                        ))}
                    </TextField>

                    {videoEmbedURL && (
                        <Box sx={{ mt: 1 }}> {/* Reduzido de mt: 2 para mt: 1 */}
                            <Typography 
                                component="div" 
                                variant="body1"
                                sx={{ 
                                    mb: 1, 
                                    fontWeight: 500,
                                    fontSize: '0.9rem' 
                                }}
                            >
                                Pré-visualização:
                            </Typography>
                            <iframe
                                width="100%"
                                height="300" 
                                src={videoEmbedURL}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                style={{ borderRadius: '8px' }}
                            ></iframe>
                        </Box>
                    )}

                    <Button 
                        type="submit" 
                        variant="contained" 
                        sx={{ 
                            mt: '16px', 
                            bgcolor: '#9041c1',
                            padding: '8px', 
                            fontSize: '0.9rem', 
                            fontWeight: 'bold',
                            '&:hover': {
                                bgcolor: '#7d37a7'
                            }
                        }}
                    >
                        Editar Post
                    </Button>
                </Box >
            </Box >
        </Modal >
    );
}

export default EditPostModal;
