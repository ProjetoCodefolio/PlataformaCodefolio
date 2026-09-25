import { describe, it, expect, vi } from "vitest";

// `computeQuizGradeFromResults`/`exportQuizGradesToCSV` são PURAS, mas o
// módulo importa o config do Firebase no topo (quebra em ambiente de teste
// sem emulador). Mockamos o config: nenhuma das duas toca o banco.
vi.mock("../../config/firebase", () => ({ database: {} }));

const { computeQuizGradeFromResults, exportQuizGradesToCSV, filterPublishedQuizzes } =
  await import("./quizAggregation.js");

const gradedQuestion = (id) => ({ id, questionType: "multiple-choice" });

const baseQuiz = (overrides = {}) => ({
  id: "video-1",
  videoId: "video-1",
  minPercentage: 60,
  isDiagnostic: false,
  isSlideQuiz: false,
  attemptLimit: Infinity,
  questions: [gradedQuestion("q1"), gradedQuestion("q2"), gradedQuestion("q3"), gradedQuestion("q4")],
  ...overrides,
});

const noBonus = { correctAnswers: 0, wrongAnswers: 0, totalQuestions: 4 };

describe("computeQuizGradeFromResults", () => {
  it("calcula a nota base a partir só do quiz regular, sem bônus", () => {
    const result = computeQuizGradeFromResults(baseQuiz(), {
      regularResult: { correctAnswers: 3, attemptCount: 1 },
      liveResult: noBonus,
      customResult: { correctAnswers: 0 },
    });

    expect(result.basePercentage).toBe(75);
    expect(result.totalPercentage).toBe(75);
    expect(result.grade).toBe(7.5);
    expect(result.passed).toBe(true);
    expect(result.passedBase).toBe(true);
    expect(result.hasAttempt).toBe(true);
    expect(result.hasBonus).toBe(false);
  });

  it("soma bônus de live e custom quiz, podendo passar de 100%/10", () => {
    const result = computeQuizGradeFromResults(baseQuiz(), {
      regularResult: { correctAnswers: 4, attemptCount: 1 },
      liveResult: { correctAnswers: 2, wrongAnswers: 2, totalQuestions: 4 },
      customResult: { correctAnswers: 1 },
    });

    // base 100% + live 50% + custom 25% = 175%
    expect(result.basePercentage).toBe(100);
    expect(result.bonusPercentage).toBe(75);
    expect(result.totalPercentage).toBe(175);
    expect(result.grade).toBe(17.5);
    expect(result.hasBonus).toBe(true);
    expect(result.details).toEqual({ regular: 4, live: 2, custom: 1, liveWrong: 2 });
  });

  it("reprovado na base mas aprovado só por causa do bônus: passedBase e passed divergem", () => {
    const result = computeQuizGradeFromResults(baseQuiz({ minPercentage: 70 }), {
      regularResult: { correctAnswers: 2, attemptCount: 1 }, // 50% base
      liveResult: { correctAnswers: 1, wrongAnswers: 0, totalQuestions: 4 }, // +25%
      customResult: { correctAnswers: 0 },
    });

    expect(result.basePercentage).toBe(50);
    expect(result.totalPercentage).toBe(75);
    expect(result.passedBase).toBe(false);
    expect(result.passed).toBe(true);
  });

  it("hasAttempt fica true mesmo com zero acertos, se attemptCount indica submissão", () => {
    const result = computeQuizGradeFromResults(baseQuiz(), {
      regularResult: { correctAnswers: 0, attemptCount: 1 },
      liveResult: noBonus,
      customResult: { correctAnswers: 0 },
    });

    expect(result.hasAttempt).toBe(true);
    expect(result.totalCorrect).toBe(0);
    expect(result.grade).toBe(0);
  });

  it("hasAttempt fica false quando o aluno nunca fez nenhum dos 3 tipos de quiz", () => {
    const result = computeQuizGradeFromResults(baseQuiz(), {
      regularResult: null,
      liveResult: noBonus,
      customResult: { correctAnswers: 0 },
    });

    expect(result.hasAttempt).toBe(false);
    expect(result.attemptCount).toBe(0);
  });

  it("quiz de opinião (sem nenhuma questão que vale nota) é sinalizado via isOpinion", () => {
    const opinionQuiz = baseQuiz({
      questions: [{ id: "q1", questionType: "multiple-choice", graded: false }],
    });

    const result = computeQuizGradeFromResults(opinionQuiz, {
      regularResult: { correctAnswers: 0, attemptCount: 1 },
      liveResult: noBonus,
      customResult: { correctAnswers: 0 },
    });

    expect(result.isOpinion).toBe(true);
    expect(result.totalQuestions).toBe(0);
    expect(result.hasAttempt).toBe(true);
  });

  it("questões abertas não entram no total que vale nota, mas são contadas em totalOpenEnded", () => {
    const quiz = baseQuiz({
      questions: [
        gradedQuestion("q1"),
        gradedQuestion("q2"),
        { id: "q3", questionType: "open-ended" },
      ],
    });

    const result = computeQuizGradeFromResults(quiz, {
      regularResult: { correctAnswers: 2, attemptCount: 1 },
      liveResult: noBonus,
      customResult: { correctAnswers: 0 },
    });

    expect(result.totalQuestions).toBe(2);
    expect(result.totalOpenEnded).toBe(1);
    expect(result.basePercentage).toBe(100);
  });

  it("repassa attemptLimit e normaliza isDiagnostic do quiz", () => {
    const quiz = baseQuiz({ isDiagnostic: "true", attemptLimit: 3 });
    const result = computeQuizGradeFromResults(quiz, {
      regularResult: null,
      liveResult: noBonus,
      customResult: { correctAnswers: 0 },
    });

    expect(result.isDiagnostic).toBe(true);
    expect(result.attemptLimit).toBe(3);
  });
});

describe("exportQuizGradesToCSV", () => {
  const quiz = baseQuiz({ id: "video-1", videoId: "video-1" });
  const videoNames = { "video-1": "Aula 1" };

  it("monta cabeçalho com nome do quiz, contagem de questões e tipo (vídeo/slide)", () => {
    const csv = exportQuizGradesToCSV([], [quiz], videoNames, {});
    const headerLine = csv.split("\n")[0];

    expect(headerLine).toContain("Aula 1 [Vídeo] (4 questões) - Nota Final");
    expect(headerLine).toContain("Nome do Estudante");
    expect(headerLine).toContain("Média Geral do Curso");
  });

  it("marca quiz diagnóstico com o prefixo no cabeçalho", () => {
    const diagnosticQuiz = baseQuiz({ isDiagnostic: true });
    const csv = exportQuizGradesToCSV([], [diagnosticQuiz], videoNames, {});
    expect(csv.split("\n")[0]).toContain("📋 Aula 1");
  });

  it("resolve nome de quiz de slide via slideNames e marca o tipo [Slide]", () => {
    const slideQuiz = baseQuiz({ id: "slide_abc", isSlideQuiz: true });
    const csv = exportQuizGradesToCSV([], [slideQuiz], {}, { abc: "Slide 1" });
    expect(csv.split("\n")[0]).toContain("Slide 1 [Slide]");
  });

  it("aluno sem tentativa aparece com traço e zeros nas colunas do quiz", () => {
    const student = {
      name: "Ana",
      email: "ana@example.com",
      quizGrades: [{ quizId: "video-1", hasAttempt: false }],
      averageGrade: 0,
      attemptedQuizzes: 0,
      totalQuizzes: 1,
      passedQuizzes: 0,
      totalEvaluative: 1,
      completionRate: 0,
    };

    const csv = exportQuizGradesToCSV([student], [quiz], videoNames, {});
    const row = csv.split("\n")[1];
    expect(row).toContain('"-","0","0","0"');
  });

  it("aluno com tentativa mostra a nota e o detalhamento por tipo", () => {
    const student = {
      name: "Bruno",
      email: "bruno@example.com",
      quizGrades: [
        {
          quizId: "video-1",
          hasAttempt: true,
          grade: 8.5,
          details: { regular: 3, live: 1, custom: 0 },
        },
      ],
      averageGrade: 8.5,
      attemptedQuizzes: 1,
      totalQuizzes: 1,
      passedQuizzes: 1,
      totalEvaluative: 1,
      completionRate: 100,
    };

    const csv = exportQuizGradesToCSV([student], [quiz], videoNames, {});
    const row = csv.split("\n")[1];
    expect(row).toContain('"8.50","3","1","0"');
    expect(row).toContain('"1/1"');
    expect(row).toContain('"100"');
  });

  it("linha de resumo traz a média geral e a taxa de conclusão média da turma", () => {
    const students = [
      { name: "A", email: "a@x.com", quizGrades: [], averageGrade: 8, attemptedQuizzes: 1, totalQuizzes: 1, passedQuizzes: 1, totalEvaluative: 1, completionRate: 100 },
      { name: "B", email: "b@x.com", quizGrades: [], averageGrade: 6, attemptedQuizzes: 1, totalQuizzes: 1, passedQuizzes: 1, totalEvaluative: 1, completionRate: 50 },
    ];

    const csv = exportQuizGradesToCSV(students, [quiz], videoNames, {});
    const lines = csv.split("\n");
    const summaryRow = lines[lines.length - 1];

    expect(summaryRow).toContain("RESUMO DA TURMA");
    expect(summaryRow).toContain('"7.00"'); // média de 8 e 6
    expect(summaryRow).toContain('"75"'); // média de 100 e 50
  });
});

describe("filterPublishedQuizzes", () => {
  const NOW = new Date("2026-03-01T12:00:00.000Z");
  const FUTURE = "2026-03-10T12:00:00.000Z";
  const PAST = "2026-02-01T12:00:00.000Z";

  it("tira quiz programado e quiz de conteúdo programado", () => {
    const quizzes = [
      { id: "a" },
      { id: "b", publishAt: FUTURE },
      { id: "c" },
      { id: "slide_d" },
      { id: "e", publishAt: PAST },
    ];
    const contentPublishAt = { c: FUTURE, slide_d: PAST };
    expect(filterPublishedQuizzes(quizzes, contentPublishAt, NOW).map((q) => q.id)).toEqual([
      "a",
      "slide_d",
      "e",
    ]);
  });
});
