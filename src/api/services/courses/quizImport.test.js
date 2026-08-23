import { describe, it, expect, vi } from "vitest";

// A cópia das questões é PURA, mas vive num módulo que importa o config do
// Firebase no topo (que chama getAnalytics e quebra em ambiente de teste).
vi.mock("../../config/firebase", () => ({ database: {}, auth: {}, analytics: {} }));

const { copyQuestionsWithNewIds } = await import("./quizImport.js");

const questao = (id, extras = {}) => ({
  id,
  question: `Enunciado ${id}`,
  questionType: "multiple-choice",
  options: ["A", "B"],
  correctOption: 1,
  ...extras,
});

describe("copyQuestionsWithNewIds", () => {
  it("preserva enunciado, alternativas e gabarito", () => {
    const [copia] = copyQuestionsWithNewIds([questao("q1")]);

    expect(copia.question).toBe("Enunciado q1");
    expect(copia.options).toEqual(["A", "B"]);
    expect(copia.correctOption).toBe(1);
    expect(copia.questionType).toBe("multiple-choice");
  });

  it("troca todos os ids por ids novos e distintos entre si", () => {
    const copias = copyQuestionsWithNewIds([questao("q1"), questao("q2")]);
    const ids = copias.map((q) => q.id);

    expect(ids).not.toContain("q1");
    expect(ids).not.toContain("q2");
    expect(new Set(ids).size).toBe(2);
  });

  it("duas importações do mesmo original não colidem", () => {
    const original = [questao("q1")];
    const primeira = copyQuestionsWithNewIds(original);
    const segunda = copyQuestionsWithNewIds(original);

    expect(primeira[0].id).not.toBe(segunda[0].id);
  });

  it("não altera o original", () => {
    const original = [questao("q1")];
    copyQuestionsWithNewIds(original);

    expect(original[0].id).toBe("q1");
  });

  it("mantém campos de imagem e de questão aberta", () => {
    const [copia] = copyQuestionsWithNewIds([
      questao("q1", { imageUrl: "https://exemplo.org/a.png", imageWidth: 300 }),
    ]);
    expect(copia.imageUrl).toBe("https://exemplo.org/a.png");
    expect(copia.imageWidth).toBe(300);

    const [aberta] = copyQuestionsWithNewIds([
      { id: "q2", question: "Discorra", questionType: "open-ended" },
    ]);
    expect(aberta.questionType).toBe("open-ended");
    expect(aberta.correctOption).toBeUndefined();
  });

  it("descarta buracos da lista em vez de copiá-los", () => {
    expect(copyQuestionsWithNewIds([null, questao("q1"), undefined])).toHaveLength(1);
    expect(copyQuestionsWithNewIds(null)).toEqual([]);
  });
});
