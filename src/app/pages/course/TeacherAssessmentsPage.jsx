import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
} from "@mui/material";
import {
  Assignment as AssignmentIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  School as SchoolIcon,
  TrendingUp as TrendingUpIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "$context/AuthContext";
import Topbar from "$components/topbar/Topbar";
import * as assessmentService from "$api/services/courses/assessments";
import * as courseService from "$api/services/courses/courses";
import { loadTeacherCourses } from "$api/services/courses/manageMyCourses";
import { toast } from "react-toastify";

const TeacherAssessmentsPage = () => {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState(0);
  
  // Estados para criar/editar avaliação
  const [showAssessmentDialog, setShowAssessmentDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentAssessmentId, setCurrentAssessmentId] = useState(null);
  const [assessmentName, setAssessmentName] = useState("");
  const [assessmentPercentage, setAssessmentPercentage] = useState("");

  const { userDetails } = useAuth();
  const navigate = useNavigate();

  // Carregar cursos do professor
  useEffect(() => {
    const loadCourses = async () => {
      try {
        setLoading(true);
        if (userDetails?.userId) {
          let teacherCourses = [];
          
          // Se for admin, buscar todos os cursos
          if (userDetails.role === "admin") {
            const allCourses = await courseService.fetchAllCourses();
            teacherCourses = allCourses;
          } else {
            // Se for professor, buscar apenas seus cursos
            teacherCourses = await loadTeacherCourses(userDetails.userId);
          }
          
          setCourses(teacherCourses);

          // Selecionar o primeiro curso por padrão
          if (teacherCourses.length > 0) {
            setSelectedCourse(teacherCourses[0]);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar cursos:", error);
        toast.error("Erro ao carregar cursos");
      } finally {
        setLoading(false);
      }
    };

    loadCourses();
  }, [userDetails]);

  // Carregar avaliações quando selecionar um curso
  useEffect(() => {
    if (selectedCourse) {
      loadAssessments();
    }
  }, [selectedCourse]);

  const loadAssessments = async () => {
    if (!selectedCourse) return;

    try {
      setLoading(true);
      const assessmentsData = await assessmentService.fetchAllAssessmentsByCourse(
        selectedCourse.courseId
      );
      setAssessments(assessmentsData);
    } catch (error) {
      console.error("Erro ao carregar avaliações:", error);
      toast.error("Erro ao carregar avaliações");
    } finally {
      setLoading(false);
    }
  };

  // Filtrar cursos por busca
  const filteredCourses = courses.filter((course) =>
    course.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Navegar para atribuir notas
  const handleAssignGrades = (assessment) => {
    navigate(
      `/course/grade-assignment?courseId=${selectedCourse.courseId}&assessmentId=${assessment.id}`
    );
  };

  // Navegar para ver notas gerais
  const handleViewGrades = () => {
    navigate(`/course/grades?courseId=${selectedCourse.courseId}`);
  };

  // Abrir diálogo para criar nova avaliação
  const handleCreateAssessment = () => {
    setIsEditing(false);
    setAssessmentName("");
    setAssessmentPercentage("");
    setCurrentAssessmentId(null);
    setShowAssessmentDialog(true);
  };

  // Abrir diálogo para editar avaliação
  const handleEditAssessment = (assessment) => {
    setIsEditing(true);
    setAssessmentName(assessment.name);
    setAssessmentPercentage(assessment.percentage.toString());
    setCurrentAssessmentId(assessment.id);
    setShowAssessmentDialog(true);
  };

  // Salvar avaliação (criar ou editar)
  const handleSaveAssessment = async () => {
    if (!assessmentName.trim()) {
      toast.error("Nome da avaliação é obrigatório");
      return;
    }

    if (
      !assessmentPercentage.trim() ||
      isNaN(assessmentPercentage) ||
      Number(assessmentPercentage) <= 0 ||
      Number(assessmentPercentage) > 100
    ) {
      toast.error("O percentual deve ser um valor entre 1 e 100");
      return;
    }

    try {
      if (isEditing) {
        await assessmentService.updateAssessment(
          selectedCourse.courseId,
          currentAssessmentId,
          {
            name: assessmentName,
            percentage: Number(assessmentPercentage),
          }
        );
        toast.success("Avaliação atualizada com sucesso!");
      } else {
        await assessmentService.createAssessment(selectedCourse.courseId, {
          name: assessmentName,
          percentage: Number(assessmentPercentage),
        });
        toast.success("Avaliação criada com sucesso!");
      }

      setShowAssessmentDialog(false);
      loadAssessments();
    } catch (error) {
      console.error("Erro ao salvar avaliação:", error);
      toast.error("Erro ao salvar avaliação");
    }
  };

  // Deletar avaliação
  const handleDeleteAssessment = async (assessmentId) => {
    if (!window.confirm("Tem certeza que deseja excluir esta avaliação?")) {
      return;
    }

    try {
      await assessmentService.deleteAssessment(
        selectedCourse.courseId,
        assessmentId
      );
      toast.success("Avaliação excluída com sucesso!");
      loadAssessments();
    } catch (error) {
      console.error("Erro ao excluir avaliação:", error);
      toast.error("Erro ao excluir avaliação");
    }
  };

  // Calcular total de percentuais
  const totalPercentage = assessments.reduce(
    (total, assessment) => total + assessment.percentage,
    0
  );

  if (loading && courses.length === 0) {
    return (
      <Box>
        <Topbar hideSearch={true} />
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "calc(100vh - 64px)",
          }}
        >
          <CircularProgress sx={{ color: "#9041c1" }} />
        </Box>
      </Box>
    );
  }

  if (courses.length === 0) {
    return (
      <Box>
        <Topbar hideSearch={true} />
        <Box sx={{ p: 3 }}>
          <Alert severity="info">
            Você não possui cursos cadastrados. Crie um curso para começar a
            gerenciar avaliações.
          </Alert>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Topbar hideSearch={true} />
      <Box
        sx={{
          p: { xs: 2, sm: 3 },
          pt: { xs: 10, sm: 12 }, // Padding-top maior para compensar a topbar
          backgroundColor: "#f9f9f9",
          minHeight: "calc(100vh - 64px)",
        }}
      >
        {/* Cabeçalho */}
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="h4"
            sx={{ 
              fontWeight: "bold", 
              mb: 1, 
              color: "#333",
              fontSize: { xs: "1.5rem", sm: "2rem" } // Responsivo
            }}
          >
            Gerenciar Avaliações
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              color: "#666",
              fontSize: { xs: "0.875rem", sm: "1rem" } // Responsivo
            }}
          >
            Crie avaliações e atribua notas aos seus alunos
          </Typography>
        </Box>

        {/* Tabs para selecionar curso */}
        <Paper
          elevation={0}
          sx={{
            mb: 3,
            backgroundColor: "#fff",
            borderRadius: "12px",
            boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
            overflow: "hidden", // Para mobile
          }}
        >
          <Box sx={{ p: { xs: 1.5, sm: 2 }, borderBottom: "1px solid #e0e0e0" }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Buscar curso..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#9041c1", fontSize: { xs: "1.2rem", sm: "1.5rem" } }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  fontSize: { xs: "0.875rem", sm: "1rem" },
                  "& fieldset": { borderColor: "#9041c1" },
                  "&:hover fieldset": { borderColor: "#7d37a7" },
                  "&.Mui-focused fieldset": { borderColor: "#9041c1" },
                },
              }}
            />
          </Box>

          <Tabs
            value={selectedTab}
            onChange={(e, newValue) => {
              setSelectedTab(newValue);
              setSelectedCourse(filteredCourses[newValue]);
            }}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              "& .MuiTab-root": {
                color: "#666",
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
                minHeight: { xs: "48px", sm: "64px" },
                padding: { xs: "8px 12px", sm: "12px 16px" },
                "&.Mui-selected": { color: "#9041c1" },
              },
              "& .MuiTabs-indicator": { backgroundColor: "#9041c1" },
              "& .MuiSvgIcon-root": {
                fontSize: { xs: "1rem", sm: "1.25rem" }
              }
            }}
          >
            {filteredCourses.map((course, index) => (
              <Tab
                key={course.courseId}
                label={course.title}
                icon={<SchoolIcon fontSize="small" />}
                iconPosition="start"
              />
            ))}
          </Tabs>
        </Paper>

        {/* Botões de ação */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={4}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<AddIcon sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }} />}
              onClick={handleCreateAssessment}
              sx={{
                py: { xs: 1.2, sm: 1.5 },
                fontSize: { xs: "0.875rem", sm: "1rem" },
                backgroundColor: "#9041c1",
                "&:hover": { backgroundColor: "#7d37a7" },
              }}
            >
              Nova Avaliação
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<TrendingUpIcon sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }} />}
              onClick={handleViewGrades}
              disabled={assessments.length === 0}
              sx={{
                py: { xs: 1.2, sm: 1.5 },
                fontSize: { xs: "0.875rem", sm: "1rem" },
                borderColor: "#9041c1",
                color: "#9041c1",
                "&:hover": {
                  borderColor: "#7d37a7",
                  backgroundColor: "rgba(144, 65, 193, 0.04)",
                },
              }}
            >
              Ver Notas Gerais
            </Button>
          </Grid>
        </Grid>

        {/* Informação sobre percentuais */}
        {assessments.length > 0 && (
          <Paper
            elevation={0}
            sx={{
              p: { xs: 1.5, sm: 2 },
              mb: 3,
              backgroundColor: totalPercentage > 100 ? "#fff3e0" : "#e8f5e9",
              borderRadius: "12px",
              border: `1px solid ${totalPercentage > 100 ? "#ff9800" : "#4caf50"}`,
            }}
          >
            <Typography 
              variant="body2" 
              sx={{ 
                fontWeight: "bold",
                fontSize: { xs: "0.875rem", sm: "1rem" }
              }}
            >
              Total dos percentuais: {totalPercentage}%
            </Typography>
            {totalPercentage > 100 && (
              <Typography 
                variant="caption" 
                sx={{ 
                  color: "#f57c00",
                  fontSize: { xs: "0.75rem", sm: "0.875rem" }
                }}
              >
                Atenção: O total excede 100%
              </Typography>
            )}
          </Paper>
        )}

        {/* Lista de avaliações ou mensagem vazia */}
        {assessments.length === 0 ? (
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, sm: 4 },
              textAlign: "center",
              backgroundColor: "#fff",
              borderRadius: "12px",
              boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
            }}
          >
            <AssignmentIcon sx={{ fontSize: { xs: 50, sm: 60 }, color: "#9041c1", mb: 2 }} />
            <Typography variant="h6" sx={{ mb: 1, color: "#333", fontSize: { xs: "1rem", sm: "1.25rem" } }}>
              Nenhuma avaliação cadastrada
            </Typography>
            <Typography variant="body2" sx={{ color: "#666", mb: 3, fontSize: { xs: "0.875rem", sm: "1rem" } }}>
              Crie sua primeira avaliação para começar a atribuir notas
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateAssessment}
              sx={{
                backgroundColor: "#9041c1",
                "&:hover": { backgroundColor: "#7d37a7" },
                fontSize: { xs: "0.875rem", sm: "1rem" },
                py: { xs: 1, sm: 1.2 },
              }}
            >
              Criar Avaliação
            </Button>
          </Paper>
        ) : (
          <Grid container spacing={2}>
            {assessments.map((assessment) => (
              <Grid item xs={12} sm={6} md={4} key={assessment.id}>
                <Card
                  elevation={0}
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    borderRadius: "12px",
                    boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: "0px 4px 16px rgba(0, 0, 0, 0.15)",
                    },
                  }}
                >
                  <CardContent sx={{ flexGrow: 1, p: 2 }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 2,
                      }}
                    >
                      <Typography
                        variant="h6"
                        sx={{ 
                          fontWeight: "bold", 
                          color: "#333",
                          fontSize: { xs: "1rem", sm: "1.25rem" }
                        }}
                      >
                        {assessment.name}
                      </Typography>
                      <Chip
                        label={`${assessment.percentage}%`}
                        size="small"
                        sx={{
                          backgroundColor: "#9041c1",
                          color: "#fff",
                          fontWeight: "bold",
                          fontSize: { xs: "0.75rem", sm: "0.875rem" }
                        }}
                      />
                    </Box>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: "#666",
                        fontSize: { xs: "0.875rem", sm: "1rem" }
                      }}
                    >
                      {assessment.percentage}% da nota final
                    </Typography>
                  </CardContent>
                  <CardActions sx={{ p: 2, pt: 0, flexDirection: "column", gap: 1 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<AssignmentIcon sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }} />}
                      onClick={() => handleAssignGrades(assessment)}
                      sx={{
                        backgroundColor: "#4caf50",
                        "&:hover": { backgroundColor: "#388e3c" },
                        fontSize: { xs: "0.875rem", sm: "1rem" },
                        py: { xs: 0.8, sm: 1 },
                      }}
                    >
                      Atribuir Notas
                    </Button>
                    <Box sx={{ display: "flex", gap: 1, width: "100%", justifyContent: "center" }}>
                      <IconButton
                        size="small"
                        onClick={() => handleEditAssessment(assessment)}
                        sx={{ color: "#9041c1" }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteAssessment(assessment.id)}
                        sx={{ color: "#f44336" }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* Diálogo para criar/editar avaliação */}
      <Dialog
        open={showAssessmentDialog}
        onClose={() => setShowAssessmentDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {isEditing ? "Editar Avaliação" : "Nova Avaliação"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Nome da Avaliação"
              value={assessmentName}
              onChange={(e) => setAssessmentName(e.target.value)}
              placeholder="Ex: T1, A1, Projeto Final"
              sx={{ mb: 3 }}
            />
            <TextField
              fullWidth
              label="Percentual na Nota Final"
              type="number"
              value={assessmentPercentage}
              onChange={(e) => setAssessmentPercentage(e.target.value)}
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
              inputProps={{
                min: 1,
                max: 100,
                step: 1,
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setShowAssessmentDialog(false)}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveAssessment}
            sx={{
              backgroundColor: "#9041c1",
              "&:hover": { backgroundColor: "#7d37a7" },
            }}
          >
            {isEditing ? "Atualizar" : "Criar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeacherAssessmentsPage;
