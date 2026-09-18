import { describe, it, expect } from "vitest";
import {
  parseQuestoesColadas,
  MAX_QUESTOES_POR_COLAGEM,
} from "./pastedQuestions";

const mc = (extra = {}) => ({
  question: "Qual é a capital da França?",
  options: ["Paris", "Londres", "Roma"],
  correctOption: 0,
  ...extra,
});

const colar = (valor) => parseQuestoesColadas(JSON.stringify(valor));

describe("parseQuestoesColadas - formatos aceitos", () => {
  it("lê um array JSON puro", () => {
    const { questoes, erros } = colar([mc(), mc({ question: "Outra?" })]);

    expect(erros).toEqual([]);
    expect(questoes).toHaveLength(2);
    expect(questoes[0]).toMatchObject({
      question: "Qual é a capital da França?",
      options: ["Paris", "Londres", "Roma"],
      correctOption: 0,
      questionType: "multiple-choice",
    });
  });

  it("lê um objeto com a propriedade questions", () => {
    const { questoes } = colar({ questions: [mc()] });
    expect(questoes).toHaveLength(1);
  });

  it("lê o JSON dentro de um bloco de código markdown", () => {
    const texto = "Segue:\n```json\n" + JSON.stringify([mc()]) + "\n```\nAbraço.";
    const { questoes, erros } = parseQuestoesColadas(texto);

    expect(erros).toEqual([]);
    expect(questoes).toHaveLength(1);
  });

  it("lê o JSON cercado de prosa", () => {
    const texto = `Aqui estão as questões:\n${JSON.stringify([mc()])}\nEspero que ajude.`;
    expect(parseQuestoesColadas(texto).questoes).toHaveLength(1);
  });
});

describe("parseQuestoesColadas - gabarito", () => {
  it("aceita correctOption como índice", () => {
    const { questoes } = colar([mc({ correctOption: 2 })]);
    expect(questoes[0].correctOption).toBe(2);
  });

  it("aceita correct_answer por letra", () => {
    const { questoes } = colar([
      { question: "Q?", options: ["Paris", "Londres"], correct_answer: "B" },
    ]);
    expect(questoes[0].correctOption).toBe(1);
  });

  it("aceita correct_answer pelo texto da alternativa", () => {
    const { questoes } = colar([
      { question: "Q?", options: ["Paris", "Londres"], correct_answer: "Londres" },
    ]);
    expect(questoes[0].correctOption).toBe(1);
  });

  it("aponta a questão cujo correctOption está fora do intervalo", () => {
    const { questoes, erros } = colar([mc(), mc({ correctOption: 7 })]);

    expect(questoes).toEqual([]);
    expect(erros).toHaveLength(1);
    expect(erros[0]).toContain("Questão 2");
    expect(erros[0]).toContain("fora do intervalo");
  });

  it("aponta a questão sem gabarito nenhum", () => {
    const { erros } = colar([{ question: "Q?", options: ["A", "B"] }]);
    expect(erros[0]).toContain("gabarito ausente");
  });

  it("aponta o correct_answer que não corresponde a alternativa nenhuma", () => {
    const { erros } = colar([
      { question: "Q?", options: ["Paris", "Londres"], correct_answer: "Lisboa" },
    ]);
    expect(erros[0]).toContain("não corresponde");
  });
});

describe("parseQuestoesColadas - pergunta sem resposta certa", () => {
  it("aceita graded false sem exigir gabarito", () => {
    const { questoes, erros } = colar([
      { question: "O que achou da aula?", options: ["Boa", "Ruim"], graded: false },
    ]);

    expect(erros).toEqual([]);
    expect(questoes[0].graded).toBe(false);
    expect(questoes[0].correctOption).toBeUndefined();
  });

  it("aceita a escala Likert de 5 pontos", () => {
    const { questoes } = colar([
      {
        question: "Quanto você concorda?",
        options: ["1", "2", "3", "4", "5"],
        graded: false,
        scale: "likert-5",
      },
    ]);

    expect(questoes[0].scale).toBe("likert-5");
  });

  it("recusa uma escala desconhecida", () => {
    const { erros } = colar([
      { question: "Q?", options: ["A", "B"], graded: false, scale: "likert-7" },
    ]);
    expect(erros[0]).toContain("scale");
  });
});

describe("parseQuestoesColadas - questão aberta", () => {
  it("aceita questionType open-ended com resposta esperada", () => {
    const { questoes, erros } = colar([
      {
        question: "Explique a fotossíntese.",
        questionType: "open-ended",
        expectedAnswer: "Processo de produção de glicose com luz.",
      },
    ]);

    expect(erros).toEqual([]);
    expect(questoes[0]).toMatchObject({
      questionType: "open-ended",
      expectedAnswer: "Processo de produção de glicose com luz.",
    });
    expect(questoes[0].options).toBeUndefined();
  });

  it("trata como aberta a questão sem options", () => {
    const { questoes } = colar([{ question: "Disserte sobre clorofila." }]);
    expect(questoes[0].questionType).toBe("open-ended");
  });
});

describe("parseQuestoesColadas - imagem opcional", () => {
  it("carrega imageUrl com largura e altura", () => {
    const { questoes } = colar([
      mc({ imageUrl: " https://ex.com/a.png ", imageWidth: 320, imageHeight: 240 }),
    ]);

    expect(questoes[0]).toMatchObject({
      imageUrl: "https://ex.com/a.png",
      imageWidth: 320,
      imageHeight: 240,
    });
  });

  it("ignora dimensão inválida e imagem sem url", () => {
    const { questoes } = colar([mc({ imageUrl: "  ", imageWidth: 0 })]);
    expect(questoes[0].imageUrl).toBeUndefined();
    expect(questoes[0].imageWidth).toBeUndefined();
  });
});

describe("parseQuestoesColadas - id colado", () => {
  it("descarta o id que veio na colagem", () => {
    const { questoes } = colar([mc({ id: "id-de-outro-quiz" })]);
    expect(questoes[0].id).toBeUndefined();
  });
});

describe("parseQuestoesColadas - erros que barram a importação inteira", () => {
  it("recusa texto vazio", () => {
    expect(parseQuestoesColadas("").erros).toHaveLength(1);
    expect(parseQuestoesColadas("   ").erros).toHaveLength(1);
  });

  it("recusa texto que não contém JSON", () => {
    const { questoes, erros } = parseQuestoesColadas("umas questões aí, por favor");
    expect(questoes).toEqual([]);
    expect(erros).toHaveLength(1);
  });

  it("recusa array vazio", () => {
    expect(colar([]).erros[0]).toContain("Nenhuma questão");
  });

  it("recusa a colagem acima do teto de questões", () => {
    const muitas = Array.from({ length: MAX_QUESTOES_POR_COLAGEM + 1 }, () => mc());
    const { questoes, erros } = colar(muitas);

    expect(questoes).toEqual([]);
    expect(erros[0]).toContain(String(MAX_QUESTOES_POR_COLAGEM));
  });

  it("não importa as válidas quando alguma questão está errada", () => {
    const { questoes, erros } = colar([mc(), mc({ question: "" }), mc()]);

    expect(questoes).toEqual([]);
    expect(erros).toHaveLength(1);
    expect(erros[0]).toContain("Questão 2");
  });

  it("aponta alternativa de menos e de mais", () => {
    const { erros } = colar([
      mc({ options: ["só uma"] }),
      mc({ options: ["1", "2", "3", "4", "5", "6"] }),
    ]);

    expect(erros).toHaveLength(2);
    expect(erros[0]).toContain("mínimo");
    expect(erros[1]).toContain("máximo");
  });

  it("aponta alternativa vazia", () => {
    const { erros } = colar([mc({ options: ["Paris", "  "] })]);
    expect(erros[0]).toContain("alternativa vazia");
  });

  it("aponta o item que não é um objeto", () => {
    const { erros } = colar([mc(), "só um texto solto"]);
    expect(erros[0]).toContain("Questão 2");
  });
});
