import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ref, set, get } from "firebase/database";

/**
 * Testes de INTEGRAÇÃO do fluxo vídeo→quiz→progresso contra o emulador do RTDB,
 * exercitando a semântica real de escrita (update vs set, monotonicidade).
 *
 * Cobrem a durabilidade do progresso:
 *  - assistir grava watched(>=90)/completed(>=100) e NUNCA regride;
 *  - passar no quiz grava quizResults + espelho videoProgress.quizPassed;
 *  - regravar o progresso do vídeo NÃO apaga quizPassed (regressão 632dc1a);
 *  - o agregado do curso considera assistido + quiz;
 *  - reordenar o conteúdo NÃO toca o progresso.
 *
 * Precisa do emulador (`npm run firebase-emulate`). Sem ele, são pulados.
 */

const PORT = Number(process.env.RTDB_EMULATOR_PORT || 9000);
const NS = "plataformacodefolio";

vi.mock("../../config/firebase", async () => {
  const { initializeApp } = await import("firebase/app");
  const { getDatabase } = await import("firebase/database");
  const porta = Number(process.env.RTDB_EMULATOR_PORT || 9000);
  const app = initializeApp(
    { databaseURL: `http://127.0.0.1:${porta}?ns=plataformacodefolio` },
    "course-flow-emulator-test"
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
      `Testes de fluxo pulados — rode 'npm run firebase-emulate'.`
  );
}

const { saveVideoProgress, markVideoAsCompleted, fetchVideoProgress } =
  await import("./videoProgress");
const {
  markQuizAsCompleted,
  saveQuizResults,
  fetchUserQuizResults,
  hasUserReachedQuizAttemptLimit,
  restoreQuizAttempt,
} = await import("./quizzes");
const { updateCourseProgress, fetchCourseStudentCounts } = await import("./students");
const { saveCourseContentOrder, fetchCourseContent } = await import("./contentOrder");
const { database } = await import("../../config/firebase");

const C = "curso_fluxo_e2e";
const U = "aluno_fluxo_e2e";

const node = (uid, courseId, videoId) =>
  get(ref(database, `videoProgress/${uid}/${courseId}/${videoId}`)).then((s) => s.val());

describe.runIf(emuladorNoAr)("fluxo vídeo→quiz→progresso (emulador)", () => {
  beforeEach(async () => {
    // Limpa o estado do curso/aluno antes de cada teste.
    await set(ref(database, `videoProgress/${U}/${C}`), null);
    await set(ref(database, `quizResults/${U}/${C}`), null);
    await set(ref(database, `studentCourses/${U}/${C}`), null);
    await set(ref(database, `courseContent/${C}`), null);
  });

  describe("assistir grava progresso e é monotônico", () => {
    it("marca watched a partir de 90% e completed a partir de 100%", async () => {
      // 50% → não assistido
      await saveVideoProgress(U, C, "v1", 50, 100, {});
      let n = await node(U, C, "v1");
      expect(n.percentageWatched).toBe(50);
      expect(n.watched).toBe(false);

      // 95% → assistido, não concluído
      await saveVideoProgress(U, C, "v1", 95, 100, {});
      n = await node(U, C, "v1");
      expect(n.percentageWatched).toBe(90); // arredonda p/ múltiplo de 10
      expect(n.watched).toBe(true);
      expect(n.completed).toBe(false);

      // 100% → concluído
      await saveVideoProgress(U, C, "v1", 100, 100, {});
      n = await node(U, C, "v1");
      expect(n.percentageWatched).toBe(100);
      expect(n.completed).toBe(true);
    });

    it("NUNCA regride: salvar um percentual menor mantém o maior já salvo", async () => {
      await saveVideoProgress(U, C, "v1", 100, 100, {});
      await saveVideoProgress(U, C, "v1", 20, 100, {}); // retrocesso
      const n = await node(U, C, "v1");
      expect(n.percentageWatched).toBe(100);
      expect(n.watched).toBe(true);
      expect(n.completed).toBe(true);
    });

    it("markVideoAsCompleted marca 100% assistido/concluído", async () => {
      await markVideoAsCompleted(U, C, "v1", 100);
      const n = await node(U, C, "v1");
      expect(n.watched).toBe(true);
      expect(n.completed).toBe(true);
      expect(n.percentageWatched).toBe(100);
    });
  });

  describe("quiz: aprovação persiste e não é apagada ao regravar o vídeo", () => {
    it("markQuizAsCompleted grava quizResults e o espelho videoProgress.quizPassed", async () => {
      await markVideoAsCompleted(U, C, "v1", 100);
      await markQuizAsCompleted(U, C, "v1", { isPassed: true, completedAt: "now" });

      const quiz = (await get(ref(database, `quizResults/${U}/${C}/v1`))).val();
      expect(quiz.isPassed).toBe(true);

      const n = await node(U, C, "v1");
      expect(n.quizPassed).toBe(true);
    });

    it("regravar o progresso do vídeo NÃO apaga quizPassed (regressão 632dc1a)", async () => {
      await markVideoAsCompleted(U, C, "v1", 100);
      await markQuizAsCompleted(U, C, "v1", { isPassed: true });
      // Aluno reabre o vídeo e o player regrava o progresso.
      await saveVideoProgress(U, C, "v1", 100, 100, {});

      const n = await node(U, C, "v1");
      expect(n.quizPassed).toBe(true); // preservado
      expect(n.watched).toBe(true);
    });

    it("fetchVideoProgress reflete watched, completed e quizPassed", async () => {
      await markVideoAsCompleted(U, C, "v1", 100);
      await markQuizAsCompleted(U, C, "v1", { isPassed: true });
      const p = await fetchVideoProgress(U, C, "v1");
      expect(p).toMatchObject({ watched: true, completed: true, quizPassed: true });
      expect(p.readError).toBeUndefined();
    });
  });

  describe("tentativas: só a submissão consome (regressão do quiz fantasma)", () => {
    const questions = [
      { id: "q1", question: "1+1?", options: ["1", "2"], correctOption: 1 },
    ];
    const respostaErrada = { q1: 0 };
    const notaReprovado = {
      isPassed: false,
      scorePercentage: 0,
      earnedPoints: 0,
      totalPoints: 1,
      minPercentage: 70,
    };

    beforeEach(async () => {
      // saveQuizResults precisa do cadastro do aluno para compor o resultado.
      await set(ref(database, `users/${U}`), {
        firstName: "Aluno",
        lastName: "Teste",
        email: "aluno@teste.dev",
      });
    });

    it("marcar conclusão sem submeter NÃO cria tentativa nem esgota o limite", async () => {
      // Era este o caminho que o efeito de fechar o quiz disparava: bastava
      // abrir e sair para o aluno perder a tentativa.
      await markQuizAsCompleted(U, C, "v1", { isPassed: true, completedAt: "now" });

      const r = (await get(ref(database, `quizResults/${U}/${C}/v1`))).val();
      expect(r.attemptCount).toBeUndefined();

      const attempts = await fetchUserQuizResults(U, C);
      // Quiz de tentativa única: o aluno continua podendo fazer.
      expect(hasUserReachedQuizAttemptLimit(attempts, `${C}/v1`, 1)).toBe(false);
    });

    it("cada submissão incrementa exatamente uma tentativa", async () => {
      await saveQuizResults(U, C, "v1", notaReprovado, respostaErrada, questions, null, "v1");
      expect((await get(ref(database, `quizResults/${U}/${C}/v1`))).val().attemptCount).toBe(1);

      await saveQuizResults(U, C, "v1", notaReprovado, respostaErrada, questions, null, "v1");
      expect((await get(ref(database, `quizResults/${U}/${C}/v1`))).val().attemptCount).toBe(2);

      const attempts = await fetchUserQuizResults(U, C);
      expect(hasUserReachedQuizAttemptLimit(attempts, `${C}/v1`, 2)).toBe(true);
      expect(hasUserReachedQuizAttemptLimit(attempts, `${C}/v1`, 3)).toBe(false);
    });

    it("o professor devolve uma tentativa sem apagar a nota do aluno", async () => {
      await saveQuizResults(U, C, "v1", notaReprovado, respostaErrada, questions, null, "v1");

      const r = await restoreQuizAttempt(U, C, "v1");
      expect(r).toMatchObject({ success: true, attemptCount: 0 });

      const node = (await get(ref(database, `quizResults/${U}/${C}/v1`))).val();
      expect(node.attemptCount).toBe(0);
      expect(node.scorePercentage).toBe(0); // nota preservada
      expect(node.detailedAnswers).toBeTruthy(); // respostas preservadas

      // Com a tentativa devolvida, o quiz de tentativa única volta a liberar.
      const attempts = await fetchUserQuizResults(U, C);
      expect(hasUserReachedQuizAttemptLimit(attempts, `${C}/v1`, 1)).toBe(false);

      // Sem tentativa a devolver, não faz nada e avisa.
      expect((await restoreQuizAttempt(U, C, "v1")).success).toBe(false);
      expect((await restoreQuizAttempt(U, C, "inexistente")).success).toBe(false);
    });

    it("marcar aprovação depois de submeter preserva a contagem", async () => {
      await saveQuizResults(U, C, "v1", notaReprovado, respostaErrada, questions, null, "v1");
      await markQuizAsCompleted(U, C, "v1", { isPassed: true });

      const r = (await get(ref(database, `quizResults/${U}/${C}/v1`))).val();
      expect(r.attemptCount).toBe(1);
      expect(r.isPassed).toBe(true);
      expect(r.scorePercentage).toBe(0); // nota da submissão preservada
    });
  });

  describe("agregado do curso considera assistido + quiz", () => {
    it("vídeo com quiz só conta como concluído quando o quiz é aprovado", async () => {
      // 2 vídeos, ambos com quiz. v1 assistido+aprovado; v2 assistido, quiz pendente.
      const videos = [
        { id: "v1", watched: true, quizId: `${C}/v1`, quizPassed: true },
        { id: "v2", watched: true, quizId: `${C}/v2`, quizPassed: false },
      ];
      const r = await updateCourseProgress(U, C, videos);
      expect(r.progress).toBe(50); // 1 de 2
      expect(r.status).toBe("in_progress");

      const stored = (await get(ref(database, `studentCourses/${U}/${C}`))).val();
      expect(stored.progress).toBe(50);
    });

    it("100% e completed quando tudo assistido e aprovado", async () => {
      const videos = [
        { id: "v1", watched: true, quizId: `${C}/v1`, quizPassed: true },
        { id: "v2", watched: true, quizId: `${C}/v2`, quizPassed: true },
      ];
      const r = await updateCourseProgress(U, C, videos);
      expect(r.progress).toBe(100);
      expect(r.status).toBe("completed");
    });
  });

  describe("fetchCourseStudentCounts: 1 leitura de studentCourses conta todos os cursos", () => {
    const OUTRO_ALUNO = "aluno_fluxo_e2e_2";
    const OUTRO_CURSO = "curso_fluxo_e2e_2";

    afterEach(async () => {
      await set(ref(database, `studentCourses/${OUTRO_ALUNO}`), null);
    });

    it("conta matriculados por curso a partir da árvore inteira", async () => {
      await set(ref(database, `studentCourses/${U}/${C}`), { progress: 50 });
      await set(ref(database, `studentCourses/${OUTRO_ALUNO}/${C}`), { progress: 10 });
      await set(ref(database, `studentCourses/${OUTRO_ALUNO}/${OUTRO_CURSO}`), { progress: 0 });

      const counts = await fetchCourseStudentCounts();
      expect(counts[C]).toBe(2);
      expect(counts[OUTRO_CURSO]).toBe(1);
    });
  });

  describe("disciplina em andamento não conclui sozinha por progresso", () => {
    afterEach(async () => {
      await set(ref(database, `courses/${C}`), null);
    });

    it("100% numa disciplina sem encerramento fica in_progress", async () => {
      await set(ref(database, `courses/${C}`), { type: "disciplina" });
      const videos = [{ id: "v1", watched: true }];
      const r = await updateCourseProgress(U, C, videos);
      expect(r.progress).toBe(100);
      expect(r.status).toBe("in_progress");
    });

    it("100% numa disciplina já encerrada (closedAt) permanece completed", async () => {
      await set(ref(database, `courses/${C}`), {
        type: "disciplina",
        closedAt: "2026-08-01T00:00:00.000Z",
      });
      const videos = [{ id: "v1", watched: true }];
      const r = await updateCourseProgress(U, C, videos);
      expect(r.progress).toBe(100);
      expect(r.status).toBe("completed");
    });
  });

  describe("reordenar o conteúdo não afeta o progresso", () => {
    it("saveCourseContentOrder só muda order; videoProgress permanece", async () => {
      // Dois itens de conteúdo e progresso do aluno em ambos.
      await set(ref(database, `courseContent/${C}/a`), { category: "video", title: "A", url: "u", order: 0 });
      await set(ref(database, `courseContent/${C}/b`), { category: "video", title: "B", url: "u", order: 1 });
      await markVideoAsCompleted(U, C, "a", 100);
      await markVideoAsCompleted(U, C, "b", 100);

      // Inverte a ordem.
      const items = await fetchCourseContent(C);
      const reordered = [items.find((i) => i.id === "b"), items.find((i) => i.id === "a")];
      await saveCourseContentOrder(C, reordered);

      // Ordem trocada...
      const a = (await get(ref(database, `courseContent/${C}/a`))).val();
      const b = (await get(ref(database, `courseContent/${C}/b`))).val();
      expect(b.order).toBeLessThan(a.order);

      // ...mas o progresso permanece intacto.
      expect((await node(U, C, "a")).watched).toBe(true);
      expect((await node(U, C, "b")).watched).toBe(true);
    });
  });
});
