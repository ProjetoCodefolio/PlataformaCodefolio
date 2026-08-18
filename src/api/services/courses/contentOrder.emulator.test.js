import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref, set } from "firebase/database";

/**
 * Teste de integração contra o emulador do Realtime Database.
 *
 * Cobre a regressão da ORDEM GLOBAL do conteúdo: `order` é uma sequência única
 * compartilhada por courseContent, courseVideos, courseSlides e vídeos de
 * entrega (ver contentOrder.js). Excluir um vídeo legado NÃO pode reindexar só
 * os vídeos, senão eles colidem com slides/conteúdo na mesma posição e o
 * desempate reordena a lista sozinho — o professor perde o arranjo que montou
 * no arrastar sem ter tocado nele.
 *
 * É a interação real entre três nós do banco, que mock nenhum reproduz.
 *
 * Precisa do emulador de pé (`npm run firebase-emulate`). Sem ele, os testes são
 * reportados como pulados, não aprovados. Porta configurável via RTDB_EMULATOR_PORT.
 */

const PORT = Number(process.env.RTDB_EMULATOR_PORT || 9000);
const NS = "plataformacodefolio";
const COURSE = "curso_ordem_teste";
const VIDEO_A = "video_a_ordem";
const SLIDE_S = "slide_s_ordem";
const VIDEO_B = "video_b_ordem";

vi.mock("../../config/firebase", async () => {
  const { initializeApp } = await import("firebase/app");
  const { getDatabase } = await import("firebase/database");
  const porta = Number(process.env.RTDB_EMULATOR_PORT || 9000);
  const app = initializeApp(
    { databaseURL: `http://127.0.0.1:${porta}?ns=plataformacodefolio` },
    "content-order-emulator-test"
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

if (!emuladorNoAr) {
  console.warn(
    `⚠️  Emulador do RTDB não encontrado em 127.0.0.1:${PORT}. ` +
      `Testes de integração da ordem do conteúdo pulados — rode 'npm run firebase-emulate'.`
  );
}

const { deleteCourseVideo } = await import("./videos");
const { fetchCourseContent } = await import("./contentOrder");
const { database } = await import("../../config/firebase");

describe.runIf(emuladorNoAr)(
  "excluir vídeo legado preserva a ordem global do conteúdo",
  () => {
    beforeEach(async () => {
      // Arranjo do professor: vídeo, slide, vídeo — intercalados na ordem
      // global. O slide é independente (sem videoId), senão a exclusão do
      // vídeo seria bloqueada por vínculo.
      await set(ref(database, `courseVideos/${COURSE}`), {
        [VIDEO_A]: { title: "Aula A", url: "https://youtu.be/AAA", order: 0 },
        [VIDEO_B]: { title: "Aula B", url: "https://youtu.be/BBB", order: 2 },
      });
      await set(ref(database, `courseSlides/${COURSE}`), {
        [SLIDE_S]: {
          title: "Slide S",
          url: "https://docs.google.com/presentation/d/SSS/edit",
          order: 1,
        },
      });
      await set(ref(database, `courseContent/${COURSE}`), null);
      await set(ref(database, `courseQuizzes/${COURSE}`), null);
    });

    it("mantém o slide antes do vídeo seguinte após excluir o primeiro vídeo", async () => {
      const antes = await fetchCourseContent(COURSE);
      expect(antes.map((i) => i.id)).toEqual([VIDEO_A, SLIDE_S, VIDEO_B]);

      await deleteCourseVideo(COURSE, VIDEO_A, "professor_teste");

      const depois = await fetchCourseContent(COURSE);
      expect(depois.map((i) => i.id)).toEqual([SLIDE_S, VIDEO_B]);
    });

    it("não reindexa o `order` dos itens remanescentes", async () => {
      await deleteCourseVideo(COURSE, VIDEO_A, "professor_teste");

      const depois = await fetchCourseContent(COURSE);
      const porId = Object.fromEntries(depois.map((i) => [i.id, i.order]));
      // O "buraco" deixado em 0 é inofensivo: só o valor RELATIVO importa.
      expect(porId[SLIDE_S]).toBe(1);
      expect(porId[VIDEO_B]).toBe(2);
    });
  }
);
