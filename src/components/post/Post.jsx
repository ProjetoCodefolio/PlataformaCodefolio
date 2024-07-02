import { useEffect, useState } from "react";
import { database } from "../../service/firebase";
import { ref, get, push, set, update, remove, onValue } from "firebase/database";
import PostMenu from './Menu';
import { Box, Card, CardContent, Typography, Modal, Button, TextField, MenuItem } from "@mui/material";
import "./post.css";
import YouTube from "react-youtube";
import ComentariosYouTube from "../youtube/comments";
import LikesYouTube from "../youtube/likes";
import { useAuth } from "../../context/AuthContext";
import MembroLink from "../MembroLink";

export default function Post() {
  // const [like, setLike] = useState(0);
  // const [isLiked, setIsLiked] = useState(false);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [link, setLink] = useState('');
  const [editingPost, setEditingPost] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editLink, setEditLink] = useState('');
  const [tags, setTags] = useState([]);
  const [editTags, setEditTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [postTags, setPostTags] = useState([]);
  const [userRole, setUserRole] = useState('');
  const { currentUser } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);
  // Novo estado para controlar a visibilidade da modal
  const [openModal, setOpenModal] = useState(false);
  const [previewLink, setPreviewLink] = useState('');

  // Funções para abrir e fechar a modal
  const handleOpenModal = () => setOpenModal(true);
  const handleCloseModal = () => setOpenModal(false);

  // Atualiza o estado de pré-visualização junto com o estado do link
  const handleLinkChangeAndUpdatePreview = (event) => {
    const newLink = event.target.value;
    handleLinkChange(event); // Atualiza o estado do link
    setPreviewLink(newLink); // Atualiza o estado de pré-visualização
  };

  // Função para gerar o URL de incorporação do YouTube a partir do link normal
  const generateEmbedURL = (url) => {
    const urlObj = new URL(url);
    const videoId = urlObj.searchParams.get("v");
    return `https://www.youtube.com/embed/${videoId}`;
  };

  useEffect(() => {
    if (currentUser) {
      const userRef = ref(database, `users/${currentUser.uid}`);
      onValue(userRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setUserRole(data.categoria);
        }
      });
    }
  }, [currentUser]);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleTitleChange = (event) => {
    setTitle(event.target.value);
  };

  const handleLinkChange = (event) => {
    setLink(event.target.value);
  };

  const handleEditClick = (post) => () => {
    if (userRole === "admin") {
      setEditingPost(post);
      setEditTitle(post.nome);
      setEditLink(post.link);
      setPostTags(post.tags);
    } else {
      alert("Você não tem permissão para editar esse post!");
    }
  };

  const handleEditTitleChange = (event) => {
    setEditTitle(event.target.value);
  };

  const handleEditLinkChange = (event) => {
    setEditLink(event.target.value);
  };

  const handleEditTagChange = (event) => {
    const selectedTags = Array.from(event.target.selectedOptions, option => option.value);
    setEditTags(selectedTags);
    setPostTags(selectedTags);
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    if (editingPost) {
      await editarPost(editingPost.id, editTitle, editLink, editTags);
      setEditingPost(null);
      window.location.reload();
    }
  };

  const handleDeleteClick = (postId) => async () => {
    if (userRole === 'admin') {
      if (window.confirm('Você realmente quer deletar este post?')) {
        const postRef = ref(database, `post/${postId}`);
        await remove(postRef);

        alert("Post deletado com sucesso!")
        window.location.reload();
      }
    } else {
      alert("Você não tem permissão para deletar este post!");
    }
  };

  const handleTagChange = (event) => {
    // Atualiza o estado para conter todos os valores selecionados
    const {
      target: { value },
    } = event;
    setSelectedTags(
      // On autofill we get a stringified value.
      typeof value === 'string' ? value.split(',') : value,
    );
  };

  const criarPost = async (event) => {
    event.preventDefault();
    if (!currentUser) {
      alert("Você precisa estar logado para criar um post.");
      return;
    }

    const postsRef = ref(database, "post");
    const newPostRef = push(postsRef);
    await set(newPostRef, {
      link: link,
      nome: title,
      data: new Date().toLocaleDateString(),
      tags: selectedTags,
      user: currentUser.displayName || currentUser.email, // Nome do usuário logado (ou email se o nome não estiver disponível)
      userAvatar: currentUser.photoURL || "default-avatar-url", // URL do avatar do usuário logado (ou uma URL padrão)
    });
    setTitle('');
    setLink('');
    setSelectedTags([]);

    alert("Post criado com sucesso!");
    window.location.reload();
  };


  const editarPost = async (postId, newTitle, newLink, newTags) => {
    const postRef = ref(database, `post/${postId}`);
    await update(postRef, { nome: newTitle, link: newLink, tags: newTags });
  };

  function getYouTubeID(url) {
    var ID = '';
    url = url.replace(/(>|<)/gi, '').split(/(vi\/|v=|\/v\/|youtu\.be\/|\/embed\/)/);
    if (url[2] !== undefined) {
      ID = url[2].split(/[^0-9a-z_\-]/i);
      ID = ID[0];
    } else {
      ID = url;
    }
    return ID;
  }

  const fetchPosts = async () => {
    setLoading(true);
    const postsQuery = ref(database, "post");

    const snapshot = await get(postsQuery);
    const postsData = snapshot.val();
    if (postsData) {
      const postsList = Object.keys(postsData).map((key) => ({
        id: key,
        ...postsData[key],
      })).reverse();

      setPosts(postsList);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

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

      {loading ? (
        <span>Loading...</span>
      ) : (
        posts.map((post) => (
          <Card
            key={post.id}
            sx={{
              width: "100%",
              maxWidth: { xs: "100%", sm: "800px", md: "1200px" },
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
                    alt={post.user}
                  />
                  <Typography className="postUsername">
                  <MembroLink texto={post.user} user={post.user} />
                  </Typography>
                  -
                  <Typography className="postDate">
                    {post.data}
                  </Typography>
                </Box>

                <Box className="postTopRight">
                  <Box className="postTopRight">
                    <PostMenu post={post} onEdit={handleEditClick} onDelete={handleDeleteClick} />
                  </Box>
                </Box>
              </Box>
              <Box className="postCenter">
                <Typography className="postText"><b>{post.nome}</b> <br /> {post.user}</Typography>
                {post.link ? (
                  <>
                    <YouTube videoId={getYouTubeID(post.link)} />
                    <br />
                    <h4> Tag(s): </h4>
                    {post.tags && post.tags.map((tag, index) => (
                      <p key={index} className="tags">{tag}</p>
                    ))}
                    <br />
                    <br />
                    <ComentariosYouTube videoId={getYouTubeID(post.link)} />
                  </>
                ) : (
                  <img
                    className="postImage"
                    src={post.userAvatar}
                    alt={post.nome}
                  />
                )}
              </Box>
              <Box className="postBottom">
                <Box className="postBottomLeft">
                  <Box style={{ display: "flex" }}>
                    <LikesYouTube videoId={getYouTubeID(post.link)} />
                  </Box>
                </Box>
                {/* <Box className="postBottomRight">
                  <Typography className="postCommentText">Comentários</Typography>
                </Box> */}
              </Box>
              {userRole === 'admin' && (
                <>
                  <h5>Editar post</h5>
                  {editingPost && (
                    <form onSubmit={handleEditSubmit}>
                      <input type="text" value={editTitle} onChange={handleEditTitleChange} required />
                      <input type="text" value={editLink} onChange={handleEditLinkChange} required />

                      <select multiple value={postTags} style={{ marginRight: '5px' }} onChange={handleEditTagChange}>
                        {tags.map((tag, index) => (
                          <option key={index} value={tag}>{tag}</option>
                        ))}
                      </select>

                      <button type="submit">Editar post</button>
                    </form>
                  )}
                  {/* <br />
                  <button onClick={handleEditClick(post)}>Editar Post</button> <br /> <br />
                  <button onClick={handleDeleteClick(post.id)}>Deletar Post</button> */}
                </>
              )}
            </CardContent>
          </Card>
        ))
      )}

      {/* Modal para o formulário de adicionar post */}
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
          <Typography variant="h6" component="h2">
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
                <Typography variant="body1">Pré-visualização:</Typography>
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
  );
}
