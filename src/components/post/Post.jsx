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

export default function Post() {
  const [posts, setPosts] = useState([]);
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


  // pega a categoria do usuário logado (a implementação disso vai ser alterado posteriormente)
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
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    if (filteredVideos !== undefined) {
      setPosts(filteredVideos);
    } else {
      fetchPosts();
    }
  }, [filteredVideos, setPosts]);

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
