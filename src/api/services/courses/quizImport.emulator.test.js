import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref, set, get } from "firebase/database";

/**
 * Teste de integração da importação de questionário, contra o emulador.
 *
 * O que está sendo protegido:
 *  - o quiz chega no destino com as questões, mas com IDS NOVOS: reaproveitar os
 *    ids da origem faria as respostas de lá casarem com o quiz daqui num
 *    recálculo, e um aluno herdaria a nota de outro;
 *  - nada de resultado acompanha a cópia (quizResults, customQuizResults,
 *    liveQuizResults, openEndedAnswers ficam onde estavam);
 *  - um conteúdo que já tem quiz recusa a importação em vez de sobrescrever;
 *  - a janela de datas do original não vem junto — o quiz nasce aberto aqui.
 *
 * Precisa do emulador de pé (`npm run firebase-emulate`). Sem ele, os testes são
 * reportados como pulados, não aprovados. Porta configurável via RTDB_EMULATOR_PORT.
 */

const PORT = Number(process.env.RTDB_EMULATOR_PORT || 9000);
const NS = "plataformacodefolio";

const ORIGEM = "curso_origem_import";
const DESTINO = "curso_destino_import";
const QUIZ_ORIGEM = "aula_origem";
const CONTEUDO_DESTINO = "aula_destino";
const ALUNO = "aluno_import_teste";

vi.mock("../../config/firebase", async () => {
  const { initializeApp } = await import("firebase/app");
  const { getDatabase } = await import("firebase/database");
  const porta = Number(process.env.RTDB_EMULATOR_PORT || 9000);
  const app = initializeApp(
    { databaseURL: `http://127.0.0.1:${porta}?ns=plataformacodefolio` },
    "quiz-import-emulator-test"
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
      `Testes de importação de questionário pulados — rode 'npm run firebase-emulate'.`
  );
}

const { importQuizFromCourse } = await import("./quizImport");
const { database } = await import("../../config/firebase");

const quizDeOrigem = {
  videoId: QUIZ_ORIGEM,
  courseId: ORIGEM,
  minPercentage: 70,
  isDiagnostic: true,
  allowRetry: false,
  openDate: "2025-03-01T12:00:00.000Z",
  closeDate: "2025-03-30T12:00:00.000Z",
  questions: [
    {
      id: "questao-original-1",
      question: "O que é um ponteiro?",
      questionType: "multiple-choice",
      options: ["Um endereço", "Um laço", "Um tipo"],
      correctOption: 0,
    },
    {
      id: "questao-original-2",
      question: "Explique a aritmética de ponteiros.",
      questionType: "open-ended",
    },
  ],
};

describe.runIf(emuladorNoAr)("importQuizFromCourse", () => {
  beforeEach(async () => {
    await set(ref(database, `courseQuizzes/${ORIGEM}`), null);
    await set(ref(database, `courseQuizzes/${DESTINO}`), null);
    await set(ref(database, `quizResults/${ALUNO}`), null);
    await set(ref(database, `courseQuizzes/${ORIGEM}/${QUIZ_ORIGEM}`), quizDeOrigem);
    // Uma tentativa do aluno no curso de ORIGEM, que não pode viajar junto.
    await set(ref(database, `quizResults/${ALUNO}/${ORIGEM}/${QUIZ_ORIGEM}`), {
      correctAnswers: 1,
      totalQuestions: 1,
      scorePercentage: 100,
      isPassed: true,
      attemptCount: 1,
    });
  });

  it("copia as questões com ids novos", async () => {
    await importQuizFromCourse({
      sourceCourseId: ORIGEM,
      sourceQuizId: QUIZ_ORIGEM,
      targetCourseId: DESTINO,
      targetContentId: CONTEUDO_DESTINO,
    });

    const destino = (
      await get(ref(database, `courseQuizzes/${DESTINO}/${CONTEUDO_DESTINO}`))
    ).val();

    expect(destino.questions).toHaveLength(2);
    expect(destino.questions.map((q) => q.question)).toEqual([
      "O que é um ponteiro?",
      "Explique a aritmética de ponteiros.",
    ]);
    expect(destino.questions.map((q) => q.id)).not.toContain("questao-original-1");
    expect(destino.questions.map((q) => q.id)).not.toContain("questao-original-2");
    expect(destino.questions[0].correctOption).toBe(0);
    expect(destino.videoId).toBe(CONTEUDO_DESTINO);
    expect(destino.courseId).toBe(DESTINO);
  });

  it("não leva resultado nenhum de aluno junto", async () => {
    await importQuizFromCourse({
      sourceCourseId: ORIGEM,
      sourceQuizId: QUIZ_ORIGEM,
      targetCourseId: DESTINO,
      targetContentId: CONTEUDO_DESTINO,
    });

    const noDestino = (
      await get(ref(database, `quizResults/${ALUNO}/${DESTINO}`))
    ).exists();
    expect(noDestino).toBe(false);

    // E o da origem continua intacto.
    const naOrigem = (
      await get(ref(database, `quizResults/${ALUNO}/${ORIGEM}/${QUIZ_ORIGEM}`))
    ).val();
    expect(naOrigem.attemptCount).toBe(1);
  });

  it("traz as configurações, menos a janela de datas", async () => {
    await importQuizFromCourse({
      sourceCourseId: ORIGEM,
      sourceQuizId: QUIZ_ORIGEM,
      targetCourseId: DESTINO,
      targetContentId: CONTEUDO_DESTINO,
      copySettings: true,
    });

    const destino = (
      await get(ref(database, `courseQuizzes/${DESTINO}/${CONTEUDO_DESTINO}`))
    ).val();

    expect(destino.minPercentage).toBe(70);
    expect(destino.isDiagnostic).toBe(true);
    expect(destino.allowRetry).toBe(false);
    expect(destino.openDate).toBeUndefined();
    expect(destino.closeDate).toBeUndefined();
  });

  it("sem copiar configurações, o quiz nasce no padrão", async () => {
    await importQuizFromCourse({
      sourceCourseId: ORIGEM,
      sourceQuizId: QUIZ_ORIGEM,
      targetCourseId: DESTINO,
      targetContentId: CONTEUDO_DESTINO,
      copySettings: false,
    });

    const destino = (
      await get(ref(database, `courseQuizzes/${DESTINO}/${CONTEUDO_DESTINO}`))
    ).val();

    expect(destino.minPercentage).toBe(0);
    expect(destino.isDiagnostic).toBe(false);
    expect(destino.allowRetry).toBe(true);
  });

  it("recusa sobrescrever um conteúdo que já tem quiz", async () => {
    await set(ref(database, `courseQuizzes/${DESTINO}/${CONTEUDO_DESTINO}`), {
      videoId: CONTEUDO_DESTINO,
      questions: [{ id: "ja-existia", question: "Questão de casa", options: [], correctOption: 0 }],
    });

    await expect(
      importQuizFromCourse({
        sourceCourseId: ORIGEM,
        sourceQuizId: QUIZ_ORIGEM,
        targetCourseId: DESTINO,
        targetContentId: CONTEUDO_DESTINO,
      })
    ).rejects.toThrow(/já tem um questionário/i);

    const destino = (
      await get(ref(database, `courseQuizzes/${DESTINO}/${CONTEUDO_DESTINO}`))
    ).val();
    expect(destino.questions[0].id).toBe("ja-existia");
  });

  it("recusa uma origem que não existe", async () => {
    await expect(
      importQuizFromCourse({
        sourceCourseId: ORIGEM,
        sourceQuizId: "quiz_inexistente",
        targetCourseId: DESTINO,
        targetContentId: CONTEUDO_DESTINO,
      })
    ).rejects.toThrow(/não existe mais/i);
  });
});
