import React from "react";
import { Box, Button, Typography, Fade } from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";

const AnswerOptions = ({
  options,
  selectedAnswer,
  showFeedback,
  onAnswerSelect,
  isCorrectAnswer,
}) => {
  return (
    <Box
      sx={{
        width: "100%",
        mt: 3,
        display: "flex",
        flexDirection: "column",
        gap: { xs: 1.5, sm: 2, md: 2.5 },
        pl: 0.5,
        pr: { xs: 0.5, sm: 1 },
        mx: "auto",
      }}
    >
      {options.map((option, index) => (
        <Button
          key={index}
          variant="contained"
          onClick={() => onAnswerSelect(index)}
          disabled={showFeedback && selectedAnswer !== index}
          sx={{
            width: "100%",
            py: { xs: 1.8, sm: 2.5 },
            px: { xs: 2, sm: 3 },
            borderRadius: "12px",
            fontSize: { xs: "0.95rem", sm: "1.1rem", md: "1.2rem" },
            fontWeight: "normal",
            textAlign: "left",
            justifyContent: "flex-start",
            position: "relative",
            boxShadow: "0 4px 10px rgba(0, 0, 0, 0.15)",
            transition: "all 0.2s ease-in-out",
            overflow: "hidden",
            mx: "auto",
            backgroundColor: showFeedback
              ? selectedAnswer === index
                ? isCorrectAnswer(index)
                  ? "rgba(76, 175, 80, 0.75)"
                  : "rgba(211, 47, 47, 0.75)"
                : isCorrectAnswer(index) && "rgba(76, 175, 80, 0.75)"
              : "#9041c1",
            "&:hover": {
              backgroundColor: showFeedback
                ? selectedAnswer === index
                  ? isCorrectAnswer(index)
                    ? "rgba(76, 175, 80, 0.8)"
                    : "rgba(211, 47, 47, 0.8)"
                  : isCorrectAnswer(index) && "rgba(76, 175, 80, 0.8)"
                : "#7e37a6",
              transform: !showFeedback && "translateY(-2px)",
              boxShadow: !showFeedback && "0 6px 12px rgba(0, 0, 0, 0.2)",
            },
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              width: "100%",
            }}
          >
            <Typography
              component="span"
              sx={{
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                color: "#fff",
                width: 30,
                height: 30,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mr: 2,
                flexShrink: 0,
                mt: 0.3,
                fontWeight: "bold",
                fontSize: {
                  xs: "0.95rem",
                  sm: "1rem",
                  md: "1.05rem",
                },
              }}
            >
              {String.fromCharCode(65 + index)}
            </Typography>
            <Typography
              component="span"
              sx={{
                flex: 1,
                wordBreak: "break-word",
                overflowWrap: "break-word",
                whiteSpace: "normal",
                lineHeight: 1.5,
                maxWidth: "calc(100% - 50px)",
                hyphens: "auto",
                fontWeight: 500,
                letterSpacing: "0.2px",
                fontSize: {
                  xs: "1rem",
                  sm: "1.15rem",
                  md: "1.25rem",
                },
                fontFamily:
                  "'Poppins', 'Roboto', 'Helvetica', 'Arial', sans-serif",
                textShadow: "0px 1px 1px rgba(0,0,0,0.1)",
              }}
            >
              {option}
            </Typography>
            {showFeedback && selectedAnswer === index && (
              <Fade in={showFeedback}>
                {isCorrectAnswer(index) ? (
                  <CheckCircleOutlineIcon
                    sx={{
                      color: "#fff",
                      ml: 2,
                      fontSize: 28,
                      flexShrink: 0,
                      mt: 0.3,
                    }}
                  />
                ) : (
                  <CancelOutlinedIcon
                    sx={{
                      color: "#fff",
                      ml: 2,
                      fontSize: 28,
                      flexShrink: 0,
                      mt: 0.3,
                    }}
                  />
                )}
              </Fade>
            )}
          </Box>
        </Button>
      ))}
    </Box>
  );
};

export default AnswerOptions;
