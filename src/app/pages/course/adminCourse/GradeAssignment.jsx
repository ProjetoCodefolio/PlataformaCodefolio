import React, { useState, useEffect, useRef } from "react";
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
  CircularProgress,
  Alert,
  Stack,
  Avatar,
  InputAdornment,
  Chip,
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
import CancelIcon from "@mui/icons-material/Cancel";
import PendingIcon from "@mui/icons-material/Pending";
import FilterListIcon from "@mui/icons-material/FilterList";
import SaveIcon from "@mui/icons-material/Save";
import DownloadIcon from "@mui/icons-material/Download";
import Topbar from "$components/topbar/Topbar";
import BreadcrumbsComponent from "$components/common/BreadcrumbsComponent";
import { useLocation, useNavigate } from "react-router-dom";
import * as assessmentService from "$api/services/courses/assessments";
import * as studentService from "$api/services/courses/students";
import * as courseService from "$api/services/courses/courses";
import { useAuth } from "$context/AuthContext";
import { toast } from "react-toastify";
import { canAssignGrades } from "$api/utils/permissions";

// Função para formatar nomes com capitalização adequada - igual ao CourseStudentsTab
const capitalizeWords = (name) => {
  if (!name) return "Nome Indisponível";
  return name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

export default function GradeAssignmentPage() {
  const [students, setStudents] = useState([]);
  const [assessment, setAssessment] = useState(null);
  const [assessmentDetails, setAssessmentDetails] = useState(null);
  const [courseDetails, setCourseDetails] = useState({});
  const [grades, setGrades] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [saveStatus, setSaveStatus] = useState({});
  const [invalidStatus, setInvalidStatus] = useState({});
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [attemptedSave, setAttemptedSave] = useState(false);
  const [missingGradesWarningShown, setMissingGradesWarningShown] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [showSaveWarning, setShowSaveWarning] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const courseId = params.get("courseId");
  const assessmentId = params.get("assessmentId");
  const inputRefs = useRef([]);

  const { currentUser, userDetails } = useAuth();
  
  // Verificar se o usuário é dono do curso ou admin
  const isCourseOwner = canAssignGrades(userDetails, courseDetails?.userId);

  // Carregar dados necessários ao iniciar
  useEffect(() => {
    if (!courseId || !assessmentId) {
      setError("Parâmetros inválidos");
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);

        // Carregar detalhes do curso
        const course = await courseService.fetchCourseDetails(courseId);
        setCourseDetails(course);

        // Carregar avaliação
        const assessments = await assessmentService.fetchAllAssessmentsByCourse(courseId);
        const currentAssessment = assessments.find(
          (a) => a.id === assessmentId
        );
        if (!currentAssessment) {
          setError("Avaliação não encontrada");
          setLoading(false);
          return;
        }
        setAssessment(currentAssessment);
        setAssessmentDetails(currentAssessment);

        // Carregar estudantes do curso usando o método enriquecido
        const courseStudents = await studentService.fetchCourseStudentsEnriched(
          courseId
        );
        setStudents(courseStudents);

        // Carregar notas existentes
        const existingGrades = await assessmentService.getAssessmentGrades(
          courseId,
          assessmentId
        );
        const gradesMap = {};
        const saveMap = {};

        existingGrades.forEach((grade) => {
          gradesMap[grade.studentId] = grade.grade.toString();
          saveMap[grade.studentId] = true; // Marca como salvo
        });

        setGrades(gradesMap);
        setSaveStatus(saveMap); // Marca todos os que já tinham nota como salvos
      } catch (err) {
        setError(err.message || "Erro ao carregar dados");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [courseId, assessmentId]);

  // Função para atualizar o valor da nota no estado
  const handleGradeChange = (studentId, value) => {
    setGrades((prev) => ({
      ...prev,
      [studentId]: value,
    }));

    // Validação instantânea
    const numValue = parseFloat(value);
    if (
      value.trim() !== "" &&
      (isNaN(numValue) || numValue < 0 || numValue > 10)
    ) {
      setInvalidStatus((prev) => ({
        ...prev,
        [studentId]: true,
      }));
      // Remova o toast daqui para evitar duplicidade!
    } else {
      setInvalidStatus((prev) => {
        const newStatus = { ...prev };
        delete newStatus[studentId];
        return newStatus;
      });
    }
  };

  // Função para salvar a nota quando o usuário clicar fora do campo
  const handleSaveGrade = async (studentId, value) => {
    const numValue = parseFloat(value);
    
    // Validação silenciosa - apenas marca como inválido
    if (
      value.trim() === "" ||
      isNaN(numValue) ||
      numValue < 0 ||
      numValue > 10
    ) {
      setInvalidStatus((prev) => ({
        ...prev,
        [studentId]: true,
      }));
      return;
    }

    setInvalidStatus((prev) => {
      const newStatus = { ...prev };
      delete newStatus[studentId];
      return newStatus;
    });

    // Marcar que está salvando
    setSaving((prev) => ({
      ...prev,
      [studentId]: true,
    }));

    try {
      await assessmentService.assignGrade(
        courseId,
        assessmentId,
        studentId,
        numValue
      );

      // Atualizar status de salvamento
      setSaveStatus((prev) => ({
        ...prev,
        [studentId]: true,
      }));

      // Toast de sucesso silencioso - apenas visual
    } catch (err) {
      toast.error(
        `Erro ao salvar nota: ${err.message}`
      );
    } finally {
      setSaving((prev) => {
        const newSaving = { ...prev };
        delete newSaving[studentId];
        return newSaving;
      });
    }
  };

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
      setPendingNavigation(`/adm-cursos?courseId=${courseId}&tab=5`);
      setShowExitWarning(true);
    } else {
      navigate(`/adm-cursos?courseId=${courseId}&tab=5`);
    }
  };

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
    
    // Aprovado (>= 6)
    if (numValue >= 6) {
      return "approved";
    }
    
    // Reprovado (< 6, incluindo zero)
    return "failed";
  };

  // Função para obter ícone de status
  const getStatusIcon = (status) => {
    switch (status) {
      case "approved":
        return <CheckCircleIcon sx={{ color: "#4caf50" }} />;
      case "failed":
        return <CancelIcon sx={{ color: "#f44336" }} />;
      case "pending":
        return <PendingIcon sx={{ color: "#9e9e9e" }} />;
      default:
        return null;
    }
  };

  // Função para obter label de status
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
  const filteredStudents = students.filter((student) => {
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
  });

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

  // Confirmar salvamento mesmo com notas pendentes
  const confirmSave = () => {
    setShowSaveWarning(false);
    toast.success("Notas salvas! Alguns alunos permanecem sem nota.");
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
    
    // Criar arquivo e fazer download
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `notas_${assessmentDetails?.name || 'avaliacao'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('CSV exportado com sucesso!');
  };

  // Navegação por teclado
  const handleKeyDown = (e, index) => {
    const totalStudents = filteredStudents.length;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = Math.min(index + 1, totalStudents - 1);
      setFocusedIndex(nextIndex);
      inputRefs.current[nextIndex]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = Math.max(index - 1, 0);
      setFocusedIndex(prevIndex);
      inputRefs.current[prevIndex]?.focus();
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (e.key === 'Enter') {
        e.preventDefault();
      }
      // Salvar nota atual
      const student = filteredStudents[index];
      const studentId = student.userId || student.id;
      handleSaveGrade(studentId, grades[studentId] || '');
      
      // Ir para o próximo
      if (index < totalStudents - 1) {
        const nextIndex = index + 1;
        setFocusedIndex(nextIndex);
        setTimeout(() => {
          inputRefs.current[nextIndex]?.focus();
        }, 50);
      }
    }
  };

  // Focar no primeiro input ao carregar
  useEffect(() => {
    if (!loading && filteredStudents.length > 0) {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [loading, filteredStudents.length]);

  // Função para verificar se há notas pendentes e mostrar aviso APENAS uma vez
  const checkMissingGrades = () => {
    if (missingGradesWarningShown) return;
    
    const studentsWithoutGrades = students.filter(student => {
      const studentId = student.userId || student.id;
      const grade = grades[studentId];
      return !grade || grade.trim() === "";
    });

    if (studentsWithoutGrades.length > 0 && !attemptedSave) {
      setAttemptedSave(true);
      setMissingGradesWarningShown(true);
      
      const studentNames = studentsWithoutGrades
        .slice(0, 3)
        .map(s => s.name)
        .join(", ");
      
      const additionalCount = studentsWithoutGrades.length - 3;
      const message = studentsWithoutGrades.length <= 3
        ? `Atenção: ${studentNames} ${studentsWithoutGrades.length === 1 ? 'está' : 'estão'} sem nota.`
        : `Atenção: ${studentNames} e mais ${additionalCount} estudante${additionalCount > 1 ? 's' : ''} estão sem nota.`;
      
      toast.warning(message, {
        autoClose: 5000,
      });
    }
  };

  // Chamar verificação ao tentar salvar
  useEffect(() => {
    if (attemptedSave && !missingGradesWarningShown) {
      checkMissingGrades();
    }
  }, [grades, attemptedSave]);

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
            { label: "Curso", path: `/adm-cursos?courseId=${courseId}&tab=5` },
            { label: "Avaliações", path: `/adm-cursos?courseId=${courseId}&tab=5` },
            { label: assessmentDetails?.name || "Atribuir Notas" },
          ]}
          onBack={handleBack}
        />

        {/* Título */}
        <Typography
          variant="h4"
          sx={{ fontWeight: "bold", mb: 1, color: "#333" }}
        >
          Atribuir Notas
        </Typography>

        {assessmentDetails && (
          <Typography variant="body1" sx={{ mb: 3, color: "#666" }}>
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
              <CircularProgress sx={{ color: "#9041c1" }} />
            </Box>
          ) : (
            <>
              {/* Instruções */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="body1" sx={{ color: "#666", mb: 2 }}>
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
                        <MenuItem value="approved">Aprovados (≥6)</MenuItem>
                        <MenuItem value="failed">Reprovados (&lt;6)</MenuItem>
                        <MenuItem value="pending">Pendentes (Sem nota)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>

                {/* Botões de ação */}
                <Box sx={{ display: 'flex', gap: 2, mt: 3, justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={handleExportCSV}
                    disabled={filteredStudents.length === 0}
                    sx={{
                      borderColor: '#9041c1',
                      color: '#9041c1',
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
                    startIcon={<SaveIcon />}
                    onClick={handleSaveAll}
                    disabled={!isCourseOwner || filteredStudents.length === 0}
                    sx={{
                      bgcolor: '#9041c1',
                      '&:hover': {
                        bgcolor: '#7d37a7',
                      },
                    }}
                  >
                    Salvar Notas
                  </Button>
                </Box>
              </Paper>

              {/* Tabela de Notas */}
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: "bold", width: "40%" }}>
                        Estudante
                      </TableCell>
                      <TableCell sx={{ fontWeight: "bold", width: "30%" }}>
                        Email
                      </TableCell>
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
                        const isInvalid = !!invalidStatus[studentId];
                        const isSaving = !!saving[studentId];
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
                                  value={grades[studentId] || ""}
                                  disabled={!isCourseOwner}
                                  onChange={(e) =>
                                    handleGradeChange(studentId, e.target.value)
                                  }
                                  onBlur={(e) =>
                                    handleSaveGrade(studentId, e.target.value)
                                  }
                                  onKeyDown={(e) => handleKeyDown(e, index)}
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
                                  <CircularProgress size={20} />
                                ) : isSaved ? (
                                  <CheckCircleIcon
                                    sx={{ color: "#4caf50", fontSize: 20 }}
                                  />
                                ) : null}
                              </Box>
                            </TableCell>
                            <TableCell align="center">
                              <Tooltip title={getStatusLabel(studentStatus)}>
                                {getStatusIcon(studentStatus)}
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Rodapé com contagem */}
              {filteredStudents.length > 0 && (
                <Box sx={{ mt: 2, p: 2, textAlign: "right" }}>
                  <Typography variant="body2" color="text.secondary">
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
