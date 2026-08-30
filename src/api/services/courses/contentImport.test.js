import { describe, it, expect, vi } from "vitest";

// A marcação de repetidos é PURA, mas vive num módulo que importa o config do
// Firebase no topo (que chama getAnalytics e quebra em ambiente de teste).
vi.mock("../../config/firebase", () => ({ database: {}, auth: {}, analytics: {} }));

const { markAlreadyImportedContent } = await import("./contentImport.js");

const item = (id, title, url) => ({ id, title, url, category: "video" });

describe("markAlreadyImportedContent", () => {
  it("marca o que já existe no destino pela URL", () => {
    const origem = [
      item("a", "Aula 1", "https://youtu.be/aaa"),
      item("b", "Aula 2", "https://youtu.be/bbb"),
    ];
    const destino = [item("x", "Aula 1 (2025)", "https://youtu.be/aaa")];

    const resultado = markAlreadyImportedContent(origem, destino);

    expect(resultado[0].alreadyImported).toBe(true);
    expect(resultado[1].alreadyImported).toBe(false);
  });

  it("ignora diferença de caixa e espaço em volta da URL", () => {
    const resultado = markAlreadyImportedContent(
      [item("a", "Aula", "  HTTPS://YouTu.be/AAA  ")],
      [item("x", "Aula", "https://youtu.be/aaa")]
    );

    expect(resultado[0].alreadyImported).toBe(true);
  });

  it("título igual com URL diferente não conta como repetido", () => {
    const resultado = markAlreadyImportedContent(
      [item("a", "Aula 1", "https://youtu.be/aaa")],
      [item("x", "Aula 1", "https://youtu.be/zzz")]
    );

    expect(resultado[0].alreadyImported).toBe(false);
  });

  it("item sem URL não casa com outro sem URL", () => {
    const resultado = markAlreadyImportedContent(
      [item("a", "Aula", "")],
      [item("x", "Outra", "")]
    );

    expect(resultado[0].alreadyImported).toBe(false);
  });

  it("preserva os campos do item de origem", () => {
    const [resultado] = markAlreadyImportedContent(
      [{ ...item("a", "Aula", "https://youtu.be/aaa"), hasQuiz: true, order: 3 }],
      []
    );

    expect(resultado.hasQuiz).toBe(true);
    expect(resultado.order).toBe(3);
    expect(resultado.title).toBe("Aula");
  });

  it("aguenta listas vazias ou ausentes", () => {
    expect(markAlreadyImportedContent(undefined, undefined)).toEqual([]);
    expect(markAlreadyImportedContent([], [])).toEqual([]);
  });
});
