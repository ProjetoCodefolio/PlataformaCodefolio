import React from "react";
import {
  TextField,
  Grid,
  Box,
  Button,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
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
    <Grid container spacing={2} sx={{ mt: 2 }}>
      {/* Tipo de Questão */}
      <Grid item xs={12}>
        <FormControl fullWidth size="small">
          <InputLabel>Tipo de Questão</InputLabel>
          <Select
            value={newQuestionType || 'multiple-choice'}
            onChange={(e) => setNewQuestionType(e.target.value)}
            label="Tipo de Questão"
            sx={{
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "#666",
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: "#9041c1",
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: "#9041c1",
              },
            }}
          >
            <MenuItem value="multiple-choice">Múltipla Escolha</MenuItem>
            <MenuItem value="open-ended">Questão Aberta</MenuItem>
          </Select>
        </FormControl>
      </Grid>

      {/* Pergunta */}
      <Grid item xs={12}>
        <TextField
          label="Pergunta"
          fullWidth
          value={newQuizQuestion}
          onChange={(e) => setNewQuizQuestion(e.target.value)}
          // Removida a chamada do onBlur para evitar o problema de foco
          onKeyDown={(e) => handleKeyDown(e, optionsRefs.current[0])}
          inputRef={questionRef}
          variant="outlined"
          sx={{
            "& .MuiOutlinedInput-root": {
              "& fieldset": { borderColor: "#666" },
              "&:hover fieldset": { borderColor: "#9041c1" },
              "&.Mui-focused fieldset": { borderColor: "#9041c1" },
            },
            "& .MuiInputLabel-root": {
              color: "#666",
              "&.Mui-focused": { color: "#9041c1" },
            },
          }}
        />
      </Grid>
      
      {/* Campos específicos para questões de múltipla escolha */}
      {!isOpenEnded && newQuizOptions.map((option, index) => (
        <Grid item xs={12} key={index}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <TextField
              label={`Opção ${index + 1}`}
              fullWidth
              value={option}
              onChange={(e) =>
                setNewQuizOptions((prev) =>
                  prev.map((opt, i) =>
                    i === index ? e.target.value : opt
                  )
                )
              }
              // Também removida a chamada do onBlur aqui
              onKeyDown={(e) =>
                handleKeyDown(
                  e,
                  index === newQuizOptions.length - 1
                    ? addOptionButtonRef
                    : optionsRefs.current[index + 1]
                )
              }
              inputRef={optionsRefs.current[index]}
              variant="outlined"
              sx={{
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: "#666" },
                  "&:hover fieldset": { borderColor: "#9041c1" },
                  "&.Mui-focused fieldset": { borderColor: "#9041c1" },
                },
                "& .MuiInputLabel-root": {
                  color: "#666",
                  "&.Mui-focused": { color: "#9041c1" },
                },
              }}
            />
            <IconButton
              onClick={() => setNewQuizCorrectOption(index)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setNewQuizCorrectOption(index);
                }
              }}
              sx={{
                backgroundColor:
                  newQuizCorrectOption === index ? "#4caf50" : "transparent",
                color: newQuizCorrectOption === index ? "#fff" : "#666",
                "&:hover": {
                  backgroundColor:
                    newQuizCorrectOption === index ? "#45a049" : "#e0e0e0",
                },
              }}
            >
              <CheckCircleIcon />
            </IconButton>
            {newQuizOptions.length > 2 && (
              <IconButton
                onClick={() => handleRemoveQuizOption(index)}
                color="error"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleRemoveQuizOption(index);
                  }
                }}
              >
                <DeleteIcon />
              </IconButton>
            )}
          </Box>
        </Grid>
      ))}

      {/* Botão para adicionar opção (apenas para múltipla escolha) */}
      {!isOpenEnded && (
        <Grid item xs={12}>
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
            }}
          >
            Adicionar Opção
          </Button>
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
  );
};

export default QuestionForm;