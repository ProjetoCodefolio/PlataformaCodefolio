import React, { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import {
  Box,
  IconButton,
  Typography,
  Chip,
  Button,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  FormControlLabel,
  Switch,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import logo from "$assets/img/codefolio.png";
import { filterCourseQuestions } from "$api/services/courses/questions";

/**
 * Tela de apresentação das dúvidas dos alunos, no mesmo formato do Quiz Gigi:
 * tela cheia, uma dúvida por vez, navegação por setas (mouse ou teclado).
 *
 * É a ÚNICA tela de apresentação do sistema — tanto o ícone "?" do player quanto
 * o botão "Apresentar" da aba Dúvidas levam à mesma rota, que renderiza isto.
 *
 * Diferença essencial para o Quiz Gigi: aqui NÃO há certo/errado, sorteio nem
 * pontuação — é material para o professor discutir oralmente. E a autoria NUNCA
 * é exibida, nem para o professor: quem perguntou aparece só na aba "Dúvidas".
 *
 * O recorte é escolhido aqui dentro (seletor de vídeo + chave das já discutidas),
 * e não por quem abriu a tela: em aula o professor muda de assunto sem sair da
 * projeção. Quem abre só define o ponto de partida (`initialContentId`).
 *
 * LAYOUT em três zonas verticais, sem posicionamento absoluto com medidas
 * fixas — a tela vai de um celular a um projetor:
 *   - topo: cabeçalho, curso e filtros, ancorados logo abaixo do logo;
 *   - meio: a dúvida com as setas e o vídeo de origem, centrada no que sobra;
 *   - baixo: paginação e a ação, numa linha só, descolada da borda inferior.
 * A dúvida usa `clamp()` para ocupar o máximo possível sem estourar a área.
 */

/**
 * Tamanho da dúvida em função do comprimento do texto: uma pergunta curta ganha
 * a tela inteira (é o que vai ser lido de longe), uma longa encolhe para caber
 * sem virar um bloco ilegível.
 */
const tamanhoDaDuvida = (texto = "") => {
  const tamanho = texto.length;
  if (tamanho <= 120) return "clamp(1.9rem, 5vw, 3.6rem)";
  if (tamanho <= 300) return "clamp(1.5rem, 3.6vw, 2.6rem)";
  return "clamp(1.1rem, 2.4vw, 1.9rem)";
};

const QuestionsPresenter = ({
  questions,
  contentOptions,
  initialContentId,
  courseTitle,
  onClose,
  onMarkDiscussed,
}) => {
  // O recorte inicial só vale se aquele vídeo realmente tiver dúvidas: o ícone
  // "?" manda o conteúdo que está em tela, que pode não ter nenhuma. Nesse caso
  // o seletor cai em "Todas as dúvidas" — visível na própria tela — em vez de
  // ficar com um valor sem opção correspondente.
  const [contentId, setContentId] = useState(() =>
    contentOptions.some((option) => option.contentId === initialContentId)
      ? initialContentId
      : ""
  );
  const [includeDiscussed, setIncludeDiscussed] = useState(false);
  const [index, setIndex] = useState(0);

  const visiveis = useMemo(
    () =>
      filterCourseQuestions(questions, {
        contentId,
        onlyPending: !includeDiscussed,
      }),
    [questions, contentId, includeDiscussed]
  );

  const total = visiveis.length;

  // A lista muda de tamanho ao trocar o filtro ou ao marcar uma dúvida como
  // discutida. Sem reencaixar o índice, a tela ficaria vazia com dúvidas ainda
  // por discutir.
  useEffect(() => {
    setIndex((atual) => (total === 0 ? 0 : Math.min(atual, total - 1)));
  }, [total]);

  const irPara = useCallback(
    (proximo) => {
      if (proximo < 0 || proximo > total - 1) return;
      setIndex(proximo);
    },
    [total]
  );

  useEffect(() => {
    const handleKeyDown = (event) => {
      // As setas navegam entre dúvidas, mas não enquanto o professor está
      // dentro do seletor de vídeo escolhendo uma opção.
      const emCampo = ["INPUT", "TEXTAREA"].includes(event.target?.tagName);
      if (event.key === "Escape") onClose();
      else if (emCampo) return;
      else if (event.key === "ArrowLeft") irPara(index - 1);
      else if (event.key === "ArrowRight") irPara(index + 1);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [index, irPara, onClose]);

  // Trava a rolagem do fundo enquanto a apresentação está aberta, como o Quiz Gigi.
  useEffect(() => {
    const overflowOriginal = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflowOriginal || "";
    };
  }, []);

  const atual = visiveis[index];

  const totalGeral = questions.length;
  const totalDiscutidas = questions.filter((q) => q?.discussed).length;

  const setaSx = (visivel) => ({
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    color: "#fff",
    "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.32)" },
    width: { xs: 36, sm: 44, md: 52 },
    height: { xs: 36, sm: 44, md: 52 },
    visibility: visivel ? "visible" : "hidden",
    zIndex: 2,
    boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
  });

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        backgroundColor: "#700cac",
        backgroundImage: "linear-gradient(135deg, #700cac 0%, #9041c1 100%)",
        display: "flex",
        flexDirection: "column",
        color: "#fff",
        zIndex: 1399,
        px: { xs: 1.5, sm: 3 },
        py: { xs: 1.5, sm: 2 },
        overflow: "hidden",
      }}
    >
      {/* Cabeçalho: fechar à esquerda, logo centralizado. O espaçador à direita
          tem a largura do botão para o logo cair no meio de verdade. */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <IconButton onClick={onClose} aria-label="Fechar apresentação" sx={{ color: "#fff" }}>
          <CloseIcon fontSize="large" />
        </IconButton>
        <img
          src={logo}
          alt="Codefolio"
          style={{ height: "clamp(28px, 4vh, 44px)", objectFit: "contain" }}
        />
        <Box sx={{ width: 48, flexShrink: 0 }} />
      </Box>

      <Typography
        variant="body2"
        sx={{
          textAlign: "center",
          opacity: 0.85,
          flexShrink: 0,
          mt: { xs: 0.5, sm: 1 },
          fontSize: "clamp(0.75rem, 1.5vw, 1rem)",
        }}
      >
        {courseTitle}
      </Typography>

      {/* Controles do recorte: ficam na própria tela para o professor mudar de
          assunto no meio da aula sem sair da projeção. Continuam visíveis mesmo
          quando o recorte não tem nenhuma dúvida — é por aqui que ele sai de lá. */}
      <Box
        sx={{
          display: "flex",
          gap: { xs: 1, sm: 2 },
          alignItems: "center",
          justifyContent: "center",
          flexWrap: "wrap",
          flexShrink: 0,
          mt: { xs: 1, sm: 1.5 },
        }}
      >
        <FormControl size="small" sx={{ minWidth: { xs: 200, sm: 300, md: 380 } }}>
          <Select
            value={contentId}
            onChange={(e) => {
              setContentId(e.target.value);
              setIndex(0);
            }}
            displayEmpty
            inputProps={{ "aria-label": "Filtrar dúvidas por vídeo" }}
            // A tela cheia vive em z-index 1399 e o menu do MUI nasce em 1300:
            // sem subir o menu, ele abre ATRÁS da apresentação e o professor
            // clica no seletor sem ver opção nenhuma. Mesmo valor que o Quiz
            // Gigi usa nos seus popups.
            MenuProps={{ sx: { zIndex: 1500 } }}
            sx={{
              color: "#fff",
              backgroundColor: "rgba(255,255,255,0.15)",
              borderRadius: 2,
              fontSize: "clamp(0.8rem, 1.4vw, 1rem)",
              "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.5)" },
              "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#fff" },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#fff" },
              "& .MuiSvgIcon-root": { color: "#fff" },
            }}
          >
            <MenuItem value="">Todas as dúvidas ({totalGeral})</MenuItem>
            {contentOptions.map((option) => (
              <MenuItem key={option.contentId} value={option.contentId}>
                {option.contentTitle} ({option.total})
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControlLabel
          control={
            <Switch
              checked={includeDiscussed}
              onChange={(e) => {
                setIncludeDiscussed(e.target.checked);
                setIndex(0);
              }}
              sx={{
                "& .MuiSwitch-switchBase.Mui-checked": { color: "#fff" },
                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                  backgroundColor: "#fff",
                },
              }}
            />
          }
          label={`Incluir já discutidas (+${totalDiscutidas})`}
          sx={{
            mr: 0,
            "& .MuiFormControlLabel-label": {
              color: "#fff",
              fontSize: "clamp(0.75rem, 1.2vw, 0.95rem)",
            },
          }}
        />
      </Box>

      {/* Meio: a dúvida em cartaz. É a única faixa que cresce, então ela centra
          o que sobra entre os filtros e a linha de baixo. As setas ficam nas
          bordas da ÁREA DE LEITURA (não da janela), senão num monitor largo
          ficariam a meio metro do texto. */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Box
          sx={{
            position: "relative",
            width: "100%",
            maxWidth: "1300px",
            maxHeight: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <IconButton
            onClick={() => irPara(index - 1)}
            aria-label="Dúvida anterior"
            sx={{ ...setaSx(index > 0), left: 0 }}
          >
            <ArrowBackIosNewIcon sx={{ fontSize: "clamp(1rem, 1.8vw, 1.4rem)" }} />
          </IconButton>

          <Box
            sx={{
              width: "100%",
              maxWidth: "1100px",
              maxHeight: "100%",
              overflowY: "auto",
              textAlign: "center",
              px: { xs: 5.5, sm: 8, md: 10 },
              py: 1,
            }}
          >
            {total === 0 ? (
              <Typography sx={{ fontSize: "clamp(1.1rem, 2.4vw, 1.6rem)", opacity: 0.95 }}>
                {totalGeral === 0
                  ? "Nenhuma dúvida registrada neste curso ainda."
                  : "Nenhuma dúvida por discutir neste recorte."}
              </Typography>
            ) : (
              <>
                <Typography
                  component="p"
                  sx={{
                    fontWeight: 700,
                    fontSize: tamanhoDaDuvida(atual?.text),
                    lineHeight: 1.35,
                    textShadow: "0px 2px 6px rgba(0,0,0,0.25)",
                    wordBreak: "break-word",
                    overflowWrap: "break-word",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {atual?.text}
                </Typography>

                <Box
                  sx={{
                    width: { xs: "60px", sm: "80px" },
                    height: "4px",
                    backgroundColor: "#fff",
                    borderRadius: "2px",
                    mx: "auto",
                    my: { xs: 2, sm: 3 },
                  }}
                />

                <Typography
                  sx={{ opacity: 0.85, fontSize: "clamp(0.75rem, 1.4vw, 1rem)" }}
                >
                  {atual?.contentTitle}
                </Typography>
              </>
            )}
          </Box>

          <IconButton
            onClick={() => irPara(index + 1)}
            aria-label="Próxima dúvida"
            sx={{ ...setaSx(index < total - 1), right: 0 }}
          >
            <ArrowForwardIosIcon sx={{ fontSize: "clamp(1rem, 1.8vw, 1.4rem)" }} />
          </IconButton>
        </Box>
      </Box>

      {/* Baixo: posição na lista e a ação sobre a dúvida em tela, na MESMA linha.
          Fica afastada da borda inferior — encostada embaixo ela some do campo de
          visão de quem assiste à projeção. */}
      {total > 0 && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: { xs: 1.5, sm: 3 },
            flexShrink: 0,
            mb: { xs: 2, sm: 4 },
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography sx={{ opacity: 0.85, fontSize: "clamp(0.75rem, 1.3vw, 0.95rem)" }}>
              Dúvida {index + 1} de {total}
            </Typography>
            {atual?.discussed && (
              <Chip
                label="Já discutida"
                size="small"
                sx={{ color: "#fff", backgroundColor: "rgba(255,255,255,0.25)" }}
              />
            )}
          </Box>

          {!atual?.discussed && (
            <Tooltip title="Sai desta apresentação e fica registrada como discutida na aba Dúvidas">
              <Button
                variant="contained"
                startIcon={<CheckCircleIcon />}
                onClick={() => onMarkDiscussed(atual)}
                sx={{
                  backgroundColor: "rgba(255,255,255,0.9)",
                  color: "#700cac",
                  fontWeight: "bold",
                  fontSize: "clamp(0.75rem, 1.2vw, 0.9rem)",
                  "&:hover": { backgroundColor: "#fff" },
                }}
              >
                Marcar como discutida
              </Button>
            </Tooltip>
          )}
        </Box>
      )}
    </Box>
  );
};

QuestionsPresenter.propTypes = {
  /** Todas as dúvidas do curso; o recorte é feito aqui dentro. */
  questions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      text: PropTypes.string,
      contentId: PropTypes.string,
      contentTitle: PropTypes.string,
      discussed: PropTypes.bool,
    })
  ),
  contentOptions: PropTypes.arrayOf(
    PropTypes.shape({
      contentId: PropTypes.string,
      contentTitle: PropTypes.string,
      total: PropTypes.number,
    })
  ),
  initialContentId: PropTypes.string,
  courseTitle: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onMarkDiscussed: PropTypes.func.isRequired,
};

QuestionsPresenter.defaultProps = {
  questions: [],
  contentOptions: [],
  initialContentId: "",
  courseTitle: "Dúvidas da turma",
};

export default QuestionsPresenter;
