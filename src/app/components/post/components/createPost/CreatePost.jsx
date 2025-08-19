import { useEffect, useState } from "react";
import { Box, Typography, Modal, Button, TextField, MenuItem } from "@mui/material";
import { useAuth } from "$context/AuthContext";
import { createPost, fetchTags, generateEmbedURL } from "$api/services/posts/";

const CreatePostModal = ({ onPostCreated, abrirAlert, open, onClose, modalTitle }) => {
    const [title, setTitle] = useState('');
    const [link, setLink] = useState('');
    const [tags, setTags] = useState([]);
    const [selectedTags, setSelectedTags] = useState([]);
    const [previewLink, setPreviewLink] = useState('');
    const { currentUser } = useAuth();

    const handleLinkChangeAndUpdatePreview = (event) => {
        const newLink = event.target.value;
        setLink(newLink);
        setPreviewLink(newLink);
    };

    const handleTitleChange = (event) => setTitle(event.target.value);

    const handleTagChange = (event) => {
        const { target: { value } } = event;
        setSelectedTags(typeof value === 'string' ? value.split(',') : value);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!currentUser) {
            abrirAlert("Você precisa estar logado para criar um post.", "error");
            return;
        }

        const result = await createPost(
            { title, link, selectedTags },
            currentUser
        );

        if (result.success) {
            setTitle('');
            setLink('');
            setSelectedTags([]);
            abrirAlert("Post criado com sucesso!", "success");
            onClose();
            onPostCreated();
        } else {
            abrirAlert(`Erro ao criar post: ${result.error}`, "error");
        }
    };

    useEffect(() => {
        const loadTags = async () => {
            try {
                const tagsArray = await fetchTags();
                setTags(tagsArray);
            } catch (error) {
                console.error("Erro ao carregar tags:", error);
            }
        };
        
        loadTags();
    }, []);

    return (
        <Modal
            open={open}
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
                    {modalTitle}
                </Typography>

                <Box
                    component="form"
                    onSubmit={handleSubmit}
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
                        onChange={handleTitleChange}
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
                        onChange={handleLinkChangeAndUpdatePreview}
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
                        value={selectedTags}
                        onChange={handleTagChange}
                        SelectProps={{
                            multiple: true,
                            renderValue: (selected) => selected.join(', '),
                        }}
                        helperText="Selecione as tags para o post"
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
                        {tags.map((tag, index) => (
                            <MenuItem key={index} value={tag}>
                                {tag}
                            </MenuItem>
                        ))}
                    </TextField>

                    {previewLink && (
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
                                src={generateEmbedURL(previewLink)}
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
                        Criar post
                    </Button>
                </Box>
            </Box>
        </Modal>
    );
}

export default CreatePostModal;