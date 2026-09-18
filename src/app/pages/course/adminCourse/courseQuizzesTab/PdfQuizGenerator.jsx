import { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  LinearProgress,
  IconButton,
  Collapse,
  List,
  ListItem,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Grid,
  Chip,
  FormHelperText,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SettingsIcon from "@mui/icons-material/Settings";
import KeyIcon from "@mui/icons-material/Key";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import ContentPasteIcon from "@mui/icons-material/ContentPaste";
import { QUESTION_TYPES } from "$api/services/courses/quizGenerator/constants";

import PromptSettingsDialog from "./PromptSettingsDialog";
import ApiKeyDialog from "./ApiKeyDialog";
import PasteQuestionsDialog from "./PasteQuestionsDialog";
import { usePdfUpload } from "./hooks/usePdfUpload";
import { useGroqSettings } from "./hooks/useGroqSettings";
import { usePromptSettings } from "./hooks/usePromptSettings";
import { usePdfQuizGeneration } from "./hooks/usePdfQuizGeneration";
import { useGeneratedQuestionsEditor } from "./hooks/useGeneratedQuestionsEditor";
import { toast } from "react-toastify";

const PdfQuizGenerator = ({ onQuestionsGenerated }) => {
  const [numQuestions, setNumQuestions] = useState(5);
  const [pasteDialogOpen, setPasteDialogOpen] = useState(false);
  const [questionType, setQuestionType] = useState(QUESTION_TYPES.MULTIPLE_CHOICE);

  const pdfUpload = usePdfUpload();
  const groqSettings = useGroqSettings();
  const promptSettings = usePromptSettings({ numQuestions, questionType });
  const generation = usePdfQuizGeneration({
    pdfFile: pdfUpload.pdfFile,
    numQuestions,
    questionType,
    resolveApiKey: groqSettings.resolveApiKey,
    cadeiaDeGeracao: groqSettings.cadeiaDeGeracao,
    getPromptToUse: promptSettings.getPromptToUse,
  });
  const questionsEditor = useGeneratedQuestionsEditor({
    generatedQuestions: generation.generatedQuestions,
    setGeneratedQuestions: generation.setGeneratedQuestions,
  });

  // Sem catálogo carregado não há modelo para mandar ao provedor, e sem
  // nenhum modelo ativo não há geração possível: nos dois casos o botão fica
  // bloqueado em vez de disparar uma chamada que já nasce perdida.
  const geracaoBloqueada =
    groqSettings.modelsLoading || groqSettings.noActiveModels;

  // A colagem de JSON é uma segunda FONTE da mesma esteira: as questões caem
  // na área de conferência do gerador, e a gravação continua sendo uma só.
  const handleQuestionsParsed = (questoes) => {
    generation.setGeneratedQuestions(questoes);
    toast.success(
      `${questoes.length} ${
        questoes.length === 1 ? "questão colada" : "questões coladas"
      }. Confira antes de adicionar ao quiz.`
    );
  };

  const handleNumQuestionsChange = (e) => setNumQuestions(e.target.value);
  const handleQuestionTypeChange = (e) => setQuestionType(e.target.value);

  const handleAddToQuiz = () => {
    if (generation.generatedQuestions.length > 0) {
      onQuestionsGenerated(generation.generatedQuestions);
      toast.success(
        `${generation.generatedQuestions.length} questões adicionadas ao quiz!`
      );

      // Reset do estado após adicionar ao quiz
      pdfUpload.resetFile();
      generation.resetResults();
    }
  };

  const displayError = pdfUpload.error || generation.error;

  return (
    <Box sx={{ mt: 3, mb: 4 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
          flexDirection: { xs: "column", sm: "row" },
          gap: 1,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: "bold",
            color: "#333",
            fontSize: { xs: "1rem", sm: "1.25rem" },
          }}
        >
          Gerar ou Colar Questões
        </Typography>

        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Tooltip title="Colar questões prontas em JSON">
            <IconButton
              onClick={() => setPasteDialogOpen(true)}
              sx={{
                color: "#666",
                "&:hover": { backgroundColor: "rgba(144, 65, 193, 0.08)" },
              }}
            >
              <ContentPasteIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Configurar chave API GROQ">
            <IconButton
              onClick={groqSettings.handleOpenApiKeyDialog}
              sx={{
                color: groqSettings.usingCustomApiKey ? "#4caf50" : "#666",
                "&:hover": { backgroundColor: "rgba(76, 175, 80, 0.08)" },
              }}
            >
              <KeyIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Configurações do gerador">
            <IconButton
              onClick={promptSettings.handleOpenSettings}
              sx={{
                color: promptSettings.usingCustomPrompt ? "#9041c1" : "#666",
                "&:hover": { backgroundColor: "rgba(144, 65, 193, 0.08)" },
              }}
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Configurações de geração */}
      {!generation.loading && (
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
              <InputLabel id="question-type-label">Tipo de Questão</InputLabel>
              <Select
                labelId="question-type-label"
                value={questionType}
                onChange={handleQuestionTypeChange}
                label="Tipo de Questão"
                sx={{ bgcolor: "#f9f9ff" }}
              >
                <MenuItem value={QUESTION_TYPES.MULTIPLE_CHOICE}>
                  Múltipla Escolha
                </MenuItem>
                <MenuItem value={QUESTION_TYPES.OPEN}>
                  Abertas (Dissertativas)
                </MenuItem>
              </Select>
              <FormHelperText>
                {questionType === QUESTION_TYPES.OPEN
                  ? "Questões com resposta livre"
                  : "Questões com 4 alternativas"}
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
          backgroundColor: pdfUpload.pdfFile ? "rgba(144, 65, 193, 0.04)" : "#F5F5FA",
          position: "relative",
        }}
        onDragOver={pdfUpload.handleDragOver}
        onDrop={pdfUpload.handleDrop}
      >
        <input
          type="file"
          accept=".pdf"
          ref={pdfUpload.fileInputRef}
          onChange={pdfUpload.handleFileChange}
          style={{ display: "none" }}
        />

        {!pdfUpload.pdfFile ? (
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
            <CloudUploadIcon
              sx={{
                fontSize: { xs: 40, sm: 48 },
                color: "#9041c1",
                mb: 2,
              }}
            />
            <Typography
              variant="h6"
              color="#333"
              sx={{
                mb: 1,
                fontSize: { xs: "1rem", sm: "1.25rem" },
              }}
            >
              Arraste e solte um PDF aqui
            </Typography>
            <Typography
              variant="body2"
              color="#666"
              sx={{
                mb: 2,
                fontSize: { xs: "0.813rem", sm: "0.875rem" },
              }}
            >
              ou
            </Typography>
            <Button
              variant="contained"
              onClick={() => pdfUpload.fileInputRef.current.click()}
              sx={{
                backgroundColor: "#9041c1",
                "&:hover": { backgroundColor: "#7d37a7" },
                fontSize: { xs: "0.813rem", sm: "0.875rem" },
                px: { xs: 2, sm: 3 },
              }}
            >
              Selecionar arquivo PDF
            </Button>
          </Box>
        ) : (
          <Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                mb: 2,
                flexDirection: { xs: "column", sm: "row" },
                gap: 1,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  flex: 1,
                  width: { xs: "100%", sm: "auto" },
                }}
              >
                <PictureAsPdfIcon sx={{ color: "#f44336", mr: 1 }} />
                <Typography
                  variant="body1"
                  sx={{
                    flexGrow: 1,
                    fontSize: { xs: "0.875rem", sm: "1rem" },
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {pdfUpload.pdfFile.name}
                </Typography>
              </Box>
              <Button
                variant="outlined"
                color="secondary"
                size="small"
                onClick={pdfUpload.resetFile}
                disabled={generation.loading}
                sx={{
                  fontSize: { xs: "0.75rem", sm: "0.813rem" },
                  width: { xs: "100%", sm: "auto" },
                }}
              >
                Alterar
              </Button>
            </Box>

            {generation.loading ? (
              <Box sx={{ mt: 2 }}>
                <Typography
                  variant="body2"
                  sx={{
                    mb: 1,
                    fontSize: { xs: "0.813rem", sm: "0.875rem" },
                  }}
                >
                  {generation.processingStep}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={generation.progress}
                  sx={{
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: "rgba(144, 65, 193, 0.2)",
                    "& .MuiLinearProgress-bar": {
                      backgroundColor: "#9041c1",
                    },
                  }}
                />
                {generation.processingStep.toLowerCase().includes('ocr') && (
                  <Typography
                    variant="caption"
                    sx={{
                      display: "block",
                      mt: 1,
                      color: "warning.main",
                      fontSize: { xs: "0.75rem", sm: "0.813rem" },
                    }}
                  >
                    🔍 Usando OCR para extrair texto de imagens. Isso pode levar mais tempo...
                  </Typography>
                )}
                {numQuestions > 20 && !generation.processingStep.toLowerCase().includes('ocr') && (
                  <Typography
                    variant="caption"
                    sx={{
                      display: "block",
                      mt: 1,
                      color: "text.secondary",
                      fontSize: { xs: "0.75rem", sm: "0.813rem" },
                    }}
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
                onClick={generation.processFile}
                disabled={geracaoBloqueada}
                fullWidth
                sx={{
                  mt: 1,
                  backgroundColor: "#9041c1",
                  "&:hover": { backgroundColor: "#7d37a7" },
                  fontSize: { xs: "0.813rem", sm: "0.875rem" },
                  py: { xs: 1, sm: 1.5 },
                }}
              >
                {groqSettings.modelsLoading
                  ? "Carregando modelos..."
                  : `Gerar ${numQuestions} Questões com GPT-5.5`}
              </Button>
            )}
          </Box>
        )}

        {groqSettings.noActiveModels && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Nenhum modelo de IA está ativo no catálogo. Peça a um administrador
            para habilitar um modelo em Poderes de Admin, Modelos LLM.
          </Alert>
        )}

        {displayError && (
          <Alert
            severity="error"
            sx={{
              mt: 2,
              '& .MuiAlert-message': {
                whiteSpace: 'pre-line' // Permite quebras de linha nas mensagens
              }
            }}
          >
            {displayError}
          </Alert>
        )}
      </Paper>

      {generation.generatedQuestions.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 1,
            }}
          >
            <Typography
              variant="h6"
              sx={{
                display: "flex",
                alignItems: "center",
                fontSize: { xs: "1rem", sm: "1.25rem" },
              }}
            >
              <CheckCircleIcon sx={{ color: "green", mr: 1 }} />
              {generation.generatedQuestions.length} questões geradas
            </Typography>

            {generation.provider && (
              <Tooltip
                title={
                  generation.provider === "question_api"
                    ? "Geradas pela IA própria da Codefolio (GPT-5.5), o provedor principal."
                    : "Geradas pela GROQ, usada como provedor de fallback."
                }
              >
                <Chip
                  size="small"
                  icon={
                    generation.provider === "question_api" ? (
                      <AutoFixHighIcon />
                    ) : (
                      <KeyIcon />
                    )
                  }
                  label={
                    generation.provider === "question_api"
                      ? "IA Codefolio • GPT-5.5"
                      : "GROQ (fallback)"
                  }
                  sx={{
                    fontWeight: 600,
                    color: "#fff",
                    backgroundColor:
                      generation.provider === "question_api" ? "#9041c1" : "#f59e0b",
                    "& .MuiChip-icon": { color: "#fff" },
                  }}
                />
              </Tooltip>
            )}
          </Box>

          <List
            sx={{
              mt: 2,
              bgcolor: "#f5f5fa",
              borderRadius: 2,
              p: { xs: 1, sm: 2 },
              maxHeight: "500px",
              overflow: "auto",
            }}
          >
            {generation.generatedQuestions.map((question, index) => {
              const isEditing = questionsEditor.editingGeneratedIndex === index;
              const isOpenEnded = !question.options;

              return (
              <ListItem
                key={index}
                sx={{
                  backgroundColor: "white",
                  mb: 1,
                  borderRadius: 1,
                  flexDirection: "column",
                  alignItems: "stretch",
                  py: { xs: 2, sm: 1 },
                  px: { xs: 1.5, sm: 2 },
                  gap: 1,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      flex: 1,
                      fontSize: { xs: "0.875rem", sm: "1rem" },
                      wordBreak: "break-word",
                      overflowWrap: "break-word",
                    }}
                  >
                    {index + 1}. {question.question}
                  </Typography>

                  <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
                    <Tooltip title={isEditing ? "Fechar edição" : "Editar questão"}>
                      <IconButton
                        onClick={() => questionsEditor.toggleInlineEdit(index)}
                        sx={{ color: "#9041c1" }}
                        size="small"
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Remover questão">
                      <IconButton
                        onClick={() => questionsEditor.handleDeleteQuestion(index)}
                        sx={{ color: "#d32f2f" }}
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                <Box component="span" sx={{ mt: 0.5, display: "block" }}>
                  {question.options ? (
                    <>
                      <Typography
                        variant="caption"
                        sx={{
                          display: "block",
                          mb: 0.5,
                          color: "#666",
                          fontSize: { xs: "0.75rem", sm: "0.813rem" },
                        }}
                      >
                        <strong>Alternativas:</strong>
                      </Typography>
                      {question.options.map((opt, i) => (
                        <Box
                          key={i}
                          component="span"
                          sx={{ display: "block", my: 0.5 }}
                        >
                          <span
                            style={{
                              fontWeight:
                                i === question.correctOption ? "bold" : "normal",
                              color:
                                i === question.correctOption ? "green" : "inherit",
                              fontSize: "0.875rem",
                            }}
                          >
                            <strong>Opção {i + 1}:</strong> {opt}
                          </span>
                        </Box>
                      ))}
                    </>
                  ) : (
                    <>
                      <Typography
                        variant="caption"
                        sx={{
                          display: "block",
                          mb: 0.5,
                          color: "#666",
                          fontSize: { xs: "0.75rem", sm: "0.813rem" },
                        }}
                      >
                        <strong>Resposta Sugerida:</strong>
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          display: "block",
                          my: 0.5,
                          fontStyle: "italic",
                          color: "#555",
                          fontSize: { xs: "0.813rem", sm: "0.875rem" },
                          wordBreak: "break-word",
                          overflowWrap: "break-word",
                        }}
                      >
                        {question.expectedAnswer}
                      </Typography>
                    </>
                  )}
                </Box>

                <Collapse in={isEditing} timeout="auto" unmountOnExit>
                  <Box
                    sx={{
                      mt: 1,
                      p: 1.5,
                      border: "1px solid #e0e0e0",
                      borderRadius: 1,
                      bgcolor: "#fafafa",
                      display: "flex",
                      flexDirection: "column",
                      gap: 1.5,
                    }}
                  >
                    <TextField
                      label="Pergunta"
                      size="small"
                      fullWidth
                      value={question.question || ""}
                      onChange={(e) =>
                        questionsEditor.updateGeneratedQuestion(index, { question: e.target.value })
                      }
                      helperText="Aceita markdown: **negrito**, *itálico*, [link](url)"
                    />

                    {/* Imagem opcional da questão */}
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      Imagem (opcional)
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                      <TextField
                        label="URL da imagem"
                        size="small"
                        value={question.imageUrl || ""}
                        onChange={(e) =>
                          questionsEditor.updateGeneratedQuestion(index, { imageUrl: e.target.value })
                        }
                        placeholder="https://..."
                        sx={{ flex: { xs: "1 1 100%", sm: "1 1 240px" } }}
                      />
                      <TextField
                        label="Largura (px)"
                        type="number"
                        size="small"
                        value={question.imageWidth || ""}
                        onChange={(e) =>
                          questionsEditor.updateGeneratedQuestion(index, { imageWidth: e.target.value })
                        }
                        sx={{ width: { xs: "calc(50% - 4px)", sm: 120 } }}
                      />
                      <TextField
                        label="Altura (px)"
                        type="number"
                        size="small"
                        value={question.imageHeight || ""}
                        onChange={(e) =>
                          questionsEditor.updateGeneratedQuestion(index, { imageHeight: e.target.value })
                        }
                        sx={{ width: { xs: "calc(50% - 4px)", sm: 120 } }}
                      />
                    </Box>

                    {!isOpenEnded && (
                      <>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          Opções (marque a correta)
                        </Typography>

                        {(question.options || []).map((opt, optIndex) => {
                          const isCorrect = question.correctOption === optIndex;

                          return (
                            <Box
                              key={`${index}-opt-${optIndex}`}
                              sx={{ display: "flex", alignItems: "center", gap: 1 }}
                            >
                              <IconButton
                                onClick={() =>
                                  questionsEditor.updateGeneratedQuestion(index, {
                                    correctOption: optIndex,
                                  })
                                }
                                size="small"
                                sx={{
                                  color: isCorrect ? "#2e7d32" : "#9e9e9e",
                                }}
                                title={isCorrect ? "Correta" : "Marcar como correta"}
                              >
                                {isCorrect ? (
                                  <CheckCircleIcon fontSize="small" />
                                ) : (
                                  <RadioButtonUncheckedIcon fontSize="small" />
                                )}
                              </IconButton>

                              <TextField
                                label={`Opção ${optIndex + 1}`}
                                size="small"
                                fullWidth
                                value={opt}
                                onChange={(e) =>
                                  questionsEditor.updateGeneratedOption(index, optIndex, e.target.value)
                                }
                              />

                              <IconButton
                                onClick={() => questionsEditor.removeGeneratedOption(index, optIndex)}
                                size="small"
                                sx={{ color: "#d32f2f" }}
                                disabled={(question.options || []).length <= 2}
                                title="Remover opção"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          );
                        })}

                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => questionsEditor.addGeneratedOption(index)}
                          disabled={(question.options || []).length >= 5}
                          sx={{
                            color: "#9041c1",
                            borderColor: "#9041c1",
                            "&:hover": { borderColor: "#7d37a7" },
                            alignSelf: "flex-start",
                          }}
                        >
                          Adicionar Opção
                        </Button>
                      </>
                    )}

                    {isOpenEnded && (
                      <TextField
                        label="Resposta sugerida (opcional)"
                        size="small"
                        fullWidth
                        multiline
                        minRows={3}
                        value={question.expectedAnswer || ""}
                        onChange={(e) =>
                          questionsEditor.updateGeneratedQuestion(index, {
                            expectedAnswer: e.target.value,
                            questionType: "open-ended",
                          })
                        }
                      />
                    )}
                  </Box>
                </Collapse>
              </ListItem>
              );
            })}
          </List>

          <Button
            variant="contained"
            color="primary"
            onClick={handleAddToQuiz}
            fullWidth
            sx={{
              mt: 2,
              backgroundColor: "#4caf50",
              "&:hover": { backgroundColor: "#388e3c" },
              fontSize: { xs: "0.813rem", sm: "0.875rem" },
              py: { xs: 1, sm: 1.5 },
            }}
          >
            Adicionar {generation.generatedQuestions.length} Questões ao Quiz
          </Button>
        </Box>
      )}

      <PromptSettingsDialog
        open={promptSettings.settingsOpen}
        onClose={promptSettings.handleCloseSettings}
        customPrompt={promptSettings.customPrompt}
        setCustomPrompt={promptSettings.setCustomPrompt}
        onSave={promptSettings.handleSaveSettings}
        onReset={promptSettings.handleResetPrompt}
        models={groqSettings.models}
        selectedModel={groqSettings.selectedModel}
        onModelChange={groqSettings.handleModelChange}
      />

      <PasteQuestionsDialog
        open={pasteDialogOpen}
        onClose={() => setPasteDialogOpen(false)}
        onQuestionsParsed={handleQuestionsParsed}
      />

      <ApiKeyDialog
        open={groqSettings.apiKeyDialogOpen}
        onClose={groqSettings.handleCloseApiKeyDialog}
        customApiKey={groqSettings.customApiKey}
        setCustomApiKey={groqSettings.setCustomApiKey}
        usingCustomApiKey={groqSettings.usingCustomApiKey}
        setUsingCustomApiKey={groqSettings.setUsingCustomApiKey}
        onSave={groqSettings.handleSaveApiKey}
      />
    </Box>
  );
};

export default PdfQuizGenerator;
