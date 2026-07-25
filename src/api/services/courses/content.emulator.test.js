import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref, set, get } from "firebase/database";

/**
 * Teste de integração contra o emulador do Realtime Database.
 *
 * Cobre a regressão da perda PERMANENTE de progresso: deletar um conteúdo NÃO
 * pode apagar o `videoProgress` dos alunos (antes apagava para todos, então
 * deletar um vídeo para recadastrar uma versão corrigida zerava o check verde
 * de todo mundo, sem recuperação). É uma semântica de escrita real do RTDB que
 * mock nenhum reproduz.
 *
 * Precisa do emulador de pé (`npm run firebase-emulate`). Sem ele, os testes são
 * reportados como pulados, não aprovados. Porta configurável via RTDB_EMULATOR_PORT.
 */

const PORT = Number(process.env.RTDB_EMULATOR_PORT || 9000);
const NS = "plataformacodefolio";
const COURSE = "curso_del_teste";
const CONTENT = "conteudo_del_teste";
const USER = "aluno_del_teste";

vi.mock("../../config/firebase", async () => {
  const { initializeApp } = await import("firebase/app");
  const { getDatabase } = await import("firebase/database");
  const porta = Number(process.env.RTDB_EMULATOR_PORT || 9000);
  const app = initializeApp(
    { databaseURL: `http://127.0.0.1:${porta}?ns=plataformacodefolio` },
    "content-emulator-test"
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
      `Testes de integração de content pulados — rode 'npm run firebase-emulate'.`
  );
}

const { deleteCourseContent } = await import("./content");
const { database } = await import("../../config/firebase");

describe.runIf(emuladorNoAr)(
  "deleteCourseContent preserva o progresso dos alunos",
  () => {
    beforeEach(async () => {
      await set(ref(database, `courseContent/${COURSE}/${CONTENT}`), {
        category: "video",
        title: "Aula X",
        url: "https://youtu.be/DEL123",
        order: 0,
      });
      // Sem quiz associado (deleteCourseContent bloquearia se houvesse).
      await set(ref(database, `courseQuizzes/${COURSE}/${CONTENT}`), null);
      // Progresso do aluno neste conteúdo.
      await set(ref(database, `videoProgress/${USER}/${COURSE}/${CONTENT}`), {
        videoId: CONTENT,
        watched: true,
        percentageWatched: 100,
        completed: true,
      });
    });

    it("remove o conteúdo mas NÃO apaga o videoProgress do aluno", async () => {
      await deleteCourseContent(COURSE, CONTENT);

      const conteudo = (
        await get(ref(database, `courseContent/${COURSE}/${CONTENT}`))
      ).val();
      expect(conteudo).toBeNull();

      const progresso = (
        await get(ref(database, `videoProgress/${USER}/${COURSE}/${CONTENT}`))
      ).val();
      expect(progresso).not.toBeNull();
      expect(progresso.watched).toBe(true);
      expect(progresso.percentageWatched).toBe(100);
    });
  }
);
