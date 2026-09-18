import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { JSON_FORMAT_INSTRUCTION } from "$api/services/courses/quizGenerator/promptBuilder";

/**
 * Diálogo de configurações do gerador: modelo de fallback (GROQ) e prompt
 * personalizado (as instruções de formato JSON são sempre acrescentadas
 * automaticamente, não editáveis aqui).
 */
const PromptSettingsDialog = ({
  open,
  onClose,
  customPrompt,
  setCustomPrompt,
  onSave,
  onReset,
  models,
  selectedModel,
  onModelChange,
}) => (
  <Dialog
    open={open}
    onClose={onClose}
    maxWidth="md"
    fullWidth
    PaperProps={{
      sx: {
        width: { xs: "95%", sm: "90%", md: "100%" },
        maxHeight: { xs: "90vh", sm: "85vh" },
      },
    }}
  >
    <DialogTitle
      sx={{
        bgcolor: "#f5f5fa",
        fontSize: { xs: "1rem", sm: "1.25rem" },
        py: { xs: 1.5, sm: 2 },
        px: { xs: 2, sm: 3 },
      }}
    >
      Configurações do Gerador de Questões
    </DialogTitle>
    <DialogContent dividers sx={{ px: { xs: 2, sm: 3 } }}>
      {/* Provedor de IA: GPT-5.5 é o padrão; modelo GROQ é só fallback */}
      <Box
        sx={{
          p: { xs: 1.5, sm: 2 },
          mb: 2,
          bgcolor: "rgba(144, 65, 193, 0.08)",
          borderLeft: "4px solid #9041c1",
          borderRadius: 1,
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{ color: "#9041c1", fontSize: { xs: "0.875rem", sm: "1rem" } }}
        >
          Modelo padrão: GPT-5.5 (IA Codefolio)
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 1, fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
        >
          As questões são geradas por padrão pela IA própria da Codefolio
          (GPT-5.5). O modelo abaixo é usado apenas como <strong>fallback</strong>,
          caso o provedor principal fique indisponível.
        </Typography>

        <FormControl
          fullWidth
          variant="outlined"
          size="small"
          sx={{ mt: 2 }}
        >
          <InputLabel id="fallback-model-select-label">
            Modelo de fallback (GROQ)
          </InputLabel>
          <Select
            labelId="fallback-model-select-label"
            value={selectedModel}
            onChange={onModelChange}
            label="Modelo de fallback (GROQ)"
            sx={{ bgcolor: "#fff" }}
          >
            {models.length === 0 && (
              <MenuItem value="" disabled>
                Nenhum modelo ativo no catálogo
              </MenuItem>
            )}
            {models.map((model) => (
              <MenuItem key={model.modelId} value={model.modelId}>
                {model.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Typography
        variant="body2"
        color="text.secondary"
        gutterBottom
        sx={{ fontSize: { xs: "0.813rem", sm: "0.875rem" } }}
      >
        Personalize o prompt usado para gerar questões. As instruções de
        formato JSON serão adicionadas automaticamente ao final do seu
        prompt.
      </Typography>

      <Box
        sx={{
          p: { xs: 1.5, sm: 2 },
          mb: 2,
          bgcolor: "rgba(25, 118, 210, 0.08)",
          borderLeft: "4px solid #1976d2",
          borderRadius: 1,
        }}
      >
        <Typography
          variant="subtitle2"
          color="primary"
          sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
        >
          Formato obrigatório (não editável)
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt: 1,
            fontSize: { xs: "0.75rem", sm: "0.875rem" },
          }}
        >
          O sistema adicionará automaticamente as seguintes instruções para
          garantir que as questões sejam retornadas no formato correto:
        </Typography>
        <Box
          component="div"
          sx={{
            my: 1,
            overflow: "auto",
            fontFamily: "monospace",
            p: 1,
            bgcolor: "rgba(0, 0, 0, 0.04)",
            color: "#555",
            fontSize: { xs: "0.688rem", sm: "0.75rem" },
          }}
        >
          <pre style={{ margin: 0 }}>{JSON_FORMAT_INSTRUCTION.trim()}</pre>
        </Box>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontSize: { xs: "0.688rem", sm: "0.75rem" } }}
        >
          Esta parte será sempre adicionada ao seu prompt personalizado para
          garantir a compatibilidade do formato.
        </Typography>
      </Box>

      <TextField
        label="Prompt personalizado"
        multiline
        rows={window.innerWidth < 600 ? 8 : 15}
        value={customPrompt}
        onChange={(e) => setCustomPrompt(e.target.value)}
        fullWidth
        variant="outlined"
        margin="normal"
        placeholder="Insira seu prompt personalizado aqui..."
        sx={{
          "& .MuiOutlinedInput-root": {
            "& fieldset": { borderColor: "#666" },
            "&:hover fieldset": { borderColor: "#9041c1" },
            "&.Mui-focused fieldset": { borderColor: "#9041c1" },
            fontSize: { xs: "0.813rem", sm: "0.875rem" },
          },
          fontFamily: "monospace",
        }}
        InputLabelProps={{
          sx: { fontSize: { xs: "0.875rem", sm: "1rem" } },
        }}
      />

      <Box sx={{ mt: 2 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontSize: { xs: "0.75rem", sm: "0.813rem" } }}
        >
          O texto do PDF será anexado após as instruções de formato.
          Certifique-se de incluir uma referência a ele em suas instruções
          personalizadas.
        </Typography>
      </Box>
    </DialogContent>
    <DialogActions
      sx={{
        p: { xs: 1.5, sm: 2 },
        flexDirection: { xs: "column", sm: "row" },
        gap: { xs: 1, sm: 0 },
      }}
    >
      <Button
        onClick={onReset}
        color="secondary"
        fullWidth={window.innerWidth < 600}
        sx={{ fontSize: { xs: "0.813rem", sm: "0.875rem" } }}
      >
        Restaurar Padrão
      </Button>
      <Button
        onClick={onClose}
        color="inherit"
        fullWidth={window.innerWidth < 600}
        sx={{ fontSize: { xs: "0.813rem", sm: "0.875rem" } }}
      >
        Cancelar
      </Button>
      <Button
        onClick={onSave}
        variant="contained"
        fullWidth={window.innerWidth < 600}
        sx={{
          backgroundColor: "#9041c1",
          "&:hover": { backgroundColor: "#7d37a7" },
          fontSize: { xs: "0.813rem", sm: "0.875rem" },
        }}
      >
        Salvar Configurações
      </Button>
    </DialogActions>
  </Dialog>
);

export default PromptSettingsDialog;
