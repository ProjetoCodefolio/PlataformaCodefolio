import { ref, set, push, get, update } from 'firebase/database';
import { database } from "../../../service/firebase";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from '../../../context/AuthContext';
import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Tabs,
  Tab,
  Grid,
  MenuItem,
  Select,
  FormHelperText,
  FormControl,
  InputLabel,
  Modal,
} from "@mui/material";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import Topbar from "../../../components/topbar/Topbar";
import CourseVideosTab from './CourseVideosTab';
import CourseMaterialsTab from './CourseMaterialsTab';
import CourseQuizzesTab from './CourseQuizzesTab';
import { toast } from 'react-toastify';

const CourseForm = () => {
  const navigate = useNavigate();

  // Referências para os componentes de abas
  const courseVideosRef = useRef();
  const courseMaterialsRef = useRef();
  const courseQuizzesRef = useRef();

  // Estados para os campos do formulário
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");

  // Estados para controle de abas e modais
  const [selectedTab, setSelectedTab] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  // Dados do curso e autenticação
  const location = useLocation();
  const { userDetails } = useAuth();
  const params = new URLSearchParams(location.search);
  const courseId = params.get("courseId");

  // Busca os dados do curso ao carregar o componente (se courseId existir)
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

  // Função para alternar entre as abas
  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  // Função para salvar ou atualizar o curso
  const handleSubmit = async () => {
    try {
      if (!userDetails?.userId) {
        toast.error("Usuário não autenticado");
        return;
      }

      if (!courseTitle.trim() || !courseDescription.trim()) {
        toast.error("Preencha todos os campos obrigatórios");
        return;
      }

      console.log("Iniciando salvamento do curso...");

      if (!courseId) {
        console.log("Criando novo curso...");
        const courseData = {
          title: courseTitle,
          description: courseDescription,
          userId: userDetails.userId,
          createdAt: new Date().toISOString()
        };

        // Salva o curso
        const courseRef = ref(database, "courses");
        const newCourseRef = push(courseRef);
        await set(newCourseRef, courseData);

        const newCourseId = newCourseRef.key;
        console.log("Novo curso criado com ID:", newCourseId);

        // Salva os vídeos
        if (courseVideosRef.current) {
          console.log("Salvando vídeos para o novo curso...");
          try {
            await courseVideosRef.current.saveVideos(newCourseId);
            console.log("Vídeos salvos com sucesso!");
          } catch (error) {
            console.error("Erro ao salvar vídeos:", error);
            toast.error("Erro ao salvar os vídeos");
            return;
          }
        }

        // Mostra o modal de sucesso
        setShowSuccessModal(true);
        toast.success("Curso criado com sucesso!");
      } else {
        console.log("Atualizando curso existente...");
        const courseData = {
          title: courseTitle,
          description: courseDescription,
          updatedAt: new Date().toISOString()
        };

        // Atualiza o curso
        const courseRef = ref(database, `courses/${courseId}`);
        await update(courseRef, courseData);

        // Atualiza os vídeos
        if (courseVideosRef.current) {
          console.log("Atualizando vídeos do curso...");
          try {
            await courseVideosRef.current.saveVideos(courseId);
            console.log("Vídeos atualizados com sucesso!");
          } catch (error) {
            console.error("Erro ao atualizar vídeos:", error);
            toast.error("Erro ao atualizar os vídeos");
            return;
          }
        }

        // Mostra o modal de atualização
        setShowUpdateModal(true);
        toast.success("Curso atualizado com sucesso!");
      }
    } catch (error) {
      console.error("Erro ao salvar curso:", error);
      toast.error("Erro ao salvar o curso: " + error.message);
    }
  };

  // Verifica se o formulário é válido
  const isFormValid = () => {
    return courseTitle.trim() !== "" && courseDescription.trim() !== "";
  };

  return (
    <>
      <Topbar />
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
          {/* Campos do formulário */}
          <TextField
            label="Título do Curso"
            fullWidth
            required
            value={courseTitle}
            onChange={(e) => setCourseTitle(e.target.value)}
            sx={{ mb: 4 }}
            variant="outlined"
            disabled={!!courseId} // Desabilita edição se courseId existir
          />
          <TextField
            label="Descrição do Curso"
            fullWidth
            required
            value={courseDescription}
            onChange={(e) => setCourseDescription(e.target.value)}
            sx={{ mb: 4 }}
            variant="outlined"
            disabled={!!courseId} // Desabilita edição se courseId existir
          />

          {/* Abas */}
          <Tabs
            value={selectedTab}
            onChange={handleTabChange}
            textColor="primary"
            indicatorColor="primary"
            centered
            sx={{ mb: 4 }}
          >
            <Tab label="Vídeos" />
            <Tab label="Materiais Extras" />
            <Tab label="Quiz" />
          </Tabs>

          {/* Conteúdo das abas */}
          {selectedTab === 0 && <CourseVideosTab ref={courseVideosRef} />}
          {selectedTab === 1 && <CourseMaterialsTab ref={courseMaterialsRef} />}
          {selectedTab === 2 && <CourseQuizzesTab ref={courseQuizzesRef} />}
        </Paper>

        {/* Botão de salvar */}
        <Button
          variant="contained"
          sx={{
            p: 1.5,
            fontSize: "1.1rem",
            fontWeight: "bold",
            backgroundColor: "#9041c1",
            '&:hover': { backgroundColor: "#7d37a7" },
            '&.Mui-disabled': {
              backgroundColor: 'rgba(0, 0, 0, 0.12)',
              color: 'rgba(0, 0, 0, 0.26)'
            }
          }}
          fullWidth
          onClick={handleSubmit}
          disabled={!isFormValid()}
        >
          Salvar Curso
        </Button>
      </Box>

      {/* Modal de sucesso (criação) */}
      <Modal
        open={showSuccessModal}
        aria-labelledby="success-modal-title"
        aria-describedby="success-modal-description"
      >
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 400,
          bgcolor: 'background.paper',
          borderRadius: 2,
          boxShadow: 24,
          p: 4,
          textAlign: 'center'
        }}>
          <CheckCircleOutlineIcon sx={{ fontSize: 60, color: '#4caf50', mb: 2 }} />
          <Typography id="success-modal-title" variant="h6" component="h2" sx={{ mb: 2 }}>
            Curso criado com sucesso!
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/manage-courses')}
            sx={{ backgroundColor: "#9041c1", '&:hover': { backgroundColor: "#7d37a7" } }}
          >
            Voltar
          </Button>
        </Box>
      </Modal>

      {/* Modal de sucesso (atualização) */}
      <Modal
        open={showUpdateModal}
        aria-labelledby="update-modal-title"
        aria-describedby="update-modal-description"
      >
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 400,
          bgcolor: 'background.paper',
          borderRadius: 2,
          boxShadow: 24,
          p: 4,
          textAlign: 'center'
        }}>
          <CheckCircleOutlineIcon sx={{ fontSize: 60, color: '#4caf50', mb: 2 }} />
          <Typography id="update-modal-title" variant="h6" component="h2" sx={{ mb: 2 }}>
            Curso atualizado com sucesso!
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/manage-courses')}
            sx={{ backgroundColor: "#9041c1", '&:hover': { backgroundColor: "#7d37a7" } }}
          >
            Voltar
          </Button>
        </Box>
      </Modal>
    </>
  );
};

export default CourseForm;
