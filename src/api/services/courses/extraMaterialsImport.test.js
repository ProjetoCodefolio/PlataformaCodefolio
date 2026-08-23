import { describe, it, expect, vi } from "vitest";

// A marcação de repetidos é PURA, mas vive num módulo que importa o config do
// Firebase no topo (que chama getAnalytics e quebra em ambiente de teste).
vi.mock("../../config/firebase", () => ({ database: {}, auth: {}, analytics: {} }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const { markAlreadyImportedMaterials } = await import("./extraMaterials.js");

const material = (id, name, url) => ({ id, name, url });

describe("markAlreadyImportedMaterials", () => {
  it("marca o que já existe no destino pela URL", () => {
    const origem = [
      material("a", "Apostila", "https://exemplo.org/apostila.pdf"),
      material("b", "Slides", "https://exemplo.org/slides.pdf"),
    ];
    const destino = [material("x", "Apostila (2025)", "https://exemplo.org/apostila.pdf")];

    const resultado = markAlreadyImportedMaterials(origem, destino);

    expect(resultado.map((m) => m.alreadyImported)).toEqual([true, false]);
  });

  it("compara URL ignorando espaço e caixa, e não o nome", () => {
    const origem = [material("a", "Nome totalmente diferente", "  HTTPS://Exemplo.org/A.pdf ")];
    const destino = [material("x", "Apostila", "https://exemplo.org/a.pdf")];

    expect(markAlreadyImportedMaterials(origem, destino)[0].alreadyImported).toBe(true);
  });

  it("não confunde materiais distintos que tenham o mesmo nome", () => {
    const origem = [material("a", "Apostila", "https://exemplo.org/1.pdf")];
    const destino = [material("x", "Apostila", "https://exemplo.org/2.pdf")];

    expect(markAlreadyImportedMaterials(origem, destino)[0].alreadyImported).toBe(false);
  });

  it("aguenta destino vazio, origem vazia e material sem URL", () => {
    expect(markAlreadyImportedMaterials([], [])).toEqual([]);
    expect(markAlreadyImportedMaterials(null, null)).toEqual([]);
    expect(
      markAlreadyImportedMaterials([material("a", "Sem url", "")], [material("x", "Outro", "")])
    ).toEqual([{ id: "a", name: "Sem url", url: "", alreadyImported: false }]);
  });
});
