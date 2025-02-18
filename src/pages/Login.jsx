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

  const handleLogoClick = () => {
    navigate("/");
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
              minHeight: { xs: "auto", sm: "600px" },
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              fontFamily: "Arial Unicode"
            }}
          >
            <img src={Logo} alt="Logo" style={{ width: "20%", height: "auto", marginBottom: "16px", alignSelf: "center", cursor: "pointer" }} onClick={handleLogoClick} />
            <Typography component="h1" variant="h5" align="center" fontFamily="Arial Unicode" fontWeight={800} fontSize={30} color={"#8445a3"}>
              Bem-vindo de volta!
            </Typography>
            <Typography variant="body2" align="center" sx={{ mb: 2 }} fontFamily="Arial Unicode" color="#666666" fontSize={16}>
              Por favor, insira seus dados
            </Typography>
            <Box component="form" noValidate onSubmit={handleSubmit(onSubmit)} sx={{ mt: 1 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email"
                name="email"
                autoComplete="email"
                autoFocus
                {...register("email")}
                error={!!errors.email}
                helperText={errors.email?.message}
                sx={{ '& .MuiOutlinedInput-root': { '&.Mui-focused fieldset': { borderColor: '#8445a3' } }, '& .MuiInputLabel-root.Mui-focused': { color: '#8445a3', fontWeight: 'bold' } }}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Senha"
                type="password"
                id="password"
                autoComplete="current-password"
                {...register("password")}
                error={!!errors.password}
                helperText={errors.password?.message}
                sx={{ '& .MuiOutlinedInput-root': { '&.Mui-focused fieldset': { borderColor: '#8445a3' } }, '& .MuiInputLabel-root.Mui-focused': { color: '#8445a3', fontWeight: 'bold' } }}
              />
              <Grid container alignItems="center" sx={{ mb: 2 }}>
                <Grid item xs textAlign="right">
                  <Link
                    href="/forgot-password"
                    variant="body2"
                    fontFamily="Arial Unicode"
                    sx={{ textDecoration: "none", color: "#666666", fontSize: "0.95rem" }}
                  >
                    Esqueceu sua senha?
                  </Link>
                </Grid>
              </Grid>
              {errors.firebase && <Typography color="error">{errors.firebase.message}</Typography>}
              {error && <Typography color="error">{error}</Typography>}
              <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2, borderRadius: "24px", fontFamily: "Arial Unicode", backgroundColor:"#8445a3", fontSize: "1.2rem", textTransform: "none", fontWeight: "bold-light" }}>
                Entrar
              </Button>
              <Button fullWidth variant="submit" onClick={handleGoogleSignIn} sx={{ mt: 1, mb: 2, borderRadius: "24px", fontFamily: "Arial Unicode", color:"#272727", backgroundColor:"#eae9e8", fontSize: "1.1rem", textTransform: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontWeight: "bold-light" }}>
                <img src={GoogleIcon} alt="Google" style={{ width: "20px", height: "20px" }} />
                Entrar com Google
              </Button>
              <Grid container justifyContent="center">
                <Grid item>
                  <Link
                    href="/sign-up"
                    variant="body2"
                    fontFamily="Arial Unicode"
                    sx={{ textDecoration: "none", color: "#8445a3", fontSize: "1rem" }}
                  >
                    {"Não tem uma conta? Inscrever-se"}
                  </Link>
                </Grid>
              </Grid>
            </Box>
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
