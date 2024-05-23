// src/components/Post.js
import { useEffect, useState } from "react";
import { database } from "../../service/firebase";
import { ref, get, push, set, update, remove } from "firebase/database";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { Box, Card, CardContent, Typography } from "@mui/material";
import "./post.css";
import YouTube from "react-youtube";

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

  // para cadastrar post
  const handleTitleChange = (event) => {
    setTitle(event.target.value);
  };

  const handleLinkChange = (event) => {
    setLink(event.target.value);
  };

  // para edição do post
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

  // para deleção de post
  const handleDeleteClick = (postId) => async () => {
    const postRef = ref(database, `post/${postId}`);
    await remove(postRef);
    window.location.reload();
  };

  const criarPost = async () => {
    const postsRef = ref(database, "post");
    const newPostRef = push(postsRef);
    await set(newPostRef, {
      link: link,
      nome: title,
      user: "Usuário Teste de Adição",
      userAvatar: "https://lh3.googleusercontent.com/a/ACg8ocLHiyXA8qA8vOd2GVB0xK52MR8csk1TTaTYQEbz_9gUHaURUIk=s96-c"
    });
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
    }
    else {
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
                  <Typography className="postDate">
                    {new Date().toLocaleDateString()}
                  </Typography>
                </Box>

                <Box className="postTopRight">
                  <MoreVertIcon style={{ cursor: "pointer" }} />
                </Box>
              </Box>

              <Box className="postCenter">
                <Typography className="postText">{post.nome} <br /> {post.user}</Typography>
                {post.link ? (
                  <YouTube videoId={getYouTubeID(post.link)} />
                ) : (
                  <img
                    className="postImage"
                    src={post.link}
                    alt={post.nome}
                  />
                )}
              </Box>
              <Box className="postBottom">
                <Box className="postBottomLeft">
                  <Box style={{ display: "flex" }}>
                    <Box className="likeIconCont">
                      <img
                        className="likeIcon"
                        onClick={likeHandler}
                        src={"../assets/like.png"}
                        alt=""
                      />
                    </Box>
                    <Box className="likeIconCont">
                      <img
                        className="likeIcon"
                        onClick={likeHandler}
                        src={"../assets/heart.png"}
                        alt=""
                      />
                    </Box>
                  </Box>
                  <Typography className="postLikeCounter">
                    {like} people like it
                  </Typography>
                </Box>
                <Box className="postBottomRight">
                  <Typography className="postCommentText">comments</Typography>
                </Box>
              </Box>
              <h5>Editar post</h5>
              {editingPost && (
                <form onSubmit={handleEditSubmit}>
                  <input type="text" value={editTitle} onChange={handleEditTitleChange} required />
                  <input type="text" value={editLink} onChange={handleEditLinkChange} required />
                  <button type="submit">Editar post</button>
                </form>
              )}
              <br />
              {/* <h5>ID: {post.id}</h5> */}
              <button onClick={handleEditClick(post)}>Editar Post</button> <br /> <br />
              <button onClick={handleDeleteClick(post.id)}>Deletar Post</button>
            </CardContent>
          </Card>
        ))
      )}
      <h5>Adicionar post</h5>
      <form onSubmit={criarPost}>
        <input type="text" value={title} onChange={handleTitleChange} placeholder="Título" required />
        <input type="text" value={link} onChange={handleLinkChange} placeholder="Link do YouTube" required />
        <button type="submit">Criar post</button>
      </form>
    </Box>
  );
}
