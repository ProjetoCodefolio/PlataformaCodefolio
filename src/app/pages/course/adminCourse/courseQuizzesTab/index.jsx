import { useLocation, useNavigate } from "react-router-dom";
import React, {
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";
import {
  Box,
  Divider,
  Tabs,
  Tab,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { toast } from "react-toastify";

import QuizForm from "./QuizForm";
import QuestionForm from "./QuestionForm";
import QuizList from "./QuizList";
import { ConfirmationModal, SuccessModal } from "./Modals";
import { generateUUID } from "../../../../utils/courseUtils";
import PdfQuizGenerator from "./PdfQuizGenerator";
import {
  fetchCourseVideosForQuiz,
  fetchCourseQuizzes,
  addQuiz,
  removeQuiz,
  addQuestionToQuiz,
  updateQuizQuestion,
  removeQuizQuestion,
  updateQuizMinPercentage,
  updateQuizDiagnosticStatus,
  addMultipleQuestionsToQuiz,
  saveAllCourseQuizzes,
} from "$api/services/courses/quizzes";
import { fetchCourseSlides } from "$api/services/courses/slides";

const CourseQuizzesTab = forwardRef(({ courseId, videos, slides }, ref) => {
  // Estados existentes
  const [newQuizVideoId, setNewQuizVideoId] = useState("");
  const [newQuizMinPercentage, setNewQuizMinPercentage] = useState(0);
  const [newQuizQuestion, setNewQuizQuestion] = useState("");
  const [newQuizOptions, setNewQuizOptions] = useState(["", ""]);
  const [newQuizCorrectOption, setNewQuizCorrectOption] = useState(0);

  // Novos estados para questões abertas
  const [newQuestionType, setNewQuestionType] = useState('multiple-choice');

  const [videosState, setVideos] = useState(videos || []);
  const [slidesState, setSlides] = useState(slides || []);

  const [quizzes, setQuizzes] = useState([]);
  const [expandedQuiz, setExpandedQuiz] = useState(null);

  // Novos estados para gerenciar slides e quizzes de slides
  const [activeTab, setActiveTab] = useState(0); // 0 = Videos, 1 = Slides
  const [newQuizSlideId, setNewQuizSlideId] = useState("");
  const [slideQuizzes, setSlideQuizzes] = useState([]);

  // Estados existentes continuação
  const [editQuiz, setEditQuiz] = useState(null);
  const [editQuestion, setEditQuestion] = useState(null);
  const [showAddQuizModal, setShowAddQuizModal] = useState(false);
  const [showDeleteQuizModal, setShowDeleteQuizModal] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState(null);
  const [showDeleteQuestionModal, setShowDeleteQuestionModal] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState(null);
  const [draftQuestionId, setDraftQuestionId] = useState(null);
  const [newQuizIsDiagnostic, setNewQuizIsDiagnostic] = useState(false);

  // Refs existentes
  const questionFormRef = useRef(null);
  const quizzesListEndRef = useRef(null);
  const quizSettingsRef = useRef(null);
  const questionRef = useRef(null);
  const optionsRefs = useRef([]);
  const addOptionButtonRef = useRef(null);
  const saveButtonRef = useRef(null);
  const cancelButtonRef = useRef(null);
  const editQuizRef = useRef(null);

  const navigate = useNavigate();

  useEffect(() => {
    optionsRefs.current = newQuizOptions.map(
      (_, i) => optionsRefs.current[i] || React.createRef()
    );
  }, [newQuizOptions.length]);

  // Função para carregar vídeos
  const loadVideos = async () => {
    try {
      const videosData = await fetchCourseVideosForQuiz(courseId);
      setVideos(videosData);

      if (videosData.length > 0 && !newQuizVideoId) {
        setNewQuizVideoId(videosData[0].id);
      }
    } catch (error) {
      console.error("Erro ao carregar vídeos:", error);
      toast.error("Erro ao buscar vídeos do curso");
      setVideos([]);
    }
  };

  // Nova função para carregar slides
  const loadSlides = async () => {
    try {
      const slidesData = await fetchCourseSlides(courseId);
      setSlides(slidesData);

      if (slidesData && slidesData.length > 0 && !newQuizSlideId) {
        setNewQuizSlideId(slidesData[0].id);
      }
    } catch (error) {
      console.error("Erro ao carregar slides:", error);
      toast.error("Erro ao buscar slides do curso");
      setSlides([]);
    }
  };

  // Função para carregar quizzes (adaptada para vídeos e slides)
  const loadQuizzes = async () => {
    try {
      if (courseId) {
        const quizzesData = await fetchCourseQuizzes(courseId);

        if (!quizzesData) {
          setQuizzes([]);
          setSlideQuizzes([]);
          return;
        }

        // Separar quizzes de vídeos e slides
        const videoQuizzesArray = [];
        const slideQuizzesArray = [];

        Object.entries(quizzesData).forEach(([id, quiz]) => {
          const quizObject = {
            ...quiz,
            videoId: id,
            questions: quiz.questions || [],
            isSlideQuiz: id.startsWith("slide_"),
          };

          if (id.startsWith("slide_")) {
            // Remove 'slide_' prefix para obter o ID real do slide
            quizObject.slideId = id.replace("slide_", "");
            slideQuizzesArray.push(quizObject);
          } else {
            videoQuizzesArray.push(quizObject);
          }
        });

        setQuizzes(videoQuizzesArray);
        setSlideQuizzes(slideQuizzesArray);
      }
    } catch (error) {
      console.error("Erro ao carregar quizzes:", error);
      toast.error("Erro ao buscar quizzes do curso");
      setQuizzes([]);
      setSlideQuizzes([]);
    }
  };

  useEffect(() => {
    if (courseId) {
      loadVideos();
      loadSlides();
      loadQuizzes();
    }
  }, [courseId]);

  useEffect(() => {
    // Apenas focará no campo quando iniciarmos uma edição (não em atualizações subsequentes)
    if (editQuiz && questionRef.current && !editQuizRef.current) {
      setTimeout(() => {
        questionRef.current.focus();
      }, 100);
    }
    // Armazenamos o estado atual de editQuiz para comparação na próxima execução
    editQuizRef.current = editQuiz;
  }, [editQuiz]);

  // Função para adicionar quiz (adaptada para vídeos e slides)
  const handleAddQuiz = async () => {
    if (activeTab === 0) {
      // Quiz para vídeo
      if (!newQuizVideoId) {
        toast.error("Selecione um vídeo para o quiz");
        return;
      }

      if (quizzes.some((quiz) => quiz.videoId === newQuizVideoId)) {
        toast.error("Já existe um quiz associado a este vídeo");
        return;
      }

      try {
        const newQuiz = await addQuiz(
          courseId,
          newQuizVideoId,
          newQuizMinPercentage,
          newQuizIsDiagnostic
        );

        setQuizzes((prev) => [...prev, newQuiz]);
        setNewQuizVideoId(videosState[0]?.id || "");
        setNewQuizMinPercentage(0);
        setNewQuizIsDiagnostic(false);
        setShowAddQuizModal(true);
        toast.success("Quiz adicionado com sucesso!");
      } catch (error) {
        console.error("Erro ao adicionar quiz:", error);
        toast.error(error.message || "Erro ao adicionar o quiz");
      }
    } else if (activeTab === 1) {
      // Quiz para slide
      if (!newQuizSlideId) {
        toast.error("Selecione um slide para o quiz");
        return;
      }

      if (slideQuizzes.some((quiz) => quiz.slideId === newQuizSlideId)) {
        toast.error("Já existe um quiz associado a este slide");
        return;
      }

      try {
        const slidePrefix = `slide_${newQuizSlideId}`;
        const newQuiz = await addQuiz(
          courseId,
          slidePrefix,
          newQuizMinPercentage,
          newQuizIsDiagnostic
        );

        newQuiz.isSlideQuiz = true;
        newQuiz.slideId = newQuizSlideId;

        setSlideQuizzes((prev) => [...prev, newQuiz]);
        setNewQuizSlideId(slidesState[0]?.id || "");
        setNewQuizMinPercentage(0);
        setNewQuizIsDiagnostic(false);
        setShowAddQuizModal(true);
        toast.success("Quiz do slide adicionado com sucesso!");
      } catch (error) {
        console.error("Erro ao adicionar quiz do slide:", error);
        toast.error(error.message || "Erro ao adicionar o quiz");
      }
    }
  };

  // Funções existentes com adaptações para slides
  const handleEditQuestion = (quiz, question) => {
    setEditQuiz(quiz);
    setEditQuestion(question);
    setNewQuizQuestion(question.question);
    setNewQuestionType(question.questionType || 'multiple-choice');
    
    if (question.questionType === 'open-ended') {
      setNewQuizOptions(["", ""]);
      setNewQuizCorrectOption(0);
    } else {
      setNewQuizOptions([...question.options]);
      setNewQuizCorrectOption(question.correctOption);
    }
  };

  const handleRemoveQuestion = (quiz, questionId) => {
    setEditQuiz(quiz);
    setQuestionToDelete({ quiz, id: questionId });
    setShowDeleteQuestionModal(true);
  };

  const confirmRemoveQuestion = async () => {
    try {
      if (!questionToDelete || !editQuiz) return;

      const updatedQuiz = await removeQuizQuestion(
        courseId,
        editQuiz,
        questionToDelete.id
      );

      if (editQuiz.isSlideQuiz) {
        setSlideQuizzes((prev) =>
          prev.map((q) => (q.videoId === editQuiz.videoId ? updatedQuiz : q))
        );
      } else {
        setQuizzes((prev) =>
          prev.map((q) => (q.videoId === editQuiz.videoId ? updatedQuiz : q))
        );
      }

      setEditQuiz(updatedQuiz);

      toast.success("Questão deletada com sucesso!");
    } catch (error) {
      console.error("Erro ao deletar questão:", error);
      toast.error(error.message || "Erro ao deletar questão no banco de dados");
    } finally {
      setShowDeleteQuestionModal(false);
      setQuestionToDelete(null);
    }
  };

  const handleEditQuiz = (quiz) => {
    setEditQuiz(quiz);

    if (quiz.isSlideQuiz) {
      setNewQuizSlideId(quiz.slideId);
      setActiveTab(1);
    } else {
      setNewQuizVideoId(quiz.videoId);
      setActiveTab(0);
    }

    setNewQuizMinPercentage(quiz.minPercentage);
    setNewQuizIsDiagnostic(quiz.isDiagnostic || false);
  };

  const handleRemoveQuiz = (quiz) => {
    setQuizToDelete(quiz);
    setShowDeleteQuizModal(true);
  };

  const confirmRemoveQuiz = async () => {
    if (!quizToDelete) return;

    try {
      await removeQuiz(courseId, quizToDelete.videoId);

      if (quizToDelete.isSlideQuiz) {
        setSlideQuizzes((prev) =>
          prev.filter((q) => q.videoId !== quizToDelete.videoId)
        );
      } else {
        setQuizzes((prev) =>
          prev.filter((q) => q.videoId !== quizToDelete.videoId)
        );
      }

      toast.success("Quiz deletado com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir quiz:", error);
      toast.error(error.message || "Erro ao excluir quiz");
    } finally {
      setShowDeleteQuizModal(false);
      setQuizToDelete(null);
    }
  };

  const handleAddQuizOption = () => {
    if (newQuizOptions.length < 5) {
      setNewQuizOptions((prev) => [...prev, ""]);
    }
  };

  const handleRemoveQuizOption = (indexToRemove) => {
    if (newQuizOptions.length > 2) {
      setNewQuizOptions((prev) =>
        prev.filter((_, index) => index !== indexToRemove)
      );
      if (newQuizCorrectOption >= newQuizOptions.length - 1) {
        setNewQuizCorrectOption(newQuizOptions.length - 2);
      }
    }
  };

  // Função para salvar os quizzes (adaptada para vídeos e slides)
  const saveQuizzes = async (newCourseId = null) => {
    try {
      // Combine both quiz arrays for saving
      const allQuizzes = [...quizzes, ...slideQuizzes];
      await saveAllCourseQuizzes(courseId, allQuizzes, newCourseId);
      return true;
    } catch (error) {
      console.error("Erro ao salvar quizzes:", error);
      throw error;
    }
  };

  const getQuizzes = () => {
    return [...quizzes, ...slideQuizzes];
  };

  useImperativeHandle(ref, () => ({
    saveQuizzes,
    getQuizzes,
  }));

  // Função para gerenciar a mudança de aba
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    // Limpar estado de edição ao mudar de aba
    setEditQuiz(null);
    setEditQuestion(null);
    
    // Inicializar seleções quando mudar de aba
    if (newValue === 0 && videosState.length > 0 && !newQuizVideoId) {
      setNewQuizVideoId(videosState[0].id);
    } else if (newValue === 1 && slidesState.length > 0 && !newQuizSlideId) {
      setNewQuizSlideId(slidesState[0].id);
    }
  };

  // Função para adicionar questões de PDF (permanece inalterada)
  const handleQuestionsFromPdf = async (generatedQuestions) => {
    if (!editQuiz || generatedQuestions.length === 0) {
      toast.error("Selecione um quiz primeiro para adicionar as questões");
      return;
    }

    try {
      // Formatar as questões para o formato esperado
      const formattedQuestions = generatedQuestions.map((question) => ({
        id: question.id || generateUUID(),
        question: question.question,
        options: question.options,
        correctOption: question.correctOption,
      }));

      // Adicionar as questões ao quiz usando a função da API
      const updatedQuiz = await addMultipleQuestionsToQuiz(
        courseId,
        editQuiz,
        formattedQuestions
      );

      // Atualizar o estado
      setQuizzes((prev) =>
        prev.map((q) => (q.videoId === editQuiz.videoId ? updatedQuiz : q))
      );
      setEditQuiz(updatedQuiz);

      toast.success(
        `${formattedQuestions.length} questões adicionadas com sucesso!`
      );
    } catch (error) {
      console.error("Erro ao adicionar questões do PDF:", error);
      toast.error(error.message || "Erro ao salvar questões no banco de dados");
    }
  };

  // Função para salvar a porcentagem mínima quando o campo perde o foco
  const handleBlurSaveMinPercentage = async () => {
    if (!editQuiz) return;

    try {
      const updatedQuiz = await updateQuizMinPercentage(
        courseId,
        editQuiz,
        newQuizMinPercentage
      );

      // Atualiza o quiz na lista correta (vídeos ou slides)
      if (editQuiz.isSlideQuiz) {
        setSlideQuizzes((prev) =>
          prev.map((q) => (q.videoId === editQuiz.videoId ? updatedQuiz : q))
        );
      } else {
        setQuizzes((prev) =>
          prev.map((q) => (q.videoId === editQuiz.videoId ? updatedQuiz : q))
        );
      }

      setEditQuiz(updatedQuiz);
      toast.success("Porcentagem mínima atualizada!");
    } catch (error) {
      console.error("Erro ao atualizar porcentagem mínima:", error);
      toast.error("Erro ao salvar a porcentagem mínima");
    }
  };

  const handleBlurSaveDiagnosticStatus = async () => {
    if (!editQuiz) return;
    try {
      const updatedQuiz = await updateQuizDiagnosticStatus(
        courseId,
        editQuiz,
        newQuizIsDiagnostic
      );
      
      // Atualiza o quiz na lista correta (vídeos ou slides)
      if (editQuiz.isSlideQuiz) {
        setSlideQuizzes((prev) =>
          prev.map((q) => (q.videoId === editQuiz.videoId ? updatedQuiz : q))
        );
      } else {
        setQuizzes((prev) =>
          prev.map((q) => (q.videoId === editQuiz.videoId ? updatedQuiz : q))
        );
      }
      setEditQuiz(updatedQuiz);
      toast.success("Status de diagnóstico atualizado!");
    } catch (error) {
      console.error("Erro ao atualizar status de diagnóstico:", error);
      toast.error("Erro ao salvar o status de diagnóstico");
    }
  };

  // Adicione esta função ao componente CourseQuizzesTab (antes do return)
  const handleBlurSave = async (field) => {
    if (!editQuiz || !editQuestion) return;

    try {
      const questionData = {
        id: editQuestion.id,
        question: newQuizQuestion,
        options: newQuizOptions,
        correctOption: newQuizCorrectOption,
      };

      // Atualizar a questão no quiz
      const updatedQuiz = await updateQuizQuestion(
        courseId,
        editQuiz,
        questionData
      );

      // Atualizar o estado do quiz
      if (editQuiz.isSlideQuiz) {
        setSlideQuizzes((prev) =>
          prev.map((q) => (q.videoId === editQuiz.videoId ? updatedQuiz : q))
        );
      } else {
        setQuizzes((prev) =>
          prev.map((q) => (q.videoId === editQuiz.videoId ? updatedQuiz : q))
        );
      }

      setEditQuiz(updatedQuiz);
      toast.success("Questão atualizada com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar questão:", error);
      toast.error("Erro ao salvar a questão");
    }
  };

  // Também precisamos adicionar a função handleKeyDown se não existir
  const handleKeyDown = (event) => {
    // Esta função permite salvar ao pressionar Ctrl+Enter
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      if (editQuestion) {
        handleSaveEditQuestion();
      } else {
        handleAddQuestion();
      }
    }
  };

  const handleSaveEditQuestion = async () => {
    if (!editQuiz || !editQuestion) return;

    // Validações básicas
    if (!newQuizQuestion.trim()) {
      toast.error("A pergunta não pode estar vazia");
      return;
    }

    const isOpenEnded = newQuestionType === 'open-ended';

    if (!isOpenEnded && newQuizOptions.some((opt) => !opt.trim())) {
      toast.error("Todas as opções devem ser preenchidas");
      return;
    }

    try {
      const questionData = {
        id: editQuestion.id,
        question: newQuizQuestion.trim(),
        questionType: newQuestionType,
      };

      if (isOpenEnded) {
        // Questão aberta não precisa de campos extras
      } else {
        questionData.options = newQuizOptions.map((opt) => opt.trim());
        questionData.correctOption = newQuizCorrectOption;
      }

      // Atualizar a questão no quiz
      const updatedQuiz = await updateQuizQuestion(
        courseId,
        editQuiz,
        questionData
      );

      // Atualizar o estado do quiz
      if (editQuiz.isSlideQuiz) {
        setSlideQuizzes((prev) =>
          prev.map((q) => (q.videoId === editQuiz.videoId ? updatedQuiz : q))
        );
      } else {
        setQuizzes((prev) =>
          prev.map((q) => (q.videoId === editQuiz.videoId ? updatedQuiz : q))
        );
      }

      setEditQuiz(updatedQuiz);
      setEditQuestion(null);
      setNewQuizQuestion("");
      setNewQuizOptions(["", ""]);
      setNewQuizCorrectOption(0);
      setNewQuestionType('multiple-choice');

      toast.success("Questão atualizada com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar questão:", error);
      toast.error(error.message || "Erro ao salvar a questão");
    }
  };

  const handleAddQuestion = async () => {
    if (!editQuiz) return;

    // Validações básicas
    if (!newQuizQuestion.trim()) {
      toast.error("A pergunta não pode estar vazia");
      return;
    }

    const isOpenEnded = newQuestionType === 'open-ended';

    if (!isOpenEnded && newQuizOptions.some((opt) => !opt.trim())) {
      toast.error("Todas as opções devem ser preenchidas");
      return;
    }

    try {
      const questionData = {
        id: generateUUID(), // Gera um ID único para a nova questão
        question: newQuizQuestion.trim(),
        questionType: newQuestionType,
      };

      if (isOpenEnded) {
        // Questão aberta não precisa de campos extras
      } else {
        questionData.options = newQuizOptions.map((opt) => opt.trim());
        questionData.correctOption = newQuizCorrectOption;
      }

      // Adicionar a questão ao quiz
      const updatedQuiz = await addQuestionToQuiz(
        courseId,
        editQuiz,
        questionData
      );

      // Atualizar o estado do quiz
      if (editQuiz.isSlideQuiz) {
        setSlideQuizzes((prev) =>
          prev.map((q) => (q.videoId === editQuiz.videoId ? updatedQuiz : q))
        );
      } else {
        setQuizzes((prev) =>
          prev.map((q) => (q.videoId === editQuiz.videoId ? updatedQuiz : q))
        );
      }

      setEditQuiz(updatedQuiz);
      setNewQuizQuestion("");
      setNewQuizOptions(["", ""]);
      setNewQuizCorrectOption(0);
      setNewQuestionType('multiple-choice');

      toast.success("Questão adicionada com sucesso!");
    } catch (error) {
      console.error("Erro ao adicionar questão:", error);
      toast.error(error.message || "Erro ao adicionar a questão");
    }
  };

  // Função para navegar para visão geral de notas
  const handleViewQuizGradesOverview = () => {
    navigate(`/quiz-grades-overview?courseId=${courseId}`);
  };

  // Botão de visão geral de notas
  const gradesOverviewButton = (
    <Button
      variant="outlined"
      startIcon={<TrendingUpIcon />}
      onClick={handleViewQuizGradesOverview}
      sx={{
        borderColor: "#9041c1",
        color: "#9041c1",
        "&:hover": {
          borderColor: "#7a35a3",
          backgroundColor: "#f5f0fa",
        },
      }}
    >
      Visão Geral de Notas
    </Button>
  );

  // Interface modificada com tabs para separar quizzes de vídeos e slides
  return (
    <Box
      sx={{
        p: 3,
        backgroundColor: "#fff",
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }}
      ref={quizSettingsRef}
    >
      {/* Tabs para alternar entre quizzes de vídeos e slides */}
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        sx={{ mb: 3 }}
        variant="fullWidth"
      >
        <Tab label="Quizzes de Vídeos" />
        <Tab label="Quizzes de Slides" />
      </Tabs>

      {/* Conteúdo da tab de quizzes de vídeos */}
      {activeTab === 0 && (
        <>
          {/* Formulário para criar quiz para vídeo */}
          <QuizForm
            videos={videosState}
            newQuizVideoId={newQuizVideoId}
            setNewQuizVideoId={setNewQuizVideoId}
            newQuizMinPercentage={newQuizMinPercentage}
            setNewQuizMinPercentage={setNewQuizMinPercentage}
            newQuizIsDiagnostic={newQuizIsDiagnostic}
            setNewQuizIsDiagnostic={setNewQuizIsDiagnostic}
            editQuiz={editQuiz && !editQuiz.isSlideQuiz ? editQuiz : null}
            handleAddQuiz={handleAddQuiz}
            handleBlurSaveMinPercentage={handleBlurSaveMinPercentage}
            handleBlurSaveDiagnosticStatus={handleBlurSaveDiagnosticStatus}
            questionFormRef={questionFormRef}
            entityType="vídeo"
            additionalButtons={gradesOverviewButton}
          />

          {/* Lista de quizzes de vídeos */}
          <QuizList
            quizzes={quizzes}
            videos={videosState}
            expandedQuiz={expandedQuiz}
            setExpandedQuiz={setExpandedQuiz}
            handleEditQuiz={handleEditQuiz}
            handleRemoveQuiz={handleRemoveQuiz}
            quizSettingsRef={quizSettingsRef}
            questionFormRef={questionFormRef}
            handleEditQuestion={handleEditQuestion}
            handleRemoveQuestion={handleRemoveQuestion}
            quizzesListEndRef={quizzesListEndRef}
            entityType="vídeo"
            entityItems={videosState}
            courseId={courseId}
          />
        </>
      )}

      {/* Conteúdo da tab de quizzes de slides */}
      {activeTab === 1 && (
        <>
          {!slidesState || slidesState.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center', bgcolor: '#f5f5f5', borderRadius: 2 }}>
              <Typography variant="body1" color="text.secondary">
                Nenhum slide cadastrado ainda. Cadastre slides na aba "Slides" para criar quizzes.
              </Typography>
            </Box>
          ) : (
            <>
              {/* Formulário para criar quiz para slide */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                  {editQuiz && editQuiz.isSlideQuiz
                    ? "Editar Quiz do Slide"
                    : "Novo Quiz para Slide"}
                </Typography>

            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              {/* Dropdown para seleção do slide */}
              <FormControl fullWidth size="small">
                <InputLabel>Slide</InputLabel>
                <Select
                  value={newQuizSlideId}
                  onChange={(e) => setNewQuizSlideId(e.target.value)}
                  label="Slide"
                  disabled={editQuiz && editQuiz.isSlideQuiz}
                >
                  {(!slidesState || slidesState.length === 0) && (
                    <MenuItem value="" disabled>
                      Nenhum slide disponível
                    </MenuItem>
                  )}
                  {slidesState && slidesState.length > 0 &&
                    slidesState.map((slide) => (
                      <MenuItem key={slide.id} value={slide.id}>
                        {slide.title || `Slide ${slide.id.substring(0, 6)}`}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>

              {/* Input para nota mínima */}
              <FormControl sx={{ width: "200px" }} size="small">
                <InputLabel>Nota Mínima (%)</InputLabel>
                <Select
                  value={newQuizMinPercentage}
                  onChange={(e) => setNewQuizMinPercentage(e.target.value)}
                  label="Nota Mínima (%)"
                  onBlur={
                    editQuiz && editQuiz.isSlideQuiz
                      ? handleBlurSaveMinPercentage
                      : undefined
                  }
                >
                  {[0, 50, 60, 70, 80, 90, 100].map((value) => (
                    <MenuItem key={value} value={value}>
                      {value}%
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Botão para adicionar o quiz */}
              {!editQuiz && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <button
                    onClick={handleAddQuiz}
                    style={{
                      backgroundColor: "#9041c1",
                      color: "#fff",
                      border: "none",
                      borderRadius: "4px",
                      padding: "8px 16px",
                      cursor: "pointer",
                      fontWeight: "500",
                    }}
                  >
                    Adicionar Quiz
                  </button>
                  {gradesOverviewButton}
                </Box>
              )}
            </Box>
          </Box>

          {/* Lista de quizzes de slides */}
          <QuizList
            quizzes={slideQuizzes || []}
            videos={slidesState || []}
            expandedQuiz={expandedQuiz}
            setExpandedQuiz={setExpandedQuiz}
            handleEditQuiz={handleEditQuiz}
            handleRemoveQuiz={handleRemoveQuiz}
            quizSettingsRef={quizSettingsRef}
            questionFormRef={questionFormRef}
            handleEditQuestion={handleEditQuestion}
            handleRemoveQuestion={handleRemoveQuestion}
            quizzesListEndRef={quizzesListEndRef}
            entityType="slide"
            entityItems={slidesState || []}            courseId={courseId}          />
            </>
          )}
        </>
      )}

      {/* Seção de edição de quiz - comum para ambos os tipos */}
      {editQuiz && (
        <>
          <Divider sx={{ my: 3 }} />
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
            Editar Questões -{" "}
            {editQuiz.isSlideQuiz ? "Quiz do Slide" : "Quiz do Vídeo"}{" "}
            {editQuiz.isSlideQuiz
              ? slidesState.find((s) => s.id === editQuiz.slideId)?.title ||
              editQuiz.slideId
              : videosState.find((v) => v.id === editQuiz.videoId)?.title ||
              editQuiz.videoId}
          </Typography>

          <PdfQuizGenerator
            onQuestionsGenerated={handleQuestionsFromPdf}
            setEditQuestion={setEditQuestion}
            setNewQuizQuestion={setNewQuizQuestion}
            setNewQuizOptions={setNewQuizOptions}
            setNewQuizCorrectOption={setNewQuizCorrectOption}
          />

          <Box id="question-form" sx={{ scrollMarginTop: "20px" }}>
            <QuestionForm
              editQuiz={editQuiz}
              newQuizQuestion={newQuizQuestion}
              setNewQuizQuestion={setNewQuizQuestion}
              newQuizOptions={newQuizOptions}
              setNewQuizOptions={setNewQuizOptions}
              newQuizCorrectOption={newQuizCorrectOption}
              setNewQuizCorrectOption={setNewQuizCorrectOption}
              newQuestionType={newQuestionType}
              setNewQuestionType={setNewQuestionType}
              handleBlurSave={handleBlurSave}
              handleKeyDown={handleKeyDown}
              questionRef={questionRef}
              optionsRefs={optionsRefs}
              addOptionButtonRef={addOptionButtonRef}
              saveButtonRef={saveButtonRef}
              cancelButtonRef={cancelButtonRef}
              handleAddQuizOption={handleAddQuizOption}
              handleRemoveQuizOption={handleRemoveQuizOption}
              editQuestion={editQuestion}
              handleSaveEditQuestion={handleSaveEditQuestion}
              handleAddQuestion={handleAddQuestion}
              setEditQuiz={setEditQuiz}
              setEditQuestion={setEditQuestion}
            />
          </Box>
        </>
      )}

      {/* Modais */}
      <SuccessModal
        open={showAddQuizModal}
        onClose={() => {
          setShowAddQuizModal(false);
          window.scrollTo({
            top: document.body.scrollHeight,
            behavior: "smooth",
          });
        }}
        title={`Quiz ${activeTab === 0 ? "do vídeo" : "do slide"
          } adicionado com sucesso!`}
      />

      <ConfirmationModal
        open={showDeleteQuizModal}
        onClose={() => setShowDeleteQuizModal(false)}
        onConfirm={confirmRemoveQuiz}
        title={
          quizToDelete?.isSlideQuiz
            ? `Tem certeza que deseja excluir o quiz do slide "${slidesState.find((s) => s.id === quizToDelete?.slideId)?.title ||
            "selecionado"
            }?"`
            : `Tem certeza que deseja excluir o quiz do vídeo "${videosState.find((v) => v.id === quizToDelete?.videoId)?.title ||
            "selecionado"
            }?"`
        }
      />

      <ConfirmationModal
        open={showDeleteQuestionModal}
        onClose={() => setShowDeleteQuestionModal(false)}
        onConfirm={confirmRemoveQuestion}
        title={`Tem certeza que deseja excluir a questão "${questionToDelete?.quiz?.questions.find(
          (q) => q.id === questionToDelete?.id
        )?.question || "selecionada"
          }?"`}
      />
    </Box>
  );
});

export default CourseQuizzesTab;
