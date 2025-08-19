import { useState } from "react";
import * as Yup from "yup";
import Button from "@mui/material/Button";
import CssBaseline from "@mui/material/CssBaseline";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import { Typography } from "@mui/material";
import Grid from "@mui/material/Grid";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import Logo from "$assets/img/logo2.gif";
import CodeImage from "$assets/img/undraw_code-thinking_0vf2.svg";
import GoogleIcon from "$assets/img/googleicon.svg";
import { handleGoogleSignIn, getFirebaseErrorMessage } from "$api/services/auth";
import { useAuth } from "$context/AuthContext";

const defaultTheme = createTheme();

export default function SignInSide() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const { refreshUserDetails } = useAuth();

  const handleLogin = () => {
    handleGoogleSignIn(navigate, null, (error) => {
      const message = getFirebaseErrorMessage(error);
      setError(message);
    }, refreshUserDetails);
  };

  return (
    <ThemeProvider theme={defaultTheme}>
      <Grid
        container
        component="main"
        sx={{ height: "100vh", backgroundColor: "#8445a3", justifyContent: "center", alignItems: "center", p: { xs: 2, sm: 0 } }}
      >
        <CssBaseline />
        <Grid
          item
          xs={12}
          sm={6}
          component={Paper}
          elevation={6}
          square
          sx={{
            display: "flex",
            justifyContent: { xs: "center", sm: "flex-end" },
            alignItems: "center",
            padding: { xs: 2, sm: 0 },
            backgroundColor: "transparent",
            boxShadow: "none",
            pr: { sm: 6 }
          }}
        >
          <Box
            sx={{
              width: "100%",
              maxWidth: 420,
              p: { xs: 3, sm: 5 },
              backgroundColor: "white",
              borderRadius: "16px",
              boxShadow: 3,
              minHeight: { xs: "auto", sm: "400px" },
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              fontFamily: "Arial Unicode",
              textAlign: "center"
            }}
          >
            <img src={Logo} alt="Logo" style={{ width: "30%", height: "auto", marginBottom: "16px", alignSelf: "center" }} />
            <Typography component="h1" variant="h5" fontFamily="Arial Unicode" fontWeight={800} fontSize={32} color={"#8445a3"} marginBottom="16px">
              Seja bem vindo ao Codefólio!
            </Typography>
           
            <Button
              fullWidth
              variant="contained"
              onClick={handleLogin}
              sx={{
                mt: 1,
                mb: 2,
                borderRadius: "24px",
                fontFamily: "Arial Unicode",
                color: "white",
                backgroundColor: "#8445a3",
                fontSize: "1.3rem",
                textTransform: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                fontWeight: "bold-light",
                padding: "12px 0"
              }}
            >
              <img src={GoogleIcon} alt="Google" style={{ width: "24px", height: "24px" }} />
              Entrar com Google
            </Button>
          </Box>
        </Grid>
        <Grid
          item
          xs={6}
          sx={{
            display: { xs: "none", sm: "flex" },
            justifyContent: "flex-start",
            alignItems: "center",
            pl: 2
          }}
        >
          <img src={CodeImage} alt="Code Thinking" style={{ maxWidth: "70%", height: "auto" }} />
        </Grid>
      </Grid>
    </ThemeProvider>
  );
  
}

