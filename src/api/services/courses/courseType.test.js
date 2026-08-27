import { describe, it, expect, vi } from "vitest";

// As decisões de tipo e de encerramento são PURAS, mas vivem num módulo que
// importa o config do Firebase no topo (que chama getAnalytics e quebra em
// ambiente de teste).
vi.mock("../../config/firebase", () => ({ database: {}, auth: {}, analytics: {} }));

const {
  COURSE_TYPES,
  getCourseType,
  isDiscipline,
  isCourseClosed,
  canCloseCourse,
  closureUpdatesFor,
  reopenUpdatesFor,
} = await import("./courseType.js");

/**
 * O que este teste protege:
 *
 *  - o acervo anterior ao campo `type` continua sendo curso, sem migração;
 *  - encerrar leva TODO matriculado a concluído, mesmo sem ter assistido tudo;
 *  - encerrar guarda o status anterior de cada um, para que reabrir não promova
 *    a concluído quem não estava;
 *  - encerrar duas vezes não corrompe esse retrato.
 */

const CURSO = "curso1";

const matriculas = (registros) => {
  const nó = {};
  Object.entries(registros).forEach(([uid, matricula]) => {
    nó[uid] = { [CURSO]: matricula, outro_curso: { status: "in_progress" } };
  });
  return nó;
};

describe("getCourseType", () => {
  it("sem o campo, é curso — o acervo antigo não precisa de migração", () => {
    expect(getCourseType({ title: "Algoritmos" })).toBe(COURSE_TYPES.CURSO);
  });

  it("reconhece disciplina", () => {
    expect(getCourseType({ type: "disciplina" })).toBe(COURSE_TYPES.DISCIPLINA);
    expect(isDiscipline({ type: "disciplina" })).toBe(true);
  });

  it("valor estranho cai para curso", () => {
    expect(getCourseType({ type: "materia" })).toBe(COURSE_TYPES.CURSO);
  });
});

describe("encerramento é diferente de arquivamento", () => {
  it("um curso arquivado não está encerrado", () => {
    expect(isCourseClosed({ archived: true })).toBe(false);
  });

  it("está encerrado quem tem closedAt", () => {
    expect(isCourseClosed({ closedAt: "2026-08-27T12:00:00.000Z" })).toBe(true);
  });

  it("só disciplina em andamento pode ser encerrada", () => {
    expect(canCloseCourse({ type: "disciplina" })).toBe(true);
    expect(canCloseCourse({ type: "curso" })).toBe(false);
    expect(canCloseCourse({ type: "disciplina", closedAt: "2026-01-01" })).toBe(false);
  });
});

describe("closureUpdatesFor", () => {
  const nó = matriculas({
    ana: { status: "in_progress", progress: 30 },
    bruno: { status: "completed", progress: 100 },
  });

  const updates = closureUpdatesFor(nó, CURSO, {
    closedAt: "2026-08-27T12:00:00.000Z",
    closedBy: "uid_prof",
  });

  it("carimba o encerramento no curso", () => {
    expect(updates[`courses/${CURSO}/closedAt`]).toBe("2026-08-27T12:00:00.000Z");
    expect(updates[`courses/${CURSO}/closedBy`]).toBe("uid_prof");
  });

  it("leva a concluído quem não tinha terminado", () => {
    expect(updates[`studentCourses/ana/${CURSO}/status`]).toBe("completed");
  });

  it("guarda o status anterior de cada um", () => {
    expect(updates[`studentCourses/ana/${CURSO}/statusBeforeClosure`]).toBe("in_progress");
    expect(updates[`studentCourses/bruno/${CURSO}/statusBeforeClosure`]).toBe("completed");
  });

  it("não encosta nas matrículas de outros cursos", () => {
    const alheios = Object.keys(updates).filter((c) => c.includes("outro_curso"));
    expect(alheios).toEqual([]);
  });

  it("ignora quem não está matriculado nesta turma", () => {
    const semMatricula = closureUpdatesFor(
      { carla: { outro_curso: { status: "in_progress" } } },
      CURSO
    );
    expect(Object.keys(semMatricula).filter((c) => c.startsWith("studentCourses"))).toEqual([]);
  });

  it("encerrar de novo não sobrescreve o retrato do primeiro encerramento", () => {
    const jaEncerrado = matriculas({
      ana: { status: "completed", closedByTeacher: true, statusBeforeClosure: "in_progress" },
    });
    const segunda = closureUpdatesFor(jaEncerrado, CURSO);
    expect(segunda[`studentCourses/ana/${CURSO}/statusBeforeClosure`]).toBeUndefined();
  });
});

describe("reopenUpdatesFor", () => {
  const nó = matriculas({
    ana: { status: "completed", closedByTeacher: true, statusBeforeClosure: "in_progress" },
    bruno: { status: "completed", closedByTeacher: true, statusBeforeClosure: "completed" },
    // Concluiu por conta própria, antes de existir encerramento: não foi o
    // encerramento que o moveu, então reabrir não pode rebaixá-lo.
    carla: { status: "completed", progress: 100 },
  });

  const updates = reopenUpdatesFor(nó, CURSO);

  it("limpa o carimbo do curso", () => {
    expect(updates[`courses/${CURSO}/closedAt`]).toBeNull();
  });

  it("devolve cada um ao status que tinha antes", () => {
    expect(updates[`studentCourses/ana/${CURSO}/status`]).toBe("in_progress");
    expect(updates[`studentCourses/bruno/${CURSO}/status`]).toBe("completed");
  });

  it("apaga as marcas do encerramento", () => {
    expect(updates[`studentCourses/ana/${CURSO}/closedByTeacher`]).toBeNull();
    expect(updates[`studentCourses/ana/${CURSO}/statusBeforeClosure`]).toBeNull();
  });

  it("não rebaixa quem tinha concluído por conta própria", () => {
    const daCarla = Object.keys(updates).filter((c) => c.includes("/carla/"));
    expect(daCarla).toEqual([]);
  });

  it("encerrar e reabrir devolve a turma ao estado inicial", () => {
    const inicial = matriculas({
      ana: { status: "in_progress", progress: 30 },
      bruno: { status: "completed", progress: 100 },
    });

    const fecha = closureUpdatesFor(inicial, CURSO);
    // Aplica o encerramento sobre o nó, como o banco faria.
    const depois = matriculas({
      ana: {
        status: fecha[`studentCourses/ana/${CURSO}/status`],
        closedByTeacher: true,
        statusBeforeClosure: fecha[`studentCourses/ana/${CURSO}/statusBeforeClosure`],
      },
      bruno: {
        status: fecha[`studentCourses/bruno/${CURSO}/status`],
        closedByTeacher: true,
        statusBeforeClosure: fecha[`studentCourses/bruno/${CURSO}/statusBeforeClosure`],
      },
    });

    const abre = reopenUpdatesFor(depois, CURSO);
    expect(abre[`studentCourses/ana/${CURSO}/status`]).toBe("in_progress");
    expect(abre[`studentCourses/bruno/${CURSO}/status`]).toBe("completed");
  });
});
