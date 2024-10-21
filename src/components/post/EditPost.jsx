import React, { useEffect, useState } from 'react';
import { database } from "../../service/firebase";
import { ref, get, update } from "firebase/database";
import { Box, Typography, Modal, Button, TextField, MenuItem } from "@mui/material";
import "./post.css";

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
        e.preventDefault(); // Previne o comportamento padrão do formulário
        const postId = post.id;
        await editarPost(postId, title, link, tagsSelecionadas);
        if (onSave) {
            onSave();
        }
        onClose(); // Fecha o modal
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
                    width: 600,
                    bgcolor: 'background.paper',
                    boxShadow: 24,
                    p: 4,
                    outline: 'none',
                }}
            >
                <Typography component="div" variant="h6">
                    Editar Post
                </Typography>
                <br />
                <Box
                    component="form"
                    onSubmit={handleSave}
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '20px',
                    }}
                >
                    <TextField
                        label="Título"
                        variant="outlined"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                    />

                    <TextField
                        label="Link do YouTube"
                        variant="outlined"
                        value={link}
                        onChange={(e) => setLink(e.target.value)}
                        required
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
                        required>

                        {allTags.map((tag) => (
                            <MenuItem key={tag} value={tag}>
                                {tag}
                            </MenuItem>
                        ))}
                    </TextField>

                    {videoEmbedURL && (
                        <Box sx={{ mt: 2 }}>
                            <Typography component="div" variant="body1">Pré-visualização:</Typography>
                            <iframe
                                width="100%"
                                height="300"
                                src={videoEmbedURL}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            ></iframe>
                        </Box>
                    )}

                    <Button type="submit" variant="contained" sx={{ mt: '20px' }}>
                        Editar Post
                    </Button>
                </Box >
            </Box >
        </Modal >
    );
}

export default EditPostModal;
