import { describe, it, expect, vi } from "vitest";

vi.mock("$api/config/firebase", () => ({ database: {}, auth: {}, analytics: {} }));

const { applyQuestionGradingFields } = await import("./quizQuestions");

describe("applyQuestionGradingFields", () => {
  it("mantém o gabarito e não escreve graded quando a questão vale nota", () => {
    const destino = { question: "Q?", options: ["A", "B"] };
    applyQuestionGradingFields(destino, { correctOption: 1 });

    expect(destino.correctOption).toBe(1);
    expect("graded" in destino).toBe(false);
  });

  it("grava graded false e tira o gabarito da pergunta sem resposta certa", () => {
    const destino = { question: "Q?", options: ["A", "B"] };
    applyQuestionGradingFields(destino, { graded: false, correctOption: 0 });

    expect(destino.graded).toBe(false);
    expect("correctOption" in destino).toBe(false);
  });

  it("carrega a escala quando ela vem preenchida", () => {
    const destino = { question: "Q?", options: ["1", "2"] };
    applyQuestionGradingFields(destino, { graded: false, scale: "likert-5" });

    expect(destino.scale).toBe("likert-5");
  });

  it("remove a escala de uma edição anterior quando ela não vem mais", () => {
    const destino = { question: "Q?", options: ["A", "B"], scale: "likert-5" };
    applyQuestionGradingFields(destino, { correctOption: 0 });

    expect("scale" in destino).toBe(false);
  });
});
