import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";

/**
 * Excluir quiz (removeQuiz) pelas funções REAIS do app, sob as REGRAS do
 * banco, como dono do curso e como co-professor da turma.
 *
 * O removeQuiz apaga, de uma vez, o quiz, os resultados de cada aluno, as
 * respostas abertas, o Gigi, o vínculo com slides e a entrada da fila de
 * publicações. Se UM desses caminhos for negado, a exclusão inteira falha. Foi
 * o que acontecia com o co-professor: o resultado do aluno só podia ser
 * apagado pelo dono e pelo admin.
 */

const PORT = Number(process.env.RTDB_EMULATOR_PORT || 9000);
const NS = "plataformacodefolio-default-rtdb";
const BASE = `http://127.0.0.1:${PORT}`;

const CURSO = "curso_remove_quiz_sdk";
const DONO = "dono_remove_quiz_sdk";
const COPROFESSOR = "coprof_remove_quiz_sdk";
const ALUNO = "aluno_remove_quiz_sdk";

vi.mock("../../config/firebase", async () => {
  const { initializeApp } = await import("firebase/app");
  const { getDatabase, connectDatabaseEmulator } = await import("firebase/database");
  const porta = Number(process.env.RTDB_EMULATOR_PORT || 9000);
  const bancoDe = (uid) => {
    const app = initializeApp(
      {
        projectId: "plataformacodefolio",
        databaseURL: "https://plataformacodefolio-default-rtdb.firebaseio.com",
      },
      `remove-quiz-${uid}`
    );
    const database = getDatabase(app);
    connectDatabaseEmulator(database, "127.0.0.1", porta, {
      mockUserToken: { sub: uid, user_id: uid },
    });
    return database;
  };
  const bancos = {
    dono_remove_quiz_sdk: bancoDe("dono_remove_quiz_sdk"),
    coprof_remove_quiz_sdk: bancoDe("coprof_remove_quiz_sdk"),
  };
  // O teste escolhe quem está logado antes de chamar o serviço.
  return {
    get database() {
      return bancos[globalThis.__usuarioRemoveQuiz];
    },
    auth: {},
    analytics: {},
  };
});

const emuladorNoAr = await (async () => {
  try {
    await fetch(`${BASE}/.json?ns=${NS}`);
    return true;
  } catch {
    return false;
  }
})();

const comoAdmin = (caminho, init = {}) =>
  fetch(`${BASE}/${caminho}.json?ns=${NS}`, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: "Bearer owner" },
  });
const ler = async (caminho) => (await comoAdmin(caminho)).json();

const { removeQuiz } = await import("./quizCrud");

const limpar = async () => {
  for (const caminho of [
    `courses/${CURSO}`,
    `users/${DONO}`,
    `users/${COPROFESSOR}`,
    `courseQuizzes/${CURSO}`,
    `courseSlides/${CURSO}`,
    `openEndedAnswers/${CURSO}`,
    `quizResults/${ALUNO}`,
  ]) {
    await comoAdmin(caminho, { method: "DELETE" });
  }
};

describe.runIf(emuladorNoAr)("excluir quiz sob as regras", () => {
  beforeEach(async () => {
    await limpar();
    await comoAdmin(`courses/${CURSO}`, {
      method: "PUT",
      body: JSON.stringify({ title: "Curso", userId: DONO }),
    });
    await comoAdmin(`users/${DONO}`, { method: "PUT", body: JSON.stringify({ role: "teacher" }) });
    await comoAdmin(`users/${COPROFESSOR}`, {
      method: "PUT",
      body: JSON.stringify({ role: "teacher", coursesTeacher: { [CURSO]: true } }),
    });
    await comoAdmin(`courseQuizzes/${CURSO}/q1`, {
      method: "PUT",
      body: JSON.stringify({ videoId: "q1", questions: [] }),
    });
    await comoAdmin(`quizResults/${ALUNO}/${CURSO}/q1`, {
      method: "PUT",
      body: JSON.stringify({ isPassed: true, attemptCount: 1 }),
    });
    await comoAdmin(`openEndedAnswers/${CURSO}/q1`, {
      method: "PUT",
      body: JSON.stringify({ pergunta: { [ALUNO]: { answer: "x" } } }),
    });
    await comoAdmin(`courseSlides/${CURSO}/s1`, {
      method: "PUT",
      body: JSON.stringify({ title: "Slide", url: "https://x", quizId: "q1" }),
    });
  });

  afterAll(limpar);

  it.each([
    ["dono do curso", DONO],
    ["co-professor da turma", COPROFESSOR],
  ])("%s exclui o quiz e tudo que depende dele", async (_, uid) => {
    globalThis.__usuarioRemoveQuiz = uid;

    await removeQuiz(CURSO, "q1");

    expect(await ler(`courseQuizzes/${CURSO}/q1`)).toBeNull();
    expect(await ler(`quizResults/${ALUNO}/${CURSO}/q1`)).toBeNull();
    expect(await ler(`openEndedAnswers/${CURSO}/q1`)).toBeNull();
    expect(await ler(`courseSlides/${CURSO}/s1/quizId`)).toBeNull();
  });
});
