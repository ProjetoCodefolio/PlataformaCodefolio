import { describe, it, expect, vi, beforeEach } from "vitest";

// O módulo de notificações escreve no RTDB e consulta alunos/preferências.
// Mockamos as bordas para testar apenas a regra: QUEM recebe e O QUE a
// mensagem diz sobre a janela de disponibilidade do quiz.
const escritas = [];

vi.mock("$api/config/firebase", () => ({ database: {}, auth: {}, analytics: {} }));

vi.mock("firebase/database", () => ({
  ref: (_db, path) => ({ path }),
  push: (listRef) => ({ key: "notif-1", path: listRef.path }),
  set: async (nodeRef, value) => {
    escritas.push({ path: nodeRef.path, value });
  },
  get: async () => ({ exists: () => false }),
  update: async () => {},
  query: (r) => r,
  orderByChild: () => ({}),
  onValue: () => () => {},
}));

const alunos = [
  { userId: "aluno-1", role: "student" },
  { userId: "aluno-2", role: "student" },
  { userId: "prof-1", role: "teacher" },
];

vi.mock("$api/services/courses/students", () => ({
  fetchCourseStudentsEnriched: async () => alunos,
}));

const prefsPorAluno = {};

vi.mock("$api/services/notificationPrefs", async () => {
  const real = await vi.importActual("$api/services/notificationPrefs");
  return {
    ...real,
    fetchPrefs: async (userId) => ({
      ...real.DEFAULT_PREFS,
      ...(prefsPorAluno[userId] || {}),
    }),
  };
});

const { notifyNewQuiz } = await import("./notifications.js");

const DAQUI_A_UM_MES = new Date(
  Date.now() + 30 * 24 * 3600 * 1000
).toISOString();
const UM_MES_ATRAS = new Date(
  Date.now() - 30 * 24 * 3600 * 1000
).toISOString();

beforeEach(() => {
  escritas.length = 0;
  Object.keys(prefsPorAluno).forEach((k) => delete prefsPorAluno[k]);
});

describe("notifyNewQuiz - quem recebe", () => {
  it("notifica alunos matriculados e ignora o professor", async () => {
    await notifyNewQuiz("curso-1", { id: "v1", title: "Aula 1" }, "Algoritmos");

    expect(escritas).toHaveLength(2);
    expect(escritas.map((e) => e.path)).toEqual([
      "notifications/aluno-1",
      "notifications/aluno-2",
    ]);
    expect(escritas[0].value.type).toBe("new_quiz");
    expect(escritas[0].value.quizId).toBe("v1");
    expect(escritas[0].value.read).toBe(false);
    expect(escritas[0].value.link).toBe("/classes?courseId=curso-1");
  });

  it("respeita quem desativou o tipo 'newQuiz'", async () => {
    prefsPorAluno["aluno-2"] = { newQuiz: false };
    await notifyNewQuiz("curso-1", { id: "v1", title: "Aula 1" });

    expect(escritas.map((e) => e.path)).toEqual(["notifications/aluno-1"]);
  });

  it("respeita quem desativou as notificações do curso inteiro", async () => {
    prefsPorAluno["aluno-1"] = { inAppEnabled: false };
    await notifyNewQuiz("curso-1", { id: "v1", title: "Aula 1" });

    expect(escritas.map((e) => e.path)).toEqual(["notifications/aluno-2"]);
  });

  it("não faz nada sem courseId ou sem quiz", async () => {
    await notifyNewQuiz("", { id: "v1" });
    await notifyNewQuiz("curso-1", null);
    expect(escritas).toHaveLength(0);
  });
});

describe("notifyNewQuiz - mensagem sobre a janela", () => {
  const mensagem = () => escritas[0].value.message;

  it("sem datas, diz que já está disponível", async () => {
    await notifyNewQuiz("curso-1", { id: "v1", title: "Aula 1" }, "Algoritmos");
    expect(mensagem()).toBe("Algoritmos: Aula 1. Já está disponível.");
  });

  it("com abertura futura, anuncia quando abre", async () => {
    await notifyNewQuiz("curso-1", {
      id: "v1",
      title: "Aula 1",
      openDate: DAQUI_A_UM_MES,
    });
    expect(mensagem()).toMatch(/^Aula 1\. Abre em /);
  });

  it("com abertura já passada, trata como disponível agora", async () => {
    await notifyNewQuiz("curso-1", {
      id: "v1",
      title: "Aula 1",
      openDate: UM_MES_ATRAS,
    });
    expect(mensagem()).toBe("Aula 1. Já está disponível.");
  });

  it("com encerramento, informa o prazo", async () => {
    await notifyNewQuiz("curso-1", {
      id: "v1",
      title: "Aula 1",
      closeDate: DAQUI_A_UM_MES,
    });
    expect(mensagem()).toMatch(/^Aula 1\. Disponível até /);
  });

  it("com janela completa, informa abertura e encerramento", async () => {
    await notifyNewQuiz("curso-1", {
      id: "v1",
      title: "Aula 1",
      openDate: DAQUI_A_UM_MES,
      closeDate: DAQUI_A_UM_MES,
    });
    expect(mensagem()).toMatch(/Abre em .+ e encerra em /);
  });
});
