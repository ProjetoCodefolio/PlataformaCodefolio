import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
} from "@mui/material";
import { formatPublishAt } from "$api/services/courses/publication";

const ROXO = "#9041c1";

const quando = (iso) => (iso ? formatPublishAt(iso) : "publicado agora");

/**
 * Confirmação ao mudar a data de um conteúdo que tem quiz: mostra quando o
 * quiz aparecia e quando vai passar a aparecer. Se o conteúdo foi antecipado,
 * oferece manter o quiz na data que ele já tinha.
 *
 * @param {Object} props
 * @param {{before: string, after: string, canKeep: boolean}|null} props.plan
 *   de `planQuizPublicationChange`; null fecha o modal
 * @param {string} props.oldContentPublishAt
 * @param {string} props.newContentPublishAt
 * @param {(keepQuizAt: string|null) => void} props.onConfirm - recebe a data a
 *   gravar no quiz, ou null quando o quiz acompanha o conteúdo
 * @param {() => void} props.onCancel
 * @param {boolean} [props.submitting]
 */
export default function QuizPublicationChangeDialog({
  plan,
  oldContentPublishAt,
  newContentPublishAt,
  onConfirm,
  onCancel,
  submitting = false,
}) {
  const [escolha, setEscolha] = useState("acompanha");

  useEffect(() => {
    if (plan) setEscolha("acompanha");
  }, [plan]);

  if (!plan) return null;
  const manter = plan.canKeep && escolha === "manter";

  return (
    <Dialog open onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Este conteúdo tem um quiz</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 1.5, rowGap: 0.75 }}>
          <Typography sx={{ fontWeight: 600 }}>Conteúdo:</Typography>
          <Typography>
            {quando(oldContentPublishAt)} → {quando(newContentPublishAt)}
          </Typography>
          <Typography sx={{ fontWeight: 600 }}>Quiz:</Typography>
          <Typography>
            {quando(plan.before)} → {quando(manter ? plan.before : plan.after)}
          </Typography>
        </Box>

        {plan.canKeep ? (
          <RadioGroup
            value={escolha}
            onChange={(e) => setEscolha(e.target.value)}
            sx={{ mt: 2 }}
          >
            <FormControlLabel
              value="acompanha"
              control={<Radio sx={{ "&.Mui-checked": { color: ROXO } }} />}
              label={`O quiz acompanha o conteúdo (${quando(plan.after)})`}
            />
            <FormControlLabel
              value="manter"
              control={<Radio sx={{ "&.Mui-checked": { color: ROXO } }} />}
              label={`Manter o quiz em ${quando(plan.before)}`}
            />
          </RadioGroup>
        ) : (
          <Typography variant="body2" sx={{ mt: 2, color: "#666" }}>
            O quiz nunca aparece antes do conteúdo, então ele passa a sair junto.
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onCancel} disabled={submitting} sx={{ color: "#666", textTransform: "none" }}>
          Voltar
        </Button>
        <Button
          variant="contained"
          disabled={submitting}
          onClick={() => onConfirm(manter ? plan.before : null)}
          sx={{ backgroundColor: ROXO, "&:hover": { backgroundColor: "#7d37a7" }, textTransform: "none" }}
        >
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
