import React from "react";
import { Box, Typography, Button } from "@mui/material";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.log("Erro capturado:", error);
  }

  render() {
    if (this.state.hasError) {
      // Renderizar fallback
      return (
        this.props.fallback || (
          <Box
            sx={{
              width: "100%",
              height: "100vh",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "#700cac",
              color: "white",
            }}
          >
            <Typography variant="h5" sx={{ mb: 2 }}>
              Ocorreu um erro no quiz
            </Typography>
            <Button
              variant="contained"
              onClick={this.props.onClose}
              sx={{
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                color: "#fff",
              }}
            >
              Voltar ao curso
            </Button>
          </Box>
        )
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
