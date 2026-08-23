import { describe, it, expect } from "vitest";
import {
  resolveUserOption,
  recomputeQuizResult,
  summarizeRecalculation,
} from "./quizRecalculation";

// Questão de referência: o aluno marcou "Paris" (índice 1), que era o gabarito
// gravado na submissão.
const question = (over = {}) => ({
  id: "q1",
  question: "Qual é a capital da França?",
  questionType: "multiple-choice",
  options: ["Londres", "Paris", "Roma"],
  correctOption: 1,
  ...over,
});

const savedAnswer = (over = {}) => ({
  question: "Qual é a capital da França?",
  questionType: "multiple-choice",
  userAnswer: 1,
  correctOption: 1,
  userAnswerText: "Paris",
  correctOptionText: "Paris",
  options: ["Londres", "Paris", "Roma"],
  isCorrect: true,
  ...over,
});

const result = (over = {}) => ({
  name: "Aluno Teste",
  email: "aluno@teste.com",
  scorePercentage: 100,
  correctAnswers: 1,
  totalQuestions: 1,
  isPassed: true,
  passed: true,
  minPercentage: 60,
  submittedAt: "2026-08-01T10:00:00.000Z",
  lastAttempt: "2026-08-01T10:00:00.000Z",
  completedAt: "2026-08-01T10:00:00.000Z",
  attemptCount: 2,
  isComplete: true,
  detailedAnswers: { q1: savedAnswer() },
  ...over,
});

describe("resolveUserOption", () => {
  it("usa o índice gravado quando as alternativas não mudaram", () => {
    const resolved = resolveUserOption(savedAnswer(), question({ correctOption: 2 }));

    expect(resolved.index).toBe(1);
    expect(resolved.matchedBy).toBe("snapshot");
    expect(resolved.ambiguous).toBe(false);
  });

  it("acompanha a alternativa pelo texto quando o professor reordena as opções", () => {
    // "Paris" saiu da posição 1 para a 2: o índice congelado apontaria para Roma.
    const reordenada = question({ options: ["Londres", "Roma", "Paris"], correctOption: 2 });
    const resolved = resolveUserOption(savedAnswer(), reordenada);

    expect(resolved.index).toBe(2);
    expect(resolved.matchedBy).toBe("text");
    expect(resolved.ambiguous).toBe(false);
  });

  it("mantém a posição original e sinaliza quando o texto da alternativa mudou", () => {
    const editada = question({ options: ["Londres", "Paris (França)", "Roma"] });
    const resolved = resolveUserOption(savedAnswer(), editada);

    expect(resolved.index).toBe(1);
    expect(resolved.matchedBy).toBe("index");
    expect(resolved.ambiguous).toBe(true);
  });

  it("desempata textos repetidos pelo índice gravado", () => {
    const duplicada = question({ options: ["Paris", "Paris", "Roma"] });
    const resolved = resolveUserOption(savedAnswer(), duplicada);

    expect(resolved.index).toBe(1);
    expect(resolved.ambiguous).toBe(false);
  });

  it("trata 'Não respondida' como questão sem resposta, sem marcar ambiguidade", () => {
    const resolved = resolveUserOption(
      savedAnswer({ userAnswer: null, userAnswerText: "Não respondida", options: null }),
      question()
    );

    expect(resolved.unanswered).toBe(true);
    expect(resolved.ambiguous).toBe(false);
  });

  it("marca como sem resposta quando a alternativa marcada deixou de existir", () => {
    const menor = question({ options: ["Londres"], correctOption: 0 });
    const resolved = resolveUserOption(savedAnswer(), menor);

    expect(resolved.unanswered).toBe(true);
    expect(resolved.ambiguous).toBe(true);
  });

  it("aceita options em formato de objeto e índice em string, como vêm do RTDB", () => {
    const resolved = resolveUserOption(
      savedAnswer({ userAnswer: "1", options: { 0: "Londres", 1: "Paris", 2: "Roma" } }),
      question({ options: { 0: "Londres", 1: "Paris", 2: "Roma" } })
    );

    expect(resolved.index).toBe(1);
    expect(resolved.matchedBy).toBe("snapshot");
  });
});

describe("recomputeQuizResult", () => {
  it("promove o aluno quando o gabarito é corrigido a favor dele", () => {
    const errado = result({
      scorePercentage: 0,
      correctAnswers: 0,
      isPassed: false,
      passed: false,
      detailedAnswers: {
        q1: savedAnswer({ correctOption: 0, correctOptionText: "Londres", isCorrect: false }),
      },
    });

    const recalc = recomputeQuizResult(errado, [question()], 60);

    expect(recalc.changed).toBe(true);
    expect(recalc.updates.correctAnswers).toBe(1);
    expect(recalc.updates.scorePercentage).toBe(100);
    expect(recalc.updates.isPassed).toBe(true);
    expect(recalc.updates.passedKeptByPolicy).toBe(false);
    expect(recalc.stats.ambiguous).toBe(0);
  });

  it("nunca rebaixa uma aprovação: corrige a nota e marca passedKeptByPolicy", () => {
    // Gabarito passa a ser Roma: o aluno que marcou Paris erra.
    const recalc = recomputeQuizResult(result(), [question({ correctOption: 2 })], 60);

    expect(recalc.updates.correctAnswers).toBe(0);
    expect(recalc.updates.scorePercentage).toBe(0);
    expect(recalc.updates.isPassed).toBe(true);
    expect(recalc.updates.passed).toBe(true);
    expect(recalc.updates.passedKeptByPolicy).toBe(true);
  });

  it("mantém a resposta de uma questão removida sem contá-la na nota", () => {
    const duas = result({
      correctAnswers: 1,
      totalQuestions: 2,
      scorePercentage: 50,
      detailedAnswers: {
        q1: savedAnswer(),
        q2: savedAnswer({ question: "Removida", userAnswer: 0, isCorrect: false }),
      },
    });

    const recalc = recomputeQuizResult(duas, [question()], 60);

    expect(recalc.updates.totalQuestions).toBe(1);
    expect(recalc.updates.scorePercentage).toBe(100);
    expect(recalc.updates.detailedAnswers.q2.removedFromQuiz).toBe(true);
    expect(recalc.stats.orphans).toBe(1);
  });

  it("descarta a resposta órfã quando keepOrphans é false", () => {
    const duas = result({
      detailedAnswers: { q1: savedAnswer(), q2: savedAnswer({ question: "Removida" }) },
    });

    const recalc = recomputeQuizResult(duas, [question()], 60, { keepOrphans: false });

    expect(recalc.updates.detailedAnswers.q2).toBeUndefined();
  });

  it("conta questão nova como erro, sem fingir que o aluno marcou a alternativa A", () => {
    const nova = question({ id: "q2", question: "Nova questão", correctOption: 0 });
    const recalc = recomputeQuizResult(result(), [question(), nova], 60);

    expect(recalc.updates.totalQuestions).toBe(2);
    expect(recalc.updates.correctAnswers).toBe(1);
    expect(recalc.updates.detailedAnswers.q2.userAnswer).toBe(-1);
    expect(recalc.updates.detailedAnswers.q2.isCorrect).toBe(false);
    expect(recalc.stats.unanswered).toBe(1);
  });

  it("recupera a resposta quando a questão foi apagada e recriada com o mesmo enunciado", () => {
    const recriada = question({ id: "q1-novo" });
    const recalc = recomputeQuizResult(result(), [recriada], 60);

    expect(recalc.updates.correctAnswers).toBe(1);
    expect(recalc.updates.detailedAnswers["q1-novo"].isCorrect).toBe(true);
    expect(recalc.stats.orphans).toBe(0);
  });

  it("não deixa questão aberta afetar a nota e preserva a correção do professor", () => {
    const aberta = {
      id: "qa",
      question: "Explique com suas palavras",
      questionType: "open-ended",
    };
    const comAberta = result({
      detailedAnswers: {
        q1: savedAnswer(),
        qa: {
          question: "Explique com suas palavras",
          questionType: "open-ended",
          answer: "minha resposta",
          graded: true,
          grade: 80,
          feedback: "bom",
          gradedAt: "2026-08-02T10:00:00.000Z",
        },
      },
    });

    const recalc = recomputeQuizResult(comAberta, [question(), aberta], 60);

    expect(recalc.updates.totalQuestions).toBe(1);
    expect(recalc.updates.scorePercentage).toBe(100);
    expect(recalc.updates.detailedAnswers.qa.answer).toBe("minha resposta");
    expect(recalc.updates.detailedAnswers.qa.grade).toBe(80);
    expect(recalc.updates.detailedAnswers.qa.feedback).toBe("bom");
  });

  it("reavalia a aprovação quando só a nota mínima do quiz muda", () => {
    const meio = result({
      scorePercentage: 50,
      correctAnswers: 1,
      totalQuestions: 2,
      isPassed: false,
      passed: false,
      minPercentage: 60,
      detailedAnswers: {
        q1: savedAnswer(),
        q2: savedAnswer({
          question: "Segunda",
          userAnswer: 0,
          userAnswerText: "Londres",
          isCorrect: false,
        }),
      },
    });
    const q2 = question({ id: "q2", question: "Segunda" });

    const recalc = recomputeQuizResult(meio, [question(), q2], 50);

    expect(recalc.updates.scorePercentage).toBe(50);
    expect(recalc.updates.isPassed).toBe(true);
    expect(recalc.changed).toBe(true);
  });

  it("não toca em resultado legado sem respostas detalhadas", () => {
    const legado = result({ detailedAnswers: undefined });

    const recalc = recomputeQuizResult(legado, [question({ correctOption: 2 })], 60);

    expect(recalc.skipped).toBe("sem-respostas-detalhadas");
    expect(recalc.updates).toBeNull();
    expect(recalc.changed).toBe(false);
  });

  it("ignora resultado fantasma, sem vestígio de submissão", () => {
    const fantasma = { isPassed: true, passed: true, attemptCount: 1 };

    const recalc = recomputeQuizResult(fantasma, [question()], 60);

    expect(recalc.skipped).toBe("sem-submissao");
    expect(recalc.updates).toBeNull();
  });

  it("não reescreve tentativas, datas nem identificação do aluno", () => {
    const recalc = recomputeQuizResult(result(), [question({ correctOption: 2 })], 60);

    ["attemptCount", "submittedAt", "lastAttempt", "completedAt", "name", "email"].forEach(
      (field) => expect(recalc.updates).not.toHaveProperty(field)
    );
  });

  it("é idempotente: recalcular de novo não gera outra escrita", () => {
    const alterada = question({ options: ["Londres", "Paris (França)", "Roma"] });

    const primeira = recomputeQuizResult(result(), [alterada], 60);
    expect(primeira.changed).toBe(true);

    const aplicada = { ...result(), ...primeira.updates };
    const segunda = recomputeQuizResult(aplicada, [alterada], 60);

    expect(segunda.changed).toBe(false);
  });
});

describe("recomputeQuizResult com pergunta sem resposta certa", () => {
  // Pergunta de opinião (escala Likert): tem alternativas, mas nenhuma é a
  // certa. Ela não pode entrar no denominador da nota nem aparecer como erro.
  const opiniao = (over = {}) => ({
    id: "q2",
    question: "O ritmo das aulas foi adequado",
    questionType: "multiple-choice",
    options: ["Discordo", "Neutro", "Concordo"],
    graded: false,
    scale: "likert-5",
    ...over,
  });

  const respostaOpiniao = (over = {}) => ({
    question: "O ritmo das aulas foi adequado",
    questionType: "multiple-choice",
    userAnswer: 2,
    options: ["Discordo", "Neutro", "Concordo"],
    ...over,
  });

  it("não entra no total nem derruba a nota de quem acertou tudo", () => {
    const recalculo = recomputeQuizResult(
      result({ detailedAnswers: { q1: savedAnswer(), q2: respostaOpiniao() } }),
      [question(), opiniao()],
      60
    );

    expect(recalculo.updates.totalQuestions).toBe(1);
    expect(recalculo.updates.correctAnswers).toBe(1);
    expect(recalculo.updates.scorePercentage).toBe(100);
    expect(recalculo.updates.isPassed).toBe(true);
  });

  it("guarda a escolha do aluno, sem gabarito, para a distribuição", () => {
    const recalculo = recomputeQuizResult(
      result({ detailedAnswers: { q1: savedAnswer(), q2: respostaOpiniao() } }),
      [question(), opiniao()],
      60
    );

    const entrada = recalculo.updates.detailedAnswers.q2;
    expect(entrada.graded).toBe(false);
    expect(entrada.userAnswer).toBe(2);
    expect(entrada.userAnswerText).toBe("Concordo");
    expect(entrada.correctOption).toBeUndefined();
    expect(entrada.correctOptionText).toBeUndefined();
    expect(entrada.isCorrect).toBe(false);
  });

  it("questionário só de opinião fica com 100% e aprovado", () => {
    // É o que impede um questionário de opinião de travar progresso e presença:
    // sem questão valendo nota, responder já é concluir.
    const recalculo = recomputeQuizResult(
      result({
        correctAnswers: 0,
        totalQuestions: 0,
        detailedAnswers: { q2: respostaOpiniao() },
      }),
      [opiniao()],
      60
    );

    expect(recalculo.updates.totalQuestions).toBe(0);
    expect(recalculo.updates.scorePercentage).toBe(100);
    expect(recalculo.updates.isPassed).toBe(true);
  });

  it("desligar o gabarito de uma questão recalcula a nota de quem tinha errado", () => {
    // O professor percebe que a pergunta induzia a resposta e desliga o
    // gabarito: quem "errou" deixa de ser penalizado por ela.
    const errou = savedAnswer({ userAnswer: 0, userAnswerText: "Londres", isCorrect: false });
    const recalculo = recomputeQuizResult(
      result({ correctAnswers: 0, scorePercentage: 0, isPassed: false, detailedAnswers: { q1: errou } }),
      [question({ graded: false })],
      60
    );

    expect(recalculo.updates.totalQuestions).toBe(0);
    expect(recalculo.updates.scorePercentage).toBe(100);
    expect(recalculo.updates.detailedAnswers.q1.graded).toBe(false);
  });
});

describe("summarizeRecalculation", () => {
  it("consolida promoções, aprovações mantidas e pendências de conferência", () => {
    const summary = summarizeRecalculation([
      {
        changed: true,
        skipped: null,
        name: "Ana",
        before: { scorePercentage: 0, isPassed: false },
        after: { scorePercentage: 100, isPassed: true },
        updates: { passedKeptByPolicy: false },
        stats: { ambiguous: 0, orphans: 0, unanswered: 0 },
      },
      {
        changed: true,
        skipped: null,
        name: "Bruno",
        before: { scorePercentage: 100, isPassed: true },
        after: { scorePercentage: 0, isPassed: true },
        updates: { passedKeptByPolicy: true },
        stats: { ambiguous: 2, orphans: 1, unanswered: 1 },
      },
      {
        changed: false,
        skipped: "sem-respostas-detalhadas",
        before: {},
        after: {},
        stats: {},
      },
    ]);

    expect(summary.processed).toBe(3);
    expect(summary.updated).toBe(2);
    expect(summary.skipped).toBe(1);
    expect(summary.scoreChanged).toBe(2);
    expect(summary.promoted).toBe(1);
    expect(summary.keptPassed).toBe(1);
    expect(summary.ambiguousAnswers).toBe(2);
    expect(summary.orphanAnswers).toBe(1);
    expect(summary.unansweredQuestions).toBe(1);
    expect(summary.studentsWithAmbiguity).toEqual(["Bruno"]);
  });
});
