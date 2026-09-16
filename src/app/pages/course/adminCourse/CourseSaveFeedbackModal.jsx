import { Box, Button, Modal, Typography } from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

/** Modal de confirmação após salvar o curso (criação ou atualização). */
export default function CourseSaveFeedbackModal({ open, titleId, title, onConfirm }) {
  return (
    <Modal open={open} aria-labelledby={titleId}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: { xs: "90%", sm: 400 },
          maxWidth: 400,
          bgcolor: "background.paper",
          borderRadius: 2,
          boxShadow: 24,
          p: { xs: 3, sm: 4 },
          textAlign: "center",
        }}
      >
        <CheckCircleOutlineIcon
          sx={{ fontSize: { xs: 50, sm: 60 }, color: "#4caf50", mb: 2 }}
        />
        <Typography id={titleId} variant="h6" sx={{ mb: 2, fontSize: { xs: "1rem", sm: "1.25rem" } }}>
          {title}
        </Typography>
        <Button
          variant="contained"
          onClick={onConfirm}
          sx={{
            backgroundColor: "#9041c1",
            "&:hover": { backgroundColor: "#7d37a7" },
            fontSize: { xs: "0.875rem", sm: "1rem" },
          }}
        >
          OK!
        </Button>
      </Box>
    </Modal>
  );
}
