import React from "react";
import { Box, Typography } from "@mui/material";
import QuestionResultDisplay from "./QuestionResultDisplay";
import StudentSelector from "./StudentSelector";
import AnswerOptions from "./AnswerOptions";

const QuestionDisplay = ({
  currentQuestion,
  currentQuestionIndex,
  totalQuestions,
  quizResults,
  courseTitle,
  quizTitle,
  loading,
  selectedStudent,
  onSortStudent,
  onOpenMenu,
  menuOpen,
  anchorEl,
  onCloseMenu,
  searchTerm,
  onSearchChange,
  filteredStudents,
  onSelectStudent,
  onAbleStudent,
  enrolledStudents,
  selectedAnswer,
  showFeedback,
  onAnswerSelect,
  isCorrectAnswer,
  waitingForNextStudent, // Nova prop
}) => {
  return (
    <Box
      sx={{
        width: "100%",
        mb: 3,
        display: "flex",
        flexDirection: "column",
        pr: { xs: 0, sm: 1 },
        position: "relative",
      }}
    >
      <Typography
        variant="h3"
        sx={{
          fontWeight: "bold",
          textAlign: "center",
          mb: { xs: 3, sm: 4 },
          fontSize: { xs: "1.6rem", sm: "2rem", md: "2.5rem" },
          lineHeight: 1.3,
          px: { xs: 1, sm: 2 },
          textShadow: "0px 2px 4px rgba(0,0,0,0.2)",
          position: "relative",
          wordBreak: "break-word",
          overflowWrap: "break-word",
          whiteSpace: "normal",
          maxWidth: "100%",
          "&::after": {
            content: '""',
            position: "absolute",
            bottom: "-10px",
            left: "50%",
            transform: "translateX(-50%)",
            width: { xs: "60px", sm: "80px" },
            height: "4px",
            backgroundColor: "#fff",
            borderRadius: "2px",
          },
        }}
      >
        {currentQuestion.question}
      </Typography>

      <QuestionResultDisplay
        currentQuestion={currentQuestion}
        quizResults={quizResults}
        courseTitle={courseTitle}
        quizTitle={quizTitle}
        currentQuestionIndex={currentQuestionIndex}
      />

      <StudentSelector
        loading={loading}
        selectedStudent={selectedStudent}
        onSortStudent={onSortStudent}
        onOpenMenu={onOpenMenu}
        menuOpen={menuOpen}
        anchorEl={anchorEl}
        onCloseMenu={onCloseMenu}
        searchTerm={searchTerm}
        onSearchChange={onSearchChange}
        filteredStudents={filteredStudents}
        onSelectStudent={onSelectStudent}
        onAbleStudent={onAbleStudent}
        enrolledStudents={enrolledStudents}
        waitingForNextStudent={waitingForNextStudent}
      />

      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          mt: 2,
          mb: 2,
          color: "rgba(255, 255, 255, 0.8)",
        }}
      >
        <Typography variant="body2">
          {`${currentQuestionIndex + 1} / ${totalQuestions}`}
        </Typography>
      </Box>

      <AnswerOptions
        options={currentQuestion.options}
        selectedAnswer={selectedAnswer}
        showFeedback={showFeedback}
        onAnswerSelect={onAnswerSelect}
        isCorrectAnswer={isCorrectAnswer}
        menuOpen={menuOpen}
      />
    </Box>
  );
};

export default QuestionDisplay;
