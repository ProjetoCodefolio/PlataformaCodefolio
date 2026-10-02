import { describe, it, expect, vi, beforeEach } from "vitest";

// Testa só a regra: o que a importação anuncia, e como. Quem recebe e o texto
// do aviso já são cobertos pelos testes de notifications.js.
vi.mock("../../config/firebase", () => ({ database: {}, auth: {}, analytics: {} }));

vi.mock("firebase/database", () => ({
  ref: (_db, path) => ({ path }),
  get: async ({ path }) => ({ val: () => (path === "courses/c1/title" ? "Algoritmos" : null) }),
  onValue: () => () => {},
}));

const notifyNewContent = vi.fn(async () => {});
const notifyNewQuiz = vi.fn(async () => {});
vi.mock("../notifications", () => ({ notifyNewContent, notifyNewQuiz }));

const { announceImportedContent, announceImportedQuiz } = await import(
  "./importAnnouncements"
);

const FUTURO = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

const quiz = {
  videoId: "v1",
  minPercentage: 70,
  isDiagnostic: false,
  allowRetry: false,
};

beforeEach(() => {
  notifyNewContent.mockClear();
  notifyNewQuiz.mockClear();
});

describe("announceImportedContent", () => {
  it("avisa o conteúdo e o quiz publicados, como no cadastro à mão", async () => {
    await announceImportedContent("c1", [
      { id: "v1", title: "STRIDE", category: "video", quiz: { ...quiz } },
      { id: "s1", title: "Plano", category: "slide", quiz: null },
    ]);

    expect(notifyNewContent.mock.calls).toEqual([
      ["c1", { id: "v1", title: "STRIDE", category: "video" }],
      ["c1", { id: "s1", title: "Plano", category: "slide" }],
    ]);
    expect(notifyNewQuiz).toHaveBeenCalledTimes(1);
    expect(notifyNewQuiz).toHaveBeenCalledWith(
      "c1",
      expect.objectContaining({ id: "v1", title: "STRIDE", minPercentage: 70, allowRetry: false }),
      "Algoritmos"
    );
  });

  it("não avisa nada do que entrou programado: a fila avisa na data", async () => {
    await announceImportedContent("c1", [
      { id: "v1", title: "STRIDE", category: "video", publishAt: FUTURO, quiz: { ...quiz } },
    ]);

    expect(notifyNewContent).not.toHaveBeenCalled();
    expect(notifyNewQuiz).not.toHaveBeenCalled();
  });

  it("não faz nada sem itens", async () => {
    await announceImportedContent("c1", []);

    expect(notifyNewContent).not.toHaveBeenCalled();
    expect(notifyNewQuiz).not.toHaveBeenCalled();
  });
});

describe("announceImportedQuiz", () => {
  it("avisa o quiz com o título do conteúdo a que ele se prende", async () => {
    await announceImportedQuiz("c1", { ...quiz }, { id: "v1", title: "STRIDE" });

    expect(notifyNewQuiz).toHaveBeenCalledWith(
      "c1",
      expect.objectContaining({ id: "v1", title: "STRIDE" }),
      "Algoritmos"
    );
    expect(notifyNewContent).not.toHaveBeenCalled();
  });

  it("não avisa quiz programado", async () => {
    await announceImportedQuiz("c1", { ...quiz, publishAt: FUTURO }, { title: "STRIDE" });

    expect(notifyNewQuiz).not.toHaveBeenCalled();
  });

  it("não avisa quiz preso a conteúdo programado", async () => {
    await announceImportedQuiz("c1", { ...quiz }, { title: "STRIDE", publishAt: FUTURO });

    expect(notifyNewQuiz).not.toHaveBeenCalled();
  });

  it("usa a chave do quiz de slide no aviso", async () => {
    await announceImportedQuiz("c1", { ...quiz, videoId: "slide_s1" }, { title: "Plano" });

    expect(notifyNewQuiz).toHaveBeenCalledWith(
      "c1",
      expect.objectContaining({ id: "slide_s1", title: "Plano" }),
      "Algoritmos"
    );
  });
});
