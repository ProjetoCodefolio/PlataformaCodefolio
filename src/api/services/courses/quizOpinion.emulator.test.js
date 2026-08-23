import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref, set, get } from "firebase/database";

/**
 * Teste de integração da submissão de um questionário de opinião, contra o
 * emulador.
 *
 * A regressão que ele trava é de escrita real: uma pergunta sem gabarito não tem
 * `correctOption`, e `Number(undefined)` é NaN — valor que o Realtime Database
 * RECUSA. A gravação inteira falhava e o aluno perdia a submissão. Nenhum mock
 * reproduz isso: só o banco de verdade rejeita NaN.
 *
 * Precisa do emulador de pé (`npm run firebase-emulate`). Sem ele, os testes são
 * reportados como pulados, não aprovados. Porta configurável via RTDB_EMULATOR_PORT.
 */

const PORT = Number(process.env.RTDB_EMULATOR_PORT || 9000);
const NS = "plataformacodefolio";

const CURSO = "curso_opiniao_teste";
const QUIZ = "aula_opiniao";
const ALUNO = "aluno_opiniao_teste";

vi.mock("../../config/firebase", async () => {
  const { initializeApp } = await import("firebase/app");
  const { getDatabase } = await import("firebase/database");
  const porta = Number(process.env.RTDB_EMULATOR_PORT || 9000);
  const app = initializeApp(
    { databaseURL: `http://127.0.0.1:${porta}?ns=plataformacodefolio` },
    "quiz-opiniao-emulator-test"
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
      `Testes do questionário de opinião pulados — rode 'npm run firebase-emulate'.`
  );
}

const { saveQuizResults } = await import("./quizzes");
const { database } = await import("../../config/firebase");

const LIKERT = ["Discordo fortemente", "Discordo", "Neutro", "Concordo", "Concordo fortemente"];

const perguntaDeOpiniao = {
  id: "opiniao-1",
  question: "O ritmo das aulas foi adequado",
  questionType: "multiple-choice",
  options: LIKERT,
  graded: false,
  scale: "likert-5",
};

const perguntaAvaliada = {
  id: "avaliada-1",
  question: "Qual a complexidade da busca binária?",
  questionType: "multiple-choice",
  options: ["O(n)", "O(log n)"],
  correctOption: 1,
};

describe.runIf(emuladorNoAr)("submissão de questionário de opinião", () => {
  beforeEach(async () => {
    await set(ref(database, `quizResults/${ALUNO}`), null);
    await set(ref(database, `users/${ALUNO}`), {
      firstName: "Aluno",
      lastName: "de Teste",
      email: "aluno@teste.com",
      role: "user",
    });
    await set(ref(database, `courseQuizzes/${CURSO}/${QUIZ}`), {
      videoId: QUIZ,
      courseId: CURSO,
      minPercentage: 0,
      questions: [perguntaDeOpiniao],
    });
  });

  const lerResultado = async () =>
    (await get(ref(database, `quizResults/${ALUNO}/${CURSO}/${QUIZ}`))).val();

  it("grava a escolha do aluno sem gabarito, pelo caminho do fallback", async () => {
    await saveQuizResults(
      ALUNO,
      CURSO,
      QUIZ,
      { isPassed: true, scorePercentage: 100, earnedPoints: 0, totalPoints: 0 },
      { "opiniao-1": 3 },
      [perguntaDeOpiniao]
    );

    const resultado = await lerResultado();
    const resposta = resultado.detailedAnswers["opiniao-1"];

    expect(resposta.graded).toBe(false);
    expect(resposta.userAnswer).toBe(3);
    expect(resposta.userAnswerText).toBe("Concordo");
    expect(resposta.correctOption).toBeUndefined();
    expect(resposta.isCorrect).toBeUndefined();
  });

  it("grava a escolha pelo caminho do answersDetails, que é o do aluno na tela", async () => {
    await saveQuizResults(
      ALUNO,
      CURSO,
      QUIZ,
      { isPassed: true, scorePercentage: 100, earnedPoints: 0, totalPoints: 0 },
      { "opiniao-1": 0 },
      [perguntaDeOpiniao],
      [
        {
          questionId: "opiniao-1",
          question: perguntaDeOpiniao.question,
          questionType: "multiple-choice",
          graded: false,
          options: LIKERT,
          userOption: 0,
          isCorrect: null,
        },
      ]
    );

    const resposta = (await lerResultado()).detailedAnswers["opiniao-1"];
    expect(resposta.graded).toBe(false);
    expect(resposta.userAnswerText).toBe("Discordo fortemente");
    expect(resposta.correctOption).toBeUndefined();
  });

  it("num quiz misto, a avaliada mantém gabarito e a de opinião não", async () => {
    await set(ref(database, `courseQuizzes/${CURSO}/${QUIZ}/questions`), [
      perguntaAvaliada,
      perguntaDeOpiniao,
    ]);

    await saveQuizResults(
      ALUNO,
      CURSO,
      QUIZ,
      { isPassed: true, scorePercentage: 100, earnedPoints: 1, totalPoints: 1 },
      { "avaliada-1": 1, "opiniao-1": 4 },
      [perguntaAvaliada, perguntaDeOpiniao]
    );

    const respostas = (await lerResultado()).detailedAnswers;

    expect(respostas["avaliada-1"].correctOption).toBe(1);
    expect(respostas["avaliada-1"].isCorrect).toBe(true);
    expect(respostas["opiniao-1"].correctOption).toBeUndefined();
    expect(respostas["opiniao-1"].userAnswerText).toBe("Concordo fortemente");
  });

  it("conta a tentativa como qualquer outra submissão", async () => {
    const submeter = () =>
      saveQuizResults(
        ALUNO,
        CURSO,
        QUIZ,
        { isPassed: true, scorePercentage: 100, earnedPoints: 0, totalPoints: 0 },
        { "opiniao-1": 2 },
        [perguntaDeOpiniao]
      );

    await submeter();
    expect((await lerResultado()).attemptCount).toBe(1);

    await submeter();
    expect((await lerResultado()).attemptCount).toBe(2);
  });
});
