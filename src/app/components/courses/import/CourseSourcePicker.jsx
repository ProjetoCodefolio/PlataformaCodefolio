import { useEffect, useState } from "react";
import {
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from "@mui/material";
import { useAuth } from "$context/AuthContext";
import { fetchImportableCourses } from "$api/services/courses/importSources";

/**
 * Seletor do curso de ORIGEM de uma importação, compartilhado pelas telas de
 * importar questionário e importar materiais. A lista sai de
 * `fetchImportableCourses`, que é quem define de quem o professor pode puxar
 * conteúdo — este componente só apresenta.
 */
export default function CourseSourcePicker({
  value,
  onChange,
  excludeCourseId,
  label = "Curso de origem",
  disabled = false,
}) {
  const { userDetails } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const carregar = async () => {
      setLoading(true);
      setError("");
      try {
        const lista = await fetchImportableCourses(userDetails, { excludeCourseId });
        if (!cancelled) setCourses(lista);
      } catch {
        if (!cancelled) setError("Não foi possível carregar os cursos de origem.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    carregar();
    return () => {
      cancelled = true;
    };
  }, [userDetails, excludeCourseId]);

  if (loading) {
    return <CircularProgress size={24} sx={{ color: "#9041c1", my: 2 }} />;
  }

  if (error) {
    return <Alert severity="error" sx={{ my: 1 }}>{error}</Alert>;
  }

  if (courses.length === 0) {
    return (
      <Alert severity="info" sx={{ my: 1 }}>
        Você não tem outro curso do qual importar. A lista mostra os cursos em que
        você é o dono ou está como professor.
      </Alert>
    );
  }

  return (
    <FormControl fullWidth disabled={disabled}>
      <InputLabel sx={{ "&.Mui-focused": { color: "#9041c1" } }}>{label}</InputLabel>
      <Select
        value={value || ""}
        label={label}
        onChange={(e) => onChange(e.target.value)}
      >
        {courses.map((course) => (
          <MenuItem key={course.courseId} value={course.courseId}>
            {course.title}
            {course.archived ? " (arquivado)" : ""}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
