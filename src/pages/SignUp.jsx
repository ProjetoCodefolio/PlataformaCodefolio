import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";
import Button from "@mui/material/Button";
import CssBaseline from "@mui/material/CssBaseline";
import TextField from "@mui/material/TextField";
import Link from "@mui/material/Link";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { auth, database } from "../service/firebase";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { ref, set } from "firebase/database";
import { useNavigate } from "react-router-dom";
import Logo from "../../src/assets/img/logo2.gif";
import CodeImage2 from "../../src/assets/img/undraw_pair-programming_9jyg.svg";

const defaultTheme = createTheme();

const validationSchema = Yup.object().shape({
  firstName: Yup.string().required("Nome é obrigatório"),
  lastName: Yup.string().required("Sobrenome é obrigatório"),
  email: Yup.string().email("Email inválido").required("Email é obrigatório"),
  password: Yup.string()
    .min(6, "A senha deve ter pelo menos 6 caracteres")
    .required("Senha é obrigatória"),
});

const getFirebaseErrorMessage = (error) => {
  switch (error.code) {
    case "auth/email-already-in-use":
      return "Este email já está em uso.";
    case "auth/invalid-email":
      return "O email fornecido é inválido.";
    case "auth/operation-not-allowed":
      return "Operação não permitida.";
    case "auth/weak-password":
      return "A senha é muito fraca.";
    default:
      return "Ocorreu um erro desconhecido. Tente novamente.";
  }
};

export default function SignUp() {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm({
    resolver: yupResolver(validationSchema),
  });

  const onSubmit = async (data) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );
      await sendEmailVerification(userCredential.user);

      const userId = userCredential.user.uid;
      const userRef = ref(database, `users/${userId}`);
      await set(userRef, {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        photoURL: userCredential.user.photoURL || "",
        gitURL: "",
        linkedinURL: "",
        instagramURL: "",
        facebookURL: "",
        youtubeURL: "",
      });

      navigate("/verify-email");
    } catch (error) {
      const message = getFirebaseErrorMessage(error);
      setError("firebase", { type: "manual", message });
    }
  };

  return (
    <ThemeProvider theme={defaultTheme}>
      <Grid
        container
        component="main"
        sx={{ height: "100vh", backgroundColor: "#8445a3", justifyContent: "center", alignItems: "center" }}
      >
        <CssBaseline />
        {/* Grid da Imagem - Oculto em telas pequenas */}
        <Grid
          item
          xs={false}
          sm={5}
          sx={{
            display: { xs: "none", sm: "flex" },
            justifyContent: "center",
            alignItems: "center",
            pr: 2
          }}
        >
          <img src={CodeImage2} alt="CodeImage2" style={{ width: "90%", maxWidth: "600px" }} />
        </Grid>
        <Grid
          item
          xs={12}
          sm={5}
          component={Paper}
          elevation={6}
          square
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "transparent",
            boxShadow: "none",
            pl: { xs: 0, sm: 2 },
            p: { xs: 2, sm: 0 },
            mt: { xs: 2, sm: 0 }
          }}
        >
          <Box
            sx={{
              width: "100%",
              maxWidth: 420,
              p: { xs: 2, sm: 5 },
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
            <img src={Logo} alt="Logo" style={{ width: "20%", height: "auto", marginBottom: "16px", alignSelf: "center" }} />
            <Typography component="h1" variant="h5" align="center" fontFamily="Arial Unicode" fontWeight={800} fontSize={30} color={"#8445a3"}>
              Realizar Cadastro
            </Typography>
            <Typography variant="body2" align="center" sx={{ mb: 2 }} fontFamily="Arial Unicode" color="#666666" fontSize={16}>
              Por favor, preencha seus dados
            </Typography>
            <Box component="form" noValidate onSubmit={handleSubmit(onSubmit)} sx={{ mt: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    autoComplete="given-name"
                    name="firstName"
                    required
                    fullWidth
                    id="firstName"
                    label="Nome"
                    autoFocus
                    {...register("firstName")}
                    error={!!errors.firstName}
                    helperText={errors.firstName?.message}
                    sx={{ '& .MuiOutlinedInput-root': { '&.Mui-focused fieldset': { borderColor: '#8445a3' } }, '& .MuiInputLabel-root.Mui-focused': { color: '#8445a3', fontWeight: 'bold' } }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    id="lastName"
                    label="Sobrenome"
                    name="lastName"
                    autoComplete="family-name"
                    {...register("lastName")}
                    error={!!errors.lastName}
                    helperText={errors.lastName?.message}
                    sx={{ '& .MuiOutlinedInput-root': { '&.Mui-focused fieldset': { borderColor: '#8445a3' } }, '& .MuiInputLabel-root.Mui-focused': { color: '#8445a3', fontWeight: 'bold' } }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    id="email"
                    label="Email"
                    name="email"
                    autoComplete="email"
                    {...register("email")}
                    error={!!errors.email}
                    helperText={errors.email?.message}
                    sx={{ '& .MuiOutlinedInput-root': { '&.Mui-focused fieldset': { borderColor: '#8445a3' } }, '& .MuiInputLabel-root.Mui-focused': { color: '#8445a3', fontWeight: 'bold' } }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    name="password"
                    label="Senha"
                    type="password"
                    id="password"
                    autoComplete="new-password"
                    {...register("password")}
                    error={!!errors.password}
                    helperText={errors.password?.message}
                    sx={{ '& .MuiOutlinedInput-root': { '&.Mui-focused fieldset': { borderColor: '#8445a3' } }, '& .MuiInputLabel-root.Mui-focused': { color: '#8445a3', fontWeight: 'bold' } }}
                  />
                </Grid>
              </Grid>
              {errors.firebase && (
                <Typography color="error" variant="body2">
                  {errors.firebase.message}
                </Typography>
              )}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ 
                  mt: 3, 
                  mb: 2, 
                  borderRadius: "24px", 
                  fontFamily: "Arial Unicode", 
                  backgroundColor: "#8445a3", 
                  fontSize: "1.2rem", 
                  textTransform: "none", 
                  fontWeight: "bold-light" 
                }}
              >
                Cadastrar
              </Button>
              <Grid container justifyContent="center">
                <Grid item>
                  <Link
                    href="/login"
                    variant="body2"
                    fontFamily="Arial Unicode"
                    sx={{ textDecoration: "none", color: "#8445a3", fontSize: "1rem" }}
                  >
                    Já tem uma conta? Entrar
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
