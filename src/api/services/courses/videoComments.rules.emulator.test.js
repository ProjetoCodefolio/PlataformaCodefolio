import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";

/**
 * Teste das REGRAS do banco para os comentários de um conteúdo, contra o
 * emulador.
 *
 * Fala com o namespace PADRÃO (`plataformacodefolio-default-rtdb`) via API REST,
 * porque é só nele que o emulador aplica o database.rules.json — nos namespaces
 * avulsos as regras ficam abertas e nada seria verificado. A autenticação usa
 * JWT não assinado, que o emulador aceita; `Authorization: Bearer owner` é o
 * acesso de admin do emulador, usado só para preparar e limpar o cenário.
 *
 * O que está sendo protegido:
 *  - qualquer aluno logado comenta, mas só em nome PRÓPRIO;
 *  - ele edita e apaga o que é dele, e não o dos outros — nem consegue trocar a
 *    autoria de um comentário que já existe para se passar por outra pessoa;
 *  - o dono do curso, o professor daquele curso e o admin moderam qualquer um;
 *  - comentário vazio ou longo demais não entra;
 *  - visitante sem login não escreve.
 *
 * Precisa do emulador de pé (`npm run firebase-emulate`). Sem ele, os testes são
 * reportados como pulados, não aprovados. Porta configurável via RTDB_EMULATOR_PORT.
 */

const PORT = Number(process.env.RTDB_EMULATOR_PORT || 9000);
const NS = "plataformacodefolio-default-rtdb";
const BASE = `http://127.0.0.1:${PORT}`;

const CURSO = "curso_regras_comentarios";
const CONTEUDO = "aula1";
const PROFESSOR = "prof_regras_comentarios";
const COPROFESSOR = "coprof_regras_comentarios";
const ADMIN = "admin_regras_comentarios";
const ALUNO = "aluno_regras_comentarios";
const OUTRO_ALUNO = "outro_aluno_regras_comentarios";

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

const comentarioDe = (uid, extras = {}) => ({
  text: "No minuto 4:20 ficou claro pra mim",
  userId: uid,
  userName: "Aluno de Teste",
  userPhotoURL: "",
  createdAt: "2026-08-20T12:00:00.000Z",
  parentId: null,
  ...extras,
});

const caminho = (commentId) =>
  `courseVideoComments/${CURSO}/${CONTEUDO}/${commentId}`;

const escreve = (commentId, uid, corpo) =>
  comoUsuario(caminho(commentId), uid, { method: "PUT", body: JSON.stringify(corpo) });

const apaga = (commentId, uid) =>
  comoUsuario(caminho(commentId), uid, { method: "DELETE" });

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
      `Testes das regras dos comentários pulados — rode 'npm run firebase-emulate'.`
  );
}

describe.runIf(emuladorNoAr)("regras do nó courseVideoComments", () => {
  beforeAll(async () => {
    await comoAdmin(`courses/${CURSO}`, {
      method: "PUT",
      body: JSON.stringify({ title: "Curso de Teste", userId: PROFESSOR }),
    });
    await comoAdmin(`users/${ADMIN}`, {
      method: "PUT",
      body: JSON.stringify({ nome: "Admin", role: "admin" }),
    });
    await comoAdmin(`users/${COPROFESSOR}`, {
      method: "PUT",
      body: JSON.stringify({ nome: "Co-professor", role: "teacher", coursesTeacher: { [CURSO]: true } }),
    });
  });

  beforeEach(async () => {
    await comoAdmin(`courseVideoComments/${CURSO}`, { method: "DELETE" });
  });

  afterAll(async () => {
    await comoAdmin(`courses/${CURSO}`, { method: "DELETE" });
    await comoAdmin(`courseVideoComments/${CURSO}`, { method: "DELETE" });
    await comoAdmin(`users/${ADMIN}`, { method: "DELETE" });
    await comoAdmin(`users/${COPROFESSOR}`, { method: "DELETE" });
  });

  it("o aluno comenta em nome próprio", async () => {
    expect((await escreve("c1", ALUNO, comentarioDe(ALUNO))).status).toBe(200);
  });

  it("nega comentar em nome de outro", async () => {
    expect((await escreve("c1", ALUNO, comentarioDe(OUTRO_ALUNO))).status).not.toBe(200);
  });

  it("nega o comentário de quem não está autenticado", async () => {
    const resposta = await fetch(`${BASE}/${caminho("c1")}.json?ns=${NS}`, {
      method: "PUT",
      body: JSON.stringify(comentarioDe(ALUNO)),
    });
    expect(resposta.status).not.toBe(200);
  });

  it("nega comentário vazio ou longo demais", async () => {
    expect(
      (await escreve("c1", ALUNO, comentarioDe(ALUNO, { text: "" }))).status
    ).not.toBe(200);
    expect(
      (await escreve("c2", ALUNO, comentarioDe(ALUNO, { text: "a".repeat(1001) }))).status
    ).not.toBe(200);
  });

  it("o aluno edita o próprio texto", async () => {
    await escreve("c1", ALUNO, comentarioDe(ALUNO));

    const edicao = await comoUsuario(`${caminho("c1")}/text`, ALUNO, {
      method: "PUT",
      body: JSON.stringify("texto corrigido"),
    });
    expect(edicao.status).toBe(200);
  });

  it("nega sequestrar a autoria de um comentário existente", async () => {
    // Sem a validação que amarra o userId ao que já estava gravado, o autor
    // poderia reescrever o próprio comentário em nome de outra pessoa.
    await escreve("c1", ALUNO, comentarioDe(ALUNO));

    const sequestro = await escreve("c1", ALUNO, comentarioDe(OUTRO_ALUNO));
    expect(sequestro.status).not.toBe(200);
  });

  it("nega editar o comentário de outro aluno", async () => {
    await comoAdmin(caminho("c1"), {
      method: "PUT",
      body: JSON.stringify(comentarioDe(OUTRO_ALUNO)),
    });

    const edicao = await comoUsuario(`${caminho("c1")}/text`, ALUNO, {
      method: "PUT",
      body: JSON.stringify("texto trocado"),
    });
    expect(edicao.status).not.toBe(200);
  });

  it("o aluno apaga o próprio comentário, mas não o dos outros", async () => {
    await escreve("c1", ALUNO, comentarioDe(ALUNO));
    await comoAdmin(caminho("c2"), {
      method: "PUT",
      body: JSON.stringify(comentarioDe(OUTRO_ALUNO)),
    });

    expect((await apaga("c1", ALUNO)).status).toBe(200);
    expect((await apaga("c2", ALUNO)).status).not.toBe(200);
  });

  it("dono do curso, professor do curso e admin moderam", async () => {
    const semear = async (id) =>
      comoAdmin(caminho(id), {
        method: "PUT",
        body: JSON.stringify(comentarioDe(ALUNO)),
      });

    await semear("c1");
    expect((await apaga("c1", PROFESSOR)).status).toBe(200);

    await semear("c2");
    expect((await apaga("c2", COPROFESSOR)).status).toBe(200);

    await semear("c3");
    expect((await apaga("c3", ADMIN)).status).toBe(200);
  });

  it("professor de OUTRO curso não modera este", async () => {
    await comoAdmin(`users/${OUTRO_ALUNO}`, {
      method: "PUT",
      body: JSON.stringify({ nome: "Prof de outro curso", coursesTeacher: { outro_curso: true } }),
    });
    await comoAdmin(caminho("c1"), {
      method: "PUT",
      body: JSON.stringify(comentarioDe(ALUNO)),
    });

    expect((await apaga("c1", OUTRO_ALUNO)).status).not.toBe(200);

    await comoAdmin(`users/${OUTRO_ALUNO}`, { method: "DELETE" });
  });

  it("a resposta segue as mesmas regras da raiz", async () => {
    await escreve("c1", ALUNO, comentarioDe(ALUNO));

    const resposta = await escreve(
      "r1",
      OUTRO_ALUNO,
      comentarioDe(OUTRO_ALUNO, { text: "Também achei", parentId: "c1" })
    );
    expect(resposta.status).toBe(200);

    // E o dono da raiz não pode apagar a resposta de outra pessoa.
    expect((await apaga("r1", ALUNO)).status).not.toBe(200);
  });

  it("qualquer pessoa lê os comentários", async () => {
    await escreve("c1", ALUNO, comentarioDe(ALUNO));

    const leitura = await fetch(
      `${BASE}/courseVideoComments/${CURSO}/${CONTEUDO}.json?ns=${NS}`
    );
    expect(leitura.status).toBe(200);
    expect((await leitura.json()).c1.text).toBeTruthy();
  });
});
