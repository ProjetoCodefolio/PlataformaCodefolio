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

// Valores reais do catálogo sincronizado.
const MODELO = {
  modelId: "openai/gpt-oss-120b",
  name: "GPT OSS 120B",
  contextWindow: 131072,
  maxCompletionTokens: 65536,
  tpmLimit: 8000,
  features: ["tools", "json_mode", "structured_outputs"],
};

const gerar = (numQuestions, modelo = MODELO) =>
  generateQuestionsWithGroq(
    "Texto do material didático",
    numQuestions,
    modelo,
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

    // O JSON é lido, mas nenhuma questão passa na validação de formato.
    await expect(gerar(5)).rejects.toThrow(/nenhuma questão válida/i);
  });
});

describe("generateQuestionsWithGroq - orçamento e modo JSON", () => {
  const corpoEnviado = (fetchMock) => JSON.parse(fetchMock.mock.calls[0][1].body);

  it("manda o modelId do registro, não o objeto", async () => {
    const fetchMock = mockGroqRespondendo([questaoValida(1)]);
    await gerar(1);

    expect(corpoEnviado(fetchMock).model).toBe("openai/gpt-oss-120b");
  });

  it("dimensiona max_tokens pelo número de questões pedido", async () => {
    const fetchMock = mockGroqRespondendo([questaoValida(1)]);
    await gerar(30);
    const muitas = corpoEnviado(fetchMock).max_tokens;

    const outroFetch = mockGroqRespondendo([questaoValida(1)]);
    await gerar(3);
    const poucas = corpoEnviado(outroFetch).max_tokens;

    expect(muitas).toBeGreaterThan(poucas);
    // O piso de 1024 do orçamento antigo só cabia ~10 questões.
    expect(muitas).toBeGreaterThan(1024);
  });

  it("liga o modo JSON quando o modelo suporta", async () => {
    const fetchMock = mockGroqRespondendo([questaoValida(1)]);
    await gerar(10);

    expect(corpoEnviado(fetchMock).response_format).toEqual({ type: "json_object" });
  });

  it("não liga o modo JSON para modelo sem json_mode", async () => {
    const fetchMock = mockGroqRespondendo([questaoValida(1)]);
    await gerar(10, { ...MODELO, features: ["tools"] });

    expect(corpoEnviado(fetchMock).response_format).toBeUndefined();
  });

  it("corta o texto ao orçamento do modelo que vai atender", async () => {
    const textoEnorme = "palavra ".repeat(200000);
    const fetchMock = mockGroqRespondendo([questaoValida(1)]);

    await generateQuestionsWithGroq(
      textoEnorme,
      5,
      MODELO,
      "groq-key",
      null,
      null,
      QUESTION_TYPES.MULTIPLE_CHOICE
    );

    const prompt = corpoEnviado(fetchMock).messages[1].content;
    expect(prompt.length).toBeLessThan(textoEnorme.length);
    expect(prompt).toContain("[Texto truncado");
  });

  it("falha claro quando nenhum modelo foi informado", async () => {
    await expect(gerar(5, null)).rejects.toThrow(/nenhum modelo de ia/i);
  });
});
