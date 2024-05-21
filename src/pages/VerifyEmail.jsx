import { Link } from "react-router-dom";
import { Container, Box, Typography } from "@mui/material";

export default function VerifyEmail() {
  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Typography component="h1" variant="h5">
          Verifique seu email
        </Typography>
        <Typography variant="body2" sx={{ mt: 2 }}>
          Um email de verificação foi enviado para o seu endereço de email. Por
          favor, verifique seu email e siga as instruções para confirmar seu
          cadastro.
        </Typography>
        <Link to="/login" variant="body2" sx={{ mt: 2 }}>
          Voltar para a página de login
        </Link>
      </Box>
    </Container>
  );
}
