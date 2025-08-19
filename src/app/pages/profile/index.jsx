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
import { useAuth } from "$context/AuthContext";
import Topbar from "$components/topbar/Topbar";
import { ref, update, get } from "firebase/database";
import { database } from "$api/config/firebase";
import ImgPerfil from "$assets/img/fundoperfil.jpg";

const validationSchema = Yup.object().shape({
  firstName: Yup.string().required("Nome é obrigatório"),
  lastName: Yup.string().required("Sobrenome é obrigatório"),
  photoURL: Yup.string()
    .matches(
      /^data:image\/(jpeg|jpg|png);base64,/,
      "A foto deve ser uma string base64 válida"
    )
    .nullable(),
  gitURL: Yup.string().url("URL do GitHub inválida"),
  linkedinURL: Yup.string().url("URL do LinkedIn inválida"),
  instagramURL: Yup.string().url("URL do Instagram inválida"),
  facebookURL: Yup.string().url("URL do Facebook inválida"),
  youtubeURL: Yup.string().url("URL do YouTube inválida"),
});

export default function ProfileHeader() {
  const { currentUser, userDetails, updateUserProfile } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [photoURL, setPhotoURL] = useState("");
  const [gitURL, setGitURL] = useState("");
  const [linkedinURL, setLinkedinURL] = useState("");
  const [instagramURL, setInstagramURL] = useState("");
  const [facebookURL, setFacebookURL] = useState("");
  const [youtubeURL, setYoutubeURL] = useState("");
  const [displayName, setDisplayName] = useState(
    `${userDetails?.firstName || ''} ${userDetails?.lastName || ''}`
  );

  const defaultValues = {
    firstName: userDetails?.firstName || '',
    lastName: userDetails?.lastName || '',
    photoURL: userDetails?.photoURL || '',
    gitURL: userDetails?.gitURL || '',
    linkedinURL: userDetails?.linkedinURL || '',
    instagramURL: userDetails?.instagramURL || '',
    facebookURL: userDetails?.facebookURL || '',
    youtubeURL: userDetails?.youtubeURL || '',
  };

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(validationSchema),
    defaultValues
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

  const handleSave = async (data) => {
    if (currentUser) {
      const newDisplayName = `${data.firstName} ${data.lastName}`;
      const userData = {
        firstName: data.firstName,
        lastName: data.lastName,
        photoURL: data.photoURL,
        gitURL: data.gitURL,
        linkedinURL: data.linkedinURL,
        instagramURL: data.instagramURL,
        facebookURL: data.facebookURL,
        youtubeURL: data.youtubeURL,
        displayName: newDisplayName,
      };

      try {
        await update(ref(database, "users/" + currentUser.uid), userData);
        
      
        updateUserProfile({
          displayName: newDisplayName,
          photoURL: data.photoURL
        });

      
        setDisplayName(newDisplayName);
        setEditMode(false);
      } catch (error) {
        console.error("Erro ao atualizar perfil:", error);
      }
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const base64 = await convertToBase64(file);
      setPhotoURL(base64);
      setValue("photoURL", base64);
    }
  };

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

 
  return (
    <>
      <Topbar hideSearch={true} />
      <Box
        sx={{
          width: "100%",
          maxWidth: { xs: "95%", sm: "550px", md: "700px" }, 
          mx: "auto",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)", 
          borderRadius: "24px", 
          overflow: "hidden",
          backgroundColor: "white",
          marginTop: "80px", 
          marginBottom: "40px", 
          position: "relative",
          transition: "all 0.3s ease"
        }}
      >
        <Box
          sx={{
            position: "relative",
            height: "200px",
            backgroundImage: `url(${ImgPerfil})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundColor: photoURL ? "transparent" : "#f0f0f0",
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.3) 100%)", // Gradiente mais suave
            }
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
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
              transition: "transform 0.3s ease",
              "&:hover": {
                transform: "translateX(-50%) scale(1.05)"
              }
            }}
          />
        </Box>

        <Box sx={{ 
          textAlign: "center", 
          mt: 8, 
          mb: 3, 
          px: { xs: 2, sm: 3 } 
        }}>
          <Typography 
            variant="h4" 
            component="h1"
            sx={{
              fontWeight: 600,
              color: "#1a1a1a",
              mb: 1
            }}
          >
            {displayName}
          </Typography>
          <Typography 
            variant="body1"
            sx={{
              color: "#666",
              fontSize: "1.1rem",
              mb: 3
            }}
          >
            {currentUser?.email}
          </Typography>

          {editMode ? (
            <form onSubmit={handleSubmit(handleSave)}>
              <Box sx={{ 
                mt: 2, 
                px: 3, 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 4
              }}>
           
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center',
                  marginBottom: '16px' 
                }}>
                  <input
                    accept="image/*"
                    type="file"
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                    id="profile-picture-upload"
                  />
                  <label htmlFor="profile-picture-upload">
                    <Button
                      variant="contained"
                      sx={{
                        backgroundColor: "#9041c1",
                        "&:hover": { backgroundColor: "#7d37a7" },
                        padding: "10px 24px"
                      }}
                      component="span"
                    >
                      Selecionar Foto
                    </Button>
                  </label>
                </div>

              
                <Grid container spacing={2}>
                
                  <Grid item xs={12} md={6}>
                    <Controller
                      name="firstName"
                      control={control}
                      defaultValue=""
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Nome"
                          error={!!errors.firstName}
                          helperText={errors.firstName?.message}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Controller
                      name="lastName"
                      control={control}
                      defaultValue=""
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Sobrenome"
                          error={!!errors.lastName}
                          helperText={errors.lastName?.message}
                        />
                      )}
                    />
                  </Grid>

             
                  <Grid item xs={12}>
                    <Typography variant="h6" sx={{ mb: 2, color: '#666' }}>
                      Redes Sociais
                    </Typography>
                  </Grid>

              
                  <Grid item xs={12} md={6}>
                    <Controller
                      name="gitURL"
                      control={control}
                      defaultValue=""
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="GitHub"
                          InputProps={{
                            startAdornment: <GitHubIcon sx={{ mr: 1, color: '#666' }} />
                          }}
                          error={!!errors.gitURL}
                          helperText={errors.gitURL?.message}
                        />
                      )}
                    />
                  </Grid>

            
                  <Grid item xs={12} md={6}>
                    <Controller
                      name="linkedinURL"
                      control={control}
                      defaultValue=""
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="LinkedIn"
                          InputProps={{
                            startAdornment: <LinkedInIcon sx={{ mr: 1, color: '#666' }} />
                          }}
                          error={!!errors.linkedinURL}
                          helperText={errors.linkedinURL?.message}
                        />
                      )}
                    />
                  </Grid>

           
                  <Grid item xs={12} md={6}>
                    <Controller
                      name="instagramURL"
                      control={control}
                      defaultValue=""
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Instagram"
                          InputProps={{
                            startAdornment: <InstagramIcon sx={{ mr: 1, color: '#666' }} />
                          }}
                          error={!!errors.instagramURL}
                          helperText={errors.instagramURL?.message}
                        />
                      )}
                    />
                  </Grid>

       
                  <Grid item xs={12} md={6}>
                    <Controller
                      name="facebookURL"
                      control={control}
                      defaultValue=""
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Facebook"
                          InputProps={{
                            startAdornment: <FacebookIcon sx={{ mr: 1, color: '#666' }} />
                          }}
                          error={!!errors.facebookURL}
                          helperText={errors.facebookURL?.message}
                        />
                      )}
                    />
                  </Grid>

                
                  <Grid item xs={12} md={6}>
                    <Controller
                      name="youtubeURL"
                      control={control}
                      defaultValue=""
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="YouTube"
                          InputProps={{
                            startAdornment: <YouTubeIcon sx={{ mr: 1, color: '#666' }} />
                          }}
                          error={!!errors.youtubeURL}
                          helperText={errors.youtubeURL?.message}
                        />
                      )}
                    />
                  </Grid>
                </Grid>

           
                <Button
                  type="submit"
                  variant="contained"
                  sx={{
                    mt: 4,
                    mb: 2,
                    backgroundColor: "#9041c1",
                    "&:hover": { backgroundColor: "#7d37a7" },
                    padding: "12px 32px",
                    alignSelf: "center"
                  }}
                >
                  Salvar Alterações
                </Button>
              </Box>
            </form>
          ) : (
            <Grid
              container
              justifyContent="center"
              spacing={3}
              sx={{ mt: 2 }}
            >
              {[
                { url: instagramURL, Icon: InstagramIcon },
                { url: youtubeURL, Icon: YouTubeIcon },
                { url: linkedinURL, Icon: LinkedInIcon },
                { url: facebookURL, Icon: FacebookIcon },
                { url: gitURL, Icon: GitHubIcon }
              ].map(({ url, Icon }, index) => url && (
                <Grid item key={index}>
                  <IconButton
                    href={url}
                    target="_blank"
                    sx={{
                      color: "#9041c1",
                      transition: "all 0.3s ease",
                      "&:hover": {
                        color: "#7d37a7",
                        transform: "translateY(-2px)"
                      }
                    }}
                  >
                    <Icon sx={{ fontSize: 28 }} />
                  </IconButton>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>

        <Box sx={{ position: "absolute", top: 16, right: 16 }}>
          <IconButton
            onClick={() => setEditMode(!editMode)}
            sx={{
              color: "white",
              bgcolor: "#9041c1",
              "&:hover": {
                bgcolor: "#7d37a7",
                transform: "rotate(180deg)"
              },
              transition: "all 0.3s ease",
              width: 45,
              height: 45
            }}
          >
            <Edit />
          </IconButton>
        </Box>
      </Box>
    </>
  );
}
