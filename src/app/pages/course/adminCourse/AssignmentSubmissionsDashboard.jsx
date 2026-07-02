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
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SearchIcon from "@mui/icons-material/Search";
import SortIcon from "@mui/icons-material/Sort";
import Topbar from "$components/topbar/Topbar";
import { useAuth } from "$context/AuthContext";
import { toast } from "react-toastify";
import { fetchAssignment } from "$api/services/courses/assignments";
import {
  fetchAllSubmissions,
  markSubmissionGraded,
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

  const canGrade = canAssignGrades(userDetails, courseOwnerId);
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
  const persistGrade = async (key, studentIds, gradeValue) => {
    if (!assignment?.linkedAssessmentId) {
      toast.warn("Este trabalho não vale nota. Defina um peso (%) no enunciado para poder avaliar.");
      return;
    }
    const grade = Number(gradeValue);
    if (Number.isNaN(grade) || grade < 0 || grade > 10) {
      toast.error("A nota deve estar entre 0 e 10.");
      return;
    }
    setSavingKey(key);
    try {
      await Promise.all(
        studentIds.map((sid) =>
          assignGrade(courseId, assignment.linkedAssessmentId, sid, grade)
        )
      );
      const submitterKey = isGroup ? key : studentIds[0];
      await markSubmissionGraded(courseId, assignmentId, submitterKey, grade);
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
    const filtered = search
      ? list.filter((s) =>
          (s.name || s.email || "").toLowerCase().includes(search.toLowerCase())
        )
      : list;
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
                  statusChip={statusChip}
                  canGrade={canGrade}
                  savingKey={savingKey}
                  linkedAssessmentId={assignment.linkedAssessmentId}
                />
              ) : (
                <>
                  {/* Filtros / ordenação */}
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1.5}
                    sx={{ mb: 2 }}
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
                      sx={{ minWidth: { xs: "100%", sm: 260 } }}
                    >
                      {SORT_OPTIONS.map((o) => (
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
                          <TableCell sx={{ fontWeight: "bold" }}>Ver</TableCell>
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
                                  onCommit={(n) => persistGrade(s.userId, [s.userId], n)}
                                />
                              </TableCell>
                              <TableCell>
                                <IconButton
                                  size="small"
                                  disabled={!sub}
                                  onClick={() => setViewing({ ...sub, who: s.name || s.email })}
                                  sx={{ color: "#1976d2" }}
                                >
                                  <VisibilityIcon fontSize="small" />
                                </IconButton>
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
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{viewing.content.text}</Typography>
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
          {!viewing?.content?.text && !viewing?.content?.link && !viewing?.content?.video && (
            <Typography variant="body2" color="text.secondary">Sem conteúdo.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewing(null)} sx={{ color: "#9041c1" }}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

/**
 * Bloco de entregas por grupo, com nota (auto-salva) aplicada a todos os
 * integrantes e gestão manual (mover/remover) de membros pelo professor.
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
  statusChip,
  canGrade,
  savingKey,
  linkedAssessmentId,
}) {
  const groupedUserIds = new Set(
    groups.flatMap((g) => Object.keys(g.members || {}))
  );
  const ungrouped = students
    .filter((s) => !groupedUserIds.has(s.userId))
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

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
      {groups.map((g) => {
        const key = `group_${g.groupId}`;
        const sub = submissionsByKey[key];
        const memberIds = Object.keys(g.members || {});
        const currentGrade = memberIds.length ? gradesByStudent[memberIds[0]] ?? "" : "";
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
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: "#555" }}>
                  Nota:
                </Typography>
                <GradeInput
                  storedGrade={currentGrade === "" ? null : currentGrade}
                  disabled={!canGrade || memberIds.length === 0 || !linkedAssessmentId}
                  saving={savingKey === key}
                  onCommit={(n) => onSaveGrade(key, memberIds, n)}
                />
              </Box>
            </Stack>
          </Paper>
        );
      })}

      {/* Alunos sem grupo */}
      {ungrouped.length > 0 && (
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
