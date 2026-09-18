import { describe, it, expect } from "vitest";
import { ErrorTypes, createDetailedError, formatFriendlyError } from "./errors";

describe("formatFriendlyError - modelo indisponível", () => {
  const erroDeModelo = (details) =>
    createDetailedError(
      ErrorTypes.MODEL_NOT_FOUND,
      "O modelo não está disponível.",
      details
    );

  it("não recomenda nenhum modelo pelo nome", () => {
    // A mensagem antiga recomendava "Llama 3.3 70B Versatile", que é
    // justamente o modelo descontinuado que causava o erro.
    const mensagem = formatFriendlyError(erroDeModelo({ modelId: "morto" }));

    expect(mensagem).not.toMatch(/llama/i);
    expect(mensagem).toContain("morto");
  });

  it("lista o que foi tentado quando a cadeia inteira falhou", () => {
    const mensagem = formatFriendlyError(
      erroDeModelo({ modelosTentados: ["morto-1", "morto-2", "morto-3"] })
    );

    expect(mensagem).toContain("morto-1, morto-2, morto-3");
    expect(mensagem).toContain("administrador");
  });

  it("mantém a mensagem de modelo único quando só um foi tentado", () => {
    const mensagem = formatFriendlyError(
      erroDeModelo({ modelId: "único", modelosTentados: ["único"] })
    );

    expect(mensagem).toContain("único");
    expect(mensagem).not.toContain("nesta ordem");
  });
});
