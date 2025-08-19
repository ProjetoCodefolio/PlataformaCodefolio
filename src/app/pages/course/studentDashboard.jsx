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
  Card,
  CardContent,
  Grid,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  TextField,
  Tabs,
  Tab,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import SortIcon from "@mui/icons-material/Sort";
import { useAuth } from "$context/AuthContext";
import Topbar from "$components/topbar/Topbar";
import {
  fetchQuizData,
  capitalizeWords,
  getSortedStudentResults,
} from "$api/services/courses/studentDashboard";

const StudentDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const quizId = params.get("quizId");
  const { userDetails } = useAuth();

  // Estados para armazenar dados
  const [quiz, setQuiz] = useState(null);
  const [courseData, setCourseData] = useState(null);
  const [videoData, setVideoData] = useState(null);
  const [studentResults, setStudentResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortType, setSortType] = useState("name");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [liveQuizResults, setLiveQuizResults] = useState({});
  const [customQuizResults, setCustomQuizResults] = useState({});
  const [expandedStudentId, setExpandedStudentId] = useState(null);

  // Definir o fundo da página
  useEffect(() => {
    document.body.style.backgroundColor = "#f9f9f9";
    return () => {
      document.body.style.backgroundColor = "";
    };
  }, []);

  // Carregar dados do quiz
  useEffect(() => {
    const loadQuizData = async () => {
      if (!quizId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Usa o serviço para carregar dados do quiz e resultados dos estudantes
        const data = await fetchQuizData(quizId);

        setQuiz(data.quiz);
        setCourseData(data.courseData);
        setVideoData(data.videoData);
        setStudentResults(data.studentResults);
        setLiveQuizResults(data.liveQuizResults);
        setCustomQuizResults(data.customQuizResults);
      } catch (error) {
        console.error("Erro ao carregar dados do quiz:", error);
      } finally {
        setLoading(false);
      }
    };

    loadQuizData();
  }, [quizId]);

  // Manipuladores de eventos
  const handleGoBack = () => {
    navigate(-1);
  };

  const handleSortChange = (event) => {
    setSortType(event.target.value);
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleExpandStudent = (studentId) => {
    setExpandedStudentId(expandedStudentId === studentId ? null : studentId);
  };

  // Obter resultados ordenados e filtrados usando o serviço
  const getSortedResults = () => {
    return getSortedStudentResults(studentResults, searchTerm, sortType);
  };

  // Renderização durante carregamento
  if (loading) {
    return (
      <>
        <Topbar hideSearch={true} />
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

  // Renderização quando não encontrar o quiz
  if (!quiz || !courseData) {
    return (
      <>
        <Topbar hideSearch={true} />
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

  // Renderização principal
  return (
    <>
      <Topbar hideSearch={true} />
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
        {/* Cabeçalho */}
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

        {/* Conteúdo principal */}
        <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
          {/* Abas */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              width: "100%",
              mb: 3,
            }}
          >
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              indicatorColor="secondary"
              textColor="secondary"
              sx={{
                ".MuiTabs-indicator": {
                  backgroundColor: "#9041c1",
                },
                ".MuiTab-root.Mui-selected": {
                  color: "#9041c1",
                  fontWeight: "bold",
                },
              }}
            >
              <Tab label="Quiz" />
              <Tab label="Live Quiz" />
              <Tab label="Custom Quiz" />
            </Tabs>
          </Box>

          {/* Filtros e ordenação */}
          <Box
            sx={{
              mb: 3,
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
              <Typography
                variant="h5"
                sx={{ fontWeight: "bold", color: "#333" }}
              >
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
                    <MenuItem value="date-recent">
                      Data (Recente-Antiga)
                    </MenuItem>
                    <MenuItem value="date-old">Data (Antiga-Recente)</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </Box>

            <TextField
              fullWidth
              variant="outlined"
              size="small"
              placeholder="Buscar estudante por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{
                mb: 2,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  "& fieldset": { borderColor: "#9041c1" },
                  "&:hover fieldset": { borderColor: "#7d37a7" },
                  "&.Mui-focused fieldset": { borderColor: "#9041c1" },
                },
              }}
            />
          </Box>

          {/* Tabela de Quiz Regular */}
          {activeTab === 0 && (
            <>
              {studentResults.length > 0 ? (
                <TableContainer>
                  <Table sx={{ minWidth: 650 }}>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                        <TableCell sx={{ fontWeight: "bold" }}>
                          Estudante
                        </TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>Email</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>Nota</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>
                          Acertos
                        </TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>
                          Status
                        </TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>
                          Tentativas
                        </TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>
                          Última Tentativa
                        </TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>
                          Acertos Totais (Geral)
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {getSortedResults().map((student) => (
                        <React.Fragment key={student.userId}>
                          <TableRow hover>
                            <TableCell>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 2,
                                }}
                              >
                                <IconButton
                                  onClick={() =>
                                    handleExpandStudent(student.userId)
                                  }
                                  size="small"
                                  sx={{ color: "black" }}
                                >
                                  {expandedStudentId === student.userId ? (
                                    <KeyboardArrowDownIcon />
                                  ) : (
                                    <KeyboardArrowRightIcon />
                                  )}
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
                              <Typography
                                variant="body1"
                                sx={{ fontWeight: "medium" }}
                              >
                                {typeof student.score === "number"
                                  ? student.score.toFixed(2)
                                  : "0.00"}
                                %
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
                                      : student.onlyLiveQuiz ||
                                        student.onlyCustomQuiz ||
                                        student.lastAttemptDate ===
                                          "Não realizou o quiz"
                                      ? "#fff8e1"
                                      : student.passed
                                      ? "#e8f5e9"
                                      : "#ffebee",
                                  color:
                                    quiz.minPercentage === 0
                                      ? "#000"
                                      : student.onlyLiveQuiz ||
                                        student.onlyCustomQuiz ||
                                        student.lastAttemptDate ===
                                          "Não realizou o quiz"
                                      ? "#ff9800"
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
                                  : student.onlyLiveQuiz ||
                                    student.onlyCustomQuiz ||
                                    student.lastAttemptDate ===
                                      "Não realizou o quiz"
                                  ? "Pendente"
                                  : student.passed
                                  ? "Aprovado"
                                  : "Reprovado"}
                              </Box>
                            </TableCell>
                            <TableCell>{student.attemptCount}</TableCell>
                            <TableCell>{student.lastAttemptDate}</TableCell>
                            <TableCell>
                              <Typography
                                variant="body1"
                                sx={{ fontWeight: "bold", color: "#9041c1" }}
                              >
                                {(student.correctAnswers || 0) +
                                  (liveQuizResults[student.userId]
                                    ?.correctAnswers || 0) +
                                  (customQuizResults[student.userId]
                                    ?.correctAnswers || 0)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                          {expandedStudentId === student.userId && (
                            <TableRow>
                              <TableCell colSpan={8}>
                                <Paper
                                  elevation={0}
                                  sx={{
                                    p: 2,
                                    bgcolor: "#f9f9fa",
                                    borderRadius: 2,
                                  }}
                                >
                                  <Typography
                                    variant="h6"
                                    sx={{
                                      mb: 2,
                                      color: "#9041c1",
                                      fontWeight: "bold",
                                    }}
                                  >
                                    Respostas detalhadas de{" "}
                                    {capitalizeWords(student.name)}
                                  </Typography>

                                  {/* Verificamos se existem respostas detalhadas */}
                                  {student.detailedAnswers ? (
                                    <Box>
                                      {Object.entries(
                                        student.detailedAnswers
                                      ).map(([questionId, detail], index) => (
                                        <Box
                                          key={questionId}
                                          sx={{
                                            mb: 2,
                                            p: 1.5,
                                            bgcolor: "white",
                                            borderRadius: 1,
                                            border: "1px solid #e0e0e0",
                                          }}
                                        >
                                          <Typography
                                            variant="subtitle1"
                                            sx={{ fontWeight: 500 }}
                                          >
                                            {index + 1}. {detail.question}
                                          </Typography>

                                          <Box
                                            sx={{
                                              mt: 1,
                                              display: "flex",
                                              flexDirection: "column",
                                              gap: 1.5,
                                            }}
                                          >
                                            <Box
                                              sx={{
                                                p: 1.5,
                                                borderRadius: 1,
                                                backgroundColor:
                                                  detail.isCorrect
                                                    ? "rgba(76, 175, 80, 0.15)"
                                                    : "rgba(211, 47, 47, 0.12)",
                                                border: `1px solid ${
                                                  detail.isCorrect
                                                    ? "rgba(76, 175, 80, 0.5)"
                                                    : "rgba(211, 47, 47, 0.5)"
                                                }`,
                                              }}
                                            >
                                              <Typography
                                                variant="body2"
                                                sx={{
                                                  fontWeight: 500,
                                                  display: "flex",
                                                  alignItems: "center",
                                                  gap: 0.5,
                                                  color: detail.isCorrect
                                                    ? "#2e7d32"
                                                    : "#c62828",
                                                }}
                                              >
                                                {detail.isCorrect ? "✓" : "✗"}{" "}
                                                Resposta do aluno:{" "}
                                                <Box
                                                  component="span"
                                                  sx={{ fontWeight: 600 }}
                                                >
                                                  {detail.userAnswerText}
                                                </Box>
                                              </Typography>
                                            </Box>

                                            {!detail.isCorrect && (
                                              <Box
                                                sx={{
                                                  p: 1.5,
                                                  borderRadius: 1,
                                                  backgroundColor:
                                                    "rgba(76, 175, 80, 0.12)",
                                                  border:
                                                    "1px solid rgba(76, 175, 80, 0.5)",
                                                }}
                                              >
                                                <Typography
                                                  variant="body2"
                                                  sx={{
                                                    fontWeight: 500,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 0.5,
                                                    color: "#2e7d32",
                                                  }}
                                                >
                                                  ✓ Resposta correta:{" "}
                                                  <Box
                                                    component="span"
                                                    sx={{ fontWeight: 600 }}
                                                  >
                                                    {detail.correctOptionText}
                                                  </Box>
                                                </Typography>
                                              </Box>
                                            )}
                                          </Box>
                                        </Box>
                                      ))}
                                    </Box>
                                  ) : (
                                    <Typography
                                      variant="body1"
                                      color="text.secondary"
                                    >
                                      Nenhuma resposta detalhada disponível para
                                      este estudante.
                                    </Typography>
                                  )}
                                </Paper>
                              </TableCell>
                            </TableRow>
                          )}
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
            </>
          )}

          {/* Tabela de Live Quiz */}
          {activeTab === 1 && (
            <>
              {studentResults.length > 0 ? (
                <TableContainer>
                  <Table sx={{ minWidth: 650 }}>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                        <TableCell sx={{ fontWeight: "bold" }}>
                          Estudante
                        </TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>Email</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>
                          Acertos
                        </TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>Erros</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>
                          Vezes Sorteado
                        </TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>
                          Taxa de Acerto
                        </TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>
                          Acertos Totais (Live + Custom)
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {getSortedResults().map((student) => {
                        const studentLiveData =
                          liveQuizResults[student.userId] || {};

                        const correctAnswers =
                          studentLiveData.correctAnswers || 0;
                        const wrongAnswers = studentLiveData.wrongAnswers || 0;
                        const totalAnswered = correctAnswers + wrongAnswers;
                        const successRate =
                          totalAnswered > 0
                            ? Math.round((correctAnswers / totalAnswered) * 100)
                            : 0;

                        const totalCorrectAnswers =
                          (liveQuizResults[student.userId]?.correctAnswers ||
                            0) +
                          (customQuizResults[student.userId]?.correctAnswers ||
                            0);

                        return (
                          <TableRow key={student.userId} hover>
                            <TableCell>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 2,
                                }}
                              >
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
                              <Typography
                                variant="body1"
                                sx={{ fontWeight: "medium" }}
                              >
                                {correctAnswers}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography
                                variant="body1"
                                sx={{ fontWeight: "medium" }}
                              >
                                {wrongAnswers}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography
                                variant="body1"
                                sx={{
                                  fontWeight: "bold",
                                  color:
                                    studentLiveData.timesDraw > 0
                                      ? "#ff9800"
                                      : "inherit",
                                }}
                              >
                                {studentLiveData.timesDraw || 0}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                }}
                              >
                                <Typography
                                  variant="body1"
                                  sx={{
                                    fontWeight: "medium",
                                    color:
                                      successRate > 50 ? "#2e7d32" : "#c62828",
                                  }}
                                >
                                  {successRate}%
                                </Typography>
                                <Box
                                  sx={{
                                    ml: 1,
                                    width: 50,
                                    backgroundColor: "rgba(0,0,0,0.1)",
                                    height: 6,
                                    borderRadius: 3,
                                    position: "relative",
                                    overflow: "hidden",
                                  }}
                                >
                                  <Box
                                    sx={{
                                      position: "absolute",
                                      top: 0,
                                      left: 0,
                                      height: "100%",
                                      width: `${successRate}%`,
                                      backgroundColor:
                                        successRate > 50
                                          ? "#2e7d32"
                                          : "#c62828",
                                    }}
                                  />
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography
                                variant="body1"
                                sx={{ fontWeight: "bold", color: "#2e7d32" }}
                              >
                                {totalCorrectAnswers}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <Typography variant="h6" color="textSecondary">
                    Nenhum estudante participou de Live Quiz ainda
                  </Typography>
                </Box>
              )}
            </>
          )}

          {/* Tabela de Custom Quiz */}
          {activeTab === 2 && (
            <>
              {studentResults.length > 0 ? (
                <TableContainer>
                  <Table sx={{ minWidth: 650 }}>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                        <TableCell sx={{ fontWeight: "bold" }}>
                          Estudante
                        </TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>Email</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>
                          Acertos
                        </TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>Erros</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>
                          Vezes Sorteado
                        </TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>
                          Taxa de Acerto
                        </TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>
                          Acertos Totais (Live + Custom)
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {getSortedResults().map((student) => {
                        const studentCustomData =
                          customQuizResults[student.userId] || {};

                        const correctAnswers =
                          studentCustomData.correctAnswers || 0;
                        const wrongAnswers =
                          studentCustomData.wrongAnswers || 0;
                        const totalAnswered = correctAnswers + wrongAnswers;
                        const successRate =
                          totalAnswered > 0
                            ? Math.round((correctAnswers / totalAnswered) * 100)
                            : 0;

                        const totalCorrectAnswers =
                          (liveQuizResults[student.userId]?.correctAnswers ||
                            0) +
                          (customQuizResults[student.userId]?.correctAnswers ||
                            0);

                        return (
                          <TableRow key={student.userId} hover>
                            <TableCell>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 2,
                                }}
                              >
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
                              <Typography
                                variant="body1"
                                sx={{
                                  fontWeight: "medium",
                                  color: "#2e7d32",
                                }}
                              >
                                {correctAnswers}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography
                                variant="body1"
                                sx={{
                                  fontWeight: "medium",
                                  color: "#c62828",
                                }}
                              >
                                {wrongAnswers}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography
                                variant="body1"
                                sx={{
                                  fontWeight: "bold",
                                  color:
                                    studentCustomData.timesDraw > 0
                                      ? "#ff9800"
                                      : "inherit",
                                }}
                              >
                                {studentCustomData.timesDraw || 0}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                <Typography variant="body1">
                                  {successRate}%
                                </Typography>
                                <Box
                                  sx={{
                                    width: 60,
                                    height: 8,
                                    borderRadius: 4,
                                    backgroundColor: "#f0f0f0",
                                    overflow: "hidden",
                                  }}
                                >
                                  <Box
                                    sx={{
                                      height: "100%",
                                      width: `${successRate}%`,
                                      backgroundColor:
                                        successRate >= 80
                                          ? "#2e7d32"
                                          : successRate >= 50
                                          ? "#ff9800"
                                          : "#c62828",
                                    }}
                                  />
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography
                                variant="body1"
                                sx={{ fontWeight: "bold", color: "#2e7d32" }}
                              >
                                {totalCorrectAnswers}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <Typography variant="h6" color="textSecondary">
                    Nenhum estudante participou de Custom Quiz ainda
                  </Typography>
                </Box>
              )}
            </>
          )}
        </Paper>
      </Box>
    </>
  );
};

// Substitua o componente de exibição de resposta detalhada pelo seguinte:

const QuestionAnswer = ({ question, userAnswer, index }) => {
  const { id, question: questionText, options, correctOption, userAnswer: userChoice, isCorrect } = question;
  
  return (
    <div className="question-container mb-6 p-4 border rounded-lg bg-white shadow-sm">
      <h3 className="text-lg font-medium mb-2">
        {index + 1}. {questionText}
      </h3>
      
      <div className="options-list mt-3">
        {Object.entries(options).map(([optionKey, optionText]) => {
          const isUserChoice = userChoice === optionKey || userAnswer === optionKey;
          const isCorrectOption = correctOption === optionKey;
          
          // Define as classes CSS para cada opção
          let optionClass = "flex items-start p-2 rounded-md mb-2";
          
          if (isUserChoice) {
            optionClass += isCorrect 
              ? " bg-green-100 border border-green-300" 
              : " bg-red-100 border border-red-300";
          } else if (isCorrectOption) {
            optionClass += " border border-green-300";
          } else {
            optionClass += " border border-gray-200";
          }
          
          return (
            <div key={optionKey} className={optionClass}>
              <div className="flex-shrink-0 mr-2 mt-0.5">
                {isUserChoice ? (
                  isCorrect ? (
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )
                ) : (
                  <div className="w-5 h-5 border border-gray-300 rounded-full"></div>
                )}
              </div>
              <div className="flex-grow">
                <p className={`${isUserChoice && isCorrect ? "text-green-700" : isUserChoice ? "text-red-700" : ""}`}>
                  {optionText}
                </p>
                {isUserChoice && !isCorrect && isCorrectOption && (
                  <p className="text-sm text-red-600 mt-1">
                    Resposta incorreta
                  </p>
                )}
                {isCorrectOption && !isUserChoice && (
                  <p className="text-sm text-green-600 mt-1">
                    Resposta correta
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-2">
        <p className={`text-sm font-medium ${isCorrect ? "text-green-600" : "text-red-600"}`}>
          {isCorrect ? "✓ Você acertou esta questão" : "✗ Você errou esta questão"}
        </p>
      </div>
    </div>
  );
};

// Componente principal que renderiza todas as respostas
const StudentQuizResultDetails = ({ studentResult }) => {
  if (!studentResult || !studentResult.detailedAnswers) {
    return <div className="p-4 text-center">Não há detalhes disponíveis para este resultado</div>;
  }

  const questionsWithAnswers = Object.entries(studentResult.detailedAnswers).map(([id, question]) => ({
    ...question,
    id,
  }));

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">
        Respostas detalhadas de {studentResult.name}
      </h2>
      
      {questionsWithAnswers.map((question, index) => (
        <QuestionAnswer 
          key={question.id} 
          question={question} 
          userAnswer={question.userAnswer}
          index={index}
        />
      ))}
    </div>
  );
};

export default StudentDashboard;
