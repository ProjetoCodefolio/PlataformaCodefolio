import { describe, it, expect, vi } from "vitest";

// A normalização de ids é PURA, mas vive no módulo de CRUD de questões, que
// importa o config do Firebase no topo (que chama getAnalytics e quebra em
// ambiente de teste).
vi.mock("../../config/firebase", () => ({ database: {}, auth: {}, analytics: {} }));

const { ensureQuestionIds } = await import("./quizQuestions.js");

const questao = (extras = {}) => ({
  question: "Enunciado",
  questionType: "multiple-choice",
  options: ["A", "B"],
  correctOption: 0,
  ...extras,
});

describe("ensureQuestionIds", () => {
  it("devolve a mesma lista quando todos os ids já são únicos", () => {
    const lista = [questao({ id: "a" }), questao({ id: "b" })];

    expect(ensureQuestionIds(lista)).toBe(lista);
  });

  it("dá um id a cada questão que não tem", () => {
    const lista = [questao(), questao(), questao()];

    const ids = ensureQuestionIds(lista).map((q) => q.id);

    expect(ids).toEqual(["q1", "q2", "q3"]);
    expect(new Set(ids).size).toBe(3);
  });

  it("desempata ids repetidos mantendo o primeiro", () => {
    const lista = [
      questao({ id: "mesmo", question: "primeira" }),
      questao({ id: "mesmo", question: "segunda" }),
    ];

    const [primeira, segunda] = ensureQuestionIds(lista);

    expect(primeira.id).toBe("mesmo");
    expect(segunda.id).not.toBe("mesmo");
    expect(segunda.question).toBe("segunda");
  });

  it("não rouba o id de uma questão que vem depois na lista", () => {
    const lista = [questao(), questao({ id: "q1" })];

    const ids = ensureQuestionIds(lista).map((q) => q.id);

    expect(ids[1]).toBe("q1");
    expect(ids[0]).not.toBe("q1");
    expect(new Set(ids).size).toBe(2);
  });

  it("é estável: a mesma lista produz sempre os mesmos ids", () => {
    const original = [questao(), questao({ id: "x" }), questao()];

    const primeira = ensureQuestionIds(original).map((q) => q.id);
    const segunda = ensureQuestionIds(original).map((q) => q.id);

    expect(primeira).toEqual(segunda);
  });

  it("preserva o resto da questão intacto", () => {
    const [normalizada] = ensureQuestionIds([
      questao({ graded: false, scale: "likert-5", imageUrl: "http://x/y.png" }),
    ]);

    expect(normalizada).toMatchObject({
      question: "Enunciado",
      options: ["A", "B"],
      graded: false,
      scale: "likert-5",
      imageUrl: "http://x/y.png",
    });
  });

  it("não quebra com lista ausente ou com buracos", () => {
    expect(ensureQuestionIds(undefined)).toBeUndefined();
    expect(ensureQuestionIds(null)).toBeNull();
    expect(ensureQuestionIds([null, questao()])[1].id).toBe("q2");
  });
});
