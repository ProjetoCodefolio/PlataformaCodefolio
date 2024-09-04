import { useEffect, useState } from "react";
import { database } from "../../service/firebase";
import { ref, get, remove, onValue } from "firebase/database";
import PostMenu from './Menu';
import { Box, Card, CardContent, Typography } from "@mui/material";
import "./post.css";
import YouTube from "react-youtube";
import { useAuth } from "../../context/AuthContext";
import MembroLink from "../MembroLink";
import EditPostModal from "./EditPost";
import CreatePostModal from "./CreatePost";
import FilterPostCard from "./FilterPost";
import Comentarios from "./Comentarios";
import Likes from "./Likes";
import Pagination from "./Pagination";
import { CircularProgress } from "@mui/material";
import Topbar from "../topbar/Topbar";

export default function Post({ member }) {
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState({});
  const [loading, setLoading] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [userRole, setUserRole] = useState('');
  const { currentUser } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [filteredVideos, setFilteredVideos] = useState([]);
  const [isPostCreated, setIsPostCreated] = useState(false);
  const [isPostDeleted, setIsPostDeleted] = useState(false);
  const [isPostEdited, setIsPostEdited] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const postsPerPage = 2;

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
    if (userRole === "admin" || currentUser.uid === post.uidUser) {
      setEditingPost(post);
      setIsEditModalOpen(true);
    } else {
      alert("Você não tem permissão para editar esse post!");
    }
  };

  const handleDeleteClick = (postId) => async () => {
    const postRef = ref(database, `post/${postId}`);
    const postSnapshot = await get(postRef);
    const post = postSnapshot.val();

    if (userRole === 'admin' || currentUser.uid === post.uidUser) {
      if (window.confirm('Você realmente quer deletar este post?')) {
        await remove(postRef);
        setPosts((prevPosts) => prevPosts.filter((post) => post.id !== postId));
        setIsPostDeleted(true);
        alert("Post deletado com sucesso!");
      }
    } else {
      alert("Você não tem permissão para deletar este post!");
    }
  };

  const handleFilteredVideos = (videos) => {
    setFilteredVideos(videos);
    setCurrentPage(1); // Resetar para a primeira página ao aplicar um filtro
  };

  const handleSearchChange = (term) => {
    setSearchTerm(term);
    setCurrentPage(1); // Resetar para a primeira página ao fazer uma pesquisa
  };

  const fetchPosts = async (member) => {
    setLoading(true);
  
    const postsQuery = ref(database, "post"); // Query para buscar todos os posts
  
    const snapshot = await get(postsQuery); // Obter os dados dos posts
    const postsData = snapshot.val();
    if (postsData) {
      const postsList = Object.keys(postsData).map((key) => ({
        id: key,
        ...postsData[key],
      })).reverse();
  
      // Filtragem por termo de busca
      let filteredPosts = postsList.filter(post =>
        post.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.user.toLowerCase().includes(searchTerm.toLowerCase())
      );
  
      // Filtragem por tags
      if (filteredVideos && Array.isArray(filteredVideos) && filteredVideos.length > 0) {
        filteredPosts = filteredVideos;
      }
  
      // Filtragem por membro
      if (member) {
        filteredPosts = filteredPosts.filter(post => post.uidUser === member);
      }
  
      // Paginação
      const startIndex = (currentPage - 1) * postsPerPage;
      const endIndex = startIndex + postsPerPage;
      const paginatedPosts = filteredPosts.slice(startIndex, endIndex);  
      const lastPage = Math.ceil(filteredPosts.length / postsPerPage);
      setLastPage(lastPage);
  
      setPosts(paginatedPosts);
    }
    setLoading(false);
  };

  const handleNextPage = () => {
    setCurrentPage((prevPage) => prevPage + 1);
  };

  const handlePreviousPage = () => {
    setCurrentPage((prevPage) => Math.max(prevPage - 1, 1));
  };

  useEffect(() => {
    fetchPosts(member);
  }, [filteredVideos, member, currentPage, searchTerm]);

  useEffect(() => {
    if (isPostEdited || isPostCreated || isPostDeleted) {
      fetchPosts(member);
      setIsPostEdited(false);
      setIsPostCreated(false);
      setIsPostDeleted(false);
    }
  }, [isPostEdited, isPostCreated, isPostDeleted, member]);

  const handleLikeUpdate = (postId, updatedLikes) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post.id === postId ? { ...post, likes: updatedLikes } : post
      )
    );
  };

  return (
    <Box>
      <Topbar onSearch={handleSearchChange} /> {/* Passar handleSearchChange para Topbar */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
        <CreatePostModal onPostCreated={() => setIsPostCreated(true)} />
      </Box>

      <br />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
          <CircularProgress sx={{ color: 'black', width: '80px', height: '80px' }} />
        </Box>
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
                    <MembroLink texto={post.user} user={post.uidUser} />
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
                    <Comentarios postId={post.id} comments={comments} setComments={setComments} />
                  </>
                ) : (
                  <img
                    className="postImage"
                    src={post.userAvatar}
                    alt={post} />
                )}
              </Box>
              <Box className="postBottom">
                <Box className="postBottomLeft">
                  <Box style={{ display: "flex" }}>
                    <Likes post={post} onLikeUpdate={handleLikeUpdate} />
                  </Box>
                </Box>
              </Box>
              {(userRole === 'admin' || currentUser.uid === post.uidUser) && (
                <>
                  {isEditModalOpen && (
                    <EditPostModal
                      isOpen={isEditModalOpen}
                      onClose={() => setIsEditModalOpen(false)}
                      post={editingPost}
                      onSave={() => setIsPostEdited(true)}
                    />
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ))
      )}
      <Pagination
        currentPage={currentPage}
        lastPage={lastPage}
        onNextPage={handleNextPage}
        onPreviousPage={handlePreviousPage}
        onPageSelect={setCurrentPage}
      />
      <div>
        <FilterPostCard onFilter={handleFilteredVideos} />
      </div>
    </Box>
  );
}

export function getYouTubeID(url) {
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