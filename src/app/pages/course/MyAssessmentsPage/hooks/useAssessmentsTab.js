import { useEffect, useState } from "react";
import * as assessmentService from "$api/services/courses/assessments";

/**
 * Aba "Notas": avaliações já cadastradas em cada curso, com a nota do aluno
 * (buscada sob demanda, ao expandir o curso pela primeira vez).
 */
export function useAssessmentsTab({ courses, userId, getCourseId, getCourseTitle, searchTerm }) {
  const [courseAssessmentsMap, setCourseAssessmentsMap] = useState({});
  // assessmentsLoading evita "piscar" a lista vazia enquanto a contagem de
  // avaliações de cada curso ainda está sendo carregada.
  const [assessmentsLoading, setAssessmentsLoading] = useState(true);
  // Por padrão, esconde cursos sem avaliações cadastradas para não poluir a tela.
  const [onlyWithAssessments, setOnlyWithAssessments] = useState(true);
  const [expandedCourseId, setExpandedCourseId] = useState(null);

  // Busca a quantidade de avaliações de todos os cursos ao carregar
  useEffect(() => {
    if (!courses.length) {
      setAssessmentsLoading(false);
      return;
    }
    let active = true;
    (async () => {
      setAssessmentsLoading(true);
      const updates = {};
      await Promise.all(
        courses.map(async (course) => {
          const courseId = getCourseId(course);
          if (!courseId || courseAssessmentsMap[courseId]?.assessments) return;
          try {
            const assessments = await assessmentService.fetchAllAssessmentsByCourse(
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
      if (!active) return;
      if (Object.keys(updates).length) {
        setCourseAssessmentsMap((prev) => ({ ...prev, ...updates }));
      }
      setAssessmentsLoading(false);
    })();
    return () => {
      active = false;
    };
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
        (await assessmentService.fetchAllAssessmentsByCourse(courseId)) ||
        [];

      const withGrades = await Promise.all(
        assessments.map(async (assess) => {
          const assessId = assess.id || assess.assessmentId;
          let userGrade = null;
          let userFeedback = null;
          try {
            const grades = await assessmentService.getAssessmentGrades(
              courseId,
              assessId
            );
            const g = (grades || []).find((gg) => gg.studentId === userId);
            if (g) {
              userGrade = g.grade;
              userFeedback = g.feedback || null;
            }
          } catch (e) {
            console.error("Erro ao buscar notas para assessment", assessId, e);
          }
          return { ...assess, userGrade, userFeedback };
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

  // Quantidade de avaliações cadastradas em um curso (já carregada em massa)
  const getAssessmentsCount = (course) => {
    const id = getCourseId(course);
    const entry = courseAssessmentsMap[id];
    return Array.isArray(entry?.assessments) ? entry.assessments.length : 0;
  };
  const hasAssessments = (course) => getAssessmentsCount(course) > 0;

  // Filtra cursos por: termo de busca (nome) + "somente com avaliações cadastradas"
  const filteredCourses = courses.filter((course) => {
    const title = getCourseTitle(course).toLowerCase();
    const matchesSearch = title.includes(searchTerm.toLowerCase());
    const matchesAssessmentsFilter = !onlyWithAssessments || hasAssessments(course);
    return matchesSearch && matchesAssessmentsFilter;
  });

  return {
    courseAssessmentsMap,
    assessmentsLoading,
    onlyWithAssessments,
    setOnlyWithAssessments,
    expandedCourseId,
    handleToggleCourse,
    filteredCourses,
  };
}
