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
import * as pdfjs from "pdfjs-dist";
import { toast } from "react-toastify";
import { v4 as uuidv4 } from "uuid";

// Defina o worker para o pdfjs
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

// Modelos GROQ disponíveis
const GROQ_MODELS = [
  {
    id: "llama3-70b-8192",
    name: "Llama 3 70B (Recomendado)",
    maxContext: 8192,
  },
  { id: "llama3-8b-8192", name: "Llama 3 8B", maxContext: 8192 },
  { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B", maxContext: 32768 },
  { id: "gemma-7b-it", name: "Gemma 7B", maxContext: 8192 },
];

// Prompt padrão movido para uma função separada que pode ser modificada
const createDefaultPrompt = (numQuestions) => `
Você é um professor especializado em criar avaliações educacionais de alta qualidade.

Com base exclusivamente no texto a seguir, crie ${numQuestions} questões de múltipla escolha que avaliem a compreensão dos conceitos principais e informações específicas contidas no texto.

Diretrizes para as questões:
1. Foque exclusivamente no conteúdo fornecido, sem introduzir informações externas.
2. Crie perguntas que testem diferentes níveis de compreensão (fatos específicos, conceitos-chave, relações entre ideias).
3. As perguntas devem ser claras, objetivas e diretamente relacionadas a partes importantes do texto.
4. Evite questões sobre detalhes irrelevantes ou triviais.

Diretrizes para as alternativas:
1. Inclua 4 alternativas para cada questão (A, B, C, D).
2. Apenas uma alternativa deve estar correta.
3. As alternativas incorretas devem ser plausíveis, mas claramente incorretas para quem leu o texto atentamente.
4. Varie aleatoriamente a posição da resposta correta entre as alternativas.
5. As alternativas devem ter comprimento e estilo semelhantes entre si.
`;

// Parte fixa do prompt que garantirá o formato correto das respostas
// Esta parte é fixa e não editável pelo usuário
const JSON_FORMAT_INSTRUCTION = `
IMPORTANTE: É necessário gerar EXATAMENTE o número de questões solicitado, nem mais nem menos.

A saída DEVE ser um array JSON com esta estrutura:
[
  {
    "question": "Pergunta baseada no texto?",
    "options": ["Alternativa A", "Alternativa B", "Alternativa C", "Alternativa D"],
    "correctOption": 0
  }
]

Qualquer outro formato não será processado corretamente.
`;

const createPrompt = (pdfText, numQuestions, customPrompt) => {
  // Se tivermos um prompt personalizado, use-o, caso contrário use o padrão
  const promptTemplate = customPrompt || createDefaultPrompt(numQuestions);

  // Adiciona as instruções fixas de formato JSON antes do texto do PDF
  return (
    promptTemplate +
    "\n\n" +
    JSON_FORMAT_INSTRUCTION +
    "\n\nO texto para análise é:\n\n" +
    pdfText
  );
};

// Função para formatar mensagens de erro amigáveis
const formatFriendlyError = (error) => {
  const errorMsg = error.message || String(error);

  // Casos comuns de erro com mensagens amigáveis
  if (errorMsg.includes("API GROQ") || errorMsg.includes("401")) {
    return "Erro de autenticação na API GROQ. Verifique se a chave API está correta e válida.";
  } else if (errorMsg.includes("429")) {
    return "Limite de requisições excedido. A API GROQ está sobrecarregada ou sua cota foi atingida. Tente novamente mais tarde.";
  } else if (
    errorMsg.includes("500") ||
    errorMsg.includes("502") ||
    errorMsg.includes("503")
  ) {
    return "Os servidores da GROQ estão com problemas neste momento. Tente novamente mais tarde.";
  } else if (
    errorMsg.includes("No content") ||
    errorMsg.includes("text content is empty")
  ) {
    return "Não foi possível extrair texto do PDF. O arquivo pode estar protegido ou contém apenas imagens.";
  } else if (errorMsg.includes("JSON")) {
    return "Erro ao processar as questões geradas pela IA. Tente novamente ou escolha outro modelo.";
  } else if (
    errorMsg.includes("NetworkError") ||
    errorMsg.includes("Failed to fetch")
  ) {
    return "Erro de conexão. Verifique sua internet e tente novamente.";
  } else if (errorMsg.includes("chave API")) {
    return errorMsg; // Já é uma mensagem amigável
  }

  // Caso genérico
  return `Erro: ${errorMsg}. Tente novamente ou entre em contato com o suporte.`;
};

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
  const [selectedModel, setSelectedModel] = useState("llama3-70b-8192");

  // Recuperar configurações salvas
  useEffect(() => {
    const savedApiKey = localStorage.getItem("groq_custom_api_key");
    const usingCustomKey = localStorage.getItem("groq_using_custom_key");
    const savedModel = localStorage.getItem("groq_selected_model");

    if (savedApiKey) setCustomApiKey(savedApiKey);
    if (usingCustomKey) setUsingCustomApiKey(usingCustomKey === "true");
    if (savedModel && GROQ_MODELS.some((m) => m.id === savedModel))
      setSelectedModel(savedModel);
  }, []);

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

    const selectedModelInfo = GROQ_MODELS.find((m) => m.id === newModel);
    toast.info(`Modelo alterado para: ${selectedModelInfo?.name || newModel}`);
  };

  const extractTextFromPdf = async (file) => {
    try {
      setProcessingStep("Extraindo texto do PDF...");

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;
      let text = "";

      for (let i = 1; i <= numPages; i++) {
        setProgress(Math.round((i / numPages) * 50)); // Primeira metade do progresso (0-50%)
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map((item) => item.str).join(" ");
        text += pageText + "\n";
      }

      // Ajustar o tamanho máximo com base no modelo selecionado
      const selectedModelInfo = GROQ_MODELS.find((m) => m.id === selectedModel);
      const maxContextSize = selectedModelInfo
        ? selectedModelInfo.maxContext
        : 8192;

      // Converter para tokens aproximados (1 token ~= 4 caracteres)
      // Mantendo margem para o prompt e resposta
      const maxLength = Math.floor(maxContextSize * 0.75 * 4);

      if (text.length > maxLength) {
        text = text.substring(0, maxLength) + "...";
        toast.info(
          "O PDF é muito grande. Apenas parte do texto será usado para gerar questões."
        );
      }

      if (!text.trim()) {
        throw new Error(
          "Não foi possível extrair texto deste PDF. O arquivo pode estar protegido ou contém apenas imagens."
        );
      }

      return text;
    } catch (error) {
      console.error("Erro ao extrair texto do PDF:", error);
      throw new Error(
        "Não foi possível ler o texto do PDF. O arquivo pode estar danificado ou protegido."
      );
    }
  };

  const parseGroqResponse = (responseContent) => {
    // Tentativa 1: Tentar analisar diretamente como JSON
    try {
      const parsed = JSON.parse(responseContent);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (e) {
      // Erro silencioso, tentaremos outro método
    }

    // Tentativa 2: Procurar por array JSON na resposta
    try {
      const jsonRegex = /\[\s*\{[\s\S]*\}\s*\]/g;
      const matches = responseContent.match(jsonRegex);
      if (matches && matches.length > 0) {
        return JSON.parse(matches[0]);
      }
    } catch (e) {
      // Erro silencioso, tentaremos outro método
    }

    // Tentativa 3: Procurar por blocos de código markdown
    try {
      const markdownCodeRegex = /```(?:json)?([\s\S]*?)```/g;
      const codeMatches = [...responseContent.matchAll(markdownCodeRegex)];
      if (codeMatches && codeMatches.length > 0) {
        const jsonContent = codeMatches[0][1].trim();
        return JSON.parse(jsonContent);
      }
    } catch (e) {
      // Erro silencioso, não há mais métodos
    }

    // Se chegou aqui, não conseguimos extrair o JSON
    throw new Error(
      "A IA não retornou as questões no formato correto. Tente novamente ou escolha outro modelo."
    );
  };

  const generateQuestionsWithGroq = async (pdfText) => {
    try {
      const selectedModelInfo = GROQ_MODELS.find((m) => m.id === selectedModel);
      setProcessingStep(
        `Gerando ${numQuestions} questões com ${
          selectedModelInfo?.name || selectedModel
        }...`
      );

      // Determinar qual chave API usar
      let apiKey;
      const usingSystemKey = !usingCustomApiKey || !customApiKey.trim();

      if (usingSystemKey) {
        apiKey =
          import.meta.env.VITE_GROQ_API_KEY ||
          import.meta.env.REACT_APP_GROQ_API_KEY;
      } else {
        apiKey = customApiKey;
      }

      if (!apiKey) {
        throw new Error(
          "Nenhuma chave API GROQ disponível. Configure uma chave nas configurações ou entre em contato com o suporte."
        );
      }

      // Preparar o prompt para o GROQ com o texto do PDF e o número de questões
      // Usa prompt personalizado se disponível
      const promptToUse =
        usingCustomPrompt && customPrompt.trim()
          ? customPrompt.trim()
          : createDefaultPrompt(numQuestions);

      const prompt = createPrompt(pdfText, numQuestions, promptToUse);

      // URL da API GROQ
      const apiUrl = "https://api.groq.com/openai/v1/chat/completions";

      try {
        // Enviar a solicitação para a API GROQ
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: [
              {
                role: "system",
                content:
                  "Você é um professor especializado em criar avaliações educacionais de alta qualidade. Retorne questões de múltipla escolha em formato JSON sem explicações adicionais.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            temperature: 0.2,
            max_tokens: 4000,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));

          if (response.status === 401) {
            throw new Error(
              "A chave API GROQ fornecida é inválida ou expirou."
            );
          } else if (response.status === 429) {
            throw new Error(
              "Limite de requisições da API GROQ excedido. Tente novamente mais tarde."
            );
          } else {
            throw new Error(
              `Erro no serviço GROQ (código ${response.status}). Tente novamente mais tarde.`
            );
          }
        }

        const data = await response.json();
        const content = data.choices[0].message.content;

        // Processar a resposta para extrair as questões
        const parsedQuestions = parseGroqResponse(content);

        // Validar cada questão
        const validatedQuestions = parsedQuestions.filter(
          (q) =>
            q &&
            q.question &&
            Array.isArray(q.options) &&
            q.options.length >= 2 &&
            typeof q.correctOption === "number"
        );

        if (validatedQuestions.length === 0) {
          throw new Error(
            "A IA não conseguiu gerar questões válidas baseadas neste texto."
          );
        }

        // Ajustar para o número exato de questões
        let finalQuestions;

        if (validatedQuestions.length > numQuestions) {
          // Se temos questões extras, pegamos apenas a quantidade solicitada
          finalQuestions = validatedQuestions.slice(0, numQuestions);
        } else if (validatedQuestions.length < numQuestions) {
          // Se faltam questões, duplicamos algumas com pequenas variações
          finalQuestions = [...validatedQuestions];
          const missingCount = numQuestions - validatedQuestions.length;

          for (let i = 0; i < missingCount; i++) {
            const baseIndex = i % validatedQuestions.length;
            const baseQuestion = validatedQuestions[baseIndex];

            // Cria variante para completar o número necessário
            const newQuestion = {
              ...baseQuestion,
              question: `${baseQuestion.question} (variação ${i + 1})`,
              options: [...baseQuestion.options],
            };

            finalQuestions.push(newQuestion);
          }
        } else {
          finalQuestions = validatedQuestions;
        }

        // Adicionar IDs únicos
        return finalQuestions.map((q, index) => ({
          ...q,
          id:
            q.id ||
            `pdf-gen-${Date.now()}-${index}-${uuidv4().substring(0, 8)}`,
        }));
      } catch (fetchError) {
        console.error("Erro na comunicação com a API:", fetchError);
        throw new Error(
          fetchError.message ||
            "Erro ao comunicar com a API GROQ. Verifique sua conexão."
        );
      }
    } catch (error) {
      console.error("Erro ao gerar questões:", error);
      throw error;
    }
  };

  const processFile = async () => {
    if (!pdfFile) return;

    setLoading(true);
    setError("");
    setProgress(0);
    setGeneratedQuestions([]);

    try {
      // Extrair texto do PDF
      const text = await extractTextFromPdf(pdfFile);
      setExtractedText(text);

      // Gerar questões com GROQ
      setProgress(50);
      const questions = await generateQuestionsWithGroq(text);
      setProgress(90);

      // Finalizar
      setGeneratedQuestions(questions);
      setProgress(100);
      toast.success(`${questions.length} questões geradas com sucesso!`);
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
                {GROQ_MODELS.map((model) => (
                  <MenuItem key={model.id} value={model.id}>
                    {model.name}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                {selectedModel === "llama3-70b-8192"
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
                {GROQ_MODELS.find((m) => m.id === selectedModel)?.name}
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
