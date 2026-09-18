import { useState } from "react";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import { parseQuestoesColadas } from "$api/services/courses/quizGenerator/pastedQuestions";

const EXEMPLO = `[
  {
    "question": "Qual é a capital da França?",
    "options": ["Paris", "Londres", "Roma"],
    "correctOption": 0
  },
  {
    "question": "Explique a fotossíntese.",
    "questionType": "open-ended",
    "expectedAnswer": "Processo em que plantas produzem glicose com luz."
  }
]`;

/**
 * Colagem de questões prontas em JSON. Não grava nada: entrega as questões
 * para a mesma área de conferência do gerador por PDF, que é onde o professor
 * revisa, edita e decide adicionar ao quiz.
 */
const PasteQuestionsDialog = ({ open, onClose, onQuestionsParsed }) => {
  const [texto, setTexto] = useState("");
  const [erros, setErros] = useState([]);

  const fechar = () => {
    setTexto("");
    setErros([]);
    onClose();
  };

  const conferir = () => {
    const { questoes, erros: encontrados } = parseQuestoesColadas(texto);

    if (encontrados.length > 0) {
      setErros(encontrados);
      return;
    }

    onQuestionsParsed(questoes);
    fechar();
  };

  return (
    <Dialog open={open} onClose={fechar} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }}>
        Colar questões prontas (JSON)
      </DialogTitle>

      <DialogContent>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 2, fontSize: { xs: "0.813rem", sm: "0.875rem" } }}
        >
          Cole abaixo as questões já geradas em outro lugar. Elas vão para a
          mesma área de conferência do gerador por PDF, onde você revisa e edita
          antes de adicionar ao quiz. O gabarito aceita{" "}
          <code>correctOption</code> (índice começando em zero) ou{" "}
          <code>correct_answer</code> (letra ou o texto da alternativa).
        </Typography>

        <Box
          component="pre"
          sx={{
            m: 0,
            mb: 2,
            p: 1.5,
            borderRadius: 1,
            backgroundColor: "#f5f5fa",
            overflowX: "auto",
            fontSize: { xs: "0.688rem", sm: "0.75rem" },
          }}
        >
          {EXEMPLO}
        </Box>

        <TextField
          label="Questões em JSON"
          multiline
          minRows={8}
          fullWidth
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Cole aqui o JSON das questões"
          sx={{ bgcolor: "#fff" }}
        />

        {erros.length > 0 && (
          <Alert severity="error" sx={{ mt: 2 }}>
            <AlertTitle>Nada foi importado</AlertTitle>
            {erros.map((erro) => (
              <Typography
                key={erro}
                variant="body2"
                sx={{ fontSize: { xs: "0.75rem", sm: "0.813rem" } }}
              >
                {erro}
              </Typography>
            ))}
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={fechar} color="secondary">
          Cancelar
        </Button>
        <Button
          onClick={conferir}
          variant="contained"
          disabled={texto.trim() === ""}
          sx={{
            backgroundColor: "#9041c1",
            "&:hover": { backgroundColor: "#7d37a7" },
          }}
        >
          Conferir
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PasteQuestionsDialog;
