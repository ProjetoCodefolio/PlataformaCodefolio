import { useEffect, useState } from "react";
import { database } from "../../service/firebase";
import { ref, push, set, onValue } from "firebase/database";
import { Box, Typography, Modal, Button, TextField, MenuItem } from "@mui/material";
import "./post.css";
import { useAuth } from "../../context/AuthContext";
import { fetchYouTubeComments } from "./utils";

const CreatePostModal = ({ onPostCreated, abrirAlert }) => {

    const [title, setTitle] = useState('');
    const [link, setLink] = useState('');
    const [tags, setTags] = useState([]);
    const [selectedTags, setSelectedTags] = useState([]);
    const [previewLink, setPreviewLink] = useState('');
    const [openModal, setOpenModal] = useState(false);
    const { currentUser } = useAuth();

    const handleOpenModal = () => {
        setOpenModal(true); // Isso irá abrir o modal
    };

    const handleCloseModal = () => {
        setOpenModal(false); // Isso irá fechar o modal
    };

    const handleLinkChangeAndUpdatePreview = (event) => {
        const newLink = event.target.value;
        setLink(newLink); // Atualiza o estado do link
        setPreviewLink(newLink); // Atualiza o estado de pré-visualização
    };

    const handleTitleChange = (event) => setTitle(event.target.value);

    const handleTagChange = (event) => {
        const { target: { value } } = event;
        setSelectedTags(typeof value === 'string' ? value.split(',') : value);
    };

    const criarPost = async (event) => {
        event.preventDefault();
        if (!currentUser) {
            abrirAlert("Você precisa estar logado para criar um post.", "error");
            return;
        }

        const commentsYouTube = await fetchYouTubeComments(link);

        const postsRef = ref(database, "post");
        const newPostRef = push(postsRef);
        const newPostData = {
            data: new Date().toLocaleDateString(),
            link: link,
            nome: title,
            tags: selectedTags,
            uidUser: currentUser.uid,
            user: currentUser.displayName || currentUser.email, // Nome do usuário logado (ou email se o nome não estiver disponível)
            userAvatar: currentUser.photoURL || "default-avatar-url", // URL do avatar do usuário logado (ou uma URL padrão)
        };

        if (commentsYouTube.length > 0) {
            newPostData.comentarios = commentsYouTube;
        }

        await set(newPostRef, newPostData);
        setTitle('');
        setLink('');
        setSelectedTags([]);

        abrirAlert("Post criado com sucesso!", "success");
        setOpenModal(false); // Fechar o modal após a criação do post
        onPostCreated(); // Chamar a função de callback para atualizar o estado no componente pai
    };

    // Função para gerar o URL de incorporação do YouTube a partir do link normal
    const generateEmbedURL = (url) => {
        try {
            const objetoUrl = new URL(url);
            const idDoVideo = objetoUrl.searchParams.get("v");
            if (!idDoVideo) {
                throw new Error("URL do YouTube inválida: ID do vídeo não encontrado.");
            }
            return `https://www.youtube.com/embed/${idDoVideo}`;
        } catch (erro) {
            console.error(erro.message);
            return null; // ou uma URL padrão ou uma mensagem de erro, dependendo do seu caso de uso
        }
    };

    useEffect(() => {
        const tagsRef = ref(database, 'tags');

        onValue(tagsRef, (snapshot) => {
            const data = snapshot.val();
            let tagsArray = [];
            for (let tag in data) {
                tagsArray.push(data[tag].nome);
            }
            setTags(tagsArray);
        }, (error) => {
            console.error("Error: ", error);
        });
    }, []);

    return (
        <Box>
            {/* Botão para abrir a modal */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Button sx={{ border: 'solid', color: 'black' }} onClick={handleOpenModal}>+</Button>
            </Box>

            <Modal
                open={openModal}
                onClose={handleCloseModal}
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
                        Adicionar post
                    </Typography>
                    <br />
                    <Box
                        component="form"
                        onSubmit={criarPost}
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
                            onChange={handleTitleChange}
                            required
                        />

                        <TextField
                            label="Link do YouTube"
                            variant="outlined"
                            value={link}
                            onChange={handleLinkChangeAndUpdatePreview}
                            required
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
                        >
                            {tags.map((tag, index) => (
                                <MenuItem key={index} value={tag}>
                                    {tag}
                                </MenuItem>
                            ))}
                        </TextField>

                        {/* Componente de Pré-visualização */}
                        {previewLink && (
                            <Box sx={{ mt: 2 }}>
                                <Typography component="div" variant="body1">Pré-visualização:</Typography>
                                <iframe
                                    width="100%"
                                    height="400"
                                    src={generateEmbedURL(previewLink)}
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                ></iframe>
                            </Box>
                        )}

                        <Button type="submit" variant="contained" sx={{ mt: '20px' }}>
                            Criar post
                        </Button>
                    </Box>
                </Box>
            </Modal>
        </Box>
    )
}

export default CreatePostModal;