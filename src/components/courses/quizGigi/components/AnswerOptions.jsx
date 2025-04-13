import React, { useEffect, useState, useRef } from "react";
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
  const [highlightedOption, setHighlightedOption] = useState(null); // Para pré-seleção
  const containerRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (showFeedback) return;

      const key = event.key.toLowerCase();

      if (/^[a-e]$/.test(key)) {
        event.preventDefault();
        const optionIndex = key.charCodeAt(0) - 'a'.charCodeAt(0);

        if (optionIndex >= 0 && optionIndex < options.length) {
          // Se a mesma tecla for pressionada duas vezes consecutivas
          if (key === lastKeyPressed && highlightedOption === optionIndex) {
            // Primeiro realmente selecionar a opção
            onAnswerSelect(optionIndex);
            // Depois submeter a resposta
            onSubmitAnswer && onSubmitAnswer();
          } else {
            // Apenas pré-seleciona (mostra o hover)
            setHighlightedOption(optionIndex);
          }

          setLastKeyPressed(key);
        }
      } else if (key === 'enter' && highlightedOption !== null) {
        event.preventDefault();
        // Quando Enter é pressionado com uma opção pré-selecionada
        onAnswerSelect(highlightedOption);
        onSubmitAnswer && onSubmitAnswer();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [options, showFeedback, lastKeyPressed, highlightedOption, onAnswerSelect, onSubmitAnswer]);

  // Limpar a pré-seleção quando o feedback é mostrado ou a pergunta muda
  useEffect(() => {
    setHighlightedOption(null);
  }, [showFeedback, options]);

  // Limpar a pré-seleção quando o usuário clica fora das opções
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setHighlightedOption(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <Box
      ref={containerRef}
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
        const isHighlighted = highlightedOption === index;
        const isCorrect = isCorrectAnswer(index);

        // Determinar cor de fundo com base no estado
        const backgroundColor = showFeedback
          ? isSelected
            ? isCorrect
              ? "rgba(76, 175, 80, 0.75)" // Selecionada correta
              : "rgba(211, 47, 47, 0.75)" // Selecionada incorreta
            : isCorrect
              ? "rgba(76, 175, 80, 0.75)" // Não selecionada mas correta
              : "#9041c1"                  // Não selecionada e não correta
          : isHighlighted
            ? "#7e37a6"                    // Pré-selecionada (estilo hover)
            : "#9041c1";                   // Normal

        // Estilos de hover
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
            onClick={() => {
              // Quando clicado, funciona normalmente selecionando a opção
              onAnswerSelect(index);
            }}
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
              alignItems: "center",
              position: "relative",
              boxShadow: "0 4px 10px rgba(0, 0, 0, 0.15)",
              transition: "all 0.2s ease-in-out",
              overflow: "hidden",
              mx: "auto",
              backgroundColor,

              // Aplicar efeito de hover para opção pré-selecionada (via teclado)
              transform: isHighlighted && !showFeedback ? "translateY(-2px)" : "none",
              boxShadow: isHighlighted && !showFeedback ? "0 6px 12px rgba(0, 0, 0, 0.2)" : undefined,

              // Mostrar outline apenas para seleção real, não para pré-seleção
              outline: isSelected && !showFeedback ? "2px solid white" : "none",
              ...hoverStyles,
            }}
          >
            {/* O conteúdo do botão permanece o mesmo */}
            <Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>
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
                  fontWeight: "bold",
                  fontSize: {
                    xs: "1.2rem",
                    sm: "1.35rem",
                    md: "1.45rem",
                  },
                  fontFamily: "'Poppins', 'Roboto', 'Helvetica', 'Arial', sans-serif",
                  textShadow: "0px 1px 1px rgba(0,0,0,0.1)",
                  letterSpacing: "0",
                  textTransform: "none",
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
                      }}
                    />
                  ) : (
                    <CancelOutlinedIcon
                      sx={{
                        color: "#fff",
                        ml: 2,
                        fontSize: 28,
                        flexShrink: 0,
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


// import React, { useEffect, useState } from "react";
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
//   const DOUBLE_PRESS_DELAY = 500;

//   useEffect(() => {
//     const handleKeyDown = (event) => {
//       if (showFeedback) return;

//       const key = event.key.toLowerCase();
//       const now = Date.now();

//       if (/^[a-e]$/.test(key)) {
//         event.preventDefault();
//         const optionIndex = key.charCodeAt(0) - 'a'.charCodeAt(0);

//         if (optionIndex >= 0 && optionIndex < options.length) {
//           // const isSameKey = key === lastKeyPressed;
//           // const isSameOption = selectedAnswer === optionIndex;
//           // const isWithinDelay = (now - lastKeyTime) < DOUBLE_PRESS_DELAY;

//           // if (isSameKey && isSameOption && isWithinDelay) {
//           //   onSubmitAnswer && onSubmitAnswer();
//           // } else {
//           //   onAnswerSelect(optionIndex);
//           // }

//           setLastKeyPressed(key);
//           setLastKeyTime(now);

//           console.log(`Key pressed: ${key}, Option index: ${optionIndex}`);
//         }
//       } else if (key === 'enter' && selectedAnswer !== null) {
//         event.preventDefault();
//         onSubmitAnswer && onSubmitAnswer();
//       }
//     };

//     window.addEventListener('keydown', handleKeyDown);
//     return () => window.removeEventListener('keydown', handleKeyDown);
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
//       {options.map((option, index) => {
//         const isSelected = selectedAnswer === index;
//         const isCorrect = isCorrectAnswer(index);
//         const showAsCorrect = showFeedback && isCorrect;
//         const showAsWrong = showFeedback && isSelected && !isCorrect;

//         const backgroundColor = showFeedback
//           ? isSelected
//             ? isCorrect
//               ? "rgba(76, 175, 80, 0.75)"
//               : "rgba(211, 47, 47, 0.75)"
//             : isCorrect
//               ? "rgba(76, 175, 80, 0.75)"
//               : "#9041c1"
//           : isSelected
//             ? "#7e37a6"
//             : "#9041c1";

//         const hoverStyles = !showFeedback && {
//           "&:hover": {
//             backgroundColor: "#7e37a6",
//             transform: "translateY(-2px)",
//             boxShadow: "0 6px 12px rgba(0, 0, 0, 0.2)",
//           },
//         };

//         return (
//           <Button
//             key={index}
//             variant="contained"
//             onClick={() => onAnswerSelect(index)}
//             disabled={showFeedback && !isSelected}
//             sx={{
//               width: "100%",
//               py: { xs: 1.8, sm: 2.5 },
//               px: { xs: 2, sm: 3 },
//               borderRadius: "12px",
//               fontSize: { xs: "0.95rem", sm: "1.1rem", md: "1.2rem" },
//               fontWeight: "normal",
//               textAlign: "left",
//               justifyContent: "flex-start",
//               alignItems: "center", // Ensure vertical alignment
//               position: "relative",
//               boxShadow: "0 4px 10px rgba(0, 0, 0, 0.15)",
//               transition: "all 0.2s ease-in-out",
//               overflow: "hidden",
//               mx: "auto",
//               backgroundColor,
//               outline: isSelected && !showFeedback ? "2px solid white" : "none",
//               transform: isSelected && !showFeedback ? "translateY(-2px)" : "none",
//               boxShadow: isSelected && !showFeedback ? "0 6px 12px rgba(0, 0, 0, 0.2)" : undefined,
//               ...hoverStyles,
//             }}
//           >
//             <Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>
//               <Typography
//                 component="span"
//                 sx={{
//                   backgroundColor: "rgba(255, 255, 255, 0.2)",
//                   color: "#fff",
//                   width: 30,
//                   height: 30,
//                   borderRadius: "50%",
//                   display: "flex",
//                   alignItems: "center",
//                   justifyContent: "center",
//                   mr: 2,
//                   flexShrink: 0,
//                   fontWeight: "bold",
//                   fontSize: {
//                     xs: "0.95rem",
//                     sm: "1rem",
//                     md: "1.05rem",
//                   },
//                 }}
//               >
//                 {String.fromCharCode(65 + index)}
//               </Typography>

//               <Typography
//                 component="span"
//                 sx={{
//                   flex: 1,
//                   wordBreak: "break-word",
//                   overflowWrap: "break-word",
//                   whiteSpace: "normal",
//                   lineHeight: 1.5,
//                   maxWidth: "calc(100% - 50px)",
//                   hyphens: "auto",
//                   // Alterando o estilo da fonte para ficar semelhante à pergunta
//                   fontWeight: "bold",
//                   fontSize: {
//                     xs: "1.2rem",
//                     sm: "1.35rem",
//                     md: "1.45rem",
//                   },
//                   fontFamily: "'Poppins', 'Roboto', 'Helvetica', 'Arial', sans-serif",
//                   textShadow: "0px 1px 1px rgba(0,0,0,0.1)",
//                   // Removendo o letterSpacing para ficar mais natural
//                   letterSpacing: "0",
//                   // Garantindo que o texto mantenha o case original (não force maiúsculas)
//                   textTransform: "none",
//                 }}
//               >
//                 {option}
//               </Typography>

//               {showFeedback && isSelected && (
//                 <Fade in={showFeedback}>
//                   {isCorrect ? (
//                     <CheckCircleOutlineIcon
//                       sx={{
//                         color: "#fff",
//                         ml: 2,
//                         fontSize: 28,
//                         flexShrink: 0,
//                       }}
//                     />
//                   ) : (
//                     <CancelOutlinedIcon
//                       sx={{
//                         color: "#fff",
//                         ml: 2,
//                         fontSize: 28,
//                         flexShrink: 0,
//                       }}
//                     />
//                   )}
//                 </Fade>
//               )}
//             </Box>
//           </Button>
//         );
//       })}
//     </Box>
//   );
// };

// export default AnswerOptions;
