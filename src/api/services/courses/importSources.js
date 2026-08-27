// Cursos dos quais o professor pode IMPORTAR conteúdo (questionários, materiais).
//
// A regra de quem pode importar de onde é a mesma do resto da plataforma e a
// mesma que as regras do banco aplicam na escrita: manda quem é dono do curso
// (`courses/{id}/userId`) ou professor daquele curso específico
// (`users/{uid}/coursesTeacher/{id}`). Admin enxerga todos, como no gate de
// acesso à sala.
//
// Importante: a origem só é LIDA, então em tese qualquer curso serviria (a raiz
// das regras é `".read": true`). A restrição aqui é deliberada — a lista existe
// para o professor reaproveitar o próprio material, não para varrer a
// plataforma inteira atrás do material dos outros.

import { ref, get } from "firebase/database";
import { database } from "../../config/firebase";

/**
 * Lista os cursos que o usuário pode usar como ORIGEM de uma importação.
 * @param {Object} userDetails - userDetails do contexto de auth
 * @param {Object} [options]
 * @param {string} [options.excludeCourseId] - curso de destino, omitido da lista
 * @returns {Promise<Array<{courseId: string, title: string, archived: boolean}>>}
 */
export const fetchImportableCourses = async (userDetails, options = {}) => {
  const { excludeCourseId } = options;
  const userId = userDetails?.userId;
  if (!userId) return [];

  try {
    const isAdmin = userDetails?.role === "admin";
    const coursesTeacher = userDetails?.coursesTeacher || {};

    const snapshot = await get(ref(database, "courses"));
    if (!snapshot.exists()) return [];

    return Object.entries(snapshot.val() || {})
      .map(([courseId, course]) => ({ courseId, ...course }))
      .filter((course) => course.courseId !== excludeCourseId)
      .filter(
        (course) =>
          isAdmin ||
          course.userId === userId ||
          Boolean(coursesTeacher[course.courseId])
      )
      .map((course) => ({
        courseId: course.courseId,
        title: course.title || "Curso sem título",
        // Curso arquivado continua servindo de origem — o material dele é
        // justamente o que costuma ser reaproveitado no semestre seguinte.
        archived: course.archived === true,
      }))
      .sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
  } catch (error) {
    console.error("Erro ao carregar cursos de origem para importação:", error);
    throw error;
  }
};
