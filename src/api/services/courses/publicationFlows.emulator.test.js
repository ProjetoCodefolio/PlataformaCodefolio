import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { ref, set, get } from "firebase/database";

/**
 * Fluxos "malucos" da publicação programada, de ponta a ponta, contra o
 * emulador: as funções que as telas chamam gravam o item e mantêm a fila, e o
 * mesmo processamento do cron (emailWorker/src/publications.js) roda em
 * horários simulados.
 *
 * A regra de ouro verificada em todos: na hora da publicação a turma recebe
 * o que receberia se o professor cadastrasse o item naquele momento, uma vez
 * só, e nada antes.
 */

const PORT = Number(process.env.RTDB_EMULATOR_PORT || 9000);
const NS = "plataformacodefolio";
const CURSO = "curso_fluxos_publicacao";
const ORIGEM = "curso_fluxos_origem";
const ALUNA = "aluna_fluxos_publicacao";
const NOVATO = "novato_fluxos_publicacao";

vi.mock("../../config/firebase", async () => {
  const { initializeApp } = await import("firebase/app");
  const { getDatabase } = await import("firebase/database");
  const porta = Number(process.env.RTDB_EMULATOR_PORT || 9000);
  const app = initializeApp(
    { databaseURL: `http://127.0.0.1:${porta}?ns=plataformacodefolio` },
    "publication-flows-emulator-test"
  );
  return { database: getDatabase(app), auth: {}, analytics: {} };
});

const emuladorNoAr = await (async () => {
  try {
    return (await fetch(`http://127.0.0.1:${PORT}/.json?ns=${NS}`)).ok;
  } catch {
    return false;
  }
})();

const { addCourseContent, updateCourseContent, deleteCourseContent } = await import("./content");
const { updateCourseSlide } = await import("./slides");
const { addQuiz, updateQuizPublishAt } = await import("./quizCrud");
const { importContentFromCourse } = await import("./contentImport");
const { database } = await import("../../config/firebase");
const { createDb } = await import("../../../../emailWorker/src/firebaseRest.js");
const { processDuePublications } = await import("../../../../emailWorker/src/publications.js");

// O namespace avulso não tem o `.indexOn` da fila (as regras só valem no
// padrão), então a consulta por data é feita em memória aqui. O resto é o
// REST de verdade.
const restDb = createDb({
  databaseUrl: `http://127.0.0.1:${PORT}?ns=${NS}`,
  getAuthHeader: async () => "Bearer owner",
});
const db = {
  ...restDb,
  async get(path, params) {
    if (path !== "publicationQueue" || !params?.endAt) return restDb.get(path, params);
    const limite = JSON.parse(params.endAt);
    const tudo = (await restDb.get(path)) || {};
    return Object.fromEntries(Object.entries(tudo).filter(([, e]) => e.publishAt <= limite));
  },
};

const DIA = 24 * 3600 * 1000;
const emDias = (dias) => new Date(Date.now() + dias * DIA).toISOString();
const depoisDe = (iso, minutos = 1) => new Date(new Date(iso).getTime() + minutos * 60000);

let emails;
const cron = (now) =>
  processDuePublications({
    db,
    now,
    enqueueEmail: async (job) => emails.push(job),
    only: (key) => key.startsWith(`${CURSO}__`),
  });

const avisosDe = async (uid) =>
  Object.values((await get(ref(database, `notifications/${uid}`))).val() || {});
const fila = async () =>
  Object.fromEntries(
    Object.entries((await get(ref(database, "publicationQueue"))).val() || {}).filter(([k]) =>
      k.startsWith(`${CURSO}__`)
    )
  );

const video = (extra = {}) => ({
  category: "video",
  title: "Aula",
  url: "https://www.youtube.com/watch?v=aaaaaaaaaaa",
  ...extra,
});

const limpar = async () => {
  for (const key of Object.keys(await fila())) {
    await set(ref(database, `publicationQueue/${key}`), null);
  }
  for (const no of ["courseContent", "courseVideos", "courseSlides", "courseQuizzes"]) {
    await set(ref(database, `${no}/${CURSO}`), null);
    await set(ref(database, `${no}/${ORIGEM}`), null);
  }
  for (const uid of [ALUNA, NOVATO]) {
    await set(ref(database, `notifications/${uid}`), null);
    await set(ref(database, `studentCourses/${uid}`), null);
    await set(ref(database, `users/${uid}`), null);
  }
  await set(ref(database, `courses/${CURSO}`), null);
};

describe.runIf(emuladorNoAr)("fluxos da publicação programada, de ponta a ponta", () => {
  beforeEach(async () => {
    await limpar();
    emails = [];
    await set(ref(database, `courses/${CURSO}`), { title: "Figma", userId: "dono" });
    await set(ref(database, `studentCourses/${ALUNA}/${CURSO}`), { progress: 0 });
    await set(ref(database, `users/${ALUNA}`), { email: "aluna@teste.com", displayName: "Aluna" });
  });

  afterAll(limpar);

  it("slide legado com quiz: avisa com o id do slide no link, sem o prefixo", async () => {
    const semana = emDias(7);
    await set(ref(database, `courseSlides/${CURSO}/s1`), {
      title: "Slides 1",
      url: "https://docs.google.com/presentation/d/x",
      order: 0,
    });
    await set(ref(database, `courseQuizzes/${CURSO}/slide_s1`), {
      videoId: "slide_s1",
      questions: [],
    });
    await updateCourseSlide(CURSO, "s1", {
      title: "Slides 1",
      url: "https://docs.google.com/presentation/d/x",
      publishAt: semana,
    });

    expect(Object.keys(await fila()).sort()).toEqual([
      `${CURSO}__content__s1`,
      `${CURSO}__quiz__slide_s1`,
    ]);

    await cron(depoisDe(semana));
    const avisos = await avisosDe(ALUNA);
    expect(avisos.map((a) => a.title).sort()).toEqual(["Novo quiz publicado", "Novo slide publicado"]);
    expect(avisos.every((a) => a.link === `/classes?courseId=${CURSO}&videoId=s1`)).toBe(true);
    expect(emails).toHaveLength(1);
    expect(await fila()).toEqual({});
  });

  it("quiz com data própria depois do vídeo: cada aviso sai na sua hora", async () => {
    const semana = emDias(7);
    const duasSemanas = emDias(14);
    const aula = await addCourseContent(CURSO, video({ publishAt: semana }));
    await addQuiz(CURSO, aula.id);
    await updateQuizPublishAt(CURSO, aula.id, duasSemanas);

    await cron(depoisDe(semana));
    expect((await avisosDe(ALUNA)).map((a) => a.title)).toEqual(["Novo vídeo publicado"]);
    expect(emails).toHaveLength(0);

    await cron(depoisDe(duasSemanas));
    expect((await avisosDe(ALUNA)).map((a) => a.title).sort()).toEqual([
      "Novo quiz publicado",
      "Novo vídeo publicado",
    ]);
    expect(emails).toHaveLength(1);
  });

  it("nada sai antes da hora, e rodar o cron de novo não repete aviso", async () => {
    const semana = emDias(7);
    await addCourseContent(CURSO, video({ publishAt: semana }));

    await cron(new Date(new Date(semana).getTime() - 60000));
    expect(await avisosDe(ALUNA)).toHaveLength(0);

    await cron(depoisDe(semana));
    await cron(depoisDe(semana, 5));
    await cron(depoisDe(semana, 10));
    expect(await avisosDe(ALUNA)).toHaveLength(1);
  });

  it("importação em série: cada item e o quiz dele saem na semana certa", async () => {
    await set(ref(database, `courseContent/${ORIGEM}`), {
      a: { category: "video", title: "Semana 1", url: "https://youtu.be/aaaaaaaaaaa", order: 0 },
      b: { category: "video", title: "Semana 2", url: "https://youtu.be/bbbbbbbbbbb", order: 1 },
    });
    await set(ref(database, `courseQuizzes/${ORIGEM}/b`), {
      videoId: "b",
      questions: [{ id: "q1", question: "?", options: ["a", "b"], correctOption: 0 }],
    });
    const s1 = emDias(7);
    const s2 = emDias(14);
    await importContentFromCourse({
      sourceCourseId: ORIGEM,
      targetCourseId: CURSO,
      selections: [
        { contentId: "a", publishAt: s1 },
        { contentId: "b", withQuiz: true, publishAt: s2 },
      ],
    });
    expect(Object.keys(await fila())).toHaveLength(3);

    await cron(depoisDe(s1));
    expect((await avisosDe(ALUNA)).map((a) => a.message)).toEqual(["Semana 1"]);

    await cron(depoisDe(s2));
    const titulos = (await avisosDe(ALUNA)).map((a) => a.title).sort();
    expect(titulos).toEqual(["Novo quiz publicado", "Novo vídeo publicado", "Novo vídeo publicado"]);
    expect(emails.map((e) => e.itemTitle)).toEqual(["Semana 2"]);
  });

  it("antecipar o vídeo mantendo o quiz na data antiga", async () => {
    const duasSemanas = emDias(14);
    const semana = emDias(7);
    const aula = await addCourseContent(CURSO, video({ publishAt: duasSemanas }));
    await addQuiz(CURSO, aula.id);

    // O que o modal faz com "Manter o quiz em ...".
    await updateCourseContent(CURSO, aula.id, video({ publishAt: semana }));
    await updateQuizPublishAt(CURSO, aula.id, duasSemanas);

    const f = await fila();
    expect(f[`${CURSO}__content__${aula.id}`].publishAt).toBe(semana);
    expect(f[`${CURSO}__quiz__${aula.id}`].publishAt).toBe(duasSemanas);
  });

  it("publicar agora avisa no próximo ciclo; reprogramar depois volta a avisar", async () => {
    const aula = await addCourseContent(CURSO, video({ publishAt: emDias(7) }));
    await updateCourseContent(CURSO, aula.id, video({ publishAt: "" }));

    await cron(new Date());
    expect(await avisosDe(ALUNA)).toHaveLength(1);
    expect(await fila()).toEqual({});

    // Escondido de novo e republicado: a turma é avisada de novo, como se
    // fosse um cadastro novo.
    const semana = emDias(7);
    await updateCourseContent(CURSO, aula.id, video({ publishAt: semana }));
    await cron(depoisDe(semana));
    expect(await avisosDe(ALUNA)).toHaveLength(2);
  });

  it("item excluído antes da hora não avisa ninguém", async () => {
    const semana = emDias(7);
    const aula = await addCourseContent(CURSO, video({ publishAt: semana }));
    await deleteCourseContent(CURSO, aula.id);

    await cron(depoisDe(semana));
    expect(await avisosDe(ALUNA)).toHaveLength(0);
    expect(await fila()).toEqual({});
  });

  it("vale a turma do dia da publicação: quem entrou depois recebe, quem virou professor não", async () => {
    const semana = emDias(7);
    await addCourseContent(CURSO, video({ publishAt: semana }));

    await set(ref(database, `studentCourses/${NOVATO}/${CURSO}`), { progress: 0 });
    await set(ref(database, `users/${NOVATO}`), { email: "novato@teste.com" });
    await set(ref(database, `users/${ALUNA}/coursesTeacher/${CURSO}`), true);

    await cron(depoisDe(semana));
    expect(await avisosDe(NOVATO)).toHaveLength(1);
    expect(await avisosDe(ALUNA)).toHaveLength(0);
  });

  it("data inválida no banco não esconde o item nem trava a fila", async () => {
    const aula = await addCourseContent(CURSO, video({ publishAt: emDias(7) }));
    await set(ref(database, `courseContent/${CURSO}/${aula.id}/publishAt`), "não é data");

    await cron(depoisDe(emDias(7)));
    expect(await avisosDe(ALUNA)).toHaveLength(1);
    expect(await fila()).toEqual({});
  });
});
