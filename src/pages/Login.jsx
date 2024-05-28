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
import BackgroundImage from "../../public/assets/img/codefolio.jpg";

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
      <Grid container component="main" sx={{ height: "100vh" }}>
        <CssBaseline />
        <Grid
          item
          xs={false}
          sm={4}
          md={7}
          sx={{
            backgroundImage: `url(${BackgroundImage})`,
            backgroundRepeat: "no-repeat",
            backgroundColor: (t) =>
              t.palette.mode === "light"
                ? t.palette.grey[50]
                : t.palette.grey[900],
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <Grid item xs={12} sm={8} md={5} component={Paper} elevation={6} square>
          <Box
            sx={{
              my: 8,
              mx: 4,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Typography component="h1" variant="h5">
              Entrar
            </Typography>
            <Box
              component="form"
              noValidate
              onSubmit={handleSubmit(onSubmit)}
              sx={{ mt: 1 }}
            >
              <Grid container spacing={2}>
                <Grid item xs={12}>
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
                  />
                </Grid>
                <Grid item xs={12}>
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
                  />
                </Grid>
              </Grid>
              {errors.firebase && (
                <Typography color="error">{errors.firebase.message}</Typography>
              )}
              {error && <Typography color="error">{error}</Typography>}
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    sx={{ mt: 3, mb: 2 }}
                  >
                    Entrar
                  </Button>
                </Grid>
                <Grid item xs={12}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={handleGoogleSignIn}
                    sx={{ mt: 1, mb: 2 }}
                  >
                    Entrar com Google
                  </Button>
                </Grid>
              </Grid>
              <Grid container>
                <Grid item xs>
                  <Link href="/forgot-password" variant="body2">
                    Esqueceu sua senha?
                  </Link>
                </Grid>
                <Grid item>
                  <Link href="/sign-up" variant="body2">
                    {"Não tem uma conta? Inscrever-se"}
                  </Link>
                </Grid>
              </Grid>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </ThemeProvider>
  );
}
