// import React, { useState, useEffect } from 'react';
// import { Box, Grid, CircularProgress } from '@mui/material';
// import Topbar from '../topbar/Topbar';
// import CreatePostModal from './CreatePost';
// import FilterPostCard from './FilterPost';
// import Pagination from './Pagination';
// import { useAuth } from '../../context/AuthContext';
// import { ref, get, remove, onValue } from 'firebase/database';
// import './post.css';
// import { database } from '../../service/firebase';
// import PostCard from './PostCard';
// import MyAlert from './Alert';
// import { fetchPosts, abrirAlert } from './utils';
// import MyCard from './Card';

// export default function Post({ member }) {
//   const [posts, setPosts] = useState([]);
//   const [comments, setComments] = useState({});
//   const [loading, setLoading] = useState(false);
//   const [editingPost, setEditingPost] = useState(null);
//   const [userRole, setUserRole] = useState('');
//   const { currentUser } = useAuth();
//   const [isEditModalOpen, setIsEditModalOpen] = useState(false);
//   const [filteredVideos, setFilteredVideos] = useState([]);
//   const [isPostCreated, setIsPostCreated] = useState(false);
//   const [isPostDeleted, setIsPostDeleted] = useState(false);
//   const [isPostEdited, setIsPostEdited] = useState(false);
//   const [currentPage, setCurrentPage] = useState(1);
//   const [lastPage, setLastPage] = useState(1);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [alertOpen, setAlertOpen] = useState(false);
//   const [alertMessage, setAlertMessage] = useState('');
//   const [alertSeverity, setAlertSeverity] = useState('success');
//   const postsPerPage = 2;

//   useEffect(() => {
//     if (currentUser) {
//       const userRef = ref(database, `users/${currentUser.uid}`);
//       onValue(userRef, (snapshot) => {
//         const data = snapshot.val();
//         if (data) {
//           setUserRole(data.categoria);
//         }
//       });
//     }
//   }, [currentUser]);

//   const handleEditClick = (post) => () => {
//     if (userRole === "admin" || currentUser.uid === post.uidUser) {
//       setEditingPost(post);
//       setIsEditModalOpen(true);
//     } else {
//       abrirAlert(setAlertMessage, setAlertSeverity, setAlertOpen, "Você não tem permissão para editar este post!", "error");
//     }
//   };

//   const handleDeleteClick = (postId) => async () => {
//     const postRef = ref(database, `post/${postId}`);
//     const postSnapshot = await get(postRef);
//     const post = postSnapshot.val();

//     if (userRole === 'admin' || currentUser.uid === post.uidUser) {
//       if (window.confirm('Você realmente quer deletar este post?')) {
//         await remove(postRef);
//         setPosts((prevPosts) => prevPosts.filter((post) => post.id !== postId));
//         setIsPostDeleted(true);
//         abrirAlert(setAlertMessage, setAlertSeverity, setAlertOpen, "Post deletado com sucesso!", "success");
//       }
//     } else {
//       abrirAlert(setAlertMessage, setAlertSeverity, setAlertOpen, "Você não tem permissão para deletar este post!", "error");
//     }
//   };

//   const applyVideoFilter = (videos) => {
//     setFilteredVideos(videos);
//     setCurrentPage(1); // Reset to the first page when applying a filter
//   };

//   const updateSearchTerm = (term) => {
//     setSearchTerm(term);
//     setCurrentPage(1); // Reset to the first page when searching
//   };

//   const loadPosts = async () => {
//     setLoading(true);
//     const { paginatedPosts, lastPage } = await fetchPosts(member, searchTerm, filteredVideos, currentPage, postsPerPage);
//     setPosts(paginatedPosts);
//     setLastPage(lastPage);
//     setLoading(false);
//   };

//   useEffect(() => {
//     loadPosts();
//   }, [filteredVideos, member, currentPage, searchTerm]);

//   useEffect(() => {
//     if (isPostEdited || isPostCreated || isPostDeleted) {
//       loadPosts();
//       setIsPostEdited(false);
//       setIsPostCreated(false);
//       setIsPostDeleted(false);
//     }
//   }, [isPostEdited, isPostCreated, isPostDeleted, member]);

//   const updateLikes = (postId, updatedLikes) => {
//     setPosts((prevPosts) =>
//       prevPosts.map((post) =>
//         post.id === postId ? { ...post, likes: updatedLikes } : post
//       )
//     );
//   };

//   const goToNextPage = () => {
//     setCurrentPage((prevPage) => prevPage + 1);
//   };

//   const goToPreviousPage = () => {
//     setCurrentPage((prevPage) => Math.max(prevPage - 1, 1));
//   };

//   return (
//     <Box
//       sx={{
//         width: "100%",
//         maxWidth: { xs: "100%", sm: "800px", md: "1200px" },
//         mx: "auto"
//       }}>
//       <Topbar onSearch={updateSearchTerm} />{/* Passar handleSearchChange para Topbar */}
//       <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
//         <CreatePostModal
//           onPostCreated={() => { setIsPostCreated(true); loadPosts(); }}
//           abrirAlert={(message, severity) => abrirAlert(setAlertMessage, setAlertSeverity, setAlertOpen, message, severity)}
//         />
//       </Box>

//       <br />

//       <Grid container spacing={2}>
//         <Grid item xs={4}>
//           <FilterPostCard onFilter={applyVideoFilter} />
//         </Grid>

//         <Grid item xs={8}>
//         <MyCard userPhoto={currentUser.photoURL} setIsPostCreated={setIsPostCreated}/>
//         <br /> <br />
//           {loading ? (
//             <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
//               <CircularProgress sx={{ color: 'black', width: '80px', height: '80px' }} />
//             </Box>
//           ) : (
//             posts.map((post) => (
//               <PostCard
//                 key={post.id}
//                 post={post}
//                 Edit={handleEditClick(post)}
//                 isEditModalOpen={isEditModalOpen}
//                 setIsEditModalOpen={setIsEditModalOpen}
//                 editingPost={editingPost}
//                 Delete={handleDeleteClick(post.id)}
//                 comments={comments}
//                 setComments={setComments}
//                 updateLikes={updateLikes}
//                 userRole={userRole}
//                 currentUser={currentUser}
//                 onPostEdited={() => setIsPostEdited(true)}
//               />
//             ))
//           )}
//         </Grid>
//       </Grid>

//       <Pagination
//         currentPage={currentPage}
//         lastPage={lastPage}
//         onNextPage={goToNextPage}
//         onPreviousPage={goToPreviousPage}
//         onPageSelect={setCurrentPage}
//       />

//       <MyAlert
//         open={alertOpen}
//         onClose={() => setAlertOpen(false)}
//         message={alertMessage}
//         severity={alertSeverity}
//       />
//     </Box>
//   );
// }

import React, { useState, useEffect } from 'react';
import { Box, Grid, CircularProgress } from '@mui/material';
import Topbar from '../topbar/Topbar';
import CreatePostModal from './CreatePost';
import FilterPostCard from './FilterPost';
import Pagination from './Pagination';
import { useAuth } from '../../context/AuthContext';
import { ref, get, remove, onValue } from 'firebase/database';
import './post.css';
import { database } from '../../service/firebase';
import PostCard from './PostCard';
import MyAlert from './Alert';
import { fetchPosts, abrirAlert } from './utils';
import MyCard from './Card';
import MyConfirm from './Confirm';

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
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSeverity, setAlertSeverity] = useState('success');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);
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
      abrirAlert(setAlertMessage, setAlertSeverity, setAlertOpen, "Você não tem permissão para editar este post!", "error");
    }
  };

  const handleDeleteClick = (postId) => async () => {
    const postRef = ref(database, `post/${postId}`);
    const postSnapshot = await get(postRef);
    const post = postSnapshot.val();

    if (userRole === 'admin' || currentUser.uid === post.uidUser) {
      setPostToDelete(postId);
      setConfirmOpen(true);
    } else {
      abrirAlert(setAlertMessage, setAlertSeverity, setAlertOpen, "Você não tem permissão para deletar este post!", "error");
    }
  };

  const handleConfirmDelete = async () => {
    const postRef = ref(database, `post/${postToDelete}`);
    await remove(postRef);
    setPosts((prevPosts) => prevPosts.filter((post) => post.id !== postToDelete));
    setIsPostDeleted(true);
    abrirAlert(setAlertMessage, setAlertSeverity, setAlertOpen, "Post deletado com sucesso!", "success");
    setConfirmOpen(false);
    setPostToDelete(null);
  };

  const applyVideoFilter = (videos) => {
    setFilteredVideos(videos);
    setCurrentPage(1); // Reset to the first page when applying a filter
  };

  const updateSearchTerm = (term) => {
    setSearchTerm(term);
    setCurrentPage(1); // Reset to the first page when searching
  };

  const loadPosts = async () => {
    setLoading(true);
    const { paginatedPosts, lastPage } = await fetchPosts(member, searchTerm, filteredVideos, currentPage, postsPerPage);
    setPosts(paginatedPosts);
    setLastPage(lastPage);
    setLoading(false);
  };

  useEffect(() => {
    loadPosts();
  }, [filteredVideos, member, currentPage, searchTerm]);

  useEffect(() => {
    if (isPostEdited || isPostCreated || isPostDeleted) {
      loadPosts();
      setIsPostEdited(false);
      setIsPostCreated(false);
      setIsPostDeleted(false);
    }
  }, [isPostEdited, isPostCreated, isPostDeleted, member]);

  const updateLikes = (postId, updatedLikes) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post.id === postId ? { ...post, likes: updatedLikes } : post
      )
    );
  };

  const goToNextPage = () => {
    setCurrentPage((prevPage) => prevPage + 1);
  };

  const goToPreviousPage = () => {
    setCurrentPage((prevPage) => Math.max(prevPage - 1, 1));
  };

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: { xs: "100%", sm: "800px", md: "1200px" },
        mx: "auto"
      }}>
      <Topbar onSearch={updateSearchTerm} />{/* Passar handleSearchChange para Topbar */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
        <CreatePostModal
          onPostCreated={() => { setIsPostCreated(true); loadPosts(); }}
          abrirAlert={(message, severity) => abrirAlert(setAlertMessage, setAlertSeverity, setAlertOpen, message, severity)}
        />
      </Box>

      <br />

      <Grid container spacing={2}>
        <Grid item xs={4}>
          <FilterPostCard onFilter={applyVideoFilter} />
        </Grid>

        <Grid item xs={8}>
        <MyCard userPhoto={currentUser.photoURL} setIsPostCreated={setIsPostCreated}/>
        <br /> <br />
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
              <CircularProgress sx={{ color: 'black', width: '80px', height: '80px' }} />
            </Box>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                Edit={handleEditClick(post)}
                isEditModalOpen={isEditModalOpen}
                setIsEditModalOpen={setIsEditModalOpen}
                editingPost={editingPost}
                Delete={handleDeleteClick(post.id)}
                comments={comments}
                setComments={setComments}
                updateLikes={updateLikes}
                userRole={userRole}
                currentUser={currentUser}
                onPostEdited={() => setIsPostEdited(true)}
              />
            ))
          )}
        </Grid>
      </Grid>

      <Pagination
        currentPage={currentPage}
        lastPage={lastPage}
        onNextPage={goToNextPage}
        onPreviousPage={goToPreviousPage}
        onPageSelect={setCurrentPage}
      />

      <MyAlert
        open={alertOpen}
        onClose={() => setAlertOpen(false)}
        message={alertMessage}
        severity={alertSeverity}
      />

      <MyConfirm
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Confirmar Exclusão"
        message="Você realmente quer deletar este post?"
      />
    </Box>
  );
}