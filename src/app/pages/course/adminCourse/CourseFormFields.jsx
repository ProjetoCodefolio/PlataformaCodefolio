import {
  Box,
  TextField,
  Button,
  Typography,
  Grid,
  FormControlLabel,
  Switch,
  InputAdornment,
  Tooltip,
  MenuItem,
  IconButton,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { toast } from "react-toastify";
import { COURSE_TYPES } from "$api/services/courses/courseType";

/** Campos de cadastro do curso: título, descrição, tipo, apelido, PIN, encerrar/arquivar. */
export default function CourseFormFields({
  courseId,
  isCurrentUserTeacher,
  fields,
  discipline,
}) {
  const {
    courseTitle,
    setCourseTitle,
    courseDescription,
    setCourseDescription,
    courseType,
    setCourseType,
    courseAlias,
    setCourseAlias,
    aliasInvalido,
    pinRequired,
    setPinRequired,
    coursePin,
    setCoursePin,
    showPin,
    setShowPin,
    randomPin,
    pinNaoRecuperavel,
    archived,
    setArchived,
  } = fields;
  const { closedAt, encerrando, handleEncerrar, handleReabrir } = discipline;

  return (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      <Grid item xs={12}>
        <TextField
          label="Título do Curso"
          fullWidth
          required
          disabled={isCurrentUserTeacher}
          value={courseTitle}
          onChange={(e) => setCourseTitle(e.target.value)}
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
              fontSize: { xs: "0.875rem", sm: "1rem" },
            },
            "& .MuiInputBase-input": {
              fontSize: { xs: "0.875rem", sm: "1rem" },
            },
          }}
        />
      </Grid>

      <Grid item xs={12}>
        <TextField
          label="Descrição do Curso"
          fullWidth
          required
          disabled={isCurrentUserTeacher}
          value={courseDescription}
          onChange={(e) => setCourseDescription(e.target.value)}
          variant="outlined"
          multiline
          rows={3}
          sx={{
            "& .MuiOutlinedInput-root": {
              "& fieldset": { borderColor: "#666" },
              "&:hover fieldset": { borderColor: "#9041c1" },
              "&.Mui-focused fieldset": { borderColor: "#9041c1" },
            },
            "& .MuiInputLabel-root": {
              color: "#666",
              "&.Mui-focused": { color: "#9041c1" },
              fontSize: { xs: "0.875rem", sm: "1rem" },
            },
            "& .MuiInputBase-input": {
              fontSize: { xs: "0.875rem", sm: "1rem" },
            },
          }}
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          select
          label="Tipo"
          fullWidth
          disabled={isCurrentUserTeacher}
          value={courseType}
          onChange={(e) => setCourseType(e.target.value)}
          variant="outlined"
          helperText={
            courseType === COURSE_TYPES.DISCIPLINA
              ? "A turma termina quando você encerrar a disciplina."
              : "Cada aluno conclui no próprio ritmo, ao completar o conteúdo."
          }
          sx={{
            "& .MuiOutlinedInput-root": {
              "& fieldset": { borderColor: "#666" },
              "&:hover fieldset": { borderColor: "#9041c1" },
              "&.Mui-focused fieldset": { borderColor: "#9041c1" },
            },
            "& .MuiInputLabel-root": {
              color: "#666",
              "&.Mui-focused": { color: "#9041c1" },
              fontSize: { xs: "0.875rem", sm: "1rem" },
            },
            "& .MuiInputBase-input": {
              fontSize: { xs: "0.875rem", sm: "1rem" },
            },
          }}
        >
          <MenuItem value={COURSE_TYPES.CURSO}>Curso</MenuItem>
          <MenuItem value={COURSE_TYPES.DISCIPLINA}>Disciplina</MenuItem>
        </TextField>
      </Grid>

      <Grid item xs={12}>
        <TextField
          label="Apelido do Curso"
          fullWidth
          disabled={isCurrentUserTeacher}
          value={courseAlias}
          onChange={(e) => setCourseAlias(e.target.value.replace(/\s/g, ""))}
          variant="outlined"
          error={!!aliasInvalido}
          helperText={
            aliasInvalido
              ? "O apelido só pode conter letras, números, hífens e underscores."
              : courseAlias
              ? `Link direto do curso: ${window.location.origin}/cursos/${courseAlias}`
              : "Opcional. Cria um link curto para o curso, no lugar do endereço com o id."
          }
          sx={{
            "& .MuiOutlinedInput-root": {
              "& fieldset": { borderColor: "#666" },
              "&:hover fieldset": { borderColor: "#9041c1" },
              "&.Mui-focused fieldset": { borderColor: "#9041c1" },
            },
            "& .MuiInputLabel-root": {
              color: "#666",
              "&.Mui-focused": { color: "#9041c1" },
              fontSize: { xs: "0.875rem", sm: "1rem" },
            },
            "& .MuiInputBase-input": {
              fontSize: { xs: "0.875rem", sm: "1rem" },
            },
          }}
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <FormControlLabel
          control={
            <Switch
              checked={pinRequired}
              disabled={isCurrentUserTeacher}
              onChange={(e) => {
                const isChecked = e.target.checked;
                setPinRequired(isChecked);

                // Ao ligar sem PIN à vista, já preenche o valor que será
                // salvo — o professor precisa poder ler o PIN antes de
                // salvar, senão o curso tranca com um número invisível.
                if (isChecked) {
                  setCoursePin((prevPin) => prevPin || randomPin);
                }
              }}
              sx={{
                "& .MuiSwitch-switchBase": {
                  color: "grey",
                  "&.Mui-checked": {
                    color: "#9041c1",
                  },
                  "&.Mui-checked + .MuiSwitch-track": {
                    backgroundColor: "#9041c1",
                  },
                },
                "& .MuiSwitch-track": {
                  backgroundColor: "#666",
                },
              }}
            />
          }
          label="Criar PIN para acesso ao curso"
          sx={{
            color: "#666",
            "& .MuiFormControlLabel-label": {
              fontSize: { xs: "0.875rem", sm: "1rem" },
            },
          }}
        />
      </Grid>

      {(pinRequired || courseId) && (
        <Grid item xs={12} sm={6}>
          <TextField
            label="PIN de Acesso"
            fullWidth
            variant="outlined"
            type={showPin ? "text" : "password"}
            value={coursePin}
            disabled={!pinRequired || isCurrentUserTeacher}
            inputProps={{ maxLength: 7 }}
            onChange={(e) => setCoursePin(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title={showPin ? "Ocultar PIN" : "Mostrar PIN"}>
                    <span>
                      <IconButton
                        onClick={() => setShowPin((prev) => !prev)}
                        edge="end"
                        size="small"
                        disabled={!coursePin}
                      >
                        {showPin ? (
                          <VisibilityOff fontSize="small" />
                        ) : (
                          <Visibility fontSize="small" />
                        )}
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Copiar PIN">
                    <span>
                      <IconButton
                        onClick={() => {
                          if (!coursePin) return;
                          navigator.clipboard
                            ?.writeText(coursePin)
                            .then(() =>
                              toast.success("PIN copiado para a área de transferência!")
                            )
                            .catch(() =>
                              toast.error("Não foi possível copiar o PIN")
                            );
                        }}
                        edge="end"
                        size="small"
                        disabled={!coursePin}
                      >
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </InputAdornment>
              ),
            }}
            helperText={
              pinNaoRecuperavel && !coursePin
                ? "Este curso já tem um PIN salvo que não pode ser exibido. Deixe em branco para mantê-lo ou digite um novo para substituí-lo."
                : "Este é o PIN que os alunos vão informar para entrar no curso."
            }
            sx={{
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: "#666" },
                "&:hover fieldset": { borderColor: "#9041c1" },
                "&.Mui-focused fieldset": { borderColor: "#9041c1" },
              },
              "& .MuiInputLabel-root": {
                color: "#666",
                "&.Mui-focused": { color: "#9041c1" },
                fontSize: { xs: "0.875rem", sm: "1rem" },
              },
              "& .MuiFormHelperText-root": {
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
              },
              "& .MuiInputBase-input": {
                fontSize: { xs: "0.875rem", sm: "1rem" },
              },
            }}
          />
        </Grid>
      )}

      {courseId && courseType === COURSE_TYPES.DISCIPLINA && (
        <Grid item xs={12}>
          <Box
            sx={{
              p: 2,
              borderRadius: "8px",
              border: "1px solid",
              borderColor: closedAt ? "#9041c1" : "#E7E4EC",
              backgroundColor: closedAt ? "#F5F0FA" : "transparent",
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "stretch", sm: "center" },
              justifyContent: "space-between",
              gap: 1.5,
            }}
          >
            <Box>
              <Typography
                sx={{ fontWeight: 600, color: "#333", fontSize: { xs: "0.875rem", sm: "1rem" } }}
              >
                {closedAt ? "Disciplina encerrada" : "Encerrar a disciplina"}
              </Typography>
              <Typography
                sx={{ color: "#666", fontSize: { xs: "0.8125rem", sm: "0.875rem" } }}
              >
                {closedAt
                  ? `Encerrada em ${new Date(closedAt).toLocaleDateString("pt-BR")}. Os alunos matriculados estão em "Concluídos".`
                  : "Marca o semestre como terminado: todos os matriculados vão para \"Concluídos\", tenham assistido tudo ou não. Não tira a turma do catálogo. Para isso, arquive."}
              </Typography>
            </Box>
            <Button
              variant={closedAt ? "outlined" : "contained"}
              onClick={closedAt ? handleReabrir : handleEncerrar}
              disabled={encerrando}
              sx={{
                flexShrink: 0,
                ...(closedAt
                  ? { color: "#9041c1", borderColor: "#9041c1", "&:hover": { borderColor: "#7d37a7" } }
                  : { backgroundColor: "#9041c1", "&:hover": { backgroundColor: "#7d37a7" } }),
                fontSize: { xs: "0.8125rem", sm: "0.875rem" },
              }}
            >
              {encerrando
                ? "Aguarde..."
                : closedAt
                ? "Reabrir disciplina"
                : "Encerrar disciplina"}
            </Button>
          </Box>
        </Grid>
      )}

      {courseId && !isCurrentUserTeacher && (
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={archived}
                onChange={(e) => setArchived(e.target.checked)}
                sx={{
                  "& .MuiSwitch-switchBase": {
                    color: "grey",
                    "&.Mui-checked": { color: "#9041c1" },
                    "&.Mui-checked + .MuiSwitch-track": {
                      backgroundColor: "#9041c1",
                    },
                  },
                  "& .MuiSwitch-track": { backgroundColor: "#666" },
                }}
              />
            }
            label="Arquivar curso (visível apenas para você, em Gerenciamento de Cursos)"
            sx={{
              color: "#666",
              "& .MuiFormControlLabel-label": {
                fontSize: { xs: "0.875rem", sm: "1rem" },
              },
            }}
          />
        </Grid>
      )}
    </Grid>
  );
}
