import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref, update, get } from "firebase/database";

/**
 * Teste de integração do encerramento da matrícula contra o emulador do RTDB.
 *
 * As regras já são cobertas em `enrollment.rules.emulator.test.js`. Aqui o que
 * importa é o que o serviço faz com um banco de verdade:
 *
 *  - sair e ser removido NÃO apagam o histórico: progresso de vídeo, resultado
 *    de quiz e a própria matrícula continuam lá, só marcada como encerrada;
 *  - o grupo que já entregou fica com quem saiu; o que não entregou, não;
 *  - os avisos chegam a quem deve e respeitam quem desligou;
 *  - professor da turma que sai perde o papel; o que é removido, não existe;
 *  - disciplina encerrada recusa tudo;
 *  - voltar e readmitir tornam a mesma matrícula ativa, com o progresso dela.
 *
 * Precisa do emulador de pé (`npm run firebase-emulate`). Sem ele, os testes são
 * reportados como pulados, não aprovados. Porta configurável via RTDB_EMULATOR_PORT.
 */

const PORT = Number(process.env.RTDB_EMULATOR_PORT || 9000);
const NS = "plataformacodefolio";

vi.mock("../../config/firebase", async () => {
  const { initializeApp } = await import("firebase/app");
  const { getDatabase } = await import("firebase/database");
  const porta = Number(process.env.RTDB_EMULATOR_PORT || 9000);
  const app = initializeApp(
    { databaseURL: `http://127.0.0.1:${porta}?ns=plataformacodefolio` },
    "enrollment-emulator-test"
  );
  return { database: getDatabase(app), auth: {}, analytics: {} };
});

const emuladorNoAr = await (async () => {
  try {
    return (await fetch(`http://127.0.0.1:${PORT}/.json?ns=${NS}`)).ok;
  } catch {
    return false;
  }
})();

if (!emuladorNoAr) {
  console.warn(
    `⚠️  Emulador do RTDB não encontrado em 127.0.0.1:${PORT}. ` +
      `Testes de integração da saída do curso pulados — rode 'npm run firebase-emulate'.`
  );
}

const {
  BLOCK_REASONS,
  leaveCourse,
  removeStudentFromCourse,
  reactivateEnrollment,
  readmitStudent,
  loadEnrollmentContext,
} = await import("./enrollment");
const { database } = await import("../../config/firebase");

const CURSO = "curso_saida_teste";
const DONO = "dono_saida_teste";
const ANA = "ana_saida_teste";
const EDU = "edu_saida_teste";
const FER = "fer_saida_teste";
const PROF = "prof_saida_teste";
const PROF2 = "prof2_saida_teste";
const TODOS = [DONO, ANA, EDU, FER, PROF, PROF2];

const dono = { userId: DONO, role: "student" };
const ana = { userId: ANA, role: "student" };
const prof = { userId: PROF, role: "student", coursesTeacher: { [CURSO]: true } };

const valor = async (caminho) => (await get(ref(database, caminho))).val();
const avisosDe = async (uid) => Object.values((await valor(`notifications/${uid}`)) || {});

const semear = async (extra = {}) => {
  const semente = {
    [`courses/${CURSO}`]: { title: "Engenharia de Software", userId: DONO },
    [`users/${DONO}`]: { firstName: "Dona", lastName: "Silva" },
    [`users/${ANA}`]: { firstName: "Ana", lastName: "Souza" },
    [`users/${EDU}`]: { firstName: "Edu" },
    [`users/${FER}`]: { firstName: "Fer" },
    [`users/${PROF}`]: { firstName: "Diego", coursesTeacher: { [CURSO]: true } },
    [`users/${PROF2}`]: { firstName: "Iris", coursesTeacher: { [CURSO]: true } },
    [`videoProgress/${ANA}/${CURSO}/v1`]: { watched: true, progress: 100 },
    [`quizResults/${ANA}/${CURSO}/q1`]: { attemptCount: 2, isPassed: false, score: 40 },
    [`courseAssignments/${CURSO}`]: {
      t1: { title: "Trabalho 1" },
      t2: { title: "Trabalho 2" },
    },
    [`assignmentGroups/${CURSO}`]: {
      t1: { g1: { index: 0, members: { [ANA]: true, [EDU]: true } } },
      t2: { g3: { index: 2, members: { [ANA]: true, [EDU]: true, [FER]: true, [PROF]: true } } },
    },
    [`assignmentSubmissions/${CURSO}`]: { t1: { group_g1: { submittedAt: "2026-10-01" } } },
    [`notificationPrefs/${FER}/${CURSO}`]: { groupChanges: false },
    [`notificationPrefs/${PROF2}/${CURSO}`]: { studentLeft: false },
    ...extra,
  };
  [ANA, EDU, FER, PROF].forEach((uid) => {
    semente[`studentCourses/${uid}/${CURSO}`] ??= {
      title: "Engenharia de Software",
      progress: 40,
      status: "in_progress",
    };
  });
  await update(ref(database), semente);
};

describe.runIf(emuladorNoAr)("encerramento da matrícula", () => {
  beforeEach(async () => {
    const limpeza = {
      [`courses/${CURSO}`]: null,
      [`courseAssignments/${CURSO}`]: null,
      [`assignmentGroups/${CURSO}`]: null,
      [`assignmentSubmissions/${CURSO}`]: null,
    };
    TODOS.forEach((uid) => {
      ["users", "studentCourses", "videoProgress", "quizResults", "notifications", "notificationPrefs"].forEach(
        (no) => {
          limpeza[`${no}/${uid}`] = null;
        }
      );
    });
    await update(ref(database), limpeza);
    await semear();
  });

  describe("saída do aluno", () => {
    it("encerra a matrícula e mantém todo o histórico", async () => {
      await leaveCourse({ userDetails: ana, courseId: CURSO });

      expect(await valor(`studentCourses/${ANA}/${CURSO}`)).toMatchObject({
        progress: 40,
        status: "in_progress",
        endedBy: ANA,
        endReason: "left",
      });
      expect(await valor(`studentCourses/${ANA}/${CURSO}/endedAt`)).toBeTruthy();
      expect(await valor(`videoProgress/${ANA}/${CURSO}/v1`)).toMatchObject({ watched: true });
      expect(await valor(`quizResults/${ANA}/${CURSO}/q1`)).toMatchObject({ attemptCount: 2 });
    });

    it("fica no grupo que entregou e deixa o que não entregou", async () => {
      await leaveCourse({ userDetails: ana, courseId: CURSO });

      expect(await valor(`assignmentGroups/${CURSO}/t1/g1/members/${ANA}`)).toBe(true);
      expect(await valor(`assignmentGroups/${CURSO}/t2/g3/members/${ANA}`)).toBeNull();
      expect(await valor(`assignmentGroups/${CURSO}/t2/g3/members/${EDU}`)).toBe(true);
    });

    it("avisa os colegas do grupo deixado e os professores, menos quem desligou", async () => {
      await leaveCourse({ userDetails: ana, courseId: CURSO });

      const [doEdu] = await avisosDe(EDU);
      expect(doEdu).toMatchObject({
        type: "group_changes",
        groupId: "g3",
        message: 'Ana Souza saiu do curso e deixou o Grupo 3 de "Trabalho 2".',
      });
      expect(await avisosDe(EDU)).toHaveLength(1);
      expect(await avisosDe(FER)).toEqual([]);

      const doDono = await avisosDe(DONO);
      const doProf = await avisosDe(PROF);
      expect(doDono.map((a) => a.type)).toEqual(["student_left"]);
      expect(doProf.map((a) => a.type).sort()).toEqual(["group_changes", "student_left"]);
      expect(await avisosDe(PROF2)).toEqual([]);
    });

    it("o dono não sai, e quem já saiu não sai de novo", async () => {
      await expect(leaveCourse({ userDetails: dono, courseId: CURSO })).rejects.toMatchObject({
        reason: BLOCK_REASONS.NOT_ACTIVE,
      });
      await update(ref(database), {
        [`studentCourses/${DONO}/${CURSO}`]: { progress: 0, status: "in_progress" },
      });
      await expect(leaveCourse({ userDetails: dono, courseId: CURSO })).rejects.toMatchObject({
        reason: BLOCK_REASONS.OWNER,
      });

      await leaveCourse({ userDetails: ana, courseId: CURSO });
      await expect(leaveCourse({ userDetails: ana, courseId: CURSO })).rejects.toMatchObject({
        reason: BLOCK_REASONS.NOT_ACTIVE,
      });
    });
  });

  describe("saída do professor da turma", () => {
    it("perde o papel na mesma escrita e não avisa a si mesmo", async () => {
      await leaveCourse({ userDetails: prof, courseId: CURSO });

      expect(await valor(`users/${PROF}/coursesTeacher/${CURSO}`)).toBeNull();
      expect(await valor(`studentCourses/${PROF}/${CURSO}/endReason`)).toBe("left");
      expect(await avisosDe(PROF)).toEqual([]);
      expect((await avisosDe(DONO)).map((a) => a.message)).toEqual([
        "Diego saiu de Engenharia de Software.",
      ]);
    });
  });

  describe("remoção da turma", () => {
    it("o professor da turma remove, o aluno é avisado e o histórico fica", async () => {
      await removeStudentFromCourse({ userDetails: prof, courseId: CURSO, studentId: ANA });

      expect(await valor(`studentCourses/${ANA}/${CURSO}`)).toMatchObject({
        progress: 40,
        endedBy: PROF,
        endReason: "removed",
      });
      expect(await valor(`quizResults/${ANA}/${CURSO}/q1`)).toMatchObject({ attemptCount: 2 });
      expect((await avisosDe(ANA)).map((a) => a.type)).toEqual(["enrollment_changed"]);
      expect((await avisosDe(EDU))[0].message).toMatch(/^Ana Souza foi removido da turma/);
      // Remoção não avisa os professores: quem removeu já sabe.
      expect(await avisosDe(DONO)).toEqual([]);
    });

    it("professor da turma não é removido, nem pelo dono", async () => {
      await expect(
        removeStudentFromCourse({ userDetails: dono, courseId: CURSO, studentId: PROF })
      ).rejects.toMatchObject({ reason: BLOCK_REASONS.TEACHER });
      expect(await valor(`studentCourses/${PROF}/${CURSO}/endedAt`)).toBeNull();
    });

    it("aluno não remove colega", async () => {
      await expect(
        removeStudentFromCourse({ userDetails: ana, courseId: CURSO, studentId: EDU })
      ).rejects.toMatchObject({ reason: BLOCK_REASONS.NO_AUTHORITY });
    });
  });

  describe("disciplina encerrada", () => {
    it("recusa sair, remover e voltar", async () => {
      await update(ref(database), {
        [`courses/${CURSO}/type`]: "disciplina",
        [`courses/${CURSO}/closedAt`]: "2026-12-10T12:00:00.000Z",
        [`studentCourses/${FER}/${CURSO}/endedAt`]: "2026-11-01T12:00:00.000Z",
        [`studentCourses/${FER}/${CURSO}/endReason`]: "left",
      });

      await expect(leaveCourse({ userDetails: ana, courseId: CURSO })).rejects.toMatchObject({
        reason: BLOCK_REASONS.FROZEN,
      });
      await expect(
        removeStudentFromCourse({ userDetails: dono, courseId: CURSO, studentId: ANA })
      ).rejects.toMatchObject({ reason: BLOCK_REASONS.FROZEN });
      await expect(reactivateEnrollment({ userId: FER, courseId: CURSO })).rejects.toMatchObject({
        reason: BLOCK_REASONS.FROZEN,
      });
      expect(await valor(`studentCourses/${ANA}/${CURSO}/endedAt`)).toBeNull();
    });
  });

  describe("volta e readmissão", () => {
    it("quem saiu volta à mesma matrícula, com o progresso dela", async () => {
      await leaveCourse({ userDetails: ana, courseId: CURSO });
      await reactivateEnrollment({ userId: ANA, courseId: CURSO });

      const matricula = await valor(`studentCourses/${ANA}/${CURSO}`);
      expect(matricula).toMatchObject({ progress: 40, status: "in_progress" });
      expect(matricula.endedAt).toBeUndefined();
      expect(matricula.endReason).toBeUndefined();
    });

    it("o professor readmite quem foi removido, e o aluno é avisado", async () => {
      await removeStudentFromCourse({ userDetails: dono, courseId: CURSO, studentId: ANA });
      await readmitStudent({ userDetails: prof, courseId: CURSO, studentId: ANA });

      expect(await valor(`studentCourses/${ANA}/${CURSO}/endedAt`)).toBeNull();
      expect((await avisosDe(ANA)).map((a) => a.title).sort()).toEqual([
        "Você foi readmitido na turma",
        "Você foi removido da turma",
      ]);
    });

    it("quem saiu por conta própria não é readmitido pelo professor", async () => {
      await leaveCourse({ userDetails: ana, courseId: CURSO });
      await expect(
        readmitStudent({ userDetails: dono, courseId: CURSO, studentId: ANA })
      ).rejects.toMatchObject({ reason: BLOCK_REASONS.LEFT_BY_CHOICE });
    });
  });

  describe("contexto da confirmação", () => {
    it("traz o nome, o papel e os grupos que a pessoa deixaria", async () => {
      const contexto = await loadEnrollmentContext(CURSO, PROF);
      expect(contexto).toMatchObject({
        studentName: "Diego",
        isCourseTeacher: true,
        assignmentTitles: { t1: "Trabalho 1", t2: "Trabalho 2" },
      });
      expect(contexto.groupsLeft.map((g) => g.groupId)).toEqual(["g3"]);
    });
  });
});
