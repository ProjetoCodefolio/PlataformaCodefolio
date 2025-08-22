import React, { useState, useRef } from "react";
import { Box, Typography, Modal, TextField, Button } from "@mui/material";
import { keyframes } from "@emotion/react";
import { validateCoursePin } from "$api/services/courses/pin";

const shake = keyframes`
  0% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  50% { transform: translateX(5px); }
  75% { transform: translateX(-5px); }
  100% { transform: translateX(0); }
`;

const PinAccessModal = ({ open, onClose, onSubmit, selectedCourse }) => {
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const submitButtonRef = useRef(null);

  const handlePinSubmit = async () => {
    try {
      const isValid = await validateCoursePin(
        selectedCourse.courseId, 
        pinInput
      );
      
      if (isValid) {
        onSubmit(selectedCourse);
        onClose();
      } else {
        setPinError(true);
        setTimeout(() => setPinError(false), 2000);
      }
    } catch (error) {
      console.error("Error validating PIN:", error);
      setPinError(true);
      setTimeout(() => setPinError(false), 2000);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handlePinSubmit();
    }
  };

  return (
    <Modal open={open} onClose={onClose} aria-labelledby="pin-modal-title">
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: { xs: "90%", sm: 400 },
          bgcolor: "#9041c1",
          borderRadius: "16px",
          boxShadow: "0px 8px 24px rgba(0, 0, 0, 0.3)",
          p: 4,
          transformOrigin: "center center",
          animation: "0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
          animationName: {
            "0%": {
              transform: "translate(-50%, -50%) scale(0.9)",
              opacity: 0,
            },
            "100%": {
              transform: "translate(-50%, -50%) scale(1)",
              opacity: 1,
            },
          },
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
        }}
      >
        <Typography
          variant="h6"
          sx={{ mb: 2, fontWeight: 600, color: "#ffffff" }}
        >
          Você está tentando acessar um curso que requer uma chave de acesso
        </Typography>
        <TextField
          label="PIN de Acesso"
          fullWidth
          inputProps={{ maxLength: 7 }}
          variant="outlined"
          value={pinInput}
          onChange={(e) => setPinInput(e.target.value)}
          onKeyDown={handleKeyDown}
          sx={{
            mb: 2,
            animation: pinError ? `${shake} 0.5s` : "none",
            "& .MuiOutlinedInput-root": {
              "& fieldset": { borderColor: "#fff" },
              "&:hover fieldset": { borderColor: "#fff" },
              "&.Mui-focused fieldset": { borderColor: "#fff" },
            },
            "& .MuiInputLabel-root": {
              color: "#fff",
              "&.Mui-focused": { color: "#fff" },
            },
            "& .MuiOutlinedInput-input": {
              color: "#fff",
            },
          }}
          autoFocus
        />
        {pinError && (
          <Typography variant="body2" sx={{ color: "#ff4d4d", mt: -2, mb: 2 }}>
            PIN incorreto. Tente novamente.
          </Typography>
        )}
        <Button
          ref={submitButtonRef}
          variant="contained"
          onClick={handlePinSubmit}
          sx={{
            backgroundColor: "#fff",
            color: "#9041c1",
            borderRadius: "16px",
            "&:hover": { backgroundColor: "#f5f5fa", color: "#7d37a7" },
            textTransform: "none",
            fontWeight: 600,
            px: 4,
            py: 1.5,
            minWidth: 180,
          }}
        >
          Enviar
        </Button>
      </Box>
    </Modal>
  );
};

export default PinAccessModal;
