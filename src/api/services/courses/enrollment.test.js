import { describe, it, expect, vi } from "vitest";

// As decisões são PURAS, mas o módulo importa courseType e notificationPrefs,
// que importam o config do Firebase no topo (getAnalytics quebra em teste).
vi.mock("../../config/firebase", () => ({ database: {}, auth: {}, analytics: {} }));

const {
  END_REASONS,
  BLOCK_REASONS,
  isActiveEnrollment,
  getEnrollmentState,
  isRosterFrozen,
  canLeaveCourse,
  canRemoveStudent,
  canReadmitStudent,
  canReactivate,
  canChangeCourseRole,
  groupsLeftBehind,
  groupLeftNotifications,
  studentLeftNotifications,
  enrollmentChangedNotification,
  enrollmentEndUpdates,
  reactivationUpdates,
  returnPromptMessage,
  returnWithPinMessage,
  frozenReturnMessage,
  COURSE_ACCESS,
  decideCourseAccess,
  leaveConfirmationLines,
  removalConfirmationLines,
} = await import("./enrollment.js");

/**
 * O que este teste protege:
 *
 *  - encerrar a matrícula nunca apaga o histórico: a escrita só toca a própria
 *    matrícula, o papel de quem sai sendo professor, os grupos sem entrega e os
 *    avisos;
 *  - quem pode sair, remover, readmitir e trocar papel, inclusive o congelamento
 *    da disciplina encerrada e a proteção do professor da turma;
 *  - o grupo que já entregou continua com quem saiu;
 *  - os avisos respeitam as preferências, menos o de remoção/readmissão.
 */

const CURSO = "curso1";
const DONO = "dono";
const ENDED_AT = "2026-10-12T15:00:00.000Z";
const CREATED_AT = "2026-10-20T12:00:00.000Z";

const curso = (extra = {}) => ({ userId: DONO, title: "Engenharia de Software", ...extra });
const disciplinaEncerrada = () =>
  curso({ type: "disciplina", closedAt: "2026-12-10T12:00:00.000Z" });

const ativa = { progress: 40, status: "in_progress" };
const saiu = { ...ativa, endedAt: ENDED_AT, endedBy: "ana", endReason: END_REASONS.LEFT };
const removida = { ...ativa, endedAt: ENDED_AT, endedBy: DONO, endReason: END_REASONS.REMOVED };

const dono = { userId: DONO, role: "student" };
const admin = { userId: "admin", role: "admin" };
const profTurma = { userId: "prof", role: "student", coursesTeacher: { [CURSO]: true } };
const aluna = { userId: "ana", role: "student" };

describe("estado da matrícula", () => {
  it("ativa é a que não tem endedAt", () => {
    expect(isActiveEnrollment(ativa)).toBe(true);
    expect(isActiveEnrollment(saiu)).toBe(false);
    expect(isActiveEnrollment(undefined)).toBe(false);
  });

  it("o gate distingue nenhuma, ativa e encerrada, com motivo e data", () => {
    expect(getEnrollmentState(null)).toEqual({ state: "none" });
    expect(getEnrollmentState(ativa)).toEqual({ state: "active" });
    expect(getEnrollmentState(removida)).toEqual({
      state: "ended",
      reason: END_REASONS.REMOVED,
      endedAt: ENDED_AT,
    });
  });

  it("só a disciplina encerrada congela a turma; curso concluído não", () => {
    expect(isRosterFrozen(disciplinaEncerrada())).toBe(true);
    expect(isRosterFrozen(curso({ type: "disciplina" }))).toBe(false);
    expect(isRosterFrozen(curso({ closedAt: "2026-12-10T12:00:00.000Z" }))).toBe(false);
  });
});

describe("canLeaveCourse", () => {
  it("aluno com matrícula ativa sai, inclusive de curso concluído", () => {
    expect(canLeaveCourse({ userDetails: aluna, course: curso(), matricula: ativa })).toEqual({
      allowed: true,
    });
    expect(
      canLeaveCourse({
        userDetails: aluna,
        course: curso(),
        matricula: { ...ativa, progress: 100, status: "completed" },
      }).allowed
    ).toBe(true);
  });

  it("professor da turma também sai", () => {
    expect(canLeaveCourse({ userDetails: profTurma, course: curso(), matricula: ativa }).allowed).toBe(
      true
    );
  });

  it("o dono nunca sai", () => {
    expect(canLeaveCourse({ userDetails: dono, course: curso(), matricula: ativa })).toEqual({
      allowed: false,
      reason: BLOCK_REASONS.OWNER,
    });
  });

  it("disciplina encerrada recusa", () => {
    expect(
      canLeaveCourse({ userDetails: aluna, course: disciplinaEncerrada(), matricula: ativa }).reason
    ).toBe(BLOCK_REASONS.FROZEN);
  });

  it("quem já saiu ou nunca entrou não sai de novo", () => {
    expect(canLeaveCourse({ userDetails: aluna, course: curso(), matricula: saiu }).reason).toBe(
      BLOCK_REASONS.NOT_ACTIVE
    );
    expect(canLeaveCourse({ userDetails: aluna, course: curso(), matricula: null }).reason).toBe(
      BLOCK_REASONS.NOT_ACTIVE
    );
  });
});

describe("canRemoveStudent", () => {
  const alunaNaTurma = { userId: "ana", matricula: ativa, isCourseTeacher: false };
  const params = (userDetails, student = alunaNaTurma, course = curso()) => ({
    userDetails,
    course,
    courseId: CURSO,
    student,
  });

  it("dono, admin e professor da turma removem aluno", () => {
    [dono, admin, profTurma].forEach((quem) => {
      expect(canRemoveStudent(params(quem)).allowed).toBe(true);
    });
  });

  it("aluno não remove ninguém", () => {
    expect(canRemoveStudent(params({ userId: "bruno", role: "student" })).reason).toBe(
      BLOCK_REASONS.NO_AUTHORITY
    );
  });

  it("professor da turma não é removível, nem pelo dono", () => {
    const colega = { userId: "prof2", matricula: ativa, isCourseTeacher: true };
    expect(canRemoveStudent(params(dono, colega)).reason).toBe(BLOCK_REASONS.TEACHER);
    expect(canRemoveStudent(params(profTurma, colega)).reason).toBe(BLOCK_REASONS.TEACHER);
  });

  it("o dono não é removível, e ninguém remove a si mesmo", () => {
    expect(canRemoveStudent(params(admin, { userId: DONO, matricula: ativa })).reason).toBe(
      BLOCK_REASONS.OWNER
    );
    expect(canRemoveStudent(params(admin, { userId: "admin", matricula: ativa })).reason).toBe(
      BLOCK_REASONS.SELF
    );
  });

  it("disciplina encerrada recusa e quem já está fora não é removido de novo", () => {
    expect(canRemoveStudent(params(dono, alunaNaTurma, disciplinaEncerrada())).reason).toBe(
      BLOCK_REASONS.FROZEN
    );
    expect(canRemoveStudent(params(dono, { userId: "ana", matricula: removida })).reason).toBe(
      BLOCK_REASONS.NOT_ACTIVE
    );
  });
});

describe("canReadmitStudent", () => {
  const params = (matricula, course = curso(), userDetails = profTurma) => ({
    userDetails,
    course,
    courseId: CURSO,
    student: { userId: "ana", matricula },
  });

  it("readmite quem foi removido", () => {
    expect(canReadmitStudent(params(removida)).allowed).toBe(true);
  });

  it("não traz de volta quem saiu por conta própria", () => {
    expect(canReadmitStudent(params(saiu)).reason).toBe(BLOCK_REASONS.LEFT_BY_CHOICE);
  });

  it("disciplina encerrada recusa, matrícula ativa não tem o que readmitir", () => {
    expect(canReadmitStudent(params(removida, disciplinaEncerrada())).reason).toBe(
      BLOCK_REASONS.FROZEN
    );
    expect(canReadmitStudent(params(ativa)).reason).toBe(BLOCK_REASONS.NOT_ENDED);
  });

  it("aluno não readmite", () => {
    expect(canReadmitStudent(params(removida, curso(), aluna)).reason).toBe(
      BLOCK_REASONS.NO_AUTHORITY
    );
  });
});

describe("canReactivate", () => {
  it("quem saiu ou foi removido volta; disciplina encerrada recusa", () => {
    expect(canReactivate({ course: curso(), matricula: saiu }).allowed).toBe(true);
    expect(canReactivate({ course: curso(), matricula: removida }).allowed).toBe(true);
    expect(canReactivate({ course: disciplinaEncerrada(), matricula: saiu }).reason).toBe(
      BLOCK_REASONS.FROZEN
    );
    expect(canReactivate({ course: curso(), matricula: ativa }).reason).toBe(
      BLOCK_REASONS.NOT_ENDED
    );
  });
});

describe("canChangeCourseRole", () => {
  const ana = { userId: "ana", matricula: ativa };

  it("dono e admin trocam papel", () => {
    expect(canChangeCourseRole({ userDetails: dono, course: curso(), student: ana }).allowed).toBe(true);
    expect(canChangeCourseRole({ userDetails: admin, course: curso(), student: ana }).allowed).toBe(true);
  });

  it("professor da turma não altera o papel de ninguém", () => {
    expect(canChangeCourseRole({ userDetails: profTurma, course: curso(), student: ana }).reason).toBe(
      BLOCK_REASONS.NO_AUTHORITY
    );
  });

  it("não se promove quem está fora da turma", () => {
    expect(
      canChangeCourseRole({
        userDetails: dono,
        course: curso(),
        student: { userId: "ana", matricula: removida },
      }).reason
    ).toBe(BLOCK_REASONS.NOT_ACTIVE);
  });
});

describe("groupsLeftBehind", () => {
  const groups = {
    t1: { g1: { index: 0, members: { ana: true, bia: true } } },
    t2: {
      g2: { index: 1, members: { caio: true } },
      g3: { index: 2, members: { ana: true, edu: true, fer: true } },
    },
  };

  it("deixa os grupos sem entrega e fica nos que já entregaram", () => {
    const submissions = { t1: { group_g1: { submittedAt: "2026-10-01" } } };
    expect(groupsLeftBehind({ groups, submissions, userId: "ana" })).toEqual([
      { assignmentId: "t2", groupId: "g3", index: 2, colleagues: ["edu", "fer"] },
    ]);
  });

  it("sem entregas, deixa todos os grupos em que está", () => {
    expect(groupsLeftBehind({ groups, submissions: {}, userId: "ana" }).map((g) => g.groupId)).toEqual([
      "g1",
      "g3",
    ]);
  });

  it("entrega individual de alguém não segura o grupo", () => {
    const submissions = { t2: { edu: { submittedAt: "2026-10-01" } } };
    expect(
      groupsLeftBehind({ groups, submissions, userId: "ana" }).map((g) => g.groupId)
    ).toContain("g3");
  });
});

describe("avisos", () => {
  const grupo = { assignmentId: "t2", groupId: "g3", index: 2, colleagues: ["edu", "fer"] };
  const titulos = { t2: "Trabalho 2" };

  it("colegas de grupo recebem o aviso pronto, com o grupo que a regra confere", () => {
    const avisos = groupLeftNotifications({
      studentName: "Ana Souza",
      reason: END_REASONS.LEFT,
      courseId: CURSO,
      groupsLeft: [grupo],
      assignmentTitles: titulos,
      prefsByUid: {},
      createdAt: CREATED_AT,
    });
    expect(avisos.map((a) => a.uid)).toEqual(["edu", "fer"]);
    expect(avisos[0].record).toMatchObject({
      type: "group_changes",
      courseId: CURSO,
      assignmentId: "t2",
      groupId: "g3",
      message: 'Ana Souza saiu do curso e deixou o Grupo 3 de "Trabalho 2".',
      read: false,
      createdAt: CREATED_AT,
    });
  });

  it("na remoção a frase muda, e quem desligou mudanças de grupo não recebe", () => {
    const avisos = groupLeftNotifications({
      studentName: "Ana Souza",
      reason: END_REASONS.REMOVED,
      courseId: CURSO,
      groupsLeft: [grupo],
      assignmentTitles: titulos,
      prefsByUid: { fer: { groupChanges: false } },
      createdAt: CREATED_AT,
    });
    expect(avisos.map((a) => a.uid)).toEqual(["edu"]);
    expect(avisos[0].record.message).toMatch(/^Ana Souza foi removido da turma/);
  });

  it("dono e professores da turma sabem da saída, sem repetir e sem avisar quem saiu", () => {
    const avisos = studentLeftNotifications({
      studentName: "Diego",
      userId: "prof",
      course: curso(),
      courseId: CURSO,
      teacherIds: ["prof", "prof2", DONO],
      prefsByUid: { prof2: { studentLeft: false } },
      createdAt: CREATED_AT,
    });
    expect(avisos.map((a) => a.uid)).toEqual([DONO]);
    expect(avisos[0].record).toMatchObject({
      type: "student_left",
      message: "Diego saiu de Engenharia de Software.",
      link: `/adm-cursos?courseId=${CURSO}&tab=3`,
    });
  });

  it("o aviso de remoção não depende de preferência e explica a volta", () => {
    const removido = enrollmentChangedNotification({
      action: "removed",
      course: curso(),
      courseId: CURSO,
      createdAt: CREATED_AT,
    });
    expect(removido.type).toBe("enrollment_changed");
    expect(removido.message).toContain("Seu histórico foi preservado");
    const readmitido = enrollmentChangedNotification({
      action: "readmitted",
      course: curso(),
      courseId: CURSO,
      createdAt: CREATED_AT,
    });
    expect(readmitido.link).toBe(`/classes?courseId=${CURSO}`);
  });
});

describe("escritas", () => {
  let n = 0;
  const newKey = () => `k${++n}`;

  it("encerrar só marca a matrícula e nunca apaga histórico", () => {
    const updates = enrollmentEndUpdates({
      courseId: CURSO,
      userId: "ana",
      endedBy: "ana",
      reason: END_REASONS.LEFT,
      endedAt: ENDED_AT,
      newKey,
    });
    expect(updates).toEqual({
      [`studentCourses/ana/${CURSO}/endedAt`]: ENDED_AT,
      [`studentCourses/ana/${CURSO}/endedBy`]: "ana",
      [`studentCourses/ana/${CURSO}/endReason`]: END_REASONS.LEFT,
    });
    const apagados = Object.entries(updates).filter(([, v]) => v === null);
    expect(apagados).toEqual([]);
  });

  it("professor da turma que sai perde o papel; grupos e avisos vão na mesma escrita", () => {
    n = 0;
    const updates = enrollmentEndUpdates({
      courseId: CURSO,
      userId: "prof",
      endedBy: "prof",
      reason: END_REASONS.LEFT,
      endedAt: ENDED_AT,
      revokeTeacherRole: true,
      groupsLeft: [{ assignmentId: "t2", groupId: "g3" }],
      notifications: [{ uid: "edu", record: { type: "group_changes" } }],
      newKey,
    });
    expect(updates[`users/prof/coursesTeacher/${CURSO}`]).toBeNull();
    expect(updates[`assignmentGroups/${CURSO}/t2/g3/members/prof`]).toBeNull();
    expect(updates["notifications/edu/k1"]).toEqual({ type: "group_changes" });
    const apagados = Object.keys(updates).filter((c) => updates[c] === null);
    expect(apagados.sort()).toEqual([
      `assignmentGroups/${CURSO}/t2/g3/members/prof`,
      `users/prof/coursesTeacher/${CURSO}`,
    ]);
  });

  it("reativar limpa só os três campos do encerramento", () => {
    expect(reactivationUpdates({ courseId: CURSO, userId: "ana" })).toEqual({
      [`studentCourses/ana/${CURSO}/endedAt`]: null,
      [`studentCourses/ana/${CURSO}/endedBy`]: null,
      [`studentCourses/ana/${CURSO}/endReason`]: null,
    });
  });
});

describe("textos", () => {
  const TZ = "America/Sao_Paulo";

  it("o gate diz quando e por quê", () => {
    expect(returnPromptMessage(getEnrollmentState(saiu), { timeZone: TZ })).toBe(
      "Você saiu desta turma em 12/10/2026. Voltar para a turma? Seu progresso continua de onde parou."
    );
    expect(returnPromptMessage(getEnrollmentState(removida), { timeZone: TZ })).toMatch(
      /^Você foi removido desta turma em 12\/10\/2026\./
    );
  });

  it("a confirmação de saída mostra só as linhas que valem", () => {
    const simples = leaveConfirmationLines({ course: curso(), isCourseTeacher: false, groupsLeft: [] });
    expect(simples).toHaveLength(3);
    expect(simples.join(" ")).not.toMatch(/PIN|professor desta turma|Grupo/);

    const completo = leaveConfirmationLines({
      course: curso({ pinEnabled: true }),
      isCourseTeacher: true,
      groupsLeft: [{ assignmentId: "t2", groupId: "g3", index: 2 }],
      assignmentTitles: { t2: "Trabalho 2" },
    });
    expect(completo).toHaveLength(6);
    expect(completo).toContain('Você sai do Grupo 3 de "Trabalho 2", e seus colegas serão avisados.');
  });

  it("a confirmação de remoção avisa que, em curso aberto, o aluno pode voltar", () => {
    const linhas = removalConfirmationLines({
      course: curso(),
      studentName: "Carlos",
      groupsLeft: [],
    });
    expect(linhas).toContain("Em curso aberto, quem foi removido pode voltar quando quiser.");
    expect(linhas.join(" ")).not.toMatch(/permanentemente|não pode ser desfeita/);
  });
});

describe("decideCourseAccess", () => {
  const decide = (userDetails, course, matricula) =>
    decideCourseAccess({ userDetails, course, courseId: CURSO, matricula });
  const fechado = curso({ pinEnabled: true });

  it("quem conduz a turma entra sempre, mesmo em curso fechado e sem matrícula", () => {
    [dono, admin, profTurma].forEach((quem) => {
      expect(decide(quem, fechado, null).decision).toBe(COURSE_ACCESS.GRANT);
    });
  });

  it("quem está na turma entra; quem nunca entrou segue a regra do PIN", () => {
    expect(decide(aluna, fechado, ativa).decision).toBe(COURSE_ACCESS.GRANT);
    expect(decide(aluna, fechado, null).decision).toBe(COURSE_ACCESS.PIN);
    expect(decide(aluna, curso(), null).decision).toBe(COURSE_ACCESS.GRANT);
    expect(decide(null, curso(), null).decision).toBe(COURSE_ACCESS.GRANT);
  });

  it("abrir o curso nunca reativa: quem saiu precisa decidir voltar", () => {
    expect(decide(aluna, curso(), saiu)).toEqual({
      decision: COURSE_ACCESS.RETURN,
      needsPin: false,
      reason: END_REASONS.LEFT,
      endedAt: ENDED_AT,
    });
  });

  it("no curso fechado, a volta passa pelo PIN, inclusive de quem foi removido", () => {
    expect(decide(aluna, fechado, removida)).toMatchObject({
      decision: COURSE_ACCESS.RETURN,
      needsPin: true,
      reason: END_REASONS.REMOVED,
    });
  });

  it("disciplina encerrada não tem volta", () => {
    expect(decide(aluna, disciplinaEncerrada(), saiu).decision).toBe(COURSE_ACCESS.FROZEN);
  });

  it("professor da turma que saiu já perdeu o papel e volta como qualquer um", () => {
    const exProfessor = { userId: "prof", role: "student", coursesTeacher: {} };
    expect(decide(exProfessor, fechado, saiu).decision).toBe(COURSE_ACCESS.RETURN);
  });
});

describe("textos do gate", () => {
  const TZ = "America/Sao_Paulo";
  const estado = getEnrollmentState(saiu);

  it("atrás do PIN, explica que a chave é a volta", () => {
    expect(returnWithPinMessage(estado, { timeZone: TZ })).toBe(
      "Você saiu desta turma em 12/10/2026. Para voltar, informe a chave de acesso do curso. Seu progresso continua de onde parou."
    );
  });

  it("na disciplina encerrada, explica por que não há volta", () => {
    expect(frozenReturnMessage(getEnrollmentState(removida), { timeZone: TZ })).toBe(
      "Você foi removido desta turma em 12/10/2026. A disciplina já foi encerrada, então não é possível voltar até ela ser reaberta."
    );
  });
});
