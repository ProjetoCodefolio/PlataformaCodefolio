import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  CircularProgress,
  Alert,
  Chip,
  Stack,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AssessmentIcon from "@mui/icons-material/Assessment";
import GroupsIcon from "@mui/icons-material/Groups";
import PersonIcon from "@mui/icons-material/Person";
import { useAuth } from "$context/AuthContext";
import { toast } from "react-toastify";
import {
  fetchAssignmentsByCourse,
  deleteAssignment,
} from "$api/services/courses/assignments";
import { fetchCourseDetails } from "$api/services/courses/courses";
import { notifyNewAssignment } from "$api/services/notifications";
import { canManageAssessments } from "$api/utils/permissions";
import SortableHeader from "$components/common/SortableHeader";
import { sortRows, getNextSort } from "$utils/tableSort";
import AssignmentForm from "./AssignmentForm";

export default function CourseAssignmentsTab() {
  const location = useLocation();
  const navigate = useNavigate();
  const { userDetails } = useAuth();
  const params = new URLSearchParams(location.search);
  const courseId = params.get("courseId");

  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [courseOwnerId, setCourseOwnerId] = useState(null);
  const [courseTitle, setCourseTitle] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [sortField, setSortField] = useState("title");
  const [sortOrder, setSortOrder] = useState("asc");

  const canManage = canManageAssessments(userDetails, courseOwnerId, courseId);

  const handleSort = (field) => {
    const next = getNextSort({ sortField, sortOrder }, field);
    setSortField(next.sortField);
    setSortOrder(next.sortOrder);
  };

  const load = async () => {
    if (!courseId) return;
    setLoading(true);
    setError(null);
    try {
      const [list, details] = await Promise.all([
        fetchAssignmentsByCourse(courseId),
        fetchCourseDetails(courseId),
      ]);
      setAssignments(list);
      setCourseOwnerId(details?.userId || null);
      setCourseTitle(details?.title || "");
    } catch (err) {
      setError(err.message || "Falha ao carregar enunciados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const handleNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleEdit = (assignment) => {
    setEditing(assignment);
    setFormOpen(true);
  };

  const handleDelete = async (assignment) => {
    if (!window.confirm(`Excluir o enunciado "${assignment.title}"? As entregas e grupos também serão removidos.`))
      return;
    try {
      await deleteAssignment(courseId, assignment.id);
      toast.success("Enunciado excluído.");
      load();
    } catch (err) {
      toast.error(err.message || "Erro ao excluir enunciado.");
    }
  };

  const handleSaved = async (assignmentId, isNew, title) => {
    await load();
    if (isNew) {
      // Notifica os alunos matriculados (in-app). E-mail fica atrás do seam.
      notifyNewAssignment(courseId, { id: assignmentId, title: title || "Novo trabalho" }, courseTitle);
    }
  };

  const fmtDate = (iso) =>
    iso
      ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
      : "Sem prazo";

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: "bold", color: "#333" }}>
          Trabalhos / Enunciados
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleNew}
          disabled={!canManage}
          sx={{ backgroundColor: "#9041c1", "&:hover": { backgroundColor: "#7d37a7" } }}
        >
          Novo enunciado
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper
        elevation={0}
        sx={{ p: 3, borderRadius: "12px", boxShadow: "0px 2px 8px rgba(0,0,0,0.1)" }}
      >
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", my: 3 }}>
            <CircularProgress sx={{ color: "#9041c1" }} />
          </Box>
        ) : assignments.length === 0 ? (
          <Alert severity="info">
            Nenhum enunciado cadastrado. Clique em "Novo enunciado" para criar o primeiro.
          </Alert>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                  <SortableHeader label="Título" field="title" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
                  <SortableHeader label="Prazo" field="dueDate" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
                  <TableCell sx={{ fontWeight: "bold" }}>Modo</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortRows(assignments, sortField, sortOrder).map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600 }}>{a.title}</Typography>
                      <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                        {a.flippedClassroom && (
                          <Chip size="small" label="Sala invertida" sx={{ bgcolor: "#ede7f6", fontSize: "0.7rem" }} />
                        )}
                        {a.linkedAssessmentId && (
                          <Chip size="small" label="Vale nota" sx={{ bgcolor: "#e6f4ea", color: "#2e7d32", fontSize: "0.7rem" }} />
                        )}
                        {a.allowLate && (
                          <Chip size="small" label="Aceita atraso" sx={{ bgcolor: "#fff3e0", fontSize: "0.7rem" }} />
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>{fmtDate(a.dueDate)}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        icon={a.mode === "group" ? <GroupsIcon /> : <PersonIcon />}
                        label={a.mode === "group" ? "Grupo" : "Individual"}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<AssessmentIcon />}
                          onClick={() =>
                            navigate(
                              `/course/assignment-submissions?courseId=${courseId}&assignmentId=${a.id}`
                            )
                          }
                          sx={{ color: "#1976d2", borderColor: "#1976d2", whiteSpace: "nowrap" }}
                        >
                          Entregas
                        </Button>
                        <IconButton size="small" disabled={!canManage} onClick={() => handleEdit(a)} sx={{ color: "#9041c1" }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" disabled={!canManage} onClick={() => handleDelete(a)} sx={{ color: "#f44336" }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {formOpen && (
        <AssignmentForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
          courseId={courseId}
          courseTitle={courseTitle}
          assignment={editing}
          onSaved={handleSaved}
        />
      )}
    </Box>
  );
}
