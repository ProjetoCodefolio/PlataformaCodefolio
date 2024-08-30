import React from "react";
import { Avatar, Box, Grid, Typography, IconButton, } from "@mui/material";
import InstagramIcon from "@mui/icons-material/Instagram";
import YouTubeIcon from "@mui/icons-material/YouTube";
import LinkedInIcon from "@mui/icons-material/LinkedIn";

export default function Header({ nome, imagem, quantidadePosts }) {

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
                    src={imagem}
                    alt="Profile Picture"
                    sx={{
                        width: 120,
                        height: 120,
                        position: "absolute",
                        bottom: -60,
                        left: "50%",
                        transform: "translateX(-50%)",
                        border: "4px solid white",
                    }} />
            </Box>
            <Box sx={{ textAlign: "center", mt: 8, mb: 2 }}>
                <Typography variant="h5" component="h1">
                    {nome}
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
                    <Box sx={{ mt: 4, borderTop: 20, borderColor: "divider" }}></Box>
                </Grid>
            </Box>
        </Box >
    );
}