import { describe, it, expect, beforeAll, afterAll } from "vitest";

/**
 * Teste das REGRAS DE LEITURA contra o emulador, cobrindo a remoção do
 * `.read: true` da raiz do `database.rules.json`.
 *
 * Antes, a raiz concedia leitura a QUALQUER UM (sem login) em todo o banco,
 * inclusive e-mails (`users`), notas (`courseAssessments`), respostas de quiz
 * (`quizResults`, `customQuizResults`, `liveQuizResults`) e progresso — as
 * regras mais restritas declaradas nó adentro nunca chegavam a ser avaliadas,
 * porque uma concessão em nível mais raso já resolve a leitura (cascata do
 * RTDB). Também descobriu, ao tirar a raiz, que várias coleções só tinham
 * `.read:true` no filho-curinga (ex.: `courses/$courseId`) e não no PAI —
 * suficiente para ler UM item, mas não para listar a coleção inteira, que é
 * como o catálogo, o feed e o painel do professor de fato leem.
 *
 * Fala com o namespace PADRÃO (`plataformacodefolio-default-rtdb`) via API
 * REST, porque é só nele que o emulador aplica o database.rules.json — nos
 * namespaces avulsos as regras ficam abertas e nada seria verificado.
 *
 * Precisa do emulador de pé (`npm run firebase-emulate`). Sem ele, os testes
 * são reportados como pulados, não aprovados. Porta configurável via
 * RTDB_EMULATOR_PORT.
 */

const PORT = Number(process.env.RTDB_EMULATOR_PORT || 9000);
const NS = "plataformacodefolio-default-rtdb";
const BASE = `http://127.0.0.1:${PORT}`;

const CURSO = "curso_regras_leitura_raiz";
const DONO = "dono_regras_leitura_raiz";
const ADMIN = "admin_regras_leitura_raiz";
const PROFESSOR = "prof_regras_leitura_raiz";
const ALUNO = "aluno_regras_leitura_raiz";
const OUTRO_ALUNO = "outro_aluno_regras_leitura_raiz";

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

const leAnonimo = (caminho) => fetch(`${BASE}/${caminho}.json?ns=${NS}`);

const leComo = (caminho, uid) =>
  fetch(`${BASE}/${caminho}.json?ns=${NS}&auth=${tokenDe(uid)}`);

const comoAdmin = (caminho, init = {}) =>
  fetch(`${BASE}/${caminho}.json?ns=${NS}`, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: "Bearer owner" },
  });

const emuladorNoAr = await (async () => {
  try {
    // Qualquer resposta HTTP prova que o emulador respondeu — mesmo
    // 401/403, já que a raiz nega leitura anônima por padrão. Só a exceção
    // de rede no catch abaixo indica que ele não está de pé.
    await fetch(`${BASE}/.json?ns=${NS}`);
    return true;
  } catch {
    return false;
  }
})();

if (!emuladorNoAr) {
  console.warn(
    `⚠️  Emulador do RTDB não encontrado em 127.0.0.1:${PORT}. ` +
      `Testes das regras de leitura da raiz pulados — rode 'npm run firebase-emulate'.`
  );
}

describe.runIf(emuladorNoAr)("regras de leitura após remover a raiz permissiva", () => {
  beforeAll(async () => {
    await comoAdmin(`courses/${CURSO}`, {
      method: "PUT",
      body: JSON.stringify({ title: "Curso de Teste", userId: DONO }),
    });
    await comoAdmin(`users/${ADMIN}`, {
      method: "PUT",
      body: JSON.stringify({ nome: "Admin", role: "admin" }),
    });
    await comoAdmin(`users/${PROFESSOR}`, {
      method: "PUT",
      body: JSON.stringify({ nome: "Professor", role: "teacher" }),
    });
    await comoAdmin(`users/${ALUNO}`, {
      method: "PUT",
      body: JSON.stringify({ nome: "Aluno", role: "user", email: "aluno@exemplo.org" }),
    });
    await comoAdmin(`quizResults/${ALUNO}/${CURSO}/quiz1`, {
      method: "PUT",
      body: JSON.stringify({ isPassed: true, attemptCount: 1 }),
    });
    await comoAdmin(`studentCourses/${ALUNO}/${CURSO}`, {
      method: "PUT",
      body: JSON.stringify({ progress: 50, status: "in_progress" }),
    });
  });

  afterAll(async () => {
    for (const caminho of [
      `courses/${CURSO}`,
      `users/${ADMIN}`,
      `users/${PROFESSOR}`,
      `users/${ALUNO}`,
      `quizResults/${ALUNO}`,
      `studentCourses/${ALUNO}`,
    ]) {
      await comoAdmin(caminho, { method: "DELETE" });
    }
  });

  describe("raiz", () => {
    it("nega leitura anônima do banco inteiro", async () => {
      expect((await leAnonimo("")).status).not.toBe(200);
    });
  });

  describe("users", () => {
    it("nega leitura anônima", async () => {
      expect((await leAnonimo("users")).status).not.toBe(200);
    });

    it("permite a qualquer usuário logado (a tela do professor lê o cadastro de vários alunos)", async () => {
      expect((await leComo("users", ALUNO)).status).toBe(200);
    });
  });

  describe("courses, post, tags, llmModels, courseAliases (catálogo/feed público)", () => {
    it("courses continua público mesmo em massa (catálogo)", async () => {
      expect((await leAnonimo("courses")).status).toBe(200);
    });

    it("post continua público mesmo em massa (feed)", async () => {
      expect((await leAnonimo("post")).status).toBe(200);
    });

    it("tags continua público em massa", async () => {
      expect((await leAnonimo("tags")).status).toBe(200);
    });

    it("llmModels continua público em massa", async () => {
      expect((await leAnonimo("llmModels")).status).toBe(200);
    });

    it("courseAliases continua público em massa", async () => {
      expect((await leAnonimo("courseAliases")).status).toBe(200);
    });
  });

  describe("studentCourses", () => {
    it("nega leitura anônima em massa", async () => {
      expect((await leAnonimo("studentCourses")).status).not.toBe(200);
    });

    it("permite a qualquer usuário logado ler em massa (própria lista de cursos / agregação do professor)", async () => {
      expect((await leComo("studentCourses", ALUNO)).status).toBe(200);
    });
  });

  describe("quizResults", () => {
    it("nega leitura anônima em massa", async () => {
      expect((await leAnonimo("quizResults")).status).not.toBe(200);
    });

    it("nega leitura em massa de aluno comum (sem papel de professor)", async () => {
      expect((await leComo("quizResults", ALUNO)).status).not.toBe(200);
    });

    it("permite leitura em massa a professor (role) — tela de notas/exclusão de quiz", async () => {
      expect((await leComo("quizResults", PROFESSOR)).status).toBe(200);
    });

    it("permite leitura em massa a admin", async () => {
      expect((await leComo("quizResults", ADMIN)).status).toBe(200);
    });

    it("o próprio aluno lê o resultado dele (revisão de tentativa)", async () => {
      expect((await leComo(`quizResults/${ALUNO}/${CURSO}`, ALUNO)).status).toBe(200);
    });

    it("outro aluno não lê o resultado alheio", async () => {
      expect(
        (await leComo(`quizResults/${ALUNO}/${CURSO}`, OUTRO_ALUNO)).status
      ).not.toBe(200);
    });

    it("o dono do curso lê o resultado do aluno matriculado nele", async () => {
      expect((await leComo(`quizResults/${ALUNO}/${CURSO}`, DONO)).status).toBe(200);
    });
  });

  describe("videoProgress, notifications, notificationPrefs, reports (só admin lê em massa)", () => {
    it("videoProgress: nega leitura anônima em massa", async () => {
      expect((await leAnonimo("videoProgress")).status).not.toBe(200);
    });

    it("videoProgress: nega aluno comum em massa", async () => {
      expect((await leComo("videoProgress", ALUNO)).status).not.toBe(200);
    });

    it("videoProgress: permite admin em massa (exclusão de curso)", async () => {
      expect((await leComo("videoProgress", ADMIN)).status).toBe(200);
    });

    it("videoProgress: o próprio usuário continua lendo o item específico dele", async () => {
      expect(
        (await leComo(`videoProgress/${ALUNO}`, ALUNO)).status
      ).toBe(200);
    });

    it("notifications: nega leitura anônima em massa", async () => {
      expect((await leAnonimo("notifications")).status).not.toBe(200);
    });

    it("notifications: permite admin em massa (exclusão de curso)", async () => {
      expect((await leComo("notifications", ADMIN)).status).toBe(200);
    });

    it("reports: nega leitura anônima em massa", async () => {
      expect((await leAnonimo("reports")).status).not.toBe(200);
    });

    it("reports: permite admin em massa (painel de reportes)", async () => {
      expect((await leComo("reports", ADMIN)).status).toBe(200);
    });
  });
});
