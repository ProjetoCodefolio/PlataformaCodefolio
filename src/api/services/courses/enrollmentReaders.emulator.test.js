import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref, update, get } from "firebase/database";

/**
 * Teste de integração dos LEITORES da matrícula contra o emulador do RTDB.
 *
 * A matrícula encerrada continua existindo, então cada leitor que antes
 * perguntava "o registro existe?" precisou decidir o que fazer com ela. Os
 * erros que mais custariam são os protegidos aqui:
 *
 *  - quem saiu não recebe aviso para a turma, não é sorteado no Quiz Gigi e
 *    não é levado a concluído quando a disciplina é encerrada;
 *  - recalcular o progresso de todos (o professor editou os vídeos) atualiza o
 *    histórico de quem saiu, mas não o traz de volta;
 *  - as listas do professor mostram quem saiu, marcado e no fim; os números da
 *    turma e a contagem do admin não o contam;
 *  - para o aluno, o curso vai para "Disponíveis" e some de "Minhas avaliações".
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
    "enrollment-readers-emulator-test"
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
      `Testes dos leitores da matrícula pulados — rode 'npm run firebase-emulate'.`
  );
}

const {
  fetchCourseStudentsEnriched,
  fetchCourseStudentCounts,
  fetchStudentCourses,
} = await import("./students");
const { notifyNewContent } = await import("../notifications");
const { loadCategorizedCourses, updateAllUsersCourseProgress } = await import("./courses");
const { closeDiscipline } = await import("./courseType");
const { fetchAllCourseGrades } = await import("./grades");
const { fetchEnrolledStudents } = await import("./quizGigi");
const { database } = await import("../../config/firebase");

const CURSO = "curso_leitores_saida";
const DONO = "dono_leitores_saida";
const ANA = "ana_leitores_saida";
const BIA = "bia_leitores_saida";
const TODOS = [DONO, ANA, BIA];
const ENDED_AT = "2026-10-12T15:00:00.000Z";

const valor = async (caminho) => (await get(ref(database, caminho))).val();

describe.runIf(emuladorNoAr)("leitores da matrícula encerrada", () => {
  beforeEach(async () => {
    const limpeza = {
      [`courses/${CURSO}`]: null,
      [`courseAssessments/${CURSO}`]: null,
    };
    TODOS.forEach((uid) => {
      ["users", "studentCourses", "videoProgress", "notifications"].forEach((no) => {
        limpeza[`${no}/${uid}`] = null;
      });
    });
    await update(ref(database), limpeza);

    // Ana está na turma; Bia saiu, com histórico.
    await update(ref(database), {
      [`courses/${CURSO}`]: { title: "Banco de Dados", userId: DONO, type: "disciplina" },
      [`users/${ANA}`]: { firstName: "Ana", email: "ana@x.com" },
      [`users/${BIA}`]: { firstName: "Bia", email: "bia@x.com" },
      [`studentCourses/${ANA}/${CURSO}`]: { progress: 20, status: "in_progress" },
      [`studentCourses/${BIA}/${CURSO}`]: {
        progress: 50,
        status: "in_progress",
        endedAt: ENDED_AT,
        endedBy: BIA,
        endReason: "left",
      },
      [`videoProgress/${BIA}/${CURSO}/v1`]: { watched: true },
      [`courseAssessments/${CURSO}/p1`]: {
        name: "Prova 1",
        percentage: 100,
        grades: { [BIA]: { grade: 9 } },
      },
    });
  });

  it("a lista padrão é só a turma; a do professor traz quem saiu, marcado e no fim", async () => {
    expect((await fetchCourseStudentsEnriched(CURSO)).map((s) => s.userId)).toEqual([ANA]);

    const comTodos = await fetchCourseStudentsEnriched(CURSO, { includeEnded: true });
    expect(comTodos.map((s) => s.userId)).toEqual([ANA, BIA]);
    expect(comTodos[1]).toMatchObject({ enrollmentEnded: true, endReason: "left", endedAt: ENDED_AT });
  });

  it("quem saiu não recebe aviso de conteúdo novo", async () => {
    await notifyNewContent(CURSO, { id: "aula2", title: "Aula 2", category: "video" }, "Banco de Dados");

    expect(Object.keys((await valor(`notifications/${ANA}`)) || {})).toHaveLength(1);
    expect(await valor(`notifications/${BIA}`)).toBeNull();
  });

  it("quem saiu não entra no sorteio do Quiz Gigi", async () => {
    expect((await fetchEnrolledStudents(CURSO)).map((s) => s.userId ?? s.id)).toEqual([ANA]);
  });

  it("encerrar a disciplina não conclui quem saiu", async () => {
    await closeDiscipline(CURSO, DONO);

    expect(await valor(`studentCourses/${ANA}/${CURSO}/status`)).toBe("completed");
    expect(await valor(`studentCourses/${BIA}/${CURSO}`)).toMatchObject({
      status: "in_progress",
      endReason: "left",
    });
  });

  it("recalcular o progresso de todos atualiza o histórico sem trazer ninguém de volta", async () => {
    await updateAllUsersCourseProgress(CURSO, [{ id: "v1" }, { id: "v2" }]);

    expect(await valor(`studentCourses/${BIA}/${CURSO}`)).toMatchObject({
      progress: 50,
      endedAt: ENDED_AT,
      endReason: "left",
    });
  });

  it("as notas mostram quem saiu, e a contagem do admin não o conta", async () => {
    const notas = await fetchAllCourseGrades(CURSO);
    expect(notas.find((n) => n.userId === BIA)).toMatchObject({ enrollmentEnded: true });
    expect(notas.find((n) => n.userId === ANA).enrollmentEnded).toBe(false);

    expect((await fetchCourseStudentCounts())[CURSO]).toBe(1);
  });

  it("para o aluno, o curso vai para Disponíveis e some de Minhas avaliações", async () => {
    const { availableCourses, inProgressCourses } = await loadCategorizedCourses(BIA);
    const doCurso = (lista) => lista.filter((c) => c.courseId === CURSO);
    expect(doCurso(inProgressCourses)).toEqual([]);
    expect(doCurso(availableCourses)[0]).toMatchObject({ progress: 50, enrollmentEnded: true });

    expect((await fetchStudentCourses(BIA)).map((c) => c.courseId)).not.toContain(CURSO);
    expect((await fetchStudentCourses(ANA)).map((c) => c.courseId)).toContain(CURSO);
  });
});
