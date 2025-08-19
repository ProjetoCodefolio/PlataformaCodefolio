import React, { useEffect, useState } from 'react';
import { Box, Typography, Modal, Button, TextField, MenuItem } from "@mui/material";
import { editPost, fetchTags, generateEmbedURL } from "$api/services/posts/";
import "../../post.css";

const EditPostModal = ({ isOpen, onClose, post, onSave }) => {
    const [title, setTitle] = useState('');
    const [link, setLink] = useState('');
    const [videoEmbedURL, setVideoEmbedURL] = useState('');
    const [allTags, setAllTags] = useState([]);
    const [tagsSelecionadas, setTagsSelecionadas] = useState([]);

    // Fetch all available tags
    useEffect(() => {
        const loadTags = async () => {
            try {
                const tagsArray = await fetchTags();
                setAllTags(tagsArray);
            } catch (error) {
                console.error("Erro ao carregar tags:", error);
            }
        };
        loadTags();
    }, []);

    // Set initial form values when post data changes
    useEffect(() => {
        if (isOpen) {
            setTitle(post.nome || '');
            setLink(post.link || '');
            setTagsSelecionadas(post.tags || []);
        }
    }, [isOpen, post]);

    // Generate YouTube embed URL for preview
    useEffect(() => {
        if (link) {
            const embedURL = generateEmbedURL(link);
            setVideoEmbedURL(embedURL);
        }
    }, [link]);

    const handleSave = async (e) => {
        e.preventDefault();
        const postId = post.id;

        const result = await editPost(postId, {
            title,
            link,
            tags: tagsSelecionadas
        });

        if (result.success) {
            if (onSave) {
                onSave();
            }
            onClose();
        } else {
            // Consider adding error handling here
            console.error("Failed to update post:", result.error);
        }
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
                        <Box sx={{ mt: 1 }}>
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
