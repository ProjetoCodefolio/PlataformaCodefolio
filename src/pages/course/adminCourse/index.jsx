import { ref, set, push, get, update, onValue, off } from 'firebase/database';
import { database } from "../../../service/firebase";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from '../../../context/AuthContext';
import React, { useEffect, useState, useRef, useCallback } from "react";
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
  Switch
} from "@mui/material";
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import Topbar from "../../../components/topbar/Topbar";
import CourseVideosTab from './CourseVideosTab';
import CourseMaterialsTab from './CourseMaterialsTab';
import CourseQuizzesTab from './courseQuizzesTab/';
import CourseStudentsTab from './CourseStudentsTab';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const CourseForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userDetails } = useAuth();
  const params = new URLSearchParams(location.search);
  const [courseId, setCourseId] = useState(params.get("courseId"));

  const courseVideosRef = useRef();
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
  const [randomPin, setRandomPin] = useState(Math.floor(1000000 + Math.random() * 9000000).toString());
  const [permissionListener, setPermissionListener] = useState(null);

  useEffect(() => {
    const loadCourse = async () => {
      if (courseId) {
        const courseRef = ref(database, `courses/${courseId}`);
        const courseSnapshot = await get(courseRef);
        const courseData = courseSnapshot.val();

        if (courseData) {
          setCourseTitle(courseData.title || "");
          setCourseDescription(courseData.description || "");
          setPinRequired(courseData.pinEnabled);
          setCoursePin(courseData.pin || "");
        }
      }
    };
    loadCourse();
  }, [courseId]);

  // Verificação inicial de acesso
  useEffect(() => {
    const checkTeacherAccess = async () => {
      if (!userDetails?.userId) {
        toast.error("Usuário não autenticado.");
        navigate("/listcurso");
        return;
      }

      // Caso 1: Usuário é admin - acesso total
      if (userDetails?.role === "admin") {
        return;
      }

      // Caso 2: Não é admin mas tem courseId na URL - verificar se é professor deste curso
      if (courseId) {
        try {
          const teacherRef = ref(database, `users/${userDetails.userId}/coursesTeacher/${courseId}`);
          const snapshot = await get(teacherRef);

          if (!snapshot.exists() || snapshot.val() !== true) {
            navigate("/listcurso");
            toast.error("Você não tem acesso a este curso.");
          } else {
            // Configurar listener em tempo real para detectar remoção de permissão
            setupPermissionListener();
          }
        } catch (error) {
          console.error("Erro ao verificar permissão:", error);
          toast.error("Erro ao verificar acesso ao curso.");
          navigate("/listcurso");
        }
      } else {
        // Caso 3: Não é admin e não tem courseId (tentando criar curso) - acesso negado
        toast.error("Acesso negado.");
        navigate("/listcurso");
      }
    };

    checkTeacherAccess();

    // Limpar listener ao desmontar
    return () => {
      if (permissionListener) {
        off(permissionListener);
      }
    };
  }, [courseId, userDetails, navigate]);

  // Função para configurar o listener de permissões em tempo real
  const setupPermissionListener = () => {
    // Pular para admins (eles sempre têm acesso)
    if (userDetails?.role === "admin" || !courseId || !userDetails?.userId) return;

    // Referência para a entrada de professor do usuário para este curso
    const teacherRef = ref(database, `users/${userDetails.userId}/coursesTeacher/${courseId}`);

    onValue(teacherRef, (snapshot) => {
      if (!snapshot.exists() || snapshot.val() !== true) {
        // Usando sessionStorage para mensagens entre navegações
        sessionStorage.setItem('courseAccessError', 'Seu acesso a este curso foi revogado pelo administrador.');
        navigate("/listcurso");
      }
    });

    setPermissionListener(teacherRef);
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

      if (!courseTitle.trim() || !courseDescription.trim()) {
        toast.error("Preencha todos os campos obrigatórios");
        return;
      }

      const quizzes = courseQuizzesRef.current?.getQuizzes?.() || [];
      if (quizzes.some(quiz => quiz.questions.length === 0)) {
        toast.error("Não é possível salvar um curso com quizzes sem questões");
        return;
      }

      const courseData = {
        title: courseTitle,
        description: courseDescription,
        userId: userDetails.userId,
        updatedAt: new Date().toISOString(),
        pinEnabled: pinRequired,
        ...(courseId ? {} : { createdAt: new Date().toISOString() }),
      };

      if (pinRequired) {
        courseData.pin = coursePin || randomPin; // Salva o PIN gerado ou o existente
      }

      let finalCourseId = courseId;
      if (!courseId) {
        const courseRef = ref(database, "courses");
        const newCourseRef = push(courseRef);
        await set(newCourseRef, courseData);
        finalCourseId = newCourseRef.key;
        setCourseId(finalCourseId);
      } else {
        const courseRef = ref(database, `courses/${courseId}`);
        await update(courseRef, courseData);
        setCourseId(courseId);
      }

      await Promise.all([
        courseVideosRef.current?.saveVideos(finalCourseId),
        courseMaterialsRef.current?.saveMaterials(finalCourseId),
        courseQuizzesRef.current?.saveQuizzes(finalCourseId),
        // courseStudentsRef.current?.saveStudents(finalCourseId),
      ]);

      if (!courseId) {
        setCoursePin(courseData.pin); // Exibe o PIN gerado após salvar
      }

      setShowSuccessModal(!courseId);
      setShowUpdateModal(!!courseId);
      toast.success(`Curso ${courseId ? "atualizado" : "criado"} com sucesso!`);
    } catch (error) {
      console.error("Erro ao salvar curso:", error);
      toast.error("Erro ao salvar o curso: " + error.message);
    }
  }, [courseTitle, courseDescription, userDetails, courseId, coursePin, pinRequired, randomPin, navigate]);

  const isFormValid = useCallback(() => {
    const quizzes = courseQuizzesRef.current?.getQuizzes?.() || [];
    return (
      courseTitle.trim() !== "" &&
      courseDescription.trim() !== "" &&
      !quizzes.some(quiz => quiz.questions.length === 0)
    );
  }, [courseTitle, courseDescription]);

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
        <Paper
          sx={{
            p: 4,
            mb: 4,
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
          }}
        >
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

            {/* Seção de PIN redesenhada para ser responsiva */}
            <Grid item xs={12}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6} md={4}>
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
                          '& .MuiSwitch-switchBase': {
                            color: 'grey',
                            '&.Mui-checked': {
                              color: '#9041c1',
                            },
                            '&.Mui-checked + .MuiSwitch-track': {
                              backgroundColor: '#9041c1',
                            },
                          },
                          '& .MuiSwitch-track': {
                            backgroundColor: '#666',
                          },
                        }}
                      />
                    }
                    label="Criar PIN para acesso ao curso"
                    sx={{ color: '#666' }}
                  />
                </Grid>

                {(pinRequired || courseId) && (
                  <Grid item xs={12} sm={6} md={4}>
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
            </Grid>
          </Grid>

          {courseId && (
            <>
              {/* Versão para telas maiores (centralizadas) */}
              <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                <Tabs
                  value={selectedTab}
                  onChange={handleTabChange}
                  indicatorColor="primary"
                  textColor="primary"
                  centered
                  sx={{
                    mb: 4,
                    "& .MuiTab-root": { color: "#666", "&.Mui-selected": { color: "#9041c1" } },
                    "& .MuiTabs-indicator": { backgroundColor: "#9041c1" },
                  }}
                >
                  <Tab label="Vídeos" />
                  <Tab label="Materiais Extras" />
                  <Tab label="Quiz" />
                  <Tab label="Alunos" />
                </Tabs>
              </Box>

              {/* Versão para telas menores (scrolláveis) */}
              <Box sx={{ display: { xs: 'block', md: 'none' } }}>
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
                      fontSize: { xs: '0.8rem', sm: '0.875rem' },
                    },
                    "& .MuiTabs-indicator": { backgroundColor: "#9041c1" },
                    "& .MuiTabs-scrollButtons": { color: "#9041c1" },
                  }}
                >
                  <Tab label="Vídeos" />
                  <Tab label="Materiais Extras" />
                  <Tab label="Quiz" />
                  <Tab label="Alunos" />
                </Tabs>
              </Box>

              {selectedTab === 0 && <CourseVideosTab ref={courseVideosRef} />}
              {selectedTab === 1 && <CourseMaterialsTab ref={courseMaterialsRef} />}
              {selectedTab === 2 && <CourseQuizzesTab ref={courseQuizzesRef} />}
              {selectedTab === 3 && <CourseStudentsTab ref={courseStudentsRef} />}
            </>
          )}
        </Paper>

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
      </Box>

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
          <CheckCircleOutlineIcon sx={{ fontSize: 60, color: "#4caf50", mb: 2 }} />
          <Typography id="success-modal-title" variant="h6" sx={{ mb: 2 }}>
            Curso criado com sucesso!
          </Typography>
          <Button
            variant="contained"
            onClick={() => {
              setShowSuccessModal(false);
              navigate(`/adm-cursos?courseId=${courseId}`);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            sx={{ backgroundColor: "#9041c1", "&:hover": { backgroundColor: "#7d37a7" } }}
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
          <CheckCircleOutlineIcon sx={{ fontSize: 60, color: "#4caf50", mb: 2 }} />
          <Typography id="update-modal-title" variant="h6" sx={{ mb: 2 }}>
            Curso atualizado com sucesso!
          </Typography>
          <Button
            variant="contained"
            onClick={() => {
              setShowUpdateModal(false);
              navigate(`/adm-cursos?courseId=${courseId}`);
            }}
            sx={{ backgroundColor: "#9041c1", "&:hover": { backgroundColor: "#7d37a7" } }}
          >
            OK!
          </Button>
        </Box>
      </Modal>
    </>
  );
};

export default CourseForm;