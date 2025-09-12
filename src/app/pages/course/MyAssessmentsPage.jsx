import React, { useEffect, useState } from "react";
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
  CircularProgress,
  Chip,
  Tooltip,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Topbar from "$components/topbar/Topbar";
import { useAuth } from "$context/AuthContext";
import * as studentService from "$api/services/courses/students";
import * as assessmentService from "$api/services/courses/assessments";
import { database } from "$api/config/firebase";
import { ref, get } from "firebase/database";

export default function MyAssessmentsPage() {
  const { userDetails } = useAuth();
  const userId = userDetails?.userId;

  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [expandedCourseId, setExpandedCourseId] = useState(null);
  const [courseAssessmentsMap, setCourseAssessmentsMap] = useState({});
  const [courseMetaMap, setCourseMetaMap] = useState({});
  const [userFallbackName, setUserFallbackName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const userName =
    userDetails?.name ||
    userDetails?.displayName ||
    userDetails?.user?.displayName ||
    userDetails?.profile?.name ||
    userDetails?.email ||
    userDetails?.user?.email ||
    userFallbackName ||
    "";

  const getCourseId = (c) =>
    c?.courseId ?? c?.id ?? c?.course?.id ?? c?.course?.courseId;
  const getCourseTitle = (c) =>
    c?.title ||
    c?.name ||
    c?.courseTitle ||
    c?.course?.title ||
    c?.course?.name ||
    c?.courseInfo?.title ||
    c?.courseInfo?.name ||
    (courseMetaMap[getCourseId(c)]?.title ?? `Curso ${getCourseId(c)}`);

  useEffect(() => {
    if (!userId) return;

    const loadStudentCourses = async () => {
      try {
        setLoading(true);
        const studentCourses = await studentService.fetchStudentCourses(userId);
        const list = (studentCourses || []).map((c) => ({
          ...c,
          id: getCourseId(c),
        }));
        list.sort((a, b) => getCourseTitle(a).localeCompare(getCourseTitle(b)));
        setCourses(list);
      } catch (err) {
        console.error("Erro ao carregar cursos do estudante:", err);
        setCourses([]);
      } finally {
        setLoading(false);
      }
    };

    loadStudentCourses();
  }, [userId]);

  // Fallback: obter nome do usuário no DB se não vier do Auth
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const snap = await get(ref(database, `users/${userId}`));
        if (snap.exists()) {
          const u = snap.val();
          const display =
            u?.displayName ||
            u?.name ||
            (u?.firstName && `${u.firstName} ${u.lastName || ""}`) ||
            "";
          setUserFallbackName((display || u?.email || "").trim());
        }
      } catch (e) {
        // silencioso
      }
    })();
  }, [userId]);

  // Hidratar metadados de cursos faltantes (apenas title) diretamente do Firebase
  useEffect(() => {
    const missing = (courses || []).filter((c) => !c.title && !c.name);
    if (missing.length === 0) return;
    (async () => {
      try {
        const updates = await Promise.all(
          missing.map(async (c) => {
            const id = getCourseId(c);
            if (!id) return null;
            try {
              const snap = await get(ref(database, `courses/${id}`));
              if (snap.exists()) {
                const raw = snap.val();
                const title =
                  raw?.title ||
                  raw?.name ||
                  raw?.courseTitle ||
                  raw?.course?.title ||
                  raw?.course?.name ||
                  raw?.courseInfo?.title ||
                  raw?.courseInfo?.name ||
                  `Curso ${id}`;
                return { id, title };
              }
            } catch (e) {
              // ignora falha isolada
            }
            return { id, title: `Curso ${id}` };
          })
        );
        const map = {};
        updates.filter(Boolean).forEach((m) => {
          map[m.id] = { title: m.title };
        });
        if (Object.keys(map).length) {
          setCourseMetaMap((prev) => ({ ...prev, ...map }));
          setCourses((prev) =>
            prev.map((c) => {
              const id = getCourseId(c);
              const meta = map[id];
              return meta ? { ...c, title: c.title || meta.title } : c;
            })
          );
        }
      } catch {}
    })();
  }, [courses]);

  // Novo useEffect para buscar a quantidade de avaliações de todos os cursos ao carregar
  useEffect(() => {
    if (!courses.length) return;
    (async () => {
      const updates = {};
      await Promise.all(
        courses.map(async (course) => {
          const courseId = getCourseId(course);
          if (!courseId || courseAssessmentsMap[courseId]?.assessments) return;
          try {
            const assessments = await assessmentService.fetchAssessments(
              courseId
            );
            updates[courseId] = {
              loading: false,
              assessments: assessments || [],
            };
          } catch {
            updates[courseId] = {
              loading: false,
              assessments: [],
            };
          }
        })
      );
      if (Object.keys(updates).length) {
        setCourseAssessmentsMap((prev) => ({ ...prev, ...updates }));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courses]);

  const handleToggleCourse = async (course) => {
    const courseId = getCourseId(course);
    const isExpanding = expandedCourseId !== courseId;
    setExpandedCourseId(isExpanding ? courseId : null);
    if (!isExpanding) return;

    // Só busca as notas do usuário se ainda não buscou
    if (
      courseAssessmentsMap[courseId] &&
      courseAssessmentsMap[courseId].assessments &&
      courseAssessmentsMap[courseId].assessments.some(
        (a) => a.userGrade !== undefined
      )
    ) {
      return;
    }

    setCourseAssessmentsMap((prev) => ({
      ...prev,
      [courseId]: {
        loading: true,
        assessments: prev[courseId]?.assessments || [],
      },
    }));

    try {
      const assessments =
        courseAssessmentsMap[courseId]?.assessments ||
        (await assessmentService.fetchAssessments(courseId)) ||
        [];

      const withGrades = await Promise.all(
        assessments.map(async (assess) => {
          const assessId = assess.id || assess.assessmentId;
          let userGrade = null;
          try {
            const grades = await assessmentService.getAssessmentGrades(
              courseId,
              assessId
            );
            const g = (grades || []).find((gg) => gg.studentId === userId);
            if (g) userGrade = g.grade;
          } catch (e) {
            console.error("Erro ao buscar notas para assessment", assessId, e);
          }
          return { ...assess, userGrade };
        })
      );

      setCourseAssessmentsMap((prev) => ({
        ...prev,
        [courseId]: { loading: false, assessments: withGrades },
      }));
    } catch (err) {
      console.error("Erro ao carregar avaliações do curso:", courseId, err);
      setCourseAssessmentsMap((prev) => ({
        ...prev,
        [courseId]: { loading: false, assessments: [] },
      }));
    }
  };

  const fmt = (n) =>
    Number.isFinite(n)
      ? n.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : "0,00";

  // Função para filtrar cursos pelo termo de busca
  const filteredCourses = courses.filter((course) => {
    const title = getCourseTitle(course).toLowerCase();
    return title.includes(searchTerm.toLowerCase());
  });

  return (
    <>
      <Topbar hideSearch={false} onSearch={setSearchTerm} />
      <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1200, mx: "auto", mt: 8 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {!filteredCourses || filteredCourses.length === 0 ? (
              <Typography>Nenhum curso encontrado.</Typography>
            ) : (
              <Grid container spacing={3}>
                {filteredCourses.map((course) => {
                  const courseId = getCourseId(course);
                  const mapEntry = courseAssessmentsMap[courseId] || {
                    loading: false,
                    assessments: null,
                  };

                  const totalWeighted = Array.isArray(mapEntry.assessments)
                    ? mapEntry.assessments.reduce((acc, a) => {
                        const grade = Number(a?.userGrade ?? 0);
                        const pct = Number(a?.percentage ?? a?.weight ?? 0);
                        if (!Number.isFinite(grade) || !Number.isFinite(pct))
                          return acc;
                        return acc + grade * (pct / 100);
                      }, 0)
                    : 0;
                  const totalWeightedCapped = Math.min(totalWeighted, 10);
                  const progressValue = Math.max(
                    0,
                    Math.min(100, (totalWeightedCapped / 10) * 100)
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
                            px: 3,
                            pt: 3,
                            pb: 1,
                            borderBottom: "1px solid #e3eafc",
                          }}
                        >
                          <Box>
                            <Typography
                              variant="h5"
                              sx={{ fontWeight: 900, color: "#964bd0ff" }}
                            >
                              {getCourseTitle(course)}
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: "right" }}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ fontWeight: 600 }}
                            >
                              Aluno
                            </Typography>
                            <Typography
                              variant="body1"
                              sx={{ fontWeight: 700 }}
                            >
                              {userName || "—"}
                            </Typography>
                          </Box>
                        </Box>
                        <CardContent sx={{ p: 0 }}>
                          <Accordion
                            expanded={expandedCourseId === courseId}
                            onChange={() => handleToggleCourse(course)}
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
                                px: 3,
                                py: 2,
                                bgcolor: "#faf8fca7",
                                borderBottom: "1px solid #e3eafc",
                                borderRadius: 0,
                                minHeight: 0,
                              }}
                            >
                              <Typography sx={{ fontWeight: 700 }}>
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
                                  ml: 2,
                                  bgcolor: "#e3e4e9ff",
                                  fontWeight: 700,
                                }}
                              />
                            </AccordionSummary>
                            <AccordionDetails
                              sx={{ px: 3, py: 2, bgcolor: "#fafdff" }}
                            >
                              {mapEntry.loading ? (
                                <Box
                                  sx={{
                                    display: "flex",
                                    justifyContent: "center",
                                    py: 2,
                                  }}
                                >
                                  <CircularProgress size={20} />
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
                                        <Box
                                          sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            py: 1.5,
                                            px: 2,
                                            bgcolor: "#f5f8ff",
                                            borderRadius: 2,
                                            mb: 1.5,
                                          }}
                                        >
                                          <Box>
                                            <Typography
                                              sx={{ fontWeight: 700 }}
                                            >
                                              {a.name}
                                            </Typography>
                                            <Typography
                                              variant="caption"
                                              color="text.secondary"
                                            >
                                              Percentual:{" "}
                                              {Number(
                                                a?.percentage ?? a?.weight ?? 0
                                              )}
                                              %
                                            </Typography>
                                          </Box>
                                          <Box sx={{ textAlign: "right" }}>
                                            <Chip
                                              label={
                                                a?.userGrade != null
                                                  ? a.userGrade
                                                  : "Sem nota"
                                              }
                                              color={
                                                a?.userGrade != null
                                                  ? "success"
                                                  : "default"
                                              }
                                              size="small"
                                              sx={{
                                                backgroundColor:
                                                  a?.userGrade != null
                                                    ? "#e6f4ea"
                                                    : undefined,
                                                color:
                                                  a?.userGrade != null
                                                    ? "#2e7d32"
                                                    : undefined,
                                                fontWeight: 800,
                                              }}
                                            />
                                          </Box>
                                        </Box>
                                      </React.Fragment>
                                    ))}
                                  </List>
                                  <Divider sx={{ my: 2 }} />
                                  <Box
                                    sx={{
                                      display: "flex",
                                      justifyContent: "flex-end",
                                      alignItems: "center",
                                    }}
                                  >
                                    <Card
                                      variant="outlined"
                                      sx={{
                                        px: 3,
                                        py: 2,
                                        borderRadius: 2,
                                        bgcolor: "#f5f8ff",
                                        borderColor: "#b362c7ff",
                                        minWidth: 180,
                                        boxShadow: "none",
                                      }}
                                    >
                                      <Box
                                        sx={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 2,
                                        }}
                                      >
                                        <Box sx={{ textAlign: "right" }}>
                                          <Typography
                                            variant="caption"
                                            sx={{
                                              color: "text.secondary",
                                              fontWeight: 700,
                                            }}
                                          >
                                            Nota total
                                          </Typography>
                                          <Tooltip title="Soma das notas ponderadas: nota × (percentual/100)">
                                            <Typography
                                              variant="h5"
                                              sx={{ fontWeight: 900 }}
                                            >
                                              {fmt(totalWeightedCapped)}
                                            </Typography>
                                          </Tooltip>
                                          <Typography
                                            variant="caption"
                                            color="text.secondary"
                                          >
                                            de 10,00
                                          </Typography>
                                        </Box>
                                        <CircularProgress
                                          variant="determinate"
                                          value={progressValue}
                                          size={54}
                                          thickness={5}
                                          sx={{
                                            color: "#a84fd4ff",
                                            bgcolor: "#e3eafc",
                                            borderRadius: "50%",
                                          }}
                                        />
                                      </Box>
                                    </Card>
                                  </Box>
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
        )}
      </Box>
    </>
  );
}
