import { Box, Button, Typography } from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";

/** Tela de bloqueio exibida no lugar do vídeo para quem não está logado. */
export default function LockedVideoGate({ onLogin }) {
  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: { xs: "90%", sm: "780px" },
        mx: "auto",
        p: { xs: 1.5, sm: 4 },
        textAlign: "center",
        backgroundColor: "#F5F5FA",
        borderRadius: "12px",
        boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: { xs: 1, sm: 2 },
        minHeight: { xs: "auto", sm: "200px" },
      }}
    >
      <LockIcon sx={{ fontSize: { xs: 30, sm: 40 }, color: "#9041c1" }} />
      <Typography
        variant="h6"
        sx={{
          fontWeight: 600,
          color: "#555",
          fontSize: { xs: "1rem", sm: "1.25rem" },
          lineHeight: 1.2,
        }}
      >
        Conteúdo Bloqueado
      </Typography>
      <Typography
        variant="body2"
        sx={{
          color: "#666",
          maxWidth: { xs: "100%", sm: "400px" },
          fontSize: { xs: "0.85rem", sm: "1rem" },
          lineHeight: 1.4,
        }}
      >
        Faça login para acessar este vídeo e continuar seu curso!
      </Typography>
      <Button
        variant="contained"
        onClick={onLogin}
        sx={{
          backgroundColor: "#9041c1",
          color: "#fff",
          fontWeight: 600,
          px: { xs: 2, sm: 3 },
          py: { xs: 0.5, sm: 1 },
          borderRadius: "8px",
          "&:hover": {
            backgroundColor: "#7a35a3",
          },
          fontSize: { xs: "0.8rem", sm: "1rem" },
          minWidth: { xs: "120px", sm: "auto" },
        }}
      >
        Fazer Login
      </Button>
    </Box>
  );
}
