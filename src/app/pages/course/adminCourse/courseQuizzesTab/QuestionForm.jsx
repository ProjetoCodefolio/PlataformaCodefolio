import React from "react";
import {
  TextField,
  Grid,
  Box,
  Button,
  IconButton,
  Typography,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import DeleteIcon from "@mui/icons-material/Delete";
import LinearScaleIcon from "@mui/icons-material/LinearScale";
import {
  LIKERT_5_OPTIONS,
  LIKERT_5_SCALE,
} from "$api/services/courses/quizGrading";

const QuestionForm = ({
  editQuiz,
  newQuizQuestion,
  setNewQuizQuestion,
  newQuizOptions,
  setNewQuizOptions,
  newQuizCorrectOption,
  setNewQuizCorrectOption,
  newQuizGraded,
  setNewQuizGraded,
  newQuizScale,
  setNewQuizScale,
  newQuestionType,
  setNewQuestionType,
  newQuizImageUrl,
  setNewQuizImageUrl,
  newQuizImageWidth,
  setNewQuizImageWidth,
  newQuizImageHeight,
  setNewQuizImageHeight,
  handleBlurSave,
  handleKeyDown,
  questionRef,
  optionsRefs,
  addOptionButtonRef,
  saveButtonRef,
  cancelButtonRef,
  handleAddQuizOption,
  handleRemoveQuizOption,
  editQuestion,
  handleSaveEditQuestion,
  handleAddQuestion,
  setEditQuiz,
  setEditQuestion
}) => {
  if (!editQuiz) return null;

  const isOpenEnded = newQuestionType === 'open-ended';
  const valeNota = newQuizGraded !== false;

  // Atalho da escala de concordância: preenche as cinco alternativas e já
  // desliga o gabarito, que é o ponto — numa pergunta de opinião, marcar uma
  // alternativa como certa induz a resposta.
  const aplicarEscalaLikert = () => {
    setNewQuizOptions([...LIKERT_5_OPTIONS]);
    setNewQuizScale(LIKERT_5_SCALE);
    setNewQuizGraded(false);
    setNewQuizCorrectOption(0);
  };

  const alternarValeNota = (marcado) => {
    setNewQuizGraded(marcado);
    // Voltar a valer nota descaracteriza a escala: o rótulo some, mas o texto
    // das alternativas fica, para o professor aproveitar o que já digitou.
    if (marcado) setNewQuizScale("");
  };

  return (
    <Box
      sx={{
        mt: 2,
        p: 2,
        border: "1px solid #e0e0e0",
        borderRadius: 1,
        bgcolor: "#fafafa",
      }}
    >
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
            <FormControl size="small" sx={{ minWidth: 220, flex: { xs: 1, sm: "unset" } }}>
              <InputLabel>Tipo de Questão</InputLabel>
              <Select
                value={newQuestionType || 'multiple-choice'}
                onChange={(e) => setNewQuestionType(e.target.value)}
                label="Tipo de Questão"
              >
                <MenuItem value="multiple-choice">Múltipla Escolha</MenuItem>
                <MenuItem value="open-ended">Questão Aberta</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="caption" color="text.secondary">
              {editQuestion ? "Editando questão" : "Nova questão"}
            </Typography>
          </Box>
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Pergunta"
            fullWidth
            value={newQuizQuestion}
            onChange={(e) => setNewQuizQuestion(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, optionsRefs.current[0])}
            inputRef={questionRef}
            size="small"
            helperText="Aceita markdown: **negrito**, *itálico*, [link](url)"
          />
        </Grid>

        {/* Imagem opcional da questão (exibida entre o enunciado e as opções) */}
        <Grid item xs={12}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Imagem (opcional)
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <TextField
              label="URL da imagem"
              fullWidth
              value={newQuizImageUrl || ""}
              onChange={(e) => setNewQuizImageUrl(e.target.value)}
              size="small"
              placeholder="https://..."
              sx={{ flex: { xs: "1 1 100%", sm: "1 1 300px" } }}
            />
            <TextField
              label="Largura (px)"
              type="number"
              value={newQuizImageWidth || ""}
              onChange={(e) => setNewQuizImageWidth(e.target.value)}
              size="small"
              sx={{ width: { xs: "calc(50% - 4px)", sm: 130 } }}
            />
            <TextField
              label="Altura (px)"
              type="number"
              value={newQuizImageHeight || ""}
              onChange={(e) => setNewQuizImageHeight(e.target.value)}
              size="small"
              sx={{ width: { xs: "calc(50% - 4px)", sm: 130 } }}
            />
          </Box>
          {newQuizImageUrl && String(newQuizImageUrl).trim() && (
            <Box sx={{ mt: 1.5, display: "flex", justifyContent: "center" }}>
              <img
                src={newQuizImageUrl}
                alt="Pré-visualização da imagem da questão"
                style={{
                  width: Number(newQuizImageWidth) > 0 ? `${Number(newQuizImageWidth)}px` : "auto",
                  height: Number(newQuizImageHeight) > 0 ? `${Number(newQuizImageHeight)}px` : "auto",
                  maxWidth: "100%",
                  maxHeight: 240,
                  objectFit: "contain",
                  borderRadius: 8,
                  border: "1px solid #e0e0e0",
                }}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </Box>
          )}
        </Grid>

        {!isOpenEnded && (
          <Grid item xs={12}>
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 1,
                mb: 1,
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 600, flexGrow: 1 }}>
                {valeNota ? "Opções (marque a correta)" : "Opções (sem resposta certa)"}
              </Typography>

              <Tooltip title="Preenche as cinco alternativas de concordância e desliga o gabarito">
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<LinearScaleIcon />}
                  onClick={aplicarEscalaLikert}
                  sx={{
                    textTransform: "none",
                    color: "#9041c1",
                    borderColor: "#9041c1",
                    "&:hover": {
                      borderColor: "#7d37a7",
                      backgroundColor: "rgba(144, 65, 193, 0.04)",
                    },
                  }}
                >
                  Escala Likert
                </Button>
              </Tooltip>

              <FormControlLabel
                control={
                  <Switch
                    checked={valeNota}
                    onChange={(e) => alternarValeNota(e.target.checked)}
                    sx={{
                      "& .MuiSwitch-switchBase.Mui-checked": { color: "#9041c1" },
                      "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                        backgroundColor: "#9041c1",
                      },
                    }}
                  />
                }
                label={
                  <Typography variant="body2">Tem resposta certa</Typography>
                }
              />
            </Box>

            {!valeNota && (
              <Typography
                variant="caption"
                sx={{ display: "block", mb: 1, color: "#666" }}
              >
                Esta pergunta não vale nota
                {newQuizScale === LIKERT_5_SCALE ? " (escala Likert de 5 pontos)" : ""}.
                O aluno não vê acerto nem erro, e as respostas aparecem na
                distribuição do questionário.
              </Typography>
            )}

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {newQuizOptions.map((option, index) => {
                const isCorrect = newQuizCorrectOption === index;
                return (
                  <Box key={index} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {valeNota && (
                      <IconButton
                        onClick={() => setNewQuizCorrectOption(index)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            setNewQuizCorrectOption(index);
                          }
                        }}
                        size="small"
                        sx={{ color: isCorrect ? "#2e7d32" : "#9e9e9e" }}
                        title={isCorrect ? "Correta" : "Marcar como correta"}
                      >
                        {isCorrect ? (
                          <CheckCircleIcon fontSize="small" />
                        ) : (
                          <RadioButtonUncheckedIcon fontSize="small" />
                        )}
                      </IconButton>
                    )}

                    <TextField
                      label={`Opção ${index + 1}`}
                      fullWidth
                      value={option}
                      onChange={(e) =>
                        setNewQuizOptions((prev) =>
                          prev.map((opt, i) => (i === index ? e.target.value : opt))
                        )
                      }
                      onKeyDown={(e) =>
                        handleKeyDown(
                          e,
                          index === newQuizOptions.length - 1
                            ? addOptionButtonRef
                            : optionsRefs.current[index + 1]
                        )
                      }
                      inputRef={optionsRefs.current[index]}
                      size="small"
                    />

                    <IconButton
                      onClick={() => handleRemoveQuizOption(index)}
                      color="error"
                      disabled={newQuizOptions.length <= 2}
                      size="small"
                      title="Remover opção"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                );
              })}

              <Button
                variant="outlined"
                onClick={handleAddQuizOption}
                disabled={newQuizOptions.length >= 5}
                ref={addOptionButtonRef}
                onKeyDown={(e) => handleKeyDown(e, saveButtonRef)}
                sx={{
                  color: "#9041c1",
                  borderColor: "#9041c1",
                  "&:hover": {
                    borderColor: "#7d37a7",
                    backgroundColor: "rgba(144, 65, 193, 0.04)",
                  },
                  alignSelf: "flex-start",
                }}
                size="small"
              >
                Adicionar Opção
              </Button>
            </Box>
          </Grid>
        )}

        <Grid item xs={12}>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 2,
            }}
          >
          <Button
            variant="contained"
            onClick={editQuestion ? handleSaveEditQuestion : handleAddQuestion}
            ref={saveButtonRef}
            onKeyDown={(e) => handleKeyDown(e, cancelButtonRef)}
            startIcon={<AddIcon />}
            sx={{
              backgroundColor: "#9041c1",
              "&:hover": { backgroundColor: "#7d37a7" },
              width: { xs: "100%", sm: "auto" },
            }}
          >
            {editQuestion ? "Salvar Edição" : "Salvar Questão"}
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              setEditQuiz(null);
              setEditQuestion(null);
              setNewQuizQuestion("");
              setNewQuizOptions(["", ""]);
              setNewQuizCorrectOption(0);
              setNewQuestionType('multiple-choice');
              setNewQuizImageUrl("");
              setNewQuizImageWidth("");
              setNewQuizImageHeight("");
            }}
            ref={cancelButtonRef}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                setEditQuiz(null);
                setEditQuestion(null);
                setNewQuizQuestion("");
                setNewQuizOptions(["", ""]);
                setNewQuizCorrectOption(0);
                setNewQuestionType('multiple-choice');
                setNewQuizImageUrl("");
                setNewQuizImageWidth("");
                setNewQuizImageHeight("");
              }
            }}
            sx={{
              color: "#9041c1",
              borderColor: "#9041c1",
              "&:hover": { borderColor: "#7d37a7" },
              width: { xs: "100%", sm: "auto" },
            }}
          >
            Cancelar
          </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default QuestionForm;