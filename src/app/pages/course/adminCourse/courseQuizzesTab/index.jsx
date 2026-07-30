import { useLocation, useNavigate } from "react-router-dom";
import React, {
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
  useRef,
  useCallback,
} from "react";
import { Box, Typography, Tabs, Tab, Button } from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { toast } from "react-toastify";

import QuizForm from "./QuizForm";
import QuizSettingsModal from "./QuizSettingsModal";
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
  addMultipleQuestionsToQuiz,
  saveAllCourseQuizzes,
  normalizeDiagnosticFlag,
} from "$api/services/courses/quizzes";
import { notifyNewQuiz } from "$api/services/notifications";
import { fetchCourseSlides } from "$api/services/courses/slides";
import { fetchCourseContentItems } from "$api/services/courses/content";
import { fetchFlippedClassroomVideos } from "$api/services/courses/submissions";

const CourseQuizzesTab = forwardRef(({ courseId, courseTitle = "", videos, slides }, ref) => {
  // Estados existentes
  const [newQuizVideoId, setNewQuizVideoId] = useState("");
  const [newQuizMinPercentage, setNewQuizMinPercentage] = useState(0);
  const [newQuizQuestion, setNewQuizQuestion] = useState("");
  const [newQuizOptions, setNewQuizOptions] = useState(["", ""]);
  const [newQuizCorrectOption, setNewQuizCorrectOption] = useState(0);

  // Imagem opcional da questão (URL + dimensões em px)
  const [newQuizImageUrl, setNewQuizImageUrl] = useState("");
  const [newQuizImageWidth, setNewQuizImageWidth] = useState("");
  const [newQuizImageHeight, setNewQuizImageHeight] = useState("");

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

  // `editQuiz` = quiz cujas QUESTÕES estão em edição (editor dentro do card).
  // A configuração do quiz (nota, diagnóstico, tentativas, janela) fica no
  // modal, controlado por `settingsQuiz`. São dois fluxos separados de propósito.
  const [editQuiz, setEditQuiz] = useState(null);
  const [settingsQuiz, setSettingsQuiz] = useState(null);
  const [editQuestion, setEditQuestion] = useState(null);
  const [showAddQuizModal, setShowAddQuizModal] = useState(false);
  const [showDeleteQuizModal, setShowDeleteQuizModal] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState(null);
  const [showDeleteQuestionModal, setShowDeleteQuestionModal] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState(null);
  const [draftQuestionId, setDraftQuestionId] = useState(null);
  // Campos do formulário de CRIAÇÃO (a edição vive no QuizSettingsModal).
  const [newQuizIsDiagnostic, setNewQuizIsDiagnostic] = useState(false);
  const [newQuizAllowRetry, setNewQuizAllowRetry] = useState(true);
  const [newQuizMaxAttempts, setNewQuizMaxAttempts] = useState("");
  // Janela de disponibilidade do novo quiz (datas ISO; "" = sem restrição).
  const [newQuizOpenDate, setNewQuizOpenDate] = useState("");
  const [newQuizCloseDate, setNewQuizCloseDate] = useState("");

  // Refs existentes
  const questionFormRef = useRef(null);
  const quizzesListEndRef = useRef(null);
  // Âncora do topo da aba, usada para levar o professor de volta ao formulário
  // de criação depois de adicionar um quiz.
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

  // Função para carregar os alvos de quiz da aba "Quizzes de Conteúdo":
  // itens da nova collection unificada (vídeos e slides) + vídeos legados.
  // Ambos usam a mesma chave de quiz (courseQuizzes/{courseId}/{id}, sem prefixo).
  const loadVideos = async () => {
    try {
      const [contentData, videosData, flippedData] = await Promise.all([
        fetchCourseContentItems(courseId),
        fetchCourseVideosForQuiz(courseId),
        fetchFlippedClassroomVideos(courseId),
      ]);

      const contentTargets = contentData.map((item) => ({
        id: item.id,
        title:
          item.category === "slide" ? `${item.title} (Slide)` : item.title,
      }));

      // Vídeos de entrega (sala de aula invertida): quiz chaveado pelo id `flip_...`.
      const flippedTargets = flippedData.map((v) => ({
        id: v.id,
        title: `${v.title} (Entrega)`,
      }));

      const targets = [...contentTargets, ...flippedTargets, ...videosData];
      setVideos(targets);

      if (targets.length > 0 && !newQuizVideoId) {
        setNewQuizVideoId(targets[0].id);
      }
    } catch (error) {
      console.error("Erro ao carregar conteúdo:", error);
      toast.error("Erro ao buscar o conteúdo do curso");
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
            isDiagnostic: normalizeDiagnosticFlag(quiz.isDiagnostic),
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

  // A abertura precisa vir antes do encerramento — senão o quiz nasceria
  // impossível de responder.
  const isScheduleValid = () => {
    if (
      newQuizOpenDate &&
      newQuizCloseDate &&
      new Date(newQuizOpenDate).getTime() >= new Date(newQuizCloseDate).getTime()
    ) {
      toast.error(
        "A data de abertura deve ser anterior à data de encerramento."
      );
      return false;
    }
    return true;
  };

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

      if (!isScheduleValid()) return;

      try {
        const newQuiz = await addQuiz(
          courseId,
          newQuizVideoId,
          newQuizMinPercentage,
          newQuizIsDiagnostic,
          newQuizAllowRetry,
          newQuizMaxAttempts,
          { openDate: newQuizOpenDate, closeDate: newQuizCloseDate }
        );

        // Avisa a turma. Com a janela de disponibilidade, criar o quiz é o
        // momento do lançamento: sem data de abertura ele já está no ar; com
        // data, o aviso diz quando abre.
        notifyNewQuiz(
          courseId,
          {
            id: newQuizVideoId,
            title:
              videosState.find((v) => v.id === newQuizVideoId)?.title ||
              "Novo quiz",
            openDate: newQuizOpenDate,
            closeDate: newQuizCloseDate,
          },
          courseTitle
        );

        setQuizzes((prev) => [...prev, newQuiz]);
        setNewQuizVideoId(videosState[0]?.id || "");
        setNewQuizMinPercentage(0);
        setNewQuizIsDiagnostic(false);
        setNewQuizAllowRetry(true);
        setNewQuizMaxAttempts("");
        setNewQuizOpenDate("");
        setNewQuizCloseDate("");
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

      if (!isScheduleValid()) return;

      try {
        const slidePrefix = `slide_${newQuizSlideId}`;
        const newQuiz = await addQuiz(
          courseId,
          slidePrefix,
          newQuizMinPercentage,
          newQuizIsDiagnostic,
          newQuizAllowRetry,
          newQuizMaxAttempts,
          { openDate: newQuizOpenDate, closeDate: newQuizCloseDate }
        );

        newQuiz.isSlideQuiz = true;
        newQuiz.slideId = newQuizSlideId;

        notifyNewQuiz(
          courseId,
          {
            id: slidePrefix,
            title:
              slidesState.find((s) => s.id === newQuizSlideId)?.title ||
              "Novo quiz",
            openDate: newQuizOpenDate,
            closeDate: newQuizCloseDate,
          },
          courseTitle
        );

        setSlideQuizzes((prev) => [...prev, newQuiz]);
        setNewQuizSlideId(slidesState[0]?.id || "");
        setNewQuizMinPercentage(0);
        setNewQuizIsDiagnostic(false);
        setNewQuizAllowRetry(true);
        setNewQuizMaxAttempts("");
        setNewQuizOpenDate("");
        setNewQuizCloseDate("");
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
    setNewQuizImageUrl(question.imageUrl || "");
    setNewQuizImageWidth(question.imageWidth || "");
    setNewQuizImageHeight(question.imageHeight || "");

    if (question.questionType === 'open-ended') {
      setNewQuizOptions(["", ""]);
      setNewQuizCorrectOption(0);
    } else {
      setNewQuizOptions([...question.options]);
      setNewQuizCorrectOption(question.correctOption);
    }
  };

  // Excluir uma questão NÃO abre o editor de questões: a exclusão sai da própria
  // lista, e o quiz alvo viaja junto em `questionToDelete`.
  const handleRemoveQuestion = (quiz, questionId) => {
    setQuestionToDelete({ quiz, id: questionId });
    setShowDeleteQuestionModal(true);
  };

  const confirmRemoveQuestion = async () => {
    try {
      if (!questionToDelete?.quiz) return;

      // Parte da versão mais recente do quiz na lista: o objeto guardado no
      // modal pode ter envelhecido (outra questão editada nesse meio-tempo).
      const target = questionToDelete.quiz;
      const latestQuiz =
        (target.isSlideQuiz ? slideQuizzes : quizzes).find(
          (q) => q.videoId === target.videoId
        ) || target;

      const updatedQuiz = await removeQuizQuestion(
        courseId,
        latestQuiz,
        questionToDelete.id
      );

      if (target.isSlideQuiz) {
        setSlideQuizzes((prev) =>
          prev.map((q) => (q.videoId === target.videoId ? updatedQuiz : q))
        );
      } else {
        setQuizzes((prev) =>
          prev.map((q) => (q.videoId === target.videoId ? updatedQuiz : q))
        );
      }

      // Só atualiza o editor se ele estiver aberto NESTE quiz.
      setEditQuiz((prev) =>
        prev?.videoId === target.videoId ? updatedQuiz : prev
      );

      toast.success("Questão deletada com sucesso!");
    } catch (error) {
      console.error("Erro ao deletar questão:", error);
      toast.error(error.message || "Erro ao deletar questão no banco de dados");
    } finally {
      setShowDeleteQuestionModal(false);
      setQuestionToDelete(null);
    }
  };

  // Lápis na lista: abre APENAS a configuração do quiz, num modal. Questões não
  // entram aqui — elas ficam no editor do card expandido.
  const handleEditQuiz = (quiz) => {
    setSettingsQuiz(quiz);
  };

  // Reflete na lista (e no editor de questões, se for o mesmo quiz) o quiz
  // atualizado por uma gravação do modal de configuração.
  const handleQuizSettingsSaved = (updatedQuiz) => {
    const applyTo = (prev) =>
      prev.map((q) => (q.videoId === updatedQuiz.videoId ? updatedQuiz : q));

    if (updatedQuiz.isSlideQuiz) {
      setSlideQuizzes(applyTo);
    } else {
      setQuizzes(applyTo);
    }
    setEditQuiz((prev) =>
      prev?.videoId === updatedQuiz.videoId ? updatedQuiz : prev
    );
  };

  // Botão "Editar questões" do card expandido: alterna o editor e garante que o
  // card esteja aberto para o professor ver a lista junto.
  const handleToggleQuestionEditor = (quiz) => {
    setEditQuestion(null);
    setEditQuiz((prev) => (prev?.videoId === quiz.videoId ? null : quiz));
    setExpandedQuiz(quiz.videoId);
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

  // Função para adicionar questões de PDF
  const handleQuestionsFromPdf = async (generatedQuestions) => {
    if (!editQuiz || generatedQuestions.length === 0) {
      toast.error("Selecione um quiz primeiro para adicionar as questões");
      return;
    }

    try {
      const formattedQuestions = generatedQuestions.map((question) => {
        const isOpenEnded =
          question.questionType === "open-ended" ||
          question.options == null ||
          !Array.isArray(question.options);

        const base = {
          id: question.id || generateUUID(),
          question: question.question,
          questionType: isOpenEnded ? "open-ended" : "multiple-choice",
        };

        // Carrega imagem opcional, se definida no editor do gerador
        if (question.imageUrl && String(question.imageUrl).trim()) {
          base.imageUrl = String(question.imageUrl).trim();
          if (Number(question.imageWidth) > 0)
            base.imageWidth = Number(question.imageWidth);
          if (Number(question.imageHeight) > 0)
            base.imageHeight = Number(question.imageHeight);
        }

        if (isOpenEnded) {
          return base;
        }

        return {
          ...base,
          options: question.options,
          correctOption: question.correctOption,
        };
      });

      const updatedQuiz = await addMultipleQuestionsToQuiz(
        courseId,
        editQuiz,
        formattedQuestions
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
    } catch (error) {
      console.error("Erro ao adicionar questões do PDF:", error);
      toast.error(error.message || "Erro ao salvar questões no banco de dados");
    }
  };

  // Auto-save de uma questão (para edição inline na lista)
  const handleAutoSaveQuestion = useCallback(
    async (quiz, questionData) => {
      if (!courseId || !quiz || !questionData?.id) return;

      const latestQuiz = (quiz.isSlideQuiz ? slideQuizzes : quizzes).find(
        (q) => q.videoId === quiz.videoId
      ) || quiz;

      const updatedQuiz = await updateQuizQuestion(
        courseId,
        latestQuiz,
        questionData
      );

      if (quiz.isSlideQuiz) {
        setSlideQuizzes((prev) =>
          prev.map((q) => (q.videoId === quiz.videoId ? updatedQuiz : q))
        );
      } else {
        setQuizzes((prev) =>
          prev.map((q) => (q.videoId === quiz.videoId ? updatedQuiz : q))
        );
      }

      setEditQuiz((prev) => (prev?.videoId === quiz.videoId ? updatedQuiz : prev));
    },
    [courseId, quizzes, slideQuizzes]
  );


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
        imageUrl: newQuizImageUrl,
        imageWidth: newQuizImageWidth,
        imageHeight: newQuizImageHeight,
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
      setNewQuizImageUrl("");
      setNewQuizImageWidth("");
      setNewQuizImageHeight("");

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
        imageUrl: newQuizImageUrl,
        imageWidth: newQuizImageWidth,
        imageHeight: newQuizImageHeight,
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
      setNewQuizImageUrl("");
      setNewQuizImageWidth("");
      setNewQuizImageHeight("");

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

  // Editor de questões renderizado DENTRO do card do quiz expandido (a lista o
  // chama só para o card em edição). Mantém aqui todo o estado do formulário,
  // em vez de espalhar duas dúzias de props pela QuizList.
  const renderQuestionEditor = () => (
    <>
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
          newQuizImageUrl={newQuizImageUrl}
          setNewQuizImageUrl={setNewQuizImageUrl}
          newQuizImageWidth={newQuizImageWidth}
          setNewQuizImageWidth={setNewQuizImageWidth}
          newQuizImageHeight={newQuizImageHeight}
          setNewQuizImageHeight={setNewQuizImageHeight}
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
        <Tab label="Quizzes de Conteúdo" />
        <Tab label="Quizzes de Slides (legado)" />
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
            handleAddQuiz={handleAddQuiz}
            newQuizAllowRetry={newQuizAllowRetry}
            setNewQuizAllowRetry={setNewQuizAllowRetry}
            newQuizMaxAttempts={newQuizMaxAttempts}
            setNewQuizMaxAttempts={setNewQuizMaxAttempts}
            newQuizOpenDate={newQuizOpenDate}
            setNewQuizOpenDate={setNewQuizOpenDate}
            newQuizCloseDate={newQuizCloseDate}
            setNewQuizCloseDate={setNewQuizCloseDate}
            questionFormRef={questionFormRef}
            entityType="conteúdo"
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
            questionFormRef={questionFormRef}
            handleEditQuestion={handleEditQuestion}
            handleRemoveQuestion={handleRemoveQuestion}
            quizzesListEndRef={quizzesListEndRef}
            entityType="conteúdo"
            entityItems={videosState}
            courseId={courseId}
            onAutoSaveQuestion={handleAutoSaveQuestion}
            editQuiz={editQuiz}
            onToggleQuestionEditor={handleToggleQuestionEditor}
            renderQuestionEditor={renderQuestionEditor}
          />
        </>
      )}

      {/* Conteúdo da tab de quizzes de slides */}
      {activeTab === 1 && (
        <>
          {!slidesState || slidesState.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center', bgcolor: '#f5f5f5', borderRadius: 2 }}>
              <Typography variant="body1" color="text.secondary">
                Nenhum slide no formato legado. Para slides novos, crie o quiz
                na aba "Quizzes de Conteúdo" — eles aparecem no seletor de
                conteúdo.
              </Typography>
            </Box>
          ) : (
            <>
              {/* Mesmo formulário de criação da aba de conteúdo: a aba legada
                  tinha uma cópia manual dos mesmos campos. */}
              <QuizForm
                videos={slidesState}
                newQuizVideoId={newQuizSlideId}
                setNewQuizVideoId={setNewQuizSlideId}
                newQuizMinPercentage={newQuizMinPercentage}
                setNewQuizMinPercentage={setNewQuizMinPercentage}
                newQuizIsDiagnostic={newQuizIsDiagnostic}
                setNewQuizIsDiagnostic={setNewQuizIsDiagnostic}
                handleAddQuiz={handleAddQuiz}
                newQuizAllowRetry={newQuizAllowRetry}
                setNewQuizAllowRetry={setNewQuizAllowRetry}
                newQuizMaxAttempts={newQuizMaxAttempts}
                setNewQuizMaxAttempts={setNewQuizMaxAttempts}
                newQuizOpenDate={newQuizOpenDate}
                setNewQuizOpenDate={setNewQuizOpenDate}
                newQuizCloseDate={newQuizCloseDate}
                setNewQuizCloseDate={setNewQuizCloseDate}
                questionFormRef={questionFormRef}
                entityType="slide"
                additionalButtons={gradesOverviewButton}
              />

              {/* Lista de quizzes de slides */}
              <QuizList
                quizzes={slideQuizzes || []}
                videos={slidesState || []}
                expandedQuiz={expandedQuiz}
                setExpandedQuiz={setExpandedQuiz}
                handleEditQuiz={handleEditQuiz}
                handleRemoveQuiz={handleRemoveQuiz}
                questionFormRef={questionFormRef}
                handleEditQuestion={handleEditQuestion}
                handleRemoveQuestion={handleRemoveQuestion}
                quizzesListEndRef={quizzesListEndRef}
                entityType="slide"
                entityItems={slidesState || []}
                courseId={courseId}
                onAutoSaveQuestion={handleAutoSaveQuestion}
                editQuiz={editQuiz}
                onToggleQuestionEditor={handleToggleQuestionEditor}
                renderQuestionEditor={renderQuestionEditor}
              />
            </>
          )}
        </>
      )}

      {/* Modais */}
      <QuizSettingsModal
        open={Boolean(settingsQuiz)}
        onClose={() => setSettingsQuiz(null)}
        courseId={courseId}
        quiz={settingsQuiz}
        contentTitle={
          settingsQuiz?.isSlideQuiz
            ? slidesState.find((s) => s.id === settingsQuiz?.slideId)?.title ||
              settingsQuiz?.slideId
            : videosState.find((v) => v.id === settingsQuiz?.videoId)?.title ||
              settingsQuiz?.videoId
        }
        onSaved={handleQuizSettingsSaved}
      />

      <SuccessModal
        open={showAddQuizModal}
        onClose={() => {
          setShowAddQuizModal(false);
          window.scrollTo({
            top: document.body.scrollHeight,
            behavior: "smooth",
          });
        }}
        title={`Quiz ${activeTab === 0 ? "do conteúdo" : "do slide"
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
        content="Isso apaga permanentemente todas as respostas e resultados dos alunos para este quiz (incluindo rankings e respostas abertas). Esta ação não pode ser desfeita."
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
