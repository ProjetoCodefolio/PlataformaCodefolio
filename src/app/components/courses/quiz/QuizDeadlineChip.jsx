import { Box } from "@mui/material";
import ScheduleIcon from "@mui/icons-material/Schedule";
import { getQuizDeadline, formatQuizDate } from "$api/services/courses/quizWindow";
import { formatTimeRemaining } from "$api/services/courses/assignments";

// Cor por urgência do fechamento; "opens" (quiz agendado) usa o tom neutro.
const TONES = {
  normal: { color: "info.dark", bg: "info.light" },
  soon: { color: "warning.dark", bg: "warning.light" },
  urgent: { color: "error.dark", bg: "error.light" },
};

/**
 * Aviso de prazo do quiz para o aluno: quando abre (agendado) ou quando
 * encerra (aberto com data de fechamento). Não renderiza nada quando não há
 * prazo a avisar. No celular mostra só o tempo relativo, para caber no card.
 */
const QuizDeadlineChip = ({ quizConfig, sx }) => {
  const deadline = getQuizDeadline(quizConfig);
  if (!deadline) return null;

  const tone = TONES[deadline.urgency] || TONES.normal;
  const verb = deadline.kind === "opens" ? "abre" : "encerra";
  const relative = formatTimeRemaining(deadline.date);

  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        px: 1,
        py: 0.25,
        borderRadius: 10,
        fontSize: "0.75rem",
        fontWeight: 600,
        lineHeight: 1.6,
        color: tone.color,
        backgroundColor: tone.bg,
        ...sx,
      }}
    >
      <ScheduleIcon sx={{ fontSize: 14 }} />
      Quiz {verb} {relative}
      <Box component="span" sx={{ display: { xs: "none", sm: "inline" }, fontWeight: 500 }}>
        · {formatQuizDate(deadline.date)}
      </Box>
    </Box>
  );
};

export default QuizDeadlineChip;
