import React, { useEffect, useState } from "react";
import { Avatar, Box, Grid, Typography, IconButton, Button } from "@mui/material";
import InstagramIcon from "@mui/icons-material/Instagram";
import YouTubeIcon from "@mui/icons-material/YouTube";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import { database } from "../../service/firebase";
import { ref, onValue } from "firebase/database";

export default function ProfileHeader({ selectedButton, onTimelineClick, onMembersClick, onFotosClick }) {
  const [quantidadePosts, setQuantidadePosts] = useState(0);

  useEffect(() => {
    const postsQuery = ref(database, "post");

    const unsubscribe = onValue(postsQuery, (snapshot) => {
      const postsData = snapshot.val();
      if (postsData) {
        const postsList = Object.keys(postsData).map((key) => ({
          id: key,
          ...postsData[key],
        })).reverse();

        setQuantidadePosts(postsList.length);
      } else {
        setQuantidadePosts(0);
      }
    });

    // limpar listener ao desmontar componente
    return () => unsubscribe();
  }, []);

  return (
    <>
      <style>
        {`
          .barra {
            color: black;
            text-transform: capitalize;
          }

          .selected {
            color: white;
            text-transform: capitalize;
          }
        `}
      </style>
      <Box
        sx={{
          width: "100%",
          maxWidth: { xs: "100%", sm: "800px", md: "1200px" },
          mx: "auto",
          boxShadow: 1,
          borderRadius: 2,
          overflow: "hidden",
          backgroundColor: "white",
          marginTop: "50px",
          position: "relative",
        }}
      >
        <Box
          sx={{
            position: "relative",
            height: "200px",
            backgroundImage: "url(/assets/img/profile-bg1.jpg)",
            backgroundSize: "cover",
          }}
        >
          <Avatar
            src="assets/img/codefolio.jpg"
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
            CodeFólio
          </Typography>
          <Grid container justifyContent="center" spacing={2} sx={{ mt: 1 }}>
            <Grid item>
              <IconButton
                href="https://instagram.com/projetocodefolio"
                target="_blank"
                color="primary"
              >
                <InstagramIcon />
              </IconButton>
            </Grid>
            <Grid item>
              <IconButton
                href="https://youtube.com"
                target="_blank"
                color="primary"
              >
                <YouTubeIcon />
              </IconButton>
            </Grid>
            <Grid item>
              <IconButton
                href="https://linkedin.com"
                target="_blank"
                color="primary"
              >
                <LinkedInIcon />
              </IconButton>
            </Grid>
          </Grid>
          <Grid container justifyContent="center" spacing={2} sx={{ mt: 2 }}>
            <Grid item>
              <Typography component="div" variant="h6">
                <strong>Publicações</strong>
              </Typography>
              <Typography component="div" variant="h6">{quantidadePosts}</Typography>
            </Grid>
            <Grid item>
              <Typography component="div" variant="h6">
                <strong>Seguidores</strong>
              </Typography>
              <Typography component="div" variant="h6">-</Typography>
            </Grid>
            <Grid item>
              <Typography component="div" variant="h6">
                <strong>Seguindo</strong>
              </Typography>
              <Typography component="div" variant="h6">-</Typography>
            </Grid>
          </Grid>
        </Box>

        <Box sx={{ mt: 4, borderTop: 20, borderColor: "divider" }}>
          <Grid container>
            <Grid item xs={4} sx={{ textAlign: "center", p: 2, backgroundColor: selectedButton === 0 ? "#6a0dad" : "transparent" }}>
              <Button
                component="div" variant="h6"
                onClick={onTimelineClick}
                sx={{ p: 0, "&:hover": { backgroundColor: "transparent" } }}
              >
                <Typography component="div" variant="h6">
                  <p className={selectedButton === 0 ? "selected" : "barra"}><strong>Timeline</strong> </p>
                </Typography>
              </Button>
            </Grid>
            <Grid item xs={4} sx={{ textAlign: "center", p: 2, backgroundColor: selectedButton === 1 ? "#6a0dad" : "transparent" }}>
              <Button
                component="div" variant="h6"
                onClick={onMembersClick}
                sx={{ p: 0, "&:hover": { backgroundColor: "transparent" } }}
              >
                <Typography component="div" variant="h6">
                  <p className={selectedButton === 1 ? "selected" : "barra"}><strong>Membros</strong></p>
                </Typography>
              </Button>
            </Grid>
            <Grid item xs={4} sx={{ textAlign: "center", p: 2, backgroundColor: selectedButton === 2 ? "#6a0dad" : "transparent" }}>
              <Button
                component="div" variant="h6"
                onClick={onFotosClick}
                sx={{ p: 0, "&:hover": { backgroundColor: "transparent" } }}
              >
                <Typography component="div" variant="h6">
                  <p className={selectedButton === 2 ? "selected" : "barra"}><strong>Fotos</strong></p>
                </Typography>
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </>
  );
}