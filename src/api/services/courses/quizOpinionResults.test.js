import { describe, it, expect, vi } from "vitest";

// A distribuição e o CSV são PUROS, mas vivem num módulo que importa o config do
// Firebase no topo (que chama getAnalytics e quebra em ambiente de teste).
vi.mock("../../config/firebase", () => ({ database: {}, auth: {}, analytics: {} }));

const { parseCsv } = await import("./gradesCsv.js");
const {
  buildOpinionDistribution,
  exportOpinionAnswersToCSV,
  selectedOptionIndex,
  OPINION_CSV_HEADER,
  SEM_RESPOSTA,
} = await import("./quizOpinionResults.js");

const LIKERT = ["Discordo fortemente", "Discordo", "Neutro", "Concordo", "Concordo fortemente"];

const opiniao = (id = "op1") => ({
  id,
  question: "O ritmo das aulas foi adequado",
  questionType: "multiple-choice",
  options: LIKERT,
  graded: false,
  scale: "likert-5",
});

const avaliada = () => ({
  id: "av1",
  question: "Complexidade da busca binária?",
  questionType: "multiple-choice",
  options: ["O(n)", "O(log n)"],
  correctOption: 1,
});

const envio = (nome, respostas, extras = {}) => ({
  userId: nome,
  name: nome,
  email: `${nome}@teste.com`,
  submittedAt: "2026-08-20T10:00:00.000Z",
  detailedAnswers: respostas,
  ...extras,
});

describe("selectedOptionIndex", () => {
  it("lê o formato atual e o antigo", () => {
    expect(selectedOptionIndex({ userAnswer: 3 })).toBe(3);
    expect(selectedOptionIndex({ userOption: 2 })).toBe(2);
  });

  it("trata o marcador de não respondida e o lixo como ausência", () => {
    expect(selectedOptionIndex({ userAnswer: -1 })).toBeNull();
    expect(selectedOptionIndex({ userAnswer: null })).toBeNull();
    expect(selectedOptionIndex({ userAnswer: "" })).toBeNull();
    expect(selectedOptionIndex(null)).toBeNull();
  });

  it("não confunde o índice 0 com ausência", () => {
    // `Discordo fortemente` é o índice 0; um `||` no lugar do `??` faria essa
    // resposta sumir da distribuição.
    expect(selectedOptionIndex({ userAnswer: 0 })).toBe(0);
  });
});

describe("buildOpinionDistribution", () => {
  it("conta quantos marcaram cada ponto da escala", () => {
    const [dist] = buildOpinionDistribution(
      [opiniao()],
      [
        envio("ana", { op1: { userAnswer: 4, graded: false } }),
        envio("bruno", { op1: { userAnswer: 4, graded: false } }),
        envio("carla", { op1: { userAnswer: 0, graded: false } }),
      ]
    );

    expect(dist.counts).toEqual([1, 0, 0, 0, 2]);
    expect(dist.totalRespondents).toBe(3);
    expect(dist.percentages[4]).toBeCloseTo(66.67, 1);
  });

  it("ignora as questões que valem nota", () => {
    const dist = buildOpinionDistribution(
      [avaliada(), opiniao()],
      [envio("ana", { av1: { userAnswer: 1 }, op1: { userAnswer: 2 } })]
    );

    expect(dist).toHaveLength(1);
    expect(dist[0].questionId).toBe("op1");
  });

  it("separa quem pulou de quem nem teve a pergunta", () => {
    // Quem respondeu antes de a pergunta existir não tem entrada nenhuma: contar
    // essa pessoa como "pulou" inventaria uma omissão que não houve.
    const [dist] = buildOpinionDistribution(
      [opiniao()],
      [
        envio("ana", { op1: { userAnswer: 1 } }),
        envio("bruno", { op1: { userAnswer: -1 } }),
        envio("carla", { outra: { userAnswer: 3 } }),
      ]
    );

    expect(dist.counts).toEqual([0, 1, 0, 0, 0]);
    expect(dist.unanswered).toBe(1);
    expect(dist.totalRespondents).toBe(2);
  });

  it("as porcentagens fecham em 100 entre quem escolheu alguma alternativa", () => {
    const [dist] = buildOpinionDistribution(
      [opiniao()],
      [
        envio("ana", { op1: { userAnswer: 0 } }),
        envio("bruno", { op1: { userAnswer: 1 } }),
        envio("carla", { op1: { userAnswer: -1 } }),
      ]
    );

    expect(dist.percentages.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 5);
  });

  it("aguenta quiz sem pergunta de opinião e ninguém respondendo", () => {
    expect(buildOpinionDistribution([avaliada()], [])).toEqual([]);

    const [dist] = buildOpinionDistribution([opiniao()], []);
    expect(dist.counts).toEqual([0, 0, 0, 0, 0]);
    expect(dist.percentages).toEqual([0, 0, 0, 0, 0]);
    expect(dist.totalRespondents).toBe(0);
  });
});

describe("exportOpinionAnswersToCSV", () => {
  const distribuicao = buildOpinionDistribution(
    [opiniao()],
    [envio("ana", { op1: { userAnswer: 3 } })]
  );

  it("gera uma linha por aluno e pergunta, com a escala em base 1", () => {
    const csv = exportOpinionAnswersToCSV(distribuicao, [
      envio("ana", { op1: { userAnswer: 3 } }),
    ]);
    const linhas = csv.trim().split("\n");

    expect(linhas[0]).toBe(OPINION_CSV_HEADER.join(","));
    expect(linhas[1]).toContain("Concordo");
    // Índice interno 3 → quarta posição da escala, que é o que a planilha soma.
    expect(linhas[1].split(",").at(-2)).toBe("4");
  });

  it("marca quem pulou sem inventar posição na escala", () => {
    const csv = exportOpinionAnswersToCSV(distribuicao, [
      envio("bruno", { op1: { userAnswer: -1 } }),
    ]);
    const celulas = csv.trim().split("\n")[1].split(",");

    expect(celulas).toContain(SEM_RESPOSTA);
    expect(celulas.at(-2)).toBe("");
  });

  it("escapa vírgula no enunciado sem quebrar as colunas", () => {
    const comVirgula = buildOpinionDistribution(
      [{ ...opiniao(), question: "As aulas, no geral, tiveram bom ritmo" }],
      [envio("ana", { op1: { userAnswer: 1 } })]
    );
    const csv = exportOpinionAnswersToCSV(comVirgula, [
      envio("ana", { op1: { userAnswer: 1 } }),
    ]);

    expect(csv).toContain('"As aulas, no geral, tiveram bom ritmo"');

    // Round-trip pelo mesmo parser do CSV de notas: as vírgulas do enunciado não
    // podem virar colunas a mais.
    const { header, rows } = parseCsv(csv);
    expect(header).toHaveLength(OPINION_CSV_HEADER.length);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveLength(OPINION_CSV_HEADER.length);
    expect(rows[0][2]).toBe("As aulas, no geral, tiveram bom ritmo");
  });

  it("devolve vazio quando não há o que exportar", () => {
    expect(exportOpinionAnswersToCSV([], [])).toBe("");
    expect(exportOpinionAnswersToCSV(distribuicao, [])).toBe("");
  });
});
