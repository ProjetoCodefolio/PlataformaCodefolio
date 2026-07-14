import React from "react";
import {
  Box,
  TextField,
  Typography,
  FormControlLabel,
  Switch,
} from "@mui/material";

/**
 * Configuração de tentativas de um quiz: toggle "permitir repetição" + campo de
 * limite máximo de tentativas, com um hint descrevendo o estado atual.
 *
 * - Repetição desativada  → apenas 1 tentativa; campo de limite desabilitado.
 * - Repetição ativada + limite informado → esse número de tentativas.
 * - Repetição ativada sem limite → tentativas ilimitadas.
 */
const QuizAttemptsSettings = ({
  allowRetry,
  maxAttempts,
  setMaxAttempts,
  onToggle,
  onBlurSave,
}) => {
  const hint = !allowRetry
    ? "Repetição desativada: o aluno terá apenas 1 tentativa."
    : maxAttempts && Number(maxAttempts) > 0
    ? `Repetição ativada: limite de ${Number(maxAttempts)} tentativa${
        Number(maxAttempts) > 1 ? "s" : ""
      }.`
    : "Repetição ativada: tentativas ilimitadas (deixe em branco para não limitar).";

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 1,
        border: "1px solid",
        borderColor: allowRetry ? "#9041c1" : "#e0e0e0",
        backgroundColor: allowRetry ? "rgba(144, 65, 193, 0.06)" : "transparent",
        transition: "all 0.3s ease",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          gap: 2,
          alignItems: { xs: "stretch", sm: "flex-start" },
        }}
      >
        <FormControlLabel
          control={
            <Switch
              checked={allowRetry}
              onChange={(e) => onToggle(e.target.checked)}
              sx={{
                "& .MuiSwitch-switchBase.Mui-checked": { color: "#9041c1" },
                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                  backgroundColor: "#9041c1",
                },
              }}
            />
          }
          label={
            <Typography sx={{ fontWeight: 500 }}>
              Permitir repetição do quiz
            </Typography>
          }
          sx={{ flex: 1, m: 0 }}
        />

        <TextField
          label="Limite de tentativas"
          type="number"
          value={maxAttempts}
          disabled={!allowRetry}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") {
              setMaxAttempts("");
              return;
            }
            // Somente inteiros positivos; em branco = ilimitado.
            const n = Math.max(1, parseInt(raw, 10) || 1);
            setMaxAttempts(n);
          }}
          onBlur={onBlurSave}
          inputProps={{ min: 1, step: 1 }}
          placeholder="Ilimitado"
          variant="outlined"
          sx={{
            width: { xs: "100%", sm: 200 },
            "& .MuiOutlinedInput-root": {
              "& fieldset": { borderColor: "#666" },
              "&:hover fieldset": { borderColor: "#9041c1" },
              "&.Mui-focused fieldset": { borderColor: "#9041c1" },
            },
            "& .MuiInputLabel-root.Mui-focused": { color: "#9041c1" },
          }}
        />
      </Box>

      <Typography
        variant="caption"
        sx={{
          display: "block",
          mt: 1,
          color: allowRetry ? "#9041c1" : "#666",
          fontSize: { xs: "0.7rem", sm: "0.75rem" },
        }}
      >
        {hint}
      </Typography>
    </Box>
  );
};

export default QuizAttemptsSettings;
