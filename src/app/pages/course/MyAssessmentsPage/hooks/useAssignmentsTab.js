import { useEffect, useState } from "react";
import { fetchAssignmentsByCourse } from "$api/services/courses/assignments";

/** Aba "Trabalhos": contagem de enunciados de cada curso, para filtro/label. */
export function useAssignmentsTab({ courses, getCourseId, getCourseTitle, searchTerm }) {
  const [assignmentsCountMap, setAssignmentsCountMap] = useState({});
  const [assignmentsCountLoading, setAssignmentsCountLoading] = useState(true);
  const [onlyWithAssignments, setOnlyWithAssignments] = useState(true);
  const [expandedTrabalhoId, setExpandedTrabalhoId] = useState(null);

  useEffect(() => {
    if (!courses.length) {
      setAssignmentsCountLoading(false);
      return;
    }
    let active = true;
    (async () => {
      setAssignmentsCountLoading(true);
      const updates = {};
      await Promise.all(
        courses.map(async (course) => {
          const courseId = getCourseId(course);
          if (!courseId || assignmentsCountMap[courseId] !== undefined) return;
          try {
            const list = await fetchAssignmentsByCourse(courseId);
            updates[courseId] = (list || []).length;
          } catch {
            updates[courseId] = 0;
          }
        })
      );
      if (!active) return;
      if (Object.keys(updates).length) {
        setAssignmentsCountMap((prev) => ({ ...prev, ...updates }));
      }
      setAssignmentsCountLoading(false);
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courses]);

  const getAssignmentsCount = (course) => {
    const id = getCourseId(course);
    return assignmentsCountMap[id] || 0;
  };
  const hasAssignments = (course) => getAssignmentsCount(course) > 0;

  const filteredTrabalhoCourses = courses.filter((course) => {
    const title = getCourseTitle(course).toLowerCase();
    const matchesSearch = title.includes(searchTerm.toLowerCase());
    const matchesFilter = !onlyWithAssignments || hasAssignments(course);
    return matchesSearch && matchesFilter;
  });

  return {
    assignmentsCountLoading,
    onlyWithAssignments,
    setOnlyWithAssignments,
    expandedTrabalhoId,
    setExpandedTrabalhoId,
    filteredTrabalhoCourses,
    getAssignmentsCount,
  };
}
