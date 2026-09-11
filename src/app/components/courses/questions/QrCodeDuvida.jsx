import PropTypes from "prop-types";
import { Box, IconButton, Typography, Tooltip, useMediaQuery } from "@mui/material";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import CloseFullscreenIcon from "@mui/icons-material/CloseFullscreen";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import { QRCodeSVG } from "qrcode.react";

// Tamanho do QR code nos modos de canto. O "grande" é o que aparece
// centralizado quando não há dúvida nenhuma em cartaz — ali o QR É o
// conteúdo da tela, por isso ganha o mesmo tratamento de destaque que a
// dúvida receberia. O modo 'huge' não tem tamanho fixo: ele preenche a tela
// via CSS (ver a própria renderização), porque "quase a tela toda" depende
// da janela, não de um valor único de pixel.
const QR_SIZE = { compact: 76, expanded: 200, grande: 220, grandeCelular: 170 };

// Ciclo do botão de ampliar: cada clique avança um degrau, e do topo volta
// para o início — não precisa de um segundo botão só para encolher.
const PROXIMO_MODO = { compact: "expanded", expanded: "huge", huge: "compact" };

/**
 * QR code que leva direto ao formulário de dúvida do vídeo em cartaz —
 * MESMO link "Link direto para o aluno registrar uma dúvida" da aba Dúvidas
 * (`buildStudentQuestionLink`), só que sempre visível na projeção, sem o
 * professor precisar sair da tela para divulgar. Gerado automaticamente: não
 * há botão "gerar QR code", ele já nasce pronto assim que existe um link.
 *
 * Quatro modos, controlados por quem chama: 'compact' (canto, discreto),
 * 'expanded' (canto, maior, para quem está longe da tela), 'huge' (cobre
 * quase a tela toda, por cima da dúvida em cartaz — para quando a fila
 * esvaziar, ou o professor achar que ninguém no fundo da sala está lendo o
 * QR pequeno) e 'hidden' (nada, com um pequeno botão para trazer de volta).
 * O mesmo estado também controla o QR grande do estado vazio (`big`), para o
 * professor não precisar escondê-lo de novo quando a última dúvida for
 * descartada — nesse caso 'huge' vira só "grande", sem cobrir a tela: sem
 * dúvida nenhuma em cartaz não há o que sobrepor, e a mensagem "nenhuma
 * dúvida" precisa continuar visível abaixo do QR.
 */
const QrCodeDuvida = ({ link, mode, onChangeMode, big }) => {
  const noCelular = useMediaQuery("(max-width:599.95px)");

  if (!link) return null;

  if (mode === "hidden") {
    return (
      <Tooltip title="Mostrar QR code de dúvidas">
        <IconButton
          onClick={() => onChangeMode("compact")}
          aria-label="Mostrar QR code de dúvidas"
          sx={
            big
              ? { color: "#fff", backgroundColor: "rgba(255,255,255,0.15)" }
              : {
                  position: "absolute",
                  top: { xs: 8, sm: 16 },
                  right: { xs: 8, sm: 16 },
                  zIndex: 5,
                  color: "#fff",
                  backgroundColor: "rgba(255,255,255,0.15)",
                  "&:hover": { backgroundColor: "rgba(255,255,255,0.28)" },
                }
          }
        >
          <QrCode2Icon />
        </IconButton>
      </Tooltip>
    );
  }

  // 'huge' só cobre a tela quando HÁ dúvida para sobrepor. No estado vazio
  // (`big`) ele cai no tratamento "grande" normal, junto de 'compact' e
  // 'expanded' — os três ficam idênticos ali, então nem oferecem o botão de
  // ampliar (só o de ocultar, mais abaixo).
  if (mode === "huge" && !big) {
    return (
      <Box
        sx={{
          position: "fixed",
          inset: 0,
          zIndex: 20,
          backgroundColor: "rgba(23, 0, 36, 0.88)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: { xs: 2, sm: 3 },
          p: 2,
        }}
      >
        <Box sx={{ display: "flex", gap: 0.5, position: "absolute", top: { xs: 8, sm: 16 }, right: { xs: 8, sm: 16 } }}>
          <Tooltip title="Reduzir QR code">
            <IconButton
              onClick={() => onChangeMode("compact")}
              aria-label="Reduzir QR code"
              sx={{
                color: "#fff",
                backgroundColor: "rgba(255,255,255,0.15)",
                "&:hover": { backgroundColor: "rgba(255,255,255,0.28)" },
              }}
            >
              <CloseFullscreenIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Ocultar QR code">
            <IconButton
              onClick={() => onChangeMode("hidden")}
              aria-label="Ocultar QR code"
              sx={{
                color: "#fff",
                backgroundColor: "rgba(255,255,255,0.15)",
                "&:hover": { backgroundColor: "rgba(255,255,255,0.28)" },
              }}
            >
              <VisibilityOffIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <Box
          sx={{
            backgroundColor: "#fff",
            borderRadius: 3,
            p: { xs: 2, sm: 3 },
            boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
            lineHeight: 0,
          }}
        >
          {/* Sem tamanho fixo: `aspect-ratio` mantém o quadrado e o `width`
              responde à janela — é o que faz "quase a tela toda" valer tanto
              num celular quanto num projetor bem maior. */}
          <Box sx={{ width: "min(78vw, 70vh, 620px)", aspectRatio: "1 / 1" }}>
            <QRCodeSVG value={link} size={640} style={{ width: "100%", height: "100%" }} />
          </Box>
        </Box>

        <Typography
          sx={{
            color: "#fff",
            opacity: 0.9,
            textAlign: "center",
            fontSize: "clamp(1rem, 2.6vw, 1.5rem)",
            maxWidth: 480,
          }}
        >
          Aponte a câmera do celular para registrar uma dúvida
        </Typography>
      </Box>
    );
  }

  // A partir daqui `mode` só pode ser 'compact' ou 'expanded' (o 'huge' sem
  // `big` já retornou acima, e o 'huge' com `big` cai no tratamento "grande").
  const tamanho = big ? (noCelular ? QR_SIZE.grandeCelular : QR_SIZE.grande) : QR_SIZE[mode];

  return (
    <Box
      sx={
        big
          ? { display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }
          : {
              position: "absolute",
              top: { xs: 8, sm: 16 },
              right: { xs: 8, sm: 16 },
              zIndex: 5,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 0.5,
            }
      }
    >
      {!big && (
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Tooltip title={mode === "expanded" ? "Ampliar ainda mais o QR code" : "Ampliar QR code"}>
            <IconButton
              size="small"
              onClick={() => onChangeMode(PROXIMO_MODO[mode])}
              aria-label={mode === "expanded" ? "Ampliar ainda mais o QR code" : "Ampliar QR code"}
              sx={{
                color: "#fff",
                backgroundColor: "rgba(255,255,255,0.15)",
                "&:hover": { backgroundColor: "rgba(255,255,255,0.28)" },
              }}
            >
              <OpenInFullIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Ocultar QR code">
            <IconButton
              size="small"
              onClick={() => onChangeMode("hidden")}
              aria-label="Ocultar QR code"
              sx={{
                color: "#fff",
                backgroundColor: "rgba(255,255,255,0.15)",
                "&:hover": { backgroundColor: "rgba(255,255,255,0.28)" },
              }}
            >
              <VisibilityOffIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      <Box
        sx={{
          backgroundColor: "#fff",
          borderRadius: 2,
          p: big || mode === "expanded" ? 1.5 : 1,
          lineHeight: 0,
          boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
        }}
      >
        <QRCodeSVG value={link} size={tamanho} />
      </Box>

      <Typography
        sx={{
          color: "#fff",
          opacity: 0.85,
          textAlign: big ? "center" : "right",
          fontSize: big ? "clamp(0.8rem, 1.6vw, 1rem)" : "0.7rem",
          maxWidth: big ? 320 : mode === "expanded" ? 200 : 90,
        }}
      >
        Aponte a câmera do celular para registrar uma dúvida
      </Typography>

      {big && (
        <Tooltip title="Ocultar QR code">
          <IconButton
            size="small"
            onClick={() => onChangeMode("hidden")}
            aria-label="Ocultar QR code"
            sx={{ color: "#fff", opacity: 0.85 }}
          >
            <VisibilityOffIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
};

QrCodeDuvida.propTypes = {
  link: PropTypes.string,
  mode: PropTypes.oneOf(["compact", "expanded", "huge", "hidden"]).isRequired,
  onChangeMode: PropTypes.func.isRequired,
  big: PropTypes.bool,
};

QrCodeDuvida.defaultProps = {
  link: "",
  big: false,
};

export default QrCodeDuvida;
