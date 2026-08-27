import { describe, it, expect, vi } from "vitest";

// As funções de normalização são PURAS, mas vivem em módulos que importam o
// config do Firebase no topo (que chama getAnalytics e quebra em ambiente de
// teste). Mockamos o config: nada aqui toca o banco.
vi.mock("../../config/firebase", () => ({ database: {}, auth: {}, analytics: {} }));

const { normalizeInteractions, countInteractions, checkUserLikeStatus } = await import(
  "./postInteractions.js"
);
const { normalizeComments } = await import("./comments.js");

const ALUNO = "uid_aluno";
const OUTRO = "uid_outro";

describe("normalizeInteractions", () => {
  it("devolve mapa vazio para ausente ou inválido", () => {
    expect(normalizeInteractions(null)).toEqual({});
    expect(normalizeInteractions(undefined)).toEqual({});
    expect(normalizeInteractions("nada")).toEqual({});
  });

  it("mantém o formato novo, indexado pelo uid", () => {
    const mapa = normalizeInteractions({ [ALUNO]: { nome: "Aluno", data: "01/08/2026" } });
    expect(Object.keys(mapa)).toEqual([ALUNO]);
  });

  it("reindexa o formato antigo (lista) pelo uidUsuario", () => {
    const legado = [
      { uidUsuario: ALUNO, nome: "Aluno" },
      { uidUsuario: OUTRO, nome: "Outro" },
    ];
    expect(Object.keys(normalizeInteractions(legado)).sort()).toEqual([ALUNO, OUTRO].sort());
  });

  it("não conta duas vezes quem aparece nos dois formatos", () => {
    // Cenário da janela entre o deploy e a migração: a curtida antiga ficou em
    // `likes/0` e a nova foi para `likes/{uid}`.
    const misto = { 0: { uidUsuario: ALUNO, nome: "Aluno" }, [ALUNO]: { nome: "Aluno" } };
    expect(countInteractions(misto)).toBe(1);
  });

  it("ignora buracos deixados por listas esparsas", () => {
    expect(countInteractions({ 0: null, 1: { uidUsuario: ALUNO } })).toBe(1);
  });
});

describe("checkUserLikeStatus", () => {
  it("é falso sem post ou sem usuário", () => {
    expect(checkUserLikeStatus(null, ALUNO)).toEqual({ liked: false, disliked: false });
    expect(checkUserLikeStatus({ likes: { [ALUNO]: {} } }, null)).toEqual({
      liked: false,
      disliked: false,
    });
  });

  it("enxerga a curtida de cada um nos dois formatos", () => {
    const novo = { likes: { [ALUNO]: { data: "x" } }, dislikes: { [OUTRO]: { data: "x" } } };
    expect(checkUserLikeStatus(novo, ALUNO)).toEqual({ liked: true, disliked: false });
    expect(checkUserLikeStatus(novo, OUTRO)).toEqual({ liked: false, disliked: true });

    const legado = { likes: [{ uidUsuario: ALUNO }], dislikes: [{ uidUsuario: OUTRO }] };
    expect(checkUserLikeStatus(legado, ALUNO)).toEqual({ liked: true, disliked: false });
    expect(checkUserLikeStatus(legado, OUTRO)).toEqual({ liked: false, disliked: true });
  });
});

describe("normalizeComments", () => {
  it("devolve lista vazia para ausente ou inválido", () => {
    expect(normalizeComments(null)).toEqual([]);
    expect(normalizeComments("nada")).toEqual([]);
  });

  it("ordena os novos por criadoEm e carrega a chave junto", () => {
    const lista = normalizeComments({
      "-Nb": { comentario: "segundo", criadoEm: 2000 },
      "-Na": { comentario: "primeiro", criadoEm: 1000 },
    });
    expect(lista.map((c) => c.comentario)).toEqual(["primeiro", "segundo"]);
    expect(lista[0].id).toBe("-Na");
  });

  it("ordena o formato antigo pela chave numérica, não pela alfabética", () => {
    const legado = { 0: { comentario: "a" }, 2: { comentario: "c" }, 10: { comentario: "d" } };
    expect(normalizeComments(legado).map((c) => c.comentario)).toEqual(["a", "c", "d"]);
  });

  it("põe os comentários migrados (sem criadoEm) antes dos novos", () => {
    const misto = { 0: { comentario: "antigo" }, "-Na": { comentario: "novo", criadoEm: 1000 } };
    expect(normalizeComments(misto).map((c) => c.comentario)).toEqual(["antigo", "novo"]);
  });
});
