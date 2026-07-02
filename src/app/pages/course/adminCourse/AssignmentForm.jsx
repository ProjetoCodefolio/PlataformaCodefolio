import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Box,
  Typography,
  Grid,
  IconButton,
  Alert,
  Stack,
  MenuItem,
  CircularProgress,
  InputAdornment,
  Chip,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddLinkIcon from "@mui/icons-material/AddLink";
import ImageIcon from "@mui/icons-material/Image";
import LinkIcon from "@mui/icons-material/Link";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import {
  createAssignment,
  updateAssignment,
  DEFAULT_ASSIGNMENT,
} from "$api/services/courses/assignments";
import { setupGroups, fetchGroups } from "$api/services/courses/assignmentGroups";
import * as assessmentService from "$api/services/courses/assessments";
import { compressImageToBase64 } from "$api/services/storageService";
import { toast } from "react-toastify";

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

const sectionLabel = {
  fontWeight: 800,
  color: "#9041c1",
  fontSize: "0.8rem",
  letterSpacing: 0.4,
  textTransform: "uppercase",
  mb: 1.5,
  mt: 1,
};

// ISO <-> valor do input datetime-local (horário local)
const isoToLocalInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
};
const localInputToIso = (local) => {
  if (!local) return "";
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
};

/**
 * Formulário (Dialog) para criar/editar um enunciado.
 */
export default function AssignmentForm({
  open,
  onClose,
  courseId,
  courseTitle = "",
  assignment = null,
  onSaved,
}) {
  const isEditing = !!assignment;

  const [title, setTitle] = useState("");
  const [descriptionHtml, setDescriptionHtml] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [openDate, setOpenDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [allowLate, setAllowLate] = useState(false);
  const [allowText, setAllowText] = useState(true);
  const [allowLink, setAllowLink] = useState(true);
  const [flippedClassroom, setFlippedClassroom] = useState(false);
  const [mode, setMode] = useState("individual");
  const [weight, setWeight] = useState("");
  // grupos
  const [maxGroups, setMaxGroups] = useState(2);
  const [maxPerGroup, setMaxPerGroup] = useState(4);
  const [changeDeadline, setChangeDeadline] = useState("");
  const [themes, setThemes] = useState([]);
  // anexo de link
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const descriptionRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    // Reset / carregar valores
    const a = assignment || DEFAULT_ASSIGNMENT;
    setTitle(a.title || "");
    setDescriptionHtml(a.descriptionHtml || "");
    setAttachments(Array.isArray(a.attachments) ? a.attachments : []);
    setOpenDate(isoToLocalInput(a.openDate));
    setDueDate(isoToLocalInput(a.dueDate));
    setAllowLate(!!a.allowLate);
    setAllowText(a.submissionTypes?.text !== false);
    setAllowLink(a.submissionTypes?.link !== false);
    setFlippedClassroom(!!a.flippedClassroom);
    setMode(a.mode || "individual");
    setMaxGroups(a.groups?.maxGroups || 2);
    setMaxPerGroup(a.groups?.maxPerGroup || 4);
    setChangeDeadline(isoToLocalInput(a.groups?.changeDeadline));
    setWeight("");
    setThemes([]);
    setLinkName("");
    setLinkUrl("");
    setError(null);

    // Carregar peso do assessment vinculado e temas dos grupos (edição)
    (async () => {
      if (isEditing) {
        if (assignment.linkedAssessmentId) {
          try {
            const all = await assessmentService.fetchAllAssessmentsByCourse(courseId);
            const linked = all.find((x) => x.id === assignment.linkedAssessmentId);
            if (linked) setWeight(String(linked.percentage ?? ""));
          } catch {
            /* silencioso */
          }
        }
        if ((assignment.mode || "individual") === "group") {
          try {
            const groups = await fetchGroups(courseId, assignment.id);
            const map = [];
            groups.forEach((g) => {
              map[g.index] = g.theme || "";
            });
            setThemes(map);
          } catch {
            /* silencioso */
          }
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleAddLink = () => {
    if (!linkUrl.trim()) return;
    setAttachments((prev) => [
      ...prev,
      { name: linkName.trim() || linkUrl.trim(), url: linkUrl.trim() },
    ]);
    setLinkName("");
    setLinkUrl("");
  };

  const handleAddImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const dataUrl = await compressImageToBase64(file, 45);
      setAttachments((prev) => [...prev, { name: file.name, url: dataUrl }]);
    } catch (err) {
      toast.error("Não foi possível processar a imagem.");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  const removeAttachment = (idx) =>
    setAttachments((prev) => prev.filter((_, i) => i !== idx));

  const setThemeAt = (idx, value) =>
    setThemes((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });

  const validate = () => {
    if (!title.trim()) return "O título é obrigatório.";
    if (!allowText && !allowLink && !flippedClassroom)
      return "Habilite ao menos um tipo de entrega (texto, link ou vídeo).";
    if (openDate && dueDate && new Date(openDate) >= new Date(dueDate))
      return "A data de abertura deve ser anterior à data de encerramento.";
    if (weight !== "" && (Number(weight) <= 0 || Number(weight) > 100))
      return "O peso deve ser entre 1 e 100 (ou vazio, se não valer nota).";
    if (mode === "group") {
      if (Number(maxGroups) < 1) return "Defina ao menos 1 grupo.";
      if (Number(maxPerGroup) < 1) return "Defina o máximo de alunos por grupo.";
    }
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      // 1) Peso -> avaliação vinculada (courseAssessments)
      let linkedAssessmentId = assignment?.linkedAssessmentId || null;
      const weightNum = weight === "" ? null : Number(weight);
      if (weightNum) {
        if (linkedAssessmentId) {
          await assessmentService.updateAssessment(courseId, linkedAssessmentId, {
            name: title.trim(),
            percentage: weightNum,
            description: "Trabalho/enunciado",
          });
        } else {
          linkedAssessmentId = await assessmentService.createAssessment(courseId, {
            name: title.trim(),
            percentage: weightNum,
            description: "Trabalho/enunciado",
          });
        }
      }

      const payload = {
        title: title.trim(),
        descriptionHtml,
        attachments,
        openDate: localInputToIso(openDate),
        dueDate: localInputToIso(dueDate),
        allowLate,
        submissionTypes: { text: allowText, link: allowLink },
        flippedClassroom,
        mode,
        linkedAssessmentId,
        groups: {
          enabled: mode === "group",
          maxGroups: mode === "group" ? Number(maxGroups) : 0,
          maxPerGroup: mode === "group" ? Number(maxPerGroup) : 0,
          changeDeadline: mode === "group" ? localInputToIso(changeDeadline) : "",
        },
      };

      let assignmentId = assignment?.id;
      if (isEditing) {
        await updateAssignment(courseId, assignmentId, payload);
      } else {
        assignmentId = await createAssignment(courseId, payload);
      }

      // 2) Grupos (temas) quando modo grupo
      if (mode === "group") {
        const themesMap = {};
        for (let i = 0; i < Number(maxGroups); i += 1) {
          themesMap[i] = themes[i] || "";
        }
        await setupGroups(courseId, assignmentId, Number(maxGroups), themesMap);
      }

      toast.success(isEditing ? "Enunciado atualizado!" : "Enunciado criado!");
      onSaved?.(assignmentId, !isEditing, title.trim());
      onClose?.();
    } catch (err) {
      console.error(err);
      setError(err.message || "Erro ao salvar o enunciado.");
    } finally {
      setSaving(false);
    }
  };

  // Enter no título avança para o enunciado (usabilidade).
  const handleTitleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      descriptionRef.current?.focus();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ fontWeight: 800, color: "#333", pb: 1 }}>
        {isEditing ? "Editar enunciado" : "Novo enunciado"}
        {courseTitle && (
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
            {courseTitle}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent dividers sx={{ px: { xs: 2, sm: 3 } }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* --- Identificação --- */}
        <Typography sx={sectionLabel}>Identificação</Typography>
        <Stack spacing={2.5}>
          <TextField
            label="Título do trabalho"
            fullWidth
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleTitleKeyDown}
            sx={purpleField}
          />
          <TextField
            label="Enunciado (descrição, instruções, critérios)"
            fullWidth
            multiline
            minRows={4}
            inputRef={descriptionRef}
            value={descriptionHtml}
            onChange={(e) => setDescriptionHtml(e.target.value)}
            placeholder="Descreva o objetivo, as instruções e os critérios de avaliação."
            sx={purpleField}
          />
        </Stack>

        {/* --- Materiais --- */}
        <Typography sx={{ ...sectionLabel, mt: 3 }}>Materiais de apoio</Typography>
        <Grid container spacing={1.5} alignItems="flex-start">
          <Grid item xs={12} sm={4}>
            <TextField
              label="Nome (opcional)"
              size="small"
              fullWidth
              value={linkName}
              onChange={(e) => setLinkName(e.target.value)}
              sx={purpleField}
            />
          </Grid>
          <Grid item xs={12} sm={8}>
            <TextField
              label="URL do material"
              size="small"
              fullWidth
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddLink();
                }
              }}
              placeholder="https://..."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LinkIcon fontSize="small" sx={{ color: "#9041c1" }} />
                  </InputAdornment>
                ),
              }}
              sx={purpleField}
            />
          </Grid>
          <Grid item xs={12}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button
                onClick={handleAddLink}
                disabled={!linkUrl.trim()}
                startIcon={<AddLinkIcon />}
                variant="outlined"
                sx={{ color: "#9041c1", borderColor: "#9041c1", whiteSpace: "nowrap" }}
              >
                Adicionar link
              </Button>
              <Button
                component="label"
                disabled={uploadingImage}
                startIcon={uploadingImage ? <CircularProgress size={16} /> : <ImageIcon />}
                variant="outlined"
                sx={{ color: "#9041c1", borderColor: "#9041c1", whiteSpace: "nowrap" }}
              >
                {uploadingImage ? "Processando..." : "Adicionar imagem"}
                <input type="file" accept="image/*" hidden onChange={handleAddImage} />
              </Button>
            </Stack>
          </Grid>
          {attachments.length > 0 && (
            <Grid item xs={12}>
              <Stack spacing={0.75} sx={{ mt: 0.5 }}>
                {attachments.map((att, idx) => (
                  <Box
                    key={`${att.url}_${idx}`}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      bgcolor: "#f5f0fb",
                      border: "1px solid #eadff7",
                      borderRadius: 1.5,
                      px: 1.5,
                      py: 0.75,
                      gap: 1,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    >
                      {att.url?.startsWith("data:") ? `🖼️ ${att.name}` : `🔗 ${att.name}`}
                    </Typography>
                    <IconButton size="small" onClick={() => removeAttachment(idx)}>
                      <DeleteIcon fontSize="small" sx={{ color: "#f44336" }} />
                    </IconButton>
                  </Box>
                ))}
              </Stack>
            </Grid>
          )}
        </Grid>

        {/* --- Janela de entrega --- */}
        <Typography sx={{ ...sectionLabel, mt: 3 }}>Janela de entrega</Typography>
        <Grid container spacing={2.5}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Abertura das entregas"
              type="datetime-local"
              fullWidth
              value={openDate}
              onChange={(e) => setOpenDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EventAvailableIcon fontSize="small" sx={{ color: "#2e7d32" }} />
                  </InputAdornment>
                ),
              }}
              helperText="Vazio = disponível imediatamente."
              sx={purpleField}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Encerramento (prazo final)"
              type="datetime-local"
              fullWidth
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EventBusyIcon fontSize="small" sx={{ color: "#c62828" }} />
                  </InputAdornment>
                ),
              }}
              helperText="Vazio = sem prazo definido."
              sx={purpleField}
            />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={allowLate}
                  onChange={(e) => setAllowLate(e.target.checked)}
                  sx={{
                    "& .MuiSwitch-switchBase.Mui-checked": { color: "#9041c1" },
                    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                      backgroundColor: "#9041c1",
                    },
                  }}
                />
              }
              label="Permitir entregas após o prazo (marcadas como atrasadas)"
            />
          </Grid>
        </Grid>

        {/* --- Formato da entrega --- */}
        <Typography sx={{ ...sectionLabel, mt: 3 }}>Formato aceito na entrega</Typography>
        <Stack direction="row" flexWrap="wrap" sx={{ gap: { xs: 0.5, sm: 2 } }}>
          <FormControlLabel
            control={<Switch checked={allowText} onChange={(e) => setAllowText(e.target.checked)} sx={{ "& .MuiSwitch-switchBase.Mui-checked": { color: "#9041c1" }, "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#9041c1" } }} />}
            label="Texto"
          />
          <FormControlLabel
            control={<Switch checked={allowLink} onChange={(e) => setAllowLink(e.target.checked)} sx={{ "& .MuiSwitch-switchBase.Mui-checked": { color: "#9041c1" }, "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#9041c1" } }} />}
            label="Link (URL / GitHub)"
          />
          <FormControlLabel
            control={<Switch checked={flippedClassroom} onChange={(e) => setFlippedClassroom(e.target.checked)} sx={{ "& .MuiSwitch-switchBase.Mui-checked": { color: "#9041c1" }, "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#9041c1" } }} />}
            label="Vídeo do YouTube (sala invertida)"
          />
        </Stack>

        {/* --- Modo e peso --- */}
        <Typography sx={{ ...sectionLabel, mt: 3 }}>Nota e organização</Typography>
        <Grid container spacing={2.5}>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="Modo de realização"
              fullWidth
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              sx={purpleField}
            >
              <MenuItem value="individual">Individual</MenuItem>
              <MenuItem value="group">Em grupo</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Peso na nota final (%)"
              type="number"
              fullWidth
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              inputProps={{ min: 1, max: 100 }}
              helperText="Opcional. Vazio = não conta na média do curso."
              sx={purpleField}
            />
          </Grid>
        </Grid>

        {/* --- Config de grupos --- */}
        {mode === "group" && (
          <>
            <Typography sx={{ ...sectionLabel, mt: 3 }}>Configuração de grupos</Typography>
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Qtd. de grupos"
                  type="number"
                  fullWidth
                  value={maxGroups}
                  onChange={(e) => setMaxGroups(e.target.value)}
                  inputProps={{ min: 1, max: 50 }}
                  sx={purpleField}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Máx. alunos/grupo"
                  type="number"
                  fullWidth
                  value={maxPerGroup}
                  onChange={(e) => setMaxPerGroup(e.target.value)}
                  inputProps={{ min: 1, max: 50 }}
                  sx={purpleField}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Prazo p/ trocar de grupo"
                  type="datetime-local"
                  fullWidth
                  value={changeDeadline}
                  onChange={(e) => setChangeDeadline(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={purpleField}
                />
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#555" }}>
                    Tema por grupo
                  </Typography>
                  <Chip label="opcional" size="small" sx={{ bgcolor: "#eee", fontSize: "0.7rem" }} />
                </Box>
                <Grid container spacing={1.5}>
                  {Array.from({ length: Math.max(0, Number(maxGroups) || 0) }).map((_, i) => (
                    <Grid item xs={12} sm={6} key={i}>
                      <TextField
                        label={`Grupo ${i + 1}`}
                        size="small"
                        fullWidth
                        value={themes[i] || ""}
                        onChange={(e) => setThemeAt(i, e.target.value)}
                        sx={purpleField}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Grid>
            </Grid>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving} sx={{ color: "#9041c1" }}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={saving}
          sx={{ backgroundColor: "#9041c1", "&:hover": { backgroundColor: "#7d37a7" }, fontWeight: 700 }}
        >
          {saving ? <CircularProgress size={22} color="inherit" /> : isEditing ? "Salvar alterações" : "Criar enunciado"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
