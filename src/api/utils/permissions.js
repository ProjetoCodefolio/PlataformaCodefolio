/**
 * Utilitários para verificação de permissões no sistema
 */

/**
 * Verifica se o usuário tem permissão de owner/admin para um curso
 * @param {Object} userDetails - Detalhes do usuário atual
 * @param {string} courseOwnerId - ID do dono do curso
 * @returns {boolean} - Se o usuário tem permissão
 */
export const canManageCourse = (userDetails, courseOwnerId) => {
  if (!userDetails) return false;
  
  // Admin sempre tem permissão
  if (userDetails.role === "admin") return true;
  
  // Owner do curso tem permissão
  if (userDetails.userId === courseOwnerId) return true;
  
  return false;
};

/**
 * Verifica se o usuário pode editar um curso
 * @param {Object} userDetails - Detalhes do usuário atual
 * @param {string} courseOwnerId - ID do dono do curso
 * @returns {boolean} - Se o usuário pode editar
 */
export const canEditCourse = (userDetails, courseOwnerId) => {
  return canManageCourse(userDetails, courseOwnerId);
};

/**
 * Verifica se o usuário pode deletar um curso
 * @param {Object} userDetails - Detalhes do usuário atual
 * @param {string} courseOwnerId - ID do dono do curso
 * @returns {boolean} - Se o usuário pode deletar
 */
export const canDeleteCourse = (userDetails, courseOwnerId) => {
  return canManageCourse(userDetails, courseOwnerId);
};

/**
 * Verifica se o usuário pode gerenciar estudantes de um curso
 * @param {Object} userDetails - Detalhes do usuário atual
 * @param {string} courseOwnerId - ID do dono do curso
 * @returns {boolean} - Se o usuário pode gerenciar estudantes
 */
export const canManageStudents = (userDetails, courseOwnerId) => {
  return canManageCourse(userDetails, courseOwnerId);
};

/**
 * Verifica se o usuário pode atribuir notas
 * @param {Object} userDetails - Detalhes do usuário atual
 * @param {string} courseOwnerId - ID do dono do curso
 * @returns {boolean} - Se o usuário pode atribuir notas
 */
export const canAssignGrades = (userDetails, courseOwnerId) => {
  return canManageCourse(userDetails, courseOwnerId);
};

/**
 * Verifica se o usuário pode gerenciar avaliações
 * @param {Object} userDetails - Detalhes do usuário atual
 * @param {string} courseOwnerId - ID do dono do curso
 * @returns {boolean} - Se o usuário pode gerenciar avaliações
 */
export const canManageAssessments = (userDetails, courseOwnerId) => {
  return canManageCourse(userDetails, courseOwnerId);
};

/**
 * Verifica se o usuário pode visualizar resultados de quiz
 * @param {Object} userDetails - Detalhes do usuário atual
 * @param {string} courseOwnerId - ID do dono do curso
 * @returns {boolean} - Se o usuário pode visualizar resultados
 */
export const canViewQuizResults = (userDetails, courseOwnerId) => {
  return canManageCourse(userDetails, courseOwnerId);
};
