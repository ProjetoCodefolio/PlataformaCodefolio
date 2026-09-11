import { describe, it, expect } from "vitest";
import { reindexAnchoredPosition } from "./anchoredPosition.js";

const duvida = (id) => ({ id, text: `dúvida ${id}` });

describe("reindexAnchoredPosition", () => {
  it("sem âncora ainda (primeira renderização), mantém o índice atual dentro dos limites", () => {
    const visiveis = [duvida("a"), duvida("b"), duvida("c")];
    expect(reindexAnchoredPosition(visiveis, null, 1)).toEqual({
      nextIndex: 1,
      nextAnchorId: "b",
    });
  });

  it("dúvida em cartaz continua na lista: segue a âncora na posição nova", () => {
    // "b" era a 2ª (índice 1) e virou a 1ª (índice 0) — uma dúvida nova
    // não entra antes dela, mas uma anterior pode ter sido descartada.
    const visiveis = [duvida("b"), duvida("c")];
    expect(reindexAnchoredPosition(visiveis, "b", 1)).toEqual({
      nextIndex: 0,
      nextAnchorId: "b",
    });
  });

  it("dúvida nova no fim da fila não desloca quem está em cartaz", () => {
    const visiveis = [duvida("a"), duvida("b"), duvida("c"), duvida("d")];
    expect(reindexAnchoredPosition(visiveis, "b", 1)).toEqual({
      nextIndex: 1,
      nextAnchorId: "b",
    });
  });

  it("dúvida em cartaz saiu da lista (discutida/excluída): fica na mesma posição, agora a próxima da fila", () => {
    const visiveis = [duvida("a"), duvida("c"), duvida("d")];
    expect(reindexAnchoredPosition(visiveis, "b", 1)).toEqual({
      nextIndex: 1,
      nextAnchorId: "c",
    });
  });

  it("dúvida em cartaz saiu e era a última: recua para a nova última posição, não para uma tela vazia", () => {
    const visiveis = [duvida("a"), duvida("b")];
    expect(reindexAnchoredPosition(visiveis, "c", 2)).toEqual({
      nextIndex: 1,
      nextAnchorId: "b",
    });
  });

  it("lista fica vazia: cai em zero e sem âncora", () => {
    expect(reindexAnchoredPosition([], "b", 1)).toEqual({
      nextIndex: 0,
      nextAnchorId: null,
    });
  });
});
