import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { createDb } from "./firebaseRest.js";
import { processDuePublications } from "./publications.js";

/**
 * Teste de integração do cron de publicações programadas, contra o emulador,
 * pelo mesmo REST que o Worker usa em produção.
 *
 * O que está sendo protegido (regra: avisar como se o professor cadastrasse o
 * item na hora):
 *  - vídeo vencido: sino para os alunos, sem e-mail;
 *  - quiz vencido: sino + e-mail, com o título do curso na mensagem;
 *  - professor da turma não recebe; aluno que desligou o tipo não recebe;
 *  - item adiado depois de entrar na fila é reagendado, sem aviso;
 *  - item excluído é descartado, sem aviso;
 *  - entrada que ainda não venceu fica quieta;
 *  - duas execuções ao mesmo tempo avisam uma vez só.
 *
 * Usa o namespace padrão, o único em que o emulador conhece o `.indexOn` da
 * fila; `Bearer owner` passa por cima das regras, como a conta de serviço.
 */

const PORT = Number(process.env.RTDB_EMULATOR_PORT || 9000);
const NS = "plataformacodefolio-default-rtdb";
const URL_BANCO = `http://127.0.0.1:${PORT}?ns=${NS}`;

const CURSO = "curso_cron_publicacao";
const ALUNA = "aluna_cron_publicacao";
const ALUNO_SEM_AVISO = "aluno_mudo_cron_publicacao";
const PROFESSORA = "prof_cron_publicacao";

const emuladorNoAr = await (async () => {
  try {
    await fetch(`http://127.0.0.1:${PORT}/.json?ns=${NS}`);
    return true;
  } catch {
    return false;
  }
})();

const db = createDb({ databaseUrl: URL_BANCO, getAuthHeader: async () => "Bearer owner" });

const NOW = new Date("2030-03-02T22:35:00.000Z");
const PASSADO = "2030-03-02T22:30:00.000Z";
const FUTURO = "2030-03-09T22:30:00.000Z";

const entrada = (kind, itemKey, publishAt = PASSADO) => ({
  courseId: CURSO,
  kind,
  itemKey,
  contentId: itemKey,
  source: "content",
  publishAt,
});

const notificacoesDe = async (uid) => Object.values((await db.get(`notifications/${uid}`)) || {});

const limpar = async () => {
  const fila = (await db.get("publicationQueue")) || {};
  for (const key of Object.keys(fila).filter((k) => k.startsWith(`${CURSO}__`))) {
    await db.remove(`publicationQueue/${key}`);
  }
  for (const caminho of [
    `courseContent/${CURSO}`,
    `courseQuizzes/${CURSO}`,
    `courses/${CURSO}`,
    `notifications/${ALUNA}`,
    `notifications/${ALUNO_SEM_AVISO}`,
    `notifications/${PROFESSORA}`,
    `notificationPrefs/${ALUNO_SEM_AVISO}`,
  ]) {
    await db.remove(caminho);
  }
  for (const uid of [ALUNA, ALUNO_SEM_AVISO, PROFESSORA]) {
    await db.remove(`studentCourses/${uid}`);
    await db.remove(`users/${uid}`);
  }
};

describe.runIf(emuladorNoAr)("cron de publicações programadas", () => {
  let emails;
  const processa = () =>
    processDuePublications({
      db,
      now: NOW,
      enqueueEmail: async (job) => emails.push(job),
      // Só as entradas deste teste: o emulador pode ter a fila de quem roda.
      only: (key) => key.startsWith(`${CURSO}__`),
    });

  beforeEach(async () => {
    await limpar();
    emails = [];
    await db.put(`courses/${CURSO}`, { title: "Figma", userId: "dono" });
    for (const uid of [ALUNA, ALUNO_SEM_AVISO, PROFESSORA]) {
      await db.put(`studentCourses/${uid}/${CURSO}`, { progress: 0 });
    }
    await db.put(`users/${ALUNA}`, { email: "aluna@teste.com", displayName: "Aluna" });
    await db.put(`users/${ALUNO_SEM_AVISO}`, { email: "mudo@teste.com", displayName: "Mudo" });
    await db.put(`users/${PROFESSORA}`, {
      email: "prof@teste.com",
      coursesTeacher: { [CURSO]: true },
    });
    await db.put(`notificationPrefs/${ALUNO_SEM_AVISO}/${CURSO}`, {
      newContent: false,
      newQuiz: false,
    });
    await db.put(`courseContent/${CURSO}/aula1`, {
      category: "video",
      title: "Aula 1",
      url: "https://youtu.be/x",
      publishAt: PASSADO,
    });
  });

  afterAll(limpar);

  it("vídeo vencido: sino para quem aceita, sem e-mail, e sai da fila", async () => {
    await db.put(`publicationQueue/${CURSO}__content__aula1`, entrada("content", "aula1"));

    const resumo = await processa();

    expect(resumo.notified).toBe(1);
    const [aviso] = await notificacoesDe(ALUNA);
    expect(aviso).toMatchObject({
      type: "new_content",
      courseId: CURSO,
      title: "Novo vídeo publicado",
      message: "Aula 1",
      link: `/classes?courseId=${CURSO}&videoId=aula1`,
      read: false,
      createdAt: NOW.toISOString(),
    });
    expect(await notificacoesDe(ALUNO_SEM_AVISO)).toHaveLength(0);
    expect(await notificacoesDe(PROFESSORA)).toHaveLength(0);
    expect(emails).toHaveLength(0);
    expect(await db.get(`publicationQueue/${CURSO}__content__aula1`)).toBeNull();
  });

  it("quiz vencido: sino e e-mail, com o título do curso", async () => {
    await db.put(`courseQuizzes/${CURSO}/aula1`, {
      videoId: "aula1",
      minPercentage: 70,
      questions: [],
    });
    await db.put(`publicationQueue/${CURSO}__quiz__aula1`, entrada("quiz", "aula1"));

    await processa();

    const [aviso] = await notificacoesDe(ALUNA);
    expect(aviso).toMatchObject({
      type: "new_quiz",
      quizId: "aula1",
      title: "Novo quiz publicado",
      message: "Figma: Aula 1. Já está disponível.",
    });
    expect(emails).toHaveLength(1);
    expect(emails[0]).toMatchObject({
      to: "aluna@teste.com",
      name: "Aluna",
      type: "new_quiz",
      courseId: CURSO,
      courseTitle: "Figma",
      itemTitle: "Aula 1",
      link: `/classes?courseId=${CURSO}&videoId=aula1`,
    });
    expect(emails[0].fields.minPercentage).toBe("70%");
  });

  it("item adiado é reagendado sem aviso; item excluído é descartado", async () => {
    await db.put(`courseContent/${CURSO}/aula1/publishAt`, FUTURO);
    await db.put(`publicationQueue/${CURSO}__content__aula1`, entrada("content", "aula1"));
    await db.put(`publicationQueue/${CURSO}__content__sumiu`, entrada("content", "sumiu"));

    const resumo = await processa();

    expect(resumo).toMatchObject({ notified: 0, rescheduled: 1, dropped: 1 });
    const reagendada = await db.get(`publicationQueue/${CURSO}__content__aula1`);
    expect(reagendada.publishAt).toBe(FUTURO);
    expect(reagendada.sendingAt).toBeUndefined();
    expect(await db.get(`publicationQueue/${CURSO}__content__sumiu`)).toBeNull();
    expect(await notificacoesDe(ALUNA)).toHaveLength(0);
  });

  it("entrada que ainda não venceu fica quieta", async () => {
    await db.put(`publicationQueue/${CURSO}__content__aula1`, entrada("content", "aula1", FUTURO));

    const resumo = await processa();

    expect(resumo.notified).toBe(0);
    expect(await db.get(`publicationQueue/${CURSO}__content__aula1`)).not.toBeNull();
  });

  it("se o professor regrava a data durante o aviso, a entrada nova fica", async () => {
    const chaveFila = `publicationQueue/${CURSO}__content__aula1`;
    await db.put(chaveFila, entrada("content", "aula1"));

    // Simula o app regravando a entrada no meio do processamento: logo que o
    // cron lê o conteúdo, o professor volta a programar o item.
    const dbComCorrida = {
      ...db,
      async get(path, params) {
        if (path === `courseContent/${CURSO}/aula1`) {
          await db.put(chaveFila, entrada("content", "aula1", FUTURO));
        }
        return db.get(path, params);
      },
    };

    await processDuePublications({
      db: dbComCorrida,
      now: NOW,
      enqueueEmail: async () => {},
      only: (key) => key.startsWith(`${CURSO}__`),
    });

    const depois = await db.get(chaveFila);
    expect(depois).not.toBeNull();
    expect(depois.publishAt).toBe(FUTURO);
  });

  it("duas execuções ao mesmo tempo avisam uma vez só", async () => {
    await db.put(`publicationQueue/${CURSO}__content__aula1`, entrada("content", "aula1"));

    const [a, b] = await Promise.all([processa(), processa()]);

    expect(a.notified + b.notified).toBe(1);
    expect(await notificacoesDe(ALUNA)).toHaveLength(1);
  });
});
