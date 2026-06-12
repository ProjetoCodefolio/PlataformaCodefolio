import { describe, it, expect, vi, afterEach } from "vitest";
import { generateQuestionsWithFallback } from "./quizGenerator";
import { QUESTION_TYPES } from "./quizGenerator";

afterEach(() => {
  vi.restoreAllMocks();
});

const run = (deps) =>
  generateQuestionsWithFallback(
    "Texto do material",
    3,
    "llama-3.3-70b-versatile",
    "groq-key",
    null,
    null,
    QUESTION_TYPES.MULTIPLE_CHOICE,
    deps
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
