import { describe, it, expect, beforeAll, afterAll } from "vitest";

/**
 * Teste das REGRAS da fila de publicações (`publicationQueue`), contra o
 * emulador.
 *
 * O que está sendo protegido:
 *  - quem conduz a turma (dono, co-professor, admin) grava e apaga entradas do
 *    próprio curso;
 *  - aluno não lê a fila (ela entrega as datas do que está programado) nem
 *    escreve nela (uma entrada falsa viraria aviso para a turma);
 *  - ninguém grava entrada de OUTRO curso usando uma chave que não começa com
 *    o courseId da entrada;
 *  - entrada sem os campos mínimos é recusada.
 *
 * Fala com o namespace PADRÃO (`plataformacodefolio-default-rtdb`), o único em
 * que o emulador aplica o database.rules.json.
 */

const PORT = Number(process.env.RTDB_EMULATOR_PORT || 9000);
const NS = "plataformacodefolio-default-rtdb";
const BASE = `http://127.0.0.1:${PORT}`;

const CURSO = "curso_regras_fila";
const OUTRO_CURSO = "outro_curso_regras_fila";
const DONO = "dono_regras_fila";
const COPROFESSOR = "coprof_regras_fila";
const ADMIN = "admin_regras_fila";
const ALUNO = "aluno_regras_fila";

const tokenDe = (uid) => {
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url").replace(/=+$/, "");
  return `${b64({ alg: "none", typ: "JWT" })}.${b64({
    iss: "https://securetoken.google.com/plataformacodefolio",
    aud: "plataformacodefolio",
    sub: uid,
    user_id: uid,
    iat: 1,
    exp: 9999999999,
    firebase: { sign_in_provider: "custom" },
  })}.`;
};

const comoUsuario = (caminho, uid, init) =>
  fetch(`${BASE}/${caminho}.json?ns=${NS}&auth=${tokenDe(uid)}`, init);

const comoAdmin = (caminho, init = {}) =>
  fetch(`${BASE}/${caminho}.json?ns=${NS}`, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: "Bearer owner" },
  });

const entrada = (courseId, itemKey = "item1") => ({
  courseId,
  kind: "content",
  itemKey,
  contentId: itemKey,
  source: "content",
  publishAt: "2030-01-01T12:00:00.000Z",
});

const chave = (courseId, itemKey = "item1") => `${courseId}__content__${itemKey}`;

const grava = (uid, key, corpo) =>
  comoUsuario(`publicationQueue/${key}`, uid, { method: "PUT", body: JSON.stringify(corpo) });

const emuladorNoAr = await (async () => {
  try {
    await fetch(`${BASE}/.json?ns=${NS}`);
    return true;
  } catch {
    return false;
  }
})();

describe.runIf(emuladorNoAr)("regras da fila de publicações", () => {
  beforeAll(async () => {
    await comoAdmin(`courses/${CURSO}`, {
      method: "PUT",
      body: JSON.stringify({ title: "Curso", userId: DONO }),
    });
    await comoAdmin(`courses/${OUTRO_CURSO}`, {
      method: "PUT",
      body: JSON.stringify({ title: "Outro", userId: "outra_pessoa" }),
    });
    await comoAdmin(`users/${ADMIN}`, { method: "PUT", body: JSON.stringify({ role: "admin" }) });
    await comoAdmin(`users/${COPROFESSOR}`, {
      method: "PUT",
      body: JSON.stringify({ role: "teacher", coursesTeacher: { [CURSO]: true } }),
    });
    await comoAdmin(`users/${ALUNO}`, { method: "PUT", body: JSON.stringify({ role: "user" }) });
  });

  afterAll(async () => {
    await comoAdmin(`courseQuizzes/${CURSO}`, { method: "DELETE" });
    for (const key of [chave(CURSO), chave(CURSO, "novo"), chave(OUTRO_CURSO)]) {
      await comoAdmin(`publicationQueue/${key}`, { method: "DELETE" });
    }
    for (const caminho of [
      `courses/${CURSO}`,
      `courses/${OUTRO_CURSO}`,
      `users/${ADMIN}`,
      `users/${COPROFESSOR}`,
      `users/${ALUNO}`,
    ]) {
      await comoAdmin(caminho, { method: "DELETE" });
    }
  });

  it.each([
    ["dono", DONO],
    ["co-professor", COPROFESSOR],
    ["admin", ADMIN],
  ])("%s grava e apaga entrada do curso", async (_, uid) => {
    expect((await grava(uid, chave(CURSO), entrada(CURSO))).status).toBe(200);
    const apagou = await comoUsuario(`publicationQueue/${chave(CURSO)}`, uid, { method: "DELETE" });
    expect(apagou.status).toBe(200);
  });

  // As gravações abaixo são as que o app faz de verdade (syncPublicationQueue
  // e removeQuiz), por quem conduz a turma SEM ser admin. Foi aqui que a
  // primeira versão da regra falhou: ler antes de gravar e apagar entrada
  // inexistente eram negados, e a negação derrubava a atualização inteira.
  it.each([
    ["dono", DONO],
    ["co-professor", COPROFESSOR],
  ])("%s faz o ciclo do app: lê, grava junto com um null e apaga", async (_, uid) => {
    // Lê a entrada antes de regravar, exista ou não.
    expect((await comoUsuario(`publicationQueue/${chave(CURSO, "novo")}`, uid)).status).toBe(200);

    // Multi-path na raiz: entrada do conteúdo + null na do quiz, que não existe.
    const sync = await comoUsuario("", uid, {
      method: "PATCH",
      body: JSON.stringify({
        [`publicationQueue/${chave(CURSO, "novo")}`]: entrada(CURSO, "novo"),
        [`publicationQueue/${CURSO}__quiz__novo`]: null,
      }),
    });
    expect(sync.status).toBe(200);
    expect((await comoUsuario(`publicationQueue/${chave(CURSO, "novo")}`, uid)).status).toBe(200);

    // removeQuiz: apaga o quiz e a entrada (inexistente) dele de uma vez.
    await comoAdmin(`courseQuizzes/${CURSO}/novo`, {
      method: "PUT",
      body: JSON.stringify({ videoId: "novo", questions: [] }),
    });
    const remocao = await comoUsuario("", uid, {
      method: "PATCH",
      body: JSON.stringify({
        [`courseQuizzes/${CURSO}/novo`]: null,
        [`publicationQueue/${CURSO}__quiz__novo`]: null,
      }),
    });
    expect(remocao.status).toBe(200);

    await comoUsuario(`publicationQueue/${chave(CURSO, "novo")}`, uid, { method: "DELETE" });
  });

  it("aluno não lê entrada que existe", async () => {
    await comoAdmin(`publicationQueue/${chave(CURSO)}`, {
      method: "PUT",
      body: JSON.stringify(entrada(CURSO)),
    });
    expect((await comoUsuario(`publicationQueue/${chave(CURSO)}`, ALUNO)).status).toBe(401);
    await comoAdmin(`publicationQueue/${chave(CURSO)}`, { method: "DELETE" });
  });

  it("aluno não escreve nem lê a fila", async () => {
    expect((await grava(ALUNO, chave(CURSO), entrada(CURSO))).status).toBe(401);
    expect((await comoUsuario("publicationQueue", ALUNO)).status).toBe(401);
  });

  it("não aceita entrada de outro curso nem chave que não bate com o courseId", async () => {
    expect((await grava(DONO, chave(OUTRO_CURSO), entrada(OUTRO_CURSO))).status).toBe(401);
    expect((await grava(DONO, chave(OUTRO_CURSO), entrada(CURSO))).status).toBe(401);
  });

  it("recusa entrada sem os campos mínimos", async () => {
    const { publishAt: _publishAt, ...semData } = entrada(CURSO);
    expect((await grava(DONO, chave(CURSO), semData)).status).not.toBe(200);
  });
});
