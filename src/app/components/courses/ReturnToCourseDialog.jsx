import PropTypes from "prop-types";
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";

/**
 * Pergunta da entrada do curso para quem saiu ou foi removido: voltar é um ato
 * explícito, nunca efeito de abrir o curso.
 */
const ReturnToCourseDialog = ({ open, message, busy, onConfirm, onCancel }) => (
  <Dialog open={open} onClose={busy ? undefined : onCancel} aria-labelledby="return-course-title">
    <DialogTitle id="return-course-title" sx={{ color: "#333", fontWeight: "bold" }}>
      Voltar para a turma?
    </DialogTitle>
    <DialogContent>
      <DialogContentText sx={{ color: "#555" }}>{message}</DialogContentText>
    </DialogContent>
    <DialogActions sx={{ p: 2 }}>
      <Button onClick={onCancel} disabled={busy} sx={{ color: "#666" }}>
        Cancelar
      </Button>
      <Button
        onClick={onConfirm}
        disabled={busy}
        variant="contained"
        startIcon={busy ? <CircularProgress size={16} color="inherit" /> : null}
        sx={{ bgcolor: "#9041c1", fontWeight: "bold", "&:hover": { bgcolor: "#7d37a7" } }}
      >
        Voltar para a turma
      </Button>
    </DialogActions>
  </Dialog>
);

ReturnToCourseDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  message: PropTypes.string,
  busy: PropTypes.bool,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default ReturnToCourseDialog;
