import React from "react";
import { Box, Typography, Paper } from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";

const CustomQuizRanking = () => {
  return (
    <Box sx={{ width: "100%", position: "relative" }}>
      <Paper
        elevation={3}
        sx={{
          p: 4,
          mt: 2,
          borderRadius: 2,
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mb: 3,
          }}
        >
          <EmojiEventsIcon sx={{ fontSize: 40, color: "#FFD700", mr: 1 }} />
          <Typography variant="h4" sx={{ color: "#fff", fontWeight: 600 }}>
            Ranking do Quiz
          </Typography>
        </Box>

        <Typography variant="body1" sx={{ color: "#fff", mb: 2 }}>
          Aqui será exibido o ranking dos alunos no quiz.
        </Typography>

        <Typography
          variant="caption"
          sx={{ display: "block", color: "rgba(255,255,255,0.7)", mt: 3 }}
        >
          Pressione ESC para voltar à pergunta personalizada
        </Typography>
      </Paper>
    </Box>
  );
};

export default CustomQuizRanking;
