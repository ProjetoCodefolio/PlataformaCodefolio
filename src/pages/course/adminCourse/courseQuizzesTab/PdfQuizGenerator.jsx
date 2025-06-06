import React, { useState, useRef } from "react";
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
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import * as pdfjs from "pdfjs-dist";
import { toast } from "react-toastify";
import { v4 as uuidv4 } from "uuid";

// Defina o worker para o pdfjs
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;


const createGroqPrompt = (pdfText, numQuestions) => `
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
4. Evite padrões óbvios nas respostas corretas (como sempre ser a alternativa A).
5. As alternativas devem ter comprimento e estilo semelhantes entre si.

Estruture cada questão em formato JSON com:
- Uma pergunta clara e direta
- 4 alternativas de resposta
- O índice da alternativa correta (0 para A, 1 para B, 2 para C, 3 para D)

Apresente as questões em um array JSON com este formato:
[
  {
    "question": "Pergunta baseada no texto?",
    "options": ["Alternativa A", "Alternativa B", "Alternativa C", "Alternativa D"],
    "correctOption": 0
  }
]

O texto para análise é:

${pdfText}
`;

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

      // Limitar o texto a um tamanho razoável para a API
      const maxLength = 15000;
      if (text.length > maxLength) {
        text = text.substring(0, maxLength) + "...";
      }

      return text;
    } catch (error) {
      console.error("Erro ao extrair texto do PDF:", error);
      throw new Error("Não foi possível extrair o texto do PDF.");
    }
  };

  const parseGroqResponse = (responseContent) => {
    // Log para debug (apenas no console, não visível ao usuário)
    console.log("Resposta bruta da API:", responseContent);

    // Tentativa 1: Tentar analisar diretamente como JSON
    try {
      const parsed = JSON.parse(responseContent);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (e) {
      console.log("Não foi possível analisar diretamente como JSON", e);
    }

    // Tentativa 2: Procurar por array JSON na resposta
    try {
      const jsonRegex = /\[\s*\{[\s\S]*\}\s*\]/g;
      const matches = responseContent.match(jsonRegex);
      if (matches && matches.length > 0) {
        return JSON.parse(matches[0]);
      }
    } catch (e) {
      console.log("Não foi possível extrair JSON com regex", e);
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
      console.log("Não foi possível extrair JSON de blocos markdown", e);
    }

    // Se chegou aqui, não conseguimos extrair o JSON
    throw new Error("Não foi possível extrair o formato JSON da resposta");
  };

  const generateQuestionsWithGroq = async (pdfText) => {
    try {
      setProcessingStep("Gerando questões com GROQ...");

      // Usar a chave API do arquivo .env - suportando tanto VITE quanto REACT_APP
      const apiKey =
        import.meta.env.VITE_GROQ_API_KEY ||
        import.meta.env.REACT_APP_GROQ_API_KEY;

      if (!apiKey) {
        throw new Error(
          "Chave API do GROQ não configurada no arquivo .env. Use VITE_GROQ_API_KEY ou REACT_APP_GROQ_API_KEY."
        );
      }

      // Preparar o prompt para o GROQ com o texto do PDF e o número de questões
      const prompt = createGroqPrompt(pdfText, numQuestions);

      // URL da API GROQ
      const apiUrl = "https://api.groq.com/openai/v1/chat/completions";

      // Enviar a solicitação para a API GROQ
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "llama3-70b-8192",
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
        throw new Error(
          `Erro na API GROQ: ${response.status} - ${
            errorData.error?.message || "Erro desconhecido"
          }`
        );
      }

      const data = await response.json();
      const content = data.choices[0].message.content;

      // Processar a resposta para extrair as questões
      try {
        // Usar função melhorada para extrair JSON
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
          throw new Error("Nenhuma questão válida foi gerada.");
        }

        // Adicionar IDs únicos se não existirem
        const finalQuestions = validatedQuestions.map((q, index) => ({
          ...q,
          id:
            q.id ||
            `pdf-gen-${Date.now()}-${index}-${uuidv4().substring(0, 8)}`,
        }));

        return finalQuestions;
      } catch (jsonError) {
        console.error("Erro ao analisar JSON:", jsonError);
        throw new Error("Não foi possível processar as questões geradas.");
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
      toast.success("Questões geradas com sucesso!");
    } catch (err) {
      setError(`Erro: ${err.message}`);
      toast.error(`Erro ao processar o PDF: ${err.message}`);
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
      <Typography
        variant="h6"
        sx={{ mb: 2, fontWeight: "bold", color: "#333" }}
      >
        Gerar Questões a partir de PDF
      </Typography>

      {/* Seleção do número de questões */}
      {!loading && (
        <Box sx={{ mb: 2 }}>
          <FormControl fullWidth variant="outlined" size="small">
            <InputLabel id="num-questions-label">Número de Questões</InputLabel>
            <Select
              labelId="num-questions-label"
              value={numQuestions}
              onChange={handleNumQuestionsChange}
              label="Número de Questões"
              sx={{ bgcolor: "#f9f9ff" }}
            >
              {[3, 5, 7, 10].map((num) => (
                <MenuItem key={num} value={num}>
                  {num} questões
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
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
                Gerar {numQuestions} Questões
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

          <List sx={{ mt: 2, bgcolor: "#f5f5fa", borderRadius: 2, p: 2 }}>
            {generatedQuestions.map((question, index) => (
              <ListItem
                key={index}
                sx={{ backgroundColor: "white", mb: 1, borderRadius: 1 }}
              >
                <ListItemText
                  primary={`${index + 1}. ${question.question}`}
                  secondary={
                    <>
                      <Typography variant="body2" component="span">
                        {question.options.map((opt, i) => (
                          <Box
                            key={i}
                            component="span"
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
                      </Typography>
                    </>
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
            Adicionar Questões ao Quiz
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default PdfQuizGenerator;
