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
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import EditIcon from "@mui/icons-material/Edit";
import PersonIcon from "@mui/icons-material/Person";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import QuestionList from "./QuestionList";

const QuizList = ({
  quizzes,
  videos,
  expandedQuiz,
  setExpandedQuiz,
  handleEditQuiz,
  handleViewStudents,
  handleRemoveQuiz,
  quizSettingsRef,
  questionFormRef,
  handleEditQuestion,
  handleRemoveQuestion,
  quizzesListEndRef,
}) => {
  return (
    <>
      <Typography
        variant="h6"
        sx={{ mt: 4, mb: 2, fontWeight: "bold", color: "#333" }}
      >
        Quizzes Criados
      </Typography>

      <List ref={quizzesListEndRef}>
        {quizzes.map((quiz) => (
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
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                  Quiz para:{" "}
                  {videos.find((v) => v.id === quiz.videoId)?.title ||
                    "Vídeo não encontrado"}
                </Typography>
                <Typography variant="body2" sx={{ color: "#666" }}>
                  Nota mínima: {quiz.minPercentage}%
                </Typography>
                <Typography variant="body2" sx={{ color: "#666" }}>
                  Questões: {quiz.questions.length}
                </Typography>
              </Box>
              <Box>
                <IconButton
                  onClick={() =>
                    setExpandedQuiz(
                      expandedQuiz === quiz.videoId ? null : quiz.videoId
                    )
                  }
                  sx={{ color: "#9041c1" }}
                >
                  <ExpandMoreIcon />
                </IconButton>
                <IconButton
                  onClick={() => {
                    handleEditQuiz(quiz);
                    quizSettingsRef.current.scrollIntoView({
                      behavior: "smooth",
                    });
                  }}
                  sx={{ color: "#9041c1" }}
                >
                  <EditIcon />
                </IconButton>
                <IconButton
                  onClick={() => handleViewStudents(quiz.videoId)}
                  sx={{ color: "#9041c1" }}
                  title="Ver estudantes"
                >
                  <PersonIcon />
                </IconButton>
                <IconButton
                  onClick={() => handleRemoveQuiz(quiz)}
                  sx={{ color: "#d32f2f" }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            </CardContent>
            <Collapse
              in={expandedQuiz === quiz.videoId}
              timeout="auto"
              unmountOnExit
            >
              <CardContent>
                <QuestionList 
                  quiz={quiz}
                  handleEditQuestion={handleEditQuestion}
                  handleRemoveQuestion={handleRemoveQuestion}
                  questionFormRef={questionFormRef}
                />
                <CardActions>
                  <Button
                    variant="contained"
                    onClick={() => {
                      handleEditQuiz(quiz);
                      questionFormRef.current.scrollIntoView({
                        behavior: "smooth",
                      });
                    }}
                    startIcon={<AddIcon />}
                    sx={{
                      backgroundColor: "#9041c1",
                      "&:hover": { backgroundColor: "#7d37a7" },
                    }}
                  >
                    Adicionar Questão
                  </Button>
                </CardActions>
              </CardContent>
            </Collapse>
          </Card>
        ))}
      </List>
    </>
  );
};

export default QuizList;