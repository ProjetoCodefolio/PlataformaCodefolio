import React from 'react';
import { Box, Typography, Modal, Button } from "@mui/material";
import Confetti from "react-confetti";

const CompletionModal = ({ open, onClose, onExplore, modalRef, modalDimensions, userName, courseTitle }) => {
  return (
    <Modal open={open} onClose={onClose}>
      <Box
        ref={modalRef}
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: { xs: "90%", sm: 500 },
          bgcolor: "#fff",
          borderRadius: "20px",
          boxShadow: "0 12px 40px rgba(0, 0, 0, 0.3)",
          p: { xs: 3, sm: 4 },
          textAlign: "center",
          background: "linear-gradient(135deg, #9041c1 0%, #7d37a7 100%)",
          color: "#fff",
          animation: "zoomIn 0.5s ease-in-out",
          "@keyframes zoomIn": {
            "0%": { transform: "translate(-50%, -50%) scale(0.5)", opacity: 0 },
            "100%": { transform: "translate(-50%, -50%) scale(1)", opacity: 1 },
          },
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
        }}
      >
        <Confetti
          width={modalDimensions.width}
          height={modalDimensions.height}
          recycle={false}
          numberOfPieces={150}
          colors={["#9041c1", "#7d37a7", "#4caf50", "#f5f5fa"]}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            pointerEvents: "none",
          }}
        />
        <Typography
          variant="h4"
          fontWeight="bold"
          sx={{
            mb: 1,
            background: "linear-gradient(45deg, #fff 0%, #ffeb3b 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textShadow: "2px 2px 4px rgba(0, 0, 0, 0.2)",
          }}
        >
          🎉 Parabéns, {userName || "Aluno"}!
        </Typography>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Você conquistou o curso "{courseTitle}" com sucesso!
        </Typography>
        <Typography variant="body2" sx={{ mb: 3, opacity: 0.8, maxWidth: "80%", mx: "auto" }}>
          Continue aprendendo e explorando novos desafios.
        </Typography>
        <Box sx={{ display: "flex", gap: 3, justifyContent: "center", flexWrap: "wrap" }}>
          <Button
            variant="contained"
            onClick={onExplore}
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
            Explorar Outros Cursos
          </Button>
          <Button
            variant="outlined"
            onClick={onClose}
            sx={{
              borderColor: "#fff",
              color: "#fff",
              borderRadius: "16px",
              "&:hover": { borderColor: "#f5f5fa", color: "#f5f5fa" },
              textTransform: "none",
              fontWeight: 500,
              px: 4,
              py: 1.5,
              minWidth: 120,
            }}
          >
            Fechar
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default CompletionModal;