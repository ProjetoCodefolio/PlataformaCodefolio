import React from "react";
import { Box } from "@mui/material";

/**
 * Exibe (opcionalmente) a imagem de uma questão de quiz.
 * Renderiza apenas se houver uma URL. Largura/altura (em px) são opcionais:
 * quando ausentes, a imagem se ajusta de forma responsiva.
 *
 * Usado tanto nos quizzes tradicionais quanto no Quiz Gigi (live-quiz),
 * sempre posicionado entre o enunciado e as opções.
 */
const QuestionImage = ({ imageUrl, imageWidth, imageHeight, sx }) => {
  if (!imageUrl || !String(imageUrl).trim()) return null;

  const width = Number(imageWidth) > 0 ? `${Number(imageWidth)}px` : "auto";
  const height = Number(imageHeight) > 0 ? `${Number(imageHeight)}px` : "auto";

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        width: "100%",
        my: { xs: 2, sm: 3 },
        ...sx,
      }}
    >
      <img
        src={imageUrl}
        alt="Imagem da questão"
        loading="lazy"
        style={{
          width,
          height,
          maxWidth: "100%",
          objectFit: "contain",
          borderRadius: 8,
        }}
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
    </Box>
  );
};

export default QuestionImage;
