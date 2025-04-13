import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
} from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import MilitaryTechIcon from "@mui/icons-material/MilitaryTech";
import { keyframes } from "@mui/system";

const fadeIn = keyframes`
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
`;

const bounce = keyframes`
  0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-30px); }
  60% { transform: translateY(-15px); }
`;

const gentlePulse = keyframes`
  0% { transform: scale(1); opacity: 0.9; }
  50% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); opacity: 0.9; }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const CustomQuizRanking = ({ onBack, customResults }) => {
  const [showSecondPlace, setShowSecondPlace] = useState(false);
  const [showFirstPlace, setShowFirstPlace] = useState(false);
  const [showThirdPlace, setShowThirdPlace] = useState(false);
  const [showList, setShowList] = useState(false);

  const processarResultados = () => {
    if (!customResults) {
      return [];
    }

    const participantes = [];
    const contadorAlunos = {};

    if (customResults.results) {
      processarDados(customResults.results);
    } else if (customResults.correctAnswers) {
      processarDados(customResults.correctAnswers);
    } else if (customResults.answers) {
      processarDados(customResults.answers);
    } else {
      processarDados(customResults);
    }

    function processarDados(dados) {
      try {
        Object.entries(dados).forEach(([chave, valor]) => {
          if (typeof valor === "object" && valor !== null) {
            if (
              Object.values(valor).some(
                (item) => item && typeof item === "object"
              )
            ) {
              let acertos = 0;
              let nome = "Aluno";
              let photoURL = null;

              Object.values(valor).forEach((resposta) => {
                if (resposta) {
                  acertos++;
                  nome = resposta.studentName || resposta.student?.name || nome;
                  photoURL =
                    resposta.photoURL || resposta.student?.photoURL || photoURL;
                }
              });

              if (acertos > 0) {
                contadorAlunos[chave] = {
                  id: chave,
                  nome: nome,
                  photoURL: photoURL,
                  avatar: nome.charAt(0),
                  acertos: acertos,
                };
              }
            } else {
              const resposta = valor;
              const idAluno =
                resposta.studentId || resposta.student?.uid || chave;
              const nomeAluno =
                resposta.studentName || resposta.student?.name || "Aluno";
              const fotoAluno = resposta.photoURL || resposta.student?.photoURL;

              if (!contadorAlunos[idAluno]) {
                contadorAlunos[idAluno] = {
                  id: idAluno,
                  nome: nomeAluno,
                  photoURL: fotoAluno,
                  avatar: nomeAluno.charAt(0),
                  acertos: 0,
                };
              }
              contadorAlunos[idAluno].acertos += 1;
            }
          }
        });
      } catch (error) {
        // Silenciar erros em produção
      }
    }

    if (customResults.customQuestionResults) {
      processarDados(customResults.customQuestionResults);
    }

    Object.values(contadorAlunos).forEach((aluno) => {
      participantes.push(aluno);
    });

    if (participantes.length === 0) {
      return [
        {
          id: "example1",
          nome: "Exemplo 1",
          acertos: 5,
          avatar: "E",
          photoURL: null,
        },
        {
          id: "example2",
          nome: "Exemplo 2",
          acertos: 3,
          avatar: "E",
          photoURL: null,
        },
        {
          id: "example3",
          nome: "Exemplo 3",
          acertos: 2,
          avatar: "E",
          photoURL: null,
        },
      ];
    }

    return participantes.sort((a, b) => b.acertos - a.acertos);
  };

  const participantesOrdenados = processarResultados();
  const podio = participantesOrdenados.slice(0, 3);
  const demaisParticipantes = participantesOrdenados.slice(3);

  useEffect(() => {
    if (podio.length > 1) setTimeout(() => setShowSecondPlace(true), 1000);
    if (podio.length > 2) setTimeout(() => setShowThirdPlace(true), 2000);
    if (podio.length > 0) setTimeout(() => setShowFirstPlace(true), 3000);
    setTimeout(() => setShowList(true), 4500);
  }, [podio.length]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onBack && onBack();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onBack]);

  return (
    <Box
      sx={{
        width: "100%",
        position: "relative",
        overflowX: "hidden",
        overflowY: "auto",
        height: "auto",
        msOverflowStyle: "none",
        scrollbarWidth: "none",
        "&::-webkit-scrollbar": {
          display: "none",
        },
        ".MuiPaper-root": {
          msOverflowStyle: "none",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": {
            display: "none",
          },
        },
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          mt: 2,
          borderRadius: 2,
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          textAlign: "center",
          position: "relative",
          msOverflowStyle: "none",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": {
            display: "none",
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mb: 3,
            animation: `${bounce} 1.5s ease`,
          }}
        >
          <EmojiEventsIcon
            sx={{
              fontSize: 40,
              color: "#FFD700",
              mr: 1,
              animation: `${gentlePulse} 2s infinite ease-in-out`,
            }}
          />
          <Typography
            variant="h4"
            sx={{
              color: "#fff",
              fontWeight: 600,
              backgroundImage:
                "linear-gradient(90deg, rgba(255,255,255,0.5) 0%, rgba(255,215,0,1) 25%, rgba(255,255,255,0.8) 50%, rgba(255,215,0,1) 75%, rgba(255,255,255,0.5) 100%)",
              backgroundSize: "200% auto",
              color: "transparent",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              animation: `${shimmer} 5s linear infinite`,
            }}
          >
            Ranking do Quiz
          </Typography>
        </Box>

        {participantesOrdenados.length === 0 ? (
          <Typography variant="body1" sx={{ color: "#fff", my: 5 }}>
            Nenhum aluno acertou perguntas ainda. O ranking será atualizado
            automaticamente conforme os alunos responderem corretamente.
          </Typography>
        ) : (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              mb: 4,
              flexWrap: "wrap",
              position: "relative",
              minHeight: "220px",
              "& > *": {
                width: "120px",
                mx: { xs: 1, sm: 2 },
              },
            }}
          >
            {/* 2º Lugar */}
            {podio.length > 1 && (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  mt: 2,
                  order: 1,
                  opacity: 0,
                  animation: showSecondPlace
                    ? `${fadeIn} 0.8s ease forwards`
                    : "none",
                }}
              >
                <Avatar
                  src={podio[1].photoURL}
                  sx={{
                    width: 70,
                    height: 70,
                    bgcolor: "#C0C0C0",
                    mb: 1,
                    border: "2px solid #C0C0C0",
                    boxShadow: "0 0 15px rgba(192, 192, 192, 0.8)",
                  }}
                >
                  {podio[1].avatar}
                </Avatar>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: "rgba(192, 192, 192, 0.3)",
                    borderRadius: "12px",
                    px: 2,
                    py: 0.5,
                    backdropFilter: "blur(5px)",
                    width: "100%",
                    height: "32px",
                    overflow: "hidden",
                  }}
                >
                  <MilitaryTechIcon
                    sx={{
                      color: "#C0C0C0",
                      mr: 0.5,
                      minWidth: "16px",
                      fontSize: "16px",
                    }}
                  />
                  <Typography
                    variant="body2"
                    sx={{
                      color: "#fff",
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: "calc(100% - 20px)",
                    }}
                    title={podio[1].nome}
                  >
                    {podio[1].nome}
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  sx={{ color: "#C0C0C0", mt: 0.5, textAlign: "center" }}
                >
                  {podio[1].acertos}{" "}
                  {podio[1].acertos === 1 ? "acerto" : "acertos"}
                </Typography>
              </Box>
            )}

            {/* 1º Lugar */}
            {podio.length > 0 && (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  order: 0,
                  zIndex: 1,
                  opacity: 0,
                  animation: showFirstPlace
                    ? `${fadeIn} 1s ease forwards, ${bounce} 1s ease 1s`
                    : "none",
                }}
              >
                <Avatar
                  src={podio[0].photoURL}
                  sx={{
                    width: 90,
                    height: 90,
                    bgcolor: "#FFD700",
                    mb: 1,
                    border: "3px solid #FFD700",
                    boxShadow: "0 0 20px rgba(255, 215, 0, 0.9)",
                    animation: `${gentlePulse} 1.5s infinite ease-in-out`,
                  }}
                >
                  {podio[0].avatar}
                </Avatar>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: "rgba(255, 215, 0, 0.3)",
                    borderRadius: "12px",
                    px: 2,
                    py: 0.5,
                    backdropFilter: "blur(5px)",
                    position: "relative",
                    width: "100%",
                    height: "36px",
                    overflow: "hidden",
                  }}
                >
                  <MilitaryTechIcon
                    sx={{
                      color: "#FFD700",
                      mr: 0.5,
                      minWidth: "18px",
                      fontSize: "18px",
                    }}
                  />
                  <Typography
                    variant="body1"
                    sx={{
                      color: "#fff",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: "calc(100% - 22px)",
                    }}
                    title={podio[0].nome}
                  >
                    {podio[0].nome}
                  </Typography>
                </Box>
                <Typography
                  variant="body1"
                  sx={{
                    color: "#FFD700",
                    mt: 0.5,
                    fontWeight: 600,
                    textAlign: "center",
                  }}
                >
                  {podio[0].acertos}{" "}
                  {podio[0].acertos === 1 ? "acerto" : "acertos"}
                </Typography>
              </Box>
            )}

            {/* 3º Lugar */}
            {podio.length > 2 && (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  mt: 3,
                  order: 2,
                  opacity: 0,
                  animation: showThirdPlace
                    ? `${fadeIn} 0.8s ease forwards`
                    : "none",
                }}
              >
                <Avatar
                  src={podio[2].photoURL}
                  sx={{
                    width: 60,
                    height: 60,
                    bgcolor: "#CD7F32",
                    mb: 1,
                    border: "2px solid #CD7F32",
                    boxShadow: "0 0 10px rgba(205, 127, 50, 0.7)",
                  }}
                >
                  {podio[2].avatar}
                </Avatar>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: "rgba(205, 127, 50, 0.3)",
                    borderRadius: "12px",
                    px: 2,
                    py: 0.5,
                    backdropFilter: "blur(5px)",
                    width: "100%",
                    height: "32px",
                    overflow: "hidden",
                  }}
                >
                  <MilitaryTechIcon
                    sx={{
                      color: "#CD7F32",
                      mr: 0.5,
                      minWidth: "16px",
                      fontSize: "16px",
                    }}
                  />
                  <Typography
                    variant="body2"
                    sx={{
                      color: "#fff",
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: "calc(100% - 20px)",
                    }}
                    title={podio[2].nome}
                  >
                    {podio[2].nome}
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  sx={{ color: "#CD7F32", mt: 0.5, textAlign: "center" }}
                >
                  {podio[2].acertos}{" "}
                  {podio[2].acertos === 1 ? "acerto" : "acertos"}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {participantesOrdenados.length > 0 && (
          <>
            <Divider
              sx={{
                my: 3,
                bgcolor: "rgba(255, 255, 255, 0.2)",
                opacity: showList ? 1 : 0,
                transition: "opacity 0.5s ease",
              }}
            />
            <Box
              sx={{
                opacity: showList ? 1 : 0,
                transform: showList ? "translateY(0)" : "translateY(20px)",
                transition: "opacity 0.8s ease, transform 0.8s ease",
              }}
            >
              <Typography
                variant="h6"
                sx={{ color: "#fff", mb: 2, textAlign: "left" }}
              >
                Todos os Participantes
              </Typography>

              <List
                sx={{
                  bgcolor: "rgba(0, 0, 0, 0.2)",
                  borderRadius: 2,
                  mb: 2,
                  backdropFilter: "blur(5px)",
                  msOverflowStyle: "none",
                  scrollbarWidth: "none",
                  "&::-webkit-scrollbar": {
                    display: "none",
                  },
                }}
              >
                {participantesOrdenados.map((participante, index) => (
                  <React.Fragment key={participante.id}>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar
                          src={participante.photoURL}
                          sx={{
                            bgcolor:
                              index === 0
                                ? "#FFD700"
                                : index === 1
                                ? "#C0C0C0"
                                : index === 2
                                ? "#CD7F32"
                                : "rgba(255, 255, 255, 0.2)",
                          }}
                        >
                          {participante.avatar}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <Typography variant="body1" sx={{ color: "#fff" }}>
                              {participante.nome}
                            </Typography>
                            {index < 3 && (
                              <MilitaryTechIcon
                                sx={{
                                  ml: 1,
                                  fontSize: 18,
                                  color:
                                    index === 0
                                      ? "#FFD700"
                                      : index === 1
                                      ? "#C0C0C0"
                                      : index === 2
                                      ? "#CD7F32"
                                      : "transparent",
                                }}
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <Typography
                            variant="body2"
                            sx={{ color: "rgba(255, 255, 255, 0.7)" }}
                          >
                            {participante.acertos}{" "}
                            {participante.acertos === 1 ? "acerto" : "acertos"}
                          </Typography>
                        }
                      />
                      {index < 3 && (
                        <Typography
                          variant="body2"
                          sx={{
                            color: "#fff",
                            fontWeight: 600,
                            bgcolor:
                              index === 0
                                ? "rgba(255, 215, 0, 0.3)"
                                : index === 1
                                ? "rgba(192, 192, 192, 0.3)"
                                : "rgba(205, 127, 50, 0.3)",
                            borderRadius: "50%",
                            width: 28,
                            height: 28,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          #{index + 1}
                        </Typography>
                      )}
                    </ListItem>
                    {index < participantesOrdenados.length - 1 && (
                      <Divider
                        variant="inset"
                        component="li"
                        sx={{ bgcolor: "rgba(255, 255, 255, 0.1)" }}
                      />
                    )}
                  </React.Fragment>
                ))}
              </List>
            </Box>
          </>
        )}

        <Typography
          variant="caption"
          sx={{
            display: "block",
            color: "rgba(255,255,255,0.7)",
            mt: 3,
            opacity: showList ? 1 : 0,
            transition: "opacity 1s ease",
          }}
        >
          Pressione ESC para voltar à pergunta personalizada
        </Typography>
      </Paper>
    </Box>
  );
};

export default CustomQuizRanking;
