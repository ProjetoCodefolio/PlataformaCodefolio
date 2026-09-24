import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref, set, get } from "firebase/database";

/**
 * Teste de integração da fila de publicações, contra o emulador, pelas mesmas
 * funções que as telas chamam.
 *
 * O que está sendo protegido:
 *  - conteúdo programado entra na fila na data dele; publicado na hora, não;
 *  - o quiz entra na data EFETIVA (a maior entre a dele e a do conteúdo), e
 *    acompanha quando o conteúdo muda de data;
 *  - "Publicar agora" num item que devia aviso faz a entrada vencer já, para o
 *    Worker avisar a turma como se fosse um cadastro na hora;
 *  - excluir o item tira a dívida de aviso da fila.
 */

const PORT = Number(process.env.RTDB_EMULATOR_PORT || 9000);
const NS = "plataformacodefolio";
const CURSO = "curso_fila_publicacao";

vi.mock("../../config/firebase", async () => {
  const { initializeApp } = await import("firebase/app");
  const { getDatabase } = await import("firebase/database");
  const porta = Number(process.env.RTDB_EMULATOR_PORT || 9000);
  const app = initializeApp(
    { databaseURL: `http://127.0.0.1:${porta}?ns=plataformacodefolio` },
    "publication-queue-emulator-test"
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
const { addQuiz, updateQuizPublishAt, removeQuiz } = await import("./quizCrud");
const { database } = await import("../../config/firebase");

const emDias = (dias) => new Date(Date.now() + dias * 24 * 3600 * 1000).toISOString();
const video = (extra = {}) => ({
  category: "video",
  title: "Aula",
  url: "https://www.youtube.com/watch?v=aaaaaaaaaaa",
  ...extra,
});

const fila = async () => (await get(ref(database, "publicationQueue"))).val() || {};
const entradaDe = async (kind, itemKey) => (await fila())[`${CURSO}__${kind}__${itemKey}`];

describe.runIf(emuladorNoAr)("fila de publicações", () => {
  beforeEach(async () => {
    const atual = (await get(ref(database, "publicationQueue"))).val() || {};
    for (const key of Object.keys(atual).filter((k) => k.startsWith(`${CURSO}__`))) {
      await set(ref(database, `publicationQueue/${key}`), null);
    }
    await set(ref(database, `courseContent/${CURSO}`), null);
    await set(ref(database, `courseQuizzes/${CURSO}`), null);
  });

  it("conteúdo programado entra na fila; publicado na hora, não", async () => {
    const semana = emDias(7);
    const programado = await addCourseContent(CURSO, video({ publishAt: semana }));
    const agora = await addCourseContent(CURSO, video({ publishAt: "" }));

    const entrada = await entradaDe("content", programado.id);
    expect(entrada).toMatchObject({
      courseId: CURSO,
      kind: "content",
      itemKey: programado.id,
      source: "content",
      publishAt: semana,
    });
    expect(await entradaDe("content", agora.id)).toBeUndefined();
  });

  it("o quiz entra na data efetiva e acompanha o conteúdo", async () => {
    const semana = emDias(7);
    const conteudo = await addCourseContent(CURSO, video({ publishAt: semana }));
    await addQuiz(CURSO, conteudo.id);
    expect((await entradaDe("quiz", conteudo.id)).publishAt).toBe(semana);

    const duasSemanas = emDias(14);
    await updateCourseContent(CURSO, conteudo.id, video({ publishAt: duasSemanas }));
    expect((await entradaDe("content", conteudo.id)).publishAt).toBe(duasSemanas);
    expect((await entradaDe("quiz", conteudo.id)).publishAt).toBe(duasSemanas);

    // Quiz com data própria mais tarde fica na dele.
    const tresSemanas = emDias(21);
    await updateQuizPublishAt(CURSO, conteudo.id, tresSemanas);
    expect((await entradaDe("quiz", conteudo.id)).publishAt).toBe(tresSemanas);
  });

  it("publicar agora um item que devia aviso faz a entrada vencer já", async () => {
    const conteudo = await addCourseContent(CURSO, video({ publishAt: emDias(7) }));
    await addQuiz(CURSO, conteudo.id);

    const antes = Date.now();
    await updateCourseContent(CURSO, conteudo.id, video({ publishAt: "" }));

    const entradaConteudo = await entradaDe("content", conteudo.id);
    const entradaQuiz = await entradaDe("quiz", conteudo.id);
    expect(new Date(entradaConteudo.publishAt).getTime()).toBeLessThanOrEqual(Date.now());
    expect(new Date(entradaConteudo.publishAt).getTime()).toBeGreaterThanOrEqual(antes - 5000);
    expect(new Date(entradaQuiz.publishAt).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("excluir o quiz ou o conteúdo tira a entrada da fila", async () => {
    const conteudo = await addCourseContent(CURSO, video({ publishAt: emDias(7) }));
    await addQuiz(CURSO, conteudo.id);

    await removeQuiz(CURSO, conteudo.id);
    expect(await entradaDe("quiz", conteudo.id)).toBeUndefined();

    await deleteCourseContent(CURSO, conteudo.id);
    expect(await entradaDe("content", conteudo.id)).toBeUndefined();
  });
});
