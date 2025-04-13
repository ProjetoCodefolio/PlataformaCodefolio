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
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import Topbar from "../../components/topbar/Topbar";
import { ref, get, update, remove } from "firebase/database";
import { database } from "../../service/firebase.jsx";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import WarningIcon from "@mui/icons-material/Warning";
import { hasCourseVideos, hasCourseMaterials, hasCourseQuizzes } from "../../utils/courseUtils";

const ManageMyCourses = () => {
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const { userDetails } = useAuth();
  const navigate = useNavigate();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState(null);

  useEffect(() => {
    const loadCourses = async () => {
      try {
        if (!userDetails?.userId) {
          return;
        }

        const coursesRef = ref(database, "courses");
        const snapshot = await get(coursesRef);

        if (snapshot.exists()) {
          const data = snapshot.val();
          const coursesData = Object.entries(data)
            .map(([courseId, course]) => ({
              courseId,
              ...course,
            }))
            .filter((course) => course.userId === userDetails.userId);

          setCourses(coursesData);
          setFilteredCourses(coursesData);
        } else {
          setCourses([]);
          setFilteredCourses([]);
        }
      } catch (error) {
        toast.error("Erro ao carregar os cursos");
        setCourses([]);
        setFilteredCourses([]);
      }
    };

    loadCourses();
  }, [userDetails]);

  const handleSearch = (searchTerm) => {
    const term = searchTerm.toLowerCase();
    setFilteredCourses(
      courses.filter(
        (course) =>
          course.title.toLowerCase().includes(term) ||
          course.description.toLowerCase().includes(term)
      )
    );
  };

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


      const [videos, materials, quizzes] = await Promise.all([
        hasCourseVideos(courseId),
        hasCourseMaterials(courseId),
        hasCourseQuizzes(courseId),
      ]);

      if (videos.length > 0 || materials.length > 0 || quizzes.length > 0) {
        toast.error(
          "Não é possível deletar o curso pois existem vídeos, materiais ou quizzes associados a ele."
        );
        setDeleteModalOpen(false);
        setCourseToDelete(null);
        return;
      }

      // Deleta o curso da tabela courses
      await remove(ref(database, `courses/${courseId}`));

      // Deleta o curso da tabela studentCourses para todos os usuários
      const studentCoursesRef = ref(database, `studentCourses`);
      const studentCoursesSnapshot = await get(studentCoursesRef);
      const studentCoursesData = studentCoursesSnapshot.val();

      if (studentCoursesData) {
        const updates = {};
        Object.keys(studentCoursesData).forEach(userId => {
          if (studentCoursesData[userId][courseId]) {
            updates[`studentCourses/${userId}/${courseId}`] = null;
          }
        });
        await update(ref(database), updates);
      }

      // Deleta o curso da tabela videoProgress para todos os usuários
      const videoProgressRef = ref(database, `videoProgress`);
      const videoProgressSnapshot = await get(videoProgressRef);
      const videoProgressData = videoProgressSnapshot.val();

      if (videoProgressData) {
        const updates = {};
        Object.keys(videoProgressData).forEach(userId => {
          if (videoProgressData[userId][courseId]) {
            updates[`videoProgress/${userId}/${courseId}`] = null;
          }
        });
        await update(ref(database), updates);
      }

      setCourses((prevCourses) =>
        prevCourses.filter((course) => course.courseId !== courseId)
      );
      setFilteredCourses((prevCourses) =>
        prevCourses.filter((course) => course.courseId !== courseId)
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
      return (
        <Typography variant="body1" color="textSecondary">
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
                  flexWrap: "wrap", // Permite que os botões quebrem linha em telas pequenas
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
                    fontSize: { xs: "0.75rem", sm: "0.875rem", md: "1rem" }, // Reduz tamanho da fonte em telas menores
                    px: { xs: 1, sm: 2 }, // Padding horizontal ajustável
                    py: { xs: 0.5, sm: 1 }, // Padding vertical ajustável
                    minWidth: { xs: "80px", sm: "100px", md: "120px" }, // Tamanho mínimo ajustável
                    width: { xs: "45%", sm: "auto" }, // Largura relativa em telas pequenas
                  }}
                  onClick={() => onClickAction(course)}
                >
                  {actionButtonLabel}
                </Button>
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
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

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
        <Button
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
            minWidth: { xs: "120px", sm: "160px" }, // Ajuste mínimo
          }}
          onClick={handleCreateNewCourse}
        >
          Criar Novo Curso
        </Button>
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
        <Box sx={{ p: { xs: 1, sm: 2 } }}>
          {renderCourses(filteredCourses, "Gerenciar Curso", handleEditCourse)}
        </Box>
      </Paper>

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