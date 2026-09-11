import React from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  Divider,
  Chip,
  Stack,
  FormControlLabel,
  Switch,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Loader from "$components/common/Loader";
import AssessmentListItem from "./AssessmentListItem";
import WeightedTotalCard from "./WeightedTotalCard";

const fmt = (n) =>
  Number.isFinite(n)
    ? n.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "0,00";

/** Soma ponderada (nota × percentual/100) das avaliações já com nota do aluno, capada em 10. */
const computeWeightedTotal = (assessments) => {
  const totalWeighted = Array.isArray(assessments)
    ? assessments.reduce((acc, a) => {
        const grade = Number(a?.userGrade ?? 0);
        const pct = Number(a?.percentage ?? a?.weight ?? 0);
        if (!Number.isFinite(grade) || !Number.isFinite(pct)) return acc;
        return acc + grade * (pct / 100);
      }, 0)
    : 0;
  const totalWeightedCapped = Math.min(totalWeighted, 10);
  const progressValue = Math.max(0, Math.min(100, (totalWeightedCapped / 10) * 100));
  return { totalWeightedCapped, progressValue };
};

/** Aba "Notas": avaliações já cadastradas em cada curso e a nota ponderada do aluno. */
export default function AssessmentsTabPanel({
  courses,
  filteredCourses,
  courseAssessmentsMap,
  assessmentsLoading,
  onlyWithAssessments,
  setOnlyWithAssessments,
  expandedCourseId,
  onToggleCourse,
  getCourseId,
  getCourseTitle,
  userName,
}) {
  return (
    <>
      {/* Barra de filtros */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "flex-start", sm: "center" },
          justifyContent: "space-between",
          gap: 1.5,
          mb: 3,
        }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
          Exibindo {filteredCourses.length} de {courses.length} curso(s)
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <FormControlLabel
            control={
              <Switch
                checked={onlyWithAssessments}
                onChange={(e) => setOnlyWithAssessments(e.target.checked)}
                sx={{
                  "& .MuiSwitch-switchBase.Mui-checked": { color: "#9041c1" },
                  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                    backgroundColor: "#9041c1",
                  },
                }}
              />
            }
            label={
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Somente cursos com avaliações cadastradas
              </Typography>
            }
          />
        </Stack>
      </Box>

      {assessmentsLoading ? (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            py: 8,
          }}
        >
          <Loader />
          <Typography variant="body2" color="text.secondary">
            Carregando avaliações dos cursos...
          </Typography>
        </Box>
      ) : !filteredCourses || filteredCourses.length === 0 ? (
        <Typography>
          {onlyWithAssessments && courses.length > 0
            ? "Nenhum curso com avaliações cadastradas. Desative o filtro para ver todos os seus cursos."
            : "Nenhum curso encontrado."}
        </Typography>
      ) : (
        <Grid container spacing={3}>
          {filteredCourses.map((course) => {
            const courseId = getCourseId(course);
            const mapEntry = courseAssessmentsMap[courseId] || {
              loading: false,
              assessments: null,
            };

            const { totalWeightedCapped, progressValue } = computeWeightedTotal(
              mapEntry.assessments
            );

            return (
              <Grid item xs={12} key={courseId || Math.random()}>
                <Card
                  variant="outlined"
                  sx={{
                    borderRadius: 3,
                    boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
                    borderColor: "#e3eafc",
                    overflow: "hidden",
                    bgcolor: "#fafdff",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      px: { xs: 2, sm: 3 },
                      pt: { xs: 2, sm: 3 },
                      pb: 1,
                      borderBottom: "1px solid #e3eafc",
                      flexDirection: { xs: "column", sm: "row" },
                      gap: { xs: 1, sm: 0 },
                    }}
                  >
                    <Box sx={{ textAlign: { xs: "center", sm: "left" } }}>
                      <Typography
                        variant="h5"
                        sx={{
                          fontWeight: 900,
                          color: "#964bd0ff",
                          fontSize: { xs: "1.25rem", sm: "1.5rem" },
                        }}
                      >
                        {getCourseTitle(course)}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: { xs: "center", sm: "right" } }}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          fontWeight: 600,
                          fontSize: { xs: "0.75rem", sm: "0.813rem" },
                        }}
                      >
                        Aluno
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{
                          fontWeight: 700,
                          fontSize: { xs: "0.875rem", sm: "1rem" },
                        }}
                      >
                        {userName || "-"}
                      </Typography>
                    </Box>
                  </Box>
                  <CardContent sx={{ p: 0 }}>
                    <Accordion
                      expanded={expandedCourseId === courseId}
                      onChange={() => onToggleCourse(course)}
                      sx={{
                        boxShadow: "none",
                        bgcolor: "transparent",
                        borderRadius: 0,
                        border: "none",
                      }}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        sx={{
                          px: { xs: 2, sm: 3 },
                          py: { xs: 1.5, sm: 2 },
                          bgcolor: "#faf8fca7",
                          borderBottom: "1px solid #e3eafc",
                          borderRadius: 0,
                          minHeight: 0,
                        }}
                      >
                        <Typography
                          sx={{
                            fontWeight: 700,
                            fontSize: { xs: "0.875rem", sm: "1rem" },
                          }}
                        >
                          Avaliações do curso
                        </Typography>
                        <Chip
                          label={
                            mapEntry.assessments
                              ? `${mapEntry.assessments.length} avaliações`
                              : mapEntry.loading
                              ? "Carregando..."
                              : ""
                          }
                          size="small"
                          sx={{
                            ml: { xs: 1, sm: 2 },
                            bgcolor: "#e3e4e9ff",
                            fontWeight: 700,
                            fontSize: { xs: "0.688rem", sm: "0.75rem" },
                          }}
                        />
                      </AccordionSummary>
                      <AccordionDetails
                        sx={{
                          px: { xs: 2, sm: 3 },
                          py: { xs: 1.5, sm: 2 },
                          bgcolor: "#fafdff",
                        }}
                      >
                        {mapEntry.loading ? (
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "center",
                              py: 2,
                            }}
                          >
                            <Loader size={20} />
                          </Box>
                        ) : mapEntry.assessments &&
                          mapEntry.assessments.length === 0 ? (
                          <Typography variant="body2">
                            Nenhuma avaliação encontrada neste curso.
                          </Typography>
                        ) : mapEntry.assessments ? (
                          <>
                            <List disablePadding>
                              {mapEntry.assessments.map((a) => (
                                <React.Fragment
                                  key={a.id || a.assessmentId || a.name}
                                >
                                  <AssessmentListItem assessment={a} />
                                </React.Fragment>
                              ))}
                            </List>
                            <Divider sx={{ my: 2 }} />
                            <WeightedTotalCard
                              totalWeightedCapped={totalWeightedCapped}
                              progressValue={progressValue}
                              fmt={fmt}
                            />
                          </>
                        ) : (
                          <Typography variant="body2">
                            Clique para carregar avaliações deste curso.
                          </Typography>
                        )}
                      </AccordionDetails>
                    </Accordion>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </>
  );
}
