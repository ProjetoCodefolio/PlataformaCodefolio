import React, { useCallback, useEffect, useState } from "react";
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
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { useTheme, useMediaQuery } from '@mui/material';
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import SortIcon from "@mui/icons-material/Sort";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import { toast } from "react-toastify";
import { useAuth } from "$context/AuthContext";
import Topbar from "$components/topbar/Topbar";
import {
  fetchQuizData,
  capitalizeWords,
  getSortedStudentResults,
} from "$api/services/courses/studentDashboard";
import { recalculateQuizResults } from "$api/services/courses/quizzes";
import { canAssignGrades } from "$api/utils/permissions";
import SortableHeader from "$components/common/SortableHeader";
import { sortRows, getNextSort } from "$utils/tableSort";

const StudentDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const quizId = params.get("quizId");
  const { userDetails } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Estados para armazenar dados
  const [quiz, setQuiz] = useState(null);
  const [courseData, setCourseData] = useState(null);
  const [videoData, setVideoData] = useState(null);
  const [studentResults, setStudentResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortType, setSortType] = useState("name");
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [liveQuizResults, setLiveQuizResults] = useState({});
  const [customQuizResults, setCustomQuizResults] = useState({});
  const [expandedStudentId, setExpandedStudentId] = useState(null);
  // Recálculo das notas depois que o professor corrige uma questão.
  // 'idle' | 'previewing' (simulando) | 'confirming' | 'applying'
  const [recalcState, setRecalcState] = useState("idle");
  const [recalcPreview, setRecalcPreview] = useState(null);
  // Recarga após o recálculo: separada de `loading` para a tela não virar um
  // spinner de página inteira e o professor não perder o contexto.
  const [refreshing, setRefreshing] = useState(false);

  // Só o dono do curso (ou admin) recalcula — é o que as regras do banco
  // permitem escrever em quizResults de outro usuário.
  const canRecalculate = canAssignGrades(userDetails, courseData?.userId);

  // Definir o fundo da página
  useEffect(() => {
    document.body.style.backgroundColor = "#f9f9f9";
    return () => {
      document.body.style.backgroundColor = "";
    };
  }, []);

  // Carregar dados do quiz. Extraído do efeito porque o recálculo de notas
  // também precisa reler os resultados depois de gravar.
  const loadQuizData = useCallback(
    async ({ silent = false } = {}) => {
      if (!quizId) {
        setLoading(false);
        return;
      }

      try {
        if (silent) setRefreshing(true);
        else setLoading(true);

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
        setRefreshing(false);
        setLoading(false);
      }
    },
    [quizId]
  );

  useEffect(() => {
    loadQuizData();
  }, [loadQuizData]);

  // --- Recálculo das notas ---

  // Primeiro passo: simula o recálculo (sem escrever) para o professor decidir
  // com os números na frente, em vez de confirmar às cegas.
  const handleOpenRecalculate = async () => {
    setRecalcState("previewing");

    const result = await recalculateQuizResults(courseData?.courseId, quizId, {
      actorUserId: userDetails?.userId,
      dryRun: true,
    });

    if (!result.success) {
      setRecalcState("idle");
      toast.error(result.error || "Não foi possível simular o recálculo.");
      return;
    }

    if (result.report.updated === 0) {
      setRecalcState("idle");
      toast.info("As notas já estão atualizadas — nada a recalcular.");
      return;
    }

    setRecalcPreview(result.report);
    setRecalcState("confirming");
  };

  const handleConfirmRecalculate = async () => {
    setRecalcState("applying");

    const result = await recalculateQuizResults(courseData?.courseId, quizId, {
      actorUserId: userDetails?.userId,
    });

    if (!result.success) {
      setRecalcState("confirming");
      toast.error(result.error || "Não foi possível recalcular as notas.");
      return;
    }

    const { updated, errors } = result.report;
    toast.success(
      `Notas recalculadas: ${updated} aluno(s) atualizado(s).` +
        (errors.length > 0 ? ` ${errors.length} falharam.` : "")
    );

    setRecalcState("idle");
    setRecalcPreview(null);
    await loadQuizData({ silent: true });
  };

  const handleCloseRecalculate = () => {
    if (recalcState === "applying") return;
    setRecalcState("idle");
    setRecalcPreview(null);
  };

  // Manipuladores de eventos
  const handleGoBack = () => {
    navigate(`/adm-cursos?courseId=${courseData?.courseId}&tab=2`);
  };

  const handleSortChange = (event) => {
    setSortType(event.target.value);
    // O dropdown e os cabeçalhos compartilham a mesma lista: ao usar o dropdown,
    // devolvemos o controle da ordenação a ele limpando o sort por cabeçalho.
    setSortField("");
  };

  // Ordenação por clique no cabeçalho (sobrepõe o dropdown enquanto ativa)
  const handleSort = (field) => {
    const next = getNextSort({ sortField, sortOrder }, field);
    setSortField(next.sortField);
    setSortOrder(next.sortOrder);
  };

  // Acessores para colunas derivadas da tabela principal (status e total geral)
  const dashboardSortAccessors = {
    status: (s) => (s.passed ? 1 : 0),
    totalCorrect: (s) =>
      (s.correctAnswers || 0) +
      (liveQuizResults[s.userId]?.correctAnswers || 0) +
      (customQuizResults[s.userId]?.correctAnswers || 0),
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

  // Lista final exibida nas tabelas: aplica o sort por cabeçalho sobre o
  // resultado do serviço (que já faz busca + ordenação do dropdown). Quando
  // nenhum cabeçalho está ativo (sortField vazio), mantém a ordem do serviço.
  const sortedResults = sortField
    ? sortRows(getSortedResults(), sortField, sortOrder, dashboardSortAccessors)
    : getSortedResults();

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
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: "bold",
                fontSize: { xs: '1.25rem', sm: '1.75rem', md: '2.125rem' }
              }}
            >
              Dashboard de Estudantes
            </Typography>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: "100%", borderRadius: 2 }}>
                <CardContent>
                  <Typography
                    variant="h6"
                    sx={{ 
                      fontWeight: "bold", 
                      mb: 1, 
                      color: "#9041c1",
                      fontSize: { xs: '1rem', sm: '1.15rem', md: '1.25rem' }
                    }}
                  >
                    Informações do Curso
                  </Typography>
                  <Typography 
                    variant="body1"
                    sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                  >
                    <strong>Curso:</strong> {courseData.title}
                  </Typography>
                  <Typography 
                    variant="body1"
                    sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                  >
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
                    sx={{ 
                      fontWeight: "bold", 
                      mb: 1, 
                      color: "#9041c1",
                      fontSize: { xs: '1rem', sm: '1.15rem', md: '1.25rem' }
                    }}
                  >
                    Informações do Quiz
                  </Typography>
                  <Typography 
                    variant="body1"
                    sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                  >
                    <strong>{videoData?.isSlide ? "Slide:" : "Vídeo:"}</strong>{" "}
                    {videoData?.title || (videoData?.isSlide ? "Slide não encontrado" : "Video não encontrado")}
                  </Typography>
                  <Typography 
                    variant="body1"
                    sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                  >
                    <strong>Nota Mínima:</strong> {quiz.minPercentage || 0}%
                  </Typography>
                  <Typography 
                    variant="body1"
                    sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                  >
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
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: "space-between",
                alignItems: { xs: 'flex-start', sm: 'center' },
                gap: { xs: 2, sm: 0 },
                mb: 2,
              }}
            >
              <Typography
                variant="h5"
                sx={{ 
                  fontWeight: "bold", 
                  color: "#333",
                  fontSize: { xs: '1.125rem', sm: '1.25rem', md: '1.5rem' }
                }}
              >
                Resultados dos Estudantes
              </Typography>

              <Stack 
                direction="row" 
                spacing={2} 
                alignItems="center"
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                {activeTab === 0 && canRecalculate && studentResults.length > 0 && (
                  <Button
                    variant="outlined"
                    startIcon={
                      recalcState === "previewing" ? (
                        <CircularProgress size={16} sx={{ color: "#9041c1" }} />
                      ) : (
                        <AutorenewIcon />
                      )
                    }
                    onClick={handleOpenRecalculate}
                    disabled={recalcState !== "idle" || refreshing}
                    sx={{
                      whiteSpace: "nowrap",
                      textTransform: "none",
                      borderColor: "#9041c1",
                      color: "#9041c1",
                      "&:hover": {
                        borderColor: "#7d37a7",
                        backgroundColor: "rgba(144, 65, 193, 0.06)",
                      },
                    }}
                  >
                    Recalcular notas
                  </Button>
                )}
                <SortIcon sx={{ color: "#9041c1", display: { xs: 'none', sm: 'block' } }} />
                <FormControl
                  variant="outlined"
                  size="small"
                  sx={{ minWidth: { xs: '100%', sm: 200 } }}
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

          {/* Tabela de Quiz Regular - Desktop */}
          {activeTab === 0 && (
            <Box>
              {studentResults.length > 0 ? (
                <>
                  {/* Desktop Table */}
                  <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
                  <Table sx={{ minWidth: 650 }}>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                        <SortableHeader label="Estudante" field="name" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
                        <SortableHeader label="Email" field="email" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
                        <SortableHeader label="Nota" field="score" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
                        <SortableHeader label="Acertos" field="correctAnswers" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
                        <SortableHeader label="Status" field="status" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
                        <SortableHeader label="Tentativas" field="attemptCount" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
                        <SortableHeader label="Última Tentativa" field="lastAttemptDate" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
                        <SortableHeader label="Acertos Totais (Geral)" field="totalCorrect" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sortedResults.map((student) => (
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
                                <StudentAnswersDetail student={student} />
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Mobile Cards */}
                <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                  <Stack spacing={2}>
                    {sortedResults.map((student) => (
                      <Card
                        key={student.userId}
                        sx={{
                          borderRadius: 2,
                          boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
                        }}
                      >
                        <CardContent sx={{ p: 2 }}>
                          {/* Cabeçalho */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <IconButton
                              onClick={() => handleExpandStudent(student.userId)}
                              size="small"
                              sx={{ color: "black", ml: -1 }}
                              aria-label={`Ver respostas detalhadas de ${student.name}`}
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
                                width: 50,
                                height: 50,
                                backgroundColor: "#9041c1",
                              }}
                            >
                              {student.name.charAt(0).toUpperCase()}
                            </Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography 
                                variant="body1" 
                                sx={{ 
                                  fontWeight: 600,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {capitalizeWords(student.name)}
                              </Typography>
                              <Typography 
                                variant="caption" 
                                color="text.secondary"
                                sx={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  display: 'block'
                                }}
                              >
                                {student.email}
                              </Typography>
                            </Box>
                            <Chip
                              label={
                                quiz.minPercentage === 0
                                  ? "N/A"
                                  : student.onlyLiveQuiz ||
                                    student.onlyCustomQuiz ||
                                    student.lastAttemptDate === "Não realizou o quiz"
                                  ? "Pendente"
                                  : student.passed
                                  ? "Aprovado"
                                  : "Reprovado"
                              }
                              color={
                                quiz.minPercentage === 0
                                  ? "default"
                                  : student.passed
                                  ? "success"
                                  : student.onlyLiveQuiz ||
                                    student.onlyCustomQuiz ||
                                    student.lastAttemptDate === "Não realizou o quiz"
                                  ? "warning"
                                  : "error"
                              }
                              size="small"
                              sx={{ fontWeight: "bold" }}
                            />
                          </Box>

                          <Divider sx={{ my: 1.5 }} />

                          {/* Informações */}
                          <Grid container spacing={1.5}>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary">
                                Nota
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
                                {typeof student.score === "number" ? student.score.toFixed(2) : "0.00"}%
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary">
                                Acertos
                              </Typography>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  fontWeight: 600,
                                  fontSize: '1.1rem',
                                  color:
                                    quiz.minPercentage === 0
                                      ? "#000"
                                      : student.passed
                                      ? "#2e7d32"
                                      : "#c62828",
                                }}
                              >
                                {student.correctAnswers !== null && student.correctAnswers !== undefined
                                  ? student.correctAnswers
                                  : 0}
                                /{student.totalQuestions || (quiz.questions ? quiz.questions.length : 0)}
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary">
                                Tentativas
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {student.attemptCount}
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary">
                                Acertos Totais
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 500, color: "#9041c1" }}>
                                {(student.correctAnswers || 0) +
                                  (liveQuizResults[student.userId]?.correctAnswers || 0) +
                                  (customQuizResults[student.userId]?.correctAnswers || 0)}
                              </Typography>
                            </Grid>
                            <Grid item xs={12}>
                              <Typography variant="caption" color="text.secondary">
                                Última Tentativa
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {student.lastAttemptDate}
                              </Typography>
                            </Grid>
                          </Grid>
                          {expandedStudentId === student.userId && (
                            <Box sx={{ mt: 2 }}>
                              <StudentAnswersDetail student={student} />
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                </Box>
              </>
            ) : (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <Typography variant="h6" color="textSecondary">
                  Nenhum estudante realizou este quiz ainda
                </Typography>
              </Box>
            )}
          </Box>
        )}

          {/* Tabela de Live Quiz */}
          {activeTab === 1 && (
            <Box>
              {studentResults.length > 0 ? (
                <>
                  {/* Desktop Table */}
                  <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
                  <Table sx={{ minWidth: 650 }}>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                        <SortableHeader label="Estudante" field="name" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
                        <SortableHeader label="Email" field="email" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
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
                      {sortedResults.map((student) => {
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

                {/* Mobile Cards - Live Quiz */}
                <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                  <Stack spacing={2}>
                    {sortedResults.map((student) => {
                      const studentLiveData = liveQuizResults[student.userId] || {};
                      const correctAnswers = studentLiveData.correctAnswers || 0;
                      const wrongAnswers = studentLiveData.wrongAnswers || 0;
                      const totalAnswered = correctAnswers + wrongAnswers;
                      const successRate = totalAnswered > 0 ? Math.round((correctAnswers / totalAnswered) * 100) : 0;
                      const totalCorrectAnswers = (liveQuizResults[student.userId]?.correctAnswers || 0) + (customQuizResults[student.userId]?.correctAnswers || 0);

                      return (
                        <Card
                          key={student.userId}
                          sx={{ borderRadius: 2, boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)" }}
                        >
                          <CardContent sx={{ p: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                              <Avatar src={student.photoURL} alt={student.name} sx={{ width: 50, height: 50, backgroundColor: "#9041c1" }}>
                                {student.name.charAt(0).toUpperCase()}
                              </Avatar>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="body1" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {capitalizeWords(student.name)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                                  {student.email}
                                </Typography>
                              </Box>
                            </Box>
                            <Divider sx={{ my: 1.5 }} />
                            <Grid container spacing={1.5}>
                              <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary">Acertos</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '1.1rem', color: '#2e7d32' }}>{correctAnswers}</Typography>
                              </Grid>
                              <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary">Erros</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '1.1rem', color: '#c62828' }}>{wrongAnswers}</Typography>
                              </Grid>
                              <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary">Vezes Sorteado</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: studentLiveData.timesDraw > 0 ? '#ff9800' : 'inherit' }}>
                                  {studentLiveData.timesDraw || 0}
                                </Typography>
                              </Grid>
                              <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary">Taxa de Acerto</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 600, color: successRate > 50 ? '#2e7d32' : '#c62828' }}>{successRate}%</Typography>
                                  <Box sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: 'rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                                    <Box sx={{ height: '100%', width: `${successRate}%`, bgcolor: successRate > 50 ? '#2e7d32' : '#c62828' }} />
                                  </Box>
                                </Box>
                              </Grid>
                              <Grid item xs={12}>
                                <Typography variant="caption" color="text.secondary">Acertos Totais (Live + Custom)</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: '#2e7d32', fontSize: '1.1rem' }}>{totalCorrectAnswers}</Typography>
                              </Grid>
                            </Grid>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Stack>
                </Box>
              </>
              ) : (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <Typography variant="h6" color="textSecondary">
                    Nenhum estudante participou de Live Quiz ainda
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Tabela de Custom Quiz */}
          {activeTab === 2 && (
            <Box>
              {studentResults.length > 0 ? (
                <>
                  {/* Desktop Table */}
                  <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
                  <Table sx={{ minWidth: 650 }}>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                        <SortableHeader label="Estudante" field="name" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
                        <SortableHeader label="Email" field="email" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
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
                      {sortedResults.map((student) => {
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

                {/* Mobile Cards - Custom Quiz */}
                <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                  <Stack spacing={2}>
                    {sortedResults.map((student) => {
                      const studentCustomData = customQuizResults[student.userId] || {};
                      const correctAnswers = studentCustomData.correctAnswers || 0;
                      const wrongAnswers = studentCustomData.wrongAnswers || 0;
                      const totalAnswered = correctAnswers + wrongAnswers;
                      const successRate = totalAnswered > 0 ? Math.round((correctAnswers / totalAnswered) * 100) : 0;
                      const totalCorrectAnswers = (liveQuizResults[student.userId]?.correctAnswers || 0) + (customQuizResults[student.userId]?.correctAnswers || 0);

                      return (
                        <Card
                          key={student.userId}
                          sx={{ borderRadius: 2, boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)" }}
                        >
                          <CardContent sx={{ p: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                              <Avatar src={student.photoURL} alt={student.name} sx={{ width: 50, height: 50, backgroundColor: "#9041c1" }}>
                                {student.name.charAt(0).toUpperCase()}
                              </Avatar>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="body1" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {capitalizeWords(student.name)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                                  {student.email}
                                </Typography>
                              </Box>
                            </Box>
                            <Divider sx={{ my: 1.5 }} />
                            <Grid container spacing={1.5}>
                              <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary">Acertos</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '1.1rem', color: '#2e7d32' }}>{correctAnswers}</Typography>
                              </Grid>
                              <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary">Erros</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '1.1rem', color: '#c62828' }}>{wrongAnswers}</Typography>
                              </Grid>
                              <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary">Vezes Sorteado</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: studentCustomData.timesDraw > 0 ? '#ff9800' : 'inherit' }}>
                                  {studentCustomData.timesDraw || 0}
                                </Typography>
                              </Grid>
                              <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary">Taxa de Acerto</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{successRate}%</Typography>
                                  <Box sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: '#f0f0f0', overflow: 'hidden' }}>
                                    <Box sx={{ height: '100%', width: `${successRate}%`, bgcolor: successRate >= 80 ? '#2e7d32' : successRate >= 50 ? '#ff9800' : '#c62828' }} />
                                  </Box>
                                </Box>
                              </Grid>
                              <Grid item xs={12}>
                                <Typography variant="caption" color="text.secondary">Acertos Totais (Live + Custom)</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: '#2e7d32', fontSize: '1.1rem' }}>{totalCorrectAnswers}</Typography>
                              </Grid>
                            </Grid>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Stack>
                </Box>
              </>
              ) : (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <Typography variant="h6" color="textSecondary">
                    Nenhum estudante participou de Custom Quiz ainda
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Paper>

        {/* Confirmação do recálculo, com a prévia do que muda */}
        <Dialog
          open={recalcState === "confirming" || recalcState === "applying"}
          onClose={handleCloseRecalculate}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ fontWeight: "bold" }}>
            Recalcular as notas deste quiz?
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2">
              As respostas já enviadas por{" "}
              <strong>{recalcPreview?.processed || 0} aluno(s)</strong> serão
              reavaliadas contra as{" "}
              <strong>
                {recalcPreview?.multipleChoiceQuestions || 0} questão(ões) de
                múltipla escolha
              </strong>{" "}
              atuais e a nota mínima de{" "}
              <strong>{recalcPreview?.minPercentage || 0}%</strong>.
            </Typography>

            <Box component="ul" sx={{ pl: 2.5, mt: 1.5, mb: 1.5 }}>
              <Typography component="li" variant="body2">
                <strong>{recalcPreview?.updated || 0}</strong> aluno(s) mudam de nota
              </Typography>
              <Typography component="li" variant="body2">
                <strong>{recalcPreview?.promoted || 0}</strong> passam a ser aprovados
              </Typography>
              {(recalcPreview?.keptPassed || 0) > 0 && (
                <Typography component="li" variant="body2">
                  <strong>{recalcPreview.keptPassed}</strong> ficam com a nota
                  abaixo do mínimo, mas mantêm a aprovação (não perdem acesso ao
                  conteúdo já liberado)
                </Typography>
              )}
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
              Tentativas usadas, datas de envio e as respostas do aluno não são
              alteradas.
            </Typography>

            {(recalcPreview?.ambiguousAnswers || 0) > 0 && (
              <Typography
                variant="caption"
                sx={{ display: "block", mt: 1, color: "#b26a00" }}
              >
                ⚠ {recalcPreview.ambiguousAnswers} resposta(s) não puderam ser
                reconhecidas com certeza (alternativa editada): foi mantida a
                alternativa pela posição original. Confira
                {recalcPreview.studentsWithAmbiguity?.length > 0
                  ? `: ${recalcPreview.studentsWithAmbiguity.join(", ")}`
                  : "."}
              </Typography>
            )}

            {(recalcPreview?.orphanAnswers || 0) > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                {recalcPreview.orphanAnswers} resposta(s) se referem a questões
                removidas do quiz: ficam registradas, mas não contam mais na nota.
              </Typography>
            )}

            {(recalcPreview?.unansweredQuestions || 0) > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                {recalcPreview.unansweredQuestions} questão(ões) sem resposta
                (acrescentadas depois da tentativa) contam como erro.
              </Typography>
            )}

            {(recalcPreview?.skipped || 0) > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                {recalcPreview.skipped} resultado(s) antigos, sem respostas
                gravadas, ficam de fora do recálculo.
              </Typography>
            )}

            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
              O percentual de progresso no curso de cada aluno é reconciliado no
              próximo acesso dele ao curso.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={handleCloseRecalculate}
              disabled={recalcState === "applying"}
              sx={{ color: "#666", textTransform: "none" }}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={handleConfirmRecalculate}
              disabled={recalcState === "applying"}
              sx={{ bgcolor: "#9041c1", textTransform: "none" }}
            >
              {recalcState === "applying" ? "Recalculando..." : "Recalcular"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </>
  );
};

/**
 * Painel "Respostas detalhadas" de um aluno. Usado pela linha expandida da
 * tabela (desktop) E pelo card expandido (mobile) — antes o bloco existia
 * apenas dentro da tabela, e no celular o professor ficava sem nenhuma forma
 * de ver o que o aluno respondeu.
 */
const StudentAnswersDetail = ({ student }) => (
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
        {Object.entries(student.detailedAnswers)
          // Sort questions by their keys or try to extract question numbers
          .sort(([keyA, detailA], [keyB, detailB]) => {
            // Try to extract numbers from the keys (e.g., "q2" -> 2)
            const numA = parseInt(keyA.replace(/\D/g, '')) || 0;
            const numB = parseInt(keyB.replace(/\D/g, '')) || 0;
            
            if (numA !== numB) return numA - numB;
            
            // If numbers are the same or not available, sort alphabetically
            return keyA.localeCompare(keyB);
          })
          .map(([questionId, detail], index) => {
            const isOpenEnded = detail.questionType === 'open-ended';
            
            return (
            <Box
              key={questionId}
              sx={{
                mb: 2,
                p: 1.5,
                bgcolor: "white",
                borderRadius: 1,
                border: isOpenEnded ? "1px solid #9041c1" : "1px solid #e0e0e0",
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 500, flex: 1 }}
                >
                  {index + 1}. {detail.question}
                </Typography>
                {isOpenEnded && (
                  <Box
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 5,
                      bgcolor: 'rgba(144, 65, 193, 0.1)',
                      color: '#9041c1',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}
                  >
                    Questão Aberta
                  </Box>
                )}
                {/* Marcas deixadas pelo recálculo de notas */}
                {detail.removedFromQuiz && (
                  <Chip
                    size="small"
                    label="Removida do quiz"
                    title="Esta questão não existe mais no quiz e não conta na nota"
                    sx={{ bgcolor: "#eeeeee", color: "#555", fontWeight: 600 }}
                  />
                )}
                {detail.recalcAmbiguous && (
                  <Chip
                    size="small"
                    label="Reconhecida pela posição"
                    title="A alternativa foi editada depois da resposta; o recálculo manteve a posição original marcada pelo aluno"
                    sx={{ bgcolor: "#fff3e0", color: "#b26a00", fontWeight: 600 }}
                  />
                )}
              </Box>

              {isOpenEnded ? (
                // Renderização para questões abertas
                <Box sx={{ mt: 1 }}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 1,
                      backgroundColor: "rgba(144, 65, 193, 0.08)",
                      border: "1px solid rgba(144, 65, 193, 0.3)",
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 600,
                        color: "#9041c1",
                        display: "block",
                        mb: 1,
                      }}
                    >
                      Resposta do aluno:
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        color: "#333",
                      }}
                    >
                      {detail.answer || detail.userAnswer || "(Nenhuma resposta fornecida)"}
                    </Typography>
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{
                      display: "block",
                      mt: 1,
                      color: "#666",
                      fontStyle: "italic",
                    }}
                  >
                    Esta questão não afeta a nota final e será avaliada pelo professor.
                  </Typography>
                </Box>
              ) : (
                // Renderização para múltipla escolha
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
                        detail.userAnswerText === detail.correctOptionText
                          ? "rgba(76, 175, 80, 0.15)"
                          : "rgba(211, 47, 47, 0.12)",
                      border: `1px solid ${
                        detail.userAnswerText === detail.correctOptionText
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
                        color: detail.userAnswerText === detail.correctOptionText
                          ? "#2e7d32"
                          : "#c62828",
                      }}
                    >
                      {detail.userAnswerText === detail.correctOptionText ? "✓" : "✗"}{" "}
                      Resposta do aluno:{" "}
                      <Box
                        component="span"
                        sx={{ fontWeight: 600 }}
                      >
                        {detail.userAnswerText}
                      </Box>
                    </Typography>
                  </Box>

                  {detail.userAnswerText !== detail.correctOptionText && (
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 1,
                        backgroundColor: "rgba(76, 175, 80, 0.12)",
                        border: "1px solid rgba(76, 175, 80, 0.5)",
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
              )}
            </Box>
          );
          })}
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
);

export default StudentDashboard;
