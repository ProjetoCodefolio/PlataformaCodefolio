import React, { useState, useEffect } from "react";
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
  Avatar,
  CircularProgress,
  Alert,
  Stack,
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  Chip,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Divider,
} from "@mui/material";
import { useTheme, useMediaQuery } from '@mui/material';
import DownloadIcon from "@mui/icons-material/Download";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import PendingIcon from "@mui/icons-material/Pending";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import Topbar from "$components/topbar/Topbar";
import BreadcrumbsComponent from "$components/common/BreadcrumbsComponent";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "$context/AuthContext";
import { toast } from "react-toastify";
import * as gradesService from "$api/services/courses/grades";
import * as assessmentService from "$api/services/courses/assessments";
import * as courseService from "$api/services/courses/courses";
import { checkUserCourseRole } from "$api/services/courses/students";
import {
  MINIMUM_PASSING_GRADE,
  GRADE_STATUS,
  GRADE_COLORS,
} from "$api/constants/gradeConstants";

export default function CourseGrades() {
  const location = useLocation();
  const navigate = useNavigate();
  const { userDetails, currentUser } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const params = new URLSearchParams(location.search);
  const courseId = params.get("courseId");

  // Estados
  const [loading, setLoading] = useState(true);
  const [studentsGrades, setStudentsGrades] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [courseDetails, setCourseDetails] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortField, setSortField] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [error, setError] = useState(null);
  const [isCourseOwner, setIsCourseOwner] = useState(false);
  const [isTeacher, setIsTeacher] = useState(false);
  const [activeFilters, setActiveFilters] = useState(0);

  // Atualizar contagem de filtros
  useEffect(() => {
    let count = 0;
    if (searchTerm.trim() !== "") count++;
    if (filterStatus !== "all") count++;
    setActiveFilters(count);
  }, [searchTerm, filterStatus]);

  // Carregar dados iniciais
  useEffect(() => {
    if (courseId && userDetails?.userId) {
      loadCourseGrades();
      loadCourseDetails();
      checkPermissions();
    }
  }, [courseId, userDetails?.userId]);

  const loadCourseDetails = async () => {
    try {
      const details = await courseService.fetchCourseDetails(courseId);
      setCourseDetails(details);
    } catch (err) {
      console.error("Erro ao carregar detalhes do curso:", err);
    }
  };

  const checkPermissions = async () => {
    try {
      if (!currentUser) return;

      const details = await courseService.fetchCourseDetails(courseId);
      const isOwner = currentUser.uid === details.userId;
      const isTeacherOnly = await checkUserCourseRole(
        currentUser.uid,
        courseId,
        details.userId
      );

      setIsCourseOwner(isOwner);
      setIsTeacher(isTeacherOnly);
    } catch (err) {
      console.error("Erro ao verificar permissões:", err);
    }
  };

  const loadCourseGrades = async () => {
    setLoading(true);
    setError(null);
    try {
      // Carregar avaliações
      const assessmentsData = await assessmentService.fetchAllAssessmentsByCourse(courseId);
      setAssessments(assessmentsData);

      // Carregar todas as notas
      const gradesData = await gradesService.fetchAllCourseGrades(courseId);
      setStudentsGrades(gradesData);

      // Calcular estatísticas
      const stats = gradesService.calculateGradeStatistics(gradesData);
      setStatistics(stats);
    } catch (err) {
      console.error("Erro ao carregar notas:", err);
      setError("Não foi possível carregar as notas do curso.");
      toast.error("Erro ao carregar notas");
    } finally {
      setLoading(false);
    }
  };

  // Exportar para CSV
  const handleExportCSV = () => {
    try {
      const csv = gradesService.exportGradesToCSV(
        filteredAndSortedStudents,
        assessments
      );
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `notas_${courseDetails?.title || "curso"}_${new Date().toISOString().split("T")[0]}.csv`
      );
      link.click();
      toast.success("Arquivo CSV exportado com sucesso!");
    } catch (err) {
      console.error("Erro ao exportar CSV:", err);
      toast.error("Erro ao exportar arquivo");
    }
  };

  // Voltar para página anterior
  const handleBack = () => {
    navigate(`/adm-cursos?courseId=${courseId}&tab=5`);
  };

  // Lidar com clique em cabeçalho para ordenação
  const handleSortClick = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Formatar número com 2 casas decimais
  const fmt = (n) =>
    Number.isFinite(n)
      ? n.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : "0,00";

  // Limpar filtros
  const handleClearFilters = () => {
    setSearchTerm("");
    setFilterStatus("all");
  };

  // Filtrar e ordenar estudantes
  const filteredAndSortedStudents = studentsGrades
    .filter((student) => {
      // Filtro de busca
      const matchesSearch = student.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      // Filtro de status
      let matchesStatus = true;
      if (filterStatus !== "all") {
        matchesStatus = student.status === filterStatus;
      }

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      return gradesService.sortStudentsGrades(
        [a, b],
        sortField,
        sortOrder
      )[0] === a ? -1 : 1;
    });

  // Determinar ícone de status
  const getStatusIcon = (status) => {
    switch (status) {
      case GRADE_STATUS.APPROVED:
        return <CheckCircleIcon sx={{ color: "#4caf50" }} />;
      case GRADE_STATUS.FAILED:
        return <CancelIcon sx={{ color: "#f44336" }} />;
      case GRADE_STATUS.PENDING:
        return <PendingIcon sx={{ color: "#9e9e9e" }} />;
      default:
        return null;
    }
  };

  // Traduzir status
  const getStatusLabel = (status) => {
    switch (status) {
      case GRADE_STATUS.APPROVED:
        return "Aprovado";
      case GRADE_STATUS.FAILED:
        return "Reprovado";
      case GRADE_STATUS.PENDING:
        return "Pendente";
      default:
        return status;
    }
  };

  // Componente de cabeçalho de coluna com ordenação
  const SortableHeader = ({ label, field, width = "auto" }) => (
    <TableCell
      onClick={() => handleSortClick(field)}
      sx={{
        fontWeight: "bold",
        cursor: "pointer",
        userSelect: "none",
        width,
        "&:hover": {
          backgroundColor: "rgba(144, 65, 193, 0.05)",
        },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={0.5}>
        <span>{label}</span>
        {sortField === field && (
          <UnfoldMoreIcon
            sx={{
              fontSize: 16,
              transform: sortOrder === "asc" ? "rotate(0deg)" : "rotate(180deg)",
              transition: "transform 0.2s",
            }}
          />
        )}
      </Stack>
    </TableCell>
  );

  return (
    <Box>
      <Topbar hideSearch={true} />
      <Box sx={{ p: { xs: 2, sm: 3 }, backgroundColor: "#f9f9f9", minHeight: "100vh" }}>
        {/* Breadcrumbs */}
        <BreadcrumbsComponent
          items={[
            { label: "Curso", path: `/adm-cursos?courseId=${courseId}&tab=5` },
            { label: "Notas" },
          ]}
          onBack={handleBack}
          actionButtons={
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExportCSV}
              disabled={studentsGrades.length === 0}
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
            fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' }
          }}
        >
          Notas do Curso
        </Typography>

        {/* Cards de estatísticas */}
        {statistics && (
          <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={6} md={3}>
              <Card sx={{ borderRadius: 2, height: '100%' }}>
                <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                  <Typography 
                    variant="subtitle2" 
                    color="text.secondary"
                    sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}
                  >
                    Média da Turma
                  </Typography>
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      fontWeight: "bold", 
                      mt: 1,
                      fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' }
                    }}
                  >
                    {fmt(statistics.average)}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    color="text.secondary" 
                    sx={{ 
                      mt: 0.5, 
                      display: "block",
                      fontSize: { xs: '0.65rem', sm: '0.75rem' }
                    }}
                  >
                    (de {statistics.totalStudents - statistics.pendingCount} com notas completas)
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={6} md={3}>
              <Card sx={{ borderRadius: 2, height: '100%' }}>
                <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <CheckCircleIcon sx={{ color: "#4caf50", fontSize: { xs: '1.2rem', sm: '1.5rem' } }} />
                    <Box>
                      <Typography 
                        variant="subtitle2" 
                        color="text.secondary"
                        sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}
                      >
                        Aprovados
                      </Typography>
                      <Typography
                        variant="h4"
                        sx={{ 
                          fontWeight: "bold", 
                          color: "#4caf50",
                          fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' }
                        }}
                      >
                        {statistics.approvedCount}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={6} md={3}>
              <Card sx={{ borderRadius: 2, height: '100%' }}>
                <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <CancelIcon sx={{ color: "#f44336", fontSize: { xs: '1.2rem', sm: '1.5rem' } }} />
                    <Box>
                      <Typography 
                        variant="subtitle2" 
                        color="text.secondary"
                        sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}
                      >
                        Reprovados
                      </Typography>
                      <Typography
                        variant="h4"
                        sx={{ 
                          fontWeight: "bold", 
                          color: "#f44336",
                          fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' }
                        }}
                      >
                        {statistics.failedCount}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={6} md={3}>
              <Card sx={{ borderRadius: 2, height: '100%' }}>
                <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <PendingIcon sx={{ color: "#9e9e9e", fontSize: { xs: '1.2rem', sm: '1.5rem' } }} />
                    <Box>
                      <Typography 
                        variant="subtitle2" 
                        color="text.secondary"
                        sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}
                      >
                        Pendentes
                      </Typography>
                      <Typography
                        variant="h4"
                        sx={{ 
                          fontWeight: "bold", 
                          color: "#9e9e9e",
                          fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' }
                        }}
                      >
                        {statistics.pendingCount}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Filtros e busca */}
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
          <Grid container spacing={2} alignItems="flex-start">
            {/* Busca por nome */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                placeholder="Buscar estudante por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Typography sx={{ color: "#9041c1" }}>🔍</Typography>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                    "& fieldset": { borderColor: "#9041c1" },
                    "&:hover fieldset": { borderColor: "#7d37a7" },
                    "&.Mui-focused fieldset": { borderColor: "#9041c1" },
                  },
                }}
              />
            </Grid>

            {/* Filtro de status */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filterStatus}
                  label="Status"
                  onChange={(e) => setFilterStatus(e.target.value)}
                  sx={{
                    borderRadius: 2,
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor:
                        filterStatus !== "all" ? "#9041c1" : "rgba(0, 0, 0, 0.23)",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#9041c1",
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#9041c1",
                    },
                  }}
                >
                  <MenuItem value="all">Todos</MenuItem>
                  <MenuItem value={GRADE_STATUS.APPROVED}>Aprovados</MenuItem>
                  <MenuItem value={GRADE_STATUS.FAILED}>Reprovados</MenuItem>
                  <MenuItem value={GRADE_STATUS.PENDING}>Pendentes</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Indicador e botão de limpar filtros */}
            {activeFilters > 0 && (
              <Grid item xs={12}>
                <Tooltip title="Limpar todos os filtros">
                  <Chip
                    label={`${activeFilters} filtro${activeFilters > 1 ? "s" : ""} ativo${activeFilters > 1 ? "s" : ""}`}
                    onDelete={handleClearFilters}
                    color="primary"
                    sx={{
                      bgcolor: "#9041c1",
                      color: "white",
                      "& .MuiChip-deleteIcon": {
                        color: "white",
                        "&:hover": { color: "rgba(255, 255, 255, 0.7)" },
                      },
                    }}
                  />
                </Tooltip>
              </Grid>
            )}
          </Grid>
        </Paper>

        {/* Erro */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Tabela de notas - Desktop */}
        <Paper
          elevation={0}
          sx={{
            display: { xs: 'none', md: 'block' },
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
            overflow: "hidden",
          }}
        >
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress sx={{ color: "#9041c1" }} />
            </Box>
          ) : filteredAndSortedStudents.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography variant="h6" color="textSecondary">
                Nenhum estudante encontrado.
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table sx={{ minWidth: 650 }}>
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                    <SortableHeader
                      label="Estudante"
                      field="name"
                      width="25%"
                    />
                    <SortableHeader
                      label="Email"
                      field="email"
                      width="20%"
                    />
                    {assessments.map((assessment) => (
                      <TableCell
                        key={assessment.id}
                        align="center"
                        sx={{ fontWeight: "bold" }}
                      >
                        <Tooltip 
                          title={`${assessment.percentage}% da nota final${MINIMUM_PASSING_GRADE === 6 ? " (Verde: ≥6, Vermelho: <6)" : ""}`}
                        >
                          <Box>
                            {assessment.name}
                            <Typography variant="caption" display="block">
                              ({assessment.percentage}%)
                            </Typography>
                          </Box>
                        </Tooltip>
                      </TableCell>
                    ))}
                    <SortableHeader
                      label="Nota Final"
                      field="finalGrade"
                      width="12%"
                    />
                    <TableCell
                      sx={{ fontWeight: "bold", width: "10%" }}
                      align="center"
                    >
                      Status
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAndSortedStudents.map((student) => (
                    <TableRow key={student.userId} hover>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <Avatar
                            src={student.photoURL}
                            alt={student.name}
                            sx={{
                              bgcolor: "#9041c1",
                              width: 40,
                              height: 40,
                            }}
                          >
                            {student.name.charAt(0).toUpperCase()}
                          </Avatar>
                          <Typography variant="body2">
                            {student.name}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {student.email}
                        </Typography>
                      </TableCell>
                      {assessments.map((assessment) => {
                        const gradeData = student.grades[assessment.id];
                        const gradeColor = gradeData?.grade !== null 
                          ? gradesService.getGradeDifferentialColor(gradeData?.grade)
                          : GRADE_COLORS.PENDING;
                        
                        return (
                          <TableCell key={assessment.id} align="center">
                            {gradeData && gradeData.grade !== null ? (
                              <Chip
                                label={fmt(gradeData.grade)}
                                size="small"
                                sx={{
                                  fontWeight: "bold",
                                  backgroundColor: gradeColor,
                                  color: "#fff",
                                }}
                              />
                            ) : (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                —
                              </Typography>
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell align="center" sx={{ backgroundColor: "#f9f9f9" }}>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: "bold",
                            color: gradesService.getGradeColor(
                              student.finalGrade,
                              student.hasAnyGradeRecorded
                            ),
                          }}
                        >
                          {fmt(student.finalGrade)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title={getStatusLabel(student.status)}>
                          {getStatusIcon(student.status)}
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        {/* Cards - Mobile */}
        <Box sx={{ display: { xs: 'block', md: 'none' } }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress sx={{ color: "#9041c1" }} />
            </Box>
          ) : filteredAndSortedStudents.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6" color="textSecondary">
                Nenhum estudante encontrado.
              </Typography>
            </Paper>
          ) : (
            <Stack spacing={2}>
              {filteredAndSortedStudents.map((student) => (
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
                      <Tooltip title={getStatusLabel(student.status)}>
                        {getStatusIcon(student.status)}
                      </Tooltip>
                    </Box>

                    <Divider sx={{ my: 1.5 }} />

                    {/* Notas das Avaliações */}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 1, display: 'block' }}>
                        Avaliações
                      </Typography>
                      <Stack spacing={1}>
                        {assessments.map((assessment) => {
                          const gradeData = student.grades[assessment.id];
                          const gradeColor = gradeData?.grade !== null 
                            ? gradesService.getGradeDifferentialColor(gradeData?.grade)
                            : GRADE_COLORS.PENDING;
                          
                          return (
                            <Box 
                              key={assessment.id}
                              sx={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                py: 0.5
                              }}
                            >
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {assessment.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {assessment.percentage}% da nota final
                                </Typography>
                              </Box>
                              {gradeData && gradeData.grade !== null ? (
                                <Chip
                                  label={fmt(gradeData.grade)}
                                  size="small"
                                  sx={{
                                    fontWeight: "bold",
                                    backgroundColor: gradeColor,
                                    color: "#fff",
                                  }}
                                />
                              ) : (
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  —
                                </Typography>
                              )}
                            </Box>
                          );
                        })}
                      </Stack>
                    </Box>

                    <Divider sx={{ my: 1.5 }} />

                    {/* Nota Final */}
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        bgcolor: '#f9f9f9',
                        p: 1.5,
                        borderRadius: 1
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Nota Final
                      </Typography>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: "bold",
                          color: gradesService.getGradeColor(
                            student.finalGrade,
                            student.hasAnyGradeRecorded
                          ),
                        }}
                      >
                        {fmt(student.finalGrade)}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Box>

        {/* Rodapé com contagem */}
        {!loading && studentsGrades.length > 0 && (
          <Box sx={{ mt: 2, p: 2, textAlign: "right" }}>
            <Typography variant="body2" color="text.secondary">
              Exibindo {filteredAndSortedStudents.length} de{" "}
              {studentsGrades.length} estudante(s)
            </Typography>
          </Box>
        )}

        {/* Legenda */}
        {!loading && assessments.length > 0 && (
          <Paper
            elevation={0}
            sx={{
              mt: 3,
              p: 2,
              backgroundColor: "#f5f5f5",
              borderRadius: "12px",
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
              Legenda de cores das avaliações:
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    backgroundColor: GRADE_COLORS.GOOD,
                    borderRadius: 1,
                  }}
                />
                <Typography variant="body2">Acima de {MINIMUM_PASSING_GRADE} (≥{MINIMUM_PASSING_GRADE})</Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    backgroundColor: GRADE_COLORS.POOR,
                    borderRadius: 1,
                  }}
                />
                <Typography variant="body2">Abaixo de {MINIMUM_PASSING_GRADE} (&lt;{MINIMUM_PASSING_GRADE})</Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    backgroundColor: GRADE_COLORS.PENDING,
                    borderRadius: 1,
                  }}
                />
                <Typography variant="body2">Sem nota</Typography>
              </Stack>
            </Stack>
          </Paper>
        )}
      </Box>
    </Box>
  );
}