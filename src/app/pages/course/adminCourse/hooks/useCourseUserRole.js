import { useCallback, useEffect, useState } from "react";
import { fetchCourseDetails } from "$api/services/courses/courses";
import { checkUserCourseRole } from "$api/services/courses/students";

/**
 * Verifica se o usuário logado é apenas professor da turma (não o dono do
 * curso) — controla o que a tela deixa editar/mostrar para ele.
 */
export function useCourseUserRole({ courseId, userDetails }) {
  const [isCurrentUserTeacher, setIsCurrentUserTeacher] = useState(false);

  const checkCurrentUserRole = useCallback(async () => {
    try {
      if (!userDetails?.userId || !courseId) return;

      const courseData = await fetchCourseDetails(courseId);
      if (!courseData || !courseData.userId) return;

      const isTeacher = await checkUserCourseRole(
        userDetails.userId,
        courseId,
        courseData.userId
      );

      setIsCurrentUserTeacher(isTeacher);
    } catch (error) {
      console.error("Erro ao verificar papel do usuário:", error);
      setIsCurrentUserTeacher(false);
    }
  }, [courseId, userDetails]);

  useEffect(() => {
    if (courseId && userDetails?.userId) {
      checkCurrentUserRole();
    }
  }, [courseId, userDetails, checkCurrentUserRole]);

  return { isCurrentUserTeacher };
}
