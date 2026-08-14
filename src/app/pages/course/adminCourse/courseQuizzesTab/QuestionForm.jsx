import React from "react";
import {
  TextField,
  Grid,
  Box,
  Button,
  IconButton,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import DeleteIcon from "@mui/icons-material/Delete";

const QuestionForm = ({
  editQuiz,
  newQuizQuestion,
  setNewQuizQuestion,
  newQuizOptions,
  setNewQuizOptions,
  newQuizCorrectOption,
  setNewQuizCorrectOption,
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
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Opções (marque a correta)
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {newQuizOptions.map((option, index) => {
                const isCorrect = newQuizCorrectOption === index;
                return (
                  <Box key={index} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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