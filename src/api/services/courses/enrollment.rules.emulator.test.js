import { describe, it, expect, beforeEach, afterAll } from "vitest";

/**
 * Teste das REGRAS do banco para o encerramento da matrícula (saída do curso e
 * remoção da turma), contra o emulador.
 *
 * Sem backend, quem grava a saída é o navegador do próprio aluno, inclusive os
 * avisos na caixa dos colegas de grupo e dos professores da turma. Por isso as
 * regras de `notifications` ganharam dois casos estreitos, e o que está sendo
 * protegido é exatamente a estreiteza deles:
 *  - a saída inteira (matrícula, grupo, avisos) passa numa escrita atômica;
 *  - o aviso ao colega só passa na MESMA escrita em que o autor deixa o grupo,
 *    e só para quem era do grupo;
 *  - o aviso de saída ao professor da turma só sai de quem tem matrícula no
 *    curso, e só para professor DAQUELE curso;
 *  - ninguém edita aviso alheio;
 *  - a remoção pelo professor da turma e a volta do aluno passam;
 *  - qualquer autenticado lê `notificationPrefs` (opt-out de quem recebe), mas
 *    só o dono das preferências as escreve.
 *
 * Fala com o namespace PADRÃO via API REST, porque é só nele que o emulador
 * aplica o database.rules.json. Precisa do emulador de pé (`npm run
 * firebase-emulate`); sem ele, os testes são pulados.
 */

const PORT = Number(process.env.RTDB_EMULATOR_PORT || 9000);
const NS = "plataformacodefolio-default-rtdb";
const BASE = `http://127.0.0.1:${PORT}`;

const CURSO = "curso_regras_saida";
const OUTRO_CURSO = "outro_curso_regras_saida";
const TRABALHO = "t1";

const DONO = "dono_regras_saida";
const ANA = "ana_regras_saida";
const EDU = "edu_regras_saida";
const BIA = "bia_regras_saida";
const PROF = "prof_regras_saida";
const PROF_DE_OUTRO = "prof_alheio_regras_saida";
const ESTRANHO = "estranho_regras_saida";

const TODOS = [DONO, ANA, EDU, BIA, PROF, PROF_DE_OUTRO, ESTRANHO];
const ENDED_AT = "2026-10-20T12:00:00.000Z";

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
  fetch(`${BASE}/${caminho}.json?ns=${NS}${uid ? `&auth=${tokenDe(uid)}` : ""}`, init);

const comoAdmin = (caminho, init = {}) =>
  fetch(`${BASE}/${caminho}.json?ns=${NS}`, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: "Bearer owner" },
  });

/** Escrita em vários caminhos de uma vez, como o `update(ref(database), ...)` do app. */
const atomica = (uid, updates) =>
  comoUsuario("", uid, { method: "PATCH", body: JSON.stringify(updates) });

const aviso = (type, extra = {}) => ({
  type,
  courseId: CURSO,
  assignmentId: "",
  groupId: "",
  quizId: "",
  title: "Aviso",
  message: "Texto pronto",
  link: "/minhas-avaliacoes",
  read: false,
  createdAt: ENDED_AT,
  ...extra,
});

const avisoDeGrupo = (extra) =>
  aviso("group_changes", { assignmentId: TRABALHO, groupId: "g1", ...extra });

const encerra = (uid, endedBy, reason) => ({
  [`studentCourses/${uid}/${CURSO}/endedAt`]: ENDED_AT,
  [`studentCourses/${uid}/${CURSO}/endedBy`]: endedBy,
  [`studentCourses/${uid}/${CURSO}/endReason`]: reason,
});

const deixaGrupo = (uid, groupId = "g1") => ({
  [`assignmentGroups/${CURSO}/${TRABALHO}/${groupId}/members/${uid}`]: null,
});

const emuladorNoAr = await (async () => {
  try {
    await fetch(`${BASE}/.json?ns=${NS}`);
    return true;
  } catch {
    return false;
  }
})();

if (!emuladorNoAr) {
  console.warn(
    `⚠️  Emulador do RTDB não encontrado em 127.0.0.1:${PORT}. ` +
      `Testes das regras da saída do curso pulados — rode 'npm run firebase-emulate'.`
  );
}

const matricula = { progress: 40, status: "in_progress", title: "Curso de Teste" };

describe.runIf(emuladorNoAr)("regras do encerramento da matrícula", () => {
  beforeEach(async () => {
    const semente = {
      [`courses/${CURSO}`]: { title: "Curso de Teste", userId: DONO },
      [`courses/${OUTRO_CURSO}`]: { title: "Outro Curso", userId: DONO },
      [`users/${PROF}`]: { nome: "Professor da turma", coursesTeacher: { [CURSO]: true } },
      [`users/${PROF_DE_OUTRO}`]: {
        nome: "Professor de outra turma",
        coursesTeacher: { [OUTRO_CURSO]: true },
      },
      [`assignmentGroups/${CURSO}/${TRABALHO}`]: {
        g1: { index: 0, members: { [ANA]: true, [EDU]: true, [PROF]: true } },
        g2: { index: 1, members: { [BIA]: true } },
      },
      [`notificationPrefs/${DONO}/${CURSO}`]: { studentLeft: false },
    };
    [ANA, EDU, BIA, PROF].forEach((uid) => {
      semente[`studentCourses/${uid}/${CURSO}`] = matricula;
    });
    TODOS.forEach((uid) => {
      semente[`notifications/${uid}`] = null;
    });
    await comoAdmin("", { method: "PATCH", body: JSON.stringify(semente) });
  });

  afterAll(async () => {
    const limpeza = {
      [`courses/${CURSO}`]: null,
      [`courses/${OUTRO_CURSO}`]: null,
      [`assignmentGroups/${CURSO}`]: null,
      [`notificationPrefs/${DONO}`]: null,
    };
    TODOS.forEach((uid) => {
      limpeza[`users/${uid}`] = null;
      limpeza[`studentCourses/${uid}`] = null;
      limpeza[`notifications/${uid}`] = null;
    });
    await comoAdmin("", { method: "PATCH", body: JSON.stringify(limpeza) });
  });

  describe("saída do aluno", () => {
    it("a saída inteira passa numa escrita só: matrícula, grupo e avisos", async () => {
      const resposta = await atomica(ANA, {
        ...encerra(ANA, ANA, "left"),
        ...deixaGrupo(ANA),
        [`notifications/${EDU}/n1`]: avisoDeGrupo(),
        [`notifications/${PROF}/n2`]: aviso("student_left"),
        [`notifications/${DONO}/n3`]: aviso("student_left"),
      });
      expect(resposta.status).toBe(200);

      const sobrou = await (await comoAdmin(`studentCourses/${ANA}/${CURSO}`)).json();
      expect(sobrou).toMatchObject({ progress: 40, endedAt: ENDED_AT, endReason: "left" });
    });

    it("aviso ao colega sem deixar o grupo na mesma escrita é recusado", async () => {
      const resposta = await atomica(ANA, {
        [`notifications/${EDU}/n1`]: avisoDeGrupo(),
      });
      expect(resposta.status).not.toBe(200);
    });

    it("aviso a quem não era do grupo derruba a escrita inteira", async () => {
      const resposta = await atomica(ANA, {
        ...encerra(ANA, ANA, "left"),
        ...deixaGrupo(ANA),
        [`notifications/${BIA}/n1`]: avisoDeGrupo(),
      });
      expect(resposta.status).not.toBe(200);

      const intacta = await (await comoAdmin(`studentCourses/${ANA}/${CURSO}`)).json();
      expect(intacta.endedAt).toBeUndefined();
    });

    it("quem não é do grupo não avisa os membros", async () => {
      const resposta = await atomica(ESTRANHO, {
        [`notifications/${EDU}/n1`]: avisoDeGrupo(),
      });
      expect(resposta.status).not.toBe(200);
    });

    it("aviso de outro tipo não usa a porta do grupo", async () => {
      const resposta = await atomica(ANA, {
        ...deixaGrupo(ANA),
        [`notifications/${EDU}/n1`]: avisoDeGrupo({ type: "new_content" }),
      });
      expect(resposta.status).not.toBe(200);
    });

    it("sem matrícula no curso, ninguém avisa o professor da turma", async () => {
      const resposta = await atomica(ESTRANHO, {
        [`notifications/${PROF}/n1`]: aviso("student_left"),
      });
      expect(resposta.status).not.toBe(200);
    });

    it("o aviso de saída não vai para professor de outro curso", async () => {
      const resposta = await atomica(ANA, {
        [`notifications/${PROF_DE_OUTRO}/n1`]: aviso("student_left"),
      });
      expect(resposta.status).not.toBe(200);
    });

    it("ninguém reescreve aviso que já existe na caixa do colega", async () => {
      await comoAdmin(`notifications/${EDU}/n1`, {
        method: "PUT",
        body: JSON.stringify(avisoDeGrupo()),
      });
      const resposta = await atomica(ANA, {
        ...deixaGrupo(ANA),
        [`notifications/${EDU}/n1`]: avisoDeGrupo({ message: "trocado" }),
      });
      expect(resposta.status).not.toBe(200);
    });
  });

  describe("saída do professor da turma", () => {
    it("sai, perde o papel e avisa o dono e o colega de grupo na mesma escrita", async () => {
      const resposta = await atomica(PROF, {
        ...encerra(PROF, PROF, "left"),
        [`users/${PROF}/coursesTeacher/${CURSO}`]: null,
        ...deixaGrupo(PROF),
        [`notifications/${EDU}/n1`]: avisoDeGrupo(),
        [`notifications/${DONO}/n2`]: aviso("student_left"),
      });
      expect(resposta.status).toBe(200);

      const papel = await (await comoAdmin(`users/${PROF}/coursesTeacher/${CURSO}`)).json();
      expect(papel).toBeNull();
    });
  });

  describe("remoção pelo professor da turma", () => {
    it("encerra a matrícula, tira do grupo e avisa o colega e o removido", async () => {
      const resposta = await atomica(PROF, {
        ...encerra(ANA, PROF, "removed"),
        ...deixaGrupo(ANA),
        [`notifications/${EDU}/n1`]: avisoDeGrupo(),
        [`notifications/${ANA}/n2`]: aviso("enrollment_changed", { link: "/cursos" }),
      });
      expect(resposta.status).toBe(200);
    });

    it("aluno não remove colega", async () => {
      const resposta = await atomica(EDU, encerra(ANA, EDU, "removed"));
      expect(resposta.status).not.toBe(200);
    });
  });

  describe("volta", () => {
    it("o próprio aluno reativa a matrícula encerrada", async () => {
      await atomica(ANA, encerra(ANA, ANA, "left"));
      const resposta = await atomica(ANA, {
        [`studentCourses/${ANA}/${CURSO}/endedAt`]: null,
        [`studentCourses/${ANA}/${CURSO}/endedBy`]: null,
        [`studentCourses/${ANA}/${CURSO}/endReason`]: null,
      });
      expect(resposta.status).toBe(200);
    });
  });

  describe("preferências de notificação", () => {
    it("qualquer autenticado lê a preferência de quem vai receber", async () => {
      const resposta = await comoUsuario(`notificationPrefs/${DONO}/${CURSO}`, ANA);
      expect(resposta.status).toBe(200);
      expect(await resposta.json()).toEqual({ studentLeft: false });
    });

    it("anônimo não lê, e só o dono das preferências escreve", async () => {
      expect((await comoUsuario(`notificationPrefs/${DONO}/${CURSO}`, null)).status).not.toBe(200);
      const escrita = await comoUsuario(`notificationPrefs/${DONO}/${CURSO}`, ANA, {
        method: "PUT",
        body: JSON.stringify({ studentLeft: true }),
      });
      expect(escrita.status).not.toBe(200);
    });
  });
});
