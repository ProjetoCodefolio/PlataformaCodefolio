/**
 * Quem pode o quê num curso.
 *
 * São TRÊS autoridades, não duas:
 *
 *  - o admin global (`users/{uid}/role === "admin"`), que pode tudo;
 *  - o dono do curso (`courses/{courseId}/userId`), que criou a turma;
 *  - o professor DAQUELE curso (`users/{uid}/coursesTeacher/{courseId}`), um
 *    co-professor convidado para tocar a turma junto.
 *
 * A distinção que este módulo carrega é entre CADASTRAR o curso e TOCAR a
 * turma. Título, apelido, PIN e arquivamento são do dono — quem convidou não
 * quer o convidado renomeando a disciplina. Conteúdo, quiz, materiais, notas,
 * avaliações e alunos são de quem dá aula, e aí o professor entra.
 *
 * As funções aqui espelham `database.rules.json`: se uma delas liberar algo que
 * a regra recusa, o professor vê o botão e leva um erro do banco. O teste
 * `teacherRole.rules.emulator.test.js` é quem guarda essa correspondência.
 *
 * IMPORTANTE: as funções que reconhecem o professor precisam do `courseId`. Sem
 * ele a resposta é a antiga (dono ou admin) — falha fechada, nunca aberta.
 */

/**
 * O usuário é professor DESTE curso? O papel é por curso: `role: "teacher"`
 * sozinho não vale nada aqui.
 * @param {Object} userDetails - userDetails do contexto de auth
 * @param {string} courseId - ID do curso
 * @returns {boolean}
 */
export const isCourseTeacher = (userDetails, courseId) =>
  Boolean(courseId && userDetails?.coursesTeacher?.[courseId]);

/**
 * Autoridade sobre o CADASTRO do curso: dono ou admin. Não inclui o professor.
 * @param {Object} userDetails - Detalhes do usuário atual
 * @param {string} courseOwnerId - ID do dono do curso
 * @returns {boolean}
 */
export const canManageCourse = (userDetails, courseOwnerId) => {
  if (!userDetails) return false;
  if (userDetails.role === "admin") return true;
  if (userDetails.userId === courseOwnerId) return true;
  return false;
};

/**
 * Autoridade sobre a TURMA: dono, admin ou professor daquele curso. É a base de
 * tudo que é trabalho de sala de aula.
 * @param {Object} userDetails - Detalhes do usuário atual
 * @param {string} courseOwnerId - ID do dono do curso
 * @param {string} courseId - ID do curso
 * @returns {boolean}
 */
export const canRunCourse = (userDetails, courseOwnerId, courseId) =>
  canManageCourse(userDetails, courseOwnerId) ||
  isCourseTeacher(userDetails, courseId);

/**
 * Editar o cadastro do curso (título, apelido, PIN, arquivar). Só o dono.
 * @param {Object} userDetails - Detalhes do usuário atual
 * @param {string} courseOwnerId - ID do dono do curso
 * @returns {boolean}
 */
export const canEditCourse = (userDetails, courseOwnerId) =>
  canManageCourse(userDetails, courseOwnerId);

/**
 * Excluir o curso. Só o dono — é a operação sem volta.
 * @param {Object} userDetails - Detalhes do usuário atual
 * @param {string} courseOwnerId - ID do dono do curso
 * @returns {boolean}
 */
export const canDeleteCourse = (userDetails, courseOwnerId) =>
  canManageCourse(userDetails, courseOwnerId);

/**
 * Editar o conteúdo da turma: vídeos, slides, quizzes e materiais extras.
 * @param {Object} userDetails - Detalhes do usuário atual
 * @param {string} courseOwnerId - ID do dono do curso
 * @param {string} courseId - ID do curso
 * @returns {boolean}
 */
export const canManageContent = (userDetails, courseOwnerId, courseId) =>
  canRunCourse(userDetails, courseOwnerId, courseId);

/**
 * Gerenciar os alunos da turma: matricular, promover a professor, remover.
 * @param {Object} userDetails - Detalhes do usuário atual
 * @param {string} courseOwnerId - ID do dono do curso
 * @param {string} courseId - ID do curso
 * @returns {boolean}
 */
export const canManageStudents = (userDetails, courseOwnerId, courseId) =>
  canRunCourse(userDetails, courseOwnerId, courseId);

/**
 * Lançar notas.
 * @param {Object} userDetails - Detalhes do usuário atual
 * @param {string} courseOwnerId - ID do dono do curso
 * @param {string} courseId - ID do curso
 * @returns {boolean}
 */
export const canAssignGrades = (userDetails, courseOwnerId, courseId) =>
  canRunCourse(userDetails, courseOwnerId, courseId);

/**
 * Criar e editar avaliações e trabalhos.
 * @param {Object} userDetails - Detalhes do usuário atual
 * @param {string} courseOwnerId - ID do dono do curso
 * @param {string} courseId - ID do curso
 * @returns {boolean}
 */
export const canManageAssessments = (userDetails, courseOwnerId, courseId) =>
  canRunCourse(userDetails, courseOwnerId, courseId);

/**
 * Ver os resultados de um quiz e a apresentação das dúvidas da turma.
 * @param {Object} userDetails - Detalhes do usuário atual
 * @param {string} courseOwnerId - ID do dono do curso
 * @param {string} courseId - ID do curso
 * @returns {boolean}
 */
export const canViewQuizResults = (userDetails, courseOwnerId, courseId) =>
  canRunCourse(userDetails, courseOwnerId, courseId);
