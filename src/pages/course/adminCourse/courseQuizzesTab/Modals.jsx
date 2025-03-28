import React from "react";
import { Modal, Box, Typography, Button } from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

const ConfirmationModal = ({ 
  open, 
  onClose, 
  onConfirm, 
  title, 
  content 
}) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
    >
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 400,
          bgcolor: "background.paper",
          borderRadius: 2,
          boxShadow: 24,
          p: 4,
          textAlign: "center",
        }}
      >
        <Typography variant="h6" sx={{ mb: 2 }}>
          {title}
        </Typography>
        {content && <Typography sx={{ mb: 2 }}>{content}</Typography>}
        <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
          <Button
            variant="contained"
            color="error"
            onClick={onConfirm}
          >
            Sim, Excluir
          </Button>
          <Button
            variant="outlined"
            onClick={onClose}
          >
            Cancelar
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

const SuccessModal = ({ open, onClose, title }) => {
  return (
    <Modal open={open} onClose={onClose}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 400,
          bgcolor: "background.paper",
          borderRadius: 2,
          boxShadow: 24,
          p: 4,
          textAlign: "center",
        }}
      >
        <CheckCircleOutlineIcon
          sx={{ fontSize: 60, color: "#4caf50", mb: 2 }}
        />
        <Typography variant="h6" sx={{ mb: 2 }}>
          {title}
        </Typography>
        <Button
          variant="contained"
          onClick={onClose}
          sx={{
            backgroundColor: "#9041c1",
            "&:hover": { backgroundColor: "#7d37a7" },
          }}
        >
          OK
        </Button>
      </Box>
    </Modal>
  );
};

export { ConfirmationModal, SuccessModal };