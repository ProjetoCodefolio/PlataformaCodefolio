import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  LinearProgress,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  FormHelperText,
  Grid,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SettingsIcon from "@mui/icons-material/Settings";
import KeyIcon from "@mui/icons-material/Key";
import { toast } from "react-toastify";
import {
  GROQ_MODELS,
  createDefaultPrompt,
  JSON_FORMAT_INSTRUCTION,
  formatFriendlyError,
  processPdfAndGenerateQuestions
} from "$api/services/courses/quizGenerator";
import { fetchAllLlmModels } from "$api/services/courses/llmModels";

const PdfQuizGenerator = ({
  onQuestionsGenerated,
  setEditQuestion,
  setNewQuizQuestion,
  setNewQuizOptions,
  setNewQuizCorrectOption,
}) => {
  const [pdfFile, setPdfFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedText, setExtractedText] = useState("");
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [processingStep, setProcessingStep] = useState("");
  const [error, setError] = useState("");
  const [numQuestions, setNumQuestions] = useState(5);
  const fileInputRef = useRef(null);

  // Estados para o diálogo de configurações
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [usingCustomPrompt, setUsingCustomPrompt] = useState(false);

  // Estados para configuração da API
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
  const [customApiKey, setCustomApiKey] = useState("");
  const [usingCustomApiKey, setUsingCustomApiKey] = useState(false);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("meta-llama/llama-4-maverick-17b");

  useEffect(() => {
    // Buscar modelos LLM disponíveis
    const loadModels = async () => {
      try {
        const fetchedModels = await fetchAllLlmModels();
        const modelsArray = Object.values(fetchedModels);
        const activeModels = modelsArray.filter((model) => model.isActive);
        setModels(activeModels);
      } catch (err) {
        console.error("Erro ao buscar modelos LLM:", err);
      }
    };

    loadModels();
  }, []);

  // Recuperar configurações salvas
  useEffect(() => {
    const savedApiKey = localStorage.getItem("groq_custom_api_key");
    const usingCustomKey = localStorage.getItem("groq_using_custom_key");
    const savedModel = localStorage.getItem("groq_selected_model");

    if (savedApiKey) setCustomApiKey(savedApiKey);
    if (usingCustomKey) setUsingCustomApiKey(usingCustomKey === "true");
    if (savedModel && models.some((m) => m.modelId === savedModel))
      setSelectedModel(savedModel);
  }, [models]);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files && files.length) {
      handleFileSelected(files[0]);
    }
  };

  const handleFileSelected = (file) => {
    if (file && file.type === "application/pdf") {
      setPdfFile(file);
      setError("");
    } else {
      setPdfFile(null);
      setError("Por favor, selecione um arquivo PDF válido.");
      toast.error("Formato de arquivo inválido. Selecione um PDF.");
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    handleFileSelected(file);
  };

  const handleNumQuestionsChange = (e) => {
    setNumQuestions(e.target.value);
  };

  // Manipulação do diálogo de configurações
  const handleOpenSettings = () => {
    if (!customPrompt && !usingCustomPrompt) {
      setCustomPrompt(createDefaultPrompt(numQuestions));
    }
    setSettingsOpen(true);
  };

  const handleCloseSettings = () => {
    setSettingsOpen(false);
  };

  const handleSaveSettings = () => {
    if (customPrompt.trim()) {
      // Verifica se o prompt personalizado menciona o formato JSON esperado
      if (
        !customPrompt.includes('"question"') ||
        !customPrompt.includes('"options"') ||
        !customPrompt.includes('"correctOption"')
      ) {
        toast.warning(
          "Atenção: Seu prompt personalizado pode não especificar o formato JSON correto. As instruções de formato serão adicionadas automaticamente."
        );
      }

      setUsingCustomPrompt(true);
      toast.success("Configurações personalizadas de prompt salvas!");
    } else {
      setUsingCustomPrompt(false);
    }
    setSettingsOpen(false);
  };

  const handleResetPrompt = () => {
    setCustomPrompt(createDefaultPrompt(numQuestions));
    toast.info("Prompt restaurado para o padrão");
  };

  // Manipulação do diálogo de chave API
  const handleOpenApiKeyDialog = () => {
    setApiKeyDialogOpen(true);
  };

  const handleCloseApiKeyDialog = () => {
    setApiKeyDialogOpen(false);
  };

  const handleSaveApiKey = () => {
    if (customApiKey.trim()) {
      localStorage.setItem("groq_custom_api_key", customApiKey.trim());
      localStorage.setItem("groq_using_custom_key", "true");
      setUsingCustomApiKey(true);
      toast.success("Chave API personalizada salva!");
    } else {
      localStorage.removeItem("groq_custom_api_key");
      localStorage.setItem("groq_using_custom_key", "false");
      setUsingCustomApiKey(false);
      toast.info("Usando chave API padrão do sistema");
    }
    setApiKeyDialogOpen(false);
  };

  const handleModelChange = (e) => {
    const newModel = e.target.value;
    setSelectedModel(newModel);
    localStorage.setItem("groq_selected_model", newModel);

    const selectedModelInfo = models.find((m) => m.modelId === newModel);
    toast.info(`Modelo alterado para: ${selectedModelInfo?.name || newModel}`);
  };

  const processFile = async () => {
    if (!pdfFile) return;

    setLoading(true);
    setError("");
    setProgress(0);
    setGeneratedQuestions([]);

    try {
      // Determinar qual chave API usar
      let apiKey;
      const usingSystemKey = !usingCustomApiKey || !customApiKey.trim();

      if (usingSystemKey) {
        apiKey = import.meta.env.VITE_GROQ_API_KEY || import.meta.env.REACT_APP_GROQ_API_KEY;
      } else {
        apiKey = customApiKey;
      }

      // Usar a função da API para processar o PDF e gerar questões
      const result = await processPdfAndGenerateQuestions(
        pdfFile, 
        numQuestions, 
        selectedModel, 
        apiKey, 
        usingCustomPrompt ? customPrompt.trim() : null,
        {
          onProgress: setProgress,
          onProcessingStep: setProcessingStep
        }
      );

      setExtractedText(result.text);
      setGeneratedQuestions(result.questions);
      toast.success(`${result.questions.length} questões geradas com sucesso!`);
    } catch (err) {
      // Usar mensagens de erro mais amigáveis
      const friendlyError = formatFriendlyError(err);
      setError(friendlyError);
      toast.error(friendlyError);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToQuiz = () => {
    if (generatedQuestions.length > 0) {
      onQuestionsGenerated(generatedQuestions);
      toast.success(
        `${generatedQuestions.length} questões adicionadas ao quiz!`
      );

      // Reset do estado após adicionar ao quiz
      setPdfFile(null);
      setGeneratedQuestions([]);
      setExtractedText("");
    }
  };

  const handleEditQuestion = (question) => {
    // Configura o formulário para edição da questão selecionada
    setNewQuizQuestion(question.question);
    setNewQuizOptions([...question.options]);
    setNewQuizCorrectOption(question.correctOption);

    // Remove a questão da lista de geradas
    setGeneratedQuestions((prev) => prev.filter((q) => q.id !== question.id));

    // Define a questão para edição
    setEditQuestion({
      id: question.id,
      question: question.question,
      options: question.options,
      correctOption: question.correctOption,
    });

    // Role para o formulário de edição
    setTimeout(() => {
      const formElement = document.getElementById("question-form");
      if (formElement) {
        formElement.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 100);
  };

  const handleDeleteQuestion = (indexToRemove) => {
    setGeneratedQuestions((prev) =>
      prev.filter((_, index) => index !== indexToRemove)
    );
  };

  return (
    <Box sx={{ mt: 3, mb: 4 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: "bold", color: "#333" }}>
          Gerar Questões a partir de PDF
        </Typography>

        <Box>
          <Tooltip title="Configurar chave API GROQ">
            <IconButton
              onClick={handleOpenApiKeyDialog}
              sx={{
                color: usingCustomApiKey ? "#4caf50" : "#666",
                "&:hover": { backgroundColor: "rgba(76, 175, 80, 0.08)" },
              }}
            >
              <KeyIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Configurações do gerador">
            <IconButton
              onClick={handleOpenSettings}
              sx={{
                color: usingCustomPrompt ? "#9041c1" : "#666",
                "&:hover": { backgroundColor: "rgba(144, 65, 193, 0.08)" },
              }}
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Configurações de geração */}
      {!loading && (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel id="num-questions-label">
                Número de Questões
              </InputLabel>
              <Select
                labelId="num-questions-label"
                value={numQuestions}
                onChange={handleNumQuestionsChange}
                label="Número de Questões"
                sx={{ bgcolor: "#f9f9ff" }}
              >
                {[3, 5, 10, 15, 20, 30, 50].map((num) => (
                  <MenuItem key={num} value={num}>
                    {num} questões
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                {numQuestions > 20
                  ? "Grandes conjuntos de questões podem demorar mais"
                  : ""}
              </FormHelperText>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel id="model-select-label">Modelo IA</InputLabel>
              <Select
                labelId="model-select-label"
                value={selectedModel}
                onChange={handleModelChange}
                label="Modelo IA"
                sx={{ bgcolor: "#f9f9ff" }}
              >
                {models.map((model) => (
                  <MenuItem key={model.modelId} value={model.modelId}>
                    {model.name}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                {selectedModel === "meta-llama/llama-4-maverick-17b"
                  ? "Modelo recomendado para melhor qualidade"
                  : selectedModel === "mixtral-8x7b-32768"
                  ? "Melhor para PDFs maiores"
                  : ""}
              </FormHelperText>
            </FormControl>
          </Grid>
        </Grid>
      )}

      <Paper
        sx={{
          p: 3,
          borderRadius: 2,
          border: "2px dashed #9041c1",
          backgroundColor: pdfFile ? "rgba(144, 65, 193, 0.04)" : "#F5F5FA",
          position: "relative",
        }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".pdf"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: "none" }}
        />

        {!pdfFile ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              py: 4,
            }}
          >
            <CloudUploadIcon sx={{ fontSize: 48, color: "#9041c1", mb: 2 }} />
            <Typography variant="h6" color="#333" sx={{ mb: 1 }}>
              Arraste e solte um PDF aqui
            </Typography>
            <Typography variant="body2" color="#666" sx={{ mb: 2 }}>
              ou
            </Typography>
            <Button
              variant="contained"
              onClick={() => fileInputRef.current.click()}
              sx={{
                backgroundColor: "#9041c1",
                "&:hover": { backgroundColor: "#7d37a7" },
              }}
            >
              Selecionar arquivo PDF
            </Button>
          </Box>
        ) : (
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <PictureAsPdfIcon sx={{ color: "#f44336", mr: 1 }} />
              <Typography variant="body1" sx={{ flexGrow: 1 }}>
                {pdfFile.name}
              </Typography>
              <Button
                variant="outlined"
                color="secondary"
                size="small"
                onClick={() => setPdfFile(null)}
                disabled={loading}
              >
                Alterar
              </Button>
            </Box>

            {loading ? (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  {processingStep}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: "rgba(144, 65, 193, 0.2)",
                    "& .MuiLinearProgress-bar": {
                      backgroundColor: "#9041c1",
                    },
                  }}
                />
                {numQuestions > 20 && (
                  <Typography
                    variant="caption"
                    sx={{ display: "block", mt: 1, color: "text.secondary" }}
                  >
                    Gerando {numQuestions} questões. Isso pode levar mais
                    tempo...
                  </Typography>
                )}
              </Box>
            ) : (
              <Button
                variant="contained"
                startIcon={<AutoFixHighIcon />}
                onClick={processFile}
                fullWidth
                sx={{
                  mt: 1,
                  backgroundColor: "#9041c1",
                  "&:hover": { backgroundColor: "#7d37a7" },
                }}
              >
                Gerar {numQuestions} Questões com{" "}
                {models.find((m) => m.modelId === selectedModel)?.name}
              </Button>
            )}
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Paper>

      {generatedQuestions.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography
            variant="h6"
            sx={{ display: "flex", alignItems: "center" }}
          >
            <CheckCircleIcon sx={{ color: "green", mr: 1 }} />
            {generatedQuestions.length} questões geradas
          </Typography>

          <List
            sx={{
              mt: 2,
              bgcolor: "#f5f5fa",
              borderRadius: 2,
              p: 2,
              maxHeight: "500px",
              overflow: "auto",
            }}
          >
            {generatedQuestions.map((question, index) => (
              <ListItem
                key={index}
                sx={{ backgroundColor: "white", mb: 1, borderRadius: 1 }}
              >
                <ListItemText
                  primary={`${index + 1}. ${question.question}`}
                  secondary={
                    <Box component="div" sx={{ mt: 1 }}>
                      {question.options.map((opt, i) => (
                        <Box
                          key={i}
                          component="div"
                          sx={{ display: "block", my: 0.5 }}
                        >
                          <span
                            style={{
                              fontWeight:
                                i === question.correctOption
                                  ? "bold"
                                  : "normal",
                              color:
                                i === question.correctOption
                                  ? "green"
                                  : "inherit",
                            }}
                          >
                            {String.fromCharCode(65 + i)}) {opt}
                          </span>
                        </Box>
                      ))}
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Tooltip title="Editar questão">
                    <IconButton
                      edge="end"
                      onClick={() => handleEditQuestion(question)}
                      sx={{ color: "#9041c1", mr: 1 }}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Remover questão">
                    <IconButton
                      edge="end"
                      onClick={() => handleDeleteQuestion(index)}
                      sx={{ color: "#d32f2f" }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>

          <Button
            variant="contained"
            color="primary"
            onClick={handleAddToQuiz}
            sx={{
              mt: 2,
              backgroundColor: "#4caf50",
              "&:hover": { backgroundColor: "#388e3c" },
            }}
          >
            Adicionar {generatedQuestions.length} Questões ao Quiz
          </Button>
        </Box>
      )}

      {/* Diálogo de configurações do prompt */}
      <Dialog
        open={settingsOpen}
        onClose={handleCloseSettings}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: "#f5f5fa" }}>
          Configurações do Gerador de Questões
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Personalize o prompt usado para gerar questões. As instruções de
            formato JSON serão adicionadas automaticamente ao final do seu
            prompt.
          </Typography>

          <Box
            sx={{
              p: 2,
              mb: 2,
              bgcolor: "rgba(25, 118, 210, 0.08)",
              borderLeft: "4px solid #1976d2",
              borderRadius: 1,
            }}
          >
            <Typography variant="subtitle2" color="primary">
              Formato obrigatório (não editável)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
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
              }}
            >
              <pre style={{ margin: 0 }}>{JSON_FORMAT_INSTRUCTION.trim()}</pre>
            </Box>
            <Typography variant="caption" color="text.secondary">
              Esta parte será sempre adicionada ao seu prompt personalizado para
              garantir a compatibilidade do formato.
            </Typography>
          </Box>

          <TextField
            label="Prompt personalizado"
            multiline
            rows={15}
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
              },
              fontFamily: "monospace",
            }}
          />

          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              O texto do PDF será anexado após as instruções de formato.
              Certifique-se de incluir uma referência a ele em suas instruções
              personalizadas.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleResetPrompt} color="secondary">
            Restaurar Padrão
          </Button>
          <Button onClick={handleCloseSettings} color="inherit">
            Cancelar
          </Button>
          <Button
            onClick={handleSaveSettings}
            variant="contained"
            sx={{
              backgroundColor: "#9041c1",
              "&:hover": { backgroundColor: "#7d37a7" },
            }}
          >
            Salvar Configurações
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de configuração da API */}
      <Dialog
        open={apiKeyDialogOpen}
        onClose={handleCloseApiKeyDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: "#f5f5fa" }}>
          Configurar Chave API GROQ
        </DialogTitle>
        <DialogContent dividers>
          <Typography
            variant="body2"
            color="text.secondary"
            gutterBottom
            sx={{ mb: 2 }}
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
              },
            }}
            helperText="Sua chave API será armazenada apenas no seu navegador e nunca enviada para nossos servidores."
          />

          <Box
            sx={{
              mt: 3,
              bgcolor: "rgba(76, 175, 80, 0.08)",
              p: 2,
              borderRadius: 1,
              borderLeft: "4px solid #4caf50",
            }}
          >
            <Typography variant="subtitle2" color="primary.main">
              Como obter uma chave API GROQ?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              1. Acesse{" "}
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noopener noreferrer"
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
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseApiKeyDialog} color="inherit">
            Cancelar
          </Button>
          <Button
            onClick={handleSaveApiKey}
            variant="contained"
            sx={{
              backgroundColor: "#4caf50",
              "&:hover": { backgroundColor: "#388e3c" },
            }}
          >
            Salvar Configurações
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PdfQuizGenerator;
