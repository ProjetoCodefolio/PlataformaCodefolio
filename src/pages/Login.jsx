import { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";
import Button from "@mui/material/Button";
import CssBaseline from "@mui/material/CssBaseline";
import TextField from "@mui/material/TextField";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import { Typography } from "@mui/material";
import Grid from "@mui/material/Grid";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from "firebase/auth";
import { auth, database } from "../service/firebase";
import { ref, get, query, orderByChild, equalTo, set } from "firebase/database";
import { useNavigate } from "react-router-dom";
import Logo from "../../src/assets/img/logo2.gif";
import CodeImage from "../../src/assets/img/undraw_code-thinking_0vf2.svg";
import GoogleIcon from "../../src/assets/img/googleicon.svg";

const defaultTheme = createTheme();

const validationSchema = Yup.object().shape({
  email: Yup.string().email("Email inválido").required("Email é obrigatório"),
  password: Yup.string()
    .min(6, "A senha deve ter pelo menos 6 caracteres")
    .required("Senha é obrigatória"),
});

const getFirebaseErrorMessage = (error) => {
  let erroTipo = error.code ? error.code : error;
  switch (erroTipo) {
    case "INVALID_LOGIN_CREDENTIALS":
      return "As credenciais de login são inválidas.";
    case "auth/invalid-email":
      return "O email fornecido é inválido.";
    case "auth/user-disabled":
      return "Este usuário foi desativado.";
    case "auth/user-not-found":
      return "Nenhum usuário encontrado com este email.";
    case "auth/wrong-password":
      return "A senha está incorreta.";
    case "auth/invalid-credential":
      return "Credencial inválida.";
    default:
      return "Ocorreu um erro desconhecido. Tente novamente.";
  }
};

export default function SignInSide() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError: setFormError,
  } = useForm({
    resolver: yupResolver(validationSchema),
  });

  const onSubmit = async (data) => {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );
      if (!userCredential.user.emailVerified) {
        await signOut(auth);
        setError("Por favor, verifique seu email antes de fazer login.");
        return;
      }
      navigate("/dashboard");
    } catch (error) {
      const message = getFirebaseErrorMessage(error);
      setFormError("firebase", { type: "manual", message });
    }
  };

  const checkIfEmailExists = async (email) => {
    const usersRef = ref(database, "users");
    const emailQuery = query(usersRef, orderByChild("email"), equalTo(email));
    const snapshot = await get(emailQuery);
    return snapshot.exists();
  };

  const saveUserToDatabase = async (user) => {
    const userRef = ref(database, `users/${user.uid}`);
    await set(userRef, {
      firstName: user.displayName?.split(" ")[0] || "",
      lastName: user.displayName?.split(" ").slice(1).join(" ") || "",
      email: user.email,
      photoURL: user.photoURL || "",
      gitURL: "",
      linkedinURL: "",
      instagramURL: "",
      facebookURL: "",
      youtubeURL: "",
    });
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const emailExists = await checkIfEmailExists(user.email);
      if (!emailExists) {
        await saveUserToDatabase(user);
      }
      navigate("/dashboard");
    } catch (error) {
      const message = getFirebaseErrorMessage(error);
      setError(message);
    }
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
              onClick={handleGoogleSignIn}
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

