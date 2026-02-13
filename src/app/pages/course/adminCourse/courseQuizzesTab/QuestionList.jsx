import React from "react";
import {
  List,
  ListItem,
  ListItemText,
  Box,
  IconButton,
  Chip,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

const QuestionList = ({ 
  quiz, 
  handleEditQuestion, 
  handleRemoveQuestion,
  questionFormRef,
  courseId,
}) => {

  return (
    <>
      <List>
        {quiz.questions.map((question) => {
          const isOpenEnded = question.questionType === 'open-ended';
          
          return (
            <ListItem
              key={question.id}
              sx={{
                p: 2,
                borderBottom: "1px solid #e0e0e0",
                display: "flex",
                alignItems: "center",
                flexDirection: { xs: 'column', sm: 'row' },
                gap: { xs: 2, sm: 0 },
              }}
            >
              <Box sx={{ flex: 1, width: { xs: '100%', sm: 'auto' } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Chip
                    label={isOpenEnded ? 'Aberta' : 'Múltipla Escolha'}
                    size="small"
                    color={isOpenEnded ? 'secondary' : 'primary'}
                    sx={{ fontSize: '0.7rem' }}
                  />
                </Box>
                <ListItemText
                  primary={question.question}
                  secondary={
                    isOpenEnded
                      ? 'Resposta dissertativa'
                      : `Opções: ${question.options.join(", ")} | Correta: ${question.options[question.correctOption]}`
                  }
                  sx={{
                    pr: { xs: 0, sm: 10 },
                    flex: 1,
                  }}
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
              </Box>
              <Box
                sx={{
                  display: "flex",
                  gap: { xs: 1, sm: 0.5 },
                  position: { xs: 'relative', sm: 'absolute' },
                  right: { xs: 'auto', sm: 16 },
                  width: { xs: '100%', sm: 'auto' },
                  justifyContent: { xs: 'flex-end', sm: 'flex-start' },
                }}
              >
                <IconButton
                  onClick={() => {
                    handleEditQuestion(quiz, question);
                    questionFormRef.current?.scrollIntoView({ behavior: "smooth" });
                  }}
                  sx={{
                    color: "#9041c1",
                    "&:hover": { backgroundColor: "rgba(144, 65, 193, 0.1)" },
                  }}
                  size="small"
                  title="Editar questão"
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton
                  onClick={() => handleRemoveQuestion(quiz, question.id)}
                  sx={{
                    color: "#d32f2f",
                    "&:hover": { backgroundColor: "rgba(211, 47, 47, 0.1)" },
                  }}
                  size="small"
                  title="Remover questão"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            </ListItem>
          );
        })}
      </List>
    </>
  );
};

export default QuestionList;
