import React from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Card,
  CardContent,
  Grid,
  Avatar,
  Stack,
  Divider,
  Chip,
} from "@mui/material";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import SortableHeader from "$components/common/SortableHeader";
import { capitalizeWords } from "$api/services/courses/studentDashboard";
import StudentAnswersDetail from "./StudentAnswersDetail";

/** Tabela de resultados do quiz regular (aba "Quiz"): nota, status e tentativas. */
export default function QuizResultsTable({
  quiz,
  sortedResults,
  sortField,
  sortOrder,
  onSort,
  liveQuizResults,
  customQuizResults,
  expandedStudentId,
  onExpandStudent,
}) {
  if (sortedResults.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 4 }}>
        <Typography variant="h6" color="textSecondary">
          Nenhum estudante realizou este quiz ainda
        </Typography>
      </Box>
    );
  }

  const statusLabel = (student) =>
    quiz.minPercentage === 0
      ? "N/A"
      : student.onlyLiveQuiz ||
        student.onlyCustomQuiz ||
        student.lastAttemptDate === "Não realizou o quiz"
      ? "Pendente"
      : student.passed
      ? "Aprovado"
      : "Reprovado";

  return (
    <>
      {/* Desktop Table */}
      <TableContainer sx={{ display: { xs: "none", md: "block" } }}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <SortableHeader label="Estudante" field="name" sortField={sortField} sortOrder={sortOrder} onSort={onSort} />
              <SortableHeader label="Email" field="email" sortField={sortField} sortOrder={sortOrder} onSort={onSort} />
              <SortableHeader label="Nota" field="score" sortField={sortField} sortOrder={sortOrder} onSort={onSort} />
              <SortableHeader label="Acertos" field="correctAnswers" sortField={sortField} sortOrder={sortOrder} onSort={onSort} />
              <SortableHeader label="Status" field="status" sortField={sortField} sortOrder={sortOrder} onSort={onSort} />
              <SortableHeader label="Tentativas" field="attemptCount" sortField={sortField} sortOrder={sortOrder} onSort={onSort} />
              <SortableHeader label="Última Tentativa" field="lastAttemptDate" sortField={sortField} sortOrder={sortOrder} onSort={onSort} />
              <SortableHeader label="Acertos Totais (Geral)" field="totalCorrect" sortField={sortField} sortOrder={sortOrder} onSort={onSort} />
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedResults.map((student) => (
              <React.Fragment key={student.userId}>
                <TableRow hover>
                  <TableCell>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                      }}
                    >
                      <IconButton
                        onClick={() => onExpandStudent(student.userId)}
                        size="small"
                        sx={{ color: "black" }}
                      >
                        {expandedStudentId === student.userId ? (
                          <KeyboardArrowDownIcon />
                        ) : (
                          <KeyboardArrowRightIcon />
                        )}
                      </IconButton>
                      <Avatar
                        src={student.photoURL}
                        alt={student.name}
                        sx={{
                          width: 40,
                          height: 40,
                          backgroundColor: "#9041c1",
                          color: "white",
                          fontWeight: "bold",
                        }}
                      >
                        {student.name.charAt(0).toUpperCase()}
                      </Avatar>
                      <Typography variant="body1">
                        {capitalizeWords(student.name)}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{student.email}</TableCell>
                  <TableCell>
                    <Typography
                      variant="body1"
                      sx={{ fontWeight: "medium" }}
                    >
                      {typeof student.score === "number"
                        ? student.score.toFixed(2)
                        : "0.00"}
                      %
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body1"
                      sx={{
                        fontWeight: "medium",
                        color:
                          quiz.minPercentage === 0
                            ? "#000"
                            : student.passed
                            ? "#2e7d32"
                            : "#c62828",
                      }}
                      title={`Acertos: ${student.correctAnswers}, Total: ${student.totalQuestions}, Score: ${student.score}%`}
                    >
                      {student.correctAnswers !== null &&
                      student.correctAnswers !== undefined
                        ? student.correctAnswers
                        : 0}
                      /
                      {student.totalQuestions ||
                        (quiz.questions ? quiz.questions.length : 0)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box
                      sx={{
                        backgroundColor:
                          quiz.minPercentage === 0
                            ? ""
                            : student.onlyLiveQuiz ||
                              student.onlyCustomQuiz ||
                              student.lastAttemptDate ===
                                "Não realizou o quiz"
                            ? "#fff8e1"
                            : student.passed
                            ? "#e8f5e9"
                            : "#ffebee",
                        color:
                          quiz.minPercentage === 0
                            ? "#000"
                            : student.onlyLiveQuiz ||
                              student.onlyCustomQuiz ||
                              student.lastAttemptDate ===
                                "Não realizou o quiz"
                            ? "#ff9800"
                            : student.passed
                            ? "#2e7d32"
                            : "#c62828",
                        borderRadius: 1,
                        px: 1,
                        py: 0.5,
                        display: "inline-block",
                        fontWeight: "bold",
                      }}
                    >
                      {statusLabel(student)}
                    </Box>
                  </TableCell>
                  <TableCell>{student.attemptCount}</TableCell>
                  <TableCell>{student.lastAttemptDate}</TableCell>
                  <TableCell>
                    <Typography
                      variant="body1"
                      sx={{ fontWeight: "bold", color: "#9041c1" }}
                    >
                      {(student.correctAnswers || 0) +
                        (liveQuizResults[student.userId]
                          ?.correctAnswers || 0) +
                        (customQuizResults[student.userId]
                          ?.correctAnswers || 0)}
                    </Typography>
                  </TableCell>
                </TableRow>
                {expandedStudentId === student.userId && (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <StudentAnswersDetail student={student} />
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Mobile Cards */}
      <Box sx={{ display: { xs: "block", md: "none" } }}>
        <Stack spacing={2}>
          {sortedResults.map((student) => (
            <Card
              key={student.userId}
              sx={{
                borderRadius: 2,
                boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
              }}
            >
              <CardContent sx={{ p: 2 }}>
                {/* Cabeçalho */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                  <IconButton
                    onClick={() => onExpandStudent(student.userId)}
                    size="small"
                    sx={{ color: "black", ml: -1 }}
                    aria-label={`Ver respostas detalhadas de ${student.name}`}
                  >
                    {expandedStudentId === student.userId ? (
                      <KeyboardArrowDownIcon />
                    ) : (
                      <KeyboardArrowRightIcon />
                    )}
                  </IconButton>
                  <Avatar
                    src={student.photoURL}
                    alt={student.name}
                    sx={{
                      width: 50,
                      height: 50,
                      backgroundColor: "#9041c1",
                    }}
                  >
                    {student.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="body1"
                      sx={{
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {capitalizeWords(student.name)}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        display: "block",
                      }}
                    >
                      {student.email}
                    </Typography>
                  </Box>
                  <Chip
                    label={statusLabel(student)}
                    color={
                      quiz.minPercentage === 0
                        ? "default"
                        : student.passed
                        ? "success"
                        : student.onlyLiveQuiz ||
                          student.onlyCustomQuiz ||
                          student.lastAttemptDate === "Não realizou o quiz"
                        ? "warning"
                        : "error"
                    }
                    size="small"
                    sx={{ fontWeight: "bold" }}
                  />
                </Box>

                <Divider sx={{ my: 1.5 }} />

                {/* Informações */}
                <Grid container spacing={1.5}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Nota
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "1.1rem" }}>
                      {typeof student.score === "number" ? student.score.toFixed(2) : "0.00"}%
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Acertos
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        fontSize: "1.1rem",
                        color:
                          quiz.minPercentage === 0
                            ? "#000"
                            : student.passed
                            ? "#2e7d32"
                            : "#c62828",
                      }}
                    >
                      {student.correctAnswers !== null && student.correctAnswers !== undefined
                        ? student.correctAnswers
                        : 0}
                      /{student.totalQuestions || (quiz.questions ? quiz.questions.length : 0)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Tentativas
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {student.attemptCount}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Acertos Totais
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: "#9041c1" }}>
                      {(student.correctAnswers || 0) +
                        (liveQuizResults[student.userId]?.correctAnswers || 0) +
                        (customQuizResults[student.userId]?.correctAnswers || 0)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Última Tentativa
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {student.lastAttemptDate}
                    </Typography>
                  </Grid>
                </Grid>
                {expandedStudentId === student.userId && (
                  <Box sx={{ mt: 2 }}>
                    <StudentAnswersDetail student={student} />
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Box>
    </>
  );
}
