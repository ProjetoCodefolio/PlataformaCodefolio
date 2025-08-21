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
  CircularProgress, // Adicionando a importação que faltava
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import Topbar from "$components/topbar/Topbar";
import { useAuth } from "$context/AuthContext";
import LockIcon from "@mui/icons-material/Lock";
import PinAccessModal from "$components/modals/PinAccessModal";
import { filterCoursesBySearchTerm } from "$api/services/courses/courses";
import {
  fetchCategorizedCourses,
  courseRequiresPin,
} from "$api/services/courses/list";

const MyCourses = () => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [inProgressCourses, setInProgressCourses] = useState([]);
  const [completedCourses, setCompletedCourses] = useState([]);
  const [filteredAvailableCourses, setFilteredAvailableCourses] = useState([]);
  const [filteredInProgressCourses, setFilteredInProgressCourses] = useState([]);
  const [filteredCompletedCourses, setFilteredCompletedCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const { userDetails } = useAuth();
  const navigate = useNavigate();

  // Efeito para carregar cursos ao iniciar
  useEffect(() => {
    const loadCourses = async () => {
      setLoading(true);
      try {
        const userId = userDetails?.userId || null;
        const coursesData = await fetchCategorizedCourses(userId);

        // Atualizar estados com os dados obtidos
        setAvailableCourses(coursesData.availableCourses);
        setInProgressCourses(coursesData.inProgressCourses);
        setCompletedCourses(coursesData.completedCourses);

        // Inicializar os filtrados com todos os cursos
        setFilteredAvailableCourses(coursesData.availableCourses);
        setFilteredInProgressCourses(coursesData.inProgressCourses);
        setFilteredCompletedCourses(coursesData.completedCourses);
      } catch (error) {
        console.error("Erro ao carregar cursos:", error);
        // Aqui poderia exibir uma mensagem de erro para o usuário
      } finally {
        setLoading(false);
      }
    };

    loadCourses();
  }, [userDetails]);

  // Manipulador para mudança de aba
  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  // Manipulador para busca
  const handleSearch = (searchTerm) => {
    // Filtrar localmente usando a função importada
    setFilteredAvailableCourses(
      filterCoursesBySearchTerm(availableCourses, searchTerm)
    );
    setFilteredInProgressCourses(
      filterCoursesBySearchTerm(inProgressCourses, searchTerm)
    );
    setFilteredCompletedCourses(
      filterCoursesBySearchTerm(completedCourses, searchTerm)
    );
  };

  // Manipulador para iniciar um curso
  const handleStartCourse = (course) => {
    if (courseRequiresPin(course)) {
      setSelectedCourse(course);
      setShowPinModal(true);
    } else {
      navigate(`/classes?courseId=${course.courseId}`);
    }
  };

  // Manipulador para submissão de PIN
  const handlePinSubmit = (course) => {
    navigate(`/classes?courseId=${course.courseId}`);
  };

  // Manipulador para continuar um curso
  const handleContinueCourse = (course) => {
    navigate(`/classes?courseId=${course.courseId}`);
  };

  // Manipulador para visualizar um curso concluído
  const handleViewCourse = (course) => {
    navigate(`/classes?courseId=${course.courseId}`);
  };

  // Função para renderizar lista de cursos
  const renderCourses = (courses, actionButtonLabel, onClickAction) => {
    if (!courses || courses.length === 0) {
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
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mb: 1,
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: "bold",
                      textAlign: "center",
                      color: "#333",
                      fontSize: { xs: "0.9rem", sm: "1rem" },
                    }}
                  >
                    {course.title || "Título do Curso"}
                  </Typography>
                  {course.pinEnabled && (
                    <LockIcon
                      sx={{
                        color: "#9041c1",
                        ml: 1,
                        fontSize: { xs: "1rem", sm: "1.2rem" },
                      }}
                    />
                  )}
                </Box>
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
                <Typography
                  variant="body2"
                  color="textSecondary"
                  sx={{
                    mt: 1,
                    fontSize: { xs: "0.8rem", sm: "0.875rem" },
                  }}
                >
                  Progresso: {(course.progress || 0).toFixed(2)}%
                </Typography>
              </CardContent>
              <CardActions sx={{ p: 2, justifyContent: "center", mt: "auto" }}>
                <Button
                  variant="contained"
                  sx={{
                    backgroundColor: "#9041c1",
                    color: "white",
                    borderRadius: "8px",
                    "&:hover": { backgroundColor: "#7d37a7" },
                    textTransform: "none",
                    fontWeight: "bold",
                    fontSize: { xs: "12px", sm: "14px" },
                    padding: "6px 10px",
                    width: "calc(100% - 16px)",
                  }}
                  onClick={() => onClickAction(course)}
                >
                  {actionButtonLabel}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  // Renderização do componente
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
      <Box sx={{ height: { xs: "16px", sm: "24px" } }} />

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
        <Tabs
          value={selectedTab}
          onChange={handleTabChange}
          textColor="inherit"
          centered
          // variant="scrollable" // Valor estático em vez de objeto
          scrollButtons="auto" // Valor estático em vez de objeto
          sx={{
            mb: { xs: 2, sm: 4 },
            "& .MuiTab-root": {
              fontWeight: "bold",
              color: "#666",
              "&.Mui-selected": { color: "#9041c1" },
              fontSize: { xs: "0.7rem", sm: "1rem" },
              padding: { xs: "8px 8px", sm: "12px 16px" },
              minWidth: { xs: "90px", sm: "auto" },
              whiteSpace: { xs: "normal", sm: "nowrap" },
              wordBreak: { xs: "break-word", sm: "normal" },
              textAlign: "center",
            },
            "& .MuiTabs-indicator": { backgroundColor: "#9041c1" },
          }}
        >
          <Tab label="Disponíveis" />
          <Tab label="Em Andamento" />
          <Tab label="Concluídos" />
        </Tabs>

        {loading ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <CircularProgress color="secondary" />
            <Typography variant="body1" sx={{ mt: 2, color: "#888" }}>
              Carregando cursos...
            </Typography>
          </Box>
        ) : (
          <>
            {selectedTab === 0 && (
              <Box sx={{ p: { xs: 1, sm: 2 } }}>
                {renderCourses(
                  filteredAvailableCourses,
                  "Começar",
                  handleStartCourse
                )}
              </Box>
            )}
            {selectedTab === 1 && (
              <Box sx={{ p: { xs: 1, sm: 2 } }}>
                {renderCourses(
                  filteredInProgressCourses,
                  "Continuar",
                  handleContinueCourse
                )}
              </Box>
            )}
            {selectedTab === 2 && (
              <Box sx={{ p: { xs: 1, sm: 2 } }}>
                {renderCourses(
                  filteredCompletedCourses,
                  "Ver Curso",
                  handleViewCourse
                )}
              </Box>
            )}
          </>
        )}
      </Paper>

      <PinAccessModal
        open={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSubmit={handlePinSubmit}
        selectedCourse={selectedCourse}
      />
    </Box>
  );
};

export default MyCourses;
