import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Chip,
  Avatar,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  LinearProgress,
  Badge,
  Stack,
} from "@mui/material";
import { useTheme, useMediaQuery } from '@mui/material';
import DownloadIcon from "@mui/icons-material/Download";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import QuizIcon from "@mui/icons-material/Quiz";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PeopleIcon from "@mui/icons-material/People";
import InfoIcon from "@mui/icons-material/Info";
import CloseIcon from "@mui/icons-material/Close";
import LiveTvIcon from "@mui/icons-material/LiveTv";
import VideogameAssetIcon from "@mui/icons-material/VideogameAsset";
import SchoolIcon from "@mui/icons-material/School";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { toast } from "react-toastify";
import Topbar from "../../../components/topbar/Topbar";
import BreadcrumbsComponent from "../../../components/common/BreadcrumbsComponent";
import {
  fetchAggregatedQuizGrades,
  exportQuizGradesToCSV,
} from "../../../../api/services/courses/quizAggregation";

export default function QuizGradesOverview() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get("courseId");
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  // Carregar dados
  useEffect(() => {
    const loadData = async () => {
      if (!courseId) {
        toast.error("ID do curso não fornecido");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const result = await fetchAggregatedQuizGrades(courseId);
        setData(result);
      } catch (error) {
        console.error("Erro ao carregar notas:", error);
        toast.error("Erro ao carregar notas dos quizzes");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [courseId]);

  // Filtrar e ordenar estudantes
  const getFilteredAndSortedStudents = () => {
    if (!data || !data.students) return [];

    let filtered = data.students;

    // Filtrar por busca
    if (searchTerm) {
      filtered = filtered.filter(
        (student) =>
          student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Ordenar
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  };

  // Exportar CSV
  const handleExportCSV = () => {
    if (!data) return;

    try {
      const csv = exportQuizGradesToCSV(
        data.students, 
        data.quizzes, 
        data.videoNames || {}, 
        data.slideNames || {}
      );
      const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `notas_quizzes_${courseId}_${new Date().toISOString().split("T")[0]}.csv`
      );
      link.click();
      toast.success("Arquivo CSV exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar CSV:", error);
      toast.error("Erro ao exportar arquivo");
    }
  };

  const handleBack = () => {
    navigate(`/adm-cursos?courseId=${courseId}&tab=3`);
  };

  const handleSortClick = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const handleOpenDetails = (student) => {
    setSelectedStudent(student);
    setDetailsModalOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsModalOpen(false);
    setSelectedStudent(null);
  };

  const fmt = (n) =>
    Number.isFinite(n)
      ? n.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : "0,00";

  const getQuizDisplayName = (quiz) => {
    if (!data) return quiz.quizName;
    
    if (quiz.isSlideQuiz) {
      const slideId = quiz.quizId.replace("slide_", "");
      return data.slideNames?.[slideId] || quiz.quizName;
    } else {
      return data.videoNames?.[quiz.quizId] || data.videoNames?.[quiz.quizName] || quiz.quizName;
    }
  };

  const handleNavigateToVideo = (quiz) => {
    if (quiz.isSlideQuiz) {
      const slideId = quiz.quizId.replace("slide_", "");
      navigate(`/classes?courseId=${courseId}&slideId=${slideId}`);
    } else {
      navigate(`/classes?courseId=${courseId}&videoId=${quiz.quizId}`);
    }
  };

  if (loading) {
    return (
      <>
        <Topbar hideSearch={true} />
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "100vh",
            backgroundColor: "#f9f9f9",
          }}
        >
          <CircularProgress sx={{ color: "#9041c1" }} />
        </Box>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <Topbar hideSearch={true} />
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" color="error">
            Erro ao carregar dados
          </Typography>
        </Box>
      </>
    );
  }

  const filteredStudents = getFilteredAndSortedStudents();

  return (
    <>
      <Topbar hideSearch={true} />
      <Box
        sx={{
          p: { xs: 2, sm: 3 },
          backgroundColor: "#f9f9f9",
          minHeight: "100vh",
        }}
      >
        {/* Breadcrumbs */}
        <BreadcrumbsComponent
          items={[
            { label: "Curso", path: `/adm-cursos?courseId=${courseId}&tab=3` },
            { label: "Visão Geral de Notas dos Quizzes" },
          ]}
          onBack={handleBack}
          actionButtons={
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExportCSV}
              disabled={!data.students || data.students.length === 0}
              sx={{
                borderColor: "#9041c1",
                color: "#9041c1",
                "&:hover": {
                  borderColor: "#7a35a3",
                  backgroundColor: "#f5f0fa",
                },
              }}
            >
              Exportar CSV
            </Button>
          }
        />

        {/* Título */}
        <Typography
          variant="h4"
          sx={{ 
            fontWeight: "bold", 
            mb: 3, 
            color: "#333",
            fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' }
          }}
        >
          Visão Geral de Notas dos Quizzes
        </Typography>

        {/* Cards de estatísticas */}
        <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={6} md={3}>
            <Card sx={{ borderRadius: 2, height: '100%' }}>
              <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <TrendingUpIcon sx={{ color: "#9041c1", fontSize: { xs: '1.2rem', sm: '1.5rem' } }} />
                  <Typography 
                    variant="subtitle2" 
                    color="text.secondary"
                    sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}
                  >
                    Média Geral da Turma
                  </Typography>
                </Box>
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: "bold",
                    fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' }
                  }}
                >
                  {fmt(data.summary.averageClassGrade)}
                </Typography>
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
                >
                  {data.summary.averageClassGrade >= 7
                    ? "Excelente!"
                    : data.summary.averageClassGrade >= 5
                    ? "Regular"
                    : "Necessita atenção"}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={6} sm={6} md={3}>
            <Card sx={{ borderRadius: 2, height: '100%' }}>
              <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <QuizIcon sx={{ color: "#2196f3", fontSize: { xs: '1.2rem', sm: '1.5rem' } }} />
                  <Typography 
                    variant="subtitle2" 
                    color="text.secondary"
                    sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}
                  >
                    Total de Quizzes
                  </Typography>
                </Box>
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: "bold",
                    fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' }
                  }}
                >
                  {data.summary.totalQuizzes}
                </Typography>
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
                >
                  {data.summary.totalEvaluativeQuizzes} avaliativos
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={6} sm={6} md={3}>
            <Card sx={{ borderRadius: 2, height: '100%' }}>
              <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <PeopleIcon sx={{ color: "#ff9800", fontSize: { xs: '1.2rem', sm: '1.5rem' } }} />
                  <Typography 
                    variant="subtitle2" 
                    color="text.secondary"
                    sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}
                  >
                    Total de Estudantes
                  </Typography>
                </Box>
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: "bold",
                    fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' }
                  }}
                >
                  {data.summary.totalStudents}
                </Typography>
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
                >
                  matriculados
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={6} sm={6} md={3}>
            <Card sx={{ borderRadius: 2, height: '100%' }}>
              <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <CheckCircleIcon sx={{ color: "#4caf50", fontSize: { xs: '1.2rem', sm: '1.5rem' } }} />
                  <Typography 
                    variant="subtitle2" 
                    color="text.secondary"
                    sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}
                  >
                    Conclusão Completa
                  </Typography>
                </Box>
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: "bold", 
                    color: "#4caf50",
                    fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' }
                  }}
                >
                  {data.summary.studentsWithAllQuizzes}
                </Typography>
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
                >
                  {data.summary.totalStudents > 0
                    ? `${Math.round((data.summary.studentsWithAllQuizzes / data.summary.totalStudents) * 100)}%`
                    : "0%"} da turma
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filtros */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 3 },
            mb: 3,
            borderRadius: "12px",
            backgroundColor: "#fff",
            boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
          }}
        >
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Buscar estudante"
                placeholder="Digite o nome ou email"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Ordenar por</InputLabel>
                <Select
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value)}
                  label="Ordenar por"
                >
                  <MenuItem value="name">Nome</MenuItem>
                  <MenuItem value="averageGrade">Média</MenuItem>
                  <MenuItem value="completionRate">Taxa de Conclusão</MenuItem>
                  <MenuItem value="attemptedQuizzes">Quizzes Realizados</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Ordem</InputLabel>
                <Select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  label="Ordem"
                >
                  <MenuItem value="asc">Crescente</MenuItem>
                  <MenuItem value="desc">Decrescente</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {/* Tabela - Desktop */}
        <Paper
          elevation={0}
          sx={{
            display: { xs: 'none', md: 'block' },
            borderRadius: "12px",
            backgroundColor: "#fff",
            boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
            overflow: "hidden",
          }}
        >
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                  <TableCell sx={{ fontWeight: "bold" }}>Estudante</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }} align="center">
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5 }}>
                      Média Geral
                      <Tooltip title="Média considerando apenas quizzes avaliativos">
                        <InfoIcon sx={{ fontSize: 16, color: "#666" }} />
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold" }} align="center">
                    Quizzes Realizados
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold" }} align="center">
                    Taxa de Conclusão
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold" }} align="center">
                    Quizzes Aprovados
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold" }} align="center">
                    Ações
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography variant="body1" color="textSecondary">
                        Nenhum estudante encontrado
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((student) => (
                    <TableRow key={student.userId} hover>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                          <Avatar
                            src={student.photoURL}
                            alt={student.name}
                            sx={{
                              width: 40,
                              height: 40,
                              bgcolor: "#9041c1",
                            }}
                          >
                            {student.name.charAt(0).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                              {student.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {student.email}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={fmt(student.averageGrade)}
                          color={
                            student.averageGrade >= 7
                              ? "success"
                              : student.averageGrade >= 5
                              ? "warning"
                              : "error"
                          }
                          sx={{ fontWeight: "bold" }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body1">
                          {student.attemptedQuizzes} / {student.totalQuizzes}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 1,
                          }}
                        >
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {student.completionRate}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body1">
                          {student.passedQuizzes} / {student.totalEvaluative}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Ver detalhes completos dos quizzes">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDetails(student)}
                            sx={{ color: "#9041c1" }}
                          >
                            <InfoIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {filteredStudents.length > 0 && (
            <Box sx={{ p: 2, textAlign: "right", backgroundColor: "#f5f5f5" }}>
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ fontSize: { xs: '0.813rem', sm: '0.875rem' } }}
              >
                Exibindo {filteredStudents.length} de {data.students.length} estudante(s)
              </Typography>
            </Box>
          )}
        </Paper>

        {/* Cards - Mobile */}
        <Box sx={{ display: { xs: 'block', md: 'none' } }}>
          {filteredStudents.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" color="textSecondary">
                Nenhum estudante encontrado
              </Typography>
            </Paper>
          ) : (
            <Stack spacing={2}>
              {filteredStudents.map((student) => (
                <Card
                  key={student.userId}
                  sx={{
                    borderRadius: 2,
                    boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
                  }}
                >
                  <CardContent sx={{ p: 2 }}>
                    {/* Cabeçalho do Card */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
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
                          {student.name}
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
                        label={fmt(student.averageGrade)}
                        color={
                          student.averageGrade >= 7
                            ? "success"
                            : student.averageGrade >= 5
                            ? "warning"
                            : "error"
                        }
                        sx={{ fontWeight: "bold" }}
                      />
                    </Box>

                    <Divider sx={{ my: 1.5 }} />

                    {/* Informações */}
                    <Grid container spacing={1.5}>
                      <Grid item xs={6}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Quizzes Realizados
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {student.attemptedQuizzes} / {student.totalQuizzes}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Taxa de Conclusão
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {student.completionRate}%
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Aprovados
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {student.passedQuizzes} / {student.totalEvaluative}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end', height: '100%' }}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleOpenDetails(student)}
                            sx={{
                              borderColor: "#9041c1",
                              color: "#9041c1",
                              fontSize: '0.75rem',
                              px: 1.5,
                            }}
                          >
                            Detalhes
                          </Button>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Box>

        {/* Modal de Detalhes do Estudante */}
        <Dialog
          open={detailsModalOpen}
          onClose={handleCloseDetails}
          maxWidth="md"
          fullWidth
          fullScreen={isMobile}
        >
          {selectedStudent && (
            <>
              <DialogTitle sx={{ bgcolor: "#9041c1", color: "white", display: "flex", alignItems: "center", justifyContent: "space-between", p: { xs: 2, sm: 3 } }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1.5, sm: 2 }, flex: 1, minWidth: 0 }}>
                  <Avatar
                    src={selectedStudent.photoURL}
                    alt={selectedStudent.name}
                    sx={{ width: { xs: 40, sm: 50 }, height: { xs: 40, sm: 50 } }}
                  >
                    {selectedStudent.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        fontSize: { xs: '1rem', sm: '1.25rem' },
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {selectedStudent.name}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        opacity: 0.9,
                        fontSize: { xs: '0.7rem', sm: '0.75rem' },
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {selectedStudent.email}
                    </Typography>
                  </Box>
                </Box>
                <IconButton
                  onClick={handleCloseDetails}
                  sx={{ color: "white" }}
                >
                  <CloseIcon />
                </IconButton>
              </DialogTitle>
              <DialogContent sx={{ mt: 2, p: { xs: 2, sm: 3 } }}>
                {/* Resumo Geral */}
                <Box sx={{ mb: 3 }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      mb: 2, 
                      fontWeight: "bold",
                      fontSize: { xs: '1rem', sm: '1.15rem', md: '1.25rem' }
                    }}
                  >
                    Resumo Geral
                  </Typography>
                  <Grid container spacing={{ xs: 1.5, sm: 2 }}>
                    <Grid item xs={6} sm={6} md={3}>
                      <Paper sx={{ p: { xs: 1.5, sm: 2 }, textAlign: "center", bgcolor: "#f5f5f5" }}>
                        <Typography 
                          variant="h4" 
                          sx={{ 
                            fontWeight: "bold", 
                            color: "#9041c1",
                            fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' }
                          }}
                        >
                          {fmt(selectedStudent.averageGrade)}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
                        >
                          Média Geral
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6} sm={6} md={3}>
                      <Paper sx={{ p: { xs: 1.5, sm: 2 }, textAlign: "center", bgcolor: "#f5f5f5" }}>
                        <Typography 
                          variant="h4" 
                          sx={{ 
                            fontWeight: "bold",
                            fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' }
                          }}
                        >
                          {selectedStudent.attemptedQuizzes}/{selectedStudent.totalQuizzes}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
                        >
                          Quizzes Feitos
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6} sm={6} md={3}>
                      <Paper sx={{ p: { xs: 1.5, sm: 2 }, textAlign: "center", bgcolor: "#f5f5f5" }}>
                        <Typography 
                          variant="h4" 
                          sx={{ 
                            fontWeight: "bold", 
                            color: "#4caf50",
                            fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' }
                          }}
                        >
                          {selectedStudent.passedQuizzes}/{selectedStudent.totalEvaluative}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
                        >
                          Aprovados
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6} sm={6} md={3}>
                      <Paper sx={{ p: { xs: 1.5, sm: 2 }, textAlign: "center", bgcolor: "#f5f5f5" }}>
                        <Typography 
                          variant="h4" 
                          sx={{ 
                            fontWeight: "bold",
                            fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' }
                          }}
                        >
                          {selectedStudent.completionRate}%
                        </Typography>
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
                        >
                          Conclusão
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>

                <Divider sx={{ my: 3 }} />

                {/* Detalhes por Quiz */}
                <Typography 
                  variant="h6" 
                  sx={{ 
                    mb: 2, 
                    fontWeight: "bold",
                    fontSize: { xs: '1rem', sm: '1.15rem', md: '1.25rem' }
                  }}
                >
                  Detalhes por Quiz
                </Typography>

                {selectedStudent.quizGrades.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
                    Nenhum quiz encontrado
                  </Typography>
                ) : (
                  <Box sx={{ maxHeight: 400, overflowY: "auto" }}>
                    {selectedStudent.quizGrades.map((quiz, index) => (
                      <Paper
                        key={quiz.quizId}
                        sx={{
                          p: 2,
                          mb: 2,
                          border: "1px solid #e0e0e0",
                          borderLeft: quiz.passed
                            ? "4px solid #4caf50"
                            : quiz.hasAttempt
                            ? "4px solid #ff9800"
                            : "4px solid #ccc",
                        }}
                      >
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                          <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                              <Typography 
                                variant="subtitle1" 
                                sx={{ 
                                  fontWeight: "bold",
                                  color: "#9041c1",
                                  cursor: "pointer",
                                  textDecoration: "underline",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.5,
                                  "&:hover": {
                                    color: "#7a35a3",
                                  }
                                }}
                                onClick={() => handleNavigateToVideo(quiz)}
                              >
                                {quiz.isSlideQuiz ? "📊 " : "🎥 "}{getQuizDisplayName(quiz)}
                                <OpenInNewIcon sx={{ fontSize: 16, ml: 0.5 }} />
                              </Typography>
                              {quiz.isDiagnostic && (
                                <Chip
                                  label="Diagnóstico"
                                  size="small"
                                  sx={{ bgcolor: "#2196f3", color: "white", height: 20 }}
                                />
                              )}
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              {quiz.isSlideQuiz ? "Quiz de Slide" : "Quiz de Vídeo"} • Clique para acessar
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: "right" }}>
                            <Chip
                              label={`Nota: ${quiz.grade.toFixed(2)}`}
                              color={quiz.passed ? "success" : quiz.hasAttempt ? "warning" : "default"}
                              sx={{ fontWeight: "bold" }}
                            />
                          </Box>
                        </Box>

                        {quiz.hasAttempt ? (
                          <>
                            {/* Barra de progresso */}
                            <Box sx={{ mb: 2 }}>
                              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                                <Typography variant="caption" color="text.secondary">
                                  Quiz Regular: {quiz.details.regular} de {quiz.totalQuestions} questões
                                  {quiz.totalOpenEnded > 0 && (
                                    <Tooltip title="Questões abertas não afetam a nota final">
                                      <span style={{ color: '#9c27b0', marginLeft: '8px', fontWeight: 'bold' }}>
                                        (+{quiz.totalOpenEnded} aberta{quiz.totalOpenEnded > 1 ? 's' : ''} 📝)
                                      </span>
                                    </Tooltip>
                                  )}
                                </Typography>
                                <Typography variant="caption" sx={{ fontWeight: "bold" }}>
                                  {quiz.basePercentage.toFixed(1)}%
                                </Typography>
                              </Box>
                              <LinearProgress
                                variant="determinate"
                                value={Math.min(quiz.basePercentage, 100)}
                                sx={{
                                  height: 8,
                                  borderRadius: 4,
                                  bgcolor: "#e0e0e0",
                                  "& .MuiLinearProgress-bar": {
                                    bgcolor: quiz.passedBase ? "#4caf50" : "#ff9800",
                                  },
                                }}
                              />
                              
                              {quiz.hasBonus && (
                                <>
                                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5, mt: 1.5 }}>
                                    <Typography variant="caption" sx={{ color: "#ff9800", fontWeight: "bold" }}>
                                      Pontos Bônus (Live + Custom)
                                    </Typography>
                                    <Typography variant="caption" sx={{ fontWeight: "bold", color: "#ff9800" }}>
                                      +{quiz.bonusPercentage.toFixed(1)}%
                                    </Typography>
                                  </Box>
                                  <LinearProgress
                                    variant="determinate"
                                    value={Math.min(quiz.bonusPercentage, 100)}
                                    sx={{
                                      height: 6,
                                      borderRadius: 3,
                                      bgcolor: "#fff3e0",
                                      "& .MuiLinearProgress-bar": {
                                        bgcolor: "#ff9800",
                                      },
                                    }}
                                  />
                                  
                                  <Box sx={{ 
                                    display: "flex", 
                                    justifyContent: "space-between", 
                                    alignItems: "center",
                                    mt: 1.5, 
                                    pt: 1.5, 
                                    borderTop: '2px solid #ff9800',
                                    bgcolor: '#f3e5f5',
                                    p: 1.5,
                                    borderRadius: 1
                                  }}>
                                    <Box>
                                      <Typography variant="caption" sx={{ fontWeight: "bold", display: 'block' }}>
                                        Nota Final
                                      </Typography>
                                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                                        Base: {quiz.basePercentage.toFixed(1)}% + Bônus: {quiz.bonusPercentage.toFixed(1)}%
                                      </Typography>
                                    </Box>
                                    <Chip
                                      label={`${quiz.grade.toFixed(2)}`}
                                      sx={{ 
                                        fontWeight: "bold", 
                                        fontSize: '1.1rem',
                                        bgcolor: '#9c27b0',
                                        color: 'white',
                                        '& .MuiChip-label': { px: 2, py: 1 }
                                      }}
                                    />
                                  </Box>
                                </>
                              )}
                            </Box>

                            {/* Status de aprovação */}
                            <Box sx={{ mt: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
                              {quiz.passed ? (
                                <>
                                  <CheckCircleIcon sx={{ fontSize: 18, color: "#4caf50" }} />
                                  <Typography variant="caption" sx={{ color: "#4caf50", fontWeight: "bold" }}>
                                    Aprovado (mínimo: {quiz.minPercentage}%)
                                  </Typography>
                                </>
                              ) : (
                                <>
                                  <InfoIcon sx={{ fontSize: 18, color: "#ff9800" }} />
                                  <Typography variant="caption" sx={{ color: "#ff9800", fontWeight: "bold" }}>
                                    Não atingiu o mínimo de {quiz.minPercentage}%
                                  </Typography>
                                </>
                              )}
                            </Box>
                          </>
                        ) : (
                          <Box sx={{ py: 2, textAlign: "center" }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
                              Ainda não realizou este quiz
                            </Typography>
                          </Box>
                        )}
                      </Paper>
                    ))}
                  </Box>
                )}
              </DialogContent>
              <DialogActions sx={{ p: 2, bgcolor: "#f5f5f5" }}>
                <Button onClick={handleCloseDetails} variant="contained" sx={{ bgcolor: "#9041c1" }}>
                  Fechar
                </Button>
              </DialogActions>
            </>
          )}
        </Dialog>
      </Box>
    </>
  );
}
