import React, { useEffect, useState } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Divider,
  CircularProgress,
  InputAdornment,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import NotesIcon from "@mui/icons-material/Notes";
import LinkIcon from "@mui/icons-material/Link";
import YouTubeIcon from "@mui/icons-material/YouTube";
import AddToDriveIcon from "@mui/icons-material/AddToDrive";
import { isValidYouTubeUrl } from "$api/services/courses/videos";
import { isValidGoogleDriveUrl } from "$api/services/courses/submissions";
import RichTextEditor from "$components/common/RichTextEditor";
import { richTextIsEmpty, sanitizeRichHtml } from "$utils/richText";

const purpleField = {
  "& .MuiOutlinedInput-root": {
    "& fieldset": { borderColor: "#ccc" },
    "&:hover fieldset": { borderColor: "#9041c1" },
    "&.Mui-focused fieldset": { borderColor: "#9041c1" },
  },
  "& .MuiInputLabel-root": {
    color: "#666",
    "&.Mui-focused": { color: "#9041c1" },
  },
};

/**
 * Formulário de entrega de um enunciado.
 * Renderiza apenas os campos habilitados em assignment.submissionTypes +
 * (se flippedClassroom) os campos de vídeo do YouTube.
 */
export default function SubmissionForm({
  assignment,
  existingSubmission = null,
  disabled = false,
  isLate = false,
  onSubmit,
}) {
  const types = assignment?.submissionTypes || { text: true, link: true };
  const allowVideo = !!assignment?.flippedClassroom;

  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [drive, setDrive] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [videoDescription, setVideoDescription] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const c = existingSubmission?.content || {};
    setText(c.text || "");
    setLink(c.link || "");
    setDrive(c.drive || "");
    setVideoUrl(c.video?.youtubeUrl || "");
    setVideoTitle(c.video?.title || "");
    setVideoDescription(c.video?.description || "");
  }, [existingSubmission]);

  const handleSubmit = async () => {
    setError(null);

    const content = {};
    if (types.text && !richTextIsEmpty(text)) content.text = sanitizeRichHtml(text);
    if (types.link && link.trim()) content.link = link.trim();
    if (types.drive && drive.trim()) {
      if (!isValidGoogleDriveUrl(drive.trim())) {
        setError("Informe um link válido do Google Drive (drive.google.com ou docs.google.com).");
        return;
      }
      content.drive = drive.trim();
    }
    if (allowVideo && videoUrl.trim()) {
      if (!isValidYouTubeUrl(videoUrl.trim())) {
        setError("Informe uma URL válida do YouTube para o vídeo.");
        return;
      }
      if (!videoTitle.trim()) {
        setError("Informe um título para o vídeo.");
        return;
      }
      content.video = {
        youtubeUrl: videoUrl.trim(),
        title: videoTitle.trim(),
        description: videoDescription.trim(),
      };
    }

    if (!content.text && !content.link && !content.drive && !content.video) {
      setError("Preencha ao menos um campo de entrega.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(content);
    } catch (err) {
      setError(err.message || "Erro ao enviar entrega.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        border: "1px solid #eadff7",
        bgcolor: "#fcfaff",
        borderRadius: 2,
        p: { xs: 2, sm: 2.5 },
      }}
    >
      {isLate && !disabled && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          O prazo já passou. Sua entrega será registrada como <b>atrasada</b>.
        </Alert>
      )}
      {disabled && (
        <Alert severity="error" sx={{ mb: 2 }}>
          O prazo de entrega encerrou e o professor não permitiu entregas atrasadas.
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {types.text && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
            <NotesIcon fontSize="small" sx={{ color: "#9041c1" }} />
            <Typography variant="caption" sx={{ color: "#666", fontWeight: 600 }}>
              Resposta em texto
            </Typography>
          </Box>
          <RichTextEditor
            value={text}
            onChange={setText}
            disabled={disabled}
            placeholder="Escreva sua resposta ou explique sua entrega. Use a barra para negrito, itálico e listas."
            minHeight={110}
          />
        </Box>
      )}

      {types.link && (
        <TextField
          label="Link (URL, repositório GitHub, Drive...)"
          fullWidth
          value={link}
          onChange={(e) => setLink(e.target.value)}
          disabled={disabled}
          placeholder="https://github.com/usuario/projeto"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LinkIcon fontSize="small" sx={{ color: "#9041c1" }} />
              </InputAdornment>
            ),
          }}
          sx={{ ...purpleField, mb: 2 }}
        />
      )}

      {types.drive && (
        <TextField
          label="Link do Google Drive"
          fullWidth
          value={drive}
          onChange={(e) => setDrive(e.target.value)}
          disabled={disabled}
          placeholder="https://drive.google.com/... (compartilhe com acesso de visualização)"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <AddToDriveIcon fontSize="small" sx={{ color: "#1a73e8" }} />
              </InputAdornment>
            ),
          }}
          sx={{ ...purpleField, mb: 0.5 }}
        />
      )}
      {types.drive && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
          Cole o link de compartilhamento do arquivo/pasta. Garanta que a permissão
          esteja como "qualquer pessoa com o link pode ver".
        </Typography>
      )}

      {allowVideo && (
        <>
          <Divider sx={{ my: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <YouTubeIcon fontSize="small" sx={{ color: "#c4302b" }} />
              <Typography variant="caption" sx={{ color: "#9041c1", fontWeight: 700 }}>
                Vídeo (sala de aula invertida)
              </Typography>
            </Box>
          </Divider>
          <TextField
            label="URL do vídeo no YouTube"
            fullWidth
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            disabled={disabled}
            sx={{ ...purpleField, mb: 2 }}
          />
          <TextField
            label="Título do vídeo"
            fullWidth
            value={videoTitle}
            onChange={(e) => setVideoTitle(e.target.value)}
            disabled={disabled}
            sx={{ ...purpleField, mb: 2 }}
          />
          <TextField
            label="Descrição do vídeo"
            fullWidth
            multiline
            minRows={2}
            value={videoDescription}
            onChange={(e) => setVideoDescription(e.target.value)}
            disabled={disabled}
            sx={{ ...purpleField, mb: 1 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
            O vídeo aparecerá automaticamente na lista de conteúdo do curso.
          </Typography>
        </>
      )}

      <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
        <Button
          variant="contained"
          startIcon={submitting ? null : <SendIcon />}
          onClick={handleSubmit}
          disabled={disabled || submitting}
          sx={{
            backgroundColor: "#9041c1",
            "&:hover": { backgroundColor: "#7d37a7" },
            fontWeight: 700,
            px: 3,
          }}
        >
          {submitting ? (
            <CircularProgress size={22} color="inherit" />
          ) : existingSubmission ? (
            "Atualizar entrega"
          ) : (
            "Enviar entrega"
          )}
        </Button>
      </Box>
    </Box>
  );
}
