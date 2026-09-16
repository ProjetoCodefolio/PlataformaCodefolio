import { useEffect, useState } from "react";
import { Box, TextField, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import Loader from "$components/common/Loader";

/**
 * Campo de nota com salvamento automático (ao sair do campo ou pressionar
 * Enter). Mostra o estado "Avaliado" em verde e valida a faixa 0–10.
 */
export default function GradeInput({ storedGrade, disabled, saving, onCommit }) {
  const [val, setVal] = useState(storedGrade ?? "");
  const [err, setErr] = useState("");

  useEffect(() => {
    setVal(storedGrade ?? "");
  }, [storedGrade]);

  const commit = () => {
    if (val === "" || String(val) === String(storedGrade ?? "")) {
      setErr("");
      return;
    }
    const n = Number(val);
    if (Number.isNaN(n) || n < 0 || n > 10) {
      setErr("0 a 10");
      return;
    }
    setErr("");
    onCommit(n);
  };

  const graded = storedGrade !== null && storedGrade !== undefined && storedGrade !== "";

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
      <TextField
        size="small"
        type="number"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.target.blur();
          }
        }}
        error={!!err}
        helperText={err || undefined}
        disabled={disabled}
        inputProps={{ min: 0, max: 10, step: 0.1, style: { width: 68 } }}
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
      ) : graded ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <CheckCircleIcon sx={{ fontSize: 14, color: "#2e7d32" }} />
          <Typography variant="caption" sx={{ color: "#2e7d32", fontWeight: 700 }}>
            Avaliado
          </Typography>
        </Box>
      ) : (
        <Typography variant="caption" sx={{ color: "#9e9e9e" }}>
          Não avaliado
        </Typography>
      )}
    </Box>
  );
}
