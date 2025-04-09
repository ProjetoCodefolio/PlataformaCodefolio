// import React, { useEffect, useState, useRef } from "react";
// import { Box, Button, Typography, Fade } from "@mui/material";
// import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
// import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";

// const AnswerOptions = ({
//   options,
//   selectedAnswer,
//   showFeedback,
//   onAnswerSelect,
//   isCorrectAnswer,
//   onSubmitAnswer,
// }) => {
//   const [lastKeyPressed, setLastKeyPressed] = useState(null);
//   const [lastKeyTime, setLastKeyTime] = useState(0);
//   const justSelectedRef = useRef(false);
//   const DOUBLE_PRESS_DELAY = 500; // Tempo em ms para considerar duplo pressionamento

//   useEffect(() => {
//     const handleKeyDown = (event) => {
//       if (showFeedback) return;

//       const key = event.key.toLowerCase();
//       const now = Date.now();

//       if (/^[a-e]$/.test(key)) {
//         event.preventDefault();
//         const optionIndex = key.charCodeAt(0) - 'a'.charCodeAt(0);

//         if (optionIndex >= 0 && optionIndex < options.length) {
//           const isSameKeyPressed = key === lastKeyPressed;
//           const isTimingValid = (now - lastKeyTime) < DOUBLE_PRESS_DELAY;
//           const isSameOption = selectedAnswer === optionIndex;

//           // Só submete se for mesma tecla + mesma opção + dentro do tempo
//           if (isSameKeyPressed && isTimingValid && isSameOption) {
//             onSubmitAnswer && onSubmitAnswer();
//           } else {
//             // Apenas seleciona a opção (sem submeter)
//             onAnswerSelect(optionIndex);
//           }

//           // Atualiza a última tecla e tempo
//           setLastKeyPressed(key);
//           setLastKeyTime(now);
//         }
//       } else if (key === 'enter' && selectedAnswer !== null) {
//         event.preventDefault();
//         onSubmitAnswer && onSubmitAnswer();
//       }
//     };

//     // Adicionar o listener de evento
//     window.addEventListener('keydown', handleKeyDown);

//     // Remover o listener quando o componente for desmontado
//     return () => {
//       window.removeEventListener('keydown', handleKeyDown);
//     };
//   }, [options, selectedAnswer, showFeedback, lastKeyPressed, lastKeyTime, onAnswerSelect, onSubmitAnswer]);

//   return (
//     <Box
//       sx={{
//         width: "100%",
//         mt: 3,
//         display: "flex",
//         flexDirection: "column",
//         gap: { xs: 1.5, sm: 2, md: 2.5 },
//         pl: 0.5,
//         pr: { xs: 0.5, sm: 1 },
//         mx: "auto",
//       }}
//     >
//       {options.map((option, index) => (
//         <Button
//           key={index}
//           variant="contained"
//           onClick={() => onAnswerSelect(index)}
//           disabled={showFeedback && selectedAnswer !== index}
//           sx={{
//             width: "100%",
//             py: { xs: 1.8, sm: 2.5 },
//             px: { xs: 2, sm: 3 },
//             borderRadius: "12px",
//             fontSize: { xs: "0.95rem", sm: "1.1rem", md: "1.2rem" },
//             fontWeight: "normal",
//             textAlign: "left",
//             justifyContent: "flex-start",
//             position: "relative",
//             boxShadow: "0 4px 10px rgba(0, 0, 0, 0.15)",
//             transition: "all 0.2s ease-in-out",
//             overflow: "hidden",
//             mx: "auto",
//             backgroundColor: showFeedback
//               ? selectedAnswer === index
//                 ? isCorrectAnswer(index)
//                   ? "rgba(76, 175, 80, 0.75)"
//                   : "rgba(211, 47, 47, 0.75)"
//                 : isCorrectAnswer(index) && "rgba(76, 175, 80, 0.75)"
//               : selectedAnswer === index
//                 ? "#7e37a6" // Cor destacada para opção selecionada
//                 : "#9041c1",
//             "&:hover": {
//               backgroundColor: showFeedback
//                 ? selectedAnswer === index
//                   ? isCorrectAnswer(index)
//                     ? "rgba(76, 175, 80, 0.8)"
//                     : "rgba(211, 47, 47, 0.8)"
//                   : isCorrectAnswer(index) && "rgba(76, 175, 80, 0.8)"
//                 : "#7e37a6",
//               transform: !showFeedback && "translateY(-2px)",
//               boxShadow: !showFeedback && "0 6px 12px rgba(0, 0, 0, 0.2)",
//             },
//             // Adiciona um destaque visual para a opção selecionada
//             outline: selectedAnswer === index && !showFeedback
//               ? "2px solid white"
//               : "none",
//           }}
//         >
//           <Box
//             sx={{
//               display: "flex",
//               alignItems: "flex-start",
//               width: "100%",
//             }}
//           >
//             <Typography
//               component="span"
//               sx={{
//                 backgroundColor: "rgba(255, 255, 255, 0.2)",
//                 color: "#fff",
//                 width: 30,
//                 height: 30,
//                 borderRadius: "50%",
//                 display: "flex",
//                 alignItems: "center",
//                 justifyContent: "center",
//                 mr: 2,
//                 flexShrink: 0,
//                 mt: 0.3,
//                 fontWeight: "bold",
//                 fontSize: {
//                   xs: "0.95rem",
//                   sm: "1rem",
//                   md: "1.05rem",
//                 },
//               }}
//             >
//               {String.fromCharCode(65 + index)}
//             </Typography>
//             <Typography
//               component="span"
//               sx={{
//                 flex: 1,
//                 wordBreak: "break-word",
//                 overflowWrap: "break-word",
//                 whiteSpace: "normal",
//                 lineHeight: 1.5,
//                 maxWidth: "calc(100% - 50px)",
//                 hyphens: "auto",
//                 fontWeight: 500,
//                 letterSpacing: "0.2px",
//                 fontSize: {
//                   xs: "1rem",
//                   sm: "1.15rem",
//                   md: "1.25rem",
//                 },
//                 fontFamily:
//                   "'Poppins', 'Roboto', 'Helvetica', 'Arial', sans-serif",
//                 textShadow: "0px 1px 1px rgba(0,0,0,0.1)",
//               }}
//             >
//               {option}
//             </Typography>
//             {showFeedback && selectedAnswer === index && (
//               <Fade in={showFeedback}>
//                 {isCorrectAnswer(index) ? (
//                   <CheckCircleOutlineIcon
//                     sx={{
//                       color: "#fff",
//                       ml: 2,
//                       fontSize: 28,
//                       flexShrink: 0,
//                       mt: 0.3,
//                     }}
//                   />
//                 ) : (
//                   <CancelOutlinedIcon
//                     sx={{
//                       color: "#fff",
//                       ml: 2,
//                       fontSize: 28,
//                       flexShrink: 0,
//                       mt: 0.3,
//                     }}
//                   />
//                 )}
//               </Fade>
//             )}
//           </Box>
//         </Button>
//       ))}
//     </Box>
//   );
// };

// export default AnswerOptions;


import React, { useEffect, useState } from "react";
import { Box, Button, Typography, Fade } from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";

const AnswerOptions = ({
  options,
  selectedAnswer,
  showFeedback,
  onAnswerSelect,
  isCorrectAnswer,
  onSubmitAnswer,
}) => {
  const [lastKeyPressed, setLastKeyPressed] = useState(null);
  const [lastKeyTime, setLastKeyTime] = useState(0);
  const DOUBLE_PRESS_DELAY = 500;

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (showFeedback) return;

      const key = event.key.toLowerCase();
      const now = Date.now();

      if (/^[a-e]$/.test(key)) {
        event.preventDefault();
        const optionIndex = key.charCodeAt(0) - 'a'.charCodeAt(0);

        if (optionIndex >= 0 && optionIndex < options.length) {
          // const isSameKey = key === lastKeyPressed;
          // const isSameOption = selectedAnswer === optionIndex;
          // const isWithinDelay = (now - lastKeyTime) < DOUBLE_PRESS_DELAY;

          // if (isSameKey && isSameOption && isWithinDelay) {
          //   onSubmitAnswer && onSubmitAnswer();
          // } else {
          //   onAnswerSelect(optionIndex);
          // }

          setLastKeyPressed(key);
          setLastKeyTime(now);

          console.log(`Key pressed: ${key}, Option index: ${optionIndex}`);
        }
      } else if (key === 'enter' && selectedAnswer !== null) {
        event.preventDefault();
        onSubmitAnswer && onSubmitAnswer();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [options, selectedAnswer, showFeedback, lastKeyPressed, lastKeyTime, onAnswerSelect, onSubmitAnswer]);

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
      {options.map((option, index) => {
        const isSelected = selectedAnswer === index;
        const isCorrect = isCorrectAnswer(index);
        const showAsCorrect = showFeedback && isCorrect;
        const showAsWrong = showFeedback && isSelected && !isCorrect;

        const backgroundColor = showFeedback
          ? isSelected
            ? isCorrect
              ? "rgba(76, 175, 80, 0.75)"
              : "rgba(211, 47, 47, 0.75)"
            : isCorrect
              ? "rgba(76, 175, 80, 0.75)"
              : "#9041c1"
          : isSelected
            ? "#7e37a6"
            : "#9041c1";

        const hoverStyles = !showFeedback && {
          "&:hover": {
            backgroundColor: "#7e37a6",
            transform: "translateY(-2px)",
            boxShadow: "0 6px 12px rgba(0, 0, 0, 0.2)",
          },
        };

        return (
          <Button
            key={index}
            variant="contained"
            onClick={() => onAnswerSelect(index)}
            disabled={showFeedback && !isSelected}
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
              backgroundColor,
              outline: isSelected && !showFeedback ? "2px solid white" : "none",
              transform: isSelected && !showFeedback ? "translateY(-2px)" : "none",
              boxShadow: isSelected && !showFeedback ? "0 6px 12px rgba(0, 0, 0, 0.2)" : undefined,
              ...hoverStyles,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "flex-start", width: "100%" }}>
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
                  fontFamily: "'Poppins', 'Roboto', 'Helvetica', 'Arial', sans-serif",
                  textShadow: "0px 1px 1px rgba(0,0,0,0.1)",
                }}
              >
                {option}
              </Typography>

              {showFeedback && isSelected && (
                <Fade in={showFeedback}>
                  {isCorrect ? (
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
        );
      })}
    </Box>
  );
};

export default AnswerOptions;
