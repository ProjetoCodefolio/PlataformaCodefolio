import React, { useState, useEffect, useMemo, useTransition } from "react";
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
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import Topbar from "$components/topbar/Topbar";
import BreadcrumbsComponent from "$components/common/BreadcrumbsComponent";
import GradesImportModal from "./GradesImportModal";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "$context/AuthContext";
import { toast } from "react-toastify";
import * as gradesService from "$api/services/courses/grades";
import * as assessmentService from "$api/services/courses/assessments";
import * as courseService from "$api/services/courses/courses";
import { canAssignGrades } from "$api/utils/permissions";
import {
  MINIMUM_PASSING_GRADE,
  MAXIMUM_GRADE,
  GRADE_STATUS,
  GRADE_COLORS,
} from "$api/constants/gradeConstants";

// Estilos do campo de nota fora do componente: são iguais para todas as células
// e recriá-los a cada render faria o emotion re-serializar o estilo uma vez por
// campo, a cada tecla digitada.
const GRADE_INPUT_STYLE = { textAlign: "center", padding: "6px 8px" };
const GRADE_FIELD_SX = {
  width: 80,
  // :not(.Mui-error) para a borda vermelha da nota inválida continuar vencendo
  "& .MuiOutlinedInput-root.Mui-focused:not(.Mui-error) fieldset": {
    borderColor: "#9041c1",
  },
};

export default function CourseGrades() {
  const location = useLocation();
  const navigate = useNavigate();
  const { userDetails } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const params = new URLSearchParams(location.search);
  const courseId = params.get("courseId");

  // Estados
  const [loading, setLoading] = useState(true);
  const [studentsGrades, setStudentsGrades] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [courseDetails, setCourseDetails] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortField, setSortField] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [error, setError] = useState(null);
  const [activeFilters, setActiveFilters] = useState(0);

  // Modo edição: permite lançar notas direto na tabela geral
  const [editMode, setEditMode] = useState(false);
  // Nota EM DIGITAÇÃO de cada célula, separada da nota já commitada em
  // `studentsGrades` — que alimenta ordenação, filtro e status. Se o valor
  // digitado fosse direto para lá, a linha se moveria (ou sairia da lista) no
  // meio da digitação. O commit só acontece ao sair do campo (blur).
  const [draftGrades, setDraftGrades] = useState({});
  const [savingCells, setSavingCells] = useState({});
  const [invalidCells, setInvalidCells] = useState({});
  const [importOpen, setImportOpen] = useState(false);
  // Trocar de modo remonta a coluna de notas inteira. Marcar a troca como
  // transição deixa o clique responder na hora, com o botão indicando o
  // processamento, em vez de a tela travar até a tabela terminar de montar.
  const [isSwitchingMode, startModeTransition] = useTransition();

  // Só o dono do curso (ou admin) pode lançar nota — é o que as regras do banco
  // permitem escrever em courseAssessments.
  const canEditGrades = canAssignGrades(userDetails, courseDetails?.userId);

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
    } catch (err) {
      console.error("Erro ao carregar notas:", err);
      setError("Não foi possível carregar as notas do curso.");
      toast.error("Erro ao carregar notas");
    } finally {
      setLoading(false);
    }
  };

  // Derivadas das notas em memória: ao editar uma nota, os cards do topo se
  // atualizam sozinhos, sem reler o banco.
  const statistics = useMemo(
    () =>
      loading || error
        ? null
        : gradesService.calculateGradeStatistics(studentsGrades),
    [loading, error, studentsGrades]
  );

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
    navigate(`/adm-cursos?courseId=${courseId}&tab=4`);
  };

  // Importação concluída: relê as notas do banco, que agora são a verdade
  const handleImported = async (importedCount) => {
    setImportOpen(false);
    toast.success(
      `${importedCount} nota(s) importada(s) com sucesso!`
    );
    await loadCourseGrades();
  };

  // --- Modo edição ---

  const cellKey = (studentId, assessmentId) => `${studentId}_${assessmentId}`;

  const handleToggleEditMode = () => {
    // Rascunhos não commitados não sobrevivem à troca de modo
    setDraftGrades({});
    setInvalidCells({});
    startModeTransition(() => setEditMode((prev) => !prev));
  };

  // Valor exibido no campo: o rascunho em digitação, se houver; senão a nota já
  // commitada. Usa `??` para preservar corretamente a nota "0".
  const getGradeFieldValue = (student, assessmentId) => {
    const draft = draftGrades[cellKey(student.userId, assessmentId)];
    if (draft !== undefined) return draft;
    return student.grades[assessmentId]?.grade ?? "";
  };

  const parseGrade = (value) => parseFloat(String(value).replace(",", "."));

  const isGradeOutOfRange = (value) => {
    const numValue = parseGrade(value);
    return isNaN(numValue) || numValue < 0 || numValue > MAXIMUM_GRADE;
  };

  const clearDraft = (key) => {
    setDraftGrades((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const markCellValid = (key) => {
    setInvalidCells((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleGradeChange = (studentId, assessmentId, value) => {
    const key = cellKey(studentId, assessmentId);
    setDraftGrades((prev) => ({ ...prev, [key]: value }));

    // Validação instantânea, sem toast (o campo já fica vermelho)
    if (value.trim() !== "" && isGradeOutOfRange(value)) {
      setInvalidCells((prev) => ({ ...prev, [key]: true }));
    } else {
      markCellValid(key);
    }
  };

  // Recalcula o aluno inteiro a partir das notas já em memória: nota final, cor
  // e status acompanham a edição sem ida ao banco.
  const applyGradeToState = (studentId, assessmentId, grade, assignedAt) => {
    setStudentsGrades((prev) =>
      prev.map((student) => {
        if (student.userId !== studentId) return student;

        const updatedGrades = {
          ...student.grades,
          [assessmentId]: { grade, assignedAt },
        };

        return {
          ...student,
          ...gradesService.computeStudentGradeSummary(updatedGrades, assessments),
        };
      })
    );
  };

  const handleGradeBlur = async (student, assessmentId, value) => {
    const key = cellKey(student.userId, assessmentId);
    const raw = String(value).trim();

    // Campo esvaziado não apaga a nota já lançada — apenas descarta o rascunho.
    // Para remover uma nota, o caminho é a tela de atribuição da avaliação.
    if (raw === "") {
      clearDraft(key);
      markCellValid(key);
      return;
    }

    if (isGradeOutOfRange(raw)) {
      setInvalidCells((prev) => ({ ...prev, [key]: true }));
      return;
    }

    const numValue = parseGrade(raw);
    markCellValid(key);

    // Nada mudou: não gasta escrita no banco
    if (numValue === (student.grades[assessmentId]?.grade ?? null)) {
      clearDraft(key);
      return;
    }

    setSavingCells((prev) => ({ ...prev, [key]: true }));

    try {
      await assessmentService.assignGrade(
        courseId,
        assessmentId,
        student.userId,
        numValue
      );

      applyGradeToState(
        student.userId,
        assessmentId,
        numValue,
        new Date().toISOString()
      );
      clearDraft(key);
    } catch (err) {
      toast.error(`Erro ao salvar nota: ${err.message}`);
    } finally {
      setSavingCells((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
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

  // Filtrar e ordenar estudantes. Memoizado porque roda a cada render — e no
  // modo edição isso é a cada tecla digitada em qualquer nota.
  const filteredAndSortedStudents = useMemo(() => {
    const term = searchTerm.toLowerCase();

    const filtered = studentsGrades.filter((student) => {
      const matchesSearch = student.name.toLowerCase().includes(term);
      const matchesStatus =
        filterStatus === "all" || student.status === filterStatus;

      return matchesSearch && matchesStatus;
    });

    return gradesService.sortStudentsGrades(filtered, sortField, sortOrder);
  }, [studentsGrades, searchTerm, filterStatus, sortField, sortOrder]);

  // Determinar ícone de status
  const getStatusIcon = (status) => {
    switch (status) {
      case GRADE_STATUS.APPROVED:
        return <CheckCircleIcon sx={{ color: GRADE_COLORS.APPROVED }} />;
      case GRADE_STATUS.FAILED:
        return <CancelIcon sx={{ color: GRADE_COLORS.FAILED }} />;
      case GRADE_STATUS.PENDING:
        return <PendingIcon sx={{ color: GRADE_COLORS.PENDING }} />;
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

  // Campo de nota do modo edição. É uma função de render, e não um componente
  // declarado aqui dentro: um componente novo a cada render faria o React
  // remontar o input a cada tecla, perdendo o foco.
  const renderGradeField = (student, assessmentId) => {
    const key = cellKey(student.userId, assessmentId);
    const isInvalid = Boolean(invalidCells[key]);

    return (
      <TextField
        size="small"
        value={getGradeFieldValue(student, assessmentId)}
        onChange={(e) =>
          handleGradeChange(student.userId, assessmentId, e.target.value)
        }
        onBlur={(e) => handleGradeBlur(student, assessmentId, e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.target.blur();
        }}
        error={isInvalid}
        disabled={Boolean(savingCells[key])}
        placeholder="—"
        inputProps={{
          inputMode: "decimal",
          "aria-label": `Nota de ${student.name}`,
          style: GRADE_INPUT_STYLE,
        }}
        sx={GRADE_FIELD_SX}
      />
    );
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
            { label: "Curso", path: `/adm-cursos?courseId=${courseId}&tab=4` },
            { label: "Notas" },
          ]}
          onBack={handleBack}
          actionButtons={
            <Stack direction="row" spacing={1}>
              {canEditGrades && (
                <Tooltip
                  title={
                    editMode
                      ? "Sair da edição e apenas conferir as notas"
                      : "Ativar edição para atribuir notas direto na tabela"
                  }
                >
                  <span>
                    <Button
                      variant={editMode ? "contained" : "outlined"}
                      startIcon={
                        isSwitchingMode ? (
                          <CircularProgress size={16} color="inherit" />
                        ) : editMode ? (
                          <VisibilityIcon />
                        ) : (
                          <EditIcon />
                        )
                      }
                      onClick={handleToggleEditMode}
                      disabled={loading || assessments.length === 0 || isSwitchingMode}
                      sx={{
                        borderColor: "#9041c1",
                        color: editMode ? "#fff" : "#9041c1",
                        backgroundColor: editMode ? "#9041c1" : undefined,
                        "&:hover": {
                          borderColor: "#7a35a3",
                          backgroundColor: editMode ? "#7a35a3" : "#f5f0fa",
                        },
                      }}
                    >
                      {editMode ? "Modo Visualização" : "Modo Edição"}
                    </Button>
                  </span>
                </Tooltip>
              )}
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
              {canEditGrades && (
                <Tooltip title="Importar um CSV de notas exportado desta tela">
                  <span>
                    <Button
                      variant="outlined"
                      startIcon={<UploadFileIcon />}
                      onClick={() => setImportOpen(true)}
                      disabled={loading || assessments.length === 0}
                      sx={{
                        borderColor: "#9041c1",
                        color: "#9041c1",
                        "&:hover": {
                          borderColor: "#7a35a3",
                          backgroundColor: "#f5f0fa",
                        },
                      }}
                    >
                      Importar CSV
                    </Button>
                  </span>
                </Tooltip>
              )}
            </Stack>
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
                    <CheckCircleIcon sx={{ color: GRADE_COLORS.APPROVED, fontSize: { xs: '1.2rem', sm: '1.5rem' } }} />
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
                          color: GRADE_COLORS.APPROVED,
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
                    <CancelIcon sx={{ color: GRADE_COLORS.FAILED, fontSize: { xs: '1.2rem', sm: '1.5rem' } }} />
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
                          color: GRADE_COLORS.FAILED,
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
                    <PendingIcon sx={{ color: GRADE_COLORS.PENDING, fontSize: { xs: '1.2rem', sm: '1.5rem' } }} />
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
                          color: GRADE_COLORS.PENDING,
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

        {/* Instruções do modo edição */}
        {editMode && !loading && (
          <Alert severity="info" sx={{ mb: 3, borderRadius: "12px" }}>
            Digite a nota (de 0 a {MAXIMUM_GRADE}) e clique fora do campo para
            salvar. A nota final e o status são recalculados automaticamente.
            Deixar o campo em branco não apaga uma nota já lançada.
          </Alert>
        )}

        {/* Tabela de notas - Desktop */}
        {!isMobile && (
        <Paper
          elevation={0}
          sx={{
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
                          title={`${assessment.percentage}% da nota final (verde: ≥${MINIMUM_PASSING_GRADE}, vermelho: <${MINIMUM_PASSING_GRADE})`}
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
                        const gradeColor = gradesService.getGradeColor(gradeData?.grade);

                        return (
                          <TableCell key={assessment.id} align="center">
                            {editMode ? (
                              renderGradeField(student, assessment.id)
                            ) : gradeData && gradeData.grade !== null ? (
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
        )}

        {/* Cards - Mobile */}
        {isMobile && (
        <Box>
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
                          const gradeColor = gradesService.getGradeColor(gradeData?.grade);

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
                              {editMode ? (
                                renderGradeField(student, assessment.id)
                              ) : gradeData && gradeData.grade !== null ? (
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
        )}

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
                    backgroundColor: GRADE_COLORS.APPROVED,
                    borderRadius: 1,
                  }}
                />
                <Typography variant="body2">Aprovado (≥{MINIMUM_PASSING_GRADE})</Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    backgroundColor: GRADE_COLORS.FAILED,
                    borderRadius: 1,
                  }}
                />
                <Typography variant="body2">Reprovado (&lt;{MINIMUM_PASSING_GRADE})</Typography>
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

        <GradesImportModal
          open={importOpen}
          onClose={() => setImportOpen(false)}
          courseId={courseId}
          students={studentsGrades}
          assessments={assessments}
          onImported={handleImported}
        />
      </Box>
    </Box>
  );
}