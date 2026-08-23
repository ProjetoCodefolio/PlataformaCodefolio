import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";

/**
 * Teste das REGRAS do banco para as interações do feed, contra o emulador.
 *
 * Fala com o namespace PADRÃO (`plataformacodefolio-default-rtdb`) via API REST,
 * porque é só nele que o emulador aplica o database.rules.json — nos namespaces
 * avulsos as regras ficam abertas e nada seria verificado. A autenticação usa
 * JWT não assinado, que o emulador aceita; `Authorization: Bearer owner` é o
 * acesso de admin do emulador, usado só para preparar e limpar o cenário.
 *
 * O que está sendo protegido:
 *  - qualquer pessoa logada curte, descurte e comenta (era o que estava quebrado:
 *    o nó do post inteiro só aceitava escrita de admin);
 *  - mas cada uma mexe só na PRÓPRIA folha — ninguém curte em nome de outro nem
 *    apaga a curtida ou o comentário alheio;
 *  - o corpo do post (título, link, tags) segue sendo coisa de admin;
 *  - quem não está autenticado não interage.
 *
 * Precisa do emulador de pé (`npm run firebase-emulate`). Sem ele, os testes são
 * reportados como pulados, não aprovados. Porta configurável via RTDB_EMULATOR_PORT.
 */

const PORT = Number(process.env.RTDB_EMULATOR_PORT || 9000);
const NS = "plataformacodefolio-default-rtdb";
const BASE = `http://127.0.0.1:${PORT}`;

const POST = "post_regras_interacoes";
const ADMIN = "admin_regras_interacoes";
const ALUNO = "aluno_regras_interacoes";
const OUTRO_ALUNO = "outro_aluno_regras_interacoes";

/** JWT não assinado no formato que o emulador aceita para simular um usuário. */
const tokenDe = (uid) => {
  const b64 = (obj) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url").replace(/=+$/, "");
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

const curtida = { nome: "Aluno de Teste", data: "20/08/2026" };

const comentarioDe = (uid, extras = {}) => ({
  uidUsuario: uid,
  nome: "Aluno de Teste",
  comentario: "Muito bom o vídeo!",
  data: "20/08/2026",
  foto: "",
  criadoEm: 1755690000000,
  ...extras,
});

const curte = (campo, dono, uid) =>
  comoUsuario(`post/${POST}/${campo}/${dono}`, uid, {
    method: "PUT",
    body: JSON.stringify(curtida),
  });

const descurte = (campo, dono, uid) =>
  comoUsuario(`post/${POST}/${campo}/${dono}`, uid, { method: "DELETE" });

const emuladorNoAr = await (async () => {
  try {
    return (await fetch(`${BASE}/.json?ns=${NS}`)).ok;
  } catch {
    return false;
  }
})();

if (!emuladorNoAr) {
  console.warn(
    `⚠️  Emulador do RTDB não encontrado em 127.0.0.1:${PORT}. ` +
      `Testes das regras das interações do feed pulados — rode 'npm run firebase-emulate'.`
  );
}

describe.runIf(emuladorNoAr)("regras das interações do nó post", () => {
  beforeAll(async () => {
    await comoAdmin(`users/${ADMIN}`, {
      method: "PUT",
      body: JSON.stringify({ nome: "Admin de Teste", role: "admin" }),
    });
    await comoAdmin(`users/${ALUNO}`, {
      method: "PUT",
      body: JSON.stringify({ nome: "Aluno de Teste", role: "user" }),
    });
  });

  beforeEach(async () => {
    await comoAdmin(`post/${POST}`, {
      method: "PUT",
      body: JSON.stringify({
        nome: "Vídeo de Teste",
        link: "https://www.youtube.com/watch?v=abcdefghijk",
        user: "Admin de Teste",
        uidUser: ADMIN,
      }),
    });
  });

  afterAll(async () => {
    await comoAdmin(`post/${POST}`, { method: "DELETE" });
    await comoAdmin(`users/${ADMIN}`, { method: "DELETE" });
    await comoAdmin(`users/${ALUNO}`, { method: "DELETE" });
  });

  it("o aluno curte e descurte o post", async () => {
    expect((await curte("likes", ALUNO, ALUNO)).status).toBe(200);
    expect((await descurte("likes", ALUNO, ALUNO)).status).toBe(200);

    expect((await curte("dislikes", ALUNO, ALUNO)).status).toBe(200);
    expect((await descurte("dislikes", ALUNO, ALUNO)).status).toBe(200);
  });

  it("aceita a troca de like por dislike num update multi-caminho", async () => {
    // É exatamente o que `alternarInteracao` manda: um PATCH na raiz do post com
    // as duas folhas. O banco avalia cada uma com a regra do seu dono, e é o que
    // garante que ninguém apareça curtindo e descurtindo ao mesmo tempo.
    await curte("likes", ALUNO, ALUNO);

    const troca = await comoUsuario(`post/${POST}`, ALUNO, {
      method: "PATCH",
      body: JSON.stringify({
        [`dislikes/${ALUNO}`]: curtida,
        [`likes/${ALUNO}`]: null,
      }),
    });
    expect(troca.status).toBe(200);

    const estado = await (await comoAdmin(`post/${POST}`)).json();
    expect(estado.likes).toBeUndefined();
    expect(estado.dislikes[ALUNO]).toBeTruthy();
  });

  it("nega o update multi-caminho que encosta na folha de outro", async () => {
    const resposta = await comoUsuario(`post/${POST}`, ALUNO, {
      method: "PATCH",
      body: JSON.stringify({
        [`likes/${ALUNO}`]: curtida,
        [`likes/${OUTRO_ALUNO}`]: null,
      }),
    });
    expect(resposta.status).not.toBe(200);
  });

  it("nega curtir em nome de outro", async () => {
    expect((await curte("likes", OUTRO_ALUNO, ALUNO)).status).not.toBe(200);
    expect((await curte("dislikes", OUTRO_ALUNO, ALUNO)).status).not.toBe(200);
  });

  it("nega apagar a curtida de outro", async () => {
    await curte("likes", OUTRO_ALUNO, OUTRO_ALUNO);

    expect((await descurte("likes", OUTRO_ALUNO, ALUNO)).status).not.toBe(200);
  });

  it("nega sobrescrever o mapa de curtidas inteiro", async () => {
    await curte("likes", OUTRO_ALUNO, OUTRO_ALUNO);

    const resposta = await comoUsuario(`post/${POST}/likes`, ALUNO, {
      method: "PUT",
      body: JSON.stringify({ [ALUNO]: curtida }),
    });
    expect(resposta.status).not.toBe(200);
  });

  it("nega a curtida de quem não está autenticado", async () => {
    const resposta = await fetch(`${BASE}/post/${POST}/likes/${ALUNO}.json?ns=${NS}`, {
      method: "PUT",
      body: JSON.stringify(curtida),
    });
    expect(resposta.status).not.toBe(200);
  });

  it("o aluno comenta assinando o próprio uid", async () => {
    const resposta = await comoUsuario(`post/${POST}/comentarios/c1`, ALUNO, {
      method: "PUT",
      body: JSON.stringify(comentarioDe(ALUNO)),
    });
    expect(resposta.status).toBe(200);
  });

  it("nega assinar o comentário em nome de outro", async () => {
    const resposta = await comoUsuario(`post/${POST}/comentarios/c1`, ALUNO, {
      method: "PUT",
      body: JSON.stringify(comentarioDe(OUTRO_ALUNO)),
    });
    expect(resposta.status).not.toBe(200);
  });

  it("nega o comentário vazio ou longo demais", async () => {
    const vazio = await comoUsuario(`post/${POST}/comentarios/c1`, ALUNO, {
      method: "PUT",
      body: JSON.stringify(comentarioDe(ALUNO, { comentario: "" })),
    });
    expect(vazio.status).not.toBe(200);

    const longo = await comoUsuario(`post/${POST}/comentarios/c2`, ALUNO, {
      method: "PUT",
      body: JSON.stringify(comentarioDe(ALUNO, { comentario: "a".repeat(1001) })),
    });
    expect(longo.status).not.toBe(200);
  });

  it("nega editar o comentário de outro", async () => {
    await comoAdmin(`post/${POST}/comentarios/c1`, {
      method: "PUT",
      body: JSON.stringify(comentarioDe(OUTRO_ALUNO)),
    });

    const resposta = await comoUsuario(`post/${POST}/comentarios/c1/comentario`, ALUNO, {
      method: "PUT",
      body: JSON.stringify("texto trocado"),
    });
    expect(resposta.status).not.toBe(200);
  });

  it("o aluno apaga o próprio comentário, mas não o dos outros", async () => {
    await comoAdmin(`post/${POST}/comentarios/c1`, {
      method: "PUT",
      body: JSON.stringify(comentarioDe(ALUNO)),
    });
    await comoAdmin(`post/${POST}/comentarios/c2`, {
      method: "PUT",
      body: JSON.stringify(comentarioDe(OUTRO_ALUNO)),
    });

    const proprio = await comoUsuario(`post/${POST}/comentarios/c1`, ALUNO, {
      method: "DELETE",
    });
    expect(proprio.status).toBe(200);

    const alheio = await comoUsuario(`post/${POST}/comentarios/c2`, ALUNO, {
      method: "DELETE",
    });
    expect(alheio.status).not.toBe(200);
  });

  it("o admin modera qualquer comentário", async () => {
    await comoAdmin(`post/${POST}/comentarios/c1`, {
      method: "PUT",
      body: JSON.stringify(comentarioDe(ALUNO)),
    });

    const remocao = await comoUsuario(`post/${POST}/comentarios/c1`, ADMIN, {
      method: "DELETE",
    });
    expect(remocao.status).toBe(200);
  });

  it("o corpo do post continua sendo coisa de admin", async () => {
    const doAluno = await comoUsuario(`post/${POST}/nome`, ALUNO, {
      method: "PUT",
      body: JSON.stringify("título sequestrado"),
    });
    expect(doAluno.status).not.toBe(200);

    const doAdmin = await comoUsuario(`post/${POST}/nome`, ADMIN, {
      method: "PUT",
      body: JSON.stringify("título novo"),
    });
    expect(doAdmin.status).toBe(200);
  });
});
