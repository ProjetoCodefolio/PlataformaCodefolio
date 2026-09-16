import { describe, it, expect } from "vitest";

// `submitterKeyFor`/`isValidGoogleDriveUrl`/`computeIsLate` são PURAS, mas o
// módulo importa o config do Firebase no topo. Mockamos o config: nenhuma
// das três toca o banco.
import { vi } from "vitest";
vi.mock("$api/config/firebase", () => ({ database: {} }));

const { submitterKeyFor, isValidGoogleDriveUrl, computeIsLate } = await import(
  "./submissions.js"
);

describe("submitterKeyFor", () => {
  it("modo individual: usa o próprio userId", () => {
    expect(submitterKeyFor("individual", "user-1")).toBe("user-1");
  });

  it("modo grupo: usa o prefixo group_", () => {
    expect(submitterKeyFor("group", "user-1", "g1")).toBe("group_g1");
  });
});

describe("isValidGoogleDriveUrl", () => {
  it("aceita drive.google.com", () => {
    expect(isValidGoogleDriveUrl("https://drive.google.com/file/d/abc/view")).toBe(true);
  });

  it("aceita docs.google.com e subdomínios (ex.: docs de times)", () => {
    expect(isValidGoogleDriveUrl("https://docs.google.com/document/d/abc")).toBe(true);
    expect(isValidGoogleDriveUrl("https://sub.docs.google.com/document/d/abc")).toBe(true);
  });

  it("rejeita outros domínios, mesmo parecidos", () => {
    expect(isValidGoogleDriveUrl("https://drive.google.com.evil.com/x")).toBe(false);
    expect(isValidGoogleDriveUrl("https://dropbox.com/s/abc")).toBe(false);
  });

  it("rejeita valores vazios, não-string ou URLs inválidas", () => {
    expect(isValidGoogleDriveUrl("")).toBe(false);
    expect(isValidGoogleDriveUrl(null)).toBe(false);
    expect(isValidGoogleDriveUrl(undefined)).toBe(false);
    expect(isValidGoogleDriveUrl("não é url")).toBe(false);
  });
});

describe("computeIsLate", () => {
  it("sem prazo definido, nunca está atrasada", () => {
    expect(computeIsLate(null, "2026-01-10T12:00:00.000Z")).toBe(false);
    expect(computeIsLate(undefined, "2026-01-10T12:00:00.000Z")).toBe(false);
  });

  it("entrega antes do prazo não está atrasada", () => {
    expect(
      computeIsLate("2026-01-10T23:59:59.000Z", "2026-01-10T12:00:00.000Z")
    ).toBe(false);
  });

  it("entrega depois do prazo está atrasada", () => {
    expect(
      computeIsLate("2026-01-10T12:00:00.000Z", "2026-01-10T23:59:59.000Z")
    ).toBe(true);
  });

  it("prazo inválido é tratado como 'sem prazo' (nunca atrasada)", () => {
    expect(computeIsLate("data-invalida", "2026-01-10T12:00:00.000Z")).toBe(false);
  });

  it("usa a hora atual quando submittedAt não é informado", () => {
    const umAnoNoPassado = new Date();
    umAnoNoPassado.setFullYear(umAnoNoPassado.getFullYear() - 1);
    expect(computeIsLate(umAnoNoPassado.toISOString())).toBe(true);
  });
});
