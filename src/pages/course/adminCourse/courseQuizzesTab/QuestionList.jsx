import React from "react";
import {
  List,
  ListItem,
  ListItemText,
  Box,
  IconButton,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

const QuestionList = ({ 
  quiz, 
  handleEditQuestion, 
  handleRemoveQuestion,
  questionFormRef
}) => {
  return (
    <List>
      {quiz.questions.map((question) => (
        <ListItem
          key={question.id}
          sx={{
            p: 2,
            borderBottom: "1px solid #e0e0e0",
            display: "flex",
            alignItems: "center",
          }}
        >
          <ListItemText
            primary={question.question}
            secondary={`Opções: ${question.options.join(
              ", "
            )} | Correta: ${
              question.options[question.correctOption]
            }`}
            sx={{
              pr: 10,
              flex: 1,
            }}
            primaryTypographyProps={{
              sx: {
                wordBreak: "break-word",
                whiteSpace: "normal",
              },
            }}
            secondaryTypographyProps={{
              sx: {
                wordBreak: "break-word",
                whiteSpace: "normal",
                overflow: "hidden",
                textOverflow: "ellipsis",
              },
            }}
          />
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              position: "absolute",
              right: 16,
            }}
          >
            <IconButton
              onClick={() => {
                handleEditQuestion(quiz, question);
                questionFormRef.current.scrollIntoView({
                  behavior: "smooth",
                });
              }}
              sx={{ color: "#9041c1" }}
            >
              <EditIcon />
            </IconButton>
            <IconButton
              onClick={() =>
                handleRemoveQuestion(quiz, question.id)
              }
              sx={{ color: "#d32f2f" }}
            >
              <DeleteIcon />
            </IconButton>
          </Box>
        </ListItem>
      ))}
    </List>
  );
};

export default QuestionList;