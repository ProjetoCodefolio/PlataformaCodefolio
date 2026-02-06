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
  FormControlLabel,
  Checkbox,
  Box,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import { toast } from "react-toastify";

const QuizForm = ({
  videos,
  newQuizVideoId,
  setNewQuizVideoId,
  newQuizMinPercentage,
  setNewQuizMinPercentage,
  newQuizIsDiagnostic,
  setNewQuizIsDiagnostic,
  editQuiz,
  handleAddQuiz,
  handleBlurSaveMinPercentage,
  handleBlurSaveDiagnosticStatus,
  questionFormRef,
  entityType,
  additionalButtons,
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
              }}
            >
              Vídeo
            </InputLabel>
            <Select
              value={newQuizVideoId}
              onChange={(e) => setNewQuizVideoId(e.target.value)}
              label="Vídeo"
              disabled={!!editQuiz}
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
              {videos.map((video) => (
                <MenuItem key={video.id} value={video.id}>
                  {video.title}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>
              {editQuiz
                ? "Não é possível alterar o vídeo de um quiz existente"
                : "Selecione o vídeo para este quiz"}
            </FormHelperText>
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

        <Grid item xs={12}>
          <Box
            sx={{
              p: 2,
              borderRadius: 1,
              backgroundColor: newQuizIsDiagnostic
                ? "rgba(33, 150, 243, 0.08)"
                : "transparent",
              border: "1px solid",
              borderColor: newQuizIsDiagnostic ? "#2196f3" : "#e0e0e0",
              transition: "all 0.3s ease",
            }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={newQuizIsDiagnostic}
                  onChange={(e) => setNewQuizIsDiagnostic(e.target.checked)}
                  onBlur={handleBlurSaveDiagnosticStatus}
                  sx={{
                    color: "#9041c1",
                    "&.Mui-checked": {
                      color: "#2196f3",
                    },
                  }}
                />
              }
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography sx={{ fontWeight: 500 }}>
                    Quiz Diagnóstico
                  </Typography>
                  <InfoIcon sx={{ fontSize: 18, color: "#666" }} />
                </Box>
              }
            />
            <Typography
              variant="caption"
              sx={{
                display: "block",
                ml: 4,
                color: "#666",
                mt: 0.5,
              }}
            >
              Quizzes diagnósticos registram a nota do aluno, mas não são
              considerados em somatórios de avaliação do curso.
            </Typography>
          </Box>
        </Grid>

        {!editQuiz && (
          <Grid item xs={12}>
            <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
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
              {additionalButtons}
            </Box>
          </Grid>
        )}
      </Grid>
    </>
  );
};

export default QuizForm;