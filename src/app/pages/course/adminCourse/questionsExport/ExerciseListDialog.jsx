import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import DeleteIcon from "@mui/icons-material/Delete";
import DescriptionIcon from "@mui/icons-material/Description";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { toast } from "react-toastify";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ANSWER_LINE_OPTIONS,
  buildExerciseListDocument,
  exerciseListFilename,
} from "$api/services/courses/questionExport";
import { downloadExerciseListDocx } from "./exerciseListDocx";
import { downloadExerciseListPdf } from "./exerciseListPdf";

const PURPLE = "#9041c1";

/**
 * Um exercício da prévia: texto editável, arrastável pela alça e com botões de
 * subir/descer (para quem usa teclado ou acha o arraste chato no celular).
 */
const ItemDaLista = ({ item, index, total, showContent, onChange, onMove, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  return (
    <Paper
      ref={setNodeRef}
      variant="outlined"
      data-testid="exercicio-da-lista"
      sx={{
        p: 1.5,
        mb: 1.5,
        borderRadius: "8px",
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        backgroundColor: "#fff",
      }}
    >
      <Stack direction="row" spacing={1} alignItems="flex-start">
        <IconButton
          size="small"
          aria-label={`Arrastar o exercício ${index + 1}`}
          sx={{ cursor: "grab", mt: 1, touchAction: "none" }}
          {...attributes}
          {...listeners}
        >
          <DragIndicatorIcon fontSize="small" />
        </IconButton>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <TextField
            label={`Exercício ${index + 1}`}
            value={item.text}
            onChange={(e) => onChange(item.id, e.target.value)}
            multiline
            minRows={2}
            fullWidth
            size="small"
          />
          {showContent && item.contentTitle && (
            <Typography variant="caption" sx={{ color: "#777", fontStyle: "italic" }}>
              Referente a: {item.contentTitle}
            </Typography>
          )}
        </Box>
        <Stack>
          <Tooltip title="Subir">
            <span>
              <IconButton
                size="small"
                onClick={() => onMove(index, index - 1)}
                disabled={index === 0}
                aria-label={`Subir o exercício ${index + 1}`}
              >
                <ArrowUpwardIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Descer">
            <span>
              <IconButton
                size="small"
                onClick={() => onMove(index, index + 1)}
                disabled={index === total - 1}
                aria-label={`Descer o exercício ${index + 1}`}
              >
                <ArrowDownwardIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Tirar da lista">
            <IconButton
              size="small"
              onClick={() => onRemove(item.id)}
              sx={{ color: "#d32f2f" }}
              aria-label={`Tirar o exercício ${index + 1} da lista`}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
    </Paper>
  );
};

ItemDaLista.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.string.isRequired,
    text: PropTypes.string,
    contentTitle: PropTypes.string,
  }).isRequired,
  index: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  showContent: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  onMove: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

/**
 * Prévia da lista de exercícios: o professor ajusta o cabeçalho, as opções e
 * os exercícios (texto, ordem, quais entram) e baixa em .docx ou PDF.
 *
 * Tudo aqui vale só para o arquivo gerado: editar o texto de um exercício não
 * altera a dúvida do aluno, e nada é guardado ao fechar. A prévia nunca mostra
 * o autor, porque a lista vai para a turma; o rascunho já chega sem ele (ver
 * `createExerciseListDraft`).
 */
const ExerciseListDialog = ({ open, draft, onClose }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const [header, setHeader] = useState(draft?.header || {});
  const [options, setOptions] = useState(draft?.options || {});
  const [items, setItems] = useState(draft?.items || []);
  const [gerando, setGerando] = useState("");

  // Cada abertura começa do rascunho novo: nada da prévia anterior sobrevive.
  useEffect(() => {
    if (!draft) return;
    setHeader(draft.header);
    setOptions(draft.options);
    setItems(draft.items);
  }, [draft]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const mudarCabecalho = (campo) => (e) => setHeader((atual) => ({ ...atual, [campo]: e.target.value }));
  const mudarOpcao = (campo) => (e) =>
    setOptions((atual) => ({
      ...atual,
      [campo]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
    }));

  const mudarTexto = (id, text) =>
    setItems((atual) => atual.map((item) => (item.id === id ? { ...item, text } : item)));
  const mover = (de, para) => setItems((atual) => arrayMove(atual, de, para));
  const remover = (id) => setItems((atual) => atual.filter((item) => item.id !== id));

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    setItems((atual) =>
      arrayMove(
        atual,
        atual.findIndex((item) => item.id === active.id),
        atual.findIndex((item) => item.id === over.id)
      )
    );
  };

  const lista = buildExerciseListDocument({ header, options, items });

  const baixar = async (formato) => {
    setGerando(formato);
    try {
      const nome = exerciseListFilename(lista.title || lista.courseName, formato);
      if (formato === "docx") await downloadExerciseListDocx(lista, nome);
      else await downloadExerciseListPdf(lista, nome);
    } catch (error) {
      console.error("Erro ao gerar a lista de exercícios:", error);
      toast.error("Não foi possível gerar o arquivo da lista");
    } finally {
      setGerando("");
    }
  };

  const semExercicios = lista.exercises.length === 0;

  return (
    <Dialog open={open} onClose={onClose} fullScreen={fullScreen} maxWidth="md" fullWidth aria-labelledby="titulo-lista-exercicios">
      <DialogTitle id="titulo-lista-exercicios" sx={{ fontWeight: "bold" }}>
        Lista de exercícios
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ color: "#666", mb: 2 }}>
          Ajuste o texto e a ordem antes de baixar. As mudanças valem só para o
          arquivo: as dúvidas dos alunos não são alteradas, e o nome de quem
          perguntou nunca entra na lista.
        </Typography>

        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          Cabeçalho
        </Typography>
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, mb: 2 }}>
          <TextField label="Nome do curso" value={header.courseName || ""} onChange={mudarCabecalho("courseName")} size="small" />
          <TextField label="Título da lista" value={header.title || ""} onChange={mudarCabecalho("title")} size="small" />
          <TextField label="Data" value={header.date || ""} onChange={mudarCabecalho("date")} size="small" />
          <TextField
            label="Instruções (opcional)"
            value={header.instructions || ""}
            onChange={mudarCabecalho("instructions")}
            size="small"
            multiline
            sx={{ gridColumn: { sm: "1 / -1" } }}
          />
        </Box>

        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
          Opções
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} flexWrap="wrap" alignItems={{ sm: "center" }} sx={{ mb: 2 }}>
          <FormControlLabel
            control={<Checkbox checked={!!options.studentFields} onChange={mudarOpcao("studentFields")} />}
            label="Campos de nome e matrícula"
          />
          <FormControlLabel
            control={<Checkbox checked={!!options.showContent} onChange={mudarOpcao("showContent")} />}
            label="Mostrar o conteúdo de cada exercício"
          />
          <FormControlLabel
            control={<Checkbox checked={!!options.answerSpace} onChange={mudarOpcao("answerSpace")} />}
            label="Espaço para resposta"
          />
          {options.answerSpace && (
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel id="rotulo-linhas-resposta">Linhas por exercício</InputLabel>
              <Select
                labelId="rotulo-linhas-resposta"
                label="Linhas por exercício"
                value={options.answerLines}
                onChange={mudarOpcao("answerLines")}
              >
                {ANSWER_LINE_OPTIONS.map((linhas) => (
                  <MenuItem key={linhas} value={linhas}>
                    {linhas}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Stack>

        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          Exercícios ({items.length})
        </Typography>
        {items.length === 0 ? (
          <Typography variant="body2" sx={{ color: "#999", py: 2 }}>
            Nenhum exercício na lista. Feche e escolha dúvidas na tabela.
          </Typography>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
              {items.map((item, index) => (
                <ItemDaLista
                  key={item.id}
                  item={item}
                  index={index}
                  total={items.length}
                  showContent={!!options.showContent}
                  onChange={mudarTexto}
                  onMove={mover}
                  onRemove={remover}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </DialogContent>
      <DialogActions sx={{ flexWrap: "wrap", gap: 1, p: 2 }}>
        <Button onClick={onClose}>Fechar</Button>
        <Button
          variant="outlined"
          startIcon={<DescriptionIcon />}
          onClick={() => baixar("docx")}
          disabled={semExercicios || !!gerando}
          sx={{ color: PURPLE, borderColor: PURPLE }}
        >
          {gerando === "docx" ? "Gerando..." : "Baixar .docx"}
        </Button>
        <Button
          variant="contained"
          startIcon={<PictureAsPdfIcon />}
          onClick={() => baixar("pdf")}
          disabled={semExercicios || !!gerando}
          sx={{ backgroundColor: PURPLE, "&:hover": { backgroundColor: "#7d37a7" } }}
        >
          {gerando === "pdf" ? "Gerando..." : "Baixar PDF"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

ExerciseListDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  draft: PropTypes.shape({
    header: PropTypes.object,
    options: PropTypes.object,
    items: PropTypes.array,
  }),
  onClose: PropTypes.func.isRequired,
};

ExerciseListDialog.defaultProps = {
  draft: null,
};

export default ExerciseListDialog;
