import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  CircularProgress,
  Divider,
} from "@mui/material";
import { toast } from "react-toastify";
import { fetchStudentCourses } from "$api/services/courses/students";
import { fetchCourseDetails } from "$api/services/courses/courses";
import { fetchPrefs, savePrefs, DEFAULT_PREFS } from "$api/services/notificationPrefs";

const purpleSwitch = {
  "& .MuiSwitch-switchBase.Mui-checked": { color: "#9041c1" },
  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
    backgroundColor: "#9041c1",
  },
};

const TYPES = [
  { key: "inAppEnabled", label: "Receber notificações deste curso" },
  { key: "newAssignment", label: "Novos enunciados/trabalhos" },
  { key: "newQuiz", label: "Novos quizzes" },
  { key: "grade", label: "Notas lançadas" },
  { key: "groupChanges", label: "Mudanças de grupo" },
  { key: "deadline", label: "Lembretes de prazo" },
];

/**
 * Preferências de notificação por curso. O usuário escolhe um curso e ativa/
 * desativa cada tipo de notificação. Persistido em notificationPrefs.
 */
export default function NotificationPrefs({ open, onClose, userId }) {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !userId) return;
    (async () => {
      try {
        const list = await fetchStudentCourses(userId);
        // Hidrata o nome do curso quando o registro de matrícula não o tiver
        // (evita exibir "Curso -Ab12..." em vez do título real).
        const withTitles = await Promise.all(
          (list || []).map(async (c) => {
            if (c.title) return c;
            try {
              const details = await fetchCourseDetails(c.courseId);
              return { ...c, title: details?.title || `Curso ${c.courseId}` };
            } catch {
              return { ...c, title: `Curso ${c.courseId}` };
            }
          })
        );
        withTitles.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
        setCourses(withTitles);
        if (withTitles.length) setCourseId(withTitles[0].courseId);
      } catch {
        setCourses([]);
      }
    })();
  }, [open, userId]);

  useEffect(() => {
    if (!courseId || !userId) return;
    setLoading(true);
    (async () => {
      try {
        setPrefs(await fetchPrefs(userId, courseId));
      } finally {
        setLoading(false);
      }
    })();
  }, [courseId, userId]);

  const toggle = (key) =>
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await savePrefs(userId, courseId, prefs);
      toast.success("Preferências salvas.");
      onClose?.();
    } catch (err) {
      toast.error(err.message || "Erro ao salvar preferências.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Preferências de notificação</DialogTitle>
      <DialogContent dividers>
        {courses.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Você não está matriculado em nenhum curso.
          </Typography>
        ) : (
          <>
            <TextField
              select
              fullWidth
              size="small"
              label="Curso"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              sx={{ mb: 2 }}
            >
              {courses.map((c) => (
                <MenuItem key={c.courseId} value={c.courseId}>
                  {c.title || `Curso ${c.courseId}`}
                </MenuItem>
              ))}
            </TextField>
            <Divider sx={{ mb: 1 }} />
            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                <CircularProgress size={22} sx={{ color: "#9041c1" }} />
              </Box>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column" }}>
                {TYPES.map((t) => (
                  <FormControlLabel
                    key={t.key}
                    control={
                      <Switch
                        checked={prefs[t.key] !== false}
                        onChange={() => toggle(t.key)}
                        disabled={t.key !== "inAppEnabled" && prefs.inAppEnabled === false}
                        sx={purpleSwitch}
                      />
                    }
                    label={t.label}
                  />
                ))}
              </Box>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ color: "#9041c1" }}>Cancelar</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving || !courseId}
          sx={{ backgroundColor: "#9041c1", "&:hover": { backgroundColor: "#7d37a7" } }}
        >
          {saving ? <CircularProgress size={20} color="inherit" /> : "Salvar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
