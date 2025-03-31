import { ref as firebaseRef, set, get, remove } from "firebase/database";
import { database } from "../../../../service/firebase";
import { useLocation, useNavigate } from "react-router-dom";
import React, {
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";
import { Box } from "@mui/material";
import { toast } from "react-toastify";

import QuizForm from "./QuizForm";
import QuestionForm from "./QuestionForm";
import QuizList from "./QuizList";
import { ConfirmationModal, SuccessModal } from "./Modals";
import { generateUUID, saveQuizToDatabase } from "../../../../utils/courseUtils";

const CourseQuizzesTab = forwardRef((props, ref) => {
  const [newQuizVideoId, setNewQuizVideoId] = useState("");
  const [newQuizMinPercentage, setNewQuizMinPercentage] = useState(0);
  const [newQuizQuestion, setNewQuizQuestion] = useState("");
  const [newQuizOptions, setNewQuizOptions] = useState(["", ""]);
  const [newQuizCorrectOption, setNewQuizCorrectOption] = useState(0);

  const [quizzes, setQuizzes] = useState([]);
  const [videos, setVideos] = useState([]);
  const [expandedQuiz, setExpandedQuiz] = useState(null);

  const [editQuiz, setEditQuiz] = useState(null);
  const [editQuestion, setEditQuestion] = useState(null);
  const [showAddQuizModal, setShowAddQuizModal] = useState(false);
  const [showDeleteQuizModal, setShowDeleteQuizModal] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState(null);
  const [showDeleteQuestionModal, setShowDeleteQuestionModal] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState(null);
  const [draftQuestionId, setDraftQuestionId] = useState(null);

  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const courseId = params.get("courseId");

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

  const fetchVideos = async () => {
    const courseVideosRef = firebaseRef(database, `courseVideos/${courseId}`);
    const snapshot = await get(courseVideosRef);
    const courseVideos = snapshot.val();

    if (courseVideos) {
      const filteredVideos = Object.entries(courseVideos).map(
        ([key, video]) => ({
          id: key,
          title: video.title,
        })
      );
      setVideos(filteredVideos);
      if (filteredVideos.length > 0 && !newQuizVideoId) {
        setNewQuizVideoId(filteredVideos[0].id);
      }
    } else {
      setVideos([]);
    }
  };

  const fetchQuizzes = async () => {
    if (courseId) {
      const quizzesRef = firebaseRef(database, `courseQuizzes/${courseId}`);
      const snapshot = await get(quizzesRef);
      const quizzesData = snapshot.val();

      if (quizzesData) {
        const quizzesArray = Object.entries(quizzesData).map(
          ([videoId, quiz]) => ({
            videoId,
            minPercentage: quiz.minPercentage || 0,
            questions: quiz.questions || [],
          })
        );
        setQuizzes(quizzesArray);
      }
    }
  };

  useEffect(() => {
    fetchVideos();
    fetchQuizzes();
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

  const handleAddQuiz = async () => {
    if (!newQuizVideoId) {
      toast.error("Selecione um vídeo para o quiz");
      return;
    }
    if (quizzes.some((quiz) => quiz.videoId === newQuizVideoId)) {
      toast.error("Já existe um quiz associado a este vídeo");
      return;
    }
    const newQuiz = {
      videoId: newQuizVideoId,
      minPercentage: newQuizMinPercentage,
      questions: [],
    };

    try {
      const courseQuizzesRef = firebaseRef(
        database,
        `courseQuizzes/${courseId}/${newQuizVideoId}`
      );
      await set(courseQuizzesRef, newQuiz);
      setQuizzes((prev) => [...prev, newQuiz]);
      setNewQuizVideoId(videos[0]?.id || "");
      setNewQuizMinPercentage(0);
      setShowAddQuizModal(true);
      toast.success("Quiz adicionado com sucesso!");
    } catch (error) {
      console.error("Erro ao adicionar quiz:", error);
      toast.error("Erro ao adicionar o quiz");
    }
  };

  const handleEditQuestion = (quiz, question) => {
    setEditQuiz(quiz);
    setEditQuestion(question);
    setNewQuizQuestion(question.question);
    setNewQuizOptions([...question.options]);
    setNewQuizCorrectOption(question.correctOption);
  };

  const handleRemoveQuestion = (quiz, questionId) => {
    setEditQuiz(quiz);
    setQuestionToDelete({ quiz, id: questionId });
    setShowDeleteQuestionModal(true);
  };

  const confirmRemoveQuestion = async () => {
    const updatedQuiz = {
      ...editQuiz,
      questions: editQuiz.questions.filter(
        (qst) => qst.id !== questionToDelete.id
      ),
    };

    setQuizzes((prev) =>
      prev.map((q) => (q.videoId === editQuiz.videoId ? updatedQuiz : q))
    );
    setEditQuiz(updatedQuiz);

    const saved = await saveQuizToDatabase(updatedQuiz, courseId, database, firebaseRef);
    if (saved) {
      toast.success("Questão deletada com sucesso!");
    } else {
      toast.error("Erro ao deletar questão no banco de dados");
    }

    setShowDeleteQuestionModal(false);
    setQuestionToDelete(null);
  };

  const handleEditQuiz = (quiz) => {
    setEditQuiz(quiz);
    setNewQuizVideoId(quiz.videoId);
    setNewQuizMinPercentage(quiz.minPercentage);
  };

  const handleRemoveQuiz = (quiz) => {
    setQuizToDelete(quiz);
    setShowDeleteQuizModal(true);
  };

  const confirmRemoveQuiz = async () => {
    if (quizToDelete) {
      try {
        const quizRef = firebaseRef(
          database,
          `courseQuizzes/${courseId}/${quizToDelete.videoId}`
        );
        await remove(quizRef);
        setQuizzes((prev) =>
          prev.filter((q) => q.videoId !== quizToDelete.videoId)
        );
        toast.success("Quiz deletado com sucesso!");
      } catch (error) {
        console.error("Erro ao excluir quiz:", error);
        toast.error("Erro ao excluir quiz");
      }
    }
    setShowDeleteQuizModal(false);
    setQuizToDelete(null);
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

  const saveQuizzes = async (courseIdParam) => {
    try {
      for (const quiz of quizzes) {
        const quizData = {
          questions: quiz.questions,
          minPercentage: quiz.minPercentage,
          courseId: courseIdParam || courseId,
          videoId: quiz.videoId,
        };
        const courseQuizzesRef = firebaseRef(
          database,
          `courseQuizzes/${courseIdParam || courseId}/${quiz.videoId}`
        );
        await set(courseQuizzesRef, quizData);
      }
      return true;
    } catch (error) {
      console.error("Erro ao salvar quizzes:", error);
      throw error;
    }
  };

  const getQuizzes = () => {
    return quizzes;
  };

  const handleViewStudents = (quizId) => {
    navigate(`/studentDashboard?quizId=${quizId}`);
  };

  useImperativeHandle(ref, () => ({
    saveQuizzes,
    getQuizzes,
  }));

  // Versão corrigida
  const handleBlurSave = () => {
    if (!editQuiz || !newQuizQuestion.trim()) {
      return;
    }
  
    let currentQuestionId;
  
    if (editQuestion) {
      currentQuestionId = editQuestion.id;
  
      const updatedQuestion = {
        ...editQuestion,
        question: newQuizQuestion,
        options: [...newQuizOptions],
        correctOption: newQuizCorrectOption,
      };
      
      const updatedQuiz = {
        ...editQuiz,
        questions: editQuiz.questions.map((q) =>
          q.id === updatedQuestion.id ? updatedQuestion : q
        ),
      };
      
      setEditQuiz(updatedQuiz);
    } else {
      if (!draftQuestionId) {
        currentQuestionId = generateUUID();
        setDraftQuestionId(currentQuestionId);
      }
    }
  };

  const handleAddQuestion = async () => {

    handleBlurSave();

    if (!newQuizQuestion.trim() || newQuizOptions.some((opt) => !opt.trim())) {
      toast.error("Preencha a pergunta e todas as opções");
      return;
    }

    if (!editQuiz) return;

    const questionId = draftQuestionId || generateUUID();
    
    const newQuestion = {
      id: questionId,
      question: newQuizQuestion,
      options: [...newQuizOptions],
      correctOption: newQuizCorrectOption,
    };

    const existingQuestionIndex = editQuiz.questions.findIndex(
      (q) => q.id === questionId
    );

    let updatedQuiz;
    if (existingQuestionIndex >= 0) {
      updatedQuiz = {
        ...editQuiz,
        questions: editQuiz.questions.map((q) =>
          q.id === questionId ? newQuestion : q
        ),
      };
    } else {
      updatedQuiz = {
        ...editQuiz,
        questions: [...editQuiz.questions, newQuestion],
      };
    }

    setQuizzes((prev) =>
      prev.map((q) => (q.videoId === editQuiz.videoId ? updatedQuiz : q))
    );
    setEditQuiz(updatedQuiz);

    const saved = await saveQuizToDatabase(updatedQuiz, courseId, database, firebaseRef);
    if (saved) {
      toast.success("Questão adicionada com sucesso!");
      setDraftQuestionId(null);
      setNewQuizQuestion("");
      setNewQuizOptions(["", ""]);
      setNewQuizCorrectOption(0);
    }
  };

  const handleSaveEditQuestion = async () => {
    if (!newQuizQuestion.trim() || newQuizOptions.some((opt) => !opt.trim())) {
      toast.error("Preencha a pergunta e todas as opções");
      return;
    }

    if (!editQuestion || !editQuiz) return;

    const updatedQuestion = {
      ...editQuestion,
      question: newQuizQuestion,
      options: [...newQuizOptions],
      correctOption: newQuizCorrectOption,
    };

    const updatedQuiz = {
      ...editQuiz,
      questions: editQuiz.questions.map((qst) =>
        qst.id === updatedQuestion.id ? updatedQuestion : qst
      ),
    };

    setQuizzes((prev) =>
      prev.map((q) => (q.videoId === editQuiz.videoId ? updatedQuiz : q))
    );
    setEditQuiz(updatedQuiz);

    const saved = await saveQuizToDatabase(updatedQuiz, courseId, database, firebaseRef);
    if (saved) {
      toast.success("Questão editada com sucesso!");
      setEditQuestion(null);
      setDraftQuestionId(null);
      setNewQuizQuestion("");
      setNewQuizOptions(["", ""]);
      setNewQuizCorrectOption(0);
    }
  };

  const handleBlurSaveMinPercentage = async () => {
    if (!editQuiz) return;

    if (editQuiz.minPercentage !== newQuizMinPercentage) {
      const updatedQuiz = {
        ...editQuiz,
        minPercentage: newQuizMinPercentage,
      };

      setEditQuiz(updatedQuiz);
      setQuizzes((prev) =>
        prev.map((q) => (q.videoId === editQuiz.videoId ? updatedQuiz : q))
      );

      const saved = await saveQuizToDatabase(updatedQuiz, courseId, database, firebaseRef);
      if (saved) {
        toast.success("Nota mínima atualizada com sucesso!", {
          autoClose: 2000,
          position: "bottom-right",
        });
      }
    }
  };

  const handleKeyDown = (e, nextFieldRef, action) => {
    if (e.key === "Enter") {
      e.preventDefault();

      if (action) {
        action();
        return;
      }

      if (nextFieldRef && nextFieldRef.current) {
        nextFieldRef.current.focus();
      }
    }
  };

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
      <QuizForm 
        videos={videos}
        newQuizVideoId={newQuizVideoId}
        setNewQuizVideoId={setNewQuizVideoId}
        newQuizMinPercentage={newQuizMinPercentage}
        setNewQuizMinPercentage={setNewQuizMinPercentage}
        editQuiz={editQuiz}
        handleAddQuiz={handleAddQuiz}
        handleBlurSaveMinPercentage={handleBlurSaveMinPercentage}
        questionFormRef={questionFormRef}
      />

      {editQuiz && (
        <QuestionForm 
          editQuiz={editQuiz}
          newQuizQuestion={newQuizQuestion}
          setNewQuizQuestion={setNewQuizQuestion}
          newQuizOptions={newQuizOptions}
          setNewQuizOptions={setNewQuizOptions}
          newQuizCorrectOption={newQuizCorrectOption}
          setNewQuizCorrectOption={setNewQuizCorrectOption}
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
      )}

      <QuizList 
        quizzes={quizzes}
        videos={videos}
        expandedQuiz={expandedQuiz}
        setExpandedQuiz={setExpandedQuiz}
        handleEditQuiz={handleEditQuiz}
        handleViewStudents={handleViewStudents}
        handleRemoveQuiz={handleRemoveQuiz}
        quizSettingsRef={quizSettingsRef}
        questionFormRef={questionFormRef}
        handleEditQuestion={handleEditQuestion}
        handleRemoveQuestion={handleRemoveQuestion}
        quizzesListEndRef={quizzesListEndRef}
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
        title="Quiz adicionado com sucesso!"
      />

      <ConfirmationModal
        open={showDeleteQuizModal}
        onClose={() => setShowDeleteQuizModal(false)}
        onConfirm={confirmRemoveQuiz}
        title={`Tem certeza que deseja excluir o quiz para "${videos.find((v) => v.id === quizToDelete?.videoId)?.title}?"`}
      />

      <ConfirmationModal
        open={showDeleteQuestionModal}
        onClose={() => setShowDeleteQuestionModal(false)}
        onConfirm={confirmRemoveQuestion}
        title={`Tem certeza que deseja excluir a questão "${
          questionToDelete?.quiz.questions.find(
            (q) => q.id === questionToDelete?.id
          )?.question
        }?"`}
      />
    </Box>
  );
});

export default CourseQuizzesTab;