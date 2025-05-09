import React, { useEffect } from "react";
import { IconButton } from "@mui/material";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";

const NavigationButtons = ({
  currentQuestionIndex,
  totalQuestions,
  onPrevious,
  onNext,
  isCurrentAnswerCorrect,
  showFeedback,
}) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "ArrowLeft" && currentQuestionIndex > 0) {
        onPrevious();
      } else if (
        event.key === "ArrowRight" &&
        currentQuestionIndex < totalQuestions - 1
      ) {
        onNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentQuestionIndex, totalQuestions, onPrevious, onNext]);

  const showCelebrationStyle =
    showFeedback &&
    isCurrentAnswerCorrect &&
    currentQuestionIndex < totalQuestions - 1;

  return (
    <>
      {/* Botão Anterior - Lado Esquerdo */}
      <IconButton
        onClick={onPrevious}
        disabled={currentQuestionIndex === 0}
        sx={{
          position: "fixed",
          left: {
            xs: "3px",
            sm: "3px",
            md: "calc(50% - 615px)",
          },
          top: "calc(50% + 30px)",
          transform: "translateY(-50%)",
          backgroundColor: "rgba(255, 255, 255, 0.2)",
          color: "#fff",
          "&:hover": {
            backgroundColor: "rgba(255, 255, 255, 0.3)",
          },
          "&.Mui-disabled": {
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            color: "rgba(255, 255, 255, 0.3)",
          },
          width: { xs: 40, sm: 44, md: 48 },
          height: { xs: 40, sm: 44, md: 48 },
          visibility: currentQuestionIndex === 0 ? "hidden" : "visible",
          zIndex: 1410,
          boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
        }}
      >
        <ArrowBackIosIcon
          sx={{
            fontSize: { xs: "1.1rem", sm: "1.2rem", md: "1.3rem" },
            ml: 1,
          }}
        />
      </IconButton>

      {currentQuestionIndex < totalQuestions - 1 && (
        <IconButton
          onClick={onNext}
          disabled={
            totalQuestions === 0 || (showFeedback && !isCurrentAnswerCorrect)
          }
          sx={{
            position: "fixed",
            right: {
              xs: "3px",
              sm: "3px",
              md: "calc(50% - 650px)",
            },
            top: "calc(50% + 30px)",
            transform: `translateY(-50%) ${
              showCelebrationStyle ? "scale(1.15)" : "scale(1)"
            }`,
            backgroundColor: showCelebrationStyle
              ? "rgba(76, 175, 80, 0.75)" 
              : "rgba(255, 255, 255, 0.2)",
            color: "#fff",
            "&:hover": {
              backgroundColor: showCelebrationStyle
                ? "rgba(76, 175, 80, 0.9)" 
                : "rgba(255, 255, 255, 0.3)",
            },
            "&.Mui-disabled": {
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              color: "rgba(255, 255, 255, 0.3)",
            },
            width: { xs: 40, sm: 44, md: 48 },
            height: { xs: 40, sm: 44, md: 48 },
            zIndex: 1410,
            boxShadow: showCelebrationStyle
              ? "0 0 15px rgba(76, 175, 80, 0.6)"
              : "0 2px 5px rgba(0,0,0,0.2)",
            transition: "all 0.3s ease-in-out",
            border: showCelebrationStyle ? "2px solid white" : "none",
          }}
        >
          <ArrowForwardIosIcon
            sx={{
              fontSize: { xs: "1.1rem", sm: "1.2rem", md: "1.3rem" },
            }}
          />
        </IconButton>
      )}
    </>
  );
};

export default NavigationButtons;
