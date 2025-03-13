import { ref, set, push, get, update } from 'firebase/database';
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
} from "@mui/material";
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import Topbar from "../../../components/topbar/Topbar";
import CourseVideosTab from './CourseVideosTab';
import CourseMaterialsTab from './CourseMaterialsTab';
import CourseQuizzesTab from './CourseQuizzesTab';
import { toast } from 'react-toastify';

const CourseForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userDetails } = useAuth();
  const params = new URLSearchParams(location.search);
  const [courseId, setCourseId] = useState(params.get("courseId"));

  const courseVideosRef = useRef();
  const courseMaterialsRef = useRef();
  const courseQuizzesRef = useRef();

  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [selectedTab, setSelectedTab] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  useEffect(() => {
    const loadCourse = async () => {
      if (courseId) {
        const courseRef = ref(database, `courses/${courseId}`);
        const courseSnapshot = await get(courseRef);
        const courseData = courseSnapshot.val();

        if (courseData) {
          setCourseTitle(courseData.title || "");
          setCourseDescription(courseData.description || "");
        }
      }
    };
    loadCourse();
  }, [courseId]);

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
        ...(courseId ? {} : { createdAt: new Date().toISOString() }),
      };

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
      ]);

      setShowSuccessModal(!courseId);
      setShowUpdateModal(!!courseId);
      toast.success(`Curso ${courseId ? "atualizado" : "criado"} com sucesso!`);
    } catch (error) {
      console.error("Erro ao salvar curso:", error);
      toast.error("Erro ao salvar o curso: " + error.message);
    }
  }, [courseTitle, courseDescription, userDetails, courseId, navigate]);

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
            {courseId ? "Editar Curso" : "Criar Novo Curso"}
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
          </Grid>

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
          </Tabs>

          {selectedTab === 0 && <CourseVideosTab ref={courseVideosRef} />}
          {selectedTab === 1 && <CourseMaterialsTab ref={courseMaterialsRef} />}
          {selectedTab === 2 && <CourseQuizzesTab ref={courseQuizzesRef} />}
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
      </Modal >
    </>
  );
};

export default CourseForm;