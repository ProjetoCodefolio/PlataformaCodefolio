import {
  fetchUserCreatedCourses,
  deleteCourse as deleteCourseFn,
  setCourseArchived,
  filterCoursesBySearchTerm,
} from "./courses";

/**
 * Carrega os cursos criados por um professor
 * @param {string} userId - ID do usuário/professor
 * @returns {Promise<Array>} - Lista de cursos criados pelo professor
 */
export const loadTeacherCourses = async (userId) => {
  try {
    if (!userId) {
      throw new Error("ID do usuário é obrigatório");
    }

    // Carrega cursos criados pelo professor
    const courses = await fetchUserCreatedCourses(userId);
    return courses;
  } catch (error) {
    console.error("Erro ao carregar cursos do professor:", error);
    throw new Error(
      "Não foi possível carregar seus cursos. Tente novamente mais tarde."
    );
  }
};

/**
 * Filtra os cursos do professor por termo de busca
 * @param {Array} courses - Lista de cursos a serem filtrados
 * @param {string} searchTerm - Termo de busca
 * @returns {Array} - Cursos filtrados
 */
export const searchTeacherCourses = (courses, searchTerm) => {
  return filterCoursesBySearchTerm(courses, searchTerm);
};

/**
 * Deleta um curso criado pelo professor
 * @param {string} courseId - ID do curso a ser deletado
 * @returns {Promise<object>} - Resultado da operação
 */
export const deleteTeacherCourse = async (courseId) => {
  try {
    if (!courseId) {
      return {
        success: false,
        message: "ID do curso é obrigatório",
      };
    }

    // Deleta o curso usando a função do serviço courses
    const result = await deleteCourseFn(courseId);

    return result;
  } catch (error) {
    console.error("Erro ao deletar curso:", error);
    return {
      success: false,
      message: "Não foi possível deletar o curso. Tente novamente mais tarde.",
    };
  }
};

/**
 * Arquiva ou desarquiva um curso do professor
 * @param {string} courseId - ID do curso
 * @param {boolean} archived - true para arquivar, false para desarquivar
 * @returns {Promise<object>} - Resultado da operação
 */
export const setTeacherCourseArchived = async (courseId, archived) => {
  try {
    if (!courseId) {
      return { success: false, message: "ID do curso é obrigatório" };
    }

    return await setCourseArchived(courseId, archived);
  } catch (error) {
    console.error("Erro ao arquivar/desarquivar curso:", error);
    return {
      success: false,
      message: "Não foi possível atualizar o curso. Tente novamente mais tarde.",
    };
  }
};

/**
 * Verifica se o usuário tem alguma turma para gerenciar — própria ou como
 * co-professor.
 *
 * Os dois termos desta verificação estavam quebrados e se anulavam:
 * `loadTeacherCourses(...).lenght` (com o erro de digitação) rodava sobre uma
 * Promise, então o lado esquerdo era sempre `undefined > 0`; e o lado direito
 * comparava `coursesTeacher` com `undefined`, quando o AuthContext preenche o
 * campo ausente com `null` — ou seja, dava `true` para qualquer um logado. Na
 * prática a tela abria para todo mundo.
 *
 * @param {Object} userDetails - userDetails do contexto de auth
 * @returns {Promise<boolean>} - Se o usuário tem permissão
 */
export const canManageCourses = async (userDetails) => {
  if (!userDetails?.userId) return false;

  if (userDetails.role === "admin" || userDetails.role === "teacher") return true;

  // Co-professor de pelo menos uma turma.
  if (Object.keys(userDetails.coursesTeacher || {}).length > 0) return true;

  // Último caso: não tem papel nenhum, mas criou cursos em algum momento.
  const proprios = await loadTeacherCourses(userDetails.userId);
  return (proprios || []).length > 0;
};

export const canCreateCourses = (userDetails) => {
  const canCreate = userDetails?.role === "admin" || userDetails?.role === "teacher"
  return canCreate;
}
