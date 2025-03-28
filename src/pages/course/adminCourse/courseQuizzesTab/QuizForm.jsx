import React from "react";
import {
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Button,
  Typography,
} from "@mui/material";
import { toast } from "react-toastify";

const QuizForm = ({
  videos,
  newQuizVideoId,
  setNewQuizVideoId,
  newQuizMinPercentage,
  setNewQuizMinPercentage,
  editQuiz,
  handleAddQuiz,
  handleBlurSaveMinPercentage,
  questionFormRef,
}) => {
  return (
    <>
      <Typography
        variant="h6"
        sx={{ mb: 2, fontWeight: "bold", color: "#333" }}
      >
        {editQuiz ? "Editar Quiz" : "Criar Novo Quiz"}
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel
              sx={{
                color: "#666",
                "&.Mui-focused": { color: "#9041c1" },
                top: "-6px",
              }}
            >
              Vídeo Associado
            </InputLabel>
            <Select
              value={newQuizVideoId}
              onChange={(e) => setNewQuizVideoId(e.target.value)}
              sx={{
                "& .MuiOutlinedInput-notchedOutline": { borderColor: "#666" },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#9041c1",
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#9041c1",
                },
              }}
              disabled={!!editQuiz}
            >
              {videos.map((video, index) => (
                <MenuItem key={video.id} value={video.id}>
                  {`${index + 1}. ${video.title}`}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>Selecione o vídeo para este quiz</FormHelperText>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            label="Nota Mínima (%)"
            type="number"
            fullWidth
            value={newQuizMinPercentage}
            onChange={(e) => {
              const value = Math.max(
                0,
                Math.min(100, parseInt(e.target.value) || 0)
              );
              setNewQuizMinPercentage(value);
            }}
            onBlur={handleBlurSaveMinPercentage}
            inputProps={{ min: 0, max: 100 }}
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
            helperText="0 a 100%. Se 0, o quiz não será obrigatório."
            ref={questionFormRef}
          />
        </Grid>

        {!editQuiz && (
          <Grid item xs={12}>
            <Button
              variant="contained"
              onClick={handleAddQuiz}
              disabled={!newQuizVideoId}
              sx={{
                backgroundColor: "#9041c1",
                "&:hover": { backgroundColor: "#7d37a7" },
                "&.Mui-disabled": {
                  backgroundColor: "rgba(0, 0, 0, 0.12)",
                  color: "rgba(0, 0, 0, 0.26)",
                },
              }}
            >
              Adicionar Quiz
            </Button>
          </Grid>
        )}
      </Grid>
    </>
  );
};

export default QuizForm;