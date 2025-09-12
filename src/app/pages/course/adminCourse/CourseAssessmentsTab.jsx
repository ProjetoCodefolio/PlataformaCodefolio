import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Grid,
  InputAdornment,
  CircularProgress,
  Alert,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import AssignmentIcon from "@mui/icons-material/Assignment";
import { useNavigate, useLocation } from "react-router-dom";
import * as assessmentService from "$api/services/courses/assessments";
import { toast } from "react-toastify";

export default function CourseAssessmentsTab() {
  const navigate = useNavigate();
  const location = useLocation();
  const [assessmentName, setAssessmentName] = useState("");
  const [assessmentPercentage, setAssessmentPercentage] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [currentAssessmentId, setCurrentAssessmentId] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(false);

  const params = new URLSearchParams(location.search);
  const courseId = params.get("courseId");

  // Load assessments on component mount or when courseId changes
  useEffect(() => {
    if (courseId) {
      loadAssessments();
    }
  }, [courseId]);

  // Function to load assessments
  const loadAssessments = async () => {
    setLoading(true);
    try {
      const result = await assessmentService.fetchAssessments(courseId);
      setAssessments(result);
    } catch (err) {
      setError(err.message || "Falha ao carregar avaliações");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validate inputs
    if (!assessmentName.trim()) {
      setError("O nome da avaliação é obrigatório");
      return;
    }

    if (
      !assessmentPercentage.trim() ||
      isNaN(assessmentPercentage) ||
      Number(assessmentPercentage) <= 0 ||
      Number(assessmentPercentage) > 100
    ) {
      setError("O percentual deve ser um valor entre 1 e 100");
      return;
    }

    setLoading(true);
    try {
      if (isEditing) {
        await assessmentService.updateAssessment(
          courseId,
          currentAssessmentId,
          {
            name: assessmentName,
            percentage: Number(assessmentPercentage),
          }
        );
      
      } else {
        await assessmentService.createAssessment(courseId, {
          name: assessmentName,
          percentage: Number(assessmentPercentage),
        });
      
        toast.success("Avaliação criada com sucesso!"); // <-- Toast de sucesso ao cadastrar
      }

      // Reload assessments after changes
      await loadAssessments();
      resetForm();
    } catch (err) {
      setError(err.message || "Ocorreu um erro ao salvar a avaliação");
    } finally {
      setLoading(false);
    }
  };

  const handleEditAssessment = (assessment) => {
    setAssessmentName(assessment.name);
    setAssessmentPercentage(assessment.percentage.toString());
    setCurrentAssessmentId(assessment.id);
    setIsEditing(true);
  };

  const handleDeleteAssessment = async (id) => {
    setLoading(true);
    try {
      await assessmentService.deleteAssessment(courseId, id);
      setSuccess("Avaliação excluída com sucesso!");
      await loadAssessments();
    } catch (err) {
      setError(err.message || "Ocorreu um erro ao excluir a avaliação");
    } finally {
      setLoading(false);
    }
  };

  // Navegar para a página de atribuição de notas
  const navigateToGradeAssignment = (assessment) => {
    navigate(
      `/course/grade-assignment?courseId=${courseId}&assessmentId=${assessment.id}`
    );
  };

  const resetForm = () => {
    setAssessmentName("");
    setAssessmentPercentage("");
    setCurrentAssessmentId(null);
    setIsEditing(false);
  };

  const totalPercentage = assessments.reduce(
    (total, assessment) => total + assessment.percentage,
    0
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography
        variant="h5"
        sx={{ mb: 3, fontWeight: "bold", color: "#333" }}
      >
        Gerenciar Avaliações
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      )}

      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 4,
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Typography
          variant="h6"
          sx={{ mb: 2, fontWeight: "bold", color: "#333" }}
        >
          {isEditing ? "Editar Avaliação" : "Nova Avaliação"}
        </Typography>

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Nome da Avaliação"
                fullWidth
                required
                value={assessmentName}
                onChange={(e) => setAssessmentName(e.target.value)}
                placeholder="Ex: T1, A1, Projeto Final"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "#666" },
                    "&:hover fieldset": { borderColor: "#9041c1" },
                    "&.Mui-focused fieldset": { borderColor: "#9041c1" },
                  },
                  "& .MuiInputLabel-root": {
                    color: "#666",
                    "&.Mui-focused": { color: "#9041c1" },
                  },
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Percentual na Nota Final"
                fullWidth
                required
                type="number"
                value={assessmentPercentage}
                onChange={(e) => setAssessmentPercentage(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">%</InputAdornment>
                  ),
                }}
                inputProps={{
                  min: 1,
                  max: 100,
                  step: 1,
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "#666" },
                    "&:hover fieldset": { borderColor: "#9041c1" },
                    "&.Mui-focused fieldset": { borderColor: "#9041c1" },
                  },
                  "& .MuiInputLabel-root": {
                    color: "#666",
                    "&.Mui-focused": { color: "#9041c1" },
                  },
                }}
              />
            </Grid>

            <Grid item xs={12} sx={{ display: "flex", gap: 2 }}>
              <Button
                type="submit"
                variant="contained"
                startIcon={isEditing ? <EditIcon /> : <AddIcon />}
                disabled={loading}
                sx={{
                  backgroundColor: "#9041c1",
                  "&:hover": { backgroundColor: "#7d37a7" },
                  "&.Mui-disabled": {
                    backgroundColor: "rgba(0, 0, 0, 0.12)",
                  },
                }}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : isEditing ? (
                  "Atualizar Avaliação"
                ) : (
                  "Adicionar Avaliação"
                )}
              </Button>

              {isEditing && (
                <Button
                  variant="outlined"
                  onClick={resetForm}
                  sx={{
                    color: "#9041c1",
                    borderColor: "#9041c1",
                    "&:hover": {
                      borderColor: "#7d37a7",
                      backgroundColor: "rgba(144, 65, 193, 0.04)",
                    },
                  }}
                >
                  Cancelar
                </Button>
              )}
            </Grid>
          </Grid>
        </form>

        {totalPercentage > 100 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Atenção: O total dos percentuais ({totalPercentage}%) excede 100%.
          </Alert>
        )}
      </Paper>

      <Paper
        elevation={0}
        sx={{
          p: 3,
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Typography
          variant="h6"
          sx={{ mb: 2, fontWeight: "bold", color: "#333" }}
        >
          Avaliações Cadastradas
        </Typography>

        <Typography variant="subtitle2" sx={{ mb: 2, color: "#666" }}>
          Total: {totalPercentage}% da nota final
        </Typography>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", my: 3 }}>
            <CircularProgress sx={{ color: "#9041c1" }} />
          </Box>
        ) : assessments.length === 0 ? (
          <Alert severity="info">
            Nenhuma avaliação cadastrada. Adicione sua primeira avaliação usando
            o formulário acima.
          </Alert>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                  <TableCell sx={{ fontWeight: "bold" }}>Nome</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Percentual</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assessments.map((assessment) => (
                  <TableRow key={assessment.id}>
                    <TableCell>{assessment.name}</TableCell>
                    <TableCell>{assessment.percentage}%</TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleEditAssessment(assessment)}
                          sx={{ color: "#9041c1" }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteAssessment(assessment.id)}
                          sx={{ color: "#f44336" }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<AssignmentIcon />}
                          onClick={() => navigateToGradeAssignment(assessment)}
                          sx={{
                            ml: 1,
                            color: "#4caf50",
                            borderColor: "#4caf50",
                            "&:hover": {
                              borderColor: "#388e3c",
                              backgroundColor: "rgba(76, 175, 80, 0.04)",
                            },
                          }}
                        >
                          Atribuir Nota
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}
