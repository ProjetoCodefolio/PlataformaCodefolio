import { Box, Button, InputAdornment, TextField } from "@mui/material";
import ScheduleSendIcon from "@mui/icons-material/ScheduleSend";
import { isoToLocalInput, localInputToIso } from "$utils/dateInput";
import { formatPublishAt, isScheduled } from "$api/services/courses/publication";

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    "& fieldset": { borderColor: "#666" },
    "&:hover fieldset": { borderColor: "primary.main" },
    "&.Mui-focused fieldset": { borderColor: "primary.main" },
  },
  "& .MuiInputLabel-root": { color: "#666", "&.Mui-focused": { color: "primary.main" } },
};

/**
 * Campo "Programar publicação": data a partir da qual o item aparece para o
 * aluno. Vazio = publicado agora. Recebe e devolve ISO; a conversão para o
 * input local é interna.
 */
const PublishAtField = ({
  value,
  onChange,
  label = "Programar publicação (opcional)",
  size = "medium",
  disabled = false,
  helperText,
  sx,
}) => {
  const agendado = isScheduled(value);
  const hint =
    helperText ??
    (agendado
      ? `Os alunos só veem a partir de ${formatPublishAt(value)}.`
      : value
        ? "Data já passou: publica assim que salvar."
        : "Vazio = aparece para os alunos assim que salvar.");

  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, ...sx }}>
      <TextField
        label={label}
        type="datetime-local"
        fullWidth
        size={size}
        disabled={disabled}
        value={isoToLocalInput(value)}
        onChange={(e) => onChange(localInputToIso(e.target.value))}
        InputLabelProps={{ shrink: true }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <ScheduleSendIcon fontSize="small" sx={{ color: agendado ? "primary.main" : "#999" }} />
            </InputAdornment>
          ),
        }}
        helperText={hint}
        sx={fieldSx}
      />
      {value && !disabled && (
        <Button
          size="small"
          onClick={() => onChange("")}
          sx={{ mt: size === "small" ? 0.5 : 1, whiteSpace: "nowrap", color: "primary.main" }}
        >
          Publicar agora
        </Button>
      )}
    </Box>
  );
};

export default PublishAtField;
