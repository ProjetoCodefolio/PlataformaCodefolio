import PropTypes from "prop-types";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";

/**
 * Confirmação do encerramento da matrícula (saída do curso ou remoção da
 * turma). Mostra só as consequências que valem para o caso, que quem abre o
 * diálogo calcula (`leaveConfirmationLines`/`removalConfirmationLines`). Nada é
 * apagado e a volta é possível, então não há "digite o nome para confirmar".
 */
const EnrollmentEndDialog = ({
  open,
  title,
  lines,
  loading,
  busy,
  error,
  confirmLabel,
  onConfirm,
  onClose,
}) => (
  <Dialog
    open={open}
    onClose={busy ? undefined : onClose}
    aria-labelledby="enrollment-end-title"
    fullWidth
    maxWidth="sm"
  >
    <DialogTitle id="enrollment-end-title" sx={{ color: "#333", fontWeight: "bold" }}>
      {title}
    </DialogTitle>
    <DialogContent>
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
          <CircularProgress size={28} sx={{ color: "#9041c1" }} />
        </Box>
      ) : error ? (
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      ) : (
        <Box component="ul" sx={{ m: 0, pl: 2.5, color: "#555" }}>
          {(lines || []).map((linha) => (
            <Typography component="li" variant="body2" key={linha} sx={{ mb: 1 }}>
              {linha}
            </Typography>
          ))}
        </Box>
      )}
    </DialogContent>
    <DialogActions sx={{ p: 2 }}>
      <Button onClick={onClose} disabled={busy} sx={{ color: "#666" }}>
        Cancelar
      </Button>
      <Button
        onClick={onConfirm}
        disabled={busy || loading || Boolean(error)}
        variant="contained"
        startIcon={busy ? <CircularProgress size={16} color="inherit" /> : null}
        sx={{ bgcolor: "#dc3545", fontWeight: "bold", "&:hover": { bgcolor: "#c82333" } }}
      >
        {confirmLabel}
      </Button>
    </DialogActions>
  </Dialog>
);

EnrollmentEndDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  title: PropTypes.string.isRequired,
  lines: PropTypes.arrayOf(PropTypes.string),
  loading: PropTypes.bool,
  busy: PropTypes.bool,
  error: PropTypes.string,
  confirmLabel: PropTypes.string.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default EnrollmentEndDialog;
