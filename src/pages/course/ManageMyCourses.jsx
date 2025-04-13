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
  Tabs,
  Tab,
  Badge
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import Topbar from "../../components/topbar/Topbar";
import { ref, get, update, remove } from "firebase/database";
import { database } from "../../service/firebase.jsx";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import WarningIcon from "@mui/icons-material/Warning";
import CreateIcon from "@mui/icons-material/Create";
import SchoolIcon from "@mui/icons-material/School";
import { hasCourseVideos, hasCourseMaterials, hasCourseQuizzes } from "../../utils/courseUtils";

const ManageMyCourses = () => {
  // Estados existentes
  const [courses, setCourses] = useState([]);
  const [teacherCourses, setTeacherCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [filteredTeacherCourses, setFilteredTeacherCourses] = useState([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [showTabs, setShowTabs] = useState(false);
  const [showAdminTab, setShowAdminTab] = useState(false);
  const [showTeacherTab, setShowTeacherTab] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { userDetails } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!userDetails?.userId) {
          return;
        }

        // Verificar se o usuário é admin (para mostrar tab "Meus Cursos")
        const isAdmin = userDetails.role === "admin";
        setShowAdminTab(isAdmin);

        // Carregar todos os cursos do banco de dados
        const coursesRef = ref(database, "courses");
        const snapshot = await get(coursesRef);

        if (snapshot.exists()) {
          const data = snapshot.val();

          // 1. Filtrar cursos criados pelo usuário (apenas para admins)
          if (isAdmin) {
            const ownedCourses = Object.entries(data)
              .map(([courseId, course]) => ({
                courseId,
                ...course,
                isOwner: true
              }))
              .filter((course) => course.userId === userDetails.userId);

            setCourses(ownedCourses);
            setFilteredCourses(ownedCourses);
          } else {
            setCourses([]);
            setFilteredCourses([]);
          }

          // 2. Verificar se o usuário tem coursesTeacher
          const hasTeacherRoles = userDetails.coursesTeacher &&
            Object.keys(userDetails.coursesTeacher).length > 0;
          setShowTeacherTab(hasTeacherRoles);

          if (hasTeacherRoles) {
            // Filtrar cursos onde o usuário é professor
            const teacherCourseIds = Object.keys(userDetails.coursesTeacher);
            const teacherCoursesData = Object.entries(data)
              .map(([courseId, course]) => ({
                courseId,
                ...course,
                isOwner: false,
                isTeacher: true
              }))
              .filter((course) =>
                teacherCourseIds.includes(course.courseId) &&
                course.userId !== userDetails.userId
              );

            setTeacherCourses(teacherCoursesData);
            setFilteredTeacherCourses(teacherCoursesData);
          } else {
            setTeacherCourses([]);
            setFilteredTeacherCourses([]);
          }

          // Definir qual tab mostrar inicialmente baseado nas permissões
          if (isAdmin) {
            setTabValue(0); // Tab "Meus Cursos" (se disponível)
          } else if (hasTeacherRoles) {
            setTabValue(0); // Tab "Cursos que leciono" (será a única tab disponível)
          }

          // Mostrar o sistema de tabs somente se pelo menos uma tab estiver disponível
          setShowTabs(isAdmin || hasTeacherRoles);
        } else {
          // Não há cursos disponíveis
          resetAllCourseStates();
        }
      } catch (error) {
        console.error("Erro ao carregar os cursos:", error);
        toast.error("Erro ao carregar os cursos");
        resetAllCourseStates();
      }
    };

    const resetAllCourseStates = () => {
      setCourses([]);
      setFilteredCourses([]);
      setTeacherCourses([]);
      setFilteredTeacherCourses([]);
      setShowTabs(false);
    };

    loadData();
  }, [userDetails]);

  const handleSearch = (searchTerm) => {
    setSearchTerm(searchTerm);
    const term = searchTerm.toLowerCase();

    // Filtrar cursos do proprietário
    setFilteredCourses(
      courses.filter(
        (course) =>
          course.title?.toLowerCase().includes(term) ||
          course.description?.toLowerCase().includes(term)
      )
    );

    // Filtrar cursos onde é professor
    setFilteredTeacherCourses(
      teacherCourses.filter(
        (course) =>
          course.title?.toLowerCase().includes(term) ||
          course.description?.toLowerCase().includes(term)
      )
    );
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

  const renderCourses = (courses, actionButtonLabel, onClickAction, allowDelete = true) => {
    if (courses.length === 0) {
      return (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Typography variant="body1" color="textSecondary">
            Nenhum curso encontrado.
          </Typography>
        </Box>
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

  // Renderização condicional das tabs baseada nas permissões
  const renderTabs = () => {
    // Se nenhuma tab estiver disponível, não renderizar nada
    if (!showAdminTab && !showTeacherTab) {
      return null;
    }

    return (
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            '& .MuiTabs-indicator': {
              backgroundColor: '#9041c1',
            },
            '& .MuiTab-root.Mui-selected': {
              color: '#9041c1',
              fontWeight: 'bold',
            }
          }}
        >
          {showAdminTab && (
            <Tab
              icon={<CreateIcon />}
              iconPosition="start"
              label={
                <Badge badgeContent={courses.length} color="primary" sx={{ '& .MuiBadge-badge': { backgroundColor: '#9041c1' } }}>
                  <Box sx={{ px: 1 }}>Meus Cursos</Box>
                </Badge>
              }
            />
          )}
          {showTeacherTab && (
            <Tab
              icon={<SchoolIcon />}
              iconPosition="start"
              label={
                <Badge badgeContent={teacherCourses.length} color="primary" sx={{ '& .MuiBadge-badge': { backgroundColor: '#9041c1' } }}>
                  <Box sx={{ px: 1 }}>Cursos que Leciono</Box>
                </Badge>
              }
            />
          )}
        </Tabs>
      </Box>
    );
  };

  // Renderização condicional do conteúdo baseado na tab ativa
  const renderTabContent = () => {
    // Caso em que só há uma tab disponível (admin ou professor)
    if (showAdminTab && !showTeacherTab) {
      return renderCourses(filteredCourses, "Gerenciar Curso", handleEditCourse, true);
    } else if (!showAdminTab && showTeacherTab) {
      return renderCourses(filteredTeacherCourses, "Gerenciar Curso", handleEditCourse, false);
    }

    // Caso em que ambas as tabs estão disponíveis
    else if (showAdminTab && showTeacherTab) {
      if (tabValue === 0) {
        return renderCourses(filteredCourses, "Gerenciar Curso", handleEditCourse, true);
      } else {
        return renderCourses(filteredTeacherCourses, "Gerenciar Curso", handleEditCourse, false);
      }
    }

    // Fallback (não deveria ocorrer porque o componente nem deveria ser renderizado)
    else {
      return (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Typography variant="body1" color="textSecondary">
            Você não possui permissão para gerenciar cursos.
          </Typography>
        </Box>
      );
    }
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
        {showAdminTab && (
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
              minWidth: { xs: "120px", sm: "160px" },
            }}
            onClick={handleCreateNewCourse}
          >
            Criar Novo Curso
          </Button>
        )}
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