import { Avatar, Box, Grid, Typography, IconButton } from "@mui/material";
import { Edit, Settings } from "@mui/icons-material";
import InstagramIcon from "@mui/icons-material/Instagram";
import YouTubeIcon from "@mui/icons-material/YouTube";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import { useAuth } from "../../context/AuthContext";
import Topbar from "../../components/topbar/Topbar";

export default function ProfileHeader() {
  const { currentUser } = useAuth();
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
        }}
      >
        <Box
          sx={{
            position: "relative",
            height: "200px",
            backgroundImage: `url(${currentUser?.photoURL})`,
            backgroundSize: "cover",
          }}
        >
          <Avatar
            src={currentUser?.photoURL}
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
          <Grid container justifyContent="center" spacing={2} sx={{ mt: 1 }}>
            <Grid item>
              <IconButton
                href="https://instagram.com"
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
        </Box>
        <Box sx={{ position: "absolute", top: 8, right: 16 }}>
          <IconButton color="primary">
            <Edit />
          </IconButton>
          <IconButton color="primary">
            <Settings />
          </IconButton>
        </Box>
      </Box>
    </>
  );
}
