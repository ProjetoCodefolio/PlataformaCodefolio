import {
  fetchUserCreatedCourses,
  deleteCourse as deleteCourseFn,
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
 * Verifica se o usuário tem permissão para gerenciar cursos
 * @param {string} userId - ID do usuário atual
 * @returns {Promise<boolean>} - Se o usuário tem permissão
 */
export const canManageCourses = async (userDetails) => {
  const canManage = await loadTeacherCourses(userDetails.userId).lenght > 0 || userDetails.coursesTeacher !== undefined  
  return canManage;
};

export const canCreateCourses = (userDetails) => {
  const canCreate = userDetails?.role === "admin" || userDetails?.role === "teacher"
  return canCreate;
}
