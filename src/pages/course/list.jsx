import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Card,
  CardContent,
  CardActions,
  Button,
  Grid,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import Topbar from "../../components/topbar/Topbar";
import {
  fetchInProgressCourses,
  fetchCompletedCourses,
} from "../../service/courses";
import { useAuth } from "../../context/AuthContext";

const MyCourses = () => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [inProgressCourses, setInProgressCourses] = useState([]);
  const [completedCourses, setCompletedCourses] = useState([]);
  const { userDetails } = useAuth();
  const navigate = useNavigate(); // Inicializa o hook useNavigate

  useEffect(() => {
    const loadCourses = async () => {
      try {
        const inProgress = await fetchInProgressCourses(userDetails.userId);
        const completed = await fetchCompletedCourses(userDetails.userId);

        setInProgressCourses(inProgress);
        setCompletedCourses(completed);
      } catch (error) {
        console.error("Erro ao carregar cursos:", error);
      }
    };

    loadCourses();
  }, [userDetails.userId]);

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const handleContinueCourse = (course) => {
    navigate(`/classes?courseId=${course.courseId}`);
  };

  const renderCourses = (courses, actionButtonLabel, onClickAction) => {
    if (courses.length === 0) {
      return <Typography variant="body1">Nenhum curso encontrado.</Typography>;
    }

    return (
      <>
        <Topbar />
        <Grid container spacing={3}>
          {courses.map((course) => (
            <Grid item xs={12} sm={6} md={4} key={course.courseId}>
              <Card
                sx={{
                  backgroundColor: "#ffffff",
                  boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
                  borderRadius: "8px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  height: "100%",
                }}
              >
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>
                    {course.title || "Título do Curso"}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {course.description || "Descrição do curso"}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Progresso: {course.progress || 0}%
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    variant="contained"
                    color="primary"
                    onClick={() => onClickAction(course)}
                  >
                    {actionButtonLabel}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </>
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
      <Typography
        variant="h4"
        sx={{
          mb: 4,
          fontWeight: "bold",
          textAlign: "center",
          color: "#333",
        }}
      >
        Meus Cursos
      </Typography>

      <Paper
        sx={{
          p: 2,
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Tabs
          value={selectedTab}
          onChange={handleTabChange}
          textColor="primary"
          indicatorColor="primary"
          centered
          sx={{
            mb: 4,
            "& .MuiTab-root": { fontWeight: "bold" },
          }}
        >
          <Tab label="Em Andamento" />
          <Tab label="Concluídos" />
        </Tabs>

        {selectedTab === 0 && (
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
              Cursos em Andamento
            </Typography>
            {renderCourses(
              inProgressCourses,
              "Continuar",
              handleContinueCourse
            )}
          </Box>
        )}

        {selectedTab === 1 && (
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
              Cursos Concluídos
            </Typography>
            {renderCourses(completedCourses, "Ver Certificado", (course) =>
              alert(`Certificado de: ${course.title}`)
            )}
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default MyCourses;
