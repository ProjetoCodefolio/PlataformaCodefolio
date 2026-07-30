import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Collapse,
  FormControl,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
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

const DEBOUNCE_MS = 650;

/**
 * Casca arrastável de uma questão. Só a casca: o conteúdo continua sendo
 * montado pela QuestionList via render prop, para não duplicar as ~200 linhas
 * do item (leitura + edição inline) só para poder chamar o hook `useSortable`.
 *
 * O `handleProps` sai daqui e vai para a alça de arrastar — arrastar pela alça,
 * e não pelo corpo, é o que deixa a edição inline continuar clicável.
 */
const SortableQuestionRow = ({ id, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 1 : "auto",
  };

  return children({
    setNodeRef,
    style,
    isDragging,
    handleProps: { ref: setActivatorNodeRef, ...attributes, ...listeners },
  });
};

const QuestionList = ({
  quiz,
  handleEditQuestion,
  handleRemoveQuestion,
  questionFormRef,
  courseId,
  onAutoSaveQuestion,
  onReorderQuestions,
}) => {
  const [editingId, setEditingId] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [savingById, setSavingById] = useState({});
  const [errorById, setErrorById] = useState({});

  const timersRef = useRef({});

  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach((t) => clearTimeout(t));
      timersRef.current = {};
    };
  }, []);

  const initDraft = (question) => {
    const isOpenEnded = (question.questionType || "multiple-choice") === "open-ended";
    return {
      id: question.id,
      question: question.question || "",
      questionType: isOpenEnded ? "open-ended" : "multiple-choice",
      options: Array.isArray(question.options)
        ? [...question.options]
        : ["", ""],
      correctOption:
        Number.isInteger(question.correctOption) ? question.correctOption : 0,
      imageUrl: question.imageUrl || "",
      imageWidth: question.imageWidth || "",
      imageHeight: question.imageHeight || "",
    };
  };

  const isValidForSave = (draft) => {
    if (!draft?.question?.trim()) return false;
    if (draft.questionType === "open-ended") return true;
    if (!Array.isArray(draft.options) || draft.options.length < 2) return false;
    if (draft.options.some((o) => !String(o || "").trim())) return false;

    const idx = Number(draft.correctOption);
    return Number.isInteger(idx) && idx >= 0 && idx < draft.options.length;
  };

  const scheduleSave = (questionId, nextDraft) => {
    if (!onAutoSaveQuestion) return;

    if (timersRef.current[questionId]) {
      clearTimeout(timersRef.current[questionId]);
    }

    timersRef.current[questionId] = setTimeout(async () => {
      if (!isValidForSave(nextDraft)) {
        setErrorById((prev) => ({
          ...prev,
          [questionId]: "Preencha a pergunta e todas as opções para salvar.",
        }));
        return;
      }

      try {
        setSavingById((prev) => ({ ...prev, [questionId]: true }));
        setErrorById((prev) => ({ ...prev, [questionId]: "" }));

        await onAutoSaveQuestion(quiz, {
          id: nextDraft.id,
          question: nextDraft.question,
          questionType: nextDraft.questionType,
          imageUrl: nextDraft.imageUrl,
          imageWidth: nextDraft.imageWidth,
          imageHeight: nextDraft.imageHeight,
          ...(nextDraft.questionType === "open-ended"
            ? {}
            : {
                options: nextDraft.options,
                correctOption: Number(nextDraft.correctOption),
              }),
        });
      } catch (e) {
        console.error("Erro no auto-save da questão:", e);
        setErrorById((prev) => ({
          ...prev,
          [questionId]: e?.message || "Erro ao salvar automaticamente.",
        }));
      } finally {
        setSavingById((prev) => ({ ...prev, [questionId]: false }));
      }
    }, DEBOUNCE_MS);
  };

  const updateDraft = (questionId, patch) => {
    setDrafts((prev) => {
      const current = prev[questionId] || initDraft(quiz.questions.find((q) => q.id === questionId) || {});
      const next = { ...current, ...patch };
      scheduleSave(questionId, next);
      return { ...prev, [questionId]: next };
    });
  };

  // Mesmos sensores do reordenamento de conteúdos, para o gesto ser idêntico
  // nas duas telas (arraste curto no mouse, toque longo no celular).
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !onReorderQuestions) return;

    const questions = quiz.questions || [];
    const oldIndex = questions.findIndex((q) => q.id === active.id);
    const newIndex = questions.findIndex((q) => q.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    onReorderQuestions(quiz, arrayMove(questions, oldIndex, newIndex));
  };

  const toggleEdit = (question) => {
    setErrorById((prev) => ({ ...prev, [question.id]: "" }));
    setDrafts((prev) => ({
      ...prev,
      [question.id]: prev[question.id] || initDraft(question),
    }));
    setEditingId((prev) => (prev === question.id ? null : question.id));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={(quiz.questions || []).map((q) => q.id)}
        strategy={verticalListSortingStrategy}
      >
    <List>
      {quiz.questions.map((question, index) => {
        const isEditing = editingId === question.id;
        const draft = drafts[question.id] || initDraft(question);
        const isOpenEnded = draft.questionType === "open-ended";

        return (
          <SortableQuestionRow key={question.id} id={question.id}>
            {({ setNodeRef, style, isDragging, handleProps }) => (
            <ListItem
              ref={setNodeRef}
              style={style}
              sx={{
                p: 2,
                border: isDragging ? "2px solid #9041c1" : "1px solid transparent",
                borderBottom: isDragging ? "2px solid #9041c1" : "1px solid #e0e0e0",
                borderRadius: isDragging ? "8px" : 0,
                backgroundColor: isDragging ? "#fff" : "transparent",
                boxShadow: isDragging ? "0 6px 16px rgba(0,0,0,0.18)" : "none",
                display: "flex",
                alignItems: "stretch",
                flexDirection: "column",
                gap: 1,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <IconButton
                  {...handleProps}
                  aria-label="Arrastar para reordenar"
                  disableRipple
                  size="small"
                  sx={{
                    color: "#9e9e9e",
                    cursor: "grab",
                    touchAction: "none",
                    "&:active": { cursor: "grabbing" },
                    "&:hover": { color: "#9041c1" },
                  }}
                >
                  <DragIndicatorIcon fontSize="small" />
                </IconButton>
                <Chip
                  label={isOpenEnded ? "Aberta" : "Múltipla Escolha"}
                  size="small"
                  color={isOpenEnded ? "secondary" : "primary"}
                  sx={{ fontSize: "0.7rem" }}
                />
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ flex: 1 }}
                >
                  {index + 1}.
                </Typography>

                <IconButton
                  onClick={() => toggleEdit(question)}
                  sx={{
                    color: "#9041c1",
                    "&:hover": {
                      backgroundColor: "rgba(144, 65, 193, 0.1)",
                    },
                  }}
                  size="small"
                  title={isEditing ? "Fechar edição" : "Editar questão"}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton
                  onClick={() => handleRemoveQuestion(quiz, question.id)}
                  sx={{
                    color: "#d32f2f",
                    "&:hover": {
                      backgroundColor: "rgba(211, 47, 47, 0.1)",
                    },
                  }}
                  size="small"
                  title="Remover questão"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>

              {!isEditing && (
                <ListItemText
                  primary={question.question}
                  secondary={
                    question.questionType === "open-ended"
                      ? "Resposta dissertativa"
                      : (
                          <Box component="span" sx={{ mt: 1, display: "block" }}>
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
                            {(question.options || []).map((opt, i) => (
                              <Box
                                key={i}
                                component="span"
                                sx={{ display: "block", my: 0.5 }}
                              >
                                <span
                                  style={{
                                    fontWeight:
                                      i === question.correctOption
                                        ? "bold"
                                        : "normal",
                                    color:
                                      i === question.correctOption
                                        ? "green"
                                        : "inherit",
                                    fontSize: "0.875rem",
                                  }}
                                >
                                  <strong>Opção {i + 1}:</strong> {opt}
                                </span>
                              </Box>
                            ))}
                          </Box>
                        )
                  }
                  primaryTypographyProps={{
                    sx: {
                      wordBreak: "break-word",
                      overflowWrap: "break-word",
                    },
                  }}
                  secondaryTypographyProps={{
                    sx: {
                      wordBreak: "break-word",
                      overflowWrap: "break-word",
                    },
                  }}
                />
              )}

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
                  <Box
                    sx={{
                      display: "flex",
                      gap: 1,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <FormControl size="small" sx={{ minWidth: 220 }}>
                      <InputLabel>Tipo de Questão</InputLabel>
                      <Select
                        label="Tipo de Questão"
                        value={draft.questionType || "multiple-choice"}
                        onChange={(e) =>
                          updateDraft(question.id, { questionType: e.target.value })
                        }
                      >
                        <MenuItem value="multiple-choice">Múltipla Escolha</MenuItem>
                        <MenuItem value="open-ended">Questão Aberta</MenuItem>
                      </Select>
                    </FormControl>

                    <Typography variant="caption" color="text.secondary">
                      {savingById[question.id]
                        ? "Salvando..."
                        : "Salva automaticamente"}
                    </Typography>
                    {errorById[question.id] && (
                      <Typography variant="caption" color="error">
                        {errorById[question.id]}
                      </Typography>
                    )}
                  </Box>

                  <TextField
                    label="Pergunta"
                    size="small"
                    fullWidth
                    value={draft.question}
                    onChange={(e) =>
                      updateDraft(question.id, { question: e.target.value })
                    }
                  />

                  {/* Imagem opcional da questão */}
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      Imagem (opcional)
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                      <TextField
                        label="URL da imagem"
                        size="small"
                        value={draft.imageUrl || ""}
                        onChange={(e) =>
                          updateDraft(question.id, { imageUrl: e.target.value })
                        }
                        placeholder="https://..."
                        sx={{ flex: { xs: "1 1 100%", sm: "1 1 240px" } }}
                      />
                      <TextField
                        label="Largura (px)"
                        type="number"
                        size="small"
                        value={draft.imageWidth || ""}
                        onChange={(e) =>
                          updateDraft(question.id, { imageWidth: e.target.value })
                        }
                        sx={{ width: { xs: "calc(50% - 4px)", sm: 120 } }}
                      />
                      <TextField
                        label="Altura (px)"
                        type="number"
                        size="small"
                        value={draft.imageHeight || ""}
                        onChange={(e) =>
                          updateDraft(question.id, { imageHeight: e.target.value })
                        }
                        sx={{ width: { xs: "calc(50% - 4px)", sm: 120 } }}
                      />
                    </Box>
                    {draft.imageUrl && String(draft.imageUrl).trim() && (
                      <Box sx={{ display: "flex", justifyContent: "center" }}>
                        <img
                          src={draft.imageUrl}
                          alt="Pré-visualização"
                          style={{
                            width: Number(draft.imageWidth) > 0 ? `${Number(draft.imageWidth)}px` : "auto",
                            height: Number(draft.imageHeight) > 0 ? `${Number(draft.imageHeight)}px` : "auto",
                            maxWidth: "100%",
                            maxHeight: 200,
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
                  </Box>

                  {!isOpenEnded && (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        Opções (marque a correta)
                      </Typography>

                      {(draft.options || []).map((opt, optIndex) => {
                        const isCorrect = Number(draft.correctOption) === optIndex;

                        return (
                          <Box
                            key={`${question.id}-opt-${optIndex}`}
                            sx={{ display: "flex", alignItems: "center", gap: 1 }}
                          >
                            <IconButton
                              onClick={() =>
                                updateDraft(question.id, { correctOption: optIndex })
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
                              onChange={(e) => {
                                const next = [...(draft.options || [])];
                                next[optIndex] = e.target.value;
                                updateDraft(question.id, { options: next });
                              }}
                            />

                            <IconButton
                              onClick={() => {
                                const cur = draft.options || [];
                                if (cur.length <= 2) return;

                                const next = cur.filter((_, i) => i !== optIndex);
                                let nextCorrect = Number(draft.correctOption) || 0;
                                if (optIndex === nextCorrect) nextCorrect = 0;
                                if (optIndex < nextCorrect) nextCorrect -= 1;

                                updateDraft(question.id, {
                                  options: next,
                                  correctOption: Math.min(
                                    nextCorrect,
                                    next.length - 1
                                  ),
                                });
                              }}
                              size="small"
                              sx={{ color: "#d32f2f" }}
                              disabled={(draft.options || []).length <= 2}
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
                        onClick={() => {
                          const cur = draft.options || ["", ""];
                          if (cur.length >= 5) return;
                          updateDraft(question.id, { options: [...cur, ""] });
                        }}
                        disabled={(draft.options || []).length >= 5}
                        sx={{
                          color: "#9041c1",
                          borderColor: "#9041c1",
                          "&:hover": { borderColor: "#7d37a7" },
                          alignSelf: "flex-start",
                        }}
                      >
                        Adicionar Opção
                      </Button>
                    </Box>
                  )}
                </Box>
              </Collapse>
            </ListItem>
            )}
          </SortableQuestionRow>
        );
      })}
    </List>
      </SortableContext>
    </DndContext>
  );
};

export default QuestionList;
