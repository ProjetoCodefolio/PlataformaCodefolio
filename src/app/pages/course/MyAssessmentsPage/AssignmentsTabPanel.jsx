import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  FormControlLabel,
  Switch,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Loader from "$components/common/Loader";
import AssignmentList from "$components/courses/assignments/AssignmentList";

/** Aba "Trabalhos": enunciados de cada curso em que o aluno está matriculado. */
export default function AssignmentsTabPanel({
  courses,
  filteredTrabalhoCourses,
  assignmentsCountLoading,
  onlyWithAssignments,
  setOnlyWithAssignments,
  expandedTrabalhoId,
  setExpandedTrabalhoId,
  getCourseId,
  getCourseTitle,
  getAssignmentsCount,
  userName,
  userId,
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
          Seus trabalhos por curso · {filteredTrabalhoCourses.length} de {courses.length}
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={onlyWithAssignments}
              onChange={(e) => setOnlyWithAssignments(e.target.checked)}
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
              Somente cursos com trabalhos
            </Typography>
          }
        />
      </Box>

      {assignmentsCountLoading ? (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, py: 8 }}>
          <Loader />
          <Typography variant="body2" color="text.secondary">
            Carregando trabalhos dos cursos...
          </Typography>
        </Box>
      ) : filteredTrabalhoCourses.length === 0 ? (
        <Typography>
          {onlyWithAssignments && courses.length > 0
            ? "Nenhum curso com trabalhos publicados. Desative o filtro para ver todos os seus cursos."
            : "Nenhum curso encontrado."}
        </Typography>
      ) : (
        <Grid container spacing={3}>
          {filteredTrabalhoCourses.map((course) => {
            const courseId = getCourseId(course);
            const count = getAssignmentsCount(course);
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
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Aluno
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 700 }}>
                        {userName || "-"}
                      </Typography>
                    </Box>
                  </Box>
                  <CardContent sx={{ p: 0 }}>
                    <Accordion
                      expanded={expandedTrabalhoId === courseId}
                      onChange={() =>
                        setExpandedTrabalhoId(
                          expandedTrabalhoId === courseId ? null : courseId
                        )
                      }
                      TransitionProps={{ unmountOnExit: true }}
                      sx={{ boxShadow: "none", bgcolor: "transparent", borderRadius: 0, border: "none" }}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        sx={{
                          px: { xs: 2, sm: 3 },
                          py: { xs: 1.5, sm: 2 },
                          bgcolor: "#faf8fca7",
                          borderBottom: "1px solid #e3eafc",
                          minHeight: 0,
                        }}
                      >
                        <Typography sx={{ fontWeight: 700, fontSize: { xs: "0.875rem", sm: "1rem" } }}>
                          Trabalhos do curso
                        </Typography>
                        <Chip
                          label={`${count} trabalho${count === 1 ? "" : "s"}`}
                          size="small"
                          sx={{ ml: { xs: 1, sm: 2 }, bgcolor: "#e3e4e9ff", fontWeight: 700 }}
                        />
                      </AccordionSummary>
                      <AccordionDetails sx={{ px: { xs: 1.5, sm: 3 }, py: { xs: 1.5, sm: 2 }, bgcolor: "#fafdff" }}>
                        {courseId && userId ? (
                          <AssignmentList courseId={courseId} userId={userId} />
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Não foi possível carregar os trabalhos deste curso.
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
