import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Grid,
  Avatar,
  Stack,
  Divider,
} from "@mui/material";
import SortableHeader from "$components/common/SortableHeader";
import { capitalizeWords } from "$api/services/courses/studentDashboard";

// As duas telas (Live Quiz e Custom Quiz) nasceram como cópia uma da outra e
// acumularam pequenas diferenças visuais reais ao longo do tempo — não são
// um mero acidente de copiar/colar, então em vez de unificar (e mudar o que
// já está em produção), cada uma é preservada aqui como uma variante.
const VARIANT_STYLES = {
  live: {
    correctColor: undefined,
    wrongColor: undefined,
    desktopBarWidth: 50,
    desktopBarHeight: 6,
    desktopBarTrackColor: "rgba(0,0,0,0.1)",
    desktopRateColored: true,
    mobileBarBg: "rgba(0,0,0,0.1)",
    mobileRateColored: true,
  },
  custom: {
    correctColor: "#2e7d32",
    wrongColor: "#c62828",
    desktopBarWidth: 60,
    desktopBarHeight: 8,
    desktopBarTrackColor: "#f0f0f0",
    desktopRateColored: false,
    mobileBarBg: "#f0f0f0",
    mobileRateColored: false,
  },
};

/**
 * Tabela de engajamento (acertos/erros/sorteios) das abas Live Quiz e Custom
 * Quiz — mesmo formato de dado (`resultsMap`), reutilizada pelas duas com um
 * `variant` que preserva as diferenças visuais próprias de cada uma.
 */
export default function EngagementQuizTable({
  variant,
  resultsMap,
  liveQuizResults,
  customQuizResults,
  sortedResults,
  sortField,
  sortOrder,
  onSort,
  emptyMessage,
}) {
  const style = VARIANT_STYLES[variant];

  if (sortedResults.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 4 }}>
        <Typography variant="h6" color="textSecondary">
          {emptyMessage}
        </Typography>
      </Box>
    );
  }

  const rowData = (student) => {
    const studentData = resultsMap[student.userId] || {};
    const correctAnswers = studentData.correctAnswers || 0;
    const wrongAnswers = studentData.wrongAnswers || 0;
    const totalAnswered = correctAnswers + wrongAnswers;
    const successRate =
      totalAnswered > 0 ? Math.round((correctAnswers / totalAnswered) * 100) : 0;
    const totalCorrectAnswers =
      (liveQuizResults[student.userId]?.correctAnswers || 0) +
      (customQuizResults[student.userId]?.correctAnswers || 0);

    return { studentData, correctAnswers, wrongAnswers, successRate, totalCorrectAnswers };
  };

  return (
    <>
      {/* Desktop Table */}
      <TableContainer sx={{ display: { xs: "none", md: "block" } }}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <SortableHeader label="Estudante" field="name" sortField={sortField} sortOrder={sortOrder} onSort={onSort} />
              <SortableHeader label="Email" field="email" sortField={sortField} sortOrder={sortOrder} onSort={onSort} />
              <TableCell sx={{ fontWeight: "bold" }}>Acertos</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Erros</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Vezes Sorteado</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Taxa de Acerto</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Acertos Totais (Live + Custom)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedResults.map((student) => {
              const { studentData, correctAnswers, wrongAnswers, successRate, totalCorrectAnswers } =
                rowData(student);

              return (
                <TableRow key={student.userId} hover>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
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
                      <Typography variant="body1">{capitalizeWords(student.name)}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{student.email}</TableCell>
                  <TableCell>
                    <Typography variant="body1" sx={{ fontWeight: "medium", color: style.correctColor }}>
                      {correctAnswers}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body1" sx={{ fontWeight: "medium", color: style.wrongColor }}>
                      {wrongAnswers}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body1"
                      sx={{ fontWeight: "bold", color: studentData.timesDraw > 0 ? "#ff9800" : "inherit" }}
                    >
                      {studentData.timesDraw || 0}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Typography
                        variant="body1"
                        sx={
                          style.desktopRateColored
                            ? { fontWeight: "medium", color: successRate > 50 ? "#2e7d32" : "#c62828" }
                            : undefined
                        }
                      >
                        {successRate}%
                      </Typography>
                      <Box
                        sx={{
                          ml: 1,
                          width: style.desktopBarWidth,
                          backgroundColor: style.desktopBarTrackColor,
                          height: style.desktopBarHeight,
                          borderRadius: style.desktopBarHeight / 2,
                          position: "relative",
                          overflow: "hidden",
                        }}
                      >
                        <Box
                          sx={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            height: "100%",
                            width: `${successRate}%`,
                            backgroundColor: successRate > 50 ? "#2e7d32" : "#c62828",
                          }}
                        />
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body1" sx={{ fontWeight: "bold", color: "#2e7d32" }}>
                      {totalCorrectAnswers}
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Mobile Cards */}
      <Box sx={{ display: { xs: "block", md: "none" } }}>
        <Stack spacing={2}>
          {sortedResults.map((student) => {
            const { studentData, correctAnswers, wrongAnswers, successRate, totalCorrectAnswers } =
              rowData(student);

            return (
              <Card key={student.userId} sx={{ borderRadius: 2, boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)" }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                    <Avatar src={student.photoURL} alt={student.name} sx={{ width: 50, height: 50, backgroundColor: "#9041c1" }}>
                      {student.name.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body1" sx={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {capitalizeWords(student.name)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                        {student.email}
                      </Typography>
                    </Box>
                  </Box>
                  <Divider sx={{ my: 1.5 }} />
                  <Grid container spacing={1.5}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Acertos</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "1.1rem", color: "#2e7d32" }}>{correctAnswers}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Erros</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "1.1rem", color: "#c62828" }}>{wrongAnswers}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Vezes Sorteado</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: studentData.timesDraw > 0 ? "#ff9800" : "inherit" }}>
                        {studentData.timesDraw || 0}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Taxa de Acerto</Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            color: style.mobileRateColored ? (successRate > 50 ? "#2e7d32" : "#c62828") : undefined,
                          }}
                        >
                          {successRate}%
                        </Typography>
                        <Box sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: style.mobileBarBg, overflow: "hidden" }}>
                          <Box sx={{ height: "100%", width: `${successRate}%`, bgcolor: successRate > 50 ? "#2e7d32" : "#c62828" }} />
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary">Acertos Totais (Live + Custom)</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "#2e7d32", fontSize: "1.1rem" }}>{totalCorrectAnswers}</Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      </Box>
    </>
  );
}
