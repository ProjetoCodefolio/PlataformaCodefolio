import React from "react";
import {
  List,
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  IconButton,
  Button,
  Collapse,
  Chip,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import EditIcon from "@mui/icons-material/Edit";
import PersonIcon from "@mui/icons-material/Person";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import QuestionList from "./QuestionList";
import { useNavigate } from "react-router-dom";
import {
  getQuizWindowState,
  formatQuizDate,
} from "$api/services/courses/quizzes";

// Chip da janela de disponibilidade: só aparece quando o professor definiu
// alguma data. Cores: azul = agendado, verde = aberto, cinza = encerrado.
const windowChipProps = (quiz) => {
  if (!quiz?.openDate && !quiz?.closeDate) return null;

  const state = getQuizWindowState(quiz);
  if (state === "scheduled")
    return {
      label: `Abre em ${formatQuizDate(quiz.openDate)}`,
      color: "#1565c0",
    };
  if (state === "closed")
    return {
      label: `Encerrado em ${formatQuizDate(quiz.closeDate)}`,
      color: "#616161",
    };
  return {
    label: quiz.closeDate
      ? `Aberto até ${formatQuizDate(quiz.closeDate)}`
      : "Aberto",
    color: "#2e7d32",
  };
};

const QuizList = ({
  quizzes,
  videos,
  expandedQuiz,
  setExpandedQuiz,
  handleEditQuiz,
  handleRemoveQuiz,
  handleViewStudents,
  questionFormRef,
  handleEditQuestion,
  handleRemoveQuestion,
  quizzesListEndRef,
  entityType,
  entityItems,
  courseId,
  onAutoSaveQuestion,
  // Quiz cujas QUESTÕES estão em edição, e o alternador desse modo. O editor em
  // si vem de fora (renderQuestionEditor) para que todo o estado do formulário
  // de questões continue num lugar só.
  editQuiz,
  onToggleQuestionEditor,
  renderQuestionEditor,
}) => {
  const navigate = useNavigate();

  const handleStudentDashboard = (quizId) => {
    // Navega para a página de dashboard de estudantes com o quizId como parâmetro
    navigate(`/studentDashboard?quizId=${quizId}`);
  };

  return (
    <>
      <Typography
        variant="h6"
        sx={{ mt: 4, mb: 2, fontWeight: "bold", color: "#333", fontSize: { xs: '1.1rem', sm: '1.25rem' } }}
      >
        Quizzes Criados
      </Typography>

      <List ref={quizzesListEndRef}>
        {quizzes.map((quiz) => {
          const windowChip = windowChipProps(quiz);
          const editingQuestions = editQuiz?.videoId === quiz.videoId;
          return (
          <Card
            key={quiz.videoId}
            sx={{
              mb: 2,
              borderRadius: "8px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            <CardContent
              sx={{
                display: "flex",
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: "space-between",
                alignItems: { xs: 'flex-start', sm: 'center' },
                gap: { xs: 1, sm: 0 },
                pb: { xs: 1, sm: 2 }
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0, mb: { xs: 1, sm: 0 } }}>
                <Typography variant="subtitle1" sx={{ 
                  fontWeight: 500,
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: { xs: '250px', sm: '400px', md: '600px' }
                }}>
                  Quiz para:{" "}
                  {entityType === "slide"
                    ? entityItems.find((item) => item.id === quiz.slideId)
                        ?.title ||
                      `Slide ${quiz.slideId?.substring(0, 6) || ""}`
                    : videos.find((v) => v.id === quiz.videoId)?.title ||
                      "Vídeo não encontrado"}
                </Typography>
                <Typography variant="body2" sx={{ color: "#666", fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                  Nota mínima: {quiz.minPercentage}%
                </Typography>
                <Typography variant="body2" sx={{ color: "#666", fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                  Questões: {quiz.questions.length}
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
                  {quiz.isDiagnostic && (
                    <Chip
                      label="Diagnóstico"
                      size="small"
                      sx={{
                        backgroundColor: "#2196f3",
                        color: "#fff",
                        fontWeight: 500,
                        fontSize: { xs: '0.7rem', sm: '0.75rem' }
                      }}
                    />
                  )}
                  {windowChip && (
                    <Chip
                      label={windowChip.label}
                      size="small"
                      sx={{
                        backgroundColor: windowChip.color,
                        color: "#fff",
                        fontWeight: 500,
                        fontSize: { xs: '0.7rem', sm: '0.75rem' }
                      }}
                    />
                  )}
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: { xs: 0.5, sm: 1 }, alignSelf: { xs: 'flex-end', sm: 'center' } }}>
                <IconButton
                  onClick={() =>
                    setExpandedQuiz(
                      expandedQuiz === quiz.videoId ? null : quiz.videoId
                    )
                  }
                  sx={{ color: "#9041c1", p: { xs: 0.5, sm: 1 } }}
                  size="small"
                >
                  <ExpandMoreIcon fontSize="small" />
                </IconButton>
                <IconButton
                  onClick={() => handleEditQuiz(quiz)}
                  sx={{ color: "#9041c1", p: { xs: 0.5, sm: 1 } }}
                  size="small"
                  title="Editar informações do quiz"
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton
                  onClick={() => handleStudentDashboard(quiz.videoId)}
                  sx={{ color: "#9041c1", p: { xs: 0.5, sm: 1 } }}
                  size="small"
                  title="Ver estudantes"
                >
                  <PersonIcon fontSize="small" />
                </IconButton>
                <IconButton
                  onClick={() => handleRemoveQuiz(quiz)}
                  sx={{ color: "#d32f2f", p: { xs: 0.5, sm: 1 } }}
                  size="small"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            </CardContent>
            <Collapse
              in={expandedQuiz === quiz.videoId}
              timeout="auto"
              unmountOnExit
            >
              <CardContent>
                <Typography
                  variant="subtitle2"
                  sx={{ color: "#666", mb: 1, fontWeight: 600 }}
                >
                  Questões ({quiz.questions.length})
                </Typography>

                <QuestionList
                  quiz={quiz}
                  handleEditQuestion={handleEditQuestion}
                  handleRemoveQuestion={handleRemoveQuestion}
                  questionFormRef={questionFormRef}
                  courseId={courseId}
                  onAutoSaveQuestion={onAutoSaveQuestion}
                />

                <CardActions sx={{ px: { xs: 1, sm: 2 }, pb: { xs: 1, sm: 2 } }}>
                  <Button
                    variant={editingQuestions ? "outlined" : "contained"}
                    onClick={() => onToggleQuestionEditor(quiz)}
                    startIcon={editingQuestions ? <CloseIcon /> : <AddIcon />}
                    fullWidth={false}
                    sx={
                      editingQuestions
                        ? {
                            borderColor: "#9041c1",
                            color: "#9041c1",
                            "&:hover": {
                              borderColor: "#7d37a7",
                              backgroundColor: "#f5f0fa",
                            },
                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                            minWidth: { xs: '100%', sm: 'auto' },
                          }
                        : {
                            backgroundColor: "#9041c1",
                            "&:hover": { backgroundColor: "#7d37a7" },
                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                            minWidth: { xs: '100%', sm: 'auto' },
                          }
                    }
                  >
                    {editingQuestions ? "Fechar editor" : "Editar questões"}
                  </Button>
                </CardActions>

                {/* Editor de questões (gerador de PDF + formulário) no contexto
                    do próprio quiz, e não solto no rodapé da página. */}
                <Collapse in={editingQuestions} timeout="auto" unmountOnExit>
                  <Box
                    sx={{
                      mt: 1,
                      p: { xs: 1, sm: 2 },
                      borderRadius: 2,
                      border: "1px solid #e0e0e0",
                      backgroundColor: "#fafafa",
                    }}
                  >
                    {editingQuestions && renderQuestionEditor?.(quiz)}
                  </Box>
                </Collapse>
              </CardContent>
            </Collapse>
          </Card>
          );
        })}
      </List>
    </>
  );
};

export default QuizList;
