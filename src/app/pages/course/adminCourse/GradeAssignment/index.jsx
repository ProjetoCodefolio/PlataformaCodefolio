import { useRef, useState } from "react";
import Loader from "$components/common/Loader";
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
  TextField,
  Alert,
  Stack,
  Avatar,
  InputAdornment,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SaveIcon from "@mui/icons-material/Save";
import DownloadIcon from "@mui/icons-material/Download";
import Topbar from "$components/topbar/Topbar";
import BreadcrumbsComponent from "$components/common/BreadcrumbsComponent";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "$context/AuthContext";
import { toast } from "react-toastify";
import { canAssignGrades } from "$api/utils/permissions";
import SortableHeader from "$components/common/SortableHeader";
import { sortRows, getNextSort } from "$utils/tableSort";
import { MINIMUM_PASSING_GRADE } from "$api/constants/gradeConstants";

import GradeStatusIcon from "../grades/GradeStatusIcon";
import { downloadCsv } from "../grades/downloadCsv";
import { useGradeAssignmentData } from "./hooks/useGradeAssignmentData";
import { useGradeEditing } from "./hooks/useGradeEditing";
import { useKeyboardGradeNavigation } from "./hooks/useKeyboardGradeNavigation";
import { useMissingGradesWarning } from "./hooks/useMissingGradesWarning";

// Função para formatar nomes com capitalização adequada - igual ao CourseStudentsTab
const capitalizeWords = (name) => {
  if (!name) return "Nome Indisponível";
  return name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

export default function GradeAssignmentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const courseId = params.get("courseId");
  const assessmentId = params.get("assessmentId");
  const inputRefs = useRef([]);
  const { userDetails } = useAuth();

  const {
    students,
    assessmentDetails,
    courseDetails,
    grades,
    setGrades,
    saveStatus,
    setSaveStatus,
    loading,
    error,
  } = useGradeAssignmentData({ courseId, assessmentId });

  const editing = useGradeEditing({ courseId, assessmentId, grades, setGrades, setSaveStatus });

  const [sortField, setSortField] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [showSaveWarning, setShowSaveWarning] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);

  const handleSort = (field) => {
    const next = getNextSort({ sortField, sortOrder }, field);
    setSortField(next.sortField);
    setSortOrder(next.sortOrder);
  };

  // Verificar se o usuário é dono do curso ou admin
  const isCourseOwner = canAssignGrades(userDetails, courseDetails?.userId, courseId);

  // Função para determinar o status do estudante
  const getStudentStatus = (studentId) => {
    const grade = grades[studentId];

    // Sem nota (diferente de zero)
    if (!grade || grade.trim() === "") {
      return "pending";
    }

    const numValue = parseFloat(grade);

    // Nota inválida
    if (isNaN(numValue)) {
      return "pending";
    }

    // Aprovado (>= nota de corte)
    if (numValue >= MINIMUM_PASSING_GRADE) {
      return "approved";
    }

    // Reprovado (< nota de corte, incluindo zero)
    return "failed";
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "approved":
        return "Aprovado";
      case "failed":
        return "Reprovado";
      case "pending":
        return "Pendente";
      default:
        return "";
    }
  };

  // Filtrar alunos pelo nome e status
  // Lista filtrada E ordenada. É importante ordenar aqui (e não só na
  // renderização) porque a navegação por teclado e o salvamento usam o índice
  // posicional de filteredStudents — renderização e lógica precisam estar na
  // mesma ordem.
  const filteredStudents = sortRows(
    students.filter((student) => {
      const studentId = student.userId || student.id;

      // Filtro de busca por nome
      const matchesSearch = (student.name || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      // Filtro de status
      let matchesStatus = true;
      if (filterStatus !== "all") {
        const studentStatus = getStudentStatus(studentId);
        matchesStatus = studentStatus === filterStatus;
      }

      return matchesSearch && matchesStatus;
    }),
    sortField,
    sortOrder
  );

  useMissingGradesWarning({ students, grades });

  const keyboardNav = useKeyboardGradeNavigation({
    filteredStudents,
    loading,
    inputRefs,
    onCommit: (studentId) => editing.handleSaveGrade(studentId, editing.getFieldValue(studentId)),
  });

  // Voltar para a página de avaliações
  const handleBack = () => {
    const studentsWithoutGrades = students.filter(student => {
      const studentId = student.userId || student.id;
      const grade = grades[studentId];
      const matchesSearch = (student.name || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      let matchesStatus = true;
      if (filterStatus !== "all") {
        const studentStatus = getStudentStatus(studentId);
        matchesStatus = studentStatus === filterStatus;
      }

      return matchesSearch && matchesStatus && (!grade || grade.trim() === "");
    });

    if (studentsWithoutGrades.length > 0) {
      setPendingNavigation(`/adm-cursos?courseId=${courseId}&tab=4`);
      setShowExitWarning(true);
    } else {
      navigate(`/adm-cursos?courseId=${courseId}&tab=4`);
    }
  };

  // Confirmar navegação mesmo com notas pendentes
  const confirmNavigation = () => {
    setShowExitWarning(false);
    if (pendingNavigation) {
      navigate(pendingNavigation);
    }
  };

  // Cancelar navegação
  const cancelNavigation = () => {
    setShowExitWarning(false);
    setPendingNavigation(null);
  };

  // Função para salvar com verificação de notas pendentes
  const handleSaveAll = () => {
    const studentsWithoutGrades = filteredStudents.filter(student => {
      const studentId = student.userId || student.id;
      const grade = grades[studentId];
      return !grade || grade.trim() === "";
    });

    if (studentsWithoutGrades.length > 0) {
      setShowSaveWarning(true);
    } else {
      toast.success("Todas as notas foram salvas com sucesso!");
    }
  };

  // Exportar para CSV
  const handleExportCSV = () => {
    const csvRows = [];

    // Cabeçalho
    csvRows.push(['Nome', 'Email', 'Nota', 'Status'].join(','));

    // Dados dos estudantes
    filteredStudents.forEach(student => {
      const studentId = student.userId || student.id;
      const grade = grades[studentId] || 'Pendente';
      const status = getStatusLabel(getStudentStatus(studentId));

      csvRows.push([
        `"${capitalizeWords(student.name)}"`,
        student.email,
        grade,
        status
      ].join(','));
    });

    downloadCsv(`notas_${assessmentDetails?.name || 'avaliacao'}.csv`, csvRows.join('\n'));
    toast.success('CSV exportado com sucesso!');
  };

  return (
    <Box>
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
            { label: "Curso", path: `/adm-cursos?courseId=${courseId}&tab=4` },
            { label: "Avaliações", path: `/adm-cursos?courseId=${courseId}&tab=4` },
            { label: assessmentDetails?.name || "Atribuir Notas" },
          ]}
          onBack={handleBack}
        />

        {/* Título */}
        <Typography
          variant="h4"
          sx={{
            fontWeight: "bold",
            mb: 1,
            color: "#333",
            fontSize: { xs: "1.5rem", sm: "2rem" },
          }}
        >
          Atribuir Notas
        </Typography>

        {assessmentDetails && (
          <Typography
            variant="body1"
            sx={{
              mb: 3,
              color: "#666",
              fontSize: { xs: "0.875rem", sm: "1rem" },
            }}
          >
            {assessmentDetails.name} ({assessmentDetails.percentage}% da nota
            final)
          </Typography>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Paper
          elevation={0}
          sx={{
            p: 3,
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
          }}
        >
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <Loader />
            </Box>
          ) : (
            <>
              {/* Instruções */}
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="body1"
                  sx={{
                    color: "#666",
                    mb: 2,
                    fontSize: { xs: "0.875rem", sm: "1rem" },
                  }}
                >
                  Digite as notas diretamente nos campos abaixo. As notas são
                  salvas automaticamente quando você sai do campo.
                </Typography>
              </Box>

              {/* Filtros e Busca */}
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
                <Grid container spacing={2} alignItems="flex-end">
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
                          fontSize: { xs: "0.875rem", sm: "1rem" },
                          "& fieldset": { borderColor: "#9041c1" },
                          "&:hover fieldset": { borderColor: "#7d37a7" },
                          "&.Mui-focused fieldset": { borderColor: "#9041c1" },
                        },
                        "& .MuiInputLabel-root": {
                          fontSize: { xs: "0.875rem", sm: "1rem" },
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
                          fontSize: { xs: "0.875rem", sm: "1rem" },
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
                          "& .MuiSelect-select": {
                            fontSize: { xs: "0.875rem", sm: "1rem" },
                          },
                        }}
                      >
                        <MenuItem value="all">Todos</MenuItem>
                        <MenuItem value="approved">Aprovados (≥{MINIMUM_PASSING_GRADE})</MenuItem>
                        <MenuItem value="failed">Reprovados (&lt;{MINIMUM_PASSING_GRADE})</MenuItem>
                        <MenuItem value="pending">Pendentes (Sem nota)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>

                {/* Botões de ação */}
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: 2,
                    mt: 3,
                    justifyContent: 'flex-end',
                  }}
                >
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }} />}
                    onClick={handleExportCSV}
                    disabled={filteredStudents.length === 0}
                    fullWidth={window.innerWidth < 600}
                    sx={{
                      borderColor: '#9041c1',
                      color: '#9041c1',
                      fontSize: { xs: '0.875rem', sm: '1rem' },
                      py: { xs: 1, sm: 0.75 },
                      '&:hover': {
                        borderColor: '#7d37a7',
                        bgcolor: 'rgba(144, 65, 193, 0.04)',
                      },
                    }}
                  >
                    Exportar CSV
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }} />}
                    onClick={handleSaveAll}
                    disabled={!isCourseOwner || filteredStudents.length === 0}
                    fullWidth={window.innerWidth < 600}
                    sx={{
                      bgcolor: '#9041c1',
                      fontSize: { xs: '0.875rem', sm: '1rem' },
                      py: { xs: 1, sm: 0.75 },
                      '&:hover': {
                        bgcolor: '#7d37a7',
                      },
                    }}
                  >
                    Salvar Notas
                  </Button>
                </Box>
              </Paper>

              {/* Tabela de Notas - Desktop */}
              <TableContainer sx={{ display: { xs: "none", md: "block" } }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <SortableHeader label="Estudante" field="name" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} sx={{ width: "40%" }} />
                      <SortableHeader label="Email" field="email" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} sx={{ width: "30%" }} />
                      <TableCell sx={{ fontWeight: "bold", width: "20%" }}>
                        Nota (0-10)
                      </TableCell>
                      <TableCell sx={{ fontWeight: "bold", width: "10%" }} align="center">
                        Status
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredStudents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                          <Typography variant="body1" color="textSecondary">
                            Nenhum estudante encontrado.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStudents.map((student, index) => {
                        const studentId = student.userId || student.id;
                        const isInvalid = editing.isInvalid(studentId);
                        const isSaving = editing.isSaving(studentId);
                        const isSaved = !!saveStatus[studentId];
                        const studentStatus = getStudentStatus(studentId);

                        return (
                          <TableRow key={studentId}>
                            <TableCell>
                              <Stack
                                direction="row"
                                alignItems="center"
                                spacing={2}
                              >
                                <Avatar
                                  alt={student.name}
                                  src={student.photoURL}
                                  sx={{
                                    width: 40,
                                    height: 40,
                                    backgroundColor: "#9041c1",
                                    color: "white",
                                    fontWeight: "bold",
                                  }}
                                >
                                  {student.name?.charAt(0).toUpperCase()}
                                </Avatar>
                                <Typography variant="body1">
                                  {capitalizeWords(student.name)}
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell>{student.email}</TableCell>
                            <TableCell>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                <TextField
                                  value={editing.getFieldValue(studentId)}
                                  disabled={!isCourseOwner}
                                  onChange={(e) =>
                                    editing.handleGradeChange(studentId, e.target.value)
                                  }
                                  onBlur={(e) =>
                                    editing.handleSaveGrade(studentId, e.target.value)
                                  }
                                  onKeyDown={(e) => keyboardNav.handleKeyDown(e, index)}
                                  inputRef={(el) => (inputRefs.current[index] = el)}
                                  error={isInvalid}
                                  helperText={
                                    isInvalid ? "Nota inválida (0-10)" : ""
                                  }
                                  size="small"
                                  type="number"
                                  inputProps={{
                                    min: 0,
                                    max: 10,
                                    step: 0.1,
                                  }}
                                  sx={{
                                    width: "120px",
                                    "& .MuiOutlinedInput-root": {
                                      "& fieldset": {
                                        borderColor: isInvalid
                                          ? "#f44336"
                                          : isSaved
                                          ? "#4caf50"
                                          : "#666",
                                      },
                                      "&:hover fieldset": {
                                        borderColor: isInvalid
                                          ? "#f44336"
                                          : "#9041c1",
                                      },
                                      "&.Mui-focused fieldset": {
                                        borderColor: isInvalid
                                          ? "#f44336"
                                          : "#9041c1",
                                      },
                                    },
                                  }}
                                />
                                {isSaving ? (
                                  <Loader size={20} />
                                ) : isSaved ? (
                                  <CheckCircleIcon
                                    sx={{ color: "#4caf50", fontSize: 20 }}
                                  />
                                ) : null}
                              </Box>
                            </TableCell>
                            <TableCell align="center">
                              <GradeStatusIcon status={studentStatus} />
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Cards de Notas - Mobile */}
              <Box sx={{ display: { xs: "block", md: "none" } }}>
                {filteredStudents.length === 0 ? (
                  <Box sx={{ py: 3, textAlign: "center" }}>
                    <Typography variant="body1" color="textSecondary">
                      Nenhum estudante encontrado.
                    </Typography>
                  </Box>
                ) : (
                  filteredStudents.map((student, index) => {
                    const studentId = student.userId || student.id;
                    const isInvalid = editing.isInvalid(studentId);
                    const isSaving = editing.isSaving(studentId);
                    const isSaved = !!saveStatus[studentId];
                    const studentStatus = getStudentStatus(studentId);

                    return (
                      <Paper
                        key={studentId}
                        elevation={1}
                        sx={{
                          p: 2,
                          mb: 2,
                          borderRadius: 2,
                          position: "relative",
                          backgroundColor: "#fff",
                          border: "1px solid #e0e0e0",
                        }}
                      >
                        {/* Status no canto superior direito */}
                        <Box
                          sx={{
                            position: "absolute",
                            top: 16,
                            right: 16,
                          }}
                        >
                          <GradeStatusIcon status={studentStatus} />
                        </Box>

                        {/* Nome com Avatar */}
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={2}
                          sx={{ mb: 2, pr: 5 }}
                        >
                          <Avatar
                            alt={student.name}
                            src={student.photoURL}
                            sx={{
                              width: 40,
                              height: 40,
                              backgroundColor: "#9041c1",
                              color: "white",
                              fontWeight: "bold",
                            }}
                          >
                            {student.name?.charAt(0).toUpperCase()}
                          </Avatar>
                          <Typography
                            variant="body1"
                            sx={{
                              fontWeight: 600,
                              fontSize: "0.938rem",
                            }}
                          >
                            {capitalizeWords(student.name)}
                          </Typography>
                        </Stack>

                        {/* Email */}
                        <Typography
                          variant="body2"
                          sx={{
                            color: "#666",
                            mb: 2,
                            fontSize: "0.875rem",
                            wordBreak: "break-word",
                          }}
                        >
                          {student.email}
                        </Typography>

                        {/* Campo de Nota */}
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                          }}
                        >
                          <TextField
                            value={editing.getFieldValue(studentId)}
                            disabled={!isCourseOwner}
                            onChange={(e) =>
                              editing.handleGradeChange(studentId, e.target.value)
                            }
                            onBlur={(e) =>
                              editing.handleSaveGrade(studentId, e.target.value)
                            }
                            onKeyDown={(e) => keyboardNav.handleKeyDown(e, index)}
                            inputRef={(el) => (inputRefs.current[index] = el)}
                            error={isInvalid}
                            helperText={
                              isInvalid ? "Nota inválida (0-10)" : ""
                            }
                            label="Nota (0-10)"
                            size="small"
                            type="number"
                            inputProps={{
                              min: 0,
                              max: 10,
                              step: 0.1,
                            }}
                            sx={{
                              flex: 1,
                              "& .MuiOutlinedInput-root": {
                                "& fieldset": {
                                  borderColor: isInvalid
                                    ? "#f44336"
                                    : isSaved
                                    ? "#4caf50"
                                    : "#666",
                                },
                                "&:hover fieldset": {
                                  borderColor: isInvalid
                                    ? "#f44336"
                                    : "#9041c1",
                                },
                                "&.Mui-focused fieldset": {
                                  borderColor: isInvalid
                                    ? "#f44336"
                                    : "#9041c1",
                                },
                              },
                            }}
                          />
                          {isSaving ? (
                            <Loader size={20} />
                          ) : isSaved ? (
                            <CheckCircleIcon
                              sx={{ color: "#4caf50", fontSize: 20 }}
                            />
                          ) : null}
                        </Box>
                      </Paper>
                    );
                  })
                )}
              </Box>

              {/* Rodapé com contagem */}
              {filteredStudents.length > 0 && (
                <Box sx={{ mt: 2, p: 2, textAlign: "right" }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontSize: { xs: "0.813rem", sm: "0.875rem" } }}
                  >
                    Exibindo {filteredStudents.length} de {students.length} estudante(s)
                  </Typography>
                </Box>
              )}
            </>
          )}
        </Paper>
      </Box>

      {/* Diálogo de aviso ao sair */}
      <Dialog open={showExitWarning} onClose={cancelNavigation}>
        <DialogTitle>Atenção: Notas Pendentes</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Alguns alunos ainda estão sem nota atribuída. Deseja sair mesmo assim?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelNavigation} sx={{ color: '#666' }}>
            Cancelar
          </Button>
          <Button onClick={confirmNavigation} variant="contained" sx={{ bgcolor: '#9041c1', '&:hover': { bgcolor: '#7d37a7' } }}>
            Sair Mesmo Assim
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de aviso ao salvar */}
      <Dialog open={showSaveWarning} onClose={() => setShowSaveWarning(false)}>
        <DialogTitle>Atenção: Notas Pendentes</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Alguns alunos ainda estão sem nota atribuída. As notas já inseridas foram salvas automaticamente.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSaveWarning(false)} variant="contained" sx={{ bgcolor: '#9041c1', '&:hover': { bgcolor: '#7d37a7' } }}>
            Entendi
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
