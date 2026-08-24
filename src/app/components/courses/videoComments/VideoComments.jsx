import { useEffect, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ReplyIcon from "@mui/icons-material/Reply";
import SendIcon from "@mui/icons-material/Send";
import { toast } from "react-toastify";
import { useAuth } from "$context/AuthContext";
import {
  MAX_COMMENT_LENGTH,
  addVideoComment,
  canDeleteComment,
  countComments,
  deleteVideoComment,
  listenToVideoComments,
} from "$api/services/courses/videoComments";

/** Data curta e legível; o ISO cru não diz nada para quem lê. */
const formatarData = (iso) => {
  if (!iso) return "";
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "";
  return data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const CampoDeEnvio = ({ valor, onChange, onEnviar, enviando, placeholder, autoFocus }) => (
  <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
    <TextField
      fullWidth
      size="small"
      multiline
      maxRows={4}
      autoFocus={autoFocus}
      placeholder={placeholder}
      value={valor}
      onChange={(e) => onChange(e.target.value)}
      inputProps={{ maxLength: MAX_COMMENT_LENGTH }}
      onKeyDown={(e) => {
        // Enter envia; Shift+Enter quebra linha — o comentário costuma ser de
        // uma linha só, e obrigar a mirar o botão a cada frase cansa.
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          onEnviar();
        }
      }}
      sx={{
        // Campo em branco para destacar a área de digitação sobre o bloco tingido.
        "& .MuiOutlinedInput-root": { backgroundColor: "#fff" },
        "& .MuiOutlinedInput-root.Mui-focused fieldset": { borderColor: "#9041c1" },
      }}
    />
    <IconButton
      onClick={onEnviar}
      disabled={enviando || !valor.trim()}
      sx={{ color: valor.trim() ? "#9041c1" : "#ccc", mt: 0.25 }}
      title="Enviar"
    >
      <SendIcon />
    </IconButton>
  </Box>
);

/**
 * Comentários da turma sobre um conteúdo do curso.
 *
 * Fica recolhido por padrão: quem entra na sala vem assistir à aula, e um mural
 * aberto empurraria o conteúdo seguinte para fora da tela.
 */
export default function VideoComments({ courseId, contentId, courseOwnerUid }) {
  const { userDetails } = useAuth();
  const [threads, setThreads] = useState([]);
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const [respondendoA, setRespondendoA] = useState(null);
  const [textoResposta, setTextoResposta] = useState("");
  const [enviando, setEnviando] = useState(false);
  // Respostas ficam recolhidas: quem lê a thread pode querer só a lista de
  // comentários, sem as conversas penduradas em cada um.
  const [respostasAbertas, setRespostasAbertas] = useState({});
  const [aConfirmarExclusao, setAConfirmarExclusao] = useState(null);

  useEffect(() => {
    if (!courseId || !contentId) return undefined;

    // A escuta fica de pé mesmo com o painel recolhido: é dela que sai a
    // contagem no cabeçalho, que é o que convida a abrir.
    const cancelar = listenToVideoComments(courseId, contentId, setThreads);
    return () => cancelar();
  }, [courseId, contentId]);

  // Trocar de vídeo fecha a caixa de resposta que ficou aberta no anterior.
  useEffect(() => {
    setRespondendoA(null);
    setTextoResposta("");
    setRespostasAbertas({});
  }, [contentId]);

  const total = countComments(threads);

  const publicar = async (conteudo, parentId, limpar) => {
    if (!userDetails?.userId) {
      toast.error("É preciso estar logado para comentar");
      return;
    }

    setEnviando(true);
    try {
      await addVideoComment(courseId, contentId, { text: conteudo, parentId }, userDetails);
      limpar();
    } catch (error) {
      toast.error(error.message || "Erro ao publicar o comentário");
    } finally {
      setEnviando(false);
    }
  };

  const confirmarExclusao = async () => {
    const comentario = aConfirmarExclusao;
    setAConfirmarExclusao(null);
    if (!comentario) return;

    try {
      await deleteVideoComment(courseId, contentId, comentario);
      toast.success("Comentário removido");
    } catch (error) {
      console.error("Erro ao remover comentário:", error);
      toast.error("Erro ao remover o comentário");
    }
  };

  const alternarRespostas = (comentarioId) =>
    setRespostasAbertas((anterior) => ({
      ...anterior,
      [comentarioId]: !anterior[comentarioId],
    }));

  const renderComentario = (comentario, ehResposta = false) => (
    <Box
      key={comentario.id}
      sx={{
        display: "flex",
        gap: 1.5,
        py: 1.25,
        pl: ehResposta ? { xs: 3, sm: 5 } : 0,
        borderBottom: ehResposta ? "none" : "1px solid rgba(0,0,0,0.06)",
      }}
    >
      <Avatar
        src={comentario.userPhotoURL || undefined}
        alt={comentario.userName}
        sx={{ width: ehResposta ? 28 : 34, height: ehResposta ? 28 : 34 }}
      />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, flexWrap: "wrap" }}>
          <Typography sx={{ fontWeight: 600, fontSize: "0.875rem", color: "#333" }}>
            {comentario.userName}
          </Typography>
          <Typography variant="caption" sx={{ color: "#888" }}>
            {formatarData(comentario.createdAt)}
            {comentario.editedAt ? " (editado)" : ""}
          </Typography>
        </Box>

        <Typography
          sx={{
            fontSize: "0.9rem",
            color: "#444",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            mt: 0.25,
          }}
        >
          {comentario.text}
        </Typography>

        <Box sx={{ display: "flex", gap: 0.5, mt: 0.25 }}>
          {!ehResposta && userDetails?.userId && (
            <Button
              size="small"
              startIcon={<ReplyIcon sx={{ fontSize: "16px !important" }} />}
              onClick={() =>
                setRespondendoA(respondendoA === comentario.id ? null : comentario.id)
              }
              sx={{ textTransform: "none", color: "#9041c1", fontSize: "0.75rem", minWidth: 0 }}
            >
              Responder
            </Button>
          )}
          {canDeleteComment(comentario, userDetails, { courseId, courseOwnerUid }) && (
            <IconButton
              size="small"
              onClick={() => setAConfirmarExclusao(comentario)}
              sx={{ color: "#b0b0b0", "&:hover": { color: "#d32f2f" } }}
              title={
                comentario.replies?.length
                  ? "Remover comentário e suas respostas"
                  : "Remover comentário"
              }
            >
              <DeleteOutlineIcon sx={{ fontSize: "18px" }} />
            </IconButton>
          )}
        </Box>

        {respondendoA === comentario.id && (
          <Box sx={{ mt: 1 }}>
            <CampoDeEnvio
              autoFocus
              valor={textoResposta}
              onChange={setTextoResposta}
              enviando={enviando}
              placeholder={`Respondendo ${comentario.userName}...`}
              onEnviar={() =>
                publicar(textoResposta, comentario.id, () => {
                  setTextoResposta("");
                  setRespondendoA(null);
                  // Abre as respostas da thread: quem acabou de responder
                  // precisa ver a própria mensagem aparecer.
                  setRespostasAbertas((anterior) => ({
                    ...anterior,
                    [comentario.id]: true,
                  }));
                })
              }
            />
          </Box>
        )}

        {!ehResposta && (comentario.replies || []).length > 0 && (
          <>
            <Button
              size="small"
              startIcon={
                respostasAbertas[comentario.id] ? (
                  <ExpandLessIcon sx={{ fontSize: "18px !important" }} />
                ) : (
                  <ExpandMoreIcon sx={{ fontSize: "18px !important" }} />
                )
              }
              onClick={() => alternarRespostas(comentario.id)}
              sx={{
                textTransform: "none",
                color: "#9041c1",
                fontSize: "0.75rem",
                minWidth: 0,
                mt: 0.25,
              }}
            >
              {respostasAbertas[comentario.id] ? "Ocultar" : "Ver"}{" "}
              {comentario.replies.length === 1
                ? "1 resposta"
                : `${comentario.replies.length} respostas`}
            </Button>

            <Collapse in={Boolean(respostasAbertas[comentario.id])} timeout="auto" unmountOnExit>
              {comentario.replies.map((resposta) => renderComentario(resposta, true))}
            </Collapse>
          </>
        )}
      </Box>
    </Box>
  );

  if (!courseId || !contentId) return null;

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: { xs: "100%", sm: "780px" },
        ml: { xs: 0, sm: 2 },
        mt: 2,
        p: { xs: 1.5, sm: 2 },
        // Mesmo bloco da barra lateral de vídeos/quizzes: fundo levemente
        // tingido, borda discreta e sombra curta — em vez do branco chapado.
        backgroundColor: "#F5F5FA",
        borderRadius: "16px",
        border: "1px solid #e0e0e0",
        boxShadow: "0px 1px 3px rgba(0, 0, 0, 0.06)",
      }}
    >
      <Box
        onClick={() => setAberto((v) => !v)}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <ChatBubbleOutlineIcon sx={{ color: "#9041c1", fontSize: "20px" }} />
        <Typography sx={{ fontWeight: 600, color: "#333", flexGrow: 1 }}>
          Comentários {total > 0 ? `(${total})` : ""}
        </Typography>
        {aberto ? (
          <ExpandLessIcon sx={{ color: "#666" }} />
        ) : (
          <ExpandMoreIcon sx={{ color: "#666" }} />
        )}
      </Box>

      <Collapse in={aberto} timeout="auto" unmountOnExit>
        <Box sx={{ mt: 2 }}>
          {userDetails?.userId ? (
            <CampoDeEnvio
              valor={texto}
              onChange={setTexto}
              enviando={enviando}
              placeholder="Escreva um comentário..."
              onEnviar={() => publicar(texto, null, () => setTexto(""))}
            />
          ) : (
            <Typography variant="body2" sx={{ color: "#888", fontStyle: "italic" }}>
              Entre na sua conta para comentar.
            </Typography>
          )}

          <Box sx={{ mt: 2 }}>
            {threads.length === 0 ? (
              <Typography
                variant="body2"
                sx={{ color: "#888", textAlign: "center", py: 2 }}
              >
                Ninguém comentou ainda. Seja o primeiro.
              </Typography>
            ) : (
              threads.map((comentario) => renderComentario(comentario))
            )}
          </Box>
        </Box>
      </Collapse>

      <Dialog
        open={Boolean(aConfirmarExclusao)}
        onClose={() => setAConfirmarExclusao(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: "bold", color: "#333" }}>
          Remover comentário
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: "#555" }}>
            {aConfirmarExclusao?.replies?.length
              ? `Isso remove o comentário de ${aConfirmarExclusao.userName} e as ${
                  aConfirmarExclusao.replies.length === 1
                    ? "1 resposta"
                    : `${aConfirmarExclusao.replies.length} respostas`
                } que ele recebeu. Não dá para desfazer.`
              : `Isso remove o comentário de ${
                  aConfirmarExclusao?.userName || ""
                }. Não dá para desfazer.`}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setAConfirmarExclusao(null)}
            sx={{ color: "#666", textTransform: "none" }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={confirmarExclusao}
            sx={{ textTransform: "none", fontWeight: "bold", borderRadius: "8px" }}
          >
            Remover
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
