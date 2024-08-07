import { useEffect, useState } from "react";
import { database } from "../../service/firebase";
import { ref, get, push, set, update, remove, onValue } from "firebase/database";
import PostMenu from './Menu';
import { Box, Card, CardContent, Typography, Modal, Button, TextField, Checkbox, FormControlLabel, MenuItem } from "@mui/material";
import "./post.css";
import YouTube from "react-youtube";
import ComentariosYouTube from "../youtube/comments";
import { useAuth } from "../../context/AuthContext";
import MembroLink from "../MembroLink";

export default function Post() {
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
  const [openModal, setOpenModal] = useState(false);
  const [previewLink, setPreviewLink] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedFilterTags, setSelectedFilterTags] = useState([]);

  // Funções para abrir e fechar a modal
  const handleOpenModal = () => setOpenModal(true);
  const handleCloseModal = () => setOpenModal(false);

  // Atualiza o estado de pré-visualização junto com o estado do link
  const handleLinkChangeAndUpdatePreview = (event) => {
    const newLink = event.target.value;
    handleLinkChange(event); // Atualiza o estado do link
    setPreviewLink(newLink); // Atualiza o estado de pré-visualização
  };

  const handleChange = (event) => {
    setSelectedCategory(event.target.value);
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
      setIsEditModalOpen(true); // Abre o modal de edição
    } else {
      alert("Você não tem permissão para editar esse post!");
    }
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
      data: new Date().toLocaleDateString(),
      likes: ["uncounted like"], // Inicializa o array de likes com um valor padrão (que não será contabilizado), pois não é possível criar um array vazio
      link: link,
      nome: title,
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

  function EditPostModal({ isOpen, onClose, post, onSave }) {
    const [title, setTitle] = useState('');
    const [link, setLink] = useState('');
    const [tags, setTags] = useState([]);
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
        setTags(post.tags || []);
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
                  height="400"
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

  const computarLike = (post) => {
    // Garante que post.likes é um array antes de prosseguir
    if (!Array.isArray(post.likes)) {
      console.error("likes não é um array", post.likes);
      return; // Encerra a função se post.likes não for um array
    }

    // Verifica se o usuário atual já deu like
    if (post.likes.includes(currentUser.uid)) {
      alert("Você já deu like nesse post!");
    } else {
      // Adiciona o uid do usuário atual ao array de likes
      const updatedLikes = [...post.likes, currentUser.uid];

      // Referencia o post específico usando o id do post
      const postRef = ref(database, `post/${post.id}`);

      // Atualiza o post com os novos likes
      update(postRef, { likes: updatedLikes })
        .then(() => {
          alert("Like adicionado com sucesso!");
        })
        .catch((error) => {
          console.error("Erro ao adicionar like:", error);
        });
    }
  };

  const handleTagFilterChange = (tag, isChecked) => {
    setSelectedFilterTags(prev => {
      if (isChecked) {
        // Adiciona a tag ao array se estiver marcada
        return [...prev, tag];
      } else {
        // Remove a tag do array se estiver desmarcada
        return prev.filter(t => t !== tag);
      }
    });
  };

  const filtrarPosts = async (selectedCategory) => {
    if (!Array.isArray(selectedCategory)) {
      selectedCategory = [selectedCategory];
    }

    const postsQuery = ref(database, "post");
    const snapshot = await get(postsQuery);
    const postsData = snapshot.val();
    if (postsData) {
      const postsList = Object.keys(postsData).map((key) => ({
        id: key,
        ...postsData[key],
      })).reverse();

      const filteredPosts = postsList.filter((post) => {
        // Correção: Verificar se algum dos elementos de selectedCategory está incluído nas tags do post
        return selectedCategory.some(category => post.tags.includes(category));
      });

      setPosts(filteredPosts);
    }
  };

  const limprarFiltros = () => {
    setSelectedFilterTags([]);
    fetchPosts();
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

      <br />

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
                    alt={post.user} />
                  <Typography component="div" variant="h6" className="postUsername">
                    <MembroLink texto={post.user} user={post.user} />
                  </Typography>
                  -
                  <Typography component="div" variant="h6" className="postDate">
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
                <Typography component="div" variant="h6" className="postText">
                  <b>{post.nome}</b> <br /> {post.user}
                </Typography>
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
                    alt={post.nome} />
                )}
              </Box>
              <Box className="postBottom">
                <Box className="postBottomLeft">
                  <Box style={{ display: "flex" }}>
                    <Button onClick={() => computarLike(post)}> Adicionar Like ({(post.likes.length - 1)}) </Button>
                    {/* <LikesYouTube videoId={getYouTubeID(post.link)} /> */}
                  </Box>
                </Box>
                {/* <Box className="postBottomRight">
      <Typography className="postCommentText">Comentários</Typography>
    </Box> */}
              </Box>
              {userRole === 'admin' && (
                <>
                  {isEditModalOpen && (
                    <EditPostModal
                      isOpen={isEditModalOpen}
                      onClose={() => setIsEditModalOpen(false)}
                      post={editingPost}
                      onSave={handleEditSubmit} // Certifique-se de passar uma função para salvar as edições
                    />
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ))
      )}
      <Card sx={{ maxWidth: 345, m: 2 }}>
        <CardContent>
          <Typography component="div" variant="h6">
            Categorias de Vídeos
          </Typography>
          {tags.map((tag, index) => (
            <div key={index}>
              <FormControlLabel
                control={<Checkbox
                  onChange={(e) => handleTagFilterChange(tag, e.target.checked)}
                  checked={selectedFilterTags.includes(tag)} // Adicionado para controlar o estado marcado/desmarcado
                  sx={{
                    color: "purple",
                    "&.Mui-checked": {
                      color: "purple",
                    },
                  }}
                />}
                label={tag}
              />
            </div>
          ))}

          <br />

          <Button
            onClick={() => limprarFiltros()}
            sx={{
              backgroundColor: "purple",
              color: "white",
              marginRigth: "30%",
              ":hover": {
                backgroundColor: "purple",
                color: "white",
              },
            }}
          >
            Limpar Filtros
          </Button>

          <Button
            onClick={() => filtrarPosts(selectedFilterTags)}
            sx={{
              backgroundColor: "purple",
              color: "white",
              marginLeft: "30%",
              ":hover": {
                backgroundColor: "purple",
                color: "white",
              },
            }}
          >
            Filtrar
          </Button>

        </CardContent>
      </Card>

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

  );
}
