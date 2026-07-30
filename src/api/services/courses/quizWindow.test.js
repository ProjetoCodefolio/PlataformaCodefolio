import { describe, it, expect, vi } from "vitest";

// As funções de janela do quiz são PURAS, mas vivem num módulo que importa o
// config do Firebase no topo (que chama getAnalytics e quebra em ambiente de
// teste). Mockamos o config: a lógica de janela não toca o banco.
vi.mock("../../config/firebase", () => ({ database: {}, auth: {}, analytics: {} }));

const {
  normalizeQuizDate,
  isQuizBeforeOpen,
  isQuizAfterClose,
  getQuizWindowState,
  getQuizWindowMessage,
  persistableQuizSettings,
} = await import("./quizzes.js");

const NOW = new Date("2026-07-30T12:00:00.000Z");
const PAST = "2026-07-01T12:00:00.000Z";
const FUTURE = "2026-08-30T12:00:00.000Z";

describe("normalizeQuizDate", () => {
  it("devolve '' para ausente ou inválida", () => {
    expect(normalizeQuizDate("")).toBe("");
    expect(normalizeQuizDate(null)).toBe("");
    expect(normalizeQuizDate(undefined)).toBe("");
    expect(normalizeQuizDate("não é data")).toBe("");
  });
  it("normaliza para ISO", () => {
    expect(normalizeQuizDate(PAST)).toBe(PAST);
    expect(normalizeQuizDate(new Date(PAST))).toBe(PAST);
  });
});

describe("janela de disponibilidade do quiz", () => {
  it("sem datas o quiz está sempre aberto", () => {
    expect(getQuizWindowState({}, NOW)).toBe("open");
    expect(getQuizWindowState(undefined, NOW)).toBe("open");
    expect(getQuizWindowMessage({}, NOW)).toBeNull();
  });

  it("abertura no futuro → agendado", () => {
    const quiz = { openDate: FUTURE };
    expect(isQuizBeforeOpen(quiz, NOW)).toBe(true);
    expect(getQuizWindowState(quiz, NOW)).toBe("scheduled");
    expect(getQuizWindowMessage(quiz, NOW)).toMatch(/ainda não abriu/);
  });

  it("abertura no passado → aberto", () => {
    const quiz = { openDate: PAST };
    expect(isQuizBeforeOpen(quiz, NOW)).toBe(false);
    expect(getQuizWindowState(quiz, NOW)).toBe("open");
  });

  it("encerramento no passado → encerrado", () => {
    const quiz = { closeDate: PAST };
    expect(isQuizAfterClose(quiz, NOW)).toBe(true);
    expect(getQuizWindowState(quiz, NOW)).toBe("closed");
    expect(getQuizWindowMessage(quiz, NOW)).toMatch(/encerrado/);
  });

  it("dentro da janela → aberto", () => {
    const quiz = { openDate: PAST, closeDate: FUTURE };
    expect(getQuizWindowState(quiz, NOW)).toBe("open");
    expect(getQuizWindowMessage(quiz, NOW)).toBeNull();
  });

  it("datas inválidas não restringem nada", () => {
    const quiz = { openDate: "amanhã", closeDate: "ontem" };
    expect(getQuizWindowState(quiz, NOW)).toBe("open");
  });

  it("ainda não abriu tem precedência sobre encerrado (janela invertida)", () => {
    const quiz = { openDate: FUTURE, closeDate: PAST };
    expect(getQuizWindowState(quiz, NOW)).toBe("scheduled");
  });
});

// Vários pontos reescrevem o nó do quiz inteiro com `set` (CRUD de questões).
// Se as datas não entrarem no payload, a janela some silenciosamente.
describe("persistableQuizSettings preserva a janela", () => {
  it("inclui openDate/closeDate normalizados quando definidos", () => {
    const settings = persistableQuizSettings({
      allowRetry: true,
      openDate: PAST,
      closeDate: FUTURE,
    });
    expect(settings.openDate).toBe(PAST);
    expect(settings.closeDate).toBe(FUTURE);
  });

  it("omite as datas quando ausentes ou inválidas (= sem restrição)", () => {
    expect(persistableQuizSettings({ allowRetry: true })).not.toHaveProperty(
      "openDate"
    );
    const settings = persistableQuizSettings({ openDate: "", closeDate: "xx" });
    expect(settings).not.toHaveProperty("openDate");
    expect(settings).not.toHaveProperty("closeDate");
  });
});
