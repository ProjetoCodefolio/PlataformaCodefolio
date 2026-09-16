import { useEffect, useState } from "react";
import * as assessmentService from "$api/services/courses/assessments";
import * as studentService from "$api/services/courses/students";
import * as courseService from "$api/services/courses/courses";

/**
 * Carrega curso, avaliação específica (por `assessmentId`), alunos
 * enriquecidos e as notas já lançadas para essa avaliação.
 */
export function useGradeAssignmentData({ courseId, assessmentId }) {
  const [students, setStudents] = useState([]);
  const [assessment, setAssessment] = useState(null);
  const [assessmentDetails, setAssessmentDetails] = useState(null);
  const [courseDetails, setCourseDetails] = useState({});
  const [grades, setGrades] = useState({});
  const [saveStatus, setSaveStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!courseId || !assessmentId) {
      setError("Parâmetros inválidos");
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);

        // Carregar detalhes do curso
        const course = await courseService.fetchCourseDetails(courseId);
        setCourseDetails(course);

        // Carregar avaliação
        const assessments = await assessmentService.fetchAllAssessmentsByCourse(courseId);
        const currentAssessment = assessments.find(
          (a) => a.id === assessmentId
        );
        if (!currentAssessment) {
          setError("Avaliação não encontrada");
          setLoading(false);
          return;
        }
        setAssessment(currentAssessment);
        setAssessmentDetails(currentAssessment);

        // Carregar estudantes do curso usando o método enriquecido
        const courseStudents = await studentService.fetchCourseStudentsEnriched(
          courseId
        );
        setStudents(courseStudents);

        // Carregar notas existentes
        const existingGrades = await assessmentService.getAssessmentGrades(
          courseId,
          assessmentId
        );
        const gradesMap = {};
        const saveMap = {};

        existingGrades.forEach((grade) => {
          gradesMap[grade.studentId] = grade.grade.toString();
          saveMap[grade.studentId] = true; // Marca como salvo
        });

        setGrades(gradesMap);
        setSaveStatus(saveMap); // Marca todos os que já tinham nota como salvos
      } catch (err) {
        setError(err.message || "Erro ao carregar dados");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [courseId, assessmentId]);

  return {
    students,
    assessment,
    assessmentDetails,
    courseDetails,
    grades,
    setGrades,
    saveStatus,
    setSaveStatus,
    loading,
    error,
  };
}
