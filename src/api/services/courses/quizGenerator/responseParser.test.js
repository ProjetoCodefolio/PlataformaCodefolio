import { describe, it, expect } from "vitest";
import {
  parseGroqResponse,
  validateParsedQuestions,
  extrairArrayDeQuestoes,
} from "./responseParser";
import { QUESTION_TYPES } from "./constants";

const mcQuestion = (n) => ({
  question: `Pergunta ${n}?`,
  options: ["A", "B", "C", "D"],
  correctOption: 0,
});

const openQuestion = (n) => ({
  question: `Pergunta discursiva ${n}?`,
  expectedAnswer: `Resposta esperada ${n}.`,
});

describe("parseGroqResponse — as 5 estratégias de recuperação de JSON", () => {
  it("tentativa 1: array JSON direto", () => {
    const response = JSON.stringify([mcQuestion(1), mcQuestion(2)]);
    expect(parseGroqResponse(response)).toHaveLength(2);
  });

  it("tentativa 1: objeto com propriedade .questions", () => {
    const response = JSON.stringify({ questions: [mcQuestion(1)] });
    expect(parseGroqResponse(response)).toHaveLength(1);
  });

  it("tentativa 2: array JSON embutido em texto ao redor", () => {
    const array = JSON.stringify([mcQuestion(1), mcQuestion(2)]);
    const response = `Aqui estão as questões geradas:\n${array}\nEspero que ajude!`;
    expect(parseGroqResponse(response)).toHaveLength(2);
  });

  it("tentativa 3: bloco de código markdown ```json", () => {
    const array = JSON.stringify([mcQuestion(1)]);
    const response = `Segue o resultado:\n\`\`\`json\n${array}\n\`\`\`\nQualquer dúvida, avise.`;
    expect(parseGroqResponse(response)).toHaveLength(1);
  });

  it("tentativa 4: corrige vírgula extra antes de fechar array/objeto", () => {
    const response = `[{"question":"Q?","options":["A","B"],"correctOption":0,},]`;
    expect(parseGroqResponse(response)).toHaveLength(1);
  });

  it("tentativa 4: corrige aspas simples para duplas", () => {
    const response = `[{'question': 'O que é X?', 'options': ['A','B'], 'correctOption': 0}]`;
    const result = parseGroqResponse(response);
    expect(result).toHaveLength(1);
    expect(result[0].question).toBe("O que é X?");
  });

  it("tentativa 5: recupera questões completas de uma resposta truncada (array nunca fechado)", () => {
    const truncated =
      '[{"question":"Q1?","options":["A","B"],"correctOption":0},{"question":"Q2?","options":["C","D"],"correctOpt';
    const result = parseGroqResponse(truncated);
    expect(result).toHaveLength(1);
    expect(result[0].question).toBe("Q1?");
  });

  it("todas as tentativas falham: lança JSON_PARSE_ERROR com diagnóstico", () => {
    const response = "Desculpe, não consigo gerar questões sobre esse tópico.";
    try {
      parseGroqResponse(response);
      throw new Error("deveria ter lançado");
    } catch (error) {
      expect(error.errorType).toBe("JSON_PARSE_ERROR");
      expect(error.details.parseError).toContain("não contém estrutura JSON");
    }
  });

  it("conteúdo vazio: lança INVALID_RESPONSE_FORMAT", () => {
    expect(() => parseGroqResponse("")).toThrowError();
    try {
      parseGroqResponse("");
    } catch (error) {
      expect(error.errorType).toBe("INVALID_RESPONSE_FORMAT");
    }
  });

  it("questões abertas seguem a mesma cadeia de tentativas", () => {
    const response = JSON.stringify([openQuestion(1)]);
    const result = parseGroqResponse(response, QUESTION_TYPES.OPEN);
    expect(result).toHaveLength(1);
    expect(result[0].expectedAnswer).toBe("Resposta esperada 1.");
  });
});

describe("validateParsedQuestions", () => {
  it("rejeita array vazio", () => {
    expect(() => validateParsedQuestions([])).toThrowError();
  });

  it("descarta questões de múltipla escolha com options insuficientes ou correctOption fora do range", () => {
    const questions = [
      mcQuestion(1),
      { question: "Sem options", options: ["só uma"], correctOption: 0 },
      { question: "Índice inválido", options: ["A", "B"], correctOption: 5 },
    ];
    const result = validateParsedQuestions(questions);
    expect(result).toHaveLength(1);
    expect(result[0].question).toBe("Pergunta 1?");
  });

  it("rejeita tudo e lança NO_VALID_QUESTIONS quando nenhuma questão é válida", () => {
    const questions = [{ question: "" }, { options: [] }];
    try {
      validateParsedQuestions(questions);
      throw new Error("deveria ter lançado");
    } catch (error) {
      expect(error.errorType).toBe("NO_VALID_QUESTIONS");
    }
  });

  it("valida questões abertas exigindo question e expectedAnswer", () => {
    const questions = [
      openQuestion(1),
      { question: "Sem gabarito" },
    ];
    const result = validateParsedQuestions(questions, QUESTION_TYPES.OPEN);
    expect(result).toHaveLength(1);
  });
});

describe("extrairArrayDeQuestoes", () => {
  it("devolve o array cru, sem validar, para a colagem de JSON reusar", () => {
    const bruto = [{ question: "Q?", options: ["A"] }];
    expect(extrairArrayDeQuestoes(JSON.stringify(bruto))).toEqual(bruto);
  });

  it("não engole o erro de validação quando o JSON é lido mas nada é válido", () => {
    // Antes, a validação rodava dentro do try da primeira tentativa e o erro
    // era engolido, virando um "não foi possível interpretar" que escondia o
    // motivo real. Extração e validação agora são etapas separadas.
    try {
      parseGroqResponse(JSON.stringify([{ question: "sem alternativas" }]));
      throw new Error("deveria ter lançado");
    } catch (error) {
      expect(error.errorType).toBe("NO_VALID_QUESTIONS");
      expect(error.details.invalidReasons[0]).toContain("Questão 1");
    }
  });
});
