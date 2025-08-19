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
  Modal,
  CircularProgress
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import Topbar from "$components/topbar/Topbar";
import { useAuth } from "$context/AuthContext";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import WarningIcon from "@mui/icons-material/Warning";
import { 
  loadTeacherCourses,
  deleteTeacherCourse,
  searchTeacherCourses,
  canCreateCourses,
  canManageCourses
} from "$api/services/courses/manageMyCourses";

const ManageMyCourses = () => {
  // Estados existentes
  const [courses, setCourses] = useState([]);
  const [teacherCourses, setTeacherCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canCreateCourse, setCanCreateCourse] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState(null);
  const { userDetails } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const loadCourses = async () => {
      setLoading(true);
      try {
        if (userDetails?.userId) {
          // Verificar permissões
          const hasPermission = await canManageCourses(userDetails);
          if (!hasPermission) {
            toast.error("Você não tem permissão para gerenciar cursos");
            navigate("/dashboard");
            return;
          }
          
          // Carregar cursos criados pelo professor
          const createdCoursesData = await loadTeacherCourses(userDetails.userId);
          
          // Inicializar array para todos os cursos
          let allCourses = [...createdCoursesData];
          
          // Adicionar cursos onde o usuário é professor, se existirem
          if (userDetails.coursesTeacher) {
            // Obter IDs dos cursos onde o usuário é professor
            const teacherCourseIds = Object.keys(userDetails.coursesTeacher);
            
            // Carregar detalhes desses cursos
            const teacherCoursesPromises = teacherCourseIds.map(async (courseId) => {
              try {
                const courseDetails = await import("$api/services/courses/courses")
                  .then(module => module.fetchCourseDetails(courseId));
                
                if (courseDetails) {
                  return {
                    courseId,
                    ...courseDetails,
                    isTeacherOnly: true // Marcar que é apenas professor, não criador
                  };
                }
                return null;
              } catch (error) {
                console.error(`Erro ao carregar curso ${courseId}:`, error);
                return null;
              }
            });
            
            const teacherCourses = (await Promise.all(teacherCoursesPromises))
              .filter(course => course !== null);
            
            // Adicionar cursos onde é professor à lista, evitando duplicatas
            teacherCourses.forEach(course => {
              if (!allCourses.some(c => c.courseId === course.courseId)) {
                allCourses.push(course);
              }
            });
          }
          
          setCourses(allCourses);
          setFilteredCourses(allCourses);
        }
      } catch (error) {
        console.error("Erro ao carregar cursos:", error);
        toast.error("Erro ao carregar os cursos");
        setCourses([]);
        setFilteredCourses([]);
      } finally {
        setLoading(false);
      }
    };
  
    loadCourses();
  }, [userDetails, navigate]);

  const handleSearch = (searchTerm) => {
    // Utiliza a função do serviço para filtrar cursos
    setFilteredCourses(searchTeacherCourses(courses, searchTerm));
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Funções existentes (handleEditCourse, handleCreateNewCourse, etc.)

  const handleEditCourse = (course) => {
    navigate(`/adm-cursos?courseId=${course.courseId}`);
  };

  const handleCreateNewCourse = () => {
    navigate(`/adm-cursos`);
  };

  const handleDeleteCourse = (courseId) => {
    setCourseToDelete(courseId);
    setDeleteModalOpen(true);
  };

  const confirmDeleteCourse = async () => {
    try {
      const courseId = courseToDelete;
      if (!courseId) return;

      // Utiliza a função do serviço para deletar o curso
      const result = await deleteTeacherCourse(courseId);
      
      if (result.success) {
        // Atualiza a lista de cursos localmente
        setCourses((prevCourses) =>
          prevCourses.filter((course) => course.courseId !== courseId)
        );
        setFilteredCourses((prevCourses) =>
          prevCourses.filter((course) => course.courseId !== courseId)
        );
        toast.success(result.message || "Curso deletado com sucesso");
      } else {
        toast.error(result.message || "Erro ao deletar o curso");
      }
      
      setDeleteModalOpen(false);
      setCourseToDelete(null);
    } catch (error) {
      console.error("Erro ao deletar curso:", error);
      toast.error("Erro ao deletar o curso");
      setDeleteModalOpen(false);
      setCourseToDelete(null);
    }
  };

  const renderCourses = (courses, actionButtonLabel, onClickAction) => {
    if (loading) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress color="secondary" />
        </Box>
      );
    }
    
    if (courses.length === 0) {
      return (
        <Typography variant="body1" color="textSecondary" sx={{ textAlign: "center", py: 4 }}>
          Nenhum curso encontrado.
        </Typography>
      );
    }

    return (
      <Grid container spacing={2}>
        {courses.map((course) => (
          <Grid item xs={12} sm={6} md={4} key={course.courseId}>
            <Card
              sx={{
                backgroundColor: "#ffffff",
                boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
                borderRadius: "16px",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                transition: "transform 0.2s ease-in-out",
                "&:hover": {
                  transform: "scale(1.02)",
                  boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.2)",
                },
              }}
            >
              <CardContent sx={{ flex: 1 }}>
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: "bold",
                    textAlign: "center",
                    mb: 1,
                    color: "#333",
                    fontSize: { xs: "0.9rem", sm: "1rem" },
                  }}
                >
                  {course.title || "Título do Curso"}
                </Typography>
                <Typography
                  variant="body2"
                  color="textSecondary"
                  sx={{
                    mb: 1,
                    fontSize: { xs: "0.8rem", sm: "0.875rem" },
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {course.description || "Descrição do curso"}
                </Typography>
              </CardContent>
              <CardActions
                sx={{
                  p: { xs: 1, sm: 2 },
                  justifyContent: "center",
                  mt: "auto",
                  gap: { xs: 1, sm: 2 },
                  flexWrap: "wrap",
                  flexWrap: "wrap",
                }}
              >
                <Button
                  variant="contained"
                  sx={{
                    backgroundColor: "#9041c1",
                    color: "white",
                    borderRadius: "12px",
                    "&:hover": { backgroundColor: "#7d37a7" },
                    textTransform: "none",
                    fontWeight: 500,
                    fontSize: { xs: "0.75rem", sm: "0.875rem", md: "1rem" },
                    px: { xs: 1, sm: 2 },
                    py: { xs: 0.5, sm: 1 },
                    minWidth: { xs: "80px", sm: "100px", md: "120px" },
                    width: { xs: "45%", sm: "auto" },
                    fontSize: { xs: "0.75rem", sm: "0.875rem", md: "1rem" },
                    px: { xs: 1, sm: 2 },
                    py: { xs: 0.5, sm: 1 },
                    minWidth: { xs: "80px", sm: "100px", md: "120px" },
                    width: { xs: "45%", sm: "auto" },
                  }}
                  onClick={() => onClickAction(course)}
                >
                  {actionButtonLabel}
                </Button>
                {course.isOwner && allowDelete && (
                  <Button
                    variant="contained"
                    sx={{
                      backgroundColor: "#dc3545",
                      color: "white",
                      borderRadius: "12px",
                      "&:hover": { backgroundColor: "#c82333" },
                      textTransform: "none",
                      fontWeight: 500,
                      fontSize: { xs: "0.75rem", sm: "0.875rem", md: "1rem" },
                      px: { xs: 1, sm: 2 },
                      py: { xs: 0.5, sm: 1 },
                      minWidth: { xs: "80px", sm: "100px", md: "120px" },
                      width: { xs: "45%", sm: "auto" },
                    }}
                    onClick={() => handleDeleteCourse(course.courseId)}
                  >
                    Deletar
                  </Button>
                )}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  useEffect(() => {
    const canCreate = canCreateCourses(userDetails);
    setCanCreateCourse(canCreate)
  }, [userDetails]);

  return (
    <Box
      sx={{
        minHeight: "calc(100vh - 64px)",
        backgroundColor: "#F5F5FA",
        pt: { xs: 8, sm: 10 },
        pb: { xs: 1, sm: 2 },
        px: { xs: 1, sm: 2 },
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Topbar onSearch={handleSearch} />

      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          mt: { xs: 3, sm: 3 },
          mb: { xs: 2, sm: 3 },
        }}
      >
        {canCreateCourse && <Button
          variant="contained"
          sx={{
            px: { xs: 2, sm: 4 },
            py: { xs: 1, sm: 1.5 },
            fontWeight: 500,
            fontSize: { xs: "0.75rem", sm: "0.875rem", md: "1rem" },
            backgroundColor: "#9041c1",
            color: "white",
            borderRadius: "12px",
            textTransform: "none",
            "&:hover": { backgroundColor: "#7d37a7" },
            minWidth: { xs: "120px", sm: "160px" },
          }}
          onClick={handleCreateNewCourse}
        >
          Criar Novo Curso
        </Button>}
      </Box>

      <Paper
        sx={{
          p: { xs: 1, sm: 2 },
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
          width: "100%",
          maxWidth: { xs: "calc(100% - 16px)", sm: "1200px" },
        }}
      >
        {showTabs ? (
          <>
            {renderTabs()}
            <Box sx={{ p: { xs: 1, sm: 2 } }}>
              {renderTabContent()}
            </Box>
          </>
        ) : (
          <Box sx={{ p: { xs: 1, sm: 2 } }}>
            <Typography variant="body1" color="textSecondary" align="center">
              Você não tem permissão para acessar esta página.
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Modal existente para confirmação de exclusão */}
      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        aria-labelledby="delete-modal-title"
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: { xs: "90%", sm: 400 },
            bgcolor: "background.paper",
            borderRadius: "16px",
            boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.2)",
            p: { xs: 2, sm: 4 },
            textAlign: "center",
          }}
        >
          <WarningIcon
            sx={{ fontSize: { xs: 40, sm: 60 }, color: "#dc3545", mb: 2 }}
          />
          <Typography
            variant="h6"
            component="h2"
            sx={{
              mb: 2,
              color: "#333",
              fontSize: { xs: "1rem", sm: "1.25rem" },
            }}
          >
            Tem certeza que deseja deletar esse curso?
          </Typography>
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              gap: { xs: 1, sm: 2 },
              flexWrap: "wrap",
            }}
          >
            <Button
              variant="outlined"
              onClick={() => setDeleteModalOpen(false)}
              sx={{
                color: "#666",
                borderColor: "#666",
                borderRadius: "12px",
                "&:hover": { borderColor: "#444", backgroundColor: "#f5f5f5" },
                textTransform: "none",
                fontWeight: 500,
                fontSize: { xs: "0.75rem", sm: "0.875rem", md: "1rem" },
                px: { xs: 1, sm: 2 },
                py: { xs: 0.5, sm: 1 },
                width: { xs: "45%", sm: "auto" },
                minWidth: { xs: "80px", sm: "100px" },
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={confirmDeleteCourse}
              sx={{
                backgroundColor: "#dc3545",
                "&:hover": { backgroundColor: "#c82333" },
                borderRadius: "12px",
                textTransform: "none",
                fontWeight: 500,
                fontSize: { xs: "0.75rem", sm: "0.875rem", md: "1rem" },
                px: { xs: 1, sm: 2 },
                py: { xs: 0.5, sm: 1 },
                width: { xs: "45%", sm: "auto" },
                minWidth: { xs: "80px", sm: "100px" },
              }}
            >
              Deletar
            </Button>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
};

export default ManageMyCourses;