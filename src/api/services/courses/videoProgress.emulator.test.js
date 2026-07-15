import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref, set, get } from "firebase/database";

/**
 * Teste de integração de videoProgress contra o emulador do Realtime Database.
 *
 * Cobre uma regressão que só aparece na semântica real de set/update do RTDB —
 * uma escrita apagar campos vizinhos do mesmo nó —, que mock nenhum reproduz.
 *
 * Precisa do emulador de pé (`npm run firebase-emulate`). Sem ele, os testes
 * são reportados como pulados, e não como aprovados, para não dar falsa
 * segurança. A porta pode ser trocada com RTDB_EMULATOR_PORT.
 *
 * A config do Firebase é mockada porque a real chama getAnalytics, que exige
 * `window` e derruba o ambiente `node` dos testes.
 */

const PORT = Number(process.env.RTDB_EMULATOR_PORT || 9000);
const NS = "plataformacodefolio";
const USER = "user_teste";
const COURSE = "curso_teste";
const VIDEO = "video_teste";

vi.mock("../../config/firebase", async () => {
  const { initializeApp } = await import("firebase/app");
  const { getDatabase } = await import("firebase/database");
  const porta = Number(process.env.RTDB_EMULATOR_PORT || 9000);
  const app = initializeApp(
    { databaseURL: `http://127.0.0.1:${porta}?ns=plataformacodefolio` },
    "videoProgress-emulator-test"
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
      `Testes de integração de videoProgress pulados — rode 'npm run firebase-emulate'.`
  );
}

const { saveVideoProgress, markVideoAsCompleted, fetchVideoProgress } =
  await import("./videoProgress");
const { database } = await import("../../config/firebase");

const caminho = `videoProgress/${USER}/${COURSE}/${VIDEO}`;

describe.runIf(emuladorNoAr)(
  "videoProgress preserva a aprovação no quiz ao regravar o progresso",
  () => {
    beforeEach(async () => {
      // Estado de partida: o aluno assistiu ao vídeo e passou no quiz dele.
      // quizPassed/hasQuizData são gravados neste nó por saveQuizResults.
      await set(ref(database, caminho), {
        videoId: VIDEO,
        watched: true,
        percentageWatched: 100,
        completed: true,
        watchedTimeInSeconds: 600,
        quizPassed: true,
        hasQuizData: true,
      });
    });

    it("markVideoAsCompleted não apaga quizPassed ao reassistir até o fim", async () => {
      await markVideoAsCompleted(USER, COURSE, VIDEO, 600);

      const dados = (await get(ref(database, caminho))).val();
      expect(dados.quizPassed).toBe(true);
      expect(dados.hasQuizData).toBe(true);
      expect(dados.completed).toBe(true);
    });

    it("saveVideoProgress não apaga quizPassed ao salvar durante a reprodução", async () => {
      await saveVideoProgress(USER, COURSE, VIDEO, 30, 600);

      const dados = (await get(ref(database, caminho))).val();
      expect(dados.quizPassed).toBe(true);
      expect(dados.hasQuizData).toBe(true);
    });

    it("fetchVideoProgress continua enxergando a aprovação depois de reassistir", async () => {
      await saveVideoProgress(USER, COURSE, VIDEO, 60, 600);
      await markVideoAsCompleted(USER, COURSE, VIDEO, 600);

      const progresso = await fetchVideoProgress(USER, COURSE, VIDEO);
      expect(progresso.quizPassed).toBe(true);
      expect(progresso.watched).toBe(true);
    });

    it("grava o progresso normalmente quando o vídeo ainda não tem registro", async () => {
      const novo = `${VIDEO}_sem_registro`;
      await set(ref(database, `videoProgress/${USER}/${COURSE}/${novo}`), null);

      const resultado = await saveVideoProgress(USER, COURSE, novo, 600, 600);

      expect(resultado.success).toBe(true);
      const dados = (
        await get(ref(database, `videoProgress/${USER}/${COURSE}/${novo}`))
      ).val();
      expect(dados.percentageWatched).toBe(100);
      expect(dados.watched).toBe(true);
    });
  }
);
