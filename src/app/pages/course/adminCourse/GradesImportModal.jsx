import React, { useState } from "react";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import ArrowRightAltIcon from "@mui/icons-material/ArrowRightAlt";
import MyConfirm from "$components/post/components/confirm/Confirm";
import * as assessmentService from "$api/services/courses/assessments";
import {
  buildGradesImportPlan,
  buildCsvHeader,
  parseGradeValue,
} from "$api/services/courses/gradesCsv";
import { MAXIMUM_GRADE } from "$api/constants/gradeConstants";

const fmt = (grade) =>
  grade === null || grade === undefined
    ? "-"
    : Number(grade).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

/**
 * Importação das notas do curso a partir de um CSV.
 *
 * Nada é gravado até o professor confirmar duas vezes: primeiro revisando a
 * pré-visualização (onde ainda pode ajustar cada nota), depois no aviso de que a
 * ação é irreversível.
 */
export default function GradesImportModal({
  open,
  onClose,
  courseId,
  students,
  assessments,
  onImported,
}) {
  // idle -> processing -> (invalid | preview) -> applying
  const [step, setStep] = useState("idle");
  const [plan, setPlan] = useState(null);
  const [fileName, setFileName] = useState("");
  // Ajustes manuais do professor sobre a pré-visualização, por índice da mudança
  const [previewValues, setPreviewValues] = useState({});
  const [showConfirm, setShowConfirm] = useState(false);

  const resetState = () => {
    setStep("idle");
    setPlan(null);
    setFileName("");
    setPreviewValues({});
    setShowConfirm(false);
  };

  const handleClose = () => {
    if (step === "applying") return;
    resetState();
    onClose();
  };

  const handleFileSelected = async (event) => {
    const file = event.target.files?.[0];
    // Permite reescolher o mesmo arquivo depois de um erro
    event.target.value = "";
    if (!file) return;

    setFileName(file.name);
    setStep("processing");

    try {
      const csvText = await file.text();
      const nextPlan = buildGradesImportPlan({ csvText, students, assessments });

      setPlan(nextPlan);
      setPreviewValues({});
      setStep(nextPlan.errors.length > 0 ? "invalid" : "preview");
    } catch (err) {
      setPlan({
        errors: [`Não foi possível ler o arquivo: ${err.message}`],
        changes: [],
        keptEmpty: [],
        unmatched: [],
      });
      setStep("invalid");
    }
  };

  const getPreviewValue = (index, change) =>
    previewValues[index] ?? String(change.newGrade);

  // Mudanças que serão realmente gravadas, já com os ajustes manuais.
  // Campo esvaziado na pré-visualização = aquela nota fica de fora.
  const effectiveChanges = (plan?.changes || [])
    .map((change, index) => {
      const parsed = parseGradeValue(getPreviewValue(index, change));
      if (parsed.empty || parsed.invalid) return null;
      if (parsed.value === change.oldGrade) return null;
      return { ...change, newGrade: parsed.value };
    })
    .filter(Boolean);

  const hasInvalidPreview = (plan?.changes || []).some((change, index) =>
    Boolean(parseGradeValue(getPreviewValue(index, change)).invalid)
  );

  const handleApply = async () => {
    setShowConfirm(false);
    setStep("applying");

    try {
      await assessmentService.assignGradesBatch(courseId, effectiveChanges);
      resetState();
      onImported(effectiveChanges.length);
    } catch (err) {
      setPlan((prev) => ({ ...prev, errors: [err.message] }));
      setStep("invalid");
    }
  };

  const renderIdle = () => (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Exporte as notas em CSV, ajuste na sua planilha e importe o arquivo de
        volta. As notas são identificadas pelo email de cada aluno.
      </Typography>

      <Alert severity="info" sx={{ borderRadius: 2 }}>
        <AlertTitle sx={{ fontWeight: "bold" }}>O arquivo precisa manter</AlertTitle>
        <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
          <li>os mesmos nomes de coluna do arquivo exportado;</li>
          <li>o mesmo número de colunas em todas as linhas;</li>
          <li>notas de 0 a {MAXIMUM_GRADE}.</li>
        </ul>
        <Typography variant="caption" sx={{ mt: 1, display: "block" }}>
          Célula em branco não apaga a nota já lançada. As colunas Status e Nota
          Final são recalculadas e podem ser ignoradas.
        </Typography>
      </Alert>

      <Box>
        <Typography variant="caption" color="text.secondary">
          Colunas esperadas:
        </Typography>
        <Box
          sx={{
            mt: 0.5,
            p: 1.5,
            borderRadius: 2,
            backgroundColor: "#f5f5f5",
            fontFamily: "monospace",
            fontSize: "0.75rem",
            overflowX: "auto",
            whiteSpace: "nowrap",
          }}
        >
          {buildCsvHeader(assessments).join(", ")}
        </Box>
      </Box>

      <Button
        component="label"
        variant="contained"
        startIcon={<UploadFileIcon />}
        sx={{
          alignSelf: "flex-start",
          bgcolor: "#9041c1",
          "&:hover": { bgcolor: "#7a35a3" },
        }}
      >
        Escolher arquivo CSV
        <input hidden type="file" accept=".csv,text/csv" onChange={handleFileSelected} />
      </Button>
    </Stack>
  );

  const renderProcessing = (message) => (
    <Stack alignItems="center" spacing={2} sx={{ py: 5 }}>
      <CircularProgress sx={{ color: "#9041c1" }} />
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    </Stack>
  );

  const renderInvalid = () => (
    <Stack spacing={2}>
      <Alert severity="error" sx={{ borderRadius: 2 }}>
        <AlertTitle sx={{ fontWeight: "bold" }}>
          Não foi possível importar {fileName ? `"${fileName}"` : "o arquivo"}
        </AlertTitle>
        Nenhuma nota foi alterada. Corrija os pontos abaixo e tente de novo.
      </Alert>

      <Box component="ul" sx={{ m: 0, pl: 3 }}>
        {plan.errors.map((error, index) => (
          <li key={index}>
            <Typography variant="body2">{error}</Typography>
          </li>
        ))}
      </Box>
    </Stack>
  );

  const renderPreview = () => (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Confira o que será alterado em <strong>{fileName}</strong>. Você ainda
        pode ajustar qualquer nota abaixo, ou esvaziar o campo para deixar
        aquela nota como está.
      </Typography>

      {plan.unmatched.length > 0 && (
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          <AlertTitle sx={{ fontWeight: "bold" }}>
            {plan.unmatched.length} linha(s) sem aluno correspondente
          </AlertTitle>
          Estes emails não pertencem à turma e serão ignorados:{" "}
          {plan.unmatched.map((row) => row.email).join(", ")}
        </Alert>
      )}

      {plan.keptEmpty.length > 0 && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          <AlertTitle sx={{ fontWeight: "bold" }}>
            {plan.keptEmpty.length} célula(s) em branco
          </AlertTitle>
          As notas já lançadas serão mantidas:{" "}
          {plan.keptEmpty
            .map((row) => `${row.name} • ${row.assessmentName} (${fmt(row.oldGrade)})`)
            .join("; ")}
        </Alert>
      )}

      {plan.changes.length === 0 ? (
        <Alert severity="success" sx={{ borderRadius: 2 }}>
          O arquivo não traz nenhuma nota diferente das que já estão no sistema.
        </Alert>
      ) : (
        <TableContainer sx={{ maxHeight: 340, border: "1px solid #eee", borderRadius: 2 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: "bold" }}>Aluno</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Avaliação</TableCell>
                <TableCell sx={{ fontWeight: "bold" }} align="center">
                  Nota atual
                </TableCell>
                <TableCell sx={{ fontWeight: "bold" }} align="center">
                  Nova nota
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {plan.changes.map((change, index) => {
                const value = getPreviewValue(index, change);
                const parsed = parseGradeValue(value);

                return (
                  <TableRow key={`${change.userId}_${change.assessmentId}`} hover>
                    <TableCell>
                      <Typography variant="body2">{change.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {change.email}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{change.assessmentName}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" color="text.secondary">
                        {fmt(change.oldGrade)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <ArrowRightAltIcon sx={{ color: "#9041c1", fontSize: 18 }} />
                        <TextField
                          size="small"
                          value={value}
                          error={Boolean(parsed.invalid)}
                          onChange={(e) =>
                            setPreviewValues((prev) => ({
                              ...prev,
                              [index]: e.target.value,
                            }))
                          }
                          inputProps={{
                            inputMode: "decimal",
                            "aria-label": `Nova nota de ${change.name} em ${change.assessmentName}`,
                            style: { textAlign: "center", padding: "6px 8px" },
                          }}
                          sx={{ width: 80 }}
                        />
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {hasInvalidPreview && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          Há notas inválidas na pré-visualização. Use valores de 0 a {MAXIMUM_GRADE}.
        </Alert>
      )}

      <Divider />

      <Stack direction="row" alignItems="center" spacing={1}>
        <Chip
          label={`${effectiveChanges.length} nota(s) serão gravadas`}
          sx={{ bgcolor: "#9041c1", color: "#fff", fontWeight: "bold" }}
        />
        <Typography variant="caption" color="text.secondary">
          Nada é gravado até você confirmar.
        </Typography>
      </Stack>
    </Stack>
  );

  const renderContent = () => {
    switch (step) {
      case "processing":
        return renderProcessing("Processando o arquivo, aguarde...");
      case "applying":
        return renderProcessing("Gravando as notas, aguarde...");
      case "invalid":
        return renderInvalid();
      case "preview":
        return renderPreview();
      default:
        return renderIdle();
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        maxWidth="md"
        sx={{ "& .MuiDialog-paper": { borderRadius: "12px" } }}
      >
        <DialogTitle sx={{ fontWeight: "bold", color: "#333" }}>
          Importar notas por CSV
        </DialogTitle>

        <DialogContent dividers>{renderContent()}</DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClose} disabled={step === "applying"} sx={{ color: "#666" }}>
            {step === "preview" ? "Cancelar" : "Fechar"}
          </Button>

          {step === "invalid" && (
            <Button
              component="label"
              variant="outlined"
              sx={{ borderColor: "#9041c1", color: "#9041c1" }}
            >
              Escolher outro arquivo
              <input hidden type="file" accept=".csv,text/csv" onChange={handleFileSelected} />
            </Button>
          )}

          {step === "preview" && (
            <Button
              variant="contained"
              onClick={() => setShowConfirm(true)}
              disabled={effectiveChanges.length === 0 || hasInvalidPreview}
              sx={{ bgcolor: "#9041c1", "&:hover": { bgcolor: "#7a35a3" } }}
            >
              Confirmar importação
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <MyConfirm
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleApply}
        title="Confirmar importação das notas?"
        message={`${effectiveChanges.length} nota(s) serão gravadas e as notas anteriores desses alunos serão substituídas. Esta ação é irreversível e não há como desfazer.`}
      />
    </>
  );
}
