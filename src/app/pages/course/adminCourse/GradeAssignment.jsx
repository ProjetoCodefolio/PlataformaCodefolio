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
  Avatar,
  CircularProgress,
  Alert,
  IconButton,
  Breadcrumbs,
  Link,
  Stack,
  Tooltip,
  Grid,
  Card,
  CardContent,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import Topbar from "$components/topbar/Topbar";
import { useLocation, useNavigate } from "react-router-dom";
import * as assessmentService from "$api/services/courses/assessments";
import * as studentService from "$api/services/courses/students";
import * as courseService from "$api/services/courses/courses";
import { toast } from "react-toastify"; // Adicione esta linha

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
  const [courseDetails, setCourseDetails] = useState(null);
  const [grades, setGrades] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [saveStatus, setSaveStatus] = useState({});
  const [invalidStatus, setInvalidStatus] = useState({});
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const courseId = params.get("courseId");
  const assessmentId = params.get("assessmentId");

  const inputRefs = useRef([]);

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
        const assessments = await assessmentService.fetchAssessments(courseId);
        const currentAssessment = assessments.find(
          (a) => a.id === assessmentId
        );
        if (!currentAssessment) {
          setError("Avaliação não encontrada");
          setLoading(false);
          return;
        }
        setAssessment(currentAssessment);

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
      toast.error(
        `Nota inválida para ${
          students.find((s) => s.userId === studentId)?.name || "estudante"
        }. Use valores entre 0 e 10.`
      );
      return;
    }

    setInvalidStatus((prev) => {
      const newStatus = { ...prev };
      delete newStatus[studentId];
      return newStatus;
    });

    // Marcar que está salvando para este estudante
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

      // Atualizar status de salvamento (mantém o check até sobrescrever)
      setSaveStatus((prev) => ({
        ...prev,
        [studentId]: true,
      }));

      // Remova o toast de sucesso daqui!
    } catch (err) {
      toast.error(
        `Erro ao salvar nota para ${
          students.find((s) => s.userId === studentId)?.name || "estudante"
        }: ${err.message}`
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
    navigate(`/adm-cursos?courseId=${courseId}&tab=5`);
  };

  // Filtrar alunos pelo nome
  const filteredStudents = students.filter((student) =>
    (student.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <IconButton onClick={handleBack} sx={{ mr: 1, color: "#9041c1" }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h4" sx={{ fontWeight: "bold" }}>
              Atribuição de Notas
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
                    <strong>Curso:</strong>{" "}
                    {courseDetails?.title || "Carregando..."}
                  </Typography>
                  <Typography variant="body1">
                    <strong>Descrição:</strong>{" "}
                    {courseDetails?.description || "Sem descrição"}
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
                    Informações da Avaliação
                  </Typography>
                  <Typography variant="body1">
                    <strong>Nome:</strong> {assessment?.name || "Carregando..."}
                  </Typography>
                  <Typography variant="body1">
                    <strong>Percentual na Nota Final:</strong>{" "}
                    {assessment?.percentage || 0}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>

        {/* Alert de erro geral, não de nota inválida */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
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
              <Box sx={{ mb: 3 }}>
                <Typography variant="body1" sx={{ color: "#666" }}>
                  Digite as notas diretamente nos campos abaixo. As notas são
                  salvas automaticamente quando você clica fora do campo.
                </Typography>
                <TextField
                  fullWidth
                  variant="outlined"
                  size="small"
                  placeholder="Buscar estudante por nome..."
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

                <Typography variant="body2" sx={{ mt: 1, color: "#666" }}>
                  Percentual desta avaliação:{" "}
                  <strong>{assessment?.percentage}%</strong> da nota final
                </Typography>
              </Box>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                      <TableCell sx={{ fontWeight: "bold", width: "50%" }}>
                        Estudante
                      </TableCell>
                      <TableCell sx={{ fontWeight: "bold", width: "30%" }}>
                        Email
                      </TableCell>
                      <TableCell sx={{ fontWeight: "bold", width: "20%" }}>
                        Nota (0-10)
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredStudents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} align="center" sx={{ py: 3 }}>
                          <Typography variant="body1" color="textSecondary">
                            Nenhum estudante encontrado.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStudents.map((student, idx) => {
                        const studentId = student.userId || student.id;
                        const isInvalid = !!invalidStatus[studentId];
                        const isSaving = !!saving[studentId];
                        const isSaved = !!saveStatus[studentId];

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
                                  onChange={(e) =>
                                    handleGradeChange(studentId, e.target.value)
                                  }
                                  onBlur={(e) =>
                                    handleSaveGrade(studentId, e.target.value)
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      handleSaveGrade(
                                        studentId,
                                        e.target.value
                                      );
                                      if (inputRefs.current[idx + 1]) {
                                        inputRefs.current[idx + 1].focus();
                                      }
                                    }
                                  }}
                                  inputRef={(el) =>
                                    (inputRefs.current[idx] = el)
                                  }
                                  type="number"
                                  error={isInvalid}
                                  inputProps={{
                                    min: 0,
                                    max: 10,
                                    step: 0.1,
                                    style: { textAlign: "center" },
                                  }}
                                  sx={{
                                    width: "80px",
                                    "& .MuiOutlinedInput-root": {
                                      "& fieldset": {
                                        borderColor: isInvalid
                                          ? "#e53935"
                                          : "#ccc",
                                      },
                                      "&:hover fieldset": {
                                        borderColor: isInvalid
                                          ? "#e53935"
                                          : "#9041c1",
                                      },
                                      "&.Mui-focused fieldset": {
                                        borderColor: isInvalid
                                          ? "#e53935"
                                          : "#9041c1",
                                      },
                                    },
                                  }}
                                />

                                {isSaving && (
                                  <CircularProgress
                                    size={20}
                                    sx={{ color: "#9041c1" }}
                                  />
                                )}

                                {/* Ícones de status ao lado do campo de nota */}
                                {!isSaving && isSaved && !isInvalid && (
                                  <Tooltip title="Nota salva com sucesso">
                                    <CheckCircleIcon
                                      sx={{ color: "#4caf50" }}
                                    />
                                  </Tooltip>
                                )}
                                {!isSaving && isInvalid && (
                                  <Tooltip title="Nota inválida">
                                    <CancelIcon sx={{ color: "#e53935" }} />
                                  </Tooltip>
                                )}
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </Paper>
      </Box>
    </>
  );
}
