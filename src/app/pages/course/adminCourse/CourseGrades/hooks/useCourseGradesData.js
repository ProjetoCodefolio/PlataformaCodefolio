import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import * as gradesService from "$api/services/courses/grades";
import * as assessmentService from "$api/services/courses/assessments";
import * as courseService from "$api/services/courses/courses";

/**
 * Carrega curso, avaliações e notas de todos os alunos. `reload` relê tudo do
 * banco (usado após uma importação de CSV, cuja verdade passa a ser o banco).
 */
export function useCourseGradesData({ courseId, userId }) {
  const [loading, setLoading] = useState(true);
  const [studentsGrades, setStudentsGrades] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [courseDetails, setCourseDetails] = useState(null);
  const [error, setError] = useState(null);

  const loadCourseDetails = async () => {
    try {
      const details = await courseService.fetchCourseDetails(courseId);
      setCourseDetails(details);
    } catch (err) {
      console.error("Erro ao carregar detalhes do curso:", err);
    }
  };

  const loadCourseGrades = async () => {
    setLoading(true);
    setError(null);
    try {
      // Carregar avaliações
      const assessmentsData = await assessmentService.fetchAllAssessmentsByCourse(courseId);
      setAssessments(assessmentsData);

      // Carregar todas as notas
      const gradesData = await gradesService.fetchAllCourseGrades(courseId);
      setStudentsGrades(gradesData);
    } catch (err) {
      console.error("Erro ao carregar notas:", err);
      setError("Não foi possível carregar as notas do curso.");
      toast.error("Erro ao carregar notas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (courseId && userId) {
      loadCourseGrades();
      loadCourseDetails();
    }
  }, [courseId, userId]);

  return {
    loading,
    studentsGrades,
    setStudentsGrades,
    assessments,
    courseDetails,
    error,
    reload: loadCourseGrades,
  };
}
