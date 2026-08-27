import { describe, it, expect, vi } from "vitest";

// A montagem das threads e a checagem de permissão são PURAS, mas vivem num
// módulo que importa o config do Firebase no topo (que chama getAnalytics e
// quebra em ambiente de teste).
vi.mock("../../config/firebase", () => ({ database: {}, auth: {}, analytics: {} }));

const {
  buildCommentThreads,
  canDeleteComment,
  countComments,
  validateCommentText,
  MAX_COMMENT_LENGTH,
} = await import("./videoComments.js");

const comentario = (id, over = {}) => ({
  text: `Comentário ${id}`,
  userId: "aluno1",
  userName: "Ana",
  userPhotoURL: "",
  createdAt: "2026-08-20T10:00:00.000Z",
  parentId: null,
  ...over,
});

describe("validateCommentText", () => {
  it("recusa vazio e só espaço", () => {
    expect(validateCommentText("").isValid).toBe(false);
    expect(validateCommentText("   ").isValid).toBe(false);
  });

  it("recusa acima do limite que a regra do banco também aplica", () => {
    expect(validateCommentText("a".repeat(MAX_COMMENT_LENGTH)).isValid).toBe(true);
    expect(validateCommentText("a".repeat(MAX_COMMENT_LENGTH + 1)).isValid).toBe(false);
  });
});

describe("buildCommentThreads", () => {
  it("agrupa respostas sob a raiz, em ordem cronológica dos dois lados", () => {
    const threads = buildCommentThreads({
      r1: comentario("r1", { createdAt: "2026-08-20T10:00:00.000Z" }),
      r2: comentario("r2", { createdAt: "2026-08-21T10:00:00.000Z" }),
      resp2: comentario("resp2", {
        parentId: "r1",
        createdAt: "2026-08-20T12:00:00.000Z",
      }),
      resp1: comentario("resp1", {
        parentId: "r1",
        createdAt: "2026-08-20T11:00:00.000Z",
      }),
    });

    expect(threads.map((t) => t.id)).toEqual(["r1", "r2"]);
    expect(threads[0].replies.map((r) => r.id)).toEqual(["resp1", "resp2"]);
    expect(threads[1].replies).toEqual([]);
  });

  it("sobe para a raiz a resposta cujo pai foi apagado", () => {
    // Escondê-la faria a mensagem sumir da tela sem ninguém ter apagado nada.
    const threads = buildCommentThreads({
      orfa: comentario("orfa", { parentId: "raiz-que-nao-existe" }),
    });

    expect(threads).toHaveLength(1);
    expect(threads[0].id).toBe("orfa");
  });

  it("não deixa um comentário virar pai de si mesmo", () => {
    const threads = buildCommentThreads({ c1: comentario("c1", { parentId: "c1" }) });

    expect(threads).toHaveLength(1);
    expect(threads[0].replies).toEqual([]);
  });

  it("descarta entradas sem texto e aguenta nó ausente", () => {
    expect(buildCommentThreads(null)).toEqual([]);
    expect(buildCommentThreads({ lixo: { userId: "x" }, ok: comentario("ok") })).toHaveLength(1);
  });
});

describe("countComments", () => {
  it("conta raízes e respostas", () => {
    const threads = buildCommentThreads({
      r1: comentario("r1"),
      resp: comentario("resp", { parentId: "r1", createdAt: "2026-08-20T11:00:00.000Z" }),
      r2: comentario("r2", { createdAt: "2026-08-22T10:00:00.000Z" }),
    });

    expect(countComments(threads)).toBe(3);
    expect(countComments([])).toBe(0);
  });
});

describe("canDeleteComment", () => {
  const doAluno = comentario("c1", { userId: "aluno1" });
  const contexto = { courseId: "curso1", courseOwnerUid: "prof1" };

  it("o autor apaga o próprio", () => {
    expect(canDeleteComment(doAluno, { userId: "aluno1" }, contexto)).toBe(true);
  });

  it("outro aluno não apaga", () => {
    expect(canDeleteComment(doAluno, { userId: "aluno2" }, contexto)).toBe(false);
  });

  it("dono do curso, professor do curso e admin moderam", () => {
    expect(canDeleteComment(doAluno, { userId: "prof1" }, contexto)).toBe(true);
    expect(canDeleteComment(doAluno, { userId: "x", role: "admin" }, contexto)).toBe(true);
    expect(
      canDeleteComment(doAluno, { userId: "prof2", coursesTeacher: { curso1: true } }, contexto)
    ).toBe(true);
  });

  it("professor de OUTRO curso não modera este", () => {
    expect(
      canDeleteComment(doAluno, { userId: "prof2", coursesTeacher: { curso9: true } }, contexto)
    ).toBe(false);
  });

  it("visitante sem login não apaga nada", () => {
    expect(canDeleteComment(doAluno, null, contexto)).toBe(false);
    expect(canDeleteComment(doAluno, {}, contexto)).toBe(false);
  });
});
