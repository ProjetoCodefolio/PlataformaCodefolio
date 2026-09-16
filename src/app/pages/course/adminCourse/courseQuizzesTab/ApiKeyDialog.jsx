import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  Switch,
  FormControlLabel,
} from "@mui/material";

/**
 * Diálogo de configuração da chave API GROQ customizada (opcional — sem
 * ela, usa a chave padrão do sistema).
 */
const ApiKeyDialog = ({
  open,
  onClose,
  customApiKey,
  setCustomApiKey,
  usingCustomApiKey,
  setUsingCustomApiKey,
  onSave,
}) => (
  <Dialog
    open={open}
    onClose={onClose}
    maxWidth="sm"
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
      Configurar Chave API GROQ
    </DialogTitle>
    <DialogContent dividers sx={{ px: { xs: 2, sm: 3 } }}>
      <Typography
        variant="body2"
        color="text.secondary"
        gutterBottom
        sx={{
          mb: 2,
          fontSize: { xs: "0.813rem", sm: "0.875rem" },
        }}
      >
        Você pode usar sua própria chave API do GROQ para gerar questões.
        Caso não forneça uma chave, será utilizada a chave padrão do
        sistema.
      </Typography>

      <TextField
        label="Sua chave API GROQ"
        fullWidth
        value={customApiKey}
        onChange={(e) => setCustomApiKey(e.target.value)}
        variant="outlined"
        margin="normal"
        type="password"
        placeholder="sk-xxxxxxxxxxxxxxxxxxxx"
        sx={{
          "& .MuiOutlinedInput-root": {
            "& fieldset": { borderColor: "#666" },
            "&:hover fieldset": { borderColor: "#4caf50" },
            "&.Mui-focused fieldset": { borderColor: "#4caf50" },
            fontSize: { xs: "0.813rem", sm: "0.875rem" },
          },
        }}
        InputLabelProps={{
          sx: { fontSize: { xs: "0.875rem", sm: "1rem" } },
        }}
        helperText="Sua chave API será armazenada apenas no seu navegador e nunca enviada para nossos servidores."
        FormHelperTextProps={{
          sx: { fontSize: { xs: "0.688rem", sm: "0.75rem" } },
        }}
      />

      <Box
        sx={{
          mt: 3,
          bgcolor: "rgba(76, 175, 80, 0.08)",
          p: { xs: 1.5, sm: 2 },
          borderRadius: 1,
          borderLeft: "4px solid #4caf50",
        }}
      >
        <Typography
          variant="subtitle2"
          color="primary.main"
          sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
        >
          Como obter uma chave API GROQ?
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt: 1,
            fontSize: { xs: "0.75rem", sm: "0.875rem" },
          }}
        >
          1. Acesse{" "}
          <a
            href="https://console.groq.com/keys"
            target="_blank"
            rel="noopener noreferrer"
            style={{ wordBreak: "break-all" }}
          >
            console.groq.com/keys
          </a>
          <br />
          2. Crie uma conta ou faça login
          <br />
          3. Gere uma nova chave API
          <br />
          4. Cole a chave no campo acima
        </Typography>
      </Box>

      <FormControlLabel
        sx={{ mt: 2 }}
        control={
          <Switch
            checked={!usingCustomApiKey}
            onChange={(e) => setUsingCustomApiKey(!e.target.checked)}
            color="primary"
          />
        }
        label="Usar chave padrão do sistema"
        componentsProps={{
          typography: {
            sx: { fontSize: { xs: "0.813rem", sm: "0.875rem" } },
          },
        }}
      />
    </DialogContent>
    <DialogActions
      sx={{
        p: { xs: 1.5, sm: 2 },
        flexDirection: { xs: "column", sm: "row" },
        gap: { xs: 1, sm: 0 },
      }}
    >
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
          backgroundColor: "#4caf50",
          "&:hover": { backgroundColor: "#388e3c" },
          fontSize: { xs: "0.813rem", sm: "0.875rem" },
        }}
      >
        Salvar Configurações
      </Button>
    </DialogActions>
  </Dialog>
);

export default ApiKeyDialog;
