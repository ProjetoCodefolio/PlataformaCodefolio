import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
} from "@mui/material";
import AssignmentIcon from "@mui/icons-material/Assignment";
import {
  fetchAssignmentsByCourse,
  isPastDue,
  isBeforeOpen,
  formatTimeRemaining,
} from "$api/services/courses/assignments";
import { fetchSubmission } from "$api/services/courses/submissions";
import { getUserGroup } from "$api/services/courses/assignmentGroups";
import AssignmentDetail from "./AssignmentDetail";

const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
    : "Sem prazo";

/**
 * Lista de enunciados de um curso na visão do aluno, com status de entrega.
 * Ao selecionar um item, abre o detalhe (AssignmentDetail).
 *
 * @param {string} courseId
 * @param {string} userId
 */
export default function AssignmentList({ courseId, userId }) {
  const [assignments, setAssignments] = useState([]);
  const [statusById, setStatusById] = useState({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const computeStatus = useCallback(
    async (assignment) => {
      let submission = null;
      try {
        if (assignment.mode === "group") {
          const gid = await getUserGroup(courseId, assignment.id, userId);
          if (gid) {
            submission = await fetchSubmission(courseId, assignment.id, `group_${gid}`);
          }
        } else {
          submission = await fetchSubmission(courseId, assignment.id, userId);
        }
      } catch {
        submission = null;
      }
      if (submission) {
        return submission.isLate ? "late" : "done";
      }
      if (isBeforeOpen(assignment)) return "scheduled";
      return isPastDue(assignment) && !assignment.allowLate ? "closed" : "pending";
    },
    [courseId, userId]
  );

  const load = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const list = await fetchAssignmentsByCourse(courseId);
      // Ordem de criação: o último trabalho adicionado fica no fim da fila.
      list.sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
      setAssignments(list);
      const entries = await Promise.all(
        list.map(async (a) => [a.id, await computeStatus(a)])
      );
      setStatusById(Object.fromEntries(entries));
    } catch (err) {
      console.error("Erro ao carregar enunciados:", err);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [courseId, computeStatus]);

  useEffect(() => {
    if (!selected) load();
  }, [load, selected]);

  const statusChip = (status) => {
    switch (status) {
      case "done":
        return <Chip size="small" label="Entregue" sx={{ bgcolor: "#e6f4ea", color: "#2e7d32", fontWeight: 700 }} />;
      case "late":
        return <Chip size="small" label="Entregue com atraso" sx={{ bgcolor: "#fff3e0", color: "#e65100", fontWeight: 700 }} />;
      case "closed":
        return <Chip size="small" label="Encerrado" sx={{ bgcolor: "#fdecea", color: "#c62828", fontWeight: 700 }} />;
      case "scheduled":
        return <Chip size="small" label="Em breve" sx={{ bgcolor: "#eef7ff", color: "#1565c0", fontWeight: 700 }} />;
      default:
        return <Chip size="small" label="Pendente" sx={{ bgcolor: "#eceff1", color: "#455a64", fontWeight: 700 }} />;
    }
  };

  // Texto auxiliar de prazo/abertura por item.
  const timingText = (a) => {
    if (isBeforeOpen(a)) return `Abre ${formatTimeRemaining(a.openDate)}`;
    if (a.dueDate) {
      return isPastDue(a)
        ? `Prazo encerrado ${formatTimeRemaining(a.dueDate)}`
        : `Prazo ${formatTimeRemaining(a.dueDate)} · ${fmtDate(a.dueDate)}`;
    }
    return "Sem prazo";
  };

  if (selected) {
    return (
      <AssignmentDetail
        assignment={selected}
        courseId={courseId}
        userId={userId}
        onBack={() => setSelected(null)}
      />
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress sx={{ color: "#9041c1" }} />
      </Box>
    );
  }

  if (assignments.length === 0) {
    return (
      <Box sx={{ py: 3, textAlign: "center" }}>
        <AssignmentIcon sx={{ fontSize: 40, color: "#bbb" }} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Nenhum trabalho publicado neste curso ainda.
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={1.5}>
      {assignments.map((a) => (
        <Card key={a.id} variant="outlined" sx={{ borderRadius: 2 }}>
          <CardActionArea onClick={() => setSelected(a)}>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700 }} noWrap>
                    {a.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {timingText(a)} · {a.mode === "group" ? "Em grupo" : "Individual"}
                  </Typography>
                </Box>
                {statusChip(statusById[a.id])}
              </Box>
            </CardContent>
          </CardActionArea>
        </Card>
      ))}
    </Stack>
  );
}
