import { describe, it, expect } from "vitest";
import {
  LIKERT_5_OPTIONS,
  LIKERT_5_SCALE,
  answerVerdict,
  hasVerdict,
  gradedQuestions,
  isGradedQuestion,
  isLikertQuestion,
  isOpinionQuiz,
  normalizeGradedFlag,
} from "./quizGrading.js";

const multipla = (extras = {}) => ({
  id: "q1",
  question: "Enunciado",
  questionType: "multiple-choice",
  options: ["A", "B"],
  correctOption: 0,
  ...extras,
});

const likert = (extras = {}) =>
  multipla({
    id: "q2",
    questionType: "multiple-choice",
    options: LIKERT_5_OPTIONS,
    scale: LIKERT_5_SCALE,
    graded: false,
    ...extras,
  });

const dissertativa = (extras = {}) => ({
  id: "q3",
  question: "Discorra",
  questionType: "open-ended",
  ...extras,
});

describe("normalizeGradedFlag", () => {
  it("trata a ausência como 'vale nota', para o acervo antigo seguir valendo", () => {
    expect(normalizeGradedFlag(undefined)).toBe(true);
    expect(normalizeGradedFlag(null)).toBe(true);
    expect(normalizeGradedFlag(true)).toBe(true);
  });

  it("só o false explícito desliga", () => {
    expect(normalizeGradedFlag(false)).toBe(false);
  });
});

describe("isGradedQuestion", () => {
  it("múltipla escolha comum vale nota", () => {
    expect(isGradedQuestion(multipla())).toBe(true);
    expect(isGradedQuestion(multipla({ graded: true }))).toBe(true);
  });

  it("questão marcada como sem resposta certa não vale", () => {
    expect(isGradedQuestion(multipla({ graded: false }))).toBe(false);
    expect(isGradedQuestion(likert())).toBe(false);
  });

  it("dissertativa nunca vale, mesmo marcada como graded", () => {
    // Ela é corrigida à mão em openEndedAnswers, fora do cálculo automático.
    expect(isGradedQuestion(dissertativa())).toBe(false);
    expect(isGradedQuestion(dissertativa({ graded: true }))).toBe(false);
  });

  it("aguenta lixo", () => {
    expect(isGradedQuestion(null)).toBe(false);
    expect(isGradedQuestion("questão")).toBe(false);
  });
});

describe("gradedQuestions", () => {
  it("mantém só o que vale nota, na ordem original", () => {
    const lista = [multipla(), likert(), dissertativa(), multipla({ id: "q4" })];
    expect(gradedQuestions(lista).map((q) => q.id)).toEqual(["q1", "q4"]);
  });

  it("aguenta lista ausente", () => {
    expect(gradedQuestions(null)).toEqual([]);
  });
});

describe("isLikertQuestion", () => {
  it("reconhece pela escala gravada, não pelas alternativas", () => {
    expect(isLikertQuestion(likert())).toBe(true);
    expect(isLikertQuestion(multipla({ options: LIKERT_5_OPTIONS }))).toBe(false);
  });
});

describe("isOpinionQuiz", () => {
  it("é de opinião quando nenhuma questão vale nota", () => {
    expect(isOpinionQuiz({ questions: [likert(), likert({ id: "q9" })] })).toBe(true);
    expect(isOpinionQuiz([likert()])).toBe(true);
  });

  it("não é de opinião se sobrar uma questão valendo nota", () => {
    expect(isOpinionQuiz({ questions: [likert(), multipla()] })).toBe(false);
  });

  it("quiz vazio não é questionário de opinião", () => {
    // Sem questão nenhuma não há o que responder; chamar de opinião faria um
    // quiz recém-criado passar por concluído.
    expect(isOpinionQuiz({ questions: [] })).toBe(false);
    expect(isOpinionQuiz(null)).toBe(false);
  });

  it("um quiz só de dissertativas também não tem nota automática", () => {
    expect(isOpinionQuiz({ questions: [dissertativa()] })).toBe(true);
  });
});

describe("LIKERT_5_OPTIONS", () => {
  it("é a escala de concordância em cinco pontos, do discordo ao concordo", () => {
    expect(LIKERT_5_OPTIONS).toEqual([
      "Discordo Totalmente",
      "Discordo Parcialmente",
      "Neutro",
      "Concordo Parcialmente",
      "Concordo Totalmente",
    ]);
  });
});

describe("answerVerdict", () => {
  const resposta = (over = {}) => ({
    questionType: "multiple-choice",
    userAnswer: 1,
    isCorrect: true,
    ...over,
  });

  it("distingue acerto de erro numa questão avaliada", () => {
    expect(answerVerdict(resposta())).toBe("correct");
    expect(answerVerdict(resposta({ isCorrect: false }))).toBe("incorrect");
  });

  it("pergunta sem resposta certa não tem veredito", () => {
    // A regressão: o selo do cabeçalho dizia "Incorreto" logo acima do aviso de
    // que a pergunta não tem resposta certa.
    expect(answerVerdict(resposta({ graded: false, isCorrect: false }))).toBe("ungraded");
    expect(hasVerdict(resposta({ graded: false, isCorrect: false }))).toBe(false);
  });

  it("dissertativa é caso próprio, e não erro", () => {
    expect(answerVerdict({ questionType: "open-ended", answer: "texto" })).toBe("open-ended");
    expect(hasVerdict({ questionType: "open-ended" })).toBe(false);
  });

  it("resposta avaliada tem veredito", () => {
    expect(hasVerdict(resposta())).toBe(true);
    expect(hasVerdict(resposta({ isCorrect: false }))).toBe(true);
  });
});
