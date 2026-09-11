import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Chip,
  Stack,
  MenuItem,
  Avatar,
  InputAdornment,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteIcon from "@mui/icons-material/Delete";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import FilterListIcon from "@mui/icons-material/FilterList";
import GradeInput from "./GradeInput";
import FeedbackInput from "./FeedbackInput";
import { STATUS_FILTER_OPTIONS, GRADE_BAND_OPTIONS, gradeInBand } from "./constants";

/**
 * Bloco de entregas por grupo. A nota pode ser lançada de duas formas:
 *  - "Nota do grupo": aplica o mesmo valor a todos os integrantes de uma vez;
 *  - "Notas por integrante": permite ajustar individualmente cada aluno, pois
 *    mesmo em um trabalho de grupo os membros podem ser avaliados de forma
 *    diferente. Ambas gravam em courseAssessments e refletem em Avaliações.
 * Inclui também gestão manual (mover/remover) de membros e exclusão da entrega.
 *
 * @param {Object} data - { groups, submissionsByKey, studentsById, photoById, students, gradesByStudent, feedbackByStudent }
 * @param {Object} filters - { filterGroup, setFilterGroup, filterStatus, setFilterStatus, filterGradeBand, setFilterGradeBand }
 * @param {Object} actions - { onSaveGrade, onSaveFeedback, onView, onMove, onRemove, onDelete }
 * @param {Object} saving - { key: savingKey, feedbackKey: savingFeedbackKey }
 */
export default function GroupSubmissions({
  data,
  filters,
  actions,
  statusChip,
  canGrade,
  saving,
  linkedAssessmentId,
}) {
  const { groups, submissionsByKey, studentsById, photoById, students, gradesByStudent, feedbackByStudent } = data;
  const { filterGroup, setFilterGroup, filterStatus, setFilterStatus, filterGradeBand, setFilterGradeBand } = filters;
  const { onSaveGrade, onSaveFeedback, onView, onMove, onRemove, onDelete } = actions;

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
        // O texto é o mesmo para o grupo inteiro; basta o do primeiro integrante
        // que já tenha recebido.
        const feedbackDoGrupo =
          memberIds.map((id) => feedbackByStudent?.[id]).find(Boolean) || "";
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
                  saving={saving.key === key}
                  onCommit={(n) => onSaveGrade(key, memberIds, n, key)}
                />
              </Box>
            </Stack>

            {memberIds.length > 0 && (
              <Box sx={{ mt: 2, pt: 1.5, borderTop: "1px dashed #e0d3f0" }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "#7d37a7" }}>
                  Feedback para o grupo
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <FeedbackInput
                    storedFeedback={feedbackDoGrupo}
                    disabled={!canGrade || !linkedAssessmentId}
                    saving={saving.feedbackKey === key}
                    onCommit={(texto) => onSaveFeedback(key, memberIds, texto)}
                  />
                </Box>
              </Box>
            )}

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
                        saving={saving.key === id}
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
                    {(studentsById[s.userId] || s.name || s.email || "?")[0]}
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
