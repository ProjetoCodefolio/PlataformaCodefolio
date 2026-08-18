import { describe, it, expect, beforeAll, afterAll } from "vitest";

/**
 * Teste das REGRAS do banco para o nó do Quiz Gigi, contra o emulador.
 *
 * Diferente dos outros testes de emulador daqui, este fala com o namespace
 * PADRÃO (`plataformacodefolio-default-rtdb`) via API REST, porque é só nele que
 * o emulador aplica o database.rules.json — nos namespaces avulsos as regras
 * ficam abertas e nada seria verificado. A autenticação usa JWT não assinado,
 * que o emulador aceita; `Authorization: Bearer owner` é o acesso de admin do
 * emulador, usado só para preparar e limpar o cenário.
 *
 * Cobre a regressão que deixava o Quiz Gigi mudo em produção: o serviço gravava
 * em `quizGigi/courses/{courseId}/quizzes/{quizId}/...`, caminho em que os
 * curingas das regras casavam com a string literal "courses" e a checagem de
 * dono nunca era satisfeita. O professor levava PERMISSION_DENIED, o erro era
 * engolido (registerStudentAnswer só loga e devolve false) e a aula seguia com
 * a UI dando feedback de acerto sem nada ser gravado.
 *
 * Precisa do emulador de pé (`npm run firebase-emulate`). Sem ele, os testes são
 * reportados como pulados, não aprovados. Porta configurável via RTDB_EMULATOR_PORT.
 */

const PORT = Number(process.env.RTDB_EMULATOR_PORT || 9000);
const NS = "plataformacodefolio-default-rtdb";
const BASE = `http://127.0.0.1:${PORT}`;

const CURSO = "curso_regras_gigi";
const QUIZ = "quiz_regras_gigi";
const QUESTAO = "questao_regras_gigi";
const PROFESSOR = "prof_regras_gigi";
const ALUNO = "aluno_regras_gigi";

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

const escreve = (caminho, uid) =>
  comoUsuario(caminho, uid, {
    method: "PUT",
    body: JSON.stringify({ studentId: ALUNO, studentName: "Aluno de Teste" }),
  });

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
      `Testes das regras do Quiz Gigi pulados — rode 'npm run firebase-emulate'.`
  );
}

// Caminho REAL escrito por registerStudentAnswer (ver quizGigi.js).
const CAMINHO_RESPOSTA = `quizGigi/${CURSO}/${QUIZ}/results/${QUESTAO}/correctAnswers/${ALUNO}`;
// Caminho antigo, que as regras nunca cobriram.
const CAMINHO_ANTIGO = `quizGigi/courses/${CURSO}/quizzes/${QUIZ}/results/${QUESTAO}/correctAnswers/${ALUNO}`;

describe.runIf(emuladorNoAr)("regras do nó quizGigi", () => {
  beforeAll(async () => {
    await comoAdmin(`courses/${CURSO}`, {
      method: "PUT",
      body: JSON.stringify({ title: "Curso de Teste", userId: PROFESSOR }),
    });
    await comoAdmin(`quizGigi/${CURSO}`, { method: "DELETE" });
    await comoAdmin("quizGigi/courses", { method: "DELETE" });
  });

  afterAll(async () => {
    await comoAdmin(`courses/${CURSO}`, { method: "DELETE" });
    await comoAdmin(`quizGigi/${CURSO}`, { method: "DELETE" });
    await comoAdmin("quizGigi/courses", { method: "DELETE" });
  });

  it("o dono do curso registra a resposta do aluno", async () => {
    const resposta = await escreve(CAMINHO_RESPOSTA, PROFESSOR);
    expect(resposta.status).toBe(200);
  });

  it("nega o caminho antigo, que o serviço usava e as regras não cobriam", async () => {
    const resposta = await escreve(CAMINHO_ANTIGO, PROFESSOR);
    expect(resposta.status).not.toBe(200);
  });

  it("nega a escrita de quem não é dono do curso", async () => {
    const resposta = await escreve(CAMINHO_RESPOSTA, ALUNO);
    expect(resposta.status).not.toBe(200);
  });

  it("nega o aluno escrevendo direto sob o quiz", async () => {
    const resposta = await escreve(`quizGigi/${CURSO}/${QUIZ}/${ALUNO}`, ALUNO);
    expect(resposta.status).not.toBe(200);
  });

  it("permite ao dono apagar o nó do curso inteiro (cascata do deleteCourse)", async () => {
    await escreve(CAMINHO_RESPOSTA, PROFESSOR);

    const remocao = await comoUsuario(`quizGigi/${CURSO}`, PROFESSOR, {
      method: "DELETE",
    });
    expect(remocao.status).toBe(200);

    const sobrou = await (await comoAdmin(`quizGigi/${CURSO}`)).json();
    expect(sobrou).toBeNull();
  });
});
