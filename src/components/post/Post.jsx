import { useEffect, useState } from "react";
import { database } from "../../service/firebase";
import { ref, get, update, remove, onValue } from "firebase/database";
import PostMenu from './Menu';
import { Box, Card, CardContent, Typography, Button } from "@mui/material";
import "./post.css";
import YouTube from "react-youtube";
import ComentariosYouTube from "../youtube/comments";
import { useAuth } from "../../context/AuthContext";
import MembroLink from "../MembroLink";
import EditPostModal from "./EditPost";
import CreatePostModal from "./CreatePost";
import FilterPostCard from "./FilterPost";
import likeIcon from "../../assets/img/like.jpg";
import axios from "axios";

export default function Post() {
  const [posts, setPosts] = useState([]);
  const [likes, setLikes] = useState(0);
  const [comentario, setComentario] = useState('');
  const [comments, setComments] = useState({});
  const [loading, setLoading] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editLink, setEditLink] = useState('');
  const [editTags, setEditTags] = useState([]);
  const [postTags, setPostTags] = useState([]);
  const [userRole, setUserRole] = useState('');
  const { currentUser } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [filteredVideos, setFilteredVideos] = useState([]);

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

  const handleEditClick = (post) => () => {
    if (userRole === "admin") {
      setEditingPost(post);
      setEditTitle(post.nome);
      setEditLink(post.link);
      setPostTags(post.tags);
      setIsEditModalOpen(true);
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
        alert("Post deletado com sucesso!");
        window.location.reload();
      }
    } else {
      alert("Você não tem permissão para deletar este post!");
    }
  };

  const computarLike = (post) => {
    if (!Array.isArray(post.likes)) {
      console.error("likes não é um array", post.likes);
      return;
    }

    if (post.likes.some(like => like[0] === currentUser.uid)) {
      alert("Você já deu like nesse post!");
    } else {
      const updatedLikes = [...post.likes, {
        uidUsuario: currentUser.uid,
        nome: currentUser.displayName,
        data: new Date().toLocaleDateString()
      }];
      const postRef = ref(database, `post/${post.id}`);

      update(postRef, { likes: updatedLikes }).then(() => {
        alert("Like adicionado com sucesso!");
        setLikes(updatedLikes.length);
      }).catch((error) => {
        console.error("Erro ao adicionar like:", error);
      });
    }
  };

  const handleSubmit = (post, e) => {
    e.preventDefault();
    postarComentario(post, comentario);
    setComentario('');
  };

  const postarComentario = async (post, comentario) => {
    const dataComentario = new Date().toLocaleDateString();
    const novoComentario = {
      uidUsuario: currentUser.uid,
      nome: currentUser.displayName,
      comentario: comentario,
      data: dataComentario
    };

    const postRef = ref(database, `post/${post.id}`);

    try {
      // Buscar o array de comentários atual
      const snapshot = await get(postRef);
      const postData = snapshot.val();

      let comentarioPostar = [];
      if (postData && postData.comentarios) {
        // Adicionar o novo comentário ao array existente
        comentarioPostar = [...postData.comentarios, novoComentario];
      } else {
        // Criar um novo array de comentários com o novo comentário
        comentarioPostar = [novoComentario];
      }

      // Atualizar o array de comentários no banco de dados
      await update(postRef, { comentarios: comentarioPostar });
      alert("Comentário postado com sucesso!");
    } catch (error) {
      console.error("Erro ao postar comentário: ", error);
    }
  };

  const handleFilteredVideos = (videos) => {
    setFilteredVideos(videos);
  };

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

      // Chamar mostrarComentarios para cada post
      postsList.forEach(post => mostrarComentarios(post.id));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const mostrarComentarios = (postId) => {
    const postRef = ref(database, `post/${postId}`);
    onValue(postRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.comentarios) {
        setComments((prevComments) => ({
          ...prevComments,
          [postId]: data.comentarios,
        }));
      } else {
        setComments((prevComments) => ({
          ...prevComments,
          [postId]: [],
        }));
      }
    });
  };

  useEffect(() => {
    if (filteredVideos !== undefined) {
      setPosts(filteredVideos);
    } else {
      fetchPosts();
    }
  }, [filteredVideos]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
        <CreatePostModal />

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
                  <PostMenu post={post} onEdit={handleEditClick} onDelete={handleDeleteClick} />
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
                    {/* <ComentariosYouTube videoId={getYouTubeID(post.link)} /> */}
                    <form onSubmit={(e) => handleSubmit(post, e)}>
                      <label htmlFor="comentario"> Poste seu comentário: </label> <br />
                      <input type="text"
                        id="comentario"
                        value={comentario}
                        onChange={(e) => setComentario(e.target.value)}
                      /> <br />
                      <Button type="submit">
                        Enviar
                      </Button>
                    </form>

                    <h3> Comentários: </h3>
                    {comments[post.id] && comments[post.id].length > 0 ? (
                      comments[post.id].map((comentario, index) => (
                        <p key={index}>{comentario.nome} - {comentario.comentario}</p>
                      ))
                    ) : (
                      <p>Não há comentários ainda!</p>
                    )}
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
                    <Button onClick={() => computarLike(post)}>
                      <img src={likeIcon} alt="Like" style={{ width: '55px', height: '55px', marginRight: '8px' }} />
                      <Typography style={{ color: 'black' }}> {post.likes.length - 1} </Typography>
                    </Button>
                  </Box>
                </Box>
              </Box>
              {userRole === 'admin' && (
                <>
                  {isEditModalOpen && (
                    <EditPostModal
                      isOpen={isEditModalOpen}
                      onClose={() => setIsEditModalOpen(false)}
                      post={editingPost}
                      onSave={handleEditSubmit}
                    />
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ))
      )}
      <div>
        <FilterPostCard onFilter={handleFilteredVideos} />
      </div>
    </Box>
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