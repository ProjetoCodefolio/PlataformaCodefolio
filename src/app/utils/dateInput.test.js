import { describe, it, expect } from "vitest";
import { isoToLocalInput, localInputToIso } from "./dateInput";

describe("dateInput", () => {
  it("ida e volta preserva o instante (até o minuto)", () => {
    const iso = new Date(2026, 2, 10, 19, 30).toISOString();
    expect(localInputToIso(isoToLocalInput(iso))).toBe(iso);
  });

  it("formata no horário local", () => {
    const iso = new Date(2026, 0, 5, 8, 7).toISOString();
    expect(isoToLocalInput(iso)).toBe("2026-01-05T08:07");
  });

  it("vazio e inválido viram string vazia", () => {
    expect(isoToLocalInput("")).toBe("");
    expect(isoToLocalInput(null)).toBe("");
    expect(isoToLocalInput("lixo")).toBe("");
    expect(localInputToIso("")).toBe("");
    expect(localInputToIso("lixo")).toBe("");
  });
});
