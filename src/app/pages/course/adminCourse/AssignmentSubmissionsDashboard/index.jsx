import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  Button,
  TextField,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Link,
  Stack,
  MenuItem,
  IconButton,
  Avatar,
  InputAdornment,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SearchIcon from "@mui/icons-material/Search";
import SortIcon from "@mui/icons-material/Sort";
import FilterListIcon from "@mui/icons-material/FilterList";
import AddToDriveIcon from "@mui/icons-material/AddToDrive";
import Topbar from "$components/topbar/Topbar";
import { useAuth } from "$context/AuthContext";
import { canAssignGrades } from "$api/utils/permissions";
import { RichTextView } from "$components/common/RichTextEditor";
import { fmtDate, initials } from "./format";
import { SORT_OPTIONS, STATUS_FILTER_OPTIONS, GRADE_BAND_OPTIONS } from "./constants";
import GradeInput from "./GradeInput";
import GroupSubmissions from "./GroupSubmissions";
import { useAssignmentSubmissionsData } from "./hooks/useAssignmentSubmissionsData";
import { useGradeAndFeedbackPersistence } from "./hooks/useGradeAndFeedbackPersistence";
import { useSubmissionDeletion } from "./hooks/useSubmissionDeletion";
import { useGroupManagement } from "./hooks/useGroupManagement";
import { useSubmissionsFilters } from "./hooks/useSubmissionsFilters";

export default function AssignmentSubmissionsDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { userDetails } = useAuth();
  const params = new URLSearchParams(location.search);
  const courseId = params.get("courseId");
  const assignmentId = params.get("assignmentId");

  const [viewing, setViewing] = useState(null);

  const {
    assignment,
    students,
    submissionsByKey,
    setSubmissionsByKey,
    groups,
    setGroups,
    gradesByStudent,
    setGradesByStudent,
    feedbackByStudent,
    setFeedbackByStudent,
    courseOwnerId,
    loading,
  } = useAssignmentSubmissionsData({ courseId, assignmentId });

  const { savingKey, savingFeedbackKey, persistGrade, persistFeedback } =
    useGradeAndFeedbackPersistence({
      courseId,
      assignmentId,
      assignment,
      submissionsByKey,
      setGradesByStudent,
      setFeedbackByStudent,
    });

  const { deleteTarget, setDeleteTarget, deleting, handleDeleteSubmission } =
    useSubmissionDeletion({ courseId, assignmentId, setSubmissionsByKey });

  const { handleMove, handleRemoveFromGroup } = useGroupManagement({
    courseId,
    assignmentId,
    assignment,
    setGroups,
  });

  const {
    sortBy,
    setSortBy,
    search,
    setSearch,
    filterStatus,
    setFilterStatus,
    filterGradeBand,
    setFilterGradeBand,
    filterGroup,
    setFilterGroup,
    sortStudents,
  } = useSubmissionsFilters();

  const canGrade = canAssignGrades(userDetails, courseOwnerId, courseId);
  const isGroup = assignment?.mode === "group";
  const studentsById = Object.fromEntries(
    students.map((s) => [s.userId, s.name || s.email || s.userId])
  );
  const photoById = Object.fromEntries(students.map((s) => [s.userId, s.photoURL || ""]));

  const statusChip = (submission) => {
    if (!submission) return <Chip size="small" label="Pendente" sx={{ bgcolor: "#eceff1", color: "#455a64", fontWeight: 700 }} />;
    return submission.isLate ? (
      <Chip size="small" label="Atrasada" sx={{ bgcolor: "#fff3e0", color: "#e65100", fontWeight: 700 }} />
    ) : (
      <Chip size="small" label="Entregue" sx={{ bgcolor: "#e6f4ea", color: "#2e7d32", fontWeight: 700 }} />
    );
  };

  const gradedCount = students.filter((s) => gradesByStudent[s.userId] != null).length;
  const visibleStudents = sortStudents(students, { gradesByStudent, submissionsByKey });

  return (
    <>
      <Topbar hideSearch={true} />
      <Box sx={{ p: { xs: 1.5, sm: 3 }, maxWidth: 1100, mx: "auto", mt: { xs: 8, sm: 9 } }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ color: "#9041c1", mb: 1 }}>
          Voltar
        </Button>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <Loader />
          </Box>
        ) : !assignment ? (
          <Alert severity="error">Enunciado não encontrado.</Alert>
        ) : (
          <>
            <Typography variant="h4" sx={{ fontWeight: 800, color: "#333", mb: 0.5, fontSize: { xs: "1.5rem", sm: "2.125rem" } }}>
              {assignment.title}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap", gap: 1 }}>
              <Chip size="small" label={`Prazo: ${fmtDate(assignment.dueDate)}`} sx={{ bgcolor: "#f0e9f8", color: "#7d37a7", fontWeight: 700 }} />
              <Chip size="small" label={isGroup ? "Em grupo" : "Individual"} sx={{ bgcolor: "#eceff1", fontWeight: 700 }} />
              <Chip
                size="small"
                label={assignment.linkedAssessmentId ? "Vale nota" : "Não vale nota"}
                sx={{ bgcolor: assignment.linkedAssessmentId ? "#e6f4ea" : "#fdecea", color: assignment.linkedAssessmentId ? "#2e7d32" : "#c62828", fontWeight: 700 }}
              />
              {!isGroup && (
                <Chip size="small" label={`${gradedCount}/${students.length} avaliados`} sx={{ bgcolor: "#eef7ff", color: "#1565c0", fontWeight: 700 }} />
              )}
            </Stack>

            {!assignment.linkedAssessmentId && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Este trabalho não está vinculado a uma avaliação com peso. Defina um peso (%) ao editar
                o enunciado para poder lançar notas que contam na média do curso.
              </Alert>
            )}

            <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 3 }, borderRadius: "12px", boxShadow: "0px 2px 8px rgba(0,0,0,0.1)" }}>
              {isGroup ? (
                <GroupSubmissions
                  data={{
                    groups,
                    submissionsByKey,
                    studentsById,
                    photoById,
                    students,
                    gradesByStudent,
                    feedbackByStudent,
                  }}
                  filters={{
                    filterGroup,
                    setFilterGroup,
                    filterStatus,
                    setFilterStatus,
                    filterGradeBand,
                    setFilterGradeBand,
                  }}
                  actions={{
                    onSaveGrade: persistGrade,
                    onSaveFeedback: persistFeedback,
                    onView: setViewing,
                    onMove: handleMove,
                    onRemove: handleRemoveFromGroup,
                    onDelete: setDeleteTarget,
                  }}
                  statusChip={statusChip}
                  canGrade={canGrade}
                  saving={{ key: savingKey, feedbackKey: savingFeedbackKey }}
                  linkedAssessmentId={assignment.linkedAssessmentId}
                />
              ) : (
                <>
                  {/* Filtros / ordenação */}
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1.5}
                    sx={{ mb: 1.5 }}
                  >
                    <TextField
                      size="small"
                      placeholder="Buscar aluno..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon fontSize="small" sx={{ color: "#9041c1" }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      select
                      size="small"
                      label="Ordenar por"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SortIcon fontSize="small" sx={{ color: "#9041c1" }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ minWidth: { xs: "100%", sm: 240 } }}
                    >
                      {SORT_OPTIONS.map((o) => (
                        <MenuItem key={o.value} value={o.value}>
                          {o.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Stack>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1.5}
                    sx={{ mb: 2 }}
                  >
                    <TextField
                      select
                      size="small"
                      label="Status"
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <FilterListIcon fontSize="small" sx={{ color: "#9041c1" }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ flex: 1, minWidth: { xs: "100%", sm: 200 } }}
                    >
                      {STATUS_FILTER_OPTIONS.map((o) => (
                        <MenuItem key={o.value} value={o.value}>
                          {o.label}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      select
                      size="small"
                      label="Nota"
                      value={filterGradeBand}
                      onChange={(e) => setFilterGradeBand(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <FilterListIcon fontSize="small" sx={{ color: "#9041c1" }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ flex: 1, minWidth: { xs: "100%", sm: 200 } }}
                    >
                      {GRADE_BAND_OPTIONS.map((o) => (
                        <MenuItem key={o.value} value={o.value}>
                          {o.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Stack>

                  <TableContainer sx={{ overflowX: "auto" }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                          <TableCell sx={{ fontWeight: "bold" }}>Aluno</TableCell>
                          <TableCell sx={{ fontWeight: "bold" }}>Entrega</TableCell>
                          <TableCell sx={{ fontWeight: "bold" }}>Enviada em</TableCell>
                          <TableCell sx={{ fontWeight: "bold" }}>Nota (0–10)</TableCell>
                          <TableCell sx={{ fontWeight: "bold" }} align="center">Ações</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {visibleStudents.map((s) => {
                          const sub = submissionsByKey[s.userId];
                          return (
                            <TableRow key={s.userId} hover>
                              <TableCell>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                  <Avatar src={s.photoURL || undefined} sx={{ width: 30, height: 30, fontSize: "0.75rem", bgcolor: "#9041c1" }}>
                                    {initials(s.name || s.email)}
                                  </Avatar>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {s.name || s.email}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>{statusChip(sub)}</TableCell>
                              <TableCell>{sub ? fmtDate(sub.submittedAt) : "-"}</TableCell>
                              <TableCell>
                                <GradeInput
                                  storedGrade={gradesByStudent[s.userId]}
                                  disabled={!canGrade || !assignment.linkedAssessmentId}
                                  saving={savingKey === s.userId}
                                  onCommit={(n) => persistGrade(s.userId, [s.userId], n, s.userId)}
                                />
                              </TableCell>
                              <TableCell align="center">
                                <Box sx={{ display: "flex", justifyContent: "center" }}>
                                  <IconButton
                                    size="small"
                                    disabled={!sub}
                                    onClick={() => setViewing({ ...sub, who: s.name || s.email })}
                                    sx={{ color: "#1976d2" }}
                                  >
                                    <VisibilityIcon fontSize="small" />
                                  </IconButton>
                                  {canGrade && (
                                    <IconButton
                                      size="small"
                                      disabled={!sub}
                                      onClick={() =>
                                        setDeleteTarget({
                                          submitterKey: s.userId,
                                          who: s.name || s.email,
                                          isGroup: false,
                                        })
                                      }
                                      sx={{ color: "#d32f2f" }}
                                      title="Excluir entrega"
                                    >
                                      <DeleteOutlineIcon fontSize="small" />
                                    </IconButton>
                                  )}
                                </Box>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {visibleStudents.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5}>
                              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                                Nenhum aluno encontrado.
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
            </Paper>
          </>
        )}
      </Box>

      {/* Dialog de visualização de entrega */}
      <Dialog open={!!viewing} onClose={() => setViewing(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Entrega{viewing?.who ? ` de ${viewing.who}` : ""}</DialogTitle>
        <DialogContent dividers>
          {viewing?.content?.text && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Texto</Typography>
              <RichTextView html={viewing.content.text} sx={{ fontSize: "0.875rem", color: "#333" }} />
            </Box>
          )}
          {viewing?.content?.link && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Link</Typography>
              <Link href={viewing.content.link} target="_blank" rel="noopener noreferrer">
                {viewing.content.link}
              </Link>
            </Box>
          )}
          {viewing?.content?.drive && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 0.5 }}>
                <AddToDriveIcon fontSize="small" sx={{ color: "#1a73e8" }} /> Google Drive
              </Typography>
              <Link href={viewing.content.drive} target="_blank" rel="noopener noreferrer">
                {viewing.content.drive}
              </Link>
            </Box>
          )}
          {viewing?.content?.video && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Vídeo (sala de aula invertida)</Typography>
              <Typography variant="body2">{viewing.content.video.title}</Typography>
              <Link href={viewing.content.video.youtubeUrl} target="_blank" rel="noopener noreferrer">
                {viewing.content.video.youtubeUrl}
              </Link>
              {viewing.content.video.description && (
                <Typography variant="body2" sx={{ color: "#666", mt: 0.5, whiteSpace: "pre-wrap" }}>
                  {viewing.content.video.description}
                </Typography>
              )}
            </Box>
          )}
          {!viewing?.content?.text && !viewing?.content?.link && !viewing?.content?.drive && !viewing?.content?.video && (
            <Typography variant="body2" color="text.secondary">Sem conteúdo.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewing(null)} sx={{ color: "#9041c1" }}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Confirmação de exclusão de entrega */}
      <Dialog open={!!deleteTarget} onClose={() => !deleting && setDeleteTarget(null)}>
        <DialogTitle>Excluir entrega?</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2">
            {deleteTarget?.isGroup
              ? `A entrega do ${deleteTarget?.who} será removida (inclusive vídeos de sala invertida). Esta ação não pode ser desfeita.`
              : `A entrega de ${deleteTarget?.who} será removida (inclusive vídeos de sala invertida). Esta ação não pode ser desfeita.`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting} sx={{ color: "#666" }}>
            Cancelar
          </Button>
          <Button
            onClick={handleDeleteSubmission}
            disabled={deleting}
            variant="contained"
            color="error"
            startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <DeleteOutlineIcon />}
          >
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
