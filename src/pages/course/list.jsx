import React, { useState } from "react";
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
import Topbar from "../../components/topbar/Topbar";

const MyCourses = () => {
  const [selectedTab, setSelectedTab] = useState(0);

  // Cursos simulados
  const completedCourses = [
    {
      id: 1,
      title: "JavaScript Básico",
      description: "Curso introdutório sobre JavaScript.",
    },
    {
      id: 2,
      title: "HTML e CSS",
      description: "Aprenda a criar sites do zero.",
    },
  ];

  const inProgressCourses = [
    {
      id: 3,
      title: "React Avançado",
      description: "Domine a criação de SPAs com React.",
    },
  ];

  const availableCourses = [
    {
      id: 4,
      title: "Node.js para Iniciantes",
      description: "Construa APIs com Node.js.",
    },
    {
      id: 5,
      title: "Python para Data Science",
      description: "Explore dados com Python.",
    },
  ];

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
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
            <Grid item xs={12} sm={6} md={4} key={course.id}>
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
                    {course.title}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {course.description}
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
          <Tab label="Concluídos" />
          <Tab label="Em Andamento" />
          <Tab label="Disponíveis" />
        </Tabs>

        {/* Conteúdo baseado na aba selecionada */}
        {selectedTab === 0 && (
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
              Cursos Concluídos
            </Typography>
            {renderCourses(completedCourses, "Ver Certificado", (course) =>
              alert(`Certificado de: ${course.title}`)
            )}
          </Box>
        )}
        {selectedTab === 1 && (
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
              Cursos em Andamento
            </Typography>
            {renderCourses(inProgressCourses, "Continuar", (course) =>
              alert(`Continuar curso: ${course.title}`)
            )}
          </Box>
        )}
        {selectedTab === 2 && (
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
              Todos os Cursos Disponíveis
            </Typography>
            {renderCourses(availableCourses, "Inscrever-se", (course) =>
              alert(`Inscrever-se no curso: ${course.title}`)
            )}
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default MyCourses;
