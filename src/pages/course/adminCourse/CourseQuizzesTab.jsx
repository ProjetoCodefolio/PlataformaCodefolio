import { ref as firebaseRef, set, get, remove } from 'firebase/database';
import { database } from "../../../service/firebase";
import { useLocation } from "react-router-dom";
import React, { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import {
  Box,
  TextField,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Modal,
  Typography,
  Card,
  CardContent,
  CardActions,
  Collapse,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { toast } from "react-toastify";

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

  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const courseId = params.get("courseId");

  const fetchVideos = async () => {
    const courseVideosRef = firebaseRef(database, 'courseVideos');
    const snapshot = await get(courseVideosRef);
    const courseVideos = snapshot.val();

    if (courseVideos) {
      const filteredVideos = Object.entries(courseVideos)
        .filter(([_, video]) => video.courseId === courseId)
        .map(([key, video]) => ({ id: key, title: video.title }));
      setVideos(filteredVideos);
      if (filteredVideos.length > 0 && !newQuizVideoId) {
        setNewQuizVideoId(filteredVideos[0].id);
      }
    }
  };

  const fetchQuizzes = async () => {
    if (courseId) {
      const quizzesRef = firebaseRef(database, `courseQuizzes/${courseId}`);
      const snapshot = await get(quizzesRef);
      const quizzesData = snapshot.val();

      if (quizzesData) {
        const quizzesArray = Object.entries(quizzesData).map(([videoId, quiz]) => ({
          videoId,
          minPercentage: quiz.minPercentage || 0,
          questions: quiz.questions || [],
        }));
        setQuizzes(quizzesArray);
      }
    }
  };

  useEffect(() => {
    fetchVideos();
    fetchQuizzes();
  }, [courseId]);

  const handleAddQuiz = () => {
    if (!newQuizVideoId) {
      toast.error("Selecione um vídeo para o quiz");
      return;
    }
    if (quizzes.some(quiz => quiz.videoId === newQuizVideoId)) {
      toast.error("Já existe um quiz associado a este vídeo");
      return;
    }
    const newQuiz = {
      videoId: newQuizVideoId,
      minPercentage: newQuizMinPercentage,
      questions: [],
    };
    setQuizzes(prev => [...prev, newQuiz]);
    setNewQuizVideoId(videos[0]?.id || "");
    setNewQuizMinPercentage(0);
    setShowAddQuizModal(true);
  };

  const handleAddQuestion = () => {
    if (!newQuizQuestion.trim() || newQuizOptions.some(opt => !opt.trim())) {
      toast.error("Preencha a pergunta e todas as opções");
      return;
    }

    const newQuestion = {
      id: Date.now(),
      question: newQuizQuestion,
      options: [...newQuizOptions],
      correctOption: newQuizCorrectOption,
    };

    if (editQuiz) {
      setQuizzes(prev => prev.map(q =>
        q.videoId === editQuiz.videoId
          ? { ...q, questions: [...q.questions, newQuestion] }
          : q
      ));
      setEditQuiz(prev => ({ ...prev, questions: [...prev.questions, newQuestion] }));
    }

    setNewQuizQuestion("");
    setNewQuizOptions(["", ""]);
    setNewQuizCorrectOption(0);
    toast.success("Questão adicionada com sucesso!");
  };

  const handleEditQuestion = (quiz, question) => {
    setEditQuiz(quiz);
    setEditQuestion(question);
    setNewQuizQuestion(question.question);
    setNewQuizOptions([...question.options]);
    setNewQuizCorrectOption(question.correctOption);
  };

  const handleSaveEditQuestion = () => {
    if (!newQuizQuestion.trim() || newQuizOptions.some(opt => !opt.trim())) {
      toast.error("Preencha a pergunta e todas as opções");
      return;
    }

    const updatedQuestion = {
      ...editQuestion,
      question: newQuizQuestion,
      options: [...newQuizOptions],
      correctOption: newQuizCorrectOption,
    };

    setQuizzes(prev => prev.map(q =>
      q.videoId === editQuiz.videoId
        ? {
          ...q,
          questions: q.questions.map(qst =>
            qst.id === updatedQuestion.id ? updatedQuestion : qst
          ),
        }
        : q
    ));
    setEditQuiz(prev => ({
      ...prev,
      questions: prev.questions.map(qst =>
        qst.id === updatedQuestion.id ? updatedQuestion : qst
      ),
    }));
    setEditQuestion(null);
    setNewQuizQuestion("");
    setNewQuizOptions(["", ""]);
    setNewQuizCorrectOption(0);
    toast.success("Questão editada com sucesso!");
  };

  const handleRemoveQuestion = (quiz, questionId) => {
    setEditQuiz(quiz);
    setQuestionToDelete({ quiz, id: questionId });
    setShowDeleteQuestionModal(true);
  };

  const confirmRemoveQuestion = () => {
    setQuizzes(prev => prev.map(q =>
      q.videoId === editQuiz.videoId
        ? { ...q, questions: q.questions.filter(qst => qst.id !== questionToDelete.id) }
        : q
    ));
    setEditQuiz(prev => ({
      ...prev,
      questions: prev.questions.filter(qst => qst.id !== questionToDelete.id),
    }));
    setShowDeleteQuestionModal(false);
    setQuestionToDelete(null);
    toast.success("Questão deletada com sucesso!");
  };

  const handleEditQuiz = (quiz) => {
    setEditQuiz(quiz);
    setNewQuizVideoId(quiz.videoId);
    setNewQuizMinPercentage(quiz.minPercentage);
  };

  const handleSaveEditQuiz = async () => {
    if (quizzes.some(quiz => quiz.videoId === newQuizVideoId && quiz.videoId !== editQuiz.videoId)) {
      toast.error("Já existe um quiz associado a este vídeo");
      return;
    }

    const updatedQuizzes = quizzes.map(q =>
      q.videoId === editQuiz.videoId
        ? { ...q, videoId: newQuizVideoId, minPercentage: newQuizMinPercentage }
        : q
    );

    setQuizzes(updatedQuizzes);
    setEditQuiz(null);
    setNewQuizVideoId(videos[0]?.id || "");
    setNewQuizMinPercentage(0);

    try {
      const quizData = {
        questions: editQuiz.questions,
        minPercentage: newQuizMinPercentage,
        courseId: courseId,
        videoId: newQuizVideoId,
      };
      const courseQuizzesRef = firebaseRef(database, `courseQuizzes/${courseId}/${newQuizVideoId}`);
      await set(courseQuizzesRef, quizData);
      toast.success("Edição do quiz salva com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar quiz:", error);
      toast.error("Erro ao salvar o quiz");
    }
  };

  const handleRemoveQuiz = (quiz) => {
    setQuizToDelete(quiz);
    setShowDeleteQuizModal(true);
  };

  const confirmRemoveQuiz = async () => {
    if (quizToDelete) {
      try {
        const quizRef = firebaseRef(database, `courseQuizzes/${courseId}/${quizToDelete.videoId}`);
        await remove(quizRef);
        setQuizzes(prev => prev.filter(q => q.videoId !== quizToDelete.videoId));
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
      setNewQuizOptions(prev => [...prev, ""]);
    }
  };

  const handleRemoveQuizOption = (indexToRemove) => {
    if (newQuizOptions.length > 2) {
      setNewQuizOptions(prev => prev.filter((_, index) => index !== indexToRemove));
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
        const courseQuizzesRef = firebaseRef(database, `courseQuizzes/${courseIdParam || courseId}/${quiz.videoId}`);
        await set(courseQuizzesRef, quizData);
      }
      console.log("Quizzes salvos com sucesso!");
      return true;
    } catch (error) {
      console.error("Erro ao salvar quizzes:", error);
      throw error;
    }
  };

  const getQuizzes = () => {
    return quizzes;
  };

  useImperativeHandle(ref, () => ({
    saveQuizzes,
    getQuizzes,
  }));

  return (
    <Box sx={{ p: 3, backgroundColor: "#fff", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold", color: "#333" }}>
        Criar Novo Quiz
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel
              sx={{
                color: "#666",
                "&.Mui-focused": { color: "#9041c1" },
                top: "-6px",
              }}
            >
              Vídeo Associado
            </InputLabel>
            <Select
              value={newQuizVideoId}
              onChange={(e) => setNewQuizVideoId(e.target.value)}
              sx={{
                "& .MuiOutlinedInput-notchedOutline": { borderColor: "#666" },
                "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#9041c1" },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#9041c1" },
              }}
              disabled={!!editQuiz}
            >
              {videos.map((video, index) => (
                <MenuItem key={video.id} value={video.id}>
                  {`${index + 1}. ${video.title}`}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>Selecione o vídeo para este quiz</FormHelperText>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            label="Nota Mínima (%)"
            type="number"
            fullWidth
            value={newQuizMinPercentage}
            onChange={(e) => {
              const value = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
              setNewQuizMinPercentage(value);
            }}
            inputProps={{ min: 0, max: 100 }}
            variant="outlined"
            sx={{
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: "#666" },
                "&:hover fieldset": { borderColor: "#9041c1" },
                "&.Mui-focused fieldset": { borderColor: "#9041c1" },
              },
              "& .MuiInputLabel-root": { color: "#666", "&.Mui-focused": { color: "#9041c1" } },
            }}
            helperText="0 a 100%. Se 0, o quiz não será obrigatório."
          />
        </Grid>

        {editQuiz && (
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12}>
              <TextField
                label="Pergunta"
                fullWidth
                value={newQuizQuestion}
                onChange={(e) => setNewQuizQuestion(e.target.value)}
                variant="outlined"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "#666" },
                    "&:hover fieldset": { borderColor: "#9041c1" },
                    "&.Mui-focused fieldset": { borderColor: "#9041c1" },
                  },
                  "& .MuiInputLabel-root": { color: "#666", "&.Mui-focused": { color: "#9041c1" } },
                }}
              />
            </Grid>
            {newQuizOptions.map((option, index) => (
              <Grid item xs={12} key={index}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <TextField
                    label={`Opção ${index + 1}`}
                    fullWidth
                    value={option}
                    onChange={(e) =>
                      setNewQuizOptions((prev) =>
                        prev.map((opt, i) => (i === index ? e.target.value : opt))
                      )
                    }
                    variant="outlined"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        "& fieldset": { borderColor: "#666" },
                        "&:hover fieldset": { borderColor: "#9041c1" },
                        "&.Mui-focused fieldset": { borderColor: "#9041c1" },
                      },
                      "& .MuiInputLabel-root": { color: "#666", "&.Mui-focused": { color: "#9041c1" } },
                    }}
                  />
                  <IconButton
                    onClick={() => setNewQuizCorrectOption(index)}
                    sx={{
                      backgroundColor: newQuizCorrectOption === index ? "#4caf50" : "transparent",
                      color: newQuizCorrectOption === index ? "#fff" : "#666",
                      "&:hover": { backgroundColor: newQuizCorrectOption === index ? "#45a049" : "#e0e0e0" },
                    }}
                  >
                    <CheckCircleIcon />
                  </IconButton>
                  {newQuizOptions.length > 2 && (
                    <IconButton
                      onClick={() => handleRemoveQuizOption(index)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Box>
              </Grid>
            ))}
          </Grid>
        )}

        {!editQuiz && (
          <Grid item xs={12}>
            <Button
              variant="contained"
              onClick={handleAddQuiz}
              disabled={!newQuizVideoId}
              sx={{
                backgroundColor: "#9041c1",
                "&:hover": { backgroundColor: "#7d37a7" },
                "&.Mui-disabled": {
                  backgroundColor: "rgba(0, 0, 0, 0.12)",
                  color: "rgba(0, 0, 0, 0.26)",
                },
              }}
            >
              Adicionar Quiz
            </Button>
          </Grid>
        )}

        {editQuiz && (
          <>
            <Grid item xs={12}>
              <Button
                variant="outlined"
                onClick={handleAddQuizOption}
                disabled={newQuizOptions.length >= 5}
                sx={{
                  color: "#9041c1",
                  borderColor: "#9041c1",
                  "&:hover": { borderColor: "#7d37a7", backgroundColor: "rgba(144, 65, 193, 0.04)" },
                }}
              >
                Adicionar Opção
              </Button>
            </Grid>

            <Grid item xs={12}>
              <Button
                variant="contained"
                onClick={editQuestion ? handleSaveEditQuestion : handleAddQuestion}
                startIcon={<AddIcon />}
                sx={{ mr: 2, backgroundColor: "#9041c1", "&:hover": { backgroundColor: "#7d37a7" } }}
              >
                {editQuestion ? "Salvar Edição" : "Adicionar Questão"}
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  setEditQuiz(null);
                  setEditQuestion(null);
                  setNewQuizQuestion("");
                  setNewQuizOptions(["", ""]);
                  setNewQuizCorrectOption(0);
                }}
                sx={{
                  color: "#9041c1",
                  borderColor: "#9041c1",
                  "&:hover": { borderColor: "#7d37a7" },
                }}
              >
                Cancelar
              </Button>
            </Grid>
          </>
        )}

        {editQuiz && (
          <Grid item xs={12}>
            <Button
              variant="contained"
              onClick={handleSaveEditQuiz}
              sx={{ backgroundColor: "#9041c1", "&:hover": { backgroundColor: "#7d37a7" } }}
            >
              Salvar Edição do Quiz
            </Button>
          </Grid>
        )}
      </Grid>

      <Typography variant="h6" sx={{ mt: 4, mb: 2, fontWeight: "bold", color: "#333" }}>
        Quizzes Criados
      </Typography>

      <List>
        {quizzes.map((quiz) => (
          <Card key={quiz.videoId} sx={{ mb: 2, borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
            <CardContent sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                  Quiz para: {videos.find(v => v.id === quiz.videoId)?.title || "Vídeo não encontrado"}
                </Typography>
                <Typography variant="body2" sx={{ color: "#666" }}>
                  Nota mínima: {quiz.minPercentage}%
                </Typography>
                <Typography variant="body2" sx={{ color: "#666" }}>
                  Questões: {quiz.questions.length}
                </Typography>
              </Box>
              <Box>
                <IconButton
                  onClick={() => setExpandedQuiz(expandedQuiz === quiz.videoId ? null : quiz.videoId)}
                  sx={{ color: "#9041c1" }}
                >
                  <ExpandMoreIcon />
                </IconButton>
                <IconButton
                  onClick={() => handleEditQuiz(quiz)}
                  sx={{ color: "#9041c1" }}
                >
                  <EditIcon />
                </IconButton>
                <IconButton
                  onClick={() => handleRemoveQuiz(quiz)}
                  sx={{ color: "#d32f2f" }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            </CardContent>
            <Collapse in={expandedQuiz === quiz.videoId} timeout="auto" unmountOnExit>
              <CardContent>
                <List>
                  {quiz.questions.map((question) => (
                    <ListItem
                      key={question.id}
                      sx={{
                        p: 2,
                        borderBottom: "1px solid #e0e0e0",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <ListItemText
                        primary={question.question}
                        secondary={`Opções: ${question.options.join(", ")} | Correta: ${question.options[question.correctOption]}`}
                        sx={{
                          pr: 10, // Espaço reservado para os botões
                          flex: 1, // Faz o texto ocupar o espaço disponível
                        }}
                        primaryTypographyProps={{
                          sx: {
                            wordBreak: "break-word",
                            whiteSpace: "normal",
                          },
                        }}
                        secondaryTypographyProps={{
                          sx: {
                            wordBreak: "break-word",
                            whiteSpace: "normal",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          },
                        }}
                      />
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          position: "absolute",
                          right: 16,
                        }}
                      >
                        <IconButton
                          onClick={() => handleEditQuestion(quiz, question)}
                          sx={{ color: "#9041c1" }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          onClick={() => handleRemoveQuestion(quiz, question.id)}
                          sx={{ color: "#d32f2f" }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </ListItem>
                  ))}
                </List>
                <CardActions>
                  <Button
                    variant="contained"
                    onClick={() => handleEditQuiz(quiz)}
                    startIcon={<AddIcon />}
                    sx={{ backgroundColor: "#9041c1", "&:hover": { backgroundColor: "#7d37a7" } }}
                  >
                    Adicionar Questão
                  </Button>
                </CardActions>
              </CardContent>
            </Collapse>
          </Card>
        ))}
      </List>

      <Modal open={showAddQuizModal} onClose={() => setShowAddQuizModal(false)}>
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
          <Typography variant="h6" sx={{ mb: 2 }}>
            Quiz adicionado com sucesso!
          </Typography>
          <Button
            variant="contained"
            onClick={() => setShowAddQuizModal(false)}
            sx={{ backgroundColor: "#9041c1", "&:hover": { backgroundColor: "#7d37a7" } }}
          >
            OK
          </Button>
        </Box>
      </Modal>

      <Modal open={showDeleteQuizModal} onClose={() => setShowDeleteQuizModal(false)}>
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
          <Typography variant="h6" sx={{ mb: 2 }}>
            Tem certeza que deseja excluir o quiz para "{videos.find(v => v.id === quizToDelete?.videoId)?.title}"?
          </Typography>
          <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
            <Button
              variant="contained"
              color="error"
              onClick={confirmRemoveQuiz}
            >
              Sim, Excluir
            </Button>
            <Button
              variant="outlined"
              onClick={() => setShowDeleteQuizModal(false)}
            >
              Cancelar
            </Button>
          </Box>
        </Box>
      </Modal>

      <Modal open={showDeleteQuestionModal} onClose={() => setShowDeleteQuestionModal(false)}>
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
          <Typography variant="h6" sx={{ mb: 2 }}>
            Tem certeza que deseja excluir a questão "{questionToDelete?.quiz.questions.find(q => q.id === questionToDelete?.id)?.question}"?
          </Typography>
          <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
            <Button
              variant="contained"
              color="error"
              onClick={confirmRemoveQuestion}
            >
              Sim, Excluir
            </Button>
            <Button
              variant="outlined"
              onClick={() => setShowDeleteQuestionModal(false)}
            >
              Cancelar
            </Button>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
});

export default CourseQuizzesTab;