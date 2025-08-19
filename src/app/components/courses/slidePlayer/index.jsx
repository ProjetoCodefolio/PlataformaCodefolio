import React from "react";
import PropTypes from "prop-types";
import { Box, Typography, IconButton } from "@mui/material";
import YouTubeIcon from "@mui/icons-material/YouTube";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate } from "react-router-dom";
import { prepareSlideUrl } from "$api/services/courses/slides";

const SlidePlayer = ({ slideData, onReturnToVideo, courseTitle }) => {
  const navigate = useNavigate();

  if (!slideData) {
    return (
      <Box
        sx={{
          p: { xs: 2, sm: 4 },
          textAlign: "center",
          backgroundColor: "#F5F5FA",
        }}
      >
        <Typography variant="h6" color="error">
          Erro: Slide não encontrado
        </Typography>
      </Box>
    );
  }

  // Assegure-se de que a URL está no formato correto
  const slideUrl = slideData.url;

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: { xs: "100%", sm: "840px" },
        mx: "auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        backgroundColor: "#F5F5FA",
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: { xs: "100%", sm: "780px" },
          display: "flex",
          alignItems: "center",
          mb: 2,
          ml: { xs: 0, sm: 2 },
        }}
      >
        <IconButton
          onClick={() => navigate(-1)}
          sx={{
            color: "#9041c1",
            mr: 1,
          }}
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            color: "#555",
            fontSize: { xs: "1rem", sm: "1.25rem" },
          }}
        >
          {courseTitle ? `${courseTitle} - Slides` : slideData.title}
        </Typography>

        <Box sx={{ display: "flex", ml: "auto" }}>
          <IconButton
            onClick={onReturnToVideo}
            sx={{
              color: "#fff",
              bgcolor: "#9041c1",
              mr: 1,
              p: 0.8,
              "&:hover": {
                bgcolor: "#7a35a3",
              },
            }}
            title="Voltar ao vídeo"
          >
            <YouTubeIcon sx={{ fontSize: "18px" }} />
          </IconButton>
        </Box>
      </Box>

      <Box
        sx={{
          width: "100%",
          maxWidth: { xs: "100%", sm: "780px" },
          position: "relative",
          borderRadius: "12px",
          overflow: "hidden",
          boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
          ml: { xs: 0, sm: 2 },
          backgroundColor: "#F5F5FA",
          pb: "56.25%" /* Proporção 16:9 */,
          height: 0,
        }}
      >
        <iframe
          src={slideUrl}
          title={slideData.title}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            border: 0,
          }}
          allowFullScreen
          mozallowfullscreen="true"
          webkitallowfullscreen="true"
        />
      </Box>

      {slideData.description && (
        <Box
          sx={{
            width: "100%",
            maxWidth: { xs: "100%", sm: "780px" },
            mt: { xs: 2, sm: 3 },
            ml: { xs: 0, sm: 2 },
            backgroundColor: "#F5F5FA",
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 600, mb: 1, color: "#555" }}
          >
            Descrição:
          </Typography>
          <Typography variant="body2" sx={{ color: "#666", lineHeight: 1.6 }}>
            {slideData.description.split("\n").map((line, index) => (
              <React.Fragment key={index}>
                {line}
                {index < slideData.description.split("\n").length - 1 && <br />}
              </React.Fragment>
            ))}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

SlidePlayer.propTypes = {
  slideData: PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string.isRequired,
    url: PropTypes.string.isRequired,
    description: PropTypes.string,
    videoId: PropTypes.string,
  }).isRequired,
  onReturnToVideo: PropTypes.func.isRequired,
  courseTitle: PropTypes.string,
};

export default SlidePlayer;
