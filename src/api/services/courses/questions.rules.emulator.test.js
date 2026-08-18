import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";

/**
 * Teste das REGRAS do banco para as dúvidas dos alunos, contra o emulador.
 *
 * Fala com o namespace PADRÃO (`plataformacodefolio-default-rtdb`) via API REST,
 * porque é só nele que o emulador aplica o database.rules.json — nos namespaces
 * avulsos as regras ficam abertas e nada seria verificado. A autenticação usa
 * JWT não assinado, que o emulador aceita; `Authorization: Bearer owner` é o
 * acesso de admin do emulador, usado só para preparar e limpar o cenário.
 *
 * O que está sendo protegido:
 *  - o aluno registra a PRÓPRIA dúvida e não consegue assinar em nome de outro;
 *  - ele apaga a própria dúvida enquanto ela não foi discutida, mas não a de
 *    ninguém mais — e nem pode marcar a sua como discutida para se safar disso;
 *  - o professor (dono) faz tudo, inclusive a cascata da exclusão do curso;
 *  - a notificação de nova dúvida sai do ALUNO para a caixa do professor, algo
 *    que a regra de `notifications` não permitia antes desta funcionalidade
 *    (só o dono do curso podia escrever na caixa dos outros).
 *
 * Precisa do emulador de pé (`npm run firebase-emulate`). Sem ele, os testes são
 * reportados como pulados, não aprovados. Porta configurável via RTDB_EMULATOR_PORT.
 */

const PORT = Number(process.env.RTDB_EMULATOR_PORT || 9000);
const NS = "plataformacodefolio-default-rtdb";
const BASE = `http://127.0.0.1:${PORT}`;

const CURSO = "curso_regras_duvidas";
const PROFESSOR = "prof_regras_duvidas";
const ALUNO = "aluno_regras_duvidas";
const OUTRO_ALUNO = "outro_aluno_regras_duvidas";

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

const duvidaDe = (uid, extras = {}) => ({
  contentId: "aula1",
  contentTitle: "Aula 1",
  text: "Como funciona?",
  userId: uid,
  userName: "Aluno de Teste",
  userPhotoURL: "",
  createdAt: "2026-08-18T12:00:00.000Z",
  discussed: false,
  discussedAt: null,
  ...extras,
});

const escreveDuvida = (questionId, uid, corpo) =>
  comoUsuario(`courseQuestions/${CURSO}/${questionId}`, uid, {
    method: "PUT",
    body: JSON.stringify(corpo),
  });

const apagaDuvida = (questionId, uid) =>
  comoUsuario(`courseQuestions/${CURSO}/${questionId}`, uid, { method: "DELETE" });

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
      `Testes das regras das dúvidas pulados — rode 'npm run firebase-emulate'.`
  );
}

describe.runIf(emuladorNoAr)("regras do nó courseQuestions", () => {
  beforeAll(async () => {
    await comoAdmin(`courses/${CURSO}`, {
      method: "PUT",
      body: JSON.stringify({ title: "Curso de Teste", userId: PROFESSOR }),
    });
  });

  beforeEach(async () => {
    await comoAdmin(`courseQuestions/${CURSO}`, { method: "DELETE" });
    await comoAdmin(`notifications/${PROFESSOR}`, { method: "DELETE" });
  });

  afterAll(async () => {
    await comoAdmin(`courses/${CURSO}`, { method: "DELETE" });
    await comoAdmin(`courseQuestions/${CURSO}`, { method: "DELETE" });
    await comoAdmin(`notifications/${PROFESSOR}`, { method: "DELETE" });
  });

  it("o aluno registra a própria dúvida", async () => {
    const resposta = await escreveDuvida("d1", ALUNO, duvidaDe(ALUNO));
    expect(resposta.status).toBe(200);
  });

  it("nega assinar a dúvida em nome de outro aluno", async () => {
    const resposta = await escreveDuvida("d1", ALUNO, duvidaDe(OUTRO_ALUNO));
    expect(resposta.status).not.toBe(200);
  });

  it("nega o registro de quem não está autenticado", async () => {
    const resposta = await fetch(`${BASE}/courseQuestions/${CURSO}/d1.json?ns=${NS}`, {
      method: "PUT",
      body: JSON.stringify(duvidaDe(ALUNO)),
    });
    expect(resposta.status).not.toBe(200);
  });

  it("o aluno apaga a própria dúvida ainda não discutida", async () => {
    await escreveDuvida("d1", ALUNO, duvidaDe(ALUNO));

    const remocao = await apagaDuvida("d1", ALUNO);
    expect(remocao.status).toBe(200);
  });

  it("nega o aluno apagar a dúvida de outro", async () => {
    await escreveDuvida("d1", OUTRO_ALUNO, duvidaDe(OUTRO_ALUNO));

    const remocao = await apagaDuvida("d1", ALUNO);
    expect(remocao.status).not.toBe(200);
  });

  it("nega o aluno apagar a própria dúvida depois de discutida", async () => {
    await comoAdmin(`courseQuestions/${CURSO}/d1`, {
      method: "PUT",
      body: JSON.stringify(duvidaDe(ALUNO, { discussed: true })),
    });

    const remocao = await apagaDuvida("d1", ALUNO);
    expect(remocao.status).not.toBe(200);
  });

  it("nega o aluno marcar a própria dúvida como discutida", async () => {
    await escreveDuvida("d1", ALUNO, duvidaDe(ALUNO));

    const alteracao = await comoUsuario(
      `courseQuestions/${CURSO}/d1/discussed`,
      ALUNO,
      { method: "PUT", body: JSON.stringify(true) }
    );
    expect(alteracao.status).not.toBe(200);
  });

  it("o dono do curso marca como discutida e apaga qualquer dúvida", async () => {
    await escreveDuvida("d1", ALUNO, duvidaDe(ALUNO));

    const marcacao = await comoUsuario(
      `courseQuestions/${CURSO}/d1/discussed`,
      PROFESSOR,
      { method: "PUT", body: JSON.stringify(true) }
    );
    expect(marcacao.status).toBe(200);

    const remocao = await apagaDuvida("d1", PROFESSOR);
    expect(remocao.status).toBe(200);
  });

  it("permite ao dono apagar o nó do curso inteiro (cascata do deleteCourse)", async () => {
    await escreveDuvida("d1", ALUNO, duvidaDe(ALUNO));

    const remocao = await comoUsuario(`courseQuestions/${CURSO}`, PROFESSOR, {
      method: "DELETE",
    });
    expect(remocao.status).toBe(200);

    const sobrou = await (await comoAdmin(`courseQuestions/${CURSO}`)).json();
    expect(sobrou).toBeNull();
  });

  it("o aluno avisa o professor da nova dúvida na caixa dele", async () => {
    const resposta = await comoUsuario(
      `notifications/${PROFESSOR}/n1`,
      ALUNO,
      {
        method: "PUT",
        body: JSON.stringify({
          type: "new_question",
          courseId: CURSO,
          title: "Nova dúvida de aluno",
          message: "Aula 1: Como funciona?",
          link: `/adm-cursos?courseId=${CURSO}&tab=6`,
          read: false,
          createdAt: "2026-08-18T12:00:00.000Z",
        }),
      }
    );
    expect(resposta.status).toBe(200);
  });

  it("nega o aluno escrever na caixa de quem não é dono do curso citado", async () => {
    const resposta = await comoUsuario(
      `notifications/${OUTRO_ALUNO}/n1`,
      ALUNO,
      {
        method: "PUT",
        body: JSON.stringify({
          type: "new_question",
          courseId: CURSO,
          title: "Notificação indevida",
          message: "spam",
          read: false,
          createdAt: "2026-08-18T12:00:00.000Z",
        }),
      }
    );
    expect(resposta.status).not.toBe(200);
  });
});
