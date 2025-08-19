import React, { useEffect, useState, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "$context/AuthContext";
import {
  fetchCourseDetails,
  saveCourse,
  validateCourseData,
} from "$api/services/courses/courses";
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Tabs,
  Tab,
  Grid,
  Modal,
  FormControlLabel,
  Switch,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import Topbar from "$components/topbar/Topbar";
import CourseVideosTab from "./CourseVideosTab";
import CourseSlidesTab from "./CourseSlidesTab";
import CourseMaterialsTab from "./CourseMaterialsTab";
import CourseQuizzesTab from "./courseQuizzesTab/";
import CourseStudentsTab from "./CourseStudentsTab";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AdvancedSettingsModal from "../../../components/courses/AdvancedSettingsModal";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import IconButton from "@mui/material/IconButton";
import SettingsIcon from "@mui/icons-material/Settings";
import { checkUserCourseRole } from "$api/services/courses/students";

/**
 * Estrutura padrão de configurações avançadas
 */
const DEFAULT_ADVANCED_SETTINGS = {
  videos: {
    requirePreviousCompletion: true,
  },
  quiz: {
    allowRetry: true,
    showResultAfterCompletion: true,
  },
};

/**
 * Busca as configurações avançadas de um curso
 * @param {string} courseId - ID do curso
 * @returns {Promise<Object>} - Configurações avançadas
 */
export const fetchAdvancedSettings = async (courseId) => {
  try {
    if (!courseId) throw new Error("ID do curso é obrigatório");

    const settingsRef = ref(database, `courseAdvancedSettings/${courseId}`);
    const snapshot = await get(settingsRef);

    if (snapshot.exists()) {
      return snapshot.val();
    }

    return DEFAULT_ADVANCED_SETTINGS;
  } catch (error) {
    console.error("Erro ao buscar configurações avançadas:", error);
    return DEFAULT_ADVANCED_SETTINGS;
  }
};

/**
 * Salva as configurações avançadas de um curso
 * @param {string} courseId - ID do curso
 * @param {Object} settings - Configurações avançadas
 * @returns {Promise<boolean>} - Verdadeiro se bem-sucedido
 */
export const saveAdvancedSettings = async (courseId, settings) => {
  try {
    if (!courseId) throw new Error("ID do curso é obrigatório");

    const settingsRef = ref(database, `courseAdvancedSettings/${courseId}`);
    await set(settingsRef, {
      ...DEFAULT_ADVANCED_SETTINGS,
      ...settings,
    });

    return true;
  } catch (error) {
    console.error("Erro ao salvar configurações avançadas:", error);
    throw error;
  }
};

const CourseForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userDetails } = useAuth();
  const params = new URLSearchParams(location.search);
  const [courseId, setCourseId] = useState(params.get("courseId"));

  const courseVideosRef = useRef();
  const courseSlidesRef = useRef();
  const courseMaterialsRef = useRef();
  const courseQuizzesRef = useRef();
  const courseStudentsRef = useRef();

  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [selectedTab, setSelectedTab] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [pinRequired, setPinRequired] = useState(false);
  const [coursePin, setCoursePin] = useState("");
  const [randomPin, setRandomPin] = useState(
    Math.floor(1000000 + Math.random() * 9000000).toString()
  );
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [isCurrentUserTeacher, setIsCurrentUserTeacher] = useState(false);

  useEffect(() => {
    const loadCourse = async () => {
      if (courseId) {
        try {
          // Usar a função da API para buscar os detalhes do curso
          const courseData = await fetchCourseDetails(courseId);

          if (courseData) {
            setCourseTitle(courseData.title || "");
            setCourseDescription(courseData.description || "");
            setPinRequired(courseData.pinEnabled);
            setCoursePin(courseData.pin || "");
          }
        } catch (error) {
          console.error("Erro ao carregar curso:", error);
          toast.error("Erro ao carregar dados do curso");
        }
      }
    };

    loadCourse();
  }, [courseId]);

  useEffect(() => {
    checkCurrentUserRole();
  }, [courseId, userDetails]);

  useEffect(() => {
    if (courseId && userDetails?.userId) {
      checkCurrentUserRole();
    }
  }, [courseId, userDetails]);

  const checkCurrentUserRole = async () => {
    try {
      if (!userDetails?.userId || !courseId) return;
      
      // Get course details to find the owner
      const courseData = await fetchCourseDetails(courseId);
      if (!courseData || !courseData.userId) return;
      
      // Check if the current user is just a teacher (not the admin)
      const isTeacher = await checkUserCourseRole(
        userDetails.userId, 
        courseId, 
        courseData.userId
      );
      
      setIsCurrentUserTeacher(isTeacher);
    } catch (error) {
      console.error("Erro ao verificar papel do usuário:", error);
      setIsCurrentUserTeacher(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const handleSubmit = useCallback(async () => {
    try {
      if (!userDetails?.userId) {
        toast.error("Usuário não autenticado");
        return;
      }

      // Usar a função da API para validar os dados do curso
      const quizzes = courseQuizzesRef.current?.getQuizzes?.() || [];
      const validation = await validateCourseData(
        {
          title: courseTitle,
          description: courseDescription,
        },
        quizzes
      );

      if (!validation.isValid) {
        toast.error(validation.error);
        return;
      }

      // Verificar se existem vídeos com URLs inválidas
      try {
        // Pré-validação dos vídeos (vai disparar erro se tiver URLs inválidas)
        await courseVideosRef.current?.validateVideos();
      } catch (error) {
        toast.error(error.message);
        return;
      }

      // Preparar dados do curso
      const courseData = {
        title: courseTitle,
        description: courseDescription,
        userId: userDetails.userId,
        pinEnabled: pinRequired,
      };

      if (pinRequired) {
        courseData.pin = coursePin || randomPin;
      }

      // Salvar curso usando a função da API
      const result = await saveCourse(courseId, courseData, userDetails.userId);
      const finalCourseId = result.courseId;

      if (finalCourseId !== courseId) {
        setCourseId(finalCourseId);
      }

      // Salvar demais componentes do curso
      await Promise.all([
        courseVideosRef.current?.saveVideos(finalCourseId),
        courseSlidesRef.current?.saveSlides(finalCourseId),
        courseMaterialsRef.current?.saveMaterials(finalCourseId),
        courseQuizzesRef.current?.saveQuizzes(finalCourseId),
      ]);

      if (result.isNew) {
        setCoursePin(result.courseData.pin || ""); // Exibe o PIN gerado após salvar
        setShowSuccessModal(true);
      } else {
        setShowUpdateModal(true);
      }

      toast.success(
        `Curso ${result.isNew ? "criado" : "atualizado"} com sucesso!`
      );
    } catch (error) {
      console.error("Erro ao salvar curso:", error);
      toast.error("Erro ao salvar o curso: " + error.message);
    }
  }, [
    courseTitle,
    courseDescription,
    userDetails,
    courseId,
    coursePin,
    pinRequired,
    randomPin,
  ]);

  const isFormValid = useCallback(() => {
    const quizzes = courseQuizzesRef.current?.getQuizzes?.() || [];
    return (
      courseTitle.trim() !== "" &&
      courseDescription.trim() !== "" &&
      !quizzes.some((quiz) => quiz.questions.length === 0)
    );
  }, [courseTitle, courseDescription]);

  // Funções de manipulação de menu
  const handleAdvancedSettingsClick = () => {
    setShowAdvancedSettings(true);
  };

  // O JSX permanece essencialmente o mesmo, apenas com atualizações para refletir
  // o uso das novas funções da API
  return (
    <>
      <ToastContainer />
      <Topbar hideSearch={true} />
      <Box
        sx={{
          p: 4,
          maxWidth: "1200px",
          margin: "64px auto 0",
          backgroundColor: "#f9f9f9",
          borderRadius: "12px",
          boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
        }}
      >
        {/* O resto do JSX permanece igual */}

        <Paper
          sx={{
            p: 4,
            mb: 4,
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
          }}
        >
          {/* Cabeçalho com título e menu de configurações */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 3,
            }}
          >
            <Typography
              variant="h4"
              component="h1"
              sx={{ fontWeight: 700, color: "#333" }}
            >
              Gerenciar Curso
            </Typography>

            {/* Botão de três pontos */}
            <IconButton
              aria-label="configurações avançadas"
              onClick={handleAdvancedSettingsClick} // Alterado para chamar a função direta
              sx={{ color: "#9041c1" }}
            >
              <MoreVertIcon />
            </IconButton>
          </Box>

          <Typography
            variant="h5"
            sx={{ mb: 3, fontWeight: "bold", color: "#333" }}
          >
            {courseId ? "Gerenciar Curso" : "Criar Novo Curso"}
          </Typography>

          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12}>
              <TextField
                label="Título do Curso"
                fullWidth
                required
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                variant="outlined"
                disabled={!!courseId}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "#666" },
                    "&:hover fieldset": { borderColor: "#9041c1" },
                    "&.Mui-focused fieldset": { borderColor: "#9041c1" },
                  },
                  "& .MuiInputLabel-root": {
                    color: "#666",
                    "&.Mui-focused": { color: "#9041c1" },
                  },
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Descrição do Curso"
                fullWidth
                required
                value={courseDescription}
                onChange={(e) => setCourseDescription(e.target.value)}
                variant="outlined"
                disabled={!!courseId}
                multiline
                rows={3}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "#666" },
                    "&:hover fieldset": { borderColor: "#9041c1" },
                    "&.Mui-focused fieldset": { borderColor: "#9041c1" },
                  },
                  "& .MuiInputLabel-root": {
                    color: "#666",
                    "&.Mui-focused": { color: "#9041c1" },
                  },
                }}
              />
            </Grid>

            <Grid item xs={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={pinRequired}
                    onChange={(e) => {
                      const isChecked = e.target.checked;
                      setPinRequired(isChecked);

                      if (!isChecked) {
                        setCoursePin((prevPin) => prevPin || "");
                      }
                    }}
                    sx={{
                      "& .MuiSwitch-switchBase": {
                        color: "grey",
                        "&.Mui-checked": {
                          color: "#9041c1",
                        },
                        "&.Mui-checked + .MuiSwitch-track": {
                          backgroundColor: "#9041c1",
                        },
                      },
                      "& .MuiSwitch-track": {
                        backgroundColor: "#666",
                      },
                    }}
                  />
                }
                label="Criar PIN para acesso ao curso"
                sx={{ color: "#666" }}
              />
            </Grid>

            {(pinRequired || courseId) && (
              <Grid item xs={4} sx={{ ml: -30, mt: -1 }}>
                <TextField
                  label="PIN de Acesso"
                  fullWidth
                  variant="outlined"
                  value={coursePin}
                  disabled={!pinRequired}
                  inputProps={{ maxLength: 7 }}
                  onChange={(e) => setCoursePin(e.target.value)}
                  helperText={
                    courseId
                      ? "O PIN já foi gerado e salvo para este curso."
                      : "Caso não seja informado, será gerado um PIN aleatório de 7 dígitos"
                  }
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": { borderColor: "#666" },
                      "&:hover fieldset": { borderColor: "#9041c1" },
                      "&.Mui-focused fieldset": { borderColor: "#9041c1" },
                    },
                    "& .MuiInputLabel-root": {
                      color: "#666",
                      "&.Mui-focused": { color: "#9041c1" },
                    },
                  }}
                />
              </Grid>
            )}
          </Grid>

          {courseId && (
            <>
              {/* Resto do JSX para as abas e conteúdo de curso permanece igual */}
              <Box sx={{ display: { xs: "none", md: "block" } }}>
                <Tabs
                  value={selectedTab}
                  onChange={handleTabChange}
                  indicatorColor="primary"
                  textColor="primary"
                  centered
                  sx={{
                    mb: 4,
                    "& .MuiTab-root": {
                      color: "#666",
                      "&.Mui-selected": { color: "#9041c1" },
                    },
                    "& .MuiTabs-indicator": { backgroundColor: "#9041c1" },
                  }}
                >
                  <Tab label="Vídeos" />
                  <Tab label="Slides" />
                  <Tab label="Materiais Extras" />
                  <Tab label="Quiz" />
                  <Tab label="Alunos" />
                </Tabs>
              </Box>

              <Box sx={{ display: { xs: "block", md: "none" } }}>
                <Tabs
                  value={selectedTab}
                  onChange={handleTabChange}
                  indicatorColor="primary"
                  textColor="primary"
                  variant="scrollable"
                  scrollButtons="auto"
                  allowScrollButtonsMobile
                  sx={{
                    mb: 4,
                    "& .MuiTab-root": {
                      color: "#666",
                      "&.Mui-selected": { color: "#9041c1" },
                      fontSize: { xs: "0.8rem", sm: "0.875rem" },
                    },
                    "& .MuiTabs-indicator": { backgroundColor: "#9041c1" },
                    "& .MuiTabs-scrollButtons": { color: "#9041c1" },
                  }}
                >
                  <Tab label="Vídeos" />
                  <Tab label="Slides" />
                  <Tab label="Materiais Extras" />
                  <Tab label="Quiz" />
                  <Tab label="Alunos" />
                </Tabs>
              </Box>

              {selectedTab === 0 && (
                <CourseVideosTab ref={courseVideosRef} courseId={courseId} />
              )}
              {selectedTab === 1 && (
                <CourseSlidesTab ref={courseSlidesRef} courseId={courseId} />
              )}
              {selectedTab === 2 && (
                <CourseMaterialsTab
                  ref={courseMaterialsRef}
                  courseId={courseId}
                />
              )}
              {selectedTab === 3 && (
                <CourseQuizzesTab ref={courseQuizzesRef} courseId={courseId} />
              )}
              {selectedTab === 4 && (
                <CourseStudentsTab
                  ref={courseStudentsRef}
                  courseId={courseId}
                />
              )}
            </>
          )}
        </Paper>

        {!isCurrentUserTeacher && (
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => navigate("/manage-courses")}
              sx={{
                color: "#9041c1",
                borderColor: "#9041c1",
                "&:hover": { borderColor: "#7d37a7" },
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={!isFormValid()}
              sx={{
                backgroundColor: "#9041c1",
                "&:hover": { backgroundColor: "#7d37a7" },
                "&.Mui-disabled": {
                  backgroundColor: "rgba(0, 0, 0, 0.12)",
                  color: "rgba(0, 0, 0, 0.26)",
                },
              }}
            >
              Salvar Curso
            </Button>
          </Box>
        )}
      </Box>

      {/* Modais permanecem iguais */}
      <Modal open={showSuccessModal} aria-labelledby="success-modal-title">
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 24,
            p: 4,
            textAlign: "center",
          }}
        >
          <CheckCircleOutlineIcon
            sx={{ fontSize: 60, color: "#4caf50", mb: 2 }}
          />
          <Typography id="success-modal-title" variant="h6" sx={{ mb: 2 }}>
            Curso criado com sucesso!
          </Typography>
          <Button
            variant="contained"
            onClick={() => {
              setShowSuccessModal(false);
              navigate(`/adm-cursos?courseId=${courseId}`);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            sx={{
              backgroundColor: "#9041c1",
              "&:hover": { backgroundColor: "#7d37a7" },
            }}
          >
            OK!
          </Button>
        </Box>
      </Modal>

      <Modal open={showUpdateModal} aria-labelledby="update-modal-title">
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 24,
            p: 4,
            textAlign: "center",
          }}
        >
          <CheckCircleOutlineIcon
            sx={{ fontSize: 60, color: "#4caf50", mb: 2 }}
          />
          <Typography id="update-modal-title" variant="h6" sx={{ mb: 2 }}>
            Curso atualizado com sucesso!
          </Typography>
          <Button
            variant="contained"
            onClick={() => {
              setShowUpdateModal(false);
              navigate(`/adm-cursos?courseId=${courseId}`);
            }}
            sx={{
              backgroundColor: "#9041c1",
              "&:hover": { backgroundColor: "#7d37a7" },
            }}
          >
            OK!
          </Button>
        </Box>
      </Modal>

      {/* Modal de configurações avançadas */}
      <AdvancedSettingsModal
        open={showAdvancedSettings}
        onClose={() => setShowAdvancedSettings(false)}
        courseId={courseId}
      />
    </>
  );
};

export default CourseForm;
