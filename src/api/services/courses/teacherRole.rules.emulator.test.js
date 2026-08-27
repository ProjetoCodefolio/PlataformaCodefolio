import { describe, it, expect, beforeAll, afterAll } from "vitest";

/**
 * Teste das REGRAS do banco para o papel de PROFESSOR DE UM CURSO, contra o
 * emulador.
 *
 * O papel mora em `users/{uid}/coursesTeacher/{courseId}`. Até aqui ele existia
 * na interface — a tela de administração do curso abria para o co-professor —
 * mas as regras só o reconheciam em quatro nós (trabalhos, grupos, entregas e
 * comentários). Nos demais a escrita era do dono do curso ou do admin global,
 * então o co-professor editava a tela e o banco recusava a gravação.
 *
 * O que está sendo protegido:
 *  - o professor daquele curso escreve nos nós de sala de aula;
 *  - professor de OUTRO curso não escreve neste — o papel é por curso, não geral;
 *  - quem não tem relação com o curso continua de fora;
 *  - e o que ficou deliberadamente fora do papel continua fora: o nó `courses`
 *    (título, apelido, PIN, arquivar) segue sendo do dono.
 *
 * Fala com o namespace PADRÃO (`plataformacodefolio-default-rtdb`) via API REST,
 * porque é só nele que o emulador aplica o database.rules.json — nos namespaces
 * avulsos as regras ficam abertas e nada seria verificado.
 *
 * Precisa do emulador de pé (`npm run firebase-emulate`). Sem ele, os testes são
 * reportados como pulados, não aprovados. Porta configurável via RTDB_EMULATOR_PORT.
 */

const PORT = Number(process.env.RTDB_EMULATOR_PORT || 9000);
const NS = "plataformacodefolio-default-rtdb";
const BASE = `http://127.0.0.1:${PORT}`;

const CURSO = "curso_regras_professor";
const OUTRO_CURSO = "outro_curso_regras_professor";

const DONO = "dono_regras_professor";
const COPROFESSOR = "coprof_regras_professor";
const PROF_DE_OUTRO = "prof_alheio_regras_professor";
const ADMIN = "admin_regras_professor";
const ESTRANHO = "estranho_regras_professor";
const ALUNO = "aluno_regras_professor";

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

const escreve = (caminho, uid, corpo) =>
  comoUsuario(caminho, uid, { method: "PUT", body: JSON.stringify(corpo) });

/**
 * Os nós de sala de aula: tudo que o professor de um curso precisa gravar para
 * tocar a turma. O caminho é o do ITEM, que é onde a aplicação escreve de fato.
 */
const NOS_DE_SALA = [
  ["conteúdo", `courseContent/${CURSO}/item1`, { category: "video", title: "Aula 1", url: "https://youtu.be/abc" }],
  ["vídeo legado", `courseVideos/${CURSO}/v1`, { title: "Aula 1", url: "https://youtu.be/abc" }],
  ["slide legado", `courseSlides/${CURSO}/s1`, { title: "Slides 1", url: "https://docs.google.com/x" }],
  ["quiz", `courseQuizzes/${CURSO}/item1`, { videoId: "item1", minPercentage: 70, questions: [] }],
  ["material extra", `courseMaterials/${CURSO}/m1`, { name: "Artigo", url: "https://exemplo.org/a" }],
  ["avaliação", `courseAssessments/${CURSO}/a1`, { name: "Prova 1", percentage: 40 }],
  ["dúvida", `courseQuestions/${CURSO}/q1`, { text: "Como funciona?", userId: ALUNO, discussed: true }],
  ["configurações avançadas", `courseAdvancedSettings/${CURSO}`, { llmModel: "modelo1" }],
  ["configurações de presença", `courseAttendanceSettings/${CURSO}`, { presencesPerVideo: 2 }],
  ["matrícula do aluno", `studentCourses/${ALUNO}/${CURSO}`, { progress: 40, status: "in_progress" }],
  ["resultado de quiz", `customQuizResults/${CURSO}/item1`, { total: 1 }],
  ["quiz ao vivo", `liveQuizResults/${CURSO}/item1`, { total: 1 }],
  ["quiz Gigi", `quizGigi/${CURSO}/item1`, { enabled: true }],
  ["correção de questão aberta", `openEndedAnswers/${CURSO}/item1/q1/${ALUNO}`, { userId: ALUNO, answer: "resposta", graded: true, grade: 8, feedback: "bom" }],
];

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
      `Testes das regras do papel de professor pulados — rode 'npm run firebase-emulate'.`
  );
}

describe.runIf(emuladorNoAr)("regras do papel de professor de um curso", () => {
  beforeAll(async () => {
    await comoAdmin(`courses/${CURSO}`, {
      method: "PUT",
      body: JSON.stringify({ title: "Curso de Teste", userId: DONO }),
    });
    await comoAdmin(`courses/${OUTRO_CURSO}`, {
      method: "PUT",
      body: JSON.stringify({ title: "Outro Curso", userId: DONO }),
    });
    await comoAdmin(`users/${ADMIN}`, {
      method: "PUT",
      body: JSON.stringify({ nome: "Admin", role: "admin" }),
    });
    await comoAdmin(`users/${COPROFESSOR}`, {
      method: "PUT",
      body: JSON.stringify({
        nome: "Co-professor",
        role: "teacher",
        coursesTeacher: { [CURSO]: true },
      }),
    });
    // Professor de verdade, mas de OUTRA turma. É ele quem prova que o papel é
    // por curso: `role: "teacher"` sozinho não abre porta nenhuma.
    await comoAdmin(`users/${PROF_DE_OUTRO}`, {
      method: "PUT",
      body: JSON.stringify({
        nome: "Professor de outra turma",
        role: "teacher",
        coursesTeacher: { [OUTRO_CURSO]: true },
      }),
    });
    await comoAdmin(`users/${ESTRANHO}`, {
      method: "PUT",
      body: JSON.stringify({ nome: "Estranho", role: "user" }),
    });
  });

  afterAll(async () => {
    for (const caminho of [
      `courses/${CURSO}`,
      `courses/${OUTRO_CURSO}`,
      `courseContent/${CURSO}`,
      `courseVideos/${CURSO}`,
      `courseSlides/${CURSO}`,
      `courseQuizzes/${CURSO}`,
      `courseMaterials/${CURSO}`,
      `courseAssessments/${CURSO}`,
      `courseQuestions/${CURSO}`,
      `courseAdvancedSettings/${CURSO}`,
      `courseAttendanceSettings/${CURSO}`,
      `studentCourses/${ALUNO}`,
      `customQuizResults/${CURSO}`,
      `liveQuizResults/${CURSO}`,
      `quizGigi/${CURSO}`,
      `openEndedAnswers/${CURSO}`,
      `users/${ADMIN}`,
      `users/${COPROFESSOR}`,
      `users/${PROF_DE_OUTRO}`,
      `users/${ESTRANHO}`,
    ]) {
      await comoAdmin(caminho, { method: "DELETE" });
    }
  });

  describe.each(NOS_DE_SALA)("%s", (_nome, caminho, corpo) => {
    it("o professor daquele curso escreve", async () => {
      expect((await escreve(caminho, COPROFESSOR, corpo)).status).toBe(200);
    });

    it("o dono do curso escreve", async () => {
      expect((await escreve(caminho, DONO, corpo)).status).toBe(200);
    });

    it("o admin escreve", async () => {
      expect((await escreve(caminho, ADMIN, corpo)).status).toBe(200);
    });

    it("nega o professor de outro curso", async () => {
      expect((await escreve(caminho, PROF_DE_OUTRO, corpo)).status).not.toBe(200);
    });

    it("nega quem não tem relação com o curso", async () => {
      expect((await escreve(caminho, ESTRANHO, corpo)).status).not.toBe(200);
    });
  });

  describe("o que continua fora do papel", () => {
    it("o professor não mexe no cadastro do curso — apelido, PIN e arquivar são do dono", async () => {
      const curso = { title: "Renomeado pelo professor", userId: DONO };
      expect((await escreve(`courses/${CURSO}`, COPROFESSOR, curso)).status).not.toBe(200);
      expect((await escreve(`courses/${CURSO}`, DONO, curso)).status).toBe(200);
    });

    it("o professor não escreve no cadastro de outro usuário", async () => {
      const resposta = await escreve(`users/${ALUNO}`, COPROFESSOR, { nome: "Renomeado" });
      expect(resposta.status).not.toBe(200);
    });
  });

  describe("o aluno continua dono dos próprios dados", () => {
    it("escreve a própria matrícula", async () => {
      const resposta = await escreve(`studentCourses/${ALUNO}/${CURSO}`, ALUNO, {
        progress: 10,
        status: "in_progress",
      });
      expect(resposta.status).toBe(200);
    });

    it("não escreve a matrícula de outro aluno", async () => {
      const resposta = await escreve(`studentCourses/${ALUNO}/${CURSO}`, ESTRANHO, {
        progress: 100,
        status: "completed",
      });
      expect(resposta.status).not.toBe(200);
    });
  });
});
