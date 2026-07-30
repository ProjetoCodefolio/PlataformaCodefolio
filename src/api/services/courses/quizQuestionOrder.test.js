import { describe, it, expect, vi, beforeEach } from "vitest";

// Reordenar questões grava o nó do quiz inteiro com set(). Mockamos o RTDB para
// inspecionar EXATAMENTE o payload gravado: é aí que dá para perder as questões
// ou a configuração do quiz sem ninguém perceber.
const escritas = [];

vi.mock("../../config/firebase", () => ({ database: {}, auth: {}, analytics: {} }));

vi.mock("firebase/database", () => ({
  ref: (_db, path) => ({ path }),
  set: async (nodeRef, value) => {
    escritas.push({ path: nodeRef.path, value });
  },
  get: async () => ({ exists: () => false, val: () => null }),
  update: async () => {},
  remove: async () => {},
  push: () => ({ key: "novo" }),
}));

const { reorderQuizQuestions } = await import("./quizzes.js");

const Q = (id) => ({ id, question: `Pergunta ${id}`, options: ["a", "b"], correctOption: 0 });

const quizBase = () => ({
  videoId: "v1",
  courseId: "c1",
  minPercentage: 70,
  isDiagnostic: false,
  allowRetry: true,
  maxAttempts: 3,
  openDate: "2026-07-01T12:00:00.000Z",
  closeDate: "2026-08-01T12:00:00.000Z",
  questions: [Q("q1"), Q("q2"), Q("q3")],
});

beforeEach(() => {
  escritas.length = 0;
});

describe("reorderQuizQuestions", () => {
  it("grava as questões na nova ordem", async () => {
    const quiz = quizBase();
    const nova = [Q("q3"), Q("q1"), Q("q2")];

    const atualizado = await reorderQuizQuestions("c1", quiz, nova);

    expect(escritas).toHaveLength(1);
    expect(escritas[0].path).toBe("courseQuizzes/c1/v1");
    expect(escritas[0].value.questions.map((q) => q.id)).toEqual([
      "q3",
      "q1",
      "q2",
    ]);
    expect(atualizado.questions.map((q) => q.id)).toEqual(["q3", "q1", "q2"]);
  });

  // O set() reescreve o nó inteiro: se a configuração não for junto, reordenar
  // apagaria silenciosamente a janela e o limite de tentativas.
  it("preserva nota mínima, tentativas e janela ao reordenar", async () => {
    const quiz = quizBase();
    await reorderQuizQuestions("c1", quiz, [Q("q2"), Q("q1"), Q("q3")]);

    const gravado = escritas[0].value;
    expect(gravado.minPercentage).toBe(70);
    expect(gravado.allowRetry).toBe(true);
    expect(gravado.maxAttempts).toBe(3);
    expect(gravado.openDate).toBe("2026-07-01T12:00:00.000Z");
    expect(gravado.closeDate).toBe("2026-08-01T12:00:00.000Z");
    expect(gravado.courseId).toBe("c1");
    expect(gravado.videoId).toBe("v1");
  });

  it("recusa uma lista que perdeu questões (estado de UI defasado)", async () => {
    const quiz = quizBase();
    await expect(
      reorderQuizQuestions("c1", quiz, [Q("q1"), Q("q2")])
    ).rejects.toThrow(/não corresponde/);
    expect(escritas).toHaveLength(0);
  });

  it("recusa uma lista com questão estranha ao quiz", async () => {
    const quiz = quizBase();
    await expect(
      reorderQuizQuestions("c1", quiz, [Q("q1"), Q("q2"), Q("intrusa")])
    ).rejects.toThrow(/não corresponde/);
    expect(escritas).toHaveLength(0);
  });

  it("recusa parâmetros inválidos", async () => {
    await expect(reorderQuizQuestions("", quizBase(), [])).rejects.toThrow();
    await expect(reorderQuizQuestions("c1", null, [])).rejects.toThrow();
    await expect(
      reorderQuizQuestions("c1", quizBase(), "não é array")
    ).rejects.toThrow();
    expect(escritas).toHaveLength(0);
  });
});
