import React from "react";
import { Box, Typography, Button, Container } from "@mui/material";
import { useNavigate } from "react-router-dom";
import Topbar from "$components/topbar/Topbar";
import SentimentVeryDissatisfiedIcon from '@mui/icons-material/SentimentVeryDissatisfied';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <>
      <Topbar hideSearch={true} />
      <Container
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "calc(100vh - 64px)",
          textAlign: "center",
          py: 4,
        }}
      >
        <SentimentVeryDissatisfiedIcon
          sx={{ fontSize: 120, color: "#9041c1", mb: 3, opacity: 0.8 }}
        />
        <Typography
          variant="h2"
          sx={{
            fontWeight: "bold",
            color: "#333",
            mb: 2,
            fontSize: { xs: "2rem", md: "3rem" },
          }}
        >
          Página não encontrada
        </Typography>
        <Typography
          variant="h5"
          sx={{
            color: "#666",
            mb: 4,
            maxWidth: "600px",
            fontSize: { xs: "1rem", md: "1.5rem" },
          }}
        >
          O caminho que você está tentando acessar não existe ou foi movido.
        </Typography>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", justifyContent: "center" }}>
          <Button
            variant="contained"
            onClick={() => navigate(-1)}
            sx={{
              backgroundColor: "#9041c1",
              "&:hover": { backgroundColor: "#7d37a7" },
              px: 3,
              py: 1,
            }}
          >
            Voltar
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate("/dashboard")}
            sx={{
              borderColor: "#9041c1",
              color: "#9041c1",
              "&:hover": {
                borderColor: "#7d37a7",
                backgroundColor: "rgba(144, 65, 193, 0.04)",
              },
              px: 3,
              py: 1,
            }}
          >
            Ir para Dashboard
          </Button>
        </Box>
      </Container>
    </>
  );
};

export default NotFound;