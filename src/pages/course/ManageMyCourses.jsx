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
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import Topbar from "../../components/topbar/Topbar";
import { ref, get, remove } from "firebase/database";
import { database } from "../../service/firebase.jsx"; 
import { useAuth } from "../../context/AuthContext";

const ManageMyCourses = () => {
  const [courses, setCourses] = useState([]);
  const { userDetails } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const loadCourses = async () => {
      try {
        const coursesRef = ref(database, "courses");
        const snapshot = await get(coursesRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          const coursesData = Object.entries(data).map(([courseId, course]) => ({
            courseId,
            ...course,
          }));
          setCourses(coursesData);
        } else {
          console.log("Nenhum curso encontrado.");
        }
      } catch (error) {
        console.error("Erro ao carregar cursos:", error);
      }
    };

    loadCourses();
  }, []);

  const handleEditCourse = (course) => {
    navigate(`/adm-cursos?courseId=${course.courseId}`);
  };

  const handleCreateNewCourse = () => {
    navigate(`/adm-cursos`);
  };

  const handleDeleteCourse = async (courseId) => {
    let response = window.confirm("deseja realmente deletar?")

    if(response) {
      try {
        const courseRef = ref(database, `courses/${courseId}`);
        await remove(courseRef);
        setCourses(courses.filter((course) => course.courseId !== courseId));
        console.log("Curso deletado com sucesso!");
      } catch (error) {
        console.error("Erro ao deletar curso:", error);
      }
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
  );
};

export default ManageMyCourses;
