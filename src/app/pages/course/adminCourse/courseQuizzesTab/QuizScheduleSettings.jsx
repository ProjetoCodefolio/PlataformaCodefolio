import React from "react";
import { Box, TextField, Typography, InputAdornment } from "@mui/material";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import { formatQuizDate } from "$api/services/courses/quizzes";

// ISO <-> valor do input datetime-local (horário local do professor).
const isoToLocalInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
};

const localInputToIso = (local) => {
  if (!local) return "";
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
};

/**
 * Janela de disponibilidade de um quiz: data de abertura + data de encerramento,
 * com um hint descrevendo o estado atual.
 *
 * - Sem datas → quiz sempre disponível (comportamento histórico).
 * - Abertura no futuro → alunos só conseguem entrar a partir dela (dá tempo de
 *   cadastrar as questões sem a turma respondendo pela metade).
 * - Encerramento definido → depois dele o quiz não aceita novas tentativas.
 *
 * Recebe e devolve datas em ISO; a conversão para o input local é interna.
 */
const QuizScheduleSettings = ({
  openDate,
  closeDate,
  setOpenDate,
  setCloseDate,
  onBlurSave,
}) => {
  const hasWindow = Boolean(openDate || closeDate);

  const hint = !hasWindow
    ? "Sem datas: o quiz fica disponível assim que o conteúdo é liberado."
    : [
        openDate
          ? `Abre em ${formatQuizDate(openDate)}.`
          : "Aberto desde já.",
        closeDate
          ? `Encerra em ${formatQuizDate(closeDate)}.`
          : "Sem data de encerramento.",
      ].join(" ");

  const fieldSx = {
    "& .MuiOutlinedInput-root": {
      "& fieldset": { borderColor: "#666" },
      "&:hover fieldset": { borderColor: "#9041c1" },
      "&.Mui-focused fieldset": { borderColor: "#9041c1" },
    },
    "& .MuiInputLabel-root": {
      color: "#666",
      "&.Mui-focused": { color: "#9041c1" },
    },
  };

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 1,
        border: "1px solid",
        borderColor: hasWindow ? "#9041c1" : "#e0e0e0",
        backgroundColor: hasWindow ? "rgba(144, 65, 193, 0.06)" : "transparent",
        transition: "all 0.3s ease",
      }}
    >
      <Typography sx={{ fontWeight: 500, mb: 2 }}>
        Janela de disponibilidade
      </Typography>

      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          gap: 2,
        }}
      >
        <TextField
          label="Abertura do quiz"
          type="datetime-local"
          fullWidth
          value={isoToLocalInput(openDate)}
          onChange={(e) => setOpenDate(localInputToIso(e.target.value))}
          onBlur={onBlurSave}
          InputLabelProps={{ shrink: true }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <EventAvailableIcon fontSize="small" sx={{ color: "#2e7d32" }} />
              </InputAdornment>
            ),
          }}
          helperText="Vazio = disponível imediatamente."
          sx={fieldSx}
        />

        <TextField
          label="Encerramento do quiz"
          type="datetime-local"
          fullWidth
          value={isoToLocalInput(closeDate)}
          onChange={(e) => setCloseDate(localInputToIso(e.target.value))}
          onBlur={onBlurSave}
          InputLabelProps={{ shrink: true }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <EventBusyIcon fontSize="small" sx={{ color: "#c62828" }} />
              </InputAdornment>
            ),
          }}
          helperText="Vazio = sem prazo para responder."
          sx={fieldSx}
        />
      </Box>

      <Typography
        variant="caption"
        sx={{
          display: "block",
          mt: 1,
          color: hasWindow ? "#9041c1" : "#666",
          fontSize: { xs: "0.7rem", sm: "0.75rem" },
        }}
      >
        {hint}
      </Typography>
    </Box>
  );
};

export default QuizScheduleSettings;
