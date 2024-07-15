// src/components/profileHeader/ProfileHeader.js
import React from "react";
import {
  Avatar,
  Box,
  Grid,
  Typography,
  IconButton,
  Button,
} from "@mui/material";

import InstagramIcon from "@mui/icons-material/Instagram";
import YouTubeIcon from "@mui/icons-material/YouTube";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import { useEffect, useState } from "react";
import { database } from "../../service/firebase";
import { ref, get} from "firebase/database";

export default function ProfileHeader({ selectedButton, onTimelineClick, onMembersClick, onFotosClick }) {

  const [posts, setPosts] = useState([]);

  const fetchPosts = async () => {
    const postsQuery = ref(database, "post");
  
    const snapshot = await get(postsQuery);
    const postsData = snapshot.val();
    if (postsData) {
      const postsList = Object.keys(postsData).map((key) => ({
        id: key,
        ...postsData[key],
      })).reverse();
  
      setPosts(postsList);
    }
  };
  
  useEffect(() => {
    fetchPosts();
  }, []);

  return (
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
            <Typography variant="body1">
              <strong>Publicações</strong>
            </Typography>
            <Typography variant="body2">{posts.length}</Typography>
          </Grid>
          <Grid item>
            <Typography variant="body1">
              <strong>Seguidores</strong>
            </Typography>
            <Typography variant="body2">206</Typography>
          </Grid>
          <Grid item>
            <Typography variant="body1">
              <strong>Seguindo</strong>
            </Typography>
            <Typography variant="body2">100</Typography>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ mt: 4, borderTop: 1, borderColor: "divider" }}>
        <Grid container>
        <Grid item xs={4} sx={{ textAlign: "center", p: 2, backgroundColor: selectedButton === 0 ? "#6a0dad" : "transparent" }}>
            <Button
              variant="text"
              onClick={onTimelineClick}
              sx={{ p: 0, "&:hover": { backgroundColor: "transparent" } }}
            >
              <Typography variant="body1">
                <strong>Timeline</strong>
              </Typography>
            </Button>
          </Grid>
          <Grid item xs={4} sx={{ textAlign: "center", p: 2, backgroundColor: selectedButton === 1 ? "#6a0dad" : "transparent" }}>
            <Button
              variant="text"
              onClick={onMembersClick}
              sx={{ p: 0, "&:hover": { backgroundColor: "transparent" } }}
            >
              <Typography variant="body1">Membros</Typography>
            </Button>
          </Grid>
          <Grid item xs={4} sx={{ textAlign: "center", p: 2, backgroundColor: selectedButton === 2 ? "#6a0dad" : "transparent" }}>
            <Button
              variant="text"
              onClick={onFotosClick}
              sx={{ p: 0, "&:hover": { backgroundColor: "transparent" } }}
            >
              <Typography variant="body1">Fotos</Typography>
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
