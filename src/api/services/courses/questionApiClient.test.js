import { describe, it, expect, vi } from "vitest";
import {
  normalizeQuestionApiResponse,
  shouldFallbackToGroq,
  generateQuestionsWithQuestionApi,
} from "./questionApiClient";
import { QUESTION_TYPES } from "./quizGenerator";

const okResponse = (body) => ({
  ok: true,
  status: 200,
  json: async () => body,
});

const baseConfig = (fetchImpl) => ({
  baseUrl: "http://10.0.0.172:8000",
  timeoutMs: 5000,
  fetchImpl,
});

describe("normalizeQuestionApiResponse - múltipla escolha", () => {
  it("converte correct_answer com letra 'A' para correctOption 0", () => {
    const apiResponse = {
      ok: true,
      questions: [
        {
          id: 1,
          type: "multiple_choice",
          question: "O que a clorofila absorve?",
          options: ["Luz", "Água", "Solo", "Ar"],
          correct_answer: "A",
          explanation: "A clorofila absorve energia luminosa.",
        },
      ],
    };

    const result = normalizeQuestionApiResponse(
      apiResponse,
      QUESTION_TYPES.MULTIPLE_CHOICE
    );

    expect(result).toHaveLength(1);
    expect(result[0].question).toBe("O que a clorofila absorve?");
    expect(result[0].options).toEqual(["Luz", "Água", "Solo", "Ar"]);
    expect(result[0].correctOption).toBe(0);
  });

  it("resolve correct_answer pelo texto da alternativa quando não é letra", () => {
    const apiResponse = {
      questions: [
        {
          question: "Qual o gás produzido?",
          options: ["Gás carbônico", "Oxigênio", "Nitrogênio"],
          correct_answer: "Oxigênio",
        },
      ],
    };

    const result = normalizeQuestionApiResponse(
      apiResponse,
      QUESTION_TYPES.MULTIPLE_CHOICE
    );

    expect(result[0].correctOption).toBe(1);
  });
});

describe("normalizeQuestionApiResponse - questões abertas", () => {
  it("mapeia correct_answer para expectedAnswer e ignora options", () => {
    const apiResponse = {
      questions: [
        {
          type: "short_answer",
          question: "Explique a fotossíntese.",
          correct_answer: "Processo em que plantas produzem glicose com luz.",
          explanation: "Detalhe extra.",
        },
      ],
    };

    const result = normalizeQuestionApiResponse(
      apiResponse,
      QUESTION_TYPES.OPEN
    );

    expect(result).toHaveLength(1);
    expect(result[0].question).toBe("Explique a fotossíntese.");
    expect(result[0].expectedAnswer).toBe(
      "Processo em que plantas produzem glicose com luz."
    );
    expect(result[0].options).toBeUndefined();
  });

  it("usa explanation como expectedAnswer quando correct_answer está ausente", () => {
    const apiResponse = {
      questions: [
        {
          type: "essay",
          question: "Disserte sobre clorofila.",
          explanation: "A clorofila absorve energia luminosa.",
        },
      ],
    };

    const result = normalizeQuestionApiResponse(
      apiResponse,
      QUESTION_TYPES.OPEN
    );

    expect(result[0].expectedAnswer).toBe(
      "A clorofila absorve energia luminosa."
    );
  });
});

describe("shouldFallbackToGroq", () => {
  it("faz fallback em 502, 503 e 504", () => {
    expect(shouldFallbackToGroq({ status: 502 })).toBe(true);
    expect(shouldFallbackToGroq({ status: 503 })).toBe(true);
    expect(shouldFallbackToGroq({ status: 504 })).toBe(true);
  });

  it("NÃO faz fallback em 400 (payload inválido)", () => {
    expect(shouldFallbackToGroq({ status: 400 })).toBe(false);
  });

  it("faz fallback em erro de rede (sem status)", () => {
    expect(shouldFallbackToGroq(new TypeError("Failed to fetch"))).toBe(true);
  });

  it("faz fallback em timeout (AbortError)", () => {
    const err = new Error("aborted");
    err.name = "AbortError";
    expect(shouldFallbackToGroq(err)).toBe(true);
  });
});

describe("generateQuestionsWithQuestionApi", () => {
  it("envia o payload correto e retorna questões normalizadas no sucesso", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      okResponse({
        ok: true,
        model: "gpt-5.5",
        questions: [
          {
            question: "O que é fotossíntese?",
            options: ["Processo A", "Processo B", "Processo C", "Processo D"],
            correct_answer: "A",
          },
        ],
      })
    );

    const result = await generateQuestionsWithQuestionApi(
      "Texto do PDF",
      3,
      null,
      QUESTION_TYPES.MULTIPLE_CHOICE,
      null,
      baseConfig(fetchImpl)
    );

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchImpl.mock.calls[0];
    expect(url).toBe("http://10.0.0.172:8000/v1/questions");
    expect(opts.method).toBe("POST");
    // API é aberta: só Content-Type, sem nenhum header de autenticação
    expect(opts.headers["Content-Type"]).toBe("application/json");
    expect(opts.headers.Authorization).toBeUndefined();
    expect(opts.headers["X-API-Key"]).toBeUndefined();
    const sentBody = JSON.parse(opts.body);
    expect(sentBody.prompt).toBe("Texto do PDF");
    expect(sentBody.question_count).toBe(3);
    expect(sentBody.question_type).toBe("multiple_choice");

    expect(result).toHaveLength(1);
    expect(result[0].correctOption).toBe(0);
  });

  it("mapeia tipo aberto para short_answer", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(okResponse({ ok: true, questions: [] }));

    await generateQuestionsWithQuestionApi(
      "Texto",
      2,
      null,
      QUESTION_TYPES.OPEN,
      null,
      baseConfig(fetchImpl)
    );

    const sentBody = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(sentBody.question_type).toBe("short_answer");
  });

  it("lança erro com status quando a resposta não é ok", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ detail: "OAuth indisponível" }),
    });

    await expect(
      generateQuestionsWithQuestionApi(
        "Texto",
        2,
        null,
        QUESTION_TYPES.MULTIPLE_CHOICE,
        null,
        baseConfig(fetchImpl)
      )
    ).rejects.toMatchObject({ status: 503 });
  });
});
