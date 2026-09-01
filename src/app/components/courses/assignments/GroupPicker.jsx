import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  Chip,
  CircularProgress,
  Alert,
  Stack,
  Avatar,
} from "@mui/material";
import GroupsIcon from "@mui/icons-material/Groups";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import LogoutIcon from "@mui/icons-material/Logout";
import { toast } from "react-toastify";
import {
  fetchGroups,
  joinGroup,
  leaveAllGroups,
} from "$api/services/courses/assignmentGroups";
import { fetchCourseStudentsEnriched } from "$api/services/courses/students";

const initials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");

/**
 * Seletor de grupos para o aluno, exibido como uma lista (um grupo abaixo do
 * outro). Cada grupo mostra seus integrantes com uma pequena foto. O aluno só
 * consegue enviar a entrega estando em um grupo.
 */
export default function GroupPicker({
  courseId,
  assignment,
  userId,
  onGroupChange,
}) {
  const [groups, setGroups] = useState([]);
  const [studentsById, setStudentsById] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const maxPerGroup = assignment?.groups?.maxPerGroup || 0;
  const changeDeadline = assignment?.groups?.changeDeadline || "";
  const deadlinePassed =
    changeDeadline &&
    !Number.isNaN(new Date(changeDeadline).getTime()) &&
    Date.now() > new Date(changeDeadline).getTime();

  const currentGroupId =
    groups.find((g) => g.members && g.members[userId])?.groupId || null;

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [gs, students] = await Promise.all([
        fetchGroups(courseId, assignment.id),
        fetchCourseStudentsEnriched(courseId),
      ]);
      setGroups(gs);
      const map = {};
      (students || []).forEach((s) => {
        map[s.userId] = {
          name: s.name || s.email || s.userId,
          photoURL: s.photoURL || "",
        };
      });
      setStudentsById(map);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [courseId, assignment.id]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    onGroupChange?.(currentGroupId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentGroupId]);

  const handleJoin = async (groupId) => {
    setBusy(true);
    try {
      await joinGroup({
        courseId,
        assignmentId: assignment.id,
        groupId,
        userId,
        maxPerGroup,
        changeDeadline,
      });
      toast.success("Você entrou no grupo.");
      await reload();
    } catch (err) {
      toast.error(err.message || "Não foi possível entrar no grupo.");
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = async () => {
    setBusy(true);
    try {
      await leaveAllGroups(courseId, assignment.id, userId);
      toast.info("Você saiu do grupo.");
      await reload();
    } catch (err) {
      toast.error(err.message || "Não foi possível sair do grupo.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
        <CircularProgress size={24} sx={{ color: "#9041c1" }} />
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        <GroupsIcon sx={{ color: "#9041c1" }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Grupos
        </Typography>
      </Stack>

      {!currentGroupId && !deadlinePassed && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Escolha um grupo abaixo para poder enviar sua entrega.
        </Alert>
      )}
      {deadlinePassed && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          O prazo para trocar de grupo encerrou. Fale com o professor se precisar ajustar.
        </Alert>
      )}

      <Stack spacing={1.5}>
        {groups.map((g) => {
          const memberIds = Object.keys(g.members || {});
          const isFull = maxPerGroup > 0 && memberIds.length >= maxPerGroup;
          const isMine = g.groupId === currentGroupId;
          return (
            <Card
              key={g.groupId}
              variant="outlined"
              sx={{
                borderColor: isMine ? "#9041c1" : "#e0e0e0",
                borderWidth: isMine ? 2 : 1,
                borderRadius: 2,
                p: { xs: 1.5, sm: 2 },
                bgcolor: isMine ? "#faf7fe" : "#fff",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 1,
                  flexWrap: "wrap",
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                    <Typography sx={{ fontWeight: 700 }}>Grupo {g.index + 1}</Typography>
                    {isMine && (
                      <Chip
                        size="small"
                        icon={<CheckCircleIcon />}
                        label="Seu grupo"
                        sx={{ bgcolor: "#e6f4ea", color: "#2e7d32", fontWeight: 700 }}
                      />
                    )}
                  </Box>
                  {g.theme && (
                    <Typography variant="body2" sx={{ color: "#666", mt: 0.25 }}>
                      Tema: {g.theme}
                    </Typography>
                  )}
                </Box>
                <Chip
                  size="small"
                  label={maxPerGroup > 0 ? `${memberIds.length}/${maxPerGroup}` : `${memberIds.length}`}
                  sx={{
                    bgcolor: isFull && !isMine ? "#eceff1" : "#f0e9f8",
                    color: isFull && !isMine ? "#607d8b" : "#7d37a7",
                    fontWeight: 700,
                  }}
                />
              </Box>

              {/* Integrantes com foto */}
              <Box sx={{ mt: 1.5 }}>
                {memberIds.length === 0 ? (
                  <Typography variant="caption" color="text.secondary">
                    Nenhum integrante ainda. Seja o primeiro!
                  </Typography>
                ) : (
                  <Stack spacing={0.75}>
                    {memberIds.map((id) => {
                      const s = studentsById[id];
                      return (
                        <Box key={id} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Avatar src={s?.photoURL || undefined} sx={{ width: 28, height: 28, fontSize: "0.75rem", bgcolor: "#9041c1" }}>
                            {initials(s?.name)}
                          </Avatar>
                          <Typography variant="body2" sx={{ fontWeight: id === userId ? 700 : 500 }}>
                            {s?.name || id.substring(0, 6)}
                            {id === userId ? " (você)" : ""}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Stack>
                )}
              </Box>

              <Box sx={{ mt: 1.5 }}>
                {isMine ? (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<LogoutIcon />}
                    onClick={handleLeave}
                    disabled={busy || deadlinePassed}
                    sx={{ color: "#f44336", borderColor: "#f44336" }}
                  >
                    Sair do grupo
                  </Button>
                ) : (
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<PersonAddAlt1Icon />}
                    onClick={() => handleJoin(g.groupId)}
                    disabled={busy || isFull || deadlinePassed}
                    sx={{ backgroundColor: "#9041c1", "&:hover": { backgroundColor: "#7d37a7" } }}
                  >
                    {isFull ? "Grupo cheio" : "Entrar neste grupo"}
                  </Button>
                )}
              </Box>
            </Card>
          );
        })}
      </Stack>
    </Box>
  );
}
