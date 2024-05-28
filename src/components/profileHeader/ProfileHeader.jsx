import {
  Avatar,
  Box,
  Grid,
  Typography,
  IconButton,
  MenuItem,
  ListItemIcon,
} from "@mui/material";
import { Edit, Settings } from "@mui/icons-material";
import InstagramIcon from "@mui/icons-material/Instagram";
import YouTubeIcon from "@mui/icons-material/YouTube";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import { useNavigate } from "react-router-dom";
import "../profileHeader/style.css";

export default function ProfileHeader() {
  const navigate = useNavigate();

  const handleMembersClick = () => {
    navigate("/members");
  };

  const handleTimelineClick = () => {
    navigate("/dashboard");
  };

  const handleFotosClick = () => {
    navigate("/fotos");
  };

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: { xs: "100%", sm: "800px", md: "1200px" }, // Ajuste de largura para diferentes tamanhos de tela
        mx: "auto",
        boxShadow: 1,
        borderRadius: 2,
        overflow: "hidden",
        backgroundColor: "white",
        marginTop: "50px",
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
              <strong>Posts</strong>
            </Typography>
            <Typography variant="body2">690</Typography>
          </Grid>
          <Grid item>
            <Typography variant="body1">
              <strong>Followers</strong>
            </Typography>
            <Typography variant="body2">206</Typography>
          </Grid>
          <Grid item>
            <Typography variant="body1">
              <strong>Following</strong>
            </Typography>
            <Typography variant="body2">100</Typography>
          </Grid>
        </Grid>
      </Box>
      <Box sx={{ position: "absolute", top: 8, right: 16 }}>
        <IconButton color="primary">
          <Edit />
        </IconButton>
        <IconButton color="primary">
          <Settings />
        </IconButton>
      </Box>
      <Box sx={{ mt: 4, borderTop: 1, borderColor: "divider" }}>
        <Grid container>
          <Grid item xs={4} sx={{ textAlign: "center", p: 2 }}>
            <MenuItem onClick={handleTimelineClick} >
              <strong className="texto" >Timeline</strong>
            </MenuItem>
          </Grid>
          <Grid item xs={4} sx={{ textAlign: "center", p: 2 }}>
            <MenuItem onClick={handleMembersClick}>
              <ListItemIcon></ListItemIcon>
              <strong className="texto">Membros</strong>
            </MenuItem>
          </Grid>
          <Grid item xs={4} sx={{ textAlign: "center", p: 2 }}>
            <MenuItem onClick={handleFotosClick}>
              <ListItemIcon></ListItemIcon>
              <strong className="texto">Fotos</strong>
            </MenuItem>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
