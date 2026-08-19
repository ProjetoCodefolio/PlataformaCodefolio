import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Modal,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  IconButton,
  Divider,
  CircularProgress,
  Chip,
  Tooltip,
  Collapse,
  ButtonBase,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { toast } from "react-toastify";
import {
  addCourseQuestion,
  deleteCourseQuestion,
  observeUserCourseQuestions,
  MAX_QUESTION_LENGTH,
} from "$api/services/courses/questions";
import { notifyNewCourseQuestion } from "$api/services/notifications";

const PURPLE = "#9041c1";

const campoRoxo = {
  "& .MuiOutlinedInput-root": {
    "& fieldset": { borderColor: "#666" },
    "&:hover fieldset": { borderColor: PURPLE },
    "&.Mui-focused fieldset": { borderColor: PURPLE },
  },
  "& .MuiInputLabel-root": { color: "#666", "&.Mui-focused": { color: PURPLE } },
};

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

/**
 * Modal em que o aluno registra uma dúvida/consideração sobre um conteúdo.
 *
 * São dois campos: o conteúdo ao qual a dúvida se refere (já vem preenchido com
 * o que ele está assistindo) e o texto. A dúvida é exibida de forma anônima na
 * apresentação em aula; a autoria fica registrada apenas para o professor.
 *
 * Abaixo do formulário há uma seção recolhível com as próprias dúvidas do aluno,
 * de onde ele pode excluir as que ainda não foram discutidas — é o único lugar
 * onde ele as reencontra. Nasce fechada: quem abre o modal vem escrever, não ler.
 *
 * Essa lista é OBSERVADA enquanto o modal está aberto: a dúvida recém-enviada
 * entra sozinha, e a que o professor marcou como discutida durante a aula muda
 * de estado na tela do aluno na hora.
 */
const QuestionFormModal = ({
  open,
  onClose,
  courseId,
  courseTitle,
  contentItems,
  defaultContentId,
  userDetails,
  onSubmitted,
}) => {
  const [contentId, setContentId] = useState(defaultContentId || "");
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [myQuestions, setMyQuestions] = useState([]);
  const [loadingMine, setLoadingMine] = useState(false);
  // A lista das próprias dúvidas nasce recolhida: quem abre o modal vem
  // escrever, e o histórico só interessa quando ele quer revisar ou excluir.
  const [showMine, setShowMine] = useState(false);

  const userId = userDetails?.userId;

  // O conteúdo atual muda enquanto o modal está fechado (o aluno troca de
  // vídeo); a seleção só é reposicionada ao (re)abrir, para não sobrescrever
  // uma escolha que ele acabou de fazer no seletor.
  useEffect(() => {
    if (open) {
      setContentId(defaultContentId || "");
      setShowMine(false);
    }
  }, [open, defaultContentId]);

  // A observação vive junto com o modal: assina ao abrir e é encerrada ao
  // fechar, para não deixar uma escuta ativa enquanto o aluno assiste à aula.
  useEffect(() => {
    if (!open || !courseId || !userId) {
      setMyQuestions([]);
      return undefined;
    }

    setLoadingMine(true);
    const encerrar = observeUserCourseQuestions(
      courseId,
      userId,
      (lista) => {
        setMyQuestions(lista);
        setLoadingMine(false);
      },
      () => setLoadingMine(false)
    );

    return encerrar;
  }, [open, courseId, userId]);

  const handleSubmit = async () => {
    if (!userId) {
      toast.warn("Entre na sua conta para registrar uma dúvida.");
      return;
    }

    const selecionado = contentItems.find((item) => item.id === contentId);
    if (!selecionado) {
      toast.error("Selecione o vídeo ao qual a dúvida se refere.");
      return;
    }

    setSubmitting(true);
    try {
      const criada = await addCourseQuestion(
        courseId,
        {
          contentId: selecionado.id,
          contentTitle: selecionado.title,
          text,
        },
        userDetails
      );

      // A notificação é acessório: se ela falhar, a dúvida já está registrada e
      // o aluno não deve ver um erro por isso (o serviço só loga).
      notifyNewCourseQuestion(courseId, criada, courseTitle);

      toast.success("Dúvida registrada! O professor vai vê-la sem seu nome na aula.");
      setText("");
      if (typeof onSubmitted === "function") onSubmitted(criada);
    } catch (error) {
      console.error("Erro ao registrar dúvida:", error);
      toast.error(error.message || "Não foi possível registrar a dúvida");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (question) => {
    try {
      await deleteCourseQuestion(courseId, question.id);
      toast.success("Dúvida excluída.");
    } catch (error) {
      console.error("Erro ao excluir dúvida:", error);
      toast.error("Não foi possível excluir a dúvida");
    }
  };

  const restante = MAX_QUESTION_LENGTH - text.trim().length;

  return (
    <Modal open={open} onClose={onClose} aria-labelledby="titulo-modal-duvida">
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: { xs: "92%", sm: "560px" },
          maxHeight: "88vh",
          overflowY: "auto",
          bgcolor: "background.paper",
          borderRadius: 2,
          boxShadow: 24,
          outline: "none",
        }}
      >
        <Box
          sx={{
            bgcolor: PURPLE,
            color: "#fff",
            p: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            zIndex: 1,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <HelpOutlineIcon />
            <Typography id="titulo-modal-duvida" variant="h6" component="h2">
              Registrar dúvida
            </Typography>
          </Box>
          <IconButton onClick={onClose} sx={{ color: "#fff" }} aria-label="Fechar">
            <CloseIcon />
          </IconButton>
        </Box>

        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="body2" sx={{ color: "#666", mb: 2 }}>
            Sua dúvida aparece sem identificação quando o professor a leva para
            discussão em aula.
          </Typography>

          <FormControl fullWidth sx={{ mb: 2, ...campoRoxo }}>
            <InputLabel id="rotulo-conteudo-duvida">Vídeo</InputLabel>
            <Select
              labelId="rotulo-conteudo-duvida"
              label="Vídeo"
              value={contentId}
              onChange={(e) => setContentId(e.target.value)}
              disabled={contentItems.length === 0}
            >
              {contentItems.map((item) => (
                <MenuItem key={item.id} value={item.id}>
                  {item.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Sua dúvida ou consideração"
            fullWidth
            multiline
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            error={restante < 0}
            helperText={
              restante < 0
                ? `${Math.abs(restante)} caractere(s) além do limite`
                : `${restante} caractere(s) restantes`
            }
            sx={campoRoxo}
          />

          <Box sx={{ display: "flex", gap: 2, mt: 2, flexDirection: { xs: "column", sm: "row" } }}>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={submitting || !userId}
              sx={{
                backgroundColor: PURPLE,
                fontWeight: "bold",
                "&:hover": { backgroundColor: "#7d37a7" },
                flex: 1,
              }}
            >
              {submitting ? "Enviando..." : "Enviar dúvida"}
            </Button>
            <Button
              variant="outlined"
              onClick={onClose}
              sx={{ color: PURPLE, borderColor: PURPLE, flex: { xs: 1, sm: "0 0 auto" } }}
            >
              Cancelar
            </Button>
          </Box>

          {!userId && (
            <Typography variant="body2" sx={{ mt: 2, color: "#d32f2f" }}>
              Entre na sua conta para registrar dúvidas.
            </Typography>
          )}

          {userId && (
            <>
              <Divider sx={{ my: 3 }} />

              <ButtonBase
                onClick={() => setShowMine((atual) => !atual)}
                aria-expanded={showMine}
                sx={{
                  width: "100%",
                  justifyContent: "space-between",
                  borderRadius: "8px",
                  px: 1,
                  py: 1,
                  "&:hover": { backgroundColor: "rgba(144, 65, 193, 0.06)" },
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: "bold", color: "#333" }}>
                  Suas dúvidas neste curso
                  {!loadingMine && myQuestions.length > 0 && ` (${myQuestions.length})`}
                </Typography>
                <ExpandMoreIcon
                  sx={{
                    color: PURPLE,
                    transition: "transform 0.2s",
                    transform: showMine ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                />
              </ButtonBase>

              <Collapse in={showMine} timeout="auto" unmountOnExit>
                <Box sx={{ pt: 1.5 }}>
                  {loadingMine ? (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                      <CircularProgress size={22} sx={{ color: PURPLE }} />
                    </Box>
                  ) : myQuestions.length === 0 ? (
                    <Typography variant="body2" sx={{ color: "#999" }}>
                      Você ainda não registrou nenhuma dúvida aqui.
                    </Typography>
                  ) : (
                    myQuestions.map((question) => (
                      <Box
                        key={question.id}
                        sx={{
                          border: "1px solid #e0e0e0",
                          borderRadius: "8px",
                          p: 1.5,
                          mb: 1.5,
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 1,
                        }}
                      >
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mb: 0.5 }}>
                            <Typography variant="caption" sx={{ color: PURPLE, fontWeight: 600 }}>
                              {question.contentTitle}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "#999" }}>
                              {formatarData(question.createdAt)}
                            </Typography>
                            {question.discussed && (
                              <Chip label="Discutida" size="small" color="success" variant="outlined" />
                            )}
                          </Box>
                          <Typography variant="body2" sx={{ color: "#333", whiteSpace: "pre-wrap" }}>
                            {question.text}
                          </Typography>
                        </Box>
                        <Tooltip
                          title={
                            question.discussed
                              ? "Dúvidas já discutidas em aula não podem ser excluídas"
                              : "Excluir dúvida"
                          }
                        >
                          <span>
                            <IconButton
                              aria-label="Excluir dúvida"
                              onClick={() => handleDelete(question)}
                              disabled={question.discussed}
                              sx={{ color: "#d32f2f" }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>
                    ))
                  )}
                </Box>
              </Collapse>
            </>
          )}
        </Box>
      </Box>
    </Modal>
  );
};

QuestionFormModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  courseId: PropTypes.string,
  courseTitle: PropTypes.string,
  contentItems: PropTypes.arrayOf(
    PropTypes.shape({ id: PropTypes.string, title: PropTypes.string })
  ),
  defaultContentId: PropTypes.string,
  userDetails: PropTypes.object,
  onSubmitted: PropTypes.func,
};

QuestionFormModal.defaultProps = {
  contentItems: [],
};

export default QuestionFormModal;
