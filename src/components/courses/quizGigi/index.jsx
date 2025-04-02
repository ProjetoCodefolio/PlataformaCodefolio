import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  IconButton,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Avatar,
  LinearProgress,
  Paper,
  Fade,
  ClickAwayListener,
  Popper,
  Grow,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import SearchIcon from "@mui/icons-material/Search";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import logo from "../../../assets/img/codefolio.png";
import {
  ref,
  ref as databaseRef,
  get,
  set,
  serverTimestamp,
  update,
} from "firebase/database";
import { database } from "../../../service/firebase";
import Chip from "@mui/material/Chip";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.log("Erro capturado:", error);
  }

  render() {
    if (this.state.hasError) {
      // Renderizar fallback
      return this.props.fallback || null;
    }

    return this.props.children;
  }
}

const QuizGigi = ({ onClose, quizData, courseId }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [quizResults, setQuizResults] = useState({});
  const [courseTitle, setCourseTitle] = useState("");
  const [quizTitle, setQuizTitle] = useState("");
  const [showSummary, setShowSummary] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const chooseButtonRef = useRef(null);
  const contentContainerRef = useRef(null);

  useEffect(() => {
    if (courseId) {
      fetchEnrolledStudents();
      fetchCourseInfo();
    } else {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (courseId && quizData?.id) {
      if (quizData.title) {
        setQuizTitle(quizData.title);
      }

      const timer = setTimeout(() => {
        fetchQuizResults();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [courseId, quizData?.id]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      document.body.style.overflow = originalOverflow || "";
      document.body.style.paddingRight = originalPaddingRight || "";
    };
  }, []);

  useEffect(() => {
    const contentContainer = contentContainerRef.current;
    if (!contentContainer) return;

    const updateScrollbar = () => {
      const { scrollTop, scrollHeight, clientHeight } = contentContainer;
      const scrollRatio = clientHeight / scrollHeight;
      const thumbHeight = Math.max(scrollRatio * clientHeight, 30);
      const thumbTop = (scrollTop / scrollHeight) * clientHeight;

      document.documentElement.style.setProperty(
        "--scrollbar-thumb-height",
        `${thumbHeight}px`
      );
      document.documentElement.style.setProperty(
        "--scrollbar-thumb-top",
        `${thumbTop}px`
      );

      const showScrollbar = scrollHeight > clientHeight;
      document.documentElement.style.setProperty(
        "--scrollbar-opacity",
        showScrollbar ? "1" : "0"
      );
    };

    contentContainer.addEventListener("scroll", updateScrollbar);
    window.addEventListener("resize", updateScrollbar);

    updateScrollbar();

    return () => {
      contentContainer.removeEventListener("scroll", updateScrollbar);
      window.removeEventListener("resize", updateScrollbar);

      document.documentElement.style.removeProperty("--scrollbar-thumb-height");
      document.documentElement.style.removeProperty("--scrollbar-thumb-top");
      document.documentElement.style.removeProperty("--scrollbar-opacity");
    };
  }, []);

  useEffect(() => {
    return () => {
      // Limpar qualquer menu aberto quando o componente for desmontado
      setAnchorEl(null);
      setMenuOpen(false);
    };
  }, []);

  // Limpeza global de elementos órfãos do DOM
  useEffect(() => {
    const cleanupOrphanElements = () => {
      // Limpar menus e popovers órfãos
      const orphanElements = document.querySelectorAll(
        ".MuiPopover-root:not(.MuiModal-open), .MuiMenu-root:not(.MuiModal-open)"
      );
      orphanElements.forEach((elem) => {
        try {
          elem.parentNode?.removeChild(elem);
        } catch (e) {
          // Silenciar erros de remoção
        }
      });
    };

    // Limpar quando o componente montar
    cleanupOrphanElements();

    // Configurar limpeza periódica
    const interval = setInterval(cleanupOrphanElements, 3000);

    return () => {
      clearInterval(interval);
      // Garantir que o menu esteja fechado na desmontagem
      setMenuOpen(false);
      setAnchorEl(null);

      // Limpeza final na desmontagem
      setTimeout(cleanupOrphanElements, 100);
    };
  }, []);

  // Adicione este useEffect ao seu componente

  useEffect(() => {
    // Função para limpar todos os elementos não utilizados que podem estar causando o problema
    const cleanupAllPopupElements = () => {
      // Remover todos os elementos de popup que podem estar causando o problema
      const selectors = [
        ".MuiPopover-root",
        ".MuiMenu-root",
        ".MuiModal-root",
        ".MuiPopper-root",
        '[role="presentation"]',
        '[id^="menu-"]',
        '[id^="menu-appbar-"]',
        '[id^="mui-"]',
      ];

      // Encontra todos os elementos que correspondem aos seletores exceto os que estão atualmente sendo usados
      const orphanElements = document.querySelectorAll(selectors.join(", "));

      orphanElements.forEach((elem) => {
        // Verificar se o elemento não pertence ao nosso componente atual
        if (!elem.classList.contains("active-quizgigi-menu")) {
          try {
            elem.parentNode?.removeChild(elem);
          } catch (e) {
            // Silenciar erros de remoção
          }
        }
      });

      // Limpar também quaisquer backdrops ou overlays
      const backdrops = document.querySelectorAll(".MuiBackdrop-root");
      backdrops.forEach((backdrop) => {
        try {
          backdrop.parentNode?.removeChild(backdrop);
        } catch (e) {
          // Silenciar erros
        }
      });
    };

    // Executar a limpeza quando o componente montar
    document.addEventListener(
      "mousemove",
      () => {
        // Remover listeners dos menus antigos que possam estar causando problemas
        const oldMenus = document.querySelectorAll('[role="presentation"]');
        oldMenus.forEach((menu) => {
          const clone = menu.cloneNode(true);
          if (menu.parentNode) {
            menu.parentNode.replaceChild(clone, menu);
          }
        });
      },
      { once: true }
    );

    // Executar limpeza inicial
    cleanupAllPopupElements();

    // Configurar limpeza periódica
    const interval = setInterval(cleanupAllPopupElements, 2000);

    return () => {
      clearInterval(interval);
      cleanupAllPopupElements();

      // Timeout para garantir que a limpeza ocorra após a desmontagem
      setTimeout(cleanupAllPopupElements, 200);
    };
  }, []);

  // Limpar menus existentes assim que o componente for montado
  useEffect(() => {
    // Executa limpeza geral ao montar o componente
    const cleanup = () => {
      const elements = document.querySelectorAll(
        'body > .MuiPopover-root, body > .MuiMenu-root, body > [role="presentation"]'
      );
      elements.forEach((el) => {
        try {
          document.body.removeChild(el);
        } catch (e) {
          // Ignora erros
        }
      });
    };

    cleanup();

    // Também limpa quando a página é clicada
    document.body.addEventListener("click", cleanup, { once: true });

    return () => {
      document.body.removeEventListener("click", cleanup);
    };
  }, []);

  const fetchEnrolledStudents = async () => {
    try {
      setLoading(true);

      const studentCoursesRef = ref(database, "studentCourses");
      const studentCoursesSnapshot = await get(studentCoursesRef);

      const usersRef = ref(database, "users");
      const usersSnapshot = await get(usersRef);

      if (!studentCoursesSnapshot.exists() || !usersSnapshot.exists()) {
        setEnrolledStudents([]);
        setLoading(false);
        return;
      }

      const studentCoursesData = studentCoursesSnapshot.val();
      const usersData = usersSnapshot.val();

      const students = [];

      for (const userId in studentCoursesData) {
        if (
          studentCoursesData[userId] &&
          studentCoursesData[userId][courseId]
        ) {
          const userData = usersData[userId] || {};

          let userName = "Usuário Desconhecido";
          if (userData.displayName) {
            userName = userData.displayName;
          } else if (userData.firstName) {
            userName = `${userData.firstName} ${userData.lastName || ""}`;
          } else if (userData.name) {
            userName = userData.name;
          } else if (userData.email) {
            userName = userData.email.split("@")[0];
          }

          const initials = userName
            .split(" ")
            .map((part) => part.charAt(0))
            .join("")
            .toUpperCase()
            .substring(0, 2);

          students.push({
            userId,
            name: userName.trim() || `Aluno ${userId.substring(0, 5)}`,
            email: userData.email || "",
            photoURL: userData.photoURL || null,
            initials,
          });
        }
      }

      const sortedStudents = students.sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      setEnrolledStudents(sortedStudents.filter((student) => !student.email.includes("codefolio")));
    } catch (error) {
      setEnrolledStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseInfo = async () => {
    try {
      const courseRef = databaseRef(database, `courses/${courseId}`);
      const courseSnapshot = await get(courseRef);

      if (courseSnapshot.exists()) {
        const courseData = courseSnapshot.val();
        setCourseTitle(courseData.title || "Curso sem título");
      }
    } catch (error) {
      // Silenciar erro
    }
  };

  const fetchQuizResults = async () => {
    try {
      if (!courseId || !quizData?.id) {
        return;
      }

      setQuizTitle(quizData.title || "Quiz sem título");
      await initializeQuizData();

      const path = `quizGigi/courses/${courseId}/quizzes/${quizData.id}/results`;
      const resultsRef = databaseRef(database, path);

      const resultsSnapshot = await get(resultsRef);
      if (resultsSnapshot.exists()) {
        const resultsData = resultsSnapshot.val();
        setQuizResults(resultsData);
      } else {
        setQuizResults({});
      }
    } catch (error) {
      // Silenciar erro
    }
  };

  const initializeQuizData = async () => {
    try {
      if (!courseId || !quizData?.id) {
        return false;
      }

      const quizRef = databaseRef(
        database,
        `quizGigi/courses/${courseId}/quizzes/${quizData.id}`
      );

      const quizMetadata = {
        id: quizData.id,
        title: quizData.title || "Quiz sem título",
        courseId: courseId,
        courseName: courseTitle || "Curso sem título",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (quizData.questions && quizData.questions.length > 0) {
        quizMetadata.questionsData = quizData.questions.map((q, index) => ({
          id: q.id || `question_${index}`,
          text: q.question,
          correctOption: q.correctOption,
        }));
        quizMetadata.totalQuestions = quizData.questions.length;
      }

      const quizSnapshot = await get(quizRef);
      if (!quizSnapshot.exists()) {
        await set(quizRef, quizMetadata);
      } else {
        await update(quizRef, {
          updatedAt: serverTimestamp(),
          courseName: courseTitle || quizMetadata.courseName,
          title: quizData.title || quizMetadata.title,
        });
      }

      return true;
    } catch (error) {
      return false;
    }
  };

  const registerStudentAnswer = async (isCorrect, selectedOptionIndex) => {
    if (!selectedStudent || !currentQuestion) {
      return false;
    }

    try {
      const questionId =
        currentQuestion.id || `question_${currentQuestionIndex}`;
      const resultType = isCorrect ? "correctAnswers" : "wrongAnswers";

      const path = `quizGigi/courses/${courseId}/quizzes/${quizData.id}/results/${questionId}/${resultType}/${selectedStudent.userId}`;
      const answerRef = databaseRef(database, path);

      const answerData = {
        timestamp: serverTimestamp(),
        selectedOption: selectedOptionIndex,
        selectedOptionLetter: String.fromCharCode(65 + selectedOptionIndex),
        studentName: selectedStudent.name,
        photoURL: selectedStudent.photoURL || null,
        userId: selectedStudent.userId,
        isCorrect: isCorrect,
      };

      await set(answerRef, answerData);

      setQuizResults((prev) => {
        const updatedResults = { ...prev };
        if (!updatedResults[questionId]) {
          updatedResults[questionId] = {
            correctAnswers: {},
            wrongAnswers: {},
          };
        }

        if (!updatedResults[questionId][resultType]) {
          updatedResults[questionId][resultType] = {};
        }

        updatedResults[questionId][resultType][selectedStudent.userId] = {
          ...answerData,
          timestamp: Date.now(),
        };

        return updatedResults;
      });

      return true;
    } catch (error) {
      return false;
    }
  };

  const filteredStudents = searchTerm
    ? enrolledStudents.filter((student) =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    : enrolledStudents;

  const currentQuestion = quizData?.questions?.[currentQuestionIndex];

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quizData?.questions?.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedStudent(null);
      setSelectedAnswer(null);
      setShowFeedback(false);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
      setSelectedStudent(null);
      setSelectedAnswer(null);
      setShowFeedback(false);
    }
  };

  const sortStudent = () => {
    // Primeiro fechar o menu se estiver aberto
    if (menuOpen) {
      handleCloseMenu();
    }

    // Filtrar apenas os alunos que não estão desabilitados
    const enabledStudents = enrolledStudents.filter(student => !student.disabled);

    // Verificar se existem alunos habilitados
    if (enabledStudents.length > 0) {
      if (selectedStudent && selectedAnswer !== null) {
        setSelectedAnswer(null);
        setShowFeedback(false);
      }

      // Sortear apenas entre os alunos habilitados
      const randomIndex = Math.floor(Math.random() * enabledStudents.length);
      setSelectedStudent(enabledStudents[randomIndex]);
    } else {
      // Mostrar mensagem se não houver alunos habilitados
      alert("Não há alunos habilitados para sorteio. Por favor, habilite pelo menos um aluno.");
    }
  };

  // Modifique a função handleOpenMenu para alternar o estado do menu

  const handleOpenMenu = (event) => {
    // Se o menu já estiver aberto e clicar no mesmo botão, fecha o menu
    if (menuOpen && anchorEl === event.currentTarget) {
      handleCloseMenu();
      return;
    }

    // Limpar primeiro qualquer menu antigo que possa estar aberto
    const cleanupOldMenus = () => {
      const oldMenus = document.querySelectorAll(
        '[role="presentation"], .MuiPopover-root, .MuiMenu-root'
      );
      oldMenus.forEach((menu) => {
        try {
          menu.parentNode?.removeChild(menu);
        } catch (e) {
          // Silenciar erros
        }
      });
    };

    cleanupOldMenus();

    // Atualizar estado para abrir o novo menu
    setMenuOpen(true);
    setAnchorEl(event.currentTarget);

    // Adicionar listener global para detectar cliques fora do menu
    setTimeout(() => {
      document.addEventListener("mousedown", handleOutsideClick);
    }, 100);
  };

  // Adicione esta nova função para lidar com cliques fora do menu
  const handleOutsideClick = (event) => {
    // Se o menu não estiver aberto, não fazer nada
    if (!menuOpen) return;

    // Verificar se o clique foi dentro do menu ou no botão que o abriu
    const menuElement = document.querySelector(".quizgigi-menu-container");
    const isClickInsideMenu = menuElement && menuElement.contains(event.target);
    const isClickOnButton = anchorEl && anchorEl.contains(event.target);

    if (!isClickInsideMenu && !isClickOnButton) {
      handleCloseMenu();
    }
  };

  // Modifique a função handleCloseMenu para remover o event listener
  const handleCloseMenu = () => {
    setMenuOpen(false);
    setSearchTerm("");
    setAnchorEl(null);

    // Remover o event listener quando o menu fechar
    document.removeEventListener("mousedown", handleOutsideClick);

    // Timeout para garantir que todos os elementos do DOM tenham sido removidos
    setTimeout(() => {
      const orphanElements = document.querySelectorAll(
        '.MuiPopover-root, .MuiMenu-root, [role="presentation"]'
      );
      orphanElements.forEach((elem) => {
        try {
          elem.parentNode?.removeChild(elem);
        } catch (e) {
          // Silenciar erros
        }
      });
    }, 100);
  };

  const handleSelectStudent = (student) => {
    if (selectedStudent && selectedAnswer !== null) {
      setSelectedAnswer(null);
      setShowFeedback(false);
    }

    setSelectedStudent(student);
    handleCloseMenu();
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleAnswerSelect = async (index) => {
    if (!selectedStudent) {
      alert("Por favor, selecione ou sorteie um aluno primeiro!");
      return;
    }

    setSelectedAnswer(index);
    setShowFeedback(true);

    const isCorrect = isCorrectAnswer(index);

    try {
      await registerStudentAnswer(isCorrect, index);

      if (!isCorrect) {
        setTimeout(() => {
          setSelectedStudent(null);
          setSelectedAnswer(null);
          setShowFeedback(false);
        }, 2000);
      }
    } catch (error) {
      // Silenciar erro
    }
  };

  const isCorrectAnswer = (index) => {
    return currentQuestion && index === currentQuestion.correctOption;
  };

  const QuestionResultDisplay = () => {
    if (!currentQuestion) return null;

    const questionId = currentQuestion.id || `question_${currentQuestionIndex}`;
    const results = quizResults[questionId];

    if (!results) return null;

    const correctAnswers = results.correctAnswers || {};
    const hasCorrect = Object.keys(correctAnswers).length > 0;

    if (!hasCorrect) return null;

    return (
      <Box
        sx={{
          mt: 1,
          mb: 2,
          px: 2,
          py: 1.5,
          borderRadius: 2,
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
        }}
      >
        <Typography
          variant="caption"
          sx={{
            display: "block",
            mb: 1,
            color: "rgba(255, 255, 255, 0.7)",
            fontSize: "0.75rem",
          }}
        >
          {`${courseTitle || "Curso"} • ${quizTitle || "Quiz"} • Questão ${currentQuestionIndex + 1
            }`}
        </Typography>

        {hasCorrect && (
          <Box>
            <Typography
              variant="subtitle2"
              sx={{
                color: "rgba(255, 255, 255, 0.9)",
                mb: 0.5,
                display: "flex",
                alignItems: "center",
              }}
            >
              <CheckCircleOutlineIcon
                sx={{ fontSize: 18, mr: 0.5, color: "#4caf50" }}
              />
              Resposta correta:{" "}
              {String.fromCharCode(65 + currentQuestion.correctOption)}
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, ml: 2 }}>
              {Object.values(correctAnswers).map((answer, idx) => (
                <Chip
                  key={idx}
                  size="small"
                  label={answer.student?.name || answer.studentName}
                  avatar={
                    <Avatar src={answer.student?.photoURL || answer.photoURL}>
                      {(
                        answer.student?.name ||
                        answer.studentName ||
                        "?"
                      ).charAt(0)}
                    </Avatar>
                  }
                  sx={{
                    backgroundColor: "rgba(76, 175, 80, 0.3)",
                    color: "#fff",
                    fontSize: "0.8rem",
                  }}
                />
              ))}
            </Box>
          </Box>
        )}
      </Box>
    );
  };

  const handleShowSummary = () => {
    setShowSummary(true);
  };

  // Modificar o componente QuizSummary

  const QuizSummary = () => {
    return (
      <Box
        sx={{
          width: "100%",
          p: 2,
          borderRadius: 2,
          backgroundColor: "rgba(255, 255, 255, 0.15)",
          border: "1px solid rgba(255, 255, 255, 0.25)",
          mt: 2,
          mb: 4,
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 600, color: "#fff" }}>
            Resumo de Acertos do Quiz
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setShowSummary(false)}
            sx={{
              color: "#fff",
              borderColor: "rgba(255, 255, 255, 0.5)",
              "&:hover": {
                borderColor: "#fff",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
              },
            }}
          >
            Voltar
          </Button>
        </Box>

        {quizData?.questions?.map((question, index) => {
          const questionId = question.id || `question_${index}`;
          const results = quizResults[questionId] || {};
          const correctAnswers = results?.correctAnswers || {};
          const correctCount = Object.keys(correctAnswers).length;

          return (
            <Box
              key={index}
              sx={{
                mt: 2,
                p: 2,
                borderRadius: 2,
                backgroundColor: "rgba(76, 175, 80, 0.15)",
                border: "1px solid rgba(76, 175, 80, 0.3)",
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  color: "#fff",
                }}
              >
                <span style={{ fontWeight: "bold", marginRight: "8px" }}>
                  {index + 1}.
                </span>
                {question.question}
              </Typography>

              {correctCount > 0 && (
                <Box
                  sx={{ display: "flex", alignItems: "center", mt: 1, mb: 1 }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      backgroundColor: "rgba(76, 175, 80, 0.7)",
                      color: "#fff",
                      px: 1,
                      py: 0.3,
                      borderRadius: 1,
                      fontWeight: 500,
                      fontSize: "0.8rem",
                    }}
                  >
                    Resposta: {String.fromCharCode(65 + question.correctOption)}
                  </Typography>
                </Box>
              )}

              {correctCount > 0 ? (
                <Box
                  sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 1 }}
                >
                  {Object.values(correctAnswers).map((answer, idx) => (
                    <Chip
                      key={idx}
                      size="small"
                      label={answer.student?.name || answer.studentName}
                      avatar={
                        <Avatar
                          src={answer.student?.photoURL || answer.photoURL}
                        >
                          {(
                            answer.student?.name ||
                            answer.studentName ||
                            "?"
                          ).charAt(0)}
                        </Avatar>
                      }
                      sx={{
                        backgroundColor: "rgba(76, 175, 80, 0.3)",
                        color: "#fff",
                        fontSize: "0.8rem",
                      }}
                    />
                  ))}
                </Box>
              ) : (
                <Typography
                  variant="body2"
                  sx={{
                    fontStyle: "italic",
                    mt: 1,
                    color: "rgba(255, 255, 255, 0.7)",
                  }}
                >
                  Nenhum aluno acertou esta questão.
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>
    );
  };

  const handleAbleStudent = async (student) => {
    if (!student) return;

    console.log("Desabilitando aluno:", student.name);

    setEnrolledStudents((prev) =>
      prev.map((s) =>
        s.userId === student.userId
          ? { ...s, disabled: !s.disabled }
          : s
      )
    );
  }

  return (
    <ErrorBoundary
      fallback={
        <Box
          sx={{
            width: "100%",
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#700cac",
            color: "white",
          }}
        >
          <Typography variant="h5" sx={{ mb: 2 }}>
            Ocorreu um erro no quiz
          </Typography>
          <Button
            variant="contained"
            onClick={onClose}
            sx={{
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              color: "#fff",
            }}
          >
            Voltar ao curso
          </Button>
        </Box>
      }
    >
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "#700cac",
          backgroundImage: "linear-gradient(135deg, #700cac 0%, #9041c1 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          zIndex: 1399,
          p: { xs: 2, sm: 3 },
          overflow: "hidden",
        }}
      >
        <IconButton
          onClick={onClose}
          sx={{
            position: "absolute",
            top: 20,
            left: 20,
            color: "#fff",
            zIndex: 1400,
            fontSize: "1.3rem",
          }}
        >
          <CloseIcon fontSize="large" />
        </IconButton>

        <Box
          sx={{
            position: "absolute",
            top: 16,
            display: "flex",
            justifyContent: "center",
            width: "100%",
          }}
        >
          <img src={logo} alt="Codefolio Logo" style={{ height: "50px" }} />
        </Box>

        <Box
          sx={{
            width: "100%",
            maxWidth: "980px",
            height: "auto",
            maxHeight: "calc(100% - 120px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            mt: 7,
            px: { xs: 2, sm: 3 },
            overflowY: "auto",
            overflowX: "hidden",
            position: "relative",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            "&::-webkit-scrollbar": {
              display: "none",
            },
            "&::after": {
              content: '""',
              position: "fixed",
              right: 0,
              top: 0,
              width: "8px",
              height: "100vh",
              backgroundColor: "transparent",
              zIndex: 1500,
              pointerEvents: "none",
            },
            "&:hover::after": {
              backgroundColor: "rgba(255, 255, 255, 0.1)",
            },
            "&::before": {
              content: '""',
              position: "fixed",
              right: 0,
              top: 0,
              width: "8px",
              height: "0",
              backgroundColor: "rgba(255, 255, 255, 0.3)",
              borderRadius: "4px",
              opacity: 0,
              zIndex: 1501,
              transition: "opacity 0.2s",
              pointerEvents: "none",
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.4)",
              },
            },
            "&:hover::before": {
              opacity: 1,
            },
          }}
          id="quiz-content-container"
          ref={contentContainerRef}
        >
          {currentQuestion && !showSummary && (
            <Box
              sx={{
                width: "100%",
                mb: 3,
                display: "flex",
                flexDirection: "column",
                pr: { xs: 0, sm: 1 },
              }}
            >
              <Typography
                variant="h3"
                sx={{
                  fontWeight: "bold",
                  textAlign: "center",
                  mb: { xs: 3, sm: 4 },
                  fontSize: { xs: "1.6rem", sm: "2rem", md: "2.5rem" },
                  lineHeight: 1.3,
                  px: { xs: 1, sm: 2 },
                  textShadow: "0px 2px 4px rgba(0,0,0,0.2)",
                  position: "relative",
                  wordBreak: "break-word",
                  overflowWrap: "break-word",
                  whiteSpace: "normal",
                  maxWidth: "100%",
                  "&::after": {
                    content: '""',
                    position: "absolute",
                    bottom: "-10px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: { xs: "60px", sm: "80px" },
                    height: "4px",
                    backgroundColor: "#fff",
                    borderRadius: "2px",
                  },
                }}
              >
                {currentQuestion.question}
              </Typography>

              <QuestionResultDisplay />

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  mb: 2,
                  opacity: 0.9,
                  transform: "scale(0.95)",
                }}
              >
                {loading ? (
                  <Box sx={{ width: "60%", maxWidth: "400px" }}>
                    <Typography
                      variant="body2"
                      sx={{ mb: 1, textAlign: "center", fontSize: "0.9rem" }}
                    >
                      Carregando alunos...
                    </Typography>
                    <LinearProgress color="inherit" sx={{ opacity: 0.7 }} />
                  </Box>
                ) : selectedStudent ? (
                  <Paper
                    elevation={2}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      p: 1.5,
                      backgroundColor: "rgba(255, 255, 255, 0.2)",
                      borderRadius: 2,
                      maxWidth: "400px",
                      border: "1px solid rgba(255, 255, 255, 0.3)",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Avatar
                        src={selectedStudent.photoURL}
                        alt={selectedStudent.name}
                        sx={{
                          bgcolor: "rgba(255, 255, 255, 0.3)",
                          color: "#fff",
                          width: 45,
                          height: 45,
                          mr: 2,
                          fontSize: 18,
                          border: "1px solid rgba(255, 255, 255, 0.5)",
                        }}
                      >
                        {selectedStudent.initials}
                      </Avatar>
                      <Typography
                        sx={{
                          color: "#fff",
                          fontSize: "1.15rem",
                          fontWeight: 500,
                          textShadow: "0px 1px 2px rgba(0,0,0,0.2)",
                        }}
                      >
                        {selectedStudent.name}
                      </Typography>
                    </Box>
                    <Box>
                      <IconButton
                        onClick={sortStudent}
                        sx={{ color: "#fff" }}
                        title="Sortear outro aluno"
                        size="small"
                      >
                        <RefreshIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        ref={chooseButtonRef}
                        onClick={handleOpenMenu}
                        sx={{ color: "#fff", opacity: 0.8 }}
                        title="Escolher outro aluno"
                        size="small"
                      >
                        <ArrowDropDownIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Paper>
                ) : (
                  <Box
                    sx={{
                      display: "flex",
                      gap: 2,
                      justifyContent: "center",
                    }}
                  >
                    <Button
                      onClick={sortStudent}
                      variant="contained"
                      disabled={enrolledStudents.length === 0}
                      sx={{
                        backgroundColor: "rgba(255, 255, 255, 0.15)",
                        color: "#fff",
                        border: "1px solid rgba(255, 255, 255, 0.2)",
                        "&:hover": {
                          backgroundColor: "rgba(255, 255, 255, 0.25)",
                        },
                        py: 1,
                        px: 2,
                        fontSize: "0.9rem",
                      }}
                      startIcon={<RefreshIcon />}
                    >
                      Sortear
                    </Button>
                    <Button
                      ref={chooseButtonRef}
                      onClick={handleOpenMenu}
                      variant="outlined"
                      disabled={enrolledStudents.length === 0}
                      sx={{
                        color: "#fff",
                        borderColor: "rgba(255, 255, 255, 0.4)",
                        "&:hover": {
                          backgroundColor: "rgba(255, 255, 255, 0.1)",
                          borderColor: "#fff",
                        },
                        py: 1,
                        px: 2,
                        fontSize: "0.9rem",
                      }}
                      endIcon={<ArrowDropDownIcon />}
                    >
                      Escolher
                    </Button>
                  </Box>
                )}
              </Box>

              <Box
                sx={{
                  width: "100%",
                  mt: 3,
                  display: "flex",
                  flexDirection: "column",
                  gap: { xs: 1.5, sm: 2, md: 2.5 },
                  pl: 0.5,
                  pr: { xs: 0.5, sm: 1 },
                  mx: "auto",
                }}
              >
                {currentQuestion.options.map((option, index) => (
                  <Button
                    key={index}
                    variant="contained"
                    onClick={() => handleAnswerSelect(index)}
                    disabled={showFeedback && selectedAnswer !== index}
                    sx={{
                      width: "100%",
                      py: { xs: 1.8, sm: 2.5 },
                      px: { xs: 2, sm: 3 },
                      borderRadius: "12px",
                      fontSize: { xs: "0.95rem", sm: "1.1rem", md: "1.2rem" },
                      fontWeight: "normal",
                      textAlign: "left",
                      justifyContent: "flex-start",
                      position: "relative",
                      boxShadow: "0 4px 10px rgba(0, 0, 0, 0.15)",
                      transition: "all 0.2s ease-in-out",
                      overflow: "hidden",
                      mx: "auto",
                      backgroundColor: showFeedback
                        ? selectedAnswer === index
                          ? isCorrectAnswer(index)
                            ? "rgba(76, 175, 80, 0.75)"
                            : "rgba(211, 47, 47, 0.75)"
                          : isCorrectAnswer(index) && "rgba(76, 175, 80, 0.75)"
                        : "#9041c1",
                      "&:hover": {
                        backgroundColor: showFeedback
                          ? selectedAnswer === index
                            ? isCorrectAnswer(index)
                              ? "rgba(76, 175, 80, 0.8)"
                              : "rgba(211, 47, 47, 0.8)"
                            : isCorrectAnswer(index) && "rgba(76, 175, 80, 0.8)"
                          : "#7e37a6",
                        transform: !showFeedback && "translateY(-2px)",
                        boxShadow:
                          !showFeedback && "0 6px 12px rgba(0, 0, 0, 0.2)",
                      },
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "flex-start",
                        width: "100%",
                      }}
                    >
                      <Typography
                        component="span"
                        sx={{
                          backgroundColor: "rgba(255, 255, 255, 0.2)",
                          color: "#fff",
                          width: 30,
                          height: 30,
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          mr: 2,
                          flexShrink: 0,
                          mt: 0.3,
                        }}
                      >
                        {String.fromCharCode(65 + index)}
                      </Typography>
                      <Typography
                        component="span"
                        sx={{
                          flex: 1,
                          wordBreak: "break-word",
                          overflowWrap: "break-word",
                          whiteSpace: "normal",
                          lineHeight: 1.4,
                          maxWidth: "calc(100% - 50px)",
                          hyphens: "auto",
                        }}
                      >
                        {option}
                      </Typography>
                      {showFeedback && selectedAnswer === index && (
                        <Fade in={showFeedback}>
                          {isCorrectAnswer(index) ? (
                            <CheckCircleOutlineIcon
                              sx={{
                                color: "#fff",
                                ml: 2,
                                fontSize: 28,
                                flexShrink: 0,
                                mt: 0.3,
                              }}
                            />
                          ) : (
                            <CancelOutlinedIcon
                              sx={{
                                color: "#fff",
                                ml: 2,
                                fontSize: 28,
                                flexShrink: 0,
                                mt: 0.3,
                              }}
                            />
                          )}
                        </Fade>
                      )}
                    </Box>
                  </Button>
                ))}
              </Box>

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  width: "100%",
                  mt: 3,
                  mb: 3,
                  px: { xs: 0.5, sm: 1 },
                  flexWrap: "wrap",
                  gap: 1,
                }}
              >
                <Button
                  onClick={handlePreviousQuestion}
                  disabled={currentQuestionIndex === 0}
                  startIcon={<ArrowBackIosIcon sx={{ fontSize: "0.8rem" }} />}
                  sx={{
                    color: "#fff",
                    borderColor: "rgba(255, 255, 255, 0.5)",
                    border: "1px solid",
                    "&:hover": {
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                      borderColor: "#fff",
                    },
                    py: 0.6,
                    px: { xs: 1.5, sm: 2 },
                    fontSize: { xs: "0.75rem", sm: "0.9rem" },
                    borderRadius: 2,
                    opacity: 0.9,
                    minWidth: { xs: "80px", sm: "100px" },
                    height: "36px",
                    marginRight: 1,
                    mx: { xs: 0.5, sm: 0 },
                  }}
                >
                  Anterior
                </Button>

                <Box
                  sx={{
                    display: { xs: "none", sm: "flex" },
                    alignItems: "center",
                    color: "rgba(255, 255, 255, 0.8)",
                    flexGrow: 1,
                    justifyContent: "center",
                  }}
                >
                  {currentQuestionIndex + 1} /{" "}
                  {quizData?.questions?.length || 0}
                </Box>

                {currentQuestionIndex === quizData?.questions?.length - 1 ? (
                  <Button
                    onClick={handleShowSummary}
                    variant="contained"
                    sx={{
                      backgroundColor: "rgba(76, 175, 80, 0.7)",
                      color: "#fff",
                      "&:hover": {
                        backgroundColor: "rgba(76, 175, 80, 0.9)",
                      },
                      py: 0.6,
                      px: { xs: 1.5, sm: 2 },
                      fontSize: { xs: "0.75rem", sm: "0.9rem" },
                      borderRadius: 2,
                      fontWeight: 500,
                      minWidth: { xs: "80px", sm: "140px" },
                      height: "36px",
                    }}
                  >
                    Ver Resumo
                  </Button>
                ) : (
                  <Button
                    onClick={handleNextQuestion}
                    disabled={
                      !quizData ||
                      currentQuestionIndex === quizData.questions?.length - 1
                    }
                    endIcon={
                      <ArrowForwardIosIcon sx={{ fontSize: "0.8rem" }} />
                    }
                    sx={{
                      color: "#fff",
                      borderColor: "rgba(255, 255, 255, 0.5)",
                      border: "1px solid",
                      "&:hover": {
                        backgroundColor: "rgba(255, 255, 255, 0.1)",
                        borderColor: "#fff",
                      },
                      py: 0.6,
                      px: { xs: 1.5, sm: 2 },
                      fontSize: { xs: "0.75rem", sm: "0.9rem" },
                      borderRadius: 2,
                      opacity: 0.9,
                      minWidth: { xs: "80px", sm: "100px" },
                      height: "36px",
                      marginLeft: 1,
                      mx: { xs: 0.5, sm: 0 },
                    }}
                  >
                    Próxima
                  </Button>
                )}
              </Box>
            </Box>
          )}

          {showSummary && <QuizSummary />}
        </Box>

        {menuOpen && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              zIndex: 1500,
              pointerEvents: "auto",
            }}
            onClick={handleCloseMenu}
          >
            <div
              className="quizgigi-menu-container"
              style={{
                position: "absolute",
                top: anchorEl
                  ? anchorEl.getBoundingClientRect().bottom + window.scrollY
                  : 0,
                left: anchorEl
                  ? anchorEl.getBoundingClientRect().left + window.scrollX
                  : 0,
                zIndex: 1501,
                pointerEvents: "auto",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <Paper
                sx={{
                  width: "300px",
                  maxHeight: "400px",
                  display: "flex",
                  flexDirection: "column",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
                  mt: 1,
                  overflow: "hidden",
                  backgroundColor: "#fff",
                }}
              >
                <Box>
                  <Box
                    sx={{
                      p: 1.5,
                      position: "sticky",
                      top: 0,
                      backgroundColor: "white",
                      zIndex: 2,
                      borderBottom: "1px solid rgba(0,0,0,0.08)",
                    }}
                  >
                    <TextField
                      autoFocus
                      placeholder="Buscar aluno..."
                      fullWidth
                      variant="outlined"
                      size="small"
                      value={searchTerm}
                      onChange={handleSearchChange}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") handleCloseMenu();
                      }}
                    />
                  </Box>

                  <Box
                    sx={{
                      maxHeight: "300px",
                      overflow: "auto",
                      scrollbarWidth: "thin",
                      "&::-webkit-scrollbar": {
                        width: "6px",
                      },
                      "&::-webkit-scrollbar-thumb": {
                        backgroundColor: "#9041c1",
                        borderRadius: "3px",
                      },
                    }}
                  >
                    {filteredStudents.length > 0 ? (
                      filteredStudents.map((student) => (
                        <Box
                          key={student.userId}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            borderBottom: "1px solid rgba(0,0,0,0.05)",
                            "&:last-child": {
                              borderBottom: "none",
                            },
                          }}
                        >
                          <Button
                            sx={{
                              py: 1.5,
                              px: 2,
                              flex: 1,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "flex-start",
                              textAlign: "left",
                              color: "text.primary",
                              borderRadius: 0,
                              "&:hover": {
                                backgroundColor: "rgba(144, 65, 193, 0.1)",
                              },
                            }}
                            onClick={() => handleSelectStudent(student)}
                            disabled={student.disabled}
                          >
                            <Avatar
                              src={student.photoURL}
                              sx={{
                                mr: 2,
                                bgcolor: "#9041c1",
                                width: 35,
                                height: 35,
                                fontSize: 14,
                              }}
                            >
                              {student.initials}
                            </Avatar>
                            <Typography
                              sx={{
                                flex: 1,
                                whiteSpace: "normal",
                                wordBreak: "break-word",
                              }}
                            >
                              {student.name}
                            </Typography>
                          </Button>
                          <IconButton
                            sx={{ mr: 1 }}
                            onClick={() => handleAbleStudent(student)}
                          >
                            {student.disabled
                              ? <AddCircleOutlineIcon fontSize="small" sx={{ color: "green" }} />
                              : <RemoveCircleOutlineIcon fontSize="small" sx={{ color: "red" }} />}
                          </IconButton>
                        </Box>
                      ))
                    ) : (
                      <Box sx={{ py: 2, px: 2, color: "text.secondary" }}>
                        {searchTerm
                          ? "Nenhum aluno encontrado"
                          : loading
                            ? "Carregando alunos..."
                            : "Nenhum aluno disponível"}
                      </Box>
                    )}
                  </Box>
                </Box>
              </Paper>
            </div>
          </div>
        )}
      </Box>
    </ErrorBoundary>
  );
};

export default QuizGigi;
