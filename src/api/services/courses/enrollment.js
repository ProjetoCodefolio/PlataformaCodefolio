import { ref, get, push, update } from "firebase/database";
import { database } from "$api/config/firebase";
import { canManageCourse, canRunCourse } from "$api/utils/permissions";
import { acceptsInApp, fetchPrefs } from "$api/services/notificationPrefs";
import { recipientName } from "../../../shared/notificationText.js";
import { isCourseClosed, isDiscipline } from "./courseType";
import {
  END_REASONS,
  formatEndedDate,
  getEnrollmentState,
  isActiveEnrollment,
} from "../../../shared/enrollmentStatus.js";

export {
  END_REASONS,
  activeStudentIds,
  enrollmentEndedLabel,
  enrollmentRowFlags,
  formatEndedDate,
  getEnrollmentState,
  isActiveEnrollment,
  sortEndedLast,
} from "../../../shared/enrollmentStatus.js";

/**
 * Matrícula: ativa ou encerrada.
 *
 * Sair do curso (o próprio integrante) e ser removido da turma (quem conduz o
 * curso) são a mesma operação, o ENCERRAMENTO da matrícula. Nada é apagado:
 * a matrícula ganha `endedAt`, `endedBy` e `endReason`, e o histórico no curso
 * (progresso, resultados de quiz, dúvidas, entregas) fica onde está. Quem volta
 * reativa a MESMA matrícula e continua de onde parou, inclusive com as
 * tentativas de quiz já gastas. Ver docs/adr/0001.
 *
 * O `status` (in_progress/completed) não é tocado: ele continua sendo o retrato
 * do progresso, e é o que o encerramento da disciplina usa.
 *
 * A primeira parte do módulo é PURA: decide quem pode o quê e monta as
 * escritas. O fim do módulo é o serviço, que lê o banco, confere e grava tudo
 * num único `update()` na raiz (os avisos aos colegas de grupo só passam nas
 * regras se forem na mesma escrita em que o autor deixa o grupo).
 */

/**
 * Disciplina encerrada congela a turma: ninguém sai, é removido, readmitido
 * ou reativado até ela ser reaberta. Sem isso, quem saísse perderia o registro
 * de conclusão, e quem voltasse viraria "em andamento" numa disciplina fechada.
 * @param {Object} course
 * @returns {boolean}
 */
export const isRosterFrozen = (course) =>
  isDiscipline(course) && isCourseClosed(course);

/** Motivos de recusa, com o texto que a interface mostra. */
export const BLOCK_REASONS = {
  NOT_ACTIVE: "not-active",
  NOT_ENDED: "not-ended",
  OWNER: "owner",
  SELF: "self",
  TEACHER: "teacher",
  LEFT_BY_CHOICE: "left-by-choice",
  NO_AUTHORITY: "no-authority",
  FROZEN: "frozen",
};

export const BLOCK_REASON_MESSAGES = {
  [BLOCK_REASONS.NOT_ACTIVE]: "Não faz parte da turma",
  [BLOCK_REASONS.NOT_ENDED]: "Ainda faz parte da turma",
  [BLOCK_REASONS.OWNER]: "Dono do curso",
  [BLOCK_REASONS.SELF]: "Para deixar a turma, use \"Sair do curso\"",
  [BLOCK_REASONS.TEACHER]: "Rebaixe para estudante antes",
  [BLOCK_REASONS.LEFT_BY_CHOICE]: "Saiu por conta própria; só volta por decisão própria",
  [BLOCK_REASONS.NO_AUTHORITY]: "Sem permissão nesta turma",
  [BLOCK_REASONS.FROZEN]: "Disciplina encerrada",
};

const allow = () => ({ allowed: true });
const block = (reason) => ({ allowed: false, reason });

/**
 * O integrante pode sair do curso? O professor da turma pode (e perde o papel
 * junto); o dono, não.
 * @param {Object} params
 * @param {Object} params.userDetails - quem quer sair
 * @param {Object} params.course - registro do curso (userId, type, closedAt)
 * @param {Object} params.matricula - a matrícula de quem quer sair
 */
export const canLeaveCourse = ({ userDetails, course, matricula }) => {
  if (!isActiveEnrollment(matricula)) return block(BLOCK_REASONS.NOT_ACTIVE);
  if (userDetails?.userId && userDetails.userId === course?.userId) {
    return block(BLOCK_REASONS.OWNER);
  }
  if (isRosterFrozen(course)) return block(BLOCK_REASONS.FROZEN);
  return allow();
};

/**
 * Quem conduz o curso pode remover este aluno da turma? O professor da turma
 * não é removível: dono ou admin precisa rebaixá-lo antes.
 * @param {Object} params
 * @param {Object} params.userDetails - quem remove
 * @param {Object} params.course
 * @param {string} params.courseId
 * @param {Object} params.student - { userId, matricula, isCourseTeacher }
 */
export const canRemoveStudent = ({ userDetails, course, courseId, student }) => {
  if (!canRunCourse(userDetails, course?.userId, courseId)) {
    return block(BLOCK_REASONS.NO_AUTHORITY);
  }
  if (!isActiveEnrollment(student?.matricula)) return block(BLOCK_REASONS.NOT_ACTIVE);
  if (student.userId === course?.userId) return block(BLOCK_REASONS.OWNER);
  if (student.userId === userDetails?.userId) return block(BLOCK_REASONS.SELF);
  if (student.isCourseTeacher) return block(BLOCK_REASONS.TEACHER);
  if (isRosterFrozen(course)) return block(BLOCK_REASONS.FROZEN);
  return allow();
};

/**
 * Quem conduz o curso pode desfazer a remoção? Só de quem foi removido: quem
 * saiu por conta própria só volta por decisão própria.
 * @param {Object} params - mesmos de canRemoveStudent
 */
export const canReadmitStudent = ({ userDetails, course, courseId, student }) => {
  if (!canRunCourse(userDetails, course?.userId, courseId)) {
    return block(BLOCK_REASONS.NO_AUTHORITY);
  }
  const { state, reason } = getEnrollmentState(student?.matricula);
  if (state !== "ended") return block(BLOCK_REASONS.NOT_ENDED);
  if (reason !== END_REASONS.REMOVED) return block(BLOCK_REASONS.LEFT_BY_CHOICE);
  if (isRosterFrozen(course)) return block(BLOCK_REASONS.FROZEN);
  return allow();
};

/**
 * Quem tem matrícula encerrada pode voltar pela entrada do curso? As regras de
 * acesso (PIN) são do gate; aqui é só o estado da turma.
 * @param {Object} params
 * @param {Object} params.course
 * @param {Object} params.matricula
 */
export const canReactivate = ({ course, matricula }) => {
  if (getEnrollmentState(matricula).state !== "ended") {
    return block(BLOCK_REASONS.NOT_ENDED);
  }
  if (isRosterFrozen(course)) return block(BLOCK_REASONS.FROZEN);
  return allow();
};

/**
 * Pode trocar o papel (aluno ↔ professor da turma) deste integrante? Só o dono
 * e o admin, como na regra de `users/{uid}/coursesTeacher`: o professor da
 * turma conduz alunos, mas não altera o papel de ninguém. E só de quem está na
 * turma: não se promove quem está fora dela.
 * @param {Object} params
 * @param {Object} params.userDetails - quem troca
 * @param {Object} params.course
 * @param {Object} params.student - { userId, matricula }
 */
export const canChangeCourseRole = ({ userDetails, course, student }) => {
  if (!canManageCourse(userDetails, course?.userId)) {
    return block(BLOCK_REASONS.NO_AUTHORITY);
  }
  if (student?.userId === course?.userId) return block(BLOCK_REASONS.OWNER);
  if (!isActiveEnrollment(student?.matricula)) return block(BLOCK_REASONS.NOT_ACTIVE);
  return allow();
};

/**
 * Grupos que o integrante deixa ao encerrar a matrícula: os de trabalhos cuja
 * entrega do grupo ainda não existe. Grupo que já entregou é histórico, e o
 * integrante continua nele.
 *
 * @param {Object} params
 * @param {Object} params.groups - assignmentGroups/{courseId} { assignmentId: { groupId: { index, members } } }
 * @param {Object} params.submissions - assignmentSubmissions/{courseId} { assignmentId: { submitterKey: ... } }
 * @param {string} params.userId
 * @returns {Array<{ assignmentId: string, groupId: string, index: number, colleagues: string[] }>}
 */
export const groupsLeftBehind = ({ groups, submissions, userId }) => {
  const result = [];
  Object.entries(groups || {}).forEach(([assignmentId, grupos]) => {
    Object.entries(grupos || {}).forEach(([groupId, grupo]) => {
      const members = grupo?.members || {};
      if (!members[userId]) return;
      if (submissions?.[assignmentId]?.[`group_${groupId}`]) return;
      result.push({
        assignmentId,
        groupId,
        index: Number.isFinite(grupo.index) ? grupo.index : 0,
        colleagues: Object.keys(members).filter((uid) => uid !== userId && members[uid]),
      });
    });
  });
  return result.sort(
    (a, b) => a.assignmentId.localeCompare(b.assignmentId) || a.index - b.index
  );
};

/**
 * O mesmo registro que `createNotification` grava, mais o `groupId`, que a
 * regra de `notifications` confere no aviso de colega de grupo.
 */
export const notificationRecord = (fields, createdAt) => ({
  type: fields.type || "info",
  courseId: fields.courseId || "",
  assignmentId: fields.assignmentId || "",
  groupId: fields.groupId || "",
  quizId: "",
  title: fields.title || "",
  message: fields.message || "",
  link: fields.link || "",
  read: false,
  createdAt,
});

const groupLabel = (group, assignmentTitles) =>
  `Grupo ${group.index + 1} de "${assignmentTitles?.[group.assignmentId] || "um trabalho"}"`;

/**
 * Avisos aos colegas dos grupos que o integrante deixou (`groupChanges`, que
 * pode ser desligado). Vão na mesma escrita do encerramento: só ali a regra
 * ainda vê quem saiu como membro do grupo.
 *
 * @param {Object} params
 * @param {string} params.studentName
 * @param {string} params.reason - END_REASONS
 * @param {string} params.courseId
 * @param {Array} params.groupsLeft - de groupsLeftBehind
 * @param {Object} params.assignmentTitles - { assignmentId: título }
 * @param {Object} params.prefsByUid - { uid: prefs }
 * @param {string} params.createdAt
 * @returns {Array<{ uid: string, record: Object }>}
 */
export const groupLeftNotifications = ({
  studentName,
  reason,
  courseId,
  groupsLeft,
  assignmentTitles,
  prefsByUid,
  createdAt,
}) => {
  const verbo = reason === END_REASONS.REMOVED ? "foi removido da turma" : "saiu do curso";
  return (groupsLeft || []).flatMap((group) =>
    group.colleagues
      .filter((uid) => acceptsInApp(prefsByUid?.[uid], "groupChanges"))
      .map((uid) => ({
        uid,
        record: notificationRecord(
          {
            type: "group_changes",
            courseId,
            assignmentId: group.assignmentId,
            groupId: group.groupId,
            title: "Mudança no seu grupo",
            message: `${studentName} ${verbo} e deixou o ${groupLabel(group, assignmentTitles)}.`,
            link: "/minhas-avaliacoes",
          },
          createdAt
        ),
      }))
  );
};

/**
 * Avisos ao dono e aos professores da turma de que alguém saiu (`studentLeft`,
 * que pode ser desligado). Quem sai não avisa a si mesmo, mesmo sendo
 * professor da turma.
 *
 * @param {Object} params
 * @param {string} params.studentName
 * @param {string} params.userId - quem saiu
 * @param {Object} params.course - registro do curso (userId, title)
 * @param {string} params.courseId
 * @param {string[]} params.teacherIds - professores da turma
 * @param {Object} params.prefsByUid
 * @param {string} params.createdAt
 * @returns {Array<{ uid: string, record: Object }>}
 */
export const studentLeftNotifications = ({
  studentName,
  userId,
  course,
  courseId,
  teacherIds,
  prefsByUid,
  createdAt,
}) => {
  const destinatarios = [...new Set([course?.userId, ...(teacherIds || [])])].filter(
    (uid) => uid && uid !== userId && acceptsInApp(prefsByUid?.[uid], "studentLeft")
  );
  return destinatarios.map((uid) => ({
    uid,
    record: notificationRecord(
      {
        type: "student_left",
        courseId,
        title: "Saída da turma",
        message: `${studentName} saiu de ${course?.title || "um curso"}.`,
        link: `/adm-cursos?courseId=${courseId}&tab=3`,
      },
      createdAt
    ),
  }));
};

/**
 * Aviso ao aluno removido ou readmitido (`enrollmentChanged`). Não passa pelas
 * preferências: é sobre o vínculo dele com o curso.
 *
 * @param {Object} params
 * @param {"removed"|"readmitted"} params.action
 * @param {Object} params.course
 * @param {string} params.courseId
 * @param {string} params.createdAt
 */
export const enrollmentChangedNotification = ({ action, course, courseId, createdAt }) => {
  const titulo = course?.title || "um curso";
  const removed = action === "removed";
  return notificationRecord(
    {
      type: "enrollment_changed",
      courseId,
      title: removed ? "Você foi removido da turma" : "Você foi readmitido na turma",
      message: removed
        ? `Você foi removido da turma de ${titulo}. Seu histórico foi preservado, e você pode voltar pelas regras de acesso do curso.`
        : `Você foi readmitido na turma de ${titulo} e pode continuar de onde parou.`,
      link: removed ? "/cursos" : `/classes?courseId=${courseId}`,
    },
    createdAt
  );
};

const notificationUpdates = (updates, notifications, newKey) => {
  (notifications || []).forEach(({ uid, record }) => {
    updates[`notifications/${uid}/${newKey(uid)}`] = record;
  });
};

/**
 * Monta a escrita atômica do encerramento: a matrícula, o papel (quando quem
 * sai é professor da turma), os grupos deixados e os avisos.
 *
 * @param {Object} params
 * @param {string} params.courseId
 * @param {string} params.userId - quem tem a matrícula encerrada
 * @param {string} params.endedBy - quem encerrou
 * @param {string} params.reason - END_REASONS
 * @param {string} params.endedAt - ISO
 * @param {boolean} [params.revokeTeacherRole]
 * @param {Array} [params.groupsLeft] - de groupsLeftBehind
 * @param {Array} [params.notifications] - [{ uid, record }]
 * @param {(uid: string) => string} params.newKey - chave nova em notifications/{uid}
 * @returns {Object} mapa de caminho → valor, pronto para `update(ref(database), ...)`
 */
export const enrollmentEndUpdates = ({
  courseId,
  userId,
  endedBy,
  reason,
  endedAt,
  revokeTeacherRole = false,
  groupsLeft = [],
  notifications = [],
  newKey,
}) => {
  const base = `studentCourses/${userId}/${courseId}`;
  const updates = {
    [`${base}/endedAt`]: endedAt,
    [`${base}/endedBy`]: endedBy,
    [`${base}/endReason`]: reason,
  };
  if (revokeTeacherRole) {
    updates[`users/${userId}/coursesTeacher/${courseId}`] = null;
  }
  groupsLeft.forEach(({ assignmentId, groupId }) => {
    updates[`assignmentGroups/${courseId}/${assignmentId}/${groupId}/members/${userId}`] = null;
  });
  notificationUpdates(updates, notifications, newKey);
  return updates;
};

/**
 * Monta a escrita que torna a matrícula ativa de novo (volta pelo gate ou
 * readmissão), com os avisos que a acompanham.
 * @param {Object} params
 * @param {string} params.courseId
 * @param {string} params.userId
 * @param {Array} [params.notifications] - [{ uid, record }]
 * @param {(uid: string) => string} [params.newKey]
 * @returns {Object} mapa de caminho → valor
 */
export const reactivationUpdates = ({ courseId, userId, notifications = [], newKey }) => {
  const base = `studentCourses/${userId}/${courseId}`;
  const updates = {
    [`${base}/endedAt`]: null,
    [`${base}/endedBy`]: null,
    [`${base}/endReason`]: null,
  };
  notificationUpdates(updates, notifications, newKey);
  return updates;
};

/** O que decide a entrada do curso (`decideCourseAccess`). */
export const COURSE_ACCESS = {
  /** Entra direto. */
  GRANT: "grant",
  /** Curso fechado, sem matrícula: pede o PIN. */
  PIN: "pin",
  /** Matrícula encerrada: pergunta se quer voltar (com PIN, se o curso é fechado). */
  RETURN: "return",
  /** Matrícula encerrada numa disciplina encerrada: não há volta. */
  FROZEN: "frozen",
};

/**
 * Decide a entrada do curso. Quem conduz a turma entra sempre; quem está na
 * turma também; quem saiu ou foi removido precisa decidir voltar (a volta é um
 * ato explícito, nunca efeito de abrir o curso); quem nunca entrou segue a
 * regra do PIN.
 *
 * @param {Object} params
 * @param {Object} params.userDetails
 * @param {Object} params.course - registro do curso (userId, pinEnabled, type, closedAt)
 * @param {string} params.courseId
 * @param {Object} params.matricula - a do usuário, ou null
 * @returns {{ decision: string, needsPin?: boolean, reason?: string, endedAt?: string }}
 */
export const decideCourseAccess = ({ userDetails, course, courseId, matricula }) => {
  if (canRunCourse(userDetails, course?.userId, courseId)) {
    return { decision: COURSE_ACCESS.GRANT };
  }
  const estado = getEnrollmentState(matricula);
  if (estado.state === "active") return { decision: COURSE_ACCESS.GRANT };
  if (estado.state === "ended") {
    const { reason, endedAt } = estado;
    if (isRosterFrozen(course)) return { decision: COURSE_ACCESS.FROZEN, reason, endedAt };
    return {
      decision: COURSE_ACCESS.RETURN,
      needsPin: Boolean(course?.pinEnabled),
      reason,
      endedAt,
    };
  }
  return { decision: course?.pinEnabled ? COURSE_ACCESS.PIN : COURSE_ACCESS.GRANT };
};

const endedFact = ({ reason, endedAt }, options) => {
  const data = formatEndedDate(endedAt, options);
  const quando = data ? ` em ${data}` : "";
  return reason === END_REASONS.REMOVED
    ? `Você foi removido desta turma${quando}.`
    : `Você saiu desta turma${quando}.`;
};

/**
 * Pergunta do gate para quem tem matrícula encerrada e abre o curso.
 * @param {{ reason?: string, endedAt?: string }} state - de getEnrollmentState
 * @param {{ timeZone?: string }} [options]
 */
export const returnPromptMessage = (state, options) =>
  `${endedFact(state, options)} Voltar para a turma? Seu progresso continua de onde parou.`;

/**
 * Texto atrás do PIN, para quem tem matrícula encerrada num curso fechado: o
 * PIN vale como a confirmação da volta.
 */
export const returnWithPinMessage = (state, options) =>
  `${endedFact(state, options)} Para voltar, informe a chave de acesso do curso. Seu progresso continua de onde parou.`;

/** Texto para quem tem matrícula encerrada numa disciplina encerrada. */
export const frozenReturnMessage = (state, options) =>
  `${endedFact(state, options)} A disciplina já foi encerrada, então não é possível voltar até ela ser reaberta.`;

/**
 * Linhas da confirmação de saída: só as que valem para o caso.
 * @param {Object} params
 * @param {Object} params.course - registro do curso (pinEnabled)
 * @param {boolean} params.isCourseTeacher - quem sai é professor da turma
 * @param {Array} params.groupsLeft - de groupsLeftBehind
 * @param {Object} params.assignmentTitles
 * @returns {string[]}
 */
export const leaveConfirmationLines = ({
  course,
  isCourseTeacher,
  groupsLeft,
  assignmentTitles,
}) => [
  "Você deixa a turma e passa a aparecer como \"saiu da turma\" para os professores.",
  "Seu progresso e seus resultados ficam guardados. Se voltar, você continua de onde parou, inclusive com as tentativas de quiz já usadas.",
  ...(course?.pinEnabled ? ["Para voltar, você vai precisar do PIN do curso."] : []),
  ...(isCourseTeacher
    ? ["Você deixa de ser professor desta turma. Se voltar, entra como aluno."]
    : []),
  ...(groupsLeft || []).map(
    (group) => `Você sai do ${groupLabel(group, assignmentTitles)}, e seus colegas serão avisados.`
  ),
  "Os professores do curso serão avisados.",
];

/**
 * Linhas da confirmação de remoção, do ponto de vista de quem conduz o curso.
 * @param {Object} params
 * @param {Object} params.course
 * @param {string} params.studentName
 * @param {Array} params.groupsLeft
 * @param {Object} params.assignmentTitles
 * @returns {string[]}
 */
export const removalConfirmationLines = ({
  course,
  studentName,
  groupsLeft,
  assignmentTitles,
}) => [
  `${studentName} deixa a turma e passa a aparecer no fim da lista, como "removido da turma".`,
  "O progresso e os resultados ficam guardados, e a readmissão pode ser feita depois nesta mesma lista.",
  course?.pinEnabled
    ? "Para voltar por conta própria, vai precisar do PIN do curso."
    : "Em curso aberto, quem foi removido pode voltar quando quiser.",
  ...(groupsLeft || []).map(
    (group) => `Sai do ${groupLabel(group, assignmentTitles)}, e os colegas serão avisados.`
  ),
  "Um aviso da remoção será enviado.",
];

// ---------------------------------------------------------------------------
// Serviço: lê, confere e grava.

const valorEm = async (caminho) => (await get(ref(database, caminho))).val();

const novaChaveDeAviso = (uid) => push(ref(database, `notifications/${uid}`)).key;

/** Recusa com o motivo à mão, para a interface explicar o porquê. */
const recusa = (reason) => {
  const erro = new Error(BLOCK_REASON_MESSAGES[reason] || "Operação não permitida");
  erro.reason = reason;
  return erro;
};

const fetchPrefsByUid = async (uids, courseId) =>
  Object.fromEntries(
    await Promise.all(
      [...new Set(uids.filter(Boolean))].map(async (uid) => [uid, await fetchPrefs(uid, courseId)])
    )
  );

// O papel de professor da turma mora no usuário, não no curso: não há outro
// jeito de achar quem conduz esta turma além de olhar os usuários.
const fetchCourseTeacherIds = async (courseId) => {
  const users = (await valorEm("users")) || {};
  return Object.keys(users).filter((uid) => users[uid]?.coursesTeacher?.[courseId] === true);
};

/**
 * O que a confirmação e o encerramento precisam saber sobre a matrícula de um
 * integrante. A confirmação mostra isto antes; o encerramento relê na hora de
 * gravar, para não decidir com dado velho.
 *
 * @param {string} courseId
 * @param {string} userId - dono da matrícula
 */
export const loadEnrollmentContext = async (courseId, userId) => {
  if (!courseId || !userId) throw new Error("IDs de usuário e curso são necessários");

  const [course, matricula, user, groups, submissions, assignments] = await Promise.all([
    valorEm(`courses/${courseId}`),
    valorEm(`studentCourses/${userId}/${courseId}`),
    valorEm(`users/${userId}`),
    valorEm(`assignmentGroups/${courseId}`),
    valorEm(`assignmentSubmissions/${courseId}`),
    valorEm(`courseAssignments/${courseId}`),
  ]);
  if (!course) throw new Error("Curso não encontrado");

  return {
    course,
    matricula,
    studentName: recipientName(userId, user || {}),
    isCourseTeacher: Boolean(user?.coursesTeacher?.[courseId]),
    groupsLeft: groupsLeftBehind({ groups, submissions, userId }),
    assignmentTitles: Object.fromEntries(
      Object.entries(assignments || {}).map(([id, trabalho]) => [id, trabalho?.title || ""])
    ),
  };
};

const encerra = async ({ context, courseId, userId, endedBy, reason }) => {
  const { course, groupsLeft, assignmentTitles, studentName, isCourseTeacher } = context;
  const saida = reason === END_REASONS.LEFT;
  const createdAt = new Date().toISOString();

  const colegas = groupsLeft.flatMap((grupo) => grupo.colleagues);
  const teacherIds = saida ? await fetchCourseTeacherIds(courseId) : [];
  const prefsByUid = await fetchPrefsByUid(
    saida ? [...colegas, course.userId, ...teacherIds] : colegas,
    courseId
  );

  const notifications = [
    ...groupLeftNotifications({
      studentName,
      reason,
      courseId,
      groupsLeft,
      assignmentTitles,
      prefsByUid,
      createdAt,
    }),
    ...(saida
      ? studentLeftNotifications({
          studentName,
          userId,
          course,
          courseId,
          teacherIds,
          prefsByUid,
          createdAt,
        })
      : [
          {
            uid: userId,
            record: enrollmentChangedNotification({
              action: "removed",
              course,
              courseId,
              createdAt,
            }),
          },
        ]),
  ];

  const updates = enrollmentEndUpdates({
    courseId,
    userId,
    endedBy,
    reason,
    endedAt: createdAt,
    revokeTeacherRole: saida && isCourseTeacher,
    groupsLeft,
    notifications,
    newKey: novaChaveDeAviso,
  });
  await update(ref(database), updates);

  return { endedAt: createdAt, groupsLeft, notified: notifications.map((aviso) => aviso.uid) };
};

/**
 * Saída do curso pelo próprio integrante. Professor da turma perde o papel na
 * mesma escrita.
 * @param {Object} params
 * @param {Object} params.userDetails - quem sai (userId, role, coursesTeacher)
 * @param {string} params.courseId
 */
export const leaveCourse = async ({ userDetails, courseId }) => {
  const userId = userDetails?.userId;
  const context = await loadEnrollmentContext(courseId, userId);
  const pode = canLeaveCourse({ userDetails, course: context.course, matricula: context.matricula });
  if (!pode.allowed) throw recusa(pode.reason);

  return encerra({ context, courseId, userId, endedBy: userId, reason: END_REASONS.LEFT });
};

/**
 * Remoção da turma por quem conduz o curso.
 * @param {Object} params
 * @param {Object} params.userDetails - quem remove
 * @param {string} params.courseId
 * @param {string} params.studentId - quem é removido
 */
export const removeStudentFromCourse = async ({ userDetails, courseId, studentId }) => {
  const context = await loadEnrollmentContext(courseId, studentId);
  const pode = canRemoveStudent({
    userDetails,
    course: context.course,
    courseId,
    student: {
      userId: studentId,
      matricula: context.matricula,
      isCourseTeacher: context.isCourseTeacher,
    },
  });
  if (!pode.allowed) throw recusa(pode.reason);

  return encerra({
    context,
    courseId,
    userId: studentId,
    endedBy: userDetails.userId,
    reason: END_REASONS.REMOVED,
  });
};

/**
 * A matrícula de um usuário num curso, ou null.
 * @param {string} userId
 * @param {string} courseId
 */
export const fetchEnrollment = async (userId, courseId) => {
  if (!userId || !courseId) return null;
  return valorEm(`studentCourses/${userId}/${courseId}`);
};

/**
 * Volta de quem tem matrícula encerrada, pela entrada do curso. As regras de
 * acesso (PIN) já foram cumpridas pelo gate.
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.courseId
 */
export const reactivateEnrollment = async ({ userId, courseId }) => {
  if (!courseId || !userId) throw new Error("IDs de usuário e curso são necessários");
  const [course, matricula] = await Promise.all([
    valorEm(`courses/${courseId}`),
    valorEm(`studentCourses/${userId}/${courseId}`),
  ]);
  const pode = canReactivate({ course, matricula });
  if (!pode.allowed) throw recusa(pode.reason);

  await update(ref(database), reactivationUpdates({ courseId, userId }));
};

/**
 * Readmissão de quem foi removido, por quem conduz o curso.
 * @param {Object} params
 * @param {Object} params.userDetails - quem readmite
 * @param {string} params.courseId
 * @param {string} params.studentId
 */
export const readmitStudent = async ({ userDetails, courseId, studentId }) => {
  if (!courseId || !studentId) throw new Error("IDs de usuário e curso são necessários");
  const [course, matricula] = await Promise.all([
    valorEm(`courses/${courseId}`),
    valorEm(`studentCourses/${studentId}/${courseId}`),
  ]);
  const pode = canReadmitStudent({
    userDetails,
    course,
    courseId,
    student: { userId: studentId, matricula },
  });
  if (!pode.allowed) throw recusa(pode.reason);

  const createdAt = new Date().toISOString();
  await update(
    ref(database),
    reactivationUpdates({
      courseId,
      userId: studentId,
      notifications: [
        {
          uid: studentId,
          record: enrollmentChangedNotification({
            action: "readmitted",
            course,
            courseId,
            createdAt,
          }),
        },
      ],
      newKey: novaChaveDeAviso,
    })
  );
};
