import React from "react";
import { Box, Typography } from "@mui/material";
import DescriptionIcon from "@mui/icons-material/Description";

const MaterialExtra = () => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        color: "#aaa",
      }}
    >
      <DescriptionIcon sx={{ fontSize: 60, mb: 2, color: "#bbb" }} />
      <Typography variant="h6" sx={{ color: "#555", mb: 1 }}>
        Materiais Extras
      </Typography>
      <Typography variant="body1" sx={{ textAlign: "center" }}>
        Não existem materiais extras relacionados a esta aula.
      </Typography>
    </Box>
  );
};

export default MaterialExtra;
