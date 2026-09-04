import { ref, get, update } from "firebase/database";
import { database } from "../../config/firebase";

/**
 * Curso ou disciplina.
 *
 * Um CURSO é aberto e cada aluno anda no próprio ritmo: ele chega em
 * "Concluídos" quando o progresso bate 100%. Uma DISCIPLINA tem semestre: ela
 * termina na data que o professor decidir, e todo mundo que estava matriculado
 * termina junto — tenha assistido tudo ou não.
 *
 * ATENÇÃO: encerrada não é o mesmo que arquivada. `archived` tira o curso do
 * catálogo e o deixa visível só para o dono; não diz nada sobre os alunos.
 * Encerrar é o oposto: a turma continua à vista e os alunos passam a
 * concluídos. Confundir os dois faria arquivar uma disciplina antiga marcar a
 * turma inteira como aprovada.
 */

export const COURSE_TYPES = {
  CURSO: "curso",
  DISCIPLINA: "disciplina",
};

/**
 * O tipo de um curso, com "curso" como leitura padrão.
 *
 * O acervo anterior à existência deste campo não tem `type`, e não há migração:
 * a ausência do campo significa curso, que é o que todos eram até aqui.
 *
 * @param {Object} course - registro do curso
 * @returns {"curso"|"disciplina"}
 */
export const getCourseType = (course) =>
  course?.type === COURSE_TYPES.DISCIPLINA
    ? COURSE_TYPES.DISCIPLINA
    : COURSE_TYPES.CURSO;

/** @param {Object} course @returns {boolean} */
export const isDiscipline = (course) =>
  getCourseType(course) === COURSE_TYPES.DISCIPLINA;

/**
 * A disciplina já foi encerrada? `closedAt` guarda a data; a ausência dela é o
 * que significa "em andamento".
 * @param {Object} course @returns {boolean}
 */
export const isCourseClosed = (course) => Boolean(course?.closedAt);

/**
 * Só disciplina em andamento pode ser encerrada.
 * @param {Object} course @returns {boolean}
 */
export const canCloseCourse = (course) =>
  isDiscipline(course) && !isCourseClosed(course);

/**
 * Monta o update em lote que ENCERRA a disciplina.
 *
 * É uma função pura sobre o nó `studentCourses` inteiro para poder ser testada
 * sem banco, e porque a gravação precisa sair num único `update()` na raiz: uma
 * chamada por aluno deixaria a turma pela metade se uma falhasse no meio.
 *
 * Cada matriculado guarda o `status` que tinha antes em `statusBeforeClosure`,
 * que é o que permite reabrir sem promover a concluído quem não estava.
 *
 * @param {Object} studentCourses - nó `studentCourses` inteiro { uid: { courseId: {...} } }
 * @param {string} courseId
 * @param {Object} [options]
 * @param {string} [options.closedAt] - carimbo ISO; padrão é agora
 * @param {string} [options.closedBy] - uid de quem encerrou
 * @returns {Object} mapa de caminho → valor, pronto para `update(ref(database), ...)`
 */
export const closureUpdatesFor = (studentCourses, courseId, options = {}) => {
  const closedAt = options.closedAt || new Date().toISOString();
  const updates = {
    [`courses/${courseId}/closedAt`]: closedAt,
    [`courses/${courseId}/closedBy`]: options.closedBy || null,
  };

  Object.entries(studentCourses || {}).forEach(([userId, cursos]) => {
    const matricula = cursos?.[courseId];
    if (!matricula) return;
    // Já encerrado antes: não sobrescreve o `statusBeforeClosure` original,
    // senão reabrir devolveria "completed" a quem só era completed por causa
    // do encerramento.
    if (matricula.closedByTeacher) return;

    const base = `studentCourses/${userId}/${courseId}`;
    updates[`${base}/statusBeforeClosure`] = matricula.status || "in_progress";
    updates[`${base}/closedByTeacher`] = true;
    updates[`${base}/status`] = "completed";
  });

  return updates;
};

/**
 * Monta o update em lote que REABRE a disciplina, devolvendo cada aluno ao
 * status que ele tinha antes do encerramento.
 *
 * @param {Object} studentCourses - nó `studentCourses` inteiro
 * @param {string} courseId
 * @returns {Object} mapa de caminho → valor
 */
export const reopenUpdatesFor = (studentCourses, courseId) => {
  const updates = {
    [`courses/${courseId}/closedAt`]: null,
    [`courses/${courseId}/closedBy`]: null,
  };

  Object.entries(studentCourses || {}).forEach(([userId, cursos]) => {
    const matricula = cursos?.[courseId];
    if (!matricula?.closedByTeacher) return;

    const base = `studentCourses/${userId}/${courseId}`;
    updates[`${base}/status`] = matricula.statusBeforeClosure || "in_progress";
    updates[`${base}/statusBeforeClosure`] = null;
    updates[`${base}/closedByTeacher`] = null;
  });

  return updates;
};

/**
 * Encerra a disciplina: marca o curso e leva todos os matriculados a
 * concluídos.
 * @param {string} courseId
 * @param {string} closedBy - uid de quem encerrou
 * @returns {Promise<{closedAt: string, students: number}>}
 */
export const closeDiscipline = async (courseId, closedBy) => {
  if (!courseId) throw new Error("ID do curso é obrigatório");

  const snapshot = await get(ref(database, "studentCourses"));
  const closedAt = new Date().toISOString();
  const updates = closureUpdatesFor(snapshot.val() || {}, courseId, {
    closedAt,
    closedBy,
  });

  await update(ref(database), updates);

  // Dois caminhos por aluno afetado (status + closedByTeacher + o anterior),
  // fora os dois do próprio curso.
  const students = Object.keys(updates).filter((c) =>
    c.endsWith("/closedByTeacher")
  ).length;
  return { closedAt, students };
};

/**
 * Reabre a disciplina, desfazendo o encerramento.
 * @param {string} courseId
 * @returns {Promise<{students: number}>}
 */
export const reopenDiscipline = async (courseId) => {
  if (!courseId) throw new Error("ID do curso é obrigatório");

  const snapshot = await get(ref(database, "studentCourses"));
  const updates = reopenUpdatesFor(snapshot.val() || {}, courseId);

  await update(ref(database), updates);

  const students = Object.keys(updates).filter((c) =>
    c.endsWith("/closedByTeacher")
  ).length;
  return { students };
};
