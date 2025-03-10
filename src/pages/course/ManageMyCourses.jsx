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
import { ref, get, remove } from "firebase/database";
import { database } from "../../service/firebase.jsx";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import WarningIcon from "@mui/icons-material/Warning";

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
            .filter((course) => course.userId === userDetails.userId);

          console.log("Cursos carregados:", coursesData);
          setCourses(coursesData);
        } else {
          console.log("Nenhum curso encontrado.");
          setCourses([]);
        }
      } catch (error) {
        console.error("Erro ao carregar cursos:", error);
        toast.error("Erro ao carregar os cursos");
        setCourses([]);
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

      await remove(ref(database, `courses/${courseId}`));

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

      setCourses((prevCourses) => prevCourses.filter((course) => course.courseId !== courseId));
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
      return <Typography variant="body1" color="textSecondary">Nenhum curso encontrado.</Typography>;
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
    p: 2,
    justifyContent: "center",
    mt: "auto",
    gap: 2,
    display: "flex",
    flexDirection: "row", // Mantém os botões lado a lado no mobile
    alignItems: "center",
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
      fontSize: { xs: "12px", sm: "14px" },
      px: 2,
      py: 1,
      width: "auto", // Remove o 100% para manter lado a lado
      minWidth: "120px", // Mantém um tamanho mínimo para não ficarem muito pequenos
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
      fontSize: { xs: "12px", sm: "14px" },
      px: 2,
      py: 1,
      width: "auto", // Remove o 100% para manter lado a lado
      minWidth: "120px", // Mantém um tamanho mínimo
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
      <Topbar />

      <Box sx={{ display: "flex", justifyContent: "center", mt: { xs: 3, sm: 3 }, mb: { xs: 2, sm: 3 } }}>
        <Button
          variant="contained"
          sx={{
            px: { xs: 2, sm: 4 },
            py: { xs: 1, sm: 1.5 },
            fontWeight: 500,
            fontSize: { xs: "12px", sm: "14px" },
            backgroundColor: "#9041c1",
            color: "white",
            borderRadius: "12px",
            textTransform: "none",
            "&:hover": { backgroundColor: "#7d37a7" },
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
        <Box sx={{ p: { xs: 1, sm: 2 } }}>{renderCourses(courses, "Editar Curso", handleEditCourse)}</Box>
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
          <WarningIcon sx={{ fontSize: { xs: 40, sm: 60 }, color: "#dc3545", mb: 2 }} />
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
          <Box sx={{ display: "flex", justifyContent: "center", gap: 2, flexWrap: "wrap" }}>
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
                fontSize: { xs: "12px", sm: "14px" },
                px: 2,
                py: 1,
                width: { xs: "100%", sm: "auto" },
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
                fontSize: { xs: "12px", sm: "14px" },
                px: 2,
                py: 1,
                width: { xs: "100%", sm: "auto" },
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