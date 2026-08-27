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
import DeleteIcon from "@mui/icons-material/Delete";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SearchIcon from "@mui/icons-material/Search";
import SortIcon from "@mui/icons-material/Sort";
import FilterListIcon from "@mui/icons-material/FilterList";
import AddToDriveIcon from "@mui/icons-material/AddToDrive";
import Topbar from "$components/topbar/Topbar";
import { useAuth } from "$context/AuthContext";
import { toast } from "react-toastify";
import { fetchAssignment } from "$api/services/courses/assignments";
import {
  fetchAllSubmissions,
  markSubmissionGraded,
  deleteSubmission,
} from "$api/services/courses/submissions";
import {
  fetchGroups,
  moveMember,
  removeMember,
} from "$api/services/courses/assignmentGroups";
import { fetchCourseStudentsEnriched } from "$api/services/courses/students";
import { fetchCourseDetails } from "$api/services/courses/courses";
import { assignGrade, getAssessmentGrades } from "$api/services/courses/assessments";
import { notifyGrade } from "$api/services/notifications";
import { canAssignGrades } from "$api/utils/permissions";
import { RichTextView } from "$components/common/RichTextEditor";

const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
    : "—";

const initials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");

const SORT_OPTIONS = [
  { value: "name", label: "Ordem alfabética" },
  { value: "recent", label: "Ordem de envio (mais recentes)" },
  { value: "ungraded", label: "Não avaliados primeiro" },
];

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "graded", label: "Avaliados" },
  { value: "pending", label: "Pendentes (sem nota)" },
];

const GRADE_BAND_OPTIONS = [
  { value: "all", label: "Todas as notas" },
  { value: "9-10", label: "9 – 10" },
  { value: "7-8.99", label: "7 – 8,9" },
  { value: "6-6.99", label: "6 – 6,9" },
  { value: "0-5.99", label: "Abaixo de 6" },
];

/** Retorna true se a nota (número ou null) cai na faixa selecionada. */
const gradeInBand = (grade, band) => {
  if (band === "all") return true;
  if (grade == null || grade === "") return false;
  const n = Number(grade);
  if (Number.isNaN(n)) return false;
  switch (band) {
    case "9-10":
      return n >= 9;
    case "7-8.99":
      return n >= 7 && n < 9;
    case "6-6.99":
      return n >= 6 && n < 7;
    case "0-5.99":
      return n < 6;
    default:
      return true;
  }
};

/**
 * Campo de nota com salvamento automático (ao sair do campo ou pressionar
 * Enter). Mostra o estado "Avaliado" em verde e valida a faixa 0–10.
 */
function GradeInput({ storedGrade, disabled, saving, onCommit }) {
  const [val, setVal] = useState(storedGrade ?? "");
  const [err, setErr] = useState("");

  useEffect(() => {
    setVal(storedGrade ?? "");
  }, [storedGrade]);

  const commit = () => {
    if (val === "" || String(val) === String(storedGrade ?? "")) {
      setErr("");
      return;
    }
    const n = Number(val);
    if (Number.isNaN(n) || n < 0 || n > 10) {
      setErr("0 a 10");
      return;
    }
    setErr("");
    onCommit(n);
  };

  const graded = storedGrade !== null && storedGrade !== undefined && storedGrade !== "";

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
      <TextField
        size="small"
        type="number"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.target.blur();
          }
        }}
        error={!!err}
        helperText={err || undefined}
        disabled={disabled}
        inputProps={{ min: 0, max: 10, step: 0.1, style: { width: 68 } }}
        sx={{
          "& .MuiOutlinedInput-root.Mui-focused fieldset": { borderColor: "#9041c1" },
        }}
      />
      {saving ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <CircularProgress size={12} sx={{ color: "#9041c1" }} />
          <Typography variant="caption" sx={{ color: "#9041c1" }}>
            Salvando…
          </Typography>
        </Box>
      ) : graded ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <CheckCircleIcon sx={{ fontSize: 14, color: "#2e7d32" }} />
          <Typography variant="caption" sx={{ color: "#2e7d32", fontWeight: 700 }}>
            Avaliado
          </Typography>
        </Box>
      ) : (
        <Typography variant="caption" sx={{ color: "#9e9e9e" }}>
          Não avaliado
        </Typography>
      )}
    </Box>
  );
}

export default function AssignmentSubmissionsDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { userDetails } = useAuth();
  const params = new URLSearchParams(location.search);
  const courseId = params.get("courseId");
  const assignmentId = params.get("assignmentId");

  const [assignment, setAssignment] = useState(null);
  const [students, setStudents] = useState([]);
  const [submissionsByKey, setSubmissionsByKey] = useState({});
  const [groups, setGroups] = useState([]);
  const [gradesByStudent, setGradesByStudent] = useState({});
  const [loading, setLoading] = useState(true);
  const [courseOwnerId, setCourseOwnerId] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [savingKey, setSavingKey] = useState(null);
  const [sortBy, setSortBy] = useState("name");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterGradeBand, setFilterGradeBand] = useState("all");
  const [filterGroup, setFilterGroup] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const canGrade = canAssignGrades(userDetails, courseOwnerId, courseId);
  const isGroup = assignment?.mode === "group";
  const studentsById = Object.fromEntries(
    students.map((s) => [s.userId, s.name || s.email || s.userId])
  );
  const photoById = Object.fromEntries(students.map((s) => [s.userId, s.photoURL || ""]));

  const load = useCallback(async () => {
    if (!courseId || !assignmentId) return;
    setLoading(true);
    try {
      const [a, subs, details] = await Promise.all([
        fetchAssignment(courseId, assignmentId),
        fetchAllSubmissions(courseId, assignmentId),
        fetchCourseDetails(courseId),
      ]);
      setAssignment(a);
      setCourseOwnerId(details?.userId || null);
      const subsMap = {};
      subs.forEach((s) => {
        subsMap[s.submitterKey] = s;
      });
      setSubmissionsByKey(subsMap);

      const enrolled = await fetchCourseStudentsEnriched(courseId);
      setStudents((enrolled || []).filter((s) => s.role !== "teacher"));

      if (a?.mode === "group") {
        setGroups(await fetchGroups(courseId, assignmentId));
      }

      if (a?.linkedAssessmentId) {
        const grades = await getAssessmentGrades(courseId, a.linkedAssessmentId);
        const gmap = {};
        (grades || []).forEach((g) => {
          gmap[g.studentId] = g.grade;
        });
        setGradesByStudent(gmap);
      }
    } catch (err) {
      console.error(err);
      toast.error("Falha ao carregar as entregas.");
    } finally {
      setLoading(false);
    }
  }, [courseId, assignmentId]);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Persiste a nota para um conjunto de alunos (1 para individual, N para grupo)
   * gravando em courseAssessments para refletir na média do curso.
   */
  const persistGrade = async (savingKeyId, studentIds, gradeValue, metaKey = null) => {
    if (!assignment?.linkedAssessmentId) {
      toast.warn("Este trabalho não vale nota. Defina um peso (%) no enunciado para poder avaliar.");
      return;
    }
    const grade = Number(gradeValue);
    if (Number.isNaN(grade) || grade < 0 || grade > 10) {
      toast.error("A nota deve estar entre 0 e 10.");
      return;
    }
    setSavingKey(savingKeyId);
    try {
      await Promise.all(
        studentIds.map((sid) =>
          assignGrade(courseId, assignment.linkedAssessmentId, sid, grade)
        )
      );
      // Metadado no envio só faz sentido quando existe uma entrega para a chave
      // (evita criar nós fantasmas ao dar nota individual a um membro de grupo).
      if (metaKey && submissionsByKey[metaKey]) {
        await markSubmissionGraded(courseId, assignmentId, metaKey, grade);
      }
      // Notifica cada aluno avaliado
      studentIds.forEach((sid) =>
        notifyGrade(sid, courseId, { id: assignmentId, title: assignment.title }, grade)
      );
      setGradesByStudent((prev) => {
        const next = { ...prev };
        studentIds.forEach((sid) => {
          next[sid] = grade;
        });
        return next;
      });
      toast.success("Nota salva e refletida em Avaliações.");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao lançar a nota.");
    } finally {
      setSavingKey(null);
    }
  };

  /**
   * Remove a entrega de um aluno (individual) ou de um grupo. Se a entrega tinha
   * vídeo de sala invertida, ele deixa de aparecer na lista de conteúdo.
   */
  const handleDeleteSubmission = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSubmission(courseId, assignmentId, deleteTarget.submitterKey);
      setSubmissionsByKey((prev) => {
        const next = { ...prev };
        delete next[deleteTarget.submitterKey];
        return next;
      });
      setDeleteTarget(null);
      toast.success("Entrega excluída.");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Erro ao excluir a entrega.");
    } finally {
      setDeleting(false);
    }
  };

  const statusChip = (submission) => {
    if (!submission) return <Chip size="small" label="Pendente" sx={{ bgcolor: "#eceff1", color: "#455a64", fontWeight: 700 }} />;
    return submission.isLate ? (
      <Chip size="small" label="Atrasada" sx={{ bgcolor: "#fff3e0", color: "#e65100", fontWeight: 700 }} />
    ) : (
      <Chip size="small" label="Entregue" sx={{ bgcolor: "#e6f4ea", color: "#2e7d32", fontWeight: 700 }} />
    );
  };

  // Ordenação/filtro dos alunos (modo individual)
  const sortStudents = (list) => {
    const filtered = list.filter((s) => {
      const matchesSearch = search
        ? (s.name || s.email || "").toLowerCase().includes(search.toLowerCase())
        : true;
      const grade = gradesByStudent[s.userId];
      const hasGrade = grade != null && grade !== "";
      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "graded" && hasGrade) ||
        (filterStatus === "pending" && !hasGrade);
      const matchesGrade = gradeInBand(grade, filterGradeBand);
      return matchesSearch && matchesStatus && matchesGrade;
    });
    const arr = [...filtered];
    arr.sort((a, b) => {
      if (sortBy === "recent") {
        const sa = submissionsByKey[a.userId]?.submittedAt || "";
        const sb = submissionsByKey[b.userId]?.submittedAt || "";
        // mais recentes primeiro; sem entrega vai para o fim
        if (!sa && !sb) return (a.name || "").localeCompare(b.name || "");
        if (!sa) return 1;
        if (!sb) return -1;
        return sb.localeCompare(sa);
      }
      if (sortBy === "ungraded") {
        const ga = gradesByStudent[a.userId] != null ? 1 : 0;
        const gb = gradesByStudent[b.userId] != null ? 1 : 0;
        if (ga !== gb) return ga - gb; // não avaliados (0) primeiro
        return (a.name || "").localeCompare(b.name || "");
      }
      return (a.name || a.email || "").localeCompare(b.name || b.email || "");
    });
    return arr;
  };

  // ----- Gestão manual de grupos (professor) -----
  const handleMove = async (userId, groupId) => {
    try {
      await moveMember({
        courseId,
        assignmentId,
        groupId,
        userId,
        maxPerGroup: assignment?.groups?.maxPerGroup || 0,
      });
      toast.success("Aluno movido de grupo.");
      setGroups(await fetchGroups(courseId, assignmentId));
    } catch (err) {
      toast.error(err.message || "Erro ao mover aluno.");
    }
  };

  const handleRemoveFromGroup = async (userId, groupId) => {
    try {
      await removeMember(courseId, assignmentId, groupId, userId);
      setGroups(await fetchGroups(courseId, assignmentId));
    } catch (err) {
      toast.error(err.message || "Erro ao remover do grupo.");
    }
  };

  const gradedCount = students.filter((s) => gradesByStudent[s.userId] != null).length;

  return (
    <>
      <Topbar hideSearch={true} />
      <Box sx={{ p: { xs: 1.5, sm: 3 }, maxWidth: 1100, mx: "auto", mt: { xs: 8, sm: 9 } }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ color: "#9041c1", mb: 1 }}>
          Voltar
        </Button>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress sx={{ color: "#9041c1" }} />
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
                  groups={groups}
                  submissionsByKey={submissionsByKey}
                  studentsById={studentsById}
                  photoById={photoById}
                  students={students}
                  gradesByStudent={gradesByStudent}
                  onSaveGrade={persistGrade}
                  onView={setViewing}
                  onMove={handleMove}
                  onRemove={handleRemoveFromGroup}
                  onDelete={setDeleteTarget}
                  statusChip={statusChip}
                  canGrade={canGrade}
                  savingKey={savingKey}
                  linkedAssessmentId={assignment.linkedAssessmentId}
                  filterGroup={filterGroup}
                  setFilterGroup={setFilterGroup}
                  filterStatus={filterStatus}
                  setFilterStatus={setFilterStatus}
                  filterGradeBand={filterGradeBand}
                  setFilterGradeBand={setFilterGradeBand}
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
                        {sortStudents(students).map((s) => {
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
                              <TableCell>{sub ? fmtDate(sub.submittedAt) : "—"}</TableCell>
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
                        {sortStudents(students).length === 0 && (
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
        <DialogTitle>Entrega {viewing?.who ? `— ${viewing.who}` : ""}</DialogTitle>
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

/**
 * Bloco de entregas por grupo. A nota pode ser lançada de duas formas:
 *  - "Nota do grupo": aplica o mesmo valor a todos os integrantes de uma vez;
 *  - "Notas por integrante": permite ajustar individualmente cada aluno, pois
 *    mesmo em um trabalho de grupo os membros podem ser avaliados de forma
 *    diferente. Ambas gravam em courseAssessments e refletem em Avaliações.
 * Inclui também gestão manual (mover/remover) de membros e exclusão da entrega.
 */
function GroupSubmissions({
  groups,
  submissionsByKey,
  studentsById,
  photoById,
  students,
  gradesByStudent,
  onSaveGrade,
  onView,
  onMove,
  onRemove,
  onDelete,
  statusChip,
  canGrade,
  savingKey,
  linkedAssessmentId,
  filterGroup,
  setFilterGroup,
  filterStatus,
  setFilterStatus,
  filterGradeBand,
  setFilterGradeBand,
}) {
  const groupedUserIds = new Set(
    groups.flatMap((g) => Object.keys(g.members || {}))
  );
  const ungrouped = students
    .filter((s) => !groupedUserIds.has(s.userId))
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  const hasGrade = (id) =>
    gradesByStudent[id] != null && gradesByStudent[id] !== "";

  // Aplica os filtros por grupo, status (avaliado = todos os membros com nota)
  // e faixa de nota (grupo entra se algum integrante cai na faixa).
  const visibleGroups = groups.filter((g) => {
    if (filterGroup !== "all" && g.groupId !== filterGroup) return false;
    const memberIds = Object.keys(g.members || {});
    if (filterStatus !== "all") {
      const allGraded = memberIds.length > 0 && memberIds.every(hasGrade);
      if (filterStatus === "graded" && !allGraded) return false;
      if (filterStatus === "pending" && allGraded) return false;
    }
    if (filterGradeBand !== "all") {
      const anyInBand = memberIds.some((id) =>
        gradeInBand(gradesByStudent[id], filterGradeBand)
      );
      if (!anyInBand) return false;
    }
    return true;
  });

  const showUngrouped =
    ungrouped.length > 0 &&
    filterGroup === "all" &&
    filterStatus !== "graded" &&
    filterGradeBand === "all";

  const memberChip = (id, groupId) => (
    <Chip
      key={id}
      size="small"
      avatar={<Avatar src={photoById[id] || undefined}>{(studentsById[id] || "?")[0]}</Avatar>}
      label={studentsById[id] || id.substring(0, 6)}
      onDelete={canGrade ? () => onRemove(id, groupId) : undefined}
      deleteIcon={<DeleteIcon />}
      sx={{ mr: 0.5, mb: 0.5, bgcolor: "#f5f0fb" }}
    />
  );

  return (
    <Stack spacing={2}>
      {/* Filtros do modo grupo */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
        <TextField
          select
          size="small"
          label="Grupo"
          value={filterGroup}
          onChange={(e) => setFilterGroup(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <FilterListIcon fontSize="small" sx={{ color: "#9041c1" }} />
              </InputAdornment>
            ),
          }}
          sx={{ flex: 1, minWidth: { xs: "100%", sm: 180 } }}
        >
          <MenuItem value="all">Todos os grupos</MenuItem>
          {groups.map((g) => (
            <MenuItem key={g.groupId} value={g.groupId}>
              Grupo {g.index + 1}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Status"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          sx={{ flex: 1, minWidth: { xs: "100%", sm: 180 } }}
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
          sx={{ flex: 1, minWidth: { xs: "100%", sm: 180 } }}
        >
          {GRADE_BAND_OPTIONS.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {visibleGroups.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
          Nenhum grupo corresponde aos filtros.
        </Typography>
      )}

      {visibleGroups.map((g) => {
        const key = `group_${g.groupId}`;
        const sub = submissionsByKey[key];
        const memberIds = Object.keys(g.members || {});
        return (
          <Paper key={g.groupId} variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
              <Box>
                <Typography sx={{ fontWeight: 700 }}>Grupo {g.index + 1}</Typography>
                {g.theme && (
                  <Typography variant="caption" color="text.secondary">Tema: {g.theme}</Typography>
                )}
              </Box>
              {statusChip(sub)}
            </Box>

            <Box sx={{ mt: 1 }}>
              {memberIds.length === 0 ? (
                <Typography variant="caption" color="text.secondary">Sem integrantes.</Typography>
              ) : (
                memberIds.map((id) => memberChip(id, g.groupId))
              )}
            </Box>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 1.5, alignItems: { xs: "stretch", sm: "center" }, flexWrap: "wrap" }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<VisibilityIcon />}
                disabled={!sub}
                onClick={() => onView({ ...sub, who: `Grupo ${g.index + 1}` })}
                sx={{ color: "#1976d2", borderColor: "#1976d2", alignSelf: { xs: "flex-start", sm: "center" } }}
              >
                Ver entrega
              </Button>
              {canGrade && (
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteOutlineIcon />}
                  disabled={!sub}
                  onClick={() =>
                    onDelete({ submitterKey: key, who: `Grupo ${g.index + 1}`, isGroup: true })
                  }
                  sx={{ alignSelf: { xs: "flex-start", sm: "center" } }}
                >
                  Excluir entrega
                </Button>
              )}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: "#555" }}>
                  Nota do grupo (todos):
                </Typography>
                <GradeInput
                  storedGrade={null}
                  disabled={!canGrade || memberIds.length === 0 || !linkedAssessmentId}
                  saving={savingKey === key}
                  onCommit={(n) => onSaveGrade(key, memberIds, n, key)}
                />
              </Box>
            </Stack>

            {/* Notas individuais por integrante */}
            {memberIds.length > 0 && (
              <Box sx={{ mt: 2, pt: 1.5, borderTop: "1px dashed #e0d3f0" }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "#7d37a7" }}>
                  Notas por integrante (edite para diferenciar)
                </Typography>
                <Stack spacing={1} sx={{ mt: 1 }}>
                  {memberIds.map((id) => (
                    <Box
                      key={id}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                        flexWrap: "wrap",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                        <Avatar
                          src={photoById[id] || undefined}
                          sx={{ width: 26, height: 26, fontSize: "0.7rem", bgcolor: "#9041c1" }}
                        >
                          {(studentsById[id] || "?")[0]}
                        </Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}>
                          {studentsById[id] || id.substring(0, 6)}
                        </Typography>
                      </Box>
                      <GradeInput
                        storedGrade={gradesByStudent[id] ?? null}
                        disabled={!canGrade || !linkedAssessmentId}
                        saving={savingKey === id}
                        onCommit={(n) => onSaveGrade(id, [id], n, null)}
                      />
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}
          </Paper>
        );
      })}

      {/* Alunos sem grupo */}
      {showUngrouped && (
        <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2, bgcolor: "#fff9f0", borderColor: "#ffe0b2" }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#e65100" }}>
              Alunos sem grupo
            </Typography>
            <Chip size="small" label={ungrouped.length} sx={{ bgcolor: "#ffe0b2", color: "#e65100", fontWeight: 700 }} />
          </Stack>
          <Stack spacing={1}>
            {ungrouped.map((s) => (
              <Box
                key={s.userId}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1,
                  flexWrap: "wrap",
                  bgcolor: "#fff",
                  border: "1px solid #ffe0b2",
                  borderRadius: 1.5,
                  px: 1.5,
                  py: 1,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                  <Avatar src={s.photoURL || undefined} sx={{ width: 30, height: 30, fontSize: "0.75rem", bgcolor: "#bdbdbd" }}>
                    {initials(s.name || s.email)}
                  </Avatar>
                  <Typography variant="body2" sx={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {s.name || s.email}
                  </Typography>
                </Box>
                <TextField
                  select
                  size="small"
                  label="Mover para"
                  defaultValue=""
                  sx={{ minWidth: 150 }}
                  disabled={!canGrade || groups.length === 0}
                  onChange={(e) => e.target.value && onMove(s.userId, e.target.value)}
                >
                  {groups.map((g) => (
                    <MenuItem key={g.groupId} value={g.groupId}>
                      Grupo {g.index + 1}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
            ))}
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}
