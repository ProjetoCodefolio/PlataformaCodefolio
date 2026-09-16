import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { fetchAssignment } from "$api/services/courses/assignments";
import { fetchAllSubmissions } from "$api/services/courses/submissions";
import { fetchGroups } from "$api/services/courses/assignmentGroups";
import { fetchCourseStudentsEnriched } from "$api/services/courses/students";
import { fetchCourseDetails } from "$api/services/courses/courses";
import { getAssessmentGrades } from "$api/services/courses/assessments";

/**
 * Carrega o enunciado, as entregas, os alunos matriculados, os grupos (se o
 * modo for "group") e as notas/feedback já lançados (se o enunciado valer
 * nota). `reload` relê tudo — usado depois de mover/remover membro de grupo.
 */
export function useAssignmentSubmissionsData({ courseId, assignmentId }) {
  const [assignment, setAssignment] = useState(null);
  const [students, setStudents] = useState([]);
  const [submissionsByKey, setSubmissionsByKey] = useState({});
  const [groups, setGroups] = useState([]);
  const [gradesByStudent, setGradesByStudent] = useState({});
  const [feedbackByStudent, setFeedbackByStudent] = useState({});
  const [courseOwnerId, setCourseOwnerId] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!courseId || !assignmentId) return;
    setLoading(true);
    try {
      const [a, subs, details] = await Promise.all([
        fetchAssignment(courseId, assignmentId),
        fetchAllSubmissions(courseId, assignmentId),
        fetchCourseDetails(courseId),
      ]);
      setAssignment(a);
      setCourseOwnerId(details?.userId || null);
      const subsMap = {};
      subs.forEach((s) => {
        subsMap[s.submitterKey] = s;
      });
      setSubmissionsByKey(subsMap);

      const enrolled = await fetchCourseStudentsEnriched(courseId);
      setStudents((enrolled || []).filter((s) => s.role !== "teacher"));

      if (a?.mode === "group") {
        setGroups(await fetchGroups(courseId, assignmentId));
      }

      if (a?.linkedAssessmentId) {
        const grades = await getAssessmentGrades(courseId, a.linkedAssessmentId);
        const gmap = {};
        const fmap = {};
        (grades || []).forEach((g) => {
          gmap[g.studentId] = g.grade;
          if (g.feedback) fmap[g.studentId] = g.feedback;
        });
        setGradesByStudent(gmap);
        setFeedbackByStudent(fmap);
      }
    } catch (err) {
      console.error(err);
      toast.error("Falha ao carregar as entregas.");
    } finally {
      setLoading(false);
    }
  }, [courseId, assignmentId]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    assignment,
    students,
    submissionsByKey,
    setSubmissionsByKey,
    groups,
    setGroups,
    gradesByStudent,
    setGradesByStudent,
    feedbackByStudent,
    setFeedbackByStudent,
    courseOwnerId,
    loading,
    reload: load,
  };
}
