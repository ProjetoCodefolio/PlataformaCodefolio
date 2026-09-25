import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

/**
 * A fila de publicações pelas funções REAIS do app, sob as REGRAS do banco,
 * autenticado como um professor dono do curso que NÃO é admin.
 *
 * Os outros testes da fila rodam num namespace sem regras (o SDK sem login) ou
 * batem no REST na mão. Foi assim que dois bugs de regra passaram: a leitura
 * da fila e a exclusão de entrada inexistente eram negadas para professor
 * comum, e só quem era admin via funcionar. Aqui o caminho é o mesmo da tela.
 */

const PORT = Number(process.env.RTDB_EMULATOR_PORT || 9000);
const NS = "plataformacodefolio-default-rtdb";
const BASE = `http://127.0.0.1:${PORT}`;

const DONO = "dono_fila_sdk";
const CURSO = "curso_fila_sdk";
const ORIGEM = "curso_fila_sdk_origem";

vi.mock("../../config/firebase", async () => {
  const { initializeApp } = await import("firebase/app");
  const { getDatabase, connectDatabaseEmulator } = await import("firebase/database");
  const porta = Number(process.env.RTDB_EMULATOR_PORT || 9000);
  const app = initializeApp(
    {
      projectId: "plataformacodefolio",
      databaseURL: "https://plataformacodefolio-default-rtdb.firebaseio.com",
    },
    "publication-queue-as-teacher"
  );
  const database = getDatabase(app);
  connectDatabaseEmulator(database, "127.0.0.1", porta, {
    mockUserToken: { sub: "dono_fila_sdk", user_id: "dono_fila_sdk" },
  });
  return { database, auth: {}, analytics: {} };
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
const lerComoAdmin = async (caminho) => (await comoAdmin(caminho)).json();

const { addCourseContent, updateCourseContent, deleteCourseContent } = await import("./content");
const { addQuiz } = await import("./quizCrud");
const { syncPublicationQueueForQuiz } = await import("./publicationQueue");
const { importContentFromCourse } = await import("./contentImport");

const emDias = (dias) => new Date(Date.now() + dias * 24 * 3600 * 1000).toISOString();
const video = (extra = {}) => ({
  category: "video",
  title: "Aula",
  url: "https://www.youtube.com/watch?v=aaaaaaaaaaa",
  ...extra,
});
const filaDoCurso = async () =>
  Object.fromEntries(
    Object.entries((await lerComoAdmin("publicationQueue")) || {}).filter(([k]) =>
      k.startsWith(`${CURSO}__`)
    )
  );

const limpar = async () => {
  for (const key of Object.keys(await filaDoCurso())) {
    await comoAdmin(`publicationQueue/${key}`, { method: "DELETE" });
  }
  for (const caminho of [
    `courses/${CURSO}`,
    `courses/${ORIGEM}`,
    `courseContent/${CURSO}`,
    `courseContent/${ORIGEM}`,
    `courseQuizzes/${CURSO}`,
    `users/${DONO}`,
  ]) {
    await comoAdmin(caminho, { method: "DELETE" });
  }
};

describe.runIf(emuladorNoAr)("fila de publicações como professor comum, sob as regras", () => {
  beforeAll(async () => {
    await limpar();
    await comoAdmin(`users/${DONO}`, { method: "PUT", body: JSON.stringify({ role: "user" }) });
    await comoAdmin(`courses/${CURSO}`, {
      method: "PUT",
      body: JSON.stringify({ title: "Curso", userId: DONO }),
    });
    await comoAdmin(`courses/${ORIGEM}`, {
      method: "PUT",
      body: JSON.stringify({ title: "Origem", userId: DONO }),
    });
  });

  afterAll(limpar);

  it("programar, adiar, criar quiz, tirar o quiz, excluir conteúdo", async () => {
    const semana = emDias(7);
    const aula = await addCourseContent(CURSO, video({ publishAt: semana }));
    expect((await filaDoCurso())[`${CURSO}__content__${aula.id}`]?.publishAt).toBe(semana);

    const duas = emDias(14);
    await updateCourseContent(CURSO, aula.id, video({ publishAt: duas }));
    await addQuiz(CURSO, aula.id);
    let fila = await filaDoCurso();
    expect(fila[`${CURSO}__content__${aula.id}`].publishAt).toBe(duas);
    expect(fila[`${CURSO}__quiz__${aula.id}`].publishAt).toBe(duas);

    // Excluir o quiz pelo `removeQuiz` esbarra numa limitação ANTERIOR à fila:
    // ele lê o nó `quizResults` inteiro, que professor comum não lê. Aqui o
    // quiz sai por fora e o que se verifica é a fila acompanhando.
    await comoAdmin(`courseQuizzes/${CURSO}/${aula.id}`, { method: "DELETE" });
    await syncPublicationQueueForQuiz(CURSO, aula.id);
    expect((await filaDoCurso())[`${CURSO}__quiz__${aula.id}`]).toBeUndefined();

    await deleteCourseContent(CURSO, aula.id);
    expect(await filaDoCurso()).toEqual({});
  });

  it("importação em série: todos os itens programados entram na fila", async () => {
    const itens = Object.fromEntries(
      Array.from({ length: 10 }, (_, i) => [
        `v${i}`,
        { category: "video", title: `Semana ${i}`, url: `https://youtu.be/aaaaaaaaaa${i}`, order: i },
      ])
    );
    await comoAdmin(`courseContent/${ORIGEM}`, { method: "PUT", body: JSON.stringify(itens) });

    const { imported } = await importContentFromCourse({
      sourceCourseId: ORIGEM,
      targetCourseId: CURSO,
      selections: Object.keys(itens).map((id, i) => ({ contentId: id, publishAt: emDias(7 * (i + 1)) })),
    });

    expect(imported).toHaveLength(10);
    expect(Object.keys(await filaDoCurso())).toHaveLength(10);
  });
});
