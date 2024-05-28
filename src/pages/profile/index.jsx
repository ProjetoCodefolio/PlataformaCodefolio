import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";
import {
  Avatar,
  Box,
  Grid,
  Typography,
  IconButton,
  TextField,
  Button,
} from "@mui/material";
import { Edit } from "@mui/icons-material";
import InstagramIcon from "@mui/icons-material/Instagram";
import YouTubeIcon from "@mui/icons-material/YouTube";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import FacebookIcon from "@mui/icons-material/Facebook";
import GitHubIcon from "@mui/icons-material/GitHub";
import { useAuth } from "../../context/AuthContext";
import Topbar from "../../components/topbar/Topbar";
import { database } from "../../service/firebase";
import { ref, update, get } from "firebase/database";

const validationSchema = Yup.object().shape({
  firstName: Yup.string().required("Nome é obrigatório"),
  lastName: Yup.string().required("Sobrenome é obrigatório"),
  photoURL: Yup.string().url("URL da foto inválida").nullable(),
  gitURL: Yup.string().url("URL do GitHub inválida"),
  linkedinURL: Yup.string().url("URL do LinkedIn inválida"),
  instagramURL: Yup.string().url("URL do Instagram inválida"),
  facebookURL: Yup.string().url("URL do Facebook inválida"),
  youtubeURL: Yup.string().url("URL do YouTube inválida"),
});

export default function ProfileHeader() {
  const { currentUser } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [photoURL, setPhotoURL] = useState("");
  const [gitURL, setGitURL] = useState("");
  const [linkedinURL, setLinkedinURL] = useState("");
  const [instagramURL, setInstagramURL] = useState("");
  const [facebookURL, setFacebookURL] = useState("");
  const [youtubeURL, setYoutubeURL] = useState("");

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(validationSchema),
  });

  useEffect(() => {
    const fetchUserData = async () => {
      if (currentUser) {
        const userRef = ref(database, `users/${currentUser.uid}`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          setValue("firstName", data.firstName || "");
          setValue("lastName", data.lastName || "");
          setValue("photoURL", data.photoURL || "");
          setPhotoURL(data.photoURL || "");
          setValue("gitURL", data.gitURL || "");
          setGitURL(data.gitURL || "");
          setValue("linkedinURL", data.linkedinURL || "");
          setLinkedinURL(data.linkedinURL || "");
          setValue("instagramURL", data.instagramURL || "");
          setInstagramURL(data.instagramURL || "");
          setValue("facebookURL", data.facebookURL || "");
          setFacebookURL(data.facebookURL || "");
          setValue("youtubeURL", data.youtubeURL || "");
          setYoutubeURL(data.youtubeURL || "");
        }
      }
    };

    fetchUserData();
  }, [currentUser, setValue]);

  const handleSave = (data) => {
    if (currentUser) {
      const userData = {
        firstName: data.firstName,
        lastName: data.lastName,
        photoURL: data.photoURL,
        gitURL: data.gitURL,
        linkedinURL: data.linkedinURL,
        instagramURL: data.instagramURL,
        facebookURL: data.facebookURL,
        youtubeURL: data.youtubeURL,
      };
      update(ref(database, "users/" + currentUser.uid), userData);
      setPhotoURL(data.photoURL); // Atualiza a photoURL após salvar
      setGitURL(data.gitURL);
      setLinkedinURL(data.linkedinURL);
      setInstagramURL(data.instagramURL);
      setFacebookURL(data.facebookURL);
      setYoutubeURL(data.youtubeURL);
      setEditMode(false);
    }
  };

  return (
    <>
      <Topbar />
      <Box
        sx={{
          width: "100%",
          maxWidth: { xs: "100%", sm: "600px", md: "800px" },
          mx: "auto",
          boxShadow: 1,
          borderRadius: 2,
          overflow: "hidden",
          backgroundColor: "white",
          marginTop: "100px",
          position: "relative",
        }}
      >
        <Box
          sx={{
            position: "relative",
            height: "200px",
            backgroundImage: `url(${photoURL || "default-image-url.jpg"})`,
            backgroundSize: "cover",
            backgroundColor: photoURL ? "transparent" : "gray",
          }}
        >
          <Avatar
            src={photoURL || "default-avatar-url.jpg"}
            alt="Profile Picture"
            sx={{
              width: 120,
              height: 120,
              position: "absolute",
              bottom: -60,
              left: "50%",
              transform: "translateX(-50%)",
              border: "4px solid white",
            }}
          />
        </Box>
        <Box sx={{ textAlign: "center", mt: 8, mb: 2 }}>
          <Typography variant="h5" component="h1">
            {currentUser?.displayName}
          </Typography>
          <Typography variant="body1">{currentUser?.email}</Typography>
          {editMode ? (
            <form onSubmit={handleSubmit(handleSave)}>
              <Box sx={{ mt: 2 }}>
                <Controller
                  name="firstName"
                  control={control}
                  defaultValue=""
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      margin="normal"
                      label="Nome"
                      error={!!errors.firstName}
                      helperText={errors.firstName?.message}
                    />
                  )}
                />
                <Controller
                  name="lastName"
                  control={control}
                  defaultValue=""
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      margin="normal"
                      label="Sobrenome"
                      error={!!errors.lastName}
                      helperText={errors.lastName?.message}
                    />
                  )}
                />
                <Controller
                  name="photoURL"
                  control={control}
                  defaultValue=""
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      margin="normal"
                      label="URL da Foto"
                      error={!!errors.photoURL}
                      helperText={errors.photoURL?.message}
                    />
                  )}
                />
                <Controller
                  name="gitURL"
                  control={control}
                  defaultValue=""
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      margin="normal"
                      label="URL do GitHub"
                      error={!!errors.gitURL}
                      helperText={errors.gitURL?.message}
                    />
                  )}
                />
                <Controller
                  name="linkedinURL"
                  control={control}
                  defaultValue=""
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      margin="normal"
                      label="URL do LinkedIn"
                      error={!!errors.linkedinURL}
                      helperText={errors.linkedinURL?.message}
                    />
                  )}
                />
                <Controller
                  name="instagramURL"
                  control={control}
                  defaultValue=""
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      margin="normal"
                      label="URL do Instagram"
                      error={!!errors.instagramURL}
                      helperText={errors.instagramURL?.message}
                    />
                  )}
                />
                <Controller
                  name="facebookURL"
                  control={control}
                  defaultValue=""
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      margin="normal"
                      label="URL do Facebook"
                      error={!!errors.facebookURL}
                      helperText={errors.facebookURL?.message}
                    />
                  )}
                />
                <Controller
                  name="youtubeURL"
                  control={control}
                  defaultValue=""
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      margin="normal"
                      label="URL do YouTube"
                      error={!!errors.youtubeURL}
                      helperText={errors.youtubeURL?.message}
                    />
                  )}
                />
              </Box>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                sx={{ mt: 2 }}
              >
                Salvar
              </Button>
            </form>
          ) : (
            <>
              <Grid
                container
                justifyContent="center"
                spacing={2}
                sx={{ mt: 1 }}
              >
                {instagramURL && (
                  <Grid item>
                    <IconButton
                      href={instagramURL}
                      target="_blank"
                      color="primary"
                    >
                      <InstagramIcon />
                    </IconButton>
                  </Grid>
                )}
                {youtubeURL && (
                  <Grid item>
                    <IconButton
                      href={youtubeURL}
                      target="_blank"
                      color="primary"
                    >
                      <YouTubeIcon />
                    </IconButton>
                  </Grid>
                )}
                {linkedinURL && (
                  <Grid item>
                    <IconButton
                      href={linkedinURL}
                      target="_blank"
                      color="primary"
                    >
                      <LinkedInIcon />
                    </IconButton>
                  </Grid>
                )}
                {facebookURL && (
                  <Grid item>
                    <IconButton
                      href={facebookURL}
                      target="_blank"
                      color="primary"
                    >
                      <FacebookIcon />
                    </IconButton>
                  </Grid>
                )}
                {gitURL && (
                  <Grid item>
                    <IconButton href={gitURL} target="_blank" color="primary">
                      <GitHubIcon />
                    </IconButton>
                  </Grid>
                )}
              </Grid>
            </>
          )}
        </Box>
        <Box sx={{ position: "absolute", top: 8, right: 16 }}>
          <IconButton color="primary" onClick={() => setEditMode(!editMode)}>
            <Edit />
          </IconButton>
        </Box>
      </Box>
    </>
  );
}
