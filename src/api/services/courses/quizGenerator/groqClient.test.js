import { describe, it, expect, vi, afterEach } from "vitest";
import { generateQuestionsWithGroq } from "./groqClient";
import { QUESTION_TYPES } from "./constants";

afterEach(() => {
  vi.restoreAllMocks();
});

const questaoValida = (n) => ({
  question: `Pergunta ${n}`,
  options: ["A", "B", "C", "D"],
  correctOption: 0,
});

const mockGroqRespondendo = (questoes) => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      choices: [{ message: { content: JSON.stringify(questoes) } }],
    }),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

const gerar = (numQuestions) =>
  generateQuestionsWithGroq(
    "Texto do material didático",
    numQuestions,
    "openai/gpt-oss-120b",
    "groq-key",
    null,
    null,
    QUESTION_TYPES.MULTIPLE_CHOICE
  );

describe("generateQuestionsWithGroq - ajuste de quantidade", () => {
  it("devolve o que veio quando vieram menos questões do que o pedido", async () => {
    mockGroqRespondendo([questaoValida(1), questaoValida(2), questaoValida(3)]);

    const questoes = await gerar(10);

    expect(questoes).toHaveLength(3);
  });

  it("não inventa questão duplicada com sufixo de variação", async () => {
    mockGroqRespondendo([questaoValida(1), questaoValida(2)]);

    const questoes = await gerar(30);

    const enunciados = questoes.map((q) => q.question);
    expect(enunciados).toEqual(["Pergunta 1", "Pergunta 2"]);
    expect(enunciados.some((e) => e.includes("variação"))).toBe(false);
    expect(new Set(enunciados).size).toBe(enunciados.length);
  });

  it("corta no número pedido quando vieram questões demais", async () => {
    mockGroqRespondendo([1, 2, 3, 4, 5].map(questaoValida));

    const questoes = await gerar(3);

    expect(questoes).toHaveLength(3);
    expect(questoes.map((q) => q.question)).toEqual([
      "Pergunta 1",
      "Pergunta 2",
      "Pergunta 3",
    ]);
  });

  it("devolve a lista inteira quando veio exatamente o pedido", async () => {
    mockGroqRespondendo([questaoValida(1), questaoValida(2)]);

    const questoes = await gerar(2);

    expect(questoes).toHaveLength(2);
  });

  it("dá id único a cada questão devolvida", async () => {
    mockGroqRespondendo([questaoValida(1), questaoValida(2), questaoValida(3)]);

    const questoes = await gerar(3);

    const ids = questoes.map((q) => q.id);
    expect(ids.every(Boolean)).toBe(true);
    expect(new Set(ids).size).toBe(3);
  });

  it("falha quando nenhuma questão válida veio na resposta", async () => {
    mockGroqRespondendo([{ question: "sem alternativas" }]);

    // A resposta sem alternativas é barrada antes da validação, no parser.
    await expect(gerar(5)).rejects.toThrow(/não foi possível interpretar/i);
  });
});
