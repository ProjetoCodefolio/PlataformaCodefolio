import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import {
  Box,
  IconButton,
  Typography,
  Chip,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  FormControlLabel,
  Switch,
  TextField,
  Modal,
  Button,
  useMediaQuery,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeleteIcon from "@mui/icons-material/Delete";
import TextIncreaseIcon from "@mui/icons-material/TextIncrease";
import TextDecreaseIcon from "@mui/icons-material/TextDecrease";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import CloseFullscreenIcon from "@mui/icons-material/CloseFullscreen";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import { QRCodeSVG } from "qrcode.react";
import logo from "$assets/img/codefolio.png";
import { filterCourseQuestions, buildStudentQuestionLink } from "$api/services/courses/questions";

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
 * A lista chega AO VIVO: dúvidas entram enquanto a tela está aberta. A ordem é
 * da mais antiga para a mais nova — uma fila —, então uma dúvida nova entra no
 * FINAL da lista, sem empurrar as outras. Mesmo assim a dúvida em cartaz é
 * ancorada pelo ID, e não pela posição: marcar uma dúvida do meio como
 * discutida (ou excluí-la) tira ela da lista e desloca as que vêm depois, e
 * ancorar pela posição trocaria o texto projetado no meio da explicação.
 *
 * LAYOUT em três zonas verticais, sem posicionamento absoluto com medidas
 * fixas — a tela vai de um celular a um projetor:
 *   - topo: cabeçalho, curso e filtros, ancorados logo abaixo do logo;
 *   - meio: a dúvida com as setas, centrada no que sobra;
 *   - baixo: paginação e a ação, numa linha só, descolada da borda inferior.
 * A dúvida usa `clamp()` para ocupar o máximo possível sem estourar a área.
 */

/**
 * Tamanho AUTOMÁTICO da dúvida em função do comprimento do texto: uma pergunta
 * curta ganha a tela inteira (é o que vai ser lido de longe), uma longa encolhe
 * para caber sem virar um bloco ilegível.
 */
const tamanhoDaDuvida = (texto = "") => {
  const tamanho = texto.length;
  if (tamanho <= 120) return "clamp(1.9rem, 5vw, 3.6rem)";
  if (tamanho <= 300) return "clamp(1.5rem, 3.6vw, 2.6rem)";
  return "clamp(1.1rem, 2.4vw, 1.9rem)";
};

// Ajuste manual da fonte, POR CIMA do tamanho automático: o automático acerta a
// proporção entre dúvidas, mas não sabe o tamanho da sala nem a distância do
// projetor. Por isso o botão multiplica o valor calculado (em vez de fixar um
// tamanho) — assim uma dúvida longa continua menor que uma curta em qualquer
// ajuste, e nenhuma delas estoura a área de leitura.
const ESCALA_MINIMA = 0.6;
const ESCALA_MAXIMA = 2.4;
const PASSO_DA_ESCALA = 0.02;
const CHAVE_DA_ESCALA = "codefolio:duvidas:escalaDaFonte";

const arredondarEscala = (valor) => Math.round(valor * 100) / 100;

const limitarEscala = (valor) =>
  arredondarEscala(Math.min(ESCALA_MAXIMA, Math.max(ESCALA_MINIMA, valor)));

const persistirEscala = (valor) => {
  try {
    window.localStorage.setItem(CHAVE_DA_ESCALA, String(valor));
  } catch {
    // Sem armazenamento o ajuste continua valendo nesta sessão.
  }
};

/**
 * A escala escolhida fica no localStorage: o professor a ajusta uma vez para a
 * sala dele e ela sobrevive ao recarregar a página e à aula seguinte — ninguém
 * quer reconfigurar a projeção toda vez que abre a tela.
 */
const lerEscalaSalva = () => {
  try {
    const salva = Number(window.localStorage.getItem(CHAVE_DA_ESCALA));
    if (!Number.isFinite(salva) || salva <= 0) return 1;
    return arredondarEscala(Math.min(ESCALA_MAXIMA, Math.max(ESCALA_MINIMA, salva)));
  } catch {
    // Navegador com armazenamento bloqueado: segue no tamanho automático.
    return 1;
  }
};

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

const QuestionsPresenter = ({
  questions,
  contentOptions,
  initialContentId,
  courseTitle,
  courseId,
  alias,
  onClose,
  onMarkDiscussed,
  onDeleteQuestion,
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
  const [fontScale, setFontScale] = useState(lerEscalaSalva);
  // 'compact' | 'expanded' | 'huge' | 'hidden' — o mesmo modo vale tanto para
  // o QR do canto (com dúvidas em cartaz) quanto para o QR grande do estado
  // vazio.
  const [qrMode, setQrMode] = useState("compact");
  // Lista lateral de dúvidas: fechada por padrão, o professor abre quando
  // quiser pular direto para uma dúvida específica em vez de navegar uma a
  // uma pelas setas.
  const [listaAberta, setListaAberta] = useState(false);
  // Dúvida com exclusão pendente de confirmação, escolhida na lista lateral.
  const [duvidaParaExcluir, setDuvidaParaExcluir] = useState(null);

  // No celular os controles não cabem numa linha só. Em vez de deixá-los
  // quebrar em três linhas — que comem a altura da dúvida, o que a tela existe
  // para mostrar —, o seletor ocupa a primeira linha inteira e o rótulo da
  // chave encurta, para a chave e os botões de fonte dividirem a segunda.
  const noCelular = useMediaQuery("(max-width:599.95px)");

  const visiveis = useMemo(
    () =>
      filterCourseQuestions(questions, {
        contentId,
        onlyPending: !includeDiscussed,
      }),
    [questions, contentId, includeDiscussed]
  );

  const total = visiveis.length;

  // Mesmo link "para copiar" da aba Dúvidas, mas seguindo o recorte de vídeo
  // escolhido AQUI dentro — o professor troca de assunto na projeção e o QR
  // acompanha, sem precisar voltar para a aba para gerar um link novo.
  const studentLink = useMemo(
    () => buildStudentQuestionLink(courseId, { alias, contentId }),
    [courseId, alias, contentId]
  );

  // Id da dúvida em cartaz: é a âncora que sobrevive à reordenação da lista ao
  // vivo. Fica num ref (e não em estado) porque quem manda na tela continua
  // sendo o índice — o ref só diz "era esta aqui" quando a lista se mexe.
  const idEmCartazRef = useRef(null);

  // Reencaixa o índice sempre que a lista muda: por dúvida nova chegando, por
  // troca de filtro ou por uma dúvida ter sido marcada como discutida.
  //  - a dúvida em cartaz ainda está na lista → segue nela, na posição nova;
  //  - saiu da lista (discutida, excluída ou fora do filtro) → fica na MESMA
  //    posição, que agora é a dúvida seguinte, e não numa tela vazia.
  useEffect(() => {
    setIndex((atual) => {
      const ancora = idEmCartazRef.current;
      const posicao = ancora
        ? visiveis.findIndex((duvida) => duvida?.id === ancora)
        : -1;
      const proximo =
        posicao >= 0 ? posicao : total === 0 ? 0 : Math.min(atual, total - 1);
      idEmCartazRef.current = visiveis[proximo]?.id || null;
      return proximo;
    });
  }, [visiveis, total]);

  // Trocar o recorte recomeça do início: ali o professor mudou de assunto, e
  // manter a âncora o levaria de volta a uma dúvida do assunto anterior.
  const trocarRecorte = useCallback((aplicar) => {
    idEmCartazRef.current = null;
    setIndex(0);
    aplicar();
  }, []);

  const ajustarEscala = useCallback((delta) => {
    setFontScale((atual) => {
      const proxima = limitarEscala(atual + delta);
      persistirEscala(proxima);
      return proxima;
    });
  }, []);

  // Aplica um valor DIGITADO pelo professor (campo de porcentagem), em vez de
  // um passo relativo ao atual — por isso não usa a forma funcional de
  // `setFontScale` como o +/-.
  const definirEscala = useCallback((valor) => {
    if (!Number.isFinite(valor)) return;
    const proxima = limitarEscala(valor);
    persistirEscala(proxima);
    setFontScale(proxima);
  }, []);

  // Buffer do campo de porcentagem: só sincroniza com `fontScale` quando ela
  // muda por outro caminho (+/-, teclado). Como digitar não altera `fontScale`
  // até o campo perder o foco, o professor pode apagar e reescrever sem o
  // valor ser sobrescrito no meio da digitação.
  const [escalaTexto, setEscalaTexto] = useState(() => String(Math.round(fontScale * 100)));
  useEffect(() => {
    setEscalaTexto(String(Math.round(fontScale * 100)));
  }, [fontScale]);

  const irPara = useCallback(
    (proximo) => {
      if (proximo < 0 || proximo > total - 1) return;
      idEmCartazRef.current = visiveis[proximo]?.id || null;
      setIndex(proximo);
    },
    [total, visiveis]
  );

  const confirmarExclusao = useCallback(async () => {
    if (!duvidaParaExcluir) return;
    await onDeleteQuestion(duvidaParaExcluir);
    setDuvidaParaExcluir(null);
  }, [duvidaParaExcluir, onDeleteQuestion]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      // As setas navegam entre dúvidas, mas não enquanto o professor está
      // dentro do seletor de vídeo escolhendo uma opção.
      const emCampo = ["INPUT", "TEXTAREA"].includes(event.target?.tagName);
      // Com o modal de exclusão aberto, Escape cancela SÓ o modal — sem isto,
      // o mesmo Escape fecharia o modal E a apresentação inteira de uma vez.
      if (duvidaParaExcluir) {
        if (event.key === "Escape") setDuvidaParaExcluir(null);
        return;
      }
      if (event.key === "Escape") onClose();
      else if (emCampo) return;
      else if (event.key === "ArrowLeft") irPara(index - 1);
      else if (event.key === "ArrowRight") irPara(index + 1);
      // "+" e "-" mudam o tamanho sem tirar a mão do teclado no meio da aula.
      else if (event.key === "+" || event.key === "=") ajustarEscala(PASSO_DA_ESCALA);
      else if (event.key === "-" || event.key === "_") ajustarEscala(-PASSO_DA_ESCALA);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [index, irPara, onClose, ajustarEscala, duvidaParaExcluir]);

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
        top: 0,
        left: 0,
        right: 0,
        // No celular a barra de endereço fica POR CIMA de um `100vh`: a linha de
        // baixo (posição na lista em cartaz) some atrás dela. `100dvh` mede a
        // altura realmente visível; o `100vh` fica de reserva para navegador
        // antigo que não conhece a unidade.
        height: "100vh",
        "@supports (height: 100dvh)": { height: "100dvh" },
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
      {/* QR code de dúvidas: só no canto quando HÁ dúvida em cartaz — no estado
          vazio ele se muda para o centro (mais abaixo), então os dois nunca
          aparecem juntos. */}
      {total > 0 && (
        <QrCodeDuvida link={studentLink} mode={qrMode} onChangeMode={setQrMode} />
      )}

      {/* Lista lateral: todas as dúvidas do recorte atual, clicáveis — o
          professor pula direto para uma sem passar pelas outras nas setas.
          Fica por cima do QR do canto (que também mora à direita) quando
          aberta; abaixo do QR 'huge', que sobrepõe a tela inteira. */}
      {listaAberta && (
        <Box
          sx={{
            position: "fixed",
            top: 0,
            right: 0,
            height: "100%",
            width: { xs: "88vw", sm: 320 },
            maxWidth: 380,
            zIndex: 10,
            backgroundColor: "rgba(35, 0, 54, 0.97)",
            boxShadow: "-4px 0 20px rgba(0,0,0,0.4)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              p: 1.5,
              borderBottom: "1px solid rgba(255,255,255,0.2)",
              flexShrink: 0,
            }}
          >
            <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: "#fff" }}>
              Dúvidas ({total})
            </Typography>
            <IconButton
              size="small"
              onClick={() => setListaAberta(false)}
              aria-label="Fechar lista de dúvidas"
              sx={{ color: "#fff" }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          <Box sx={{ overflowY: "auto", flex: 1, p: 1 }}>
            {total === 0 ? (
              <Typography sx={{ opacity: 0.7, fontSize: "0.85rem", color: "#fff", p: 1 }}>
                Nenhuma dúvida neste recorte.
              </Typography>
            ) : (
              visiveis.map((duvida, i) => (
                <Box
                  key={duvida.id}
                  sx={{
                    display: "flex",
                    alignItems: "stretch",
                    gap: 0.25,
                    borderRadius: 1.5,
                    mb: 0.5,
                    backgroundColor: i === index ? "rgba(255,255,255,0.22)" : "transparent",
                  }}
                >
                  {/* Item da lista: sem aninhar o botão de excluir dentro deste
                      <button>, senão vira button-dentro-de-button. */}
                  <Box
                    component="button"
                    type="button"
                    onClick={() => irPara(i)}
                    aria-current={i === index ? "true" : undefined}
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      display: "block",
                      textAlign: "left",
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      borderRadius: 1.5,
                      p: 1,
                      color: "#fff",
                      fontFamily: "inherit",
                      "&:hover": {
                        backgroundColor: i === index ? "transparent" : "rgba(255,255,255,0.15)",
                      },
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "0.85rem",
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {duvida.text}
                    </Typography>
                    {duvida.discussed && (
                      <Chip
                        label="Discutida"
                        size="small"
                        sx={{
                          mt: 0.5,
                          height: 18,
                          fontSize: "0.65rem",
                          color: "#fff",
                          backgroundColor: "rgba(255,255,255,0.25)",
                        }}
                      />
                    )}
                  </Box>

                  <Tooltip title="Excluir dúvida">
                    <IconButton
                      size="small"
                      onClick={() => setDuvidaParaExcluir(duvida)}
                      aria-label="Excluir dúvida"
                      sx={{
                        alignSelf: "center",
                        mr: 0.5,
                        color: "rgba(255,255,255,0.7)",
                        "&:hover": { color: "#ff8a80", backgroundColor: "rgba(255,255,255,0.1)" },
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              ))
            )}
          </Box>
        </Box>
      )}

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
          quando o recorte não tem nenhuma dúvida — é por aqui que ele sai de lá.
          Alinhados à ESQUERDA (diferente do cabeçalho e do título do curso, que
          continuam centralizados): é uma barra de ferramentas, não um bloco de
          leitura, e o QR code já ocupa o canto direito por cima de tudo. */}
      <Box
        sx={{
          display: "flex",
          gap: { xs: 1, sm: 2 },
          alignItems: "center",
          justifyContent: "flex-start",
          flexWrap: "wrap",
          flexShrink: 0,
          mt: { xs: 1, sm: 1.5 },
        }}
      >
        <FormControl
          size="small"
          sx={{ width: { xs: "100%", sm: "auto" }, minWidth: { sm: 300, md: 380 } }}
        >
          <Select
            value={contentId}
            onChange={(e) => trocarRecorte(() => setContentId(e.target.value))}
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
              <MenuItem
                key={option.contentId}
                value={option.contentId}
                // Sem a quebra de linha, um título de vídeo longo estica o menu
                // além da largura do celular e o texto fica fora da tela.
                sx={{ whiteSpace: "normal", maxWidth: "min(90vw, 420px)" }}
              >
                {option.contentTitle} ({option.total})
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControlLabel
          control={
            <Switch
              checked={includeDiscussed}
              onChange={(e) => trocarRecorte(() => setIncludeDiscussed(e.target.checked))}
              sx={{
                "& .MuiSwitch-switchBase.Mui-checked": { color: "#fff" },
                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                  backgroundColor: "#fff",
                },
              }}
            />
          }
          label={
            noCelular
              ? `Já discutidas (+${totalDiscutidas})`
              : `Incluir já discutidas (+${totalDiscutidas})`
          }
          sx={{
            mr: 0,
            "& .MuiFormControlLabel-label": {
              color: "#fff",
              fontSize: "clamp(0.75rem, 1.2vw, 0.95rem)",
            },
          }}
        />

        {/* Marcar a dúvida em cartaz como discutida: só o check, sem texto — ao
            lado do "Incluir já discutidas" porque as duas mexem no mesmo
            conjunto (uma tira da fila, a outra decide se a fila mostra quem já
            saiu). Sai desta apresentação e fica registrada como discutida na
            aba Dúvidas; só aparece quando há uma dúvida em cartaz pendente. */}
        {atual && !atual.discussed && (
          <Tooltip title="Marcar a dúvida em cartaz como discutida">
            <span>
              <IconButton
                onClick={() => onMarkDiscussed(atual)}
                aria-label="Marcar dúvida em cartaz como discutida"
                size="small"
                sx={{
                  color: "#fff",
                  backgroundColor: "rgba(255,255,255,0.15)",
                  p: { xs: 1.5, sm: 0.75 },
                  "&:hover": { backgroundColor: "rgba(255,255,255,0.28)" },
                }}
              >
                <CheckCircleIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}

        {/* Tamanho da fonte da dúvida. Fica junto dos outros controles, e não
            escondido num menu: em aula o professor descobre que o fundo da sala
            não está lendo e precisa corrigir na hora. O campo do meio aceita
            digitação direta, em passos de 2%. */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            backgroundColor: "rgba(255,255,255,0.15)",
            borderRadius: 2,
            px: 0.5,
          }}
        >
          <Tooltip title="Diminuir a fonte da dúvida (tecla -)">
            <span>
              <IconButton
                onClick={() => ajustarEscala(-PASSO_DA_ESCALA)}
                disabled={fontScale <= ESCALA_MINIMA}
                aria-label="Diminuir a fonte da dúvida"
                size="small"
                sx={{
                  color: "#fff",
                  // 44px de área de toque no celular: o padrão do `small` (30px)
                  // é menor que a ponta do dedo e erra o alvo.
                  p: { xs: 1.5, sm: 0.75 },
                  "&.Mui-disabled": { color: "rgba(255,255,255,0.35)" },
                }}
              >
                <TextDecreaseIcon />
              </IconButton>
            </span>
          </Tooltip>

          <TextField
            value={escalaTexto}
            onChange={(e) => setEscalaTexto(e.target.value)}
            onBlur={() => definirEscala(Number(escalaTexto) / 100)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              definirEscala(Number(escalaTexto) / 100);
            }}
            type="number"
            variant="standard"
            aria-label="Tamanho da fonte da dúvida, em porcentagem"
            InputProps={{
              disableUnderline: true,
              endAdornment: (
                <Typography sx={{ color: "#fff", fontSize: "clamp(0.7rem, 1.1vw, 0.85rem)" }}>
                  %
                </Typography>
              ),
            }}
            inputProps={{
              min: Math.round(ESCALA_MINIMA * 100),
              max: Math.round(ESCALA_MAXIMA * 100),
              step: Math.round(PASSO_DA_ESCALA * 100),
              style: { textAlign: "right", padding: 0 },
            }}
            sx={{
              width: 44,
              "& .MuiInputBase-input": {
                color: "#fff",
                fontSize: "clamp(0.7rem, 1.1vw, 0.85rem)",
                // Some com as setinhas nativas do <input type=number>: elas
                // competem com os botões +/- que já estão do lado.
                "&::-webkit-outer-spin-button, &::-webkit-inner-spin-button": {
                  WebkitAppearance: "none",
                  margin: 0,
                },
                MozAppearance: "textfield",
              },
            }}
          />

          <Tooltip title="Aumentar a fonte da dúvida (tecla +)">
            <span>
              <IconButton
                onClick={() => ajustarEscala(PASSO_DA_ESCALA)}
                disabled={fontScale >= ESCALA_MAXIMA}
                aria-label="Aumentar a fonte da dúvida"
                size="small"
                sx={{
                  color: "#fff",
                  p: { xs: 1.5, sm: 0.75 },
                  "&.Mui-disabled": { color: "rgba(255,255,255,0.35)" },
                }}
              >
                <TextIncreaseIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        {/* Lista lateral: fica fechada por padrão para não competir com a
            dúvida em cartaz — é uma ferramenta de navegação, não o conteúdo
            principal da tela. */}
        <Tooltip title={listaAberta ? "Ocultar lista de dúvidas" : "Mostrar lista de dúvidas"}>
          <IconButton
            onClick={() => setListaAberta((aberta) => !aberta)}
            aria-label={listaAberta ? "Ocultar lista de dúvidas" : "Mostrar lista de dúvidas"}
            size="small"
            sx={{
              color: "#fff",
              backgroundColor: listaAberta ? "rgba(255,255,255,0.32)" : "rgba(255,255,255,0.15)",
              p: { xs: 1.5, sm: 0.75 },
              "&:hover": { backgroundColor: "rgba(255,255,255,0.28)" },
            }}
          >
            <FormatListBulletedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
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
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: { xs: 2, sm: 3 } }}>
                {/* Sem nenhuma dúvida em cartaz, o QR vira o conteúdo principal
                    da tela — é o que convida a turma a escrever a primeira. */}
                <QrCodeDuvida link={studentLink} mode={qrMode} onChangeMode={setQrMode} big />
                <Typography sx={{ fontSize: "clamp(1.1rem, 2.4vw, 1.6rem)", opacity: 0.95 }}>
                  {totalGeral === 0
                    ? "Nenhuma dúvida registrada neste curso ainda."
                    : "Nenhuma dúvida por discutir neste recorte."}
                </Typography>
              </Box>
            ) : (
              <>
                <Typography
                  component="p"
                  sx={{
                    fontWeight: 700,
                    // O ajuste manual MULTIPLICA o tamanho automático — o
                    // `calc()` sobre o `clamp()` mantém a resposta ao tamanho da
                    // tela em qualquer escala.
                    fontSize: `calc(${tamanhoDaDuvida(atual?.text)} * ${fontScale})`,
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

      {/* Baixo: posição na lista em cartaz. Fica afastada da borda inferior —
          encostada embaixo ela some do campo de visão de quem assiste à
          projeção. A ação de marcar como discutida mora lá em cima, junto do
          "Incluir já discutidas". */}
      {total > 0 && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: 1,
            flexShrink: 0,
            mb: { xs: 2, sm: 4 },
          }}
        >
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
      )}

      {/* Confirmação de exclusão: MODAL do MUI (nasce fora desta tela, então
          precisa do mesmo z-index elevado do seletor de vídeo acima) para não
          apagar uma dúvida com um clique errado na lista lateral. */}
      <Modal
        open={!!duvidaParaExcluir}
        onClose={() => setDuvidaParaExcluir(null)}
        sx={{ zIndex: 1500 }}
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: { xs: "90%", sm: 420 },
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 24,
            p: { xs: 3, sm: 4 },
            textAlign: "center",
          }}
        >
          <Typography variant="h6" sx={{ mb: 2 }}>
            Excluir esta dúvida?
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, color: "text.secondary" }}>
            {duvidaParaExcluir?.text}
          </Typography>
          <Box sx={{ display: "flex", gap: 2, justifyContent: "center", flexDirection: { xs: "column", sm: "row" } }}>
            <Button variant="contained" color="error" onClick={confirmarExclusao}>
              Sim, excluir
            </Button>
            <Button variant="outlined" onClick={() => setDuvidaParaExcluir(null)}>
              Cancelar
            </Button>
          </Box>
        </Box>
      </Modal>
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
  /** Usado para montar o link/QR code de registro de dúvida. */
  courseId: PropTypes.string,
  /** Apelido do curso, quando houver: deixa o link/QR mais curto. */
  alias: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onMarkDiscussed: PropTypes.func.isRequired,
  onDeleteQuestion: PropTypes.func.isRequired,
};

QuestionsPresenter.defaultProps = {
  questions: [],
  contentOptions: [],
  initialContentId: "",
  courseTitle: "Dúvidas da turma",
  courseId: "",
  alias: "",
};

export default QuestionsPresenter;
