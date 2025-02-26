import React, { useState, useEffect } from "react"; 
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  CardActions,
  Button,
  Grid,
  Modal
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import Topbar from "../../components/topbar/Topbar";
import { ref, get, remove } from "firebase/database";
import { database } from "../../service/firebase.jsx"; 
import { useAuth } from "../../context/AuthContext";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import WarningIcon from '@mui/icons-material/Warning';

const ManageMyCourses = () => {
  const [courses, setCourses] = useState([]);
  const { userDetails } = useAuth();
  const navigate = useNavigate();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState(null);

  useEffect(() => {
    const loadCourses = async () => {
      try {
        if (!userDetails?.userId) {
          console.log("Usuário não autenticado");
          return;
        }

        console.log("Iniciando carregamento dos cursos...");
        const coursesRef = ref(database, "courses");
        const snapshot = await get(coursesRef);
        
        if (snapshot.exists()) {
          const data = snapshot.val();
          const coursesData = Object.entries(data)
            .map(([courseId, course]) => ({
              courseId,
              ...course,
            }))
            .filter(course => course.userId === userDetails.userId);

          console.log("Cursos carregados:", coursesData);
          setCourses(coursesData);
        } else {
          console.log("Nenhum curso encontrado.");
          setCourses([]);
        }
      } catch (error) {
        console.error("Erro ao carregar cursos:", error);
        toast.error("Erro ao carregar os cursos");
        setCourses([]); // Garante que o estado seja limpo em caso de erro
      }
    };

    loadCourses();
  }, [userDetails]);

  const handleEditCourse = (course) => {
    navigate(`/adm-cursos?courseId=${course.courseId}`);
  };

  const handleCreateNewCourse = () => {
    navigate(`/adm-cursos`);
  };

  const handleDeleteCourse = async (courseId) => {
    setCourseToDelete(courseId);
    setDeleteModalOpen(true);
  };

  const confirmDeleteCourse = async () => {
    try {
      const courseId = courseToDelete;
      if (!courseId) return;

      console.log("Deletando curso:", courseId);

      // Deleta o curso
      await remove(ref(database, `courses/${courseId}`));

      // Remove os vídeos do curso
      const videosRef = ref(database, "courseVideos");
      const videosSnapshot = await get(videosRef);
      if (videosSnapshot.exists()) {
        const videos = Object.entries(videosSnapshot.val());
        for (const [videoId, video] of videos) {
          if (video.courseId === courseId) {
            await remove(ref(database, `courseVideos/${videoId}`));
          }
        }
      }

      // Atualiza a lista de cursos
      setCourses(prevCourses => 
        prevCourses.filter(course => course.courseId !== courseId)
      );

      setDeleteModalOpen(false);
      setCourseToDelete(null);
      toast.success("Curso deletado com sucesso!");
    } catch (error) {
      console.error("Erro ao deletar curso:", error);
      toast.error("Erro ao deletar o curso");
    }
  };

  const renderCourses = (courses, actionButtonLabel, onClickAction) => {
    if (courses.length === 0) {
      return <Typography variant="body1">Nenhum curso encontrado.</Typography>;
    }

    return (
      <Grid container spacing={3}>
        {courses.map((course) => (
          <Grid item xs={12} sm={6} md={4} key={course.courseId}>
            <Card
              sx={{
                backgroundColor: "#ffffff !important",
                boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
                borderRadius: "8px",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                transition: 'transform 0.2s ease-in-out',
                '&:hover': {
                  transform: 'scale(1.02)',
                  boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.2)"
                }
              }}
            >
              <CardContent>
                <Typography
                  variant="subtitle1"
                  sx={{ 
                    fontWeight: "bold", 
                    textAlign: "center",
                    mb: 1,
                    fontSize: "1rem", 
                    color: "#333" 
                  }}
                >
                  {course.title || "Título do Curso"}
                </Typography>
                <Typography 
                  variant="body2" 
                  color="textSecondary"
                  sx={{
                    fontSize: "0.875rem", 
                    mb: 1
                  }}
                >
                  {course.description || "Descrição do curso"}
                </Typography>
              </CardContent>
              <CardActions sx={{ p: 2, justifyContent: 'center', mt: 'auto', gap: 1 }}>
                <Button
                  size="small"
                  variant="contained"
                  sx={{ 
                    padding: '8px 16px', 
                    borderRadius: '8px',
                    backgroundColor: '#9041c1',
                    color: 'white',
                    fontWeight: 500, 
                    fontSize: '14px',
                    textTransform: 'none',
                    width: '45%',
                    '&:hover': {
                      backgroundColor: '#7d37a7'
                    }
                  }}
                  onClick={() => onClickAction(course)}
                >
                  {actionButtonLabel}
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  sx={{ 
                    padding: '8px 16px',
                    borderRadius: '8px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    fontWeight: 500, 
                    fontSize: '14px',
                    textTransform: 'none',
                    width: '45%',
                    '&:hover': {
                      backgroundColor: '#c82333'
                    }
                  }}
                  onClick={() => handleDeleteCourse(course.courseId)}
                >
                  Deletar
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  return (
    <>
      <Box
        sx={{
          p: 4,
          maxWidth: "1200px",
          margin: "0 auto",
          backgroundColor: "#f9f9f9",
          borderRadius: "12px",
          boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Topbar />
       
        <Box sx={{ display: "flex", justifyContent: "center", mt: 8, mb: 3 }}>
          <Button
            variant="contained"
            sx={{
              px: 4,
              py: 1.5,
              fontWeight: 500, 
              fontSize: "14px", 
              backgroundColor: "#9041c1",
              color: "white",
              borderRadius: "8px",
              textTransform: "none",
              '&:hover': {
                backgroundColor: "#7d37a7"
              }
            }}
            onClick={handleCreateNewCourse}
          >
            Criar Novo Curso
          </Button>
        </Box>

        <Paper
          sx={{
            p: 2,
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
          }}
        >
          <Box>
            <Typography
              variant="h6"
              sx={{ 
                mb: 2, 
                fontWeight: "bold", 
                textAlign: "center",
                color: "#333",
                fontSize: "1.25rem" 
              }}
            >
              Cursos Disponíveis
            </Typography>
            {renderCourses(courses, "Editar Curso", handleEditCourse)}
          </Box>
        </Paper>
      </Box>
      
      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        aria-labelledby="delete-modal-title"
      >
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 400,
          bgcolor: 'background.paper',
          borderRadius: 2,
          boxShadow: 24,
          p: 4,
          textAlign: 'center'
        }}>
          <WarningIcon sx={{ 
            fontSize: 60, 
            color: '#dc3545',
            mb: 2
          }} />
          
          <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
            Tem certeza que deseja deletar esse curso?
          </Typography>
          
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => setDeleteModalOpen(false)}
              sx={{
                color: '#666',
                borderColor: '#666',
                '&:hover': {
                  borderColor: '#444',
                }
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={confirmDeleteCourse}
              sx={{
                backgroundColor: '#dc3545',
                '&:hover': {
                  backgroundColor: '#c82333'
                }
              }}
            >
              Deletar
            </Button>
          </Box>
        </Box>
      </Modal>
    </>
  );
};

export default ManageMyCourses;
