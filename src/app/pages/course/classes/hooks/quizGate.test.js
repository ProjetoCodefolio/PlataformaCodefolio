import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("react-toastify", () => ({
  toast: { warn: vi.fn(), info: vi.fn() },
}));

const { toast } = await import("react-toastify");
const { canEnterQuizPure } = await import("./quizGate.js");

beforeEach(() => {
  vi.clearAllMocks();
});

const getQuizResultKey = (id) => id;

const baseArgs = {
  contentItems: [
    { id: "video-1", title: "Aula 1", quizId: "curso/video-1", watched: true, isSlide: false },
  ],
  quizSettings: {},
  userAttempts: {},
  getQuizResultKey,
};

describe("canEnterQuizPure", () => {
  it("sem quizId, libera direto (nada para verificar)", () => {
    expect(canEnterQuizPure({ ...baseArgs, quizId: null })).toBe(true);
    expect(toast.warn).not.toHaveBeenCalled();
    expect(toast.info).not.toHaveBeenCalled();
  });

  it("vídeo não assistido: bloqueia com toast.warn", () => {
    const args = {
      ...baseArgs,
      quizId: "curso/video-1",
      contentItems: [
        { id: "video-1", title: "Aula 1", quizId: "curso/video-1", watched: false, isSlide: false },
      ],
    };

    expect(canEnterQuizPure(args)).toBe(false);
    expect(toast.warn).toHaveBeenCalledWith(
      expect.stringContaining("Aula 1")
    );
  });

  it("fora da janela de disponibilidade (ainda não abriu): bloqueia com toast.info", () => {
    const args = {
      ...baseArgs,
      quizId: "curso/video-1",
      quizSettings: { "video-1": { openDate: "2099-01-01T00:00:00.000Z" } },
    };

    expect(canEnterQuizPure(args)).toBe(false);
    expect(toast.info).toHaveBeenCalledWith(
      expect.stringContaining("ainda não abriu")
    );
  });

  it("fora da janela de disponibilidade (já encerrou): bloqueia com toast.info", () => {
    const args = {
      ...baseArgs,
      quizId: "curso/video-1",
      quizSettings: { "video-1": { closeDate: "2000-01-01T00:00:00.000Z" } },
    };

    expect(canEnterQuizPure(args)).toBe(false);
    expect(toast.info).toHaveBeenCalledWith(
      expect.stringContaining("encerrado")
    );
  });

  it("limite de 1 tentativa já usada: bloqueia com mensagem específica de tentativa única", () => {
    const args = {
      ...baseArgs,
      quizId: "curso/video-1",
      quizSettings: { "video-1": { allowRetry: false } },
      userAttempts: { "video-1": { attemptCount: 1 } },
    };

    expect(canEnterQuizPure(args)).toBe(false);
    expect(toast.info).toHaveBeenCalledWith(
      "Este quiz permite apenas 1 tentativa, que você já utilizou."
    );
  });

  it("limite de N tentativas atingido: bloqueia com a contagem no aviso", () => {
    const args = {
      ...baseArgs,
      quizId: "curso/video-1",
      quizSettings: { "video-1": { allowRetry: true, maxAttempts: 3 } },
      userAttempts: { "video-1": { attemptCount: 3 } },
    };

    expect(canEnterQuizPure(args)).toBe(false);
    expect(toast.info).toHaveBeenCalledWith(
      "Você já atingiu o limite de 3 tentativas para este quiz."
    );
  });

  it("caso liberado: assistido, dentro da janela, tentativas disponíveis — libera sem toast", () => {
    const args = {
      ...baseArgs,
      quizId: "curso/video-1",
      quizSettings: { "video-1": { allowRetry: true, maxAttempts: 3 } },
      userAttempts: { "video-1": { attemptCount: 1 } },
    };

    expect(canEnterQuizPure(args)).toBe(true);
    expect(toast.warn).not.toHaveBeenCalled();
    expect(toast.info).not.toHaveBeenCalled();
  });

  it("slide (sem vídeo a assistir) passa direto pela primeira trava", () => {
    const args = {
      ...baseArgs,
      quizId: "curso/slide_1",
      contentItems: [
        { id: "slide_1", title: "Slide 1", quizId: "curso/slide_1", watched: false, isSlide: true },
      ],
    };

    expect(canEnterQuizPure(args)).toBe(true);
  });
});
