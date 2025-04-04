import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  CircularProgress,
  Divider,
  Card,
  CardContent,
  Grid,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Collapse } from "@mui/material";
import SortIcon from "@mui/icons-material/Sort";
import { database } from "../../service/firebase";
import { ref, get } from "firebase/database";
import { useAuth } from "../../context/AuthContext";
import Topbar from "../../components/topbar/Topbar";

const capitalizeWords = (name) => {
  if (!name) return "Nome Indisponível";
  return name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const StudentDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const quizId = params.get("quizId");
  const { userDetails } = useAuth();

  const [quiz, setQuiz] = useState(null);
  const [courseData, setCourseData] = useState(null);
  const [videoData, setVideoData] = useState(null);
  const [studentResults, setStudentResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortType, setSortType] = useState("name");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedRows, setExpandedRows] = useState({});

  useEffect(() => {
    document.body.style.backgroundColor = "#f9f9f9";

    return () => {
      document.body.style.backgroundColor = "";
    };
  }, []);

  useEffect(() => {
    const fetchQuizData = async () => {
      if (!quizId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const coursesRef = ref(database, "courses");
        const coursesSnapshot = await get(coursesRef);

        if (!coursesSnapshot.exists()) {
          setLoading(false);
          return;
        }

        let foundQuiz = null;
        let foundCourse = null;
        let foundVideo = null;

        const quizzesPromises = [];
        const courseIds = [];

        // Para cada curso, verificar se contém o quiz específico
        coursesSnapshot.forEach((courseSnapshot) => {
          const courseId = courseSnapshot.key;
          const quizRef = ref(database, `courseQuizzes/${courseId}/${quizId}`);
          quizzesPromises.push(get(quizRef));
          courseIds.push(courseId);
        });

        const quizzesResults = await Promise.all(quizzesPromises);

        for (let i = 0; i < quizzesResults.length; i++) {
          if (quizzesResults[i].exists()) {
            foundQuiz = quizzesResults[i].val();
            foundQuiz.videoId = quizId;

            const courseRef = ref(database, `courses/${courseIds[i]}`);
            const courseSnapshot = await get(courseRef);

            if (courseSnapshot.exists()) {
              foundCourse = courseSnapshot.val();
              foundCourse.courseId = courseIds[i];

              const videoRef = ref(
                database,
                `courseVideos/${courseIds[i]}/${quizId}`
              );
              const videoSnapshot = await get(videoRef);

              if (videoSnapshot.exists()) {
                foundVideo = videoSnapshot.val();
                foundVideo.id = quizId;
              }

              break;
            }
          }
        }

        if (foundQuiz && foundCourse) {
          setQuiz(foundQuiz);
          setCourseData(foundCourse);
          setVideoData(foundVideo);

          await fetchStudentResults(foundCourse.courseId, quizId, foundQuiz);
        }

        setLoading(false);
      } catch (error) {
        console.error("Erro ao buscar dados do quiz:", error);
        setLoading(false);
      }
    };

    const fetchStudentResults = async (courseId, videoId, quizObj) => {
      try {
        if (!quizObj) {
          console.error("Objeto quiz não definido");
          setStudentResults([]);
          return;
        }

        const quizResultsRef = ref(database, "quizResults");
        const quizResultsSnapshot = await get(quizResultsRef);

        if (!quizResultsSnapshot.exists()) {
          setStudentResults([]);
          return;
        }

        const usersRef = ref(database, "users");
        const usersSnapshot = await get(usersRef);
        const usersData = usersSnapshot.exists() ? usersSnapshot.val() : {};

        const results = [];
        const studentsData = quizResultsSnapshot.val();

        for (const userId in studentsData) {
          if (
            studentsData[userId] &&
            studentsData[userId][courseId] &&
            studentsData[userId][courseId][videoId]
          ) {
            const quizResult = studentsData[userId][courseId][videoId];
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

            let correctAnswers = 0;
            const totalQuestionsInQuiz = quizObj.questions?.length || 0;

            const scorePercentage =
              quizResult.scorePercentage || quizResult.score || 0;

            if (quizResult.correctAnswers !== undefined) {
              correctAnswers = quizResult.correctAnswers;
            } else if (scorePercentage !== undefined) {
              correctAnswers = Math.round(
                (scorePercentage / 100) * totalQuestionsInQuiz
              );
            }

            const minPercentage = quizObj.minPercentage;
            const isPassed =
              quizResult.passed !== undefined
                ? quizResult.passed
                : quizResult.isPassed !== undefined
                  ? quizResult.isPassed
                  : scorePercentage >= minPercentage;

            // Formatar a data da última tentativa
            let lastAttemptDate = "Data não disponível";
            if (quizResult.submittedAt) {
              try {
                lastAttemptDate = new Date(
                  quizResult.submittedAt
                ).toLocaleDateString("pt-BR");
              } catch (e) {
                console.error("Erro ao formatar data submittedAt:", e);
              }
            } else if (quizResult.timestamp) {
              lastAttemptDate = new Date(
                quizResult.timestamp
              ).toLocaleDateString("pt-BR");
            } else if (quizResult.lastAttempt) {
              lastAttemptDate = new Date(
                quizResult.lastAttempt
              ).toLocaleDateString("pt-BR");
            } else if (quizResult.updatedAt) {
              lastAttemptDate = new Date(
                quizResult.updatedAt
              ).toLocaleDateString("pt-BR");
            }

            // Formatação para hora
            let lastAttemptTime = "";
            try {
              if (quizResult.submittedAt) {
                const date = new Date(quizResult.submittedAt);
                lastAttemptTime = date.toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                });
              }
            } catch (e) {
              console.error("Erro ao formatar hora submittedAt:", e);
            }

            // Combina data e hora se ambas estiverem disponíveis
            if (lastAttemptDate !== "Data não disponível" && lastAttemptTime) {
              lastAttemptDate = `${lastAttemptDate} às ${lastAttemptTime}`;
            }

            results.push({
              userId,
              name: userName.trim() || "Usuário " + userId.substring(0, 6),
              email: userData.email || "Email não disponível",
              photoURL: userData.photoURL || "",
              score: scorePercentage,
              correctAnswers,
              totalQuestions: totalQuestionsInQuiz,
              passed: isPassed,
              attemptCount: quizResult.attemptCount || "#",
              lastAttemptDate: lastAttemptDate,
              detailedAnswers: quizResult.detailedAnswers || [],
            });
          }
        }

        // Ordenar os resultados - aprovados primeiro, depois por nota mais alta
        results.sort((a, b) => {
          if (a.passed && !b.passed) return -1;
          if (!a.passed && b.passed) return 1;
          return b.score - a.score;
        });

        setStudentResults(results);
      } catch (error) {
        console.error("Erro ao buscar resultados de estudantes:", error);
        setStudentResults([]);
      }
    };

    fetchQuizData();
  }, [quizId]);

  const handleGoBack = () => {
    navigate(-1);
  };

  // Função para ordenar resultados com base no tipo de ordenação selecionado
  const getSortedResults = () => {
    if (!studentResults.length) return [];

    let results = [...studentResults];

    if (searchTerm.trim() !== "") {
      const normalizedSearchTerm = searchTerm.toLowerCase().trim();
      results = results.filter(
        (student) =>
          student.name.toLowerCase().includes(normalizedSearchTerm) ||
          student.email.toLowerCase().includes(normalizedSearchTerm)
      );
    }

    switch (sortType) {
      case "name":
        return results.sort((a, b) => a.name.localeCompare(b.name));
      case "score-high":
        return results.sort((a, b) => b.score - a.score);
      case "score-low":
        return results.sort((a, b) => a.score - b.score);
      case "date-recent":
        return results.sort((a, b) => {
          const getDateFromString = (dateStr) => {
            if (dateStr === "Data não disponível") return new Date(0);
            const datePart = dateStr.split(" às")[0];
            const [day, month, year] = datePart.split("/");
            return new Date(`${year}-${month}-${day}`);
          };

          return (
            getDateFromString(b.lastAttemptDate) -
            getDateFromString(a.lastAttemptDate)
          );
        });
      case "date-old":
        return results.sort((a, b) => {
          const getDateFromString = (dateStr) => {
            if (dateStr === "Data não disponível") return new Date(0);
            const datePart = dateStr.split(" às")[0];
            const [day, month, year] = datePart.split("/");
            return new Date(`${year}-${month}-${day}`);
          };

          return (
            getDateFromString(a.lastAttemptDate) -
            getDateFromString(b.lastAttemptDate)
          );
        });
      default:
        return results;
    }
  };

  // Função para lidar com a mudança do tipo de ordenação
  const handleSortChange = (event) => {
    setSortType(event.target.value);
  };

  const handleSearch = (searchTerm) => {
    setSearchTerm(searchTerm);
  };

  const toggleRowExpansion = (userId) => {
    setExpandedRows(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  if (loading) {
    return (
      <>
        <Topbar onSearch={handleSearch} />
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "calc(100vh - 64px)",
            flexDirection: "column",
            gap: 2,
            backgroundColor: "#f9f9f9",
          }}
        >
          <CircularProgress sx={{ color: "#9041c1" }} />
          <Typography variant="h6">Carregando dados do quiz...</Typography>
        </Box>
      </>
    );
  }

  if (!quiz || !courseData) {
    return (
      <>
        <Topbar onSearch={handleSearch} />
        <Box
          sx={{
            p: 3,
            maxWidth: 1200,
            margin: "0 auto",
            mt: 5,
            textAlign: "center",
            backgroundColor: "#f9f9f9",
          }}
        >
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h5" color="error">
              Quiz não encontrado
            </Typography>
            <Typography variant="body1" sx={{ mt: 2 }}>
              Não foi possível encontrar dados para o quiz especificado.
            </Typography>
            <Button
              startIcon={<ArrowBackIcon />}
              variant="contained"
              onClick={handleGoBack}
              sx={{
                mt: 3,
                backgroundColor: "#9041c1",
                "&:hover": { backgroundColor: "#7d37a7" },
              }}
            >
              Voltar
            </Button>
          </Paper>
        </Box>
      </>
    );
  }

  return (
    <>
      <Topbar onSearch={handleSearch} />
      <Box
        sx={{
          p: { xs: 2, sm: 3 },
          maxWidth: 1200,
          margin: "0 auto",
          mt: { xs: 2, sm: 5 },
          backgroundColor: "#f9f9f9",
          minHeight: "calc(100vh - 64px)",
        }}
      >
        <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2, mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <IconButton onClick={handleGoBack} sx={{ mr: 1, color: "#9041c1" }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h4" sx={{ fontWeight: "bold" }}>
              Dashboard de Estudantes
            </Typography>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: "100%", borderRadius: 2 }}>
                <CardContent>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: "bold", mb: 1, color: "#9041c1" }}
                  >
                    Informações do Curso
                  </Typography>
                  <Typography variant="body1">
                    <strong>Curso:</strong> {courseData.title}
                  </Typography>
                  <Typography variant="body1">
                    <strong>Descrição:</strong>{" "}
                    {courseData.description || "Sem descrição"}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ height: "100%", borderRadius: 2 }}>
                <CardContent>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: "bold", mb: 1, color: "#9041c1" }}
                  >
                    Informações do Quiz
                  </Typography>
                  <Typography variant="body1">
                    <strong>Vídeo:</strong>{" "}
                    {videoData?.title || "Video não encontrado"}
                  </Typography>
                  <Typography variant="body1">
                    <strong>Nota Mínima:</strong> {quiz.minPercentage || 0}%
                  </Typography>
                  <Typography variant="body1">
                    <strong>Total de Questões:</strong>{" "}
                    {quiz.questions?.length || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>

        <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 3,
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: "bold", color: "#333" }}>
              Resultados dos Estudantes
            </Typography>

            <Stack direction="row" spacing={2} alignItems="center">
              <SortIcon sx={{ color: "#9041c1" }} />
              <FormControl
                variant="outlined"
                size="small"
                sx={{ minWidth: 200 }}
              >
                <InputLabel id="sort-select-label">Ordenar por</InputLabel>
                <Select
                  labelId="sort-select-label"
                  id="sort-select"
                  value={sortType}
                  onChange={handleSortChange}
                  label="Ordenar por"
                  sx={{
                    borderRadius: 2,
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#9041c1",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#7d37a7",
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#9041c1",
                    },
                  }}
                >
                  <MenuItem value="name">Nome (A-Z)</MenuItem>
                  <MenuItem value="score-high">Nota (Maior-Menor)</MenuItem>
                  <MenuItem value="score-low">Nota (Menor-Maior)</MenuItem>
                  <MenuItem value="date-recent">Data (Recente-Antiga)</MenuItem>
                  <MenuItem value="date-old">Data (Antiga-Recente)</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Box>

          {studentResults.length > 0 ? (
            <TableContainer>
              <Table sx={{ minWidth: 650 }}>
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                    <TableCell sx={{ fontWeight: "bold" }}>Estudante</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Nota</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Acertos</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>
                      Tentativas
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>
                      Última Tentativa
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {getSortedResults().map((student) => (
                    <React.Fragment key={student.userId}>
                      <TableRow hover>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                            <IconButton onClick={() => toggleRowExpansion(student.userId)}>
                              {expandedRows[student.userId] ? <ExpandMoreIcon /> : <ChevronRightIcon />}
                            </IconButton>
                            <Avatar
                              src={student.photoURL}
                              alt={student.name}
                              sx={{
                                width: 40,
                                height: 40,
                                backgroundColor: "#9041c1",
                                color: "white",
                                fontWeight: "bold",
                              }}
                            >
                              {student.name.charAt(0).toUpperCase()}
                            </Avatar>
                            <Typography variant="body1">
                              {capitalizeWords(student.name)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{student.email}</TableCell>
                        <TableCell>
                          <Typography variant="body1" sx={{ fontWeight: "medium" }}>
                            {typeof student.score === "number" ? student.score.toFixed(2) : "0.00"}%
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body1"
                            sx={{
                              fontWeight: "medium",
                              color:
                                quiz.minPercentage === 0
                                  ? "#000"
                                  : student.passed
                                    ? "#2e7d32"
                                    : "#c62828",
                            }}
                            title={`Acertos: ${student.correctAnswers}, Total: ${student.totalQuestions}, Score: ${student.score}%`}
                          >
                            {student.correctAnswers !== null &&
                              student.correctAnswers !== undefined
                              ? student.correctAnswers
                              : 0}
                            /
                            {student.totalQuestions ||
                              (quiz.questions ? quiz.questions.length : 0)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box
                            sx={{
                              backgroundColor:
                                quiz.minPercentage === 0
                                  ? ""
                                  : student.passed
                                    ? "#e8f5e9"
                                    : "#ffebee",
                              color:
                                quiz.minPercentage === 0
                                  ? "#000"
                                  : student.passed
                                    ? "#2e7d32"
                                    : "#c62828",
                              borderRadius: 1,
                              px: 1,
                              py: 0.5,
                              display: "inline-block",
                              fontWeight: "bold",
                            }}
                          >
                            {quiz.minPercentage === 0
                              ? "N/A"
                              : student.passed
                                ? "Aprovado"
                                : "Reprovado"}
                          </Box>
                        </TableCell>
                        <TableCell>{student.attemptCount}</TableCell>
                        <TableCell>{student.lastAttemptDate}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
                          <Collapse in={expandedRows[student.userId]} timeout="auto" unmountOnExit>
                            <Box sx={{ margin: 2 }}>
                              <Typography variant="h6" gutterBottom component="div" sx={{ color: "#9041c1" }}>
                                Respostas Detalhadas
                              </Typography>

                              {student.detailedAnswers && student.detailedAnswers.length > 0 ? (
                                <Box sx={{ mt: 2 }}>
                                  {student.detailedAnswers.map((answer, index) => (
                                    <Paper key={index} sx={{ p: 2, mb: 2, bgcolor: answer.isCorrect ? "#e8f5e9" : "#ffebee" }}>
                                      <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                                        Questão {index + 1}: {answer.question || "Questão não disponível"}
                                      </Typography>
                                      <Typography variant="body2" sx={{ mt: 1 }}>
                                        <strong>Resposta do aluno:</strong> {answer.userAnswerText || "Não respondeu"}
                                      </Typography>
                                      <Typography variant="body2" sx={{ mt: 1 }}>
                                        <strong>Resposta correta:</strong> {answer.correctOptionText || "Não disponível"}
                                      </Typography>
                                      <Typography
                                        variant="body2"
                                        sx={{
                                          mt: 1,
                                          color: answer.isCorrect ? "#2e7d32" : "#c62828",
                                          fontWeight: "medium"
                                        }}
                                      >
                                        {answer.isCorrect ? "✓ Correto" : "✗ Incorreto"}
                                      </Typography>
                                    </Paper>
                                  ))}
                                </Box>
                              ) : (
                                <Typography variant="body1" color="textSecondary">
                                  Detalhes das respostas não disponíveis para este estudante.
                                </Typography>
                              )}
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography variant="h6" color="textSecondary">
                Nenhum estudante realizou este quiz ainda
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>
    </>
  );
};

export default StudentDashboard;
