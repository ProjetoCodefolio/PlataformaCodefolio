import { useEffect, useState } from "react";
import { Box, TextField, Typography } from "@mui/material";
import Loader from "$components/common/Loader";

/**
 * Campo de feedback escrito, com salvamento ao sair do campo.
 *
 * Diferente da nota, não valida nada: é texto livre. O que ele faz de
 * específico é só gravar quando o texto MUDOU — sair do campo sem escrever
 * nada não deve custar uma escrita no banco para cada integrante do grupo.
 */
export default function FeedbackInput({ storedFeedback, disabled, saving, onCommit }) {
  const [val, setVal] = useState(storedFeedback ?? "");

  useEffect(() => {
    setVal(storedFeedback ?? "");
  }, [storedFeedback]);

  const commit = () => {
    if (val.trim() === String(storedFeedback ?? "").trim()) return;
    onCommit(val);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, width: "100%" }}>
      <TextField
        size="small"
        multiline
        minRows={2}
        fullWidth
        placeholder="O que o grupo fez bem e o que precisa melhorar…"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        disabled={disabled}
        sx={{
          "& .MuiOutlinedInput-root.Mui-focused fieldset": { borderColor: "#9041c1" },
        }}
      />
      {saving ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Loader size={12} />
          <Typography variant="caption" sx={{ color: "#9041c1" }}>
            Salvando…
          </Typography>
        </Box>
      ) : (
        <Typography variant="caption" sx={{ color: "#9e9e9e" }}>
          Salvo ao sair do campo. Cada integrante vê este texto junto da nota.
        </Typography>
      )}
    </Box>
  );
}
