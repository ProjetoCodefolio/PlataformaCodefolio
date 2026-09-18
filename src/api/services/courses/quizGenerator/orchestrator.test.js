import { describe, it, expect, vi, afterEach } from "vitest";
import { generateQuestionsWithFallback } from "./orchestrator";
import { QUESTION_TYPES } from "./constants";
import { ErrorTypes, createDetailedError } from "./errors";

afterEach(() => {
  vi.restoreAllMocks();
});

const run = (deps, modelosAlternativos = []) =>
  generateQuestionsWithFallback(
    "Texto do material",
    3,
    "llama-3.3-70b-versatile",
    "groq-key",
    null,
    null,
    QUESTION_TYPES.MULTIPLE_CHOICE,
    modelosAlternativos,
    deps
  );

const modeloSumido = (modelId) =>
  createDetailedError(
    ErrorTypes.MODEL_NOT_FOUND,
    `O modelo "${modelId}" não está disponível.`,
    { statusCode: 404, modelId }
  );

describe("generateQuestionsWithFallback", () => {
  it("usa a Question API como provider primário quando ela tem sucesso", async () => {
    const callQuestionApi = vi.fn().mockResolvedValue([{ question: "Q1" }]);
    const callGroq = vi.fn();

    const result = await run({
      questionApiEnabled: () => true,
      callQuestionApi,
      callGroq,
    });

    expect(result.provider).toBe("question_api");
    expect(result.questions).toEqual([{ question: "Q1" }]);
    expect(callQuestionApi).toHaveBeenCalledTimes(1);
    expect(callGroq).not.toHaveBeenCalled();
  });

  it("faz fallback para GROQ quando a Question API falha com erro recuperável (503)", async () => {
    const apiError = Object.assign(new Error("indisponível"), { status: 503 });
    const callQuestionApi = vi.fn().mockRejectedValue(apiError);
    const callGroq = vi.fn().mockResolvedValue([{ question: "G1" }]);

    const result = await run({
      questionApiEnabled: () => true,
      callQuestionApi,
      callGroq,
    });

    expect(result.provider).toBe("groq");
    expect(result.questions).toEqual([{ question: "G1" }]);
    expect(callGroq).toHaveBeenCalledTimes(1);
  });

  it("NÃO faz fallback (e relança) quando a Question API falha com 400 (payload)", async () => {
    const apiError = Object.assign(new Error("payload inválido"), { status: 400 });
    const callQuestionApi = vi.fn().mockRejectedValue(apiError);
    const callGroq = vi.fn();

    await expect(
      run({
        questionApiEnabled: () => true,
        callQuestionApi,
        callGroq,
      })
    ).rejects.toMatchObject({ status: 400 });

    expect(callGroq).not.toHaveBeenCalled();
  });

  it("usa GROQ diretamente quando a Question API está desabilitada", async () => {
    const callQuestionApi = vi.fn();
    const callGroq = vi.fn().mockResolvedValue([{ question: "G1" }]);

    const result = await run({
      questionApiEnabled: () => false,
      callQuestionApi,
      callGroq,
    });

    expect(result.provider).toBe("groq");
    expect(callQuestionApi).not.toHaveBeenCalled();
    expect(callGroq).toHaveBeenCalledTimes(1);
  });
});

describe("generateQuestionsWithFallback - logging", () => {
  it("registra em log quando o GPT falha e passa a usar a GROQ", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const apiError = Object.assign(new Error("indisponível"), { status: 503 });

    await run({
      questionApiEnabled: () => true,
      callQuestionApi: vi.fn().mockRejectedValue(apiError),
      callGroq: vi.fn().mockResolvedValue([{ question: "G1" }]),
    });

    const logged = warn.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(logged).toContain("Question API");
    expect(logged).toContain("GROQ");
  });

  it("registra em log o que falhou quando a GROQ (fallback) também falha", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    const apiError = Object.assign(new Error("api fora"), { status: 503 });
    const groqError = new Error("groq estourou");

    await expect(
      run({
        questionApiEnabled: () => true,
        callQuestionApi: vi.fn().mockRejectedValue(apiError),
        callGroq: vi.fn().mockRejectedValue(groqError),
      })
    ).rejects.toThrow("groq estourou");

    const logged = error.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(logged).toContain("GROQ");
    expect(logged).toContain("groq estourou");
  });
});

describe("generateQuestionsWithFallback - cadeia de modelos", () => {
  const semQuestionApi = (callGroq) => ({
    questionApiEnabled: () => false,
    callQuestionApi: vi.fn(),
    callGroq,
  });

  const modeloUsadoNaChamada = (callGroq, indice) =>
    callGroq.mock.calls[indice][2];

  it("passa para o próximo modelo quando o selecionado sumiu do provedor", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const callGroq = vi
      .fn()
      .mockRejectedValueOnce(modeloSumido("llama-3.3-70b-versatile"))
      .mockResolvedValue([{ question: "Q1" }]);

    const result = await run(semQuestionApi(callGroq), ["openai/gpt-oss-120b"]);

    expect(callGroq).toHaveBeenCalledTimes(2);
    expect(modeloUsadoNaChamada(callGroq, 0)).toBe("llama-3.3-70b-versatile");
    expect(modeloUsadoNaChamada(callGroq, 1)).toBe("openai/gpt-oss-120b");
    expect(result.questions).toEqual([{ question: "Q1" }]);
    expect(result.modeloUsado).toBe("openai/gpt-oss-120b");
    expect(result.modelosIndisponiveis).toEqual(["llama-3.3-70b-versatile"]);
  });

  it("percorre a cadeia inteira até achar um modelo que responde", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const callGroq = vi
      .fn()
      .mockRejectedValueOnce(modeloSumido("llama-3.3-70b-versatile"))
      .mockRejectedValueOnce(modeloSumido("morto-2"))
      .mockResolvedValue([{ question: "Q1" }]);

    const result = await run(semQuestionApi(callGroq), ["morto-2", "vivo"]);

    expect(callGroq).toHaveBeenCalledTimes(3);
    expect(result.modeloUsado).toBe("vivo");
    expect(result.modelosIndisponiveis).toEqual([
      "llama-3.3-70b-versatile",
      "morto-2",
    ]);
  });

  it("avisa a etapa de processamento quando troca de modelo", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const onProcessingStep = vi.fn();
    const callGroq = vi
      .fn()
      .mockRejectedValueOnce(modeloSumido("morto"))
      .mockResolvedValue([{ question: "Q1" }]);

    await generateQuestionsWithFallback(
      "Texto",
      3,
      "morto",
      "groq-key",
      null,
      onProcessingStep,
      QUESTION_TYPES.MULTIPLE_CHOICE,
      ["vivo"],
      semQuestionApi(callGroq)
    );

    const avisos = onProcessingStep.mock.calls.map((c) => c[0]).join("\n");
    expect(avisos).toContain("morto");
    expect(avisos).toContain("vivo");
  });

  it("NÃO troca de modelo em erro que não é 404 de modelo", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const rateLimit = createDetailedError(
      ErrorTypes.RATE_LIMIT,
      "Limite de tokens-por-minuto excedido.",
      { statusCode: 429 }
    );
    const callGroq = vi.fn().mockRejectedValue(rateLimit);

    await expect(
      run(semQuestionApi(callGroq), ["outro-modelo"])
    ).rejects.toMatchObject({ errorType: ErrorTypes.RATE_LIMIT });

    expect(callGroq).toHaveBeenCalledTimes(1);
  });

  it("com a cadeia inteira morta, relança dizendo o que foi tentado", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const callGroq = vi.fn().mockRejectedValue(modeloSumido("qualquer"));

    await expect(
      run(semQuestionApi(callGroq), ["morto-2", "morto-3"])
    ).rejects.toMatchObject({
      errorType: ErrorTypes.MODEL_NOT_FOUND,
      details: {
        modelosTentados: ["llama-3.3-70b-versatile", "morto-2", "morto-3"],
      },
    });

    expect(callGroq).toHaveBeenCalledTimes(3);
  });

  it("sem alternativas, se comporta como antes: uma tentativa só", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const callGroq = vi.fn().mockRejectedValue(modeloSumido("único"));

    await expect(run(semQuestionApi(callGroq))).rejects.toMatchObject({
      errorType: ErrorTypes.MODEL_NOT_FOUND,
    });

    expect(callGroq).toHaveBeenCalledTimes(1);
  });
});
