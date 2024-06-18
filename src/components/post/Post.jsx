import { useEffect, useState } from "react";
import { database } from "../../service/firebase";
import { ref, get, push, set, update, remove, onValue } from "firebase/database";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { Box, Card, CardContent, Typography } from "@mui/material";
import "./post.css";
import YouTube from "react-youtube";
import ComentariosYouTube from "../youtube/comments";
import ComentarYouTube from "../youtube/comentarYouTube";
import LikesYouTube from "../youtube/likes";
import { useAuth } from "../../context/AuthContext";

export default function Post() {
  const [like, setLike] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [link, setLink] = useState('');
  const [editingPost, setEditingPost] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editLink, setEditLink] = useState('');
  const [tags, setTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [userRole, setUserRole] = useState('');
  const { currentUser } = useAuth();

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

  const handleTitleChange = (event) => {
    setTitle(event.target.value);
  };

  const handleLinkChange = (event) => {
    setLink(event.target.value);
  };

  const handleEditClick = (post) => () => {
    setEditingPost(post);
    setEditTitle(post.nome);
    setEditLink(post.link);
  };

  const handleEditTitleChange = (event) => {
    setEditTitle(event.target.value);
  };

  const handleEditLinkChange = (event) => {
    setEditLink(event.target.value);
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    if (editingPost) {
      await editarPost(editingPost.id, editTitle, editLink);
      setEditingPost(null);
      window.location.reload();
    }
  };

  const handleDeleteClick = (postId) => async () => {
    if (userRole === 'admin') {
      const postRef = ref(database, `post/${postId}`);
      await remove(postRef);
      window.location.reload();
    } else {
      alert("Você não tem permissão para deletar este post.");
    }
  };

  const handleTagChange = (event) => {
    setSelectedTags(Array.from(event.target.selectedOptions, option => option.value));
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
  

  const editarPost = async (postId, newTitle, newLink) => {
    const postRef = ref(database, `post/${postId}`);
    await update(postRef, { nome: newTitle, link: newLink });
  };

  const likeHandler = () => {
    if (isLiked === false) {
      setLike(like + 1);
      setIsLiked(true);
    } else {
      setLike(like - 1);
      setIsLiked(false);
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
                    {post.user}
                  </Typography>
                    -
                  <Typography className="postDate">
                    {post.data}
                  </Typography>
                </Box>

                <Box className="postTopRight">
                  <MoreVertIcon style={{ cursor: "pointer" }} />
                </Box>
              </Box>
              <Box className="postCenter">
                <Typography className="postText">{post.nome} <br /> {post.user}</Typography>
                {post.link ? (
                  <>
                    <YouTube videoId={getYouTubeID(post.link)} />
                    <br />
                    <h5>Tags:</h5>
                    {post.tags && post.tags.map((tag, index) => (
                      <Typography key={index} className="postText">{tag}</Typography>
                    ))}
                    <br />
                    <ComentariosYouTube videoId={getYouTubeID(post.link)} />
                    <br />
                    <ComentarYouTube videoId={getYouTubeID(post.link)} />
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
                <Box className="postBottomRight">
                  <Typography className="postCommentText">Comentários</Typography>
                </Box>
              </Box>
              {userRole === 'admin' && (
                <>
                  <h5>Editar post</h5>
                  {editingPost && (
                    <form onSubmit={handleEditSubmit}>
                      <input type="text" value={editTitle} onChange={handleEditTitleChange} required />
                      <input type="text" value={editLink} onChange={handleEditLinkChange} required />
                      <button type="submit">Editar post</button>
                    </form>
                  )}
                  <br />
                  <button onClick={handleEditClick(post)}>Editar Post</button> <br /> <br />
                  <button onClick={handleDeleteClick(post.id)}>Deletar Post</button>
                </>
              )}
            </CardContent>
          </Card>
        ))
      )}
      <h5>Adicionar post</h5>
      <form onSubmit={criarPost}>
        <input type="text" value={title} onChange={handleTitleChange} placeholder="Título" style={{ marginRight: '5px' }} required />
        <input type="text" value={link} onChange={handleLinkChange} placeholder="Link do YouTube" style={{ marginRight: '5px' }} required />

        <select multiple style={{ marginRight: '5px' }} onChange={handleTagChange}>
          {tags.map((tag, index) => (
            <option key={index} value={tag}>{tag}</option>
          ))}
        </select>

        <button type="submit">Criar post</button>
      </form>

      <br />
      <br />

      <select style={{ marginRight: '5px' }}>
        {tags.map((tag, index) => (
          <option key={index} value={tag}>{tag}</option>
        ))}
      </select>
    </Box>
  );
}