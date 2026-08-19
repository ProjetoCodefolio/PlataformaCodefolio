import { describe, it, expect, vi } from "vitest";

// Os filtros e a validação são PUROS, mas o módulo importa o config do Firebase
// no topo (que quebra em ambiente de teste). Mockamos o config: nada aqui toca
// o banco.
vi.mock("../../config/firebase", () => ({ database: {}, auth: {}, analytics: {} }));

const {
  validateQuestionText,
  filterCourseQuestions,
  summarizeQuestionsByContent,
  normalizeCourseQuestions,
  MAX_QUESTION_LENGTH,
} = await import("./questions.js");

const duvidas = [
  {
    id: "q1",
    contentId: "aula1",
    contentTitle: "Aula 1",
    text: "Como funciona o polimorfismo?",
    userName: "Maria Silva",
    discussed: false,
  },
  {
    id: "q2",
    contentId: "aula1",
    contentTitle: "Aula 1",
    text: "Quando usar interface?",
    userName: "João Souza",
    discussed: true,
  },
  {
    id: "q3",
    contentId: "aula2",
    contentTitle: "Aula 2",
    text: "O que é acoplamento?",
    userName: "Maria Antunes",
    discussed: false,
  },
];

describe("validateQuestionText", () => {
  it("recusa texto vazio ou só espaços", () => {
    expect(validateQuestionText("").isValid).toBe(false);
    expect(validateQuestionText("   ").isValid).toBe(false);
    expect(validateQuestionText(null).isValid).toBe(false);
  });

  it("recusa texto acima do limite", () => {
    const longo = "a".repeat(MAX_QUESTION_LENGTH + 1);
    expect(validateQuestionText(longo).isValid).toBe(false);
  });

  it("aceita texto dentro do limite", () => {
    expect(validateQuestionText("Como funciona?").isValid).toBe(true);
    expect(validateQuestionText("a".repeat(MAX_QUESTION_LENGTH)).isValid).toBe(true);
  });
});

describe("filterCourseQuestions", () => {
  it("sem filtros devolve tudo", () => {
    expect(filterCourseQuestions(duvidas)).toHaveLength(3);
  });

  it("filtra por conteúdo", () => {
    const resultado = filterCourseQuestions(duvidas, { contentId: "aula1" });
    expect(resultado.map((q) => q.id)).toEqual(["q1", "q2"]);
  });

  it("busca por aluno ignorando maiúsculas", () => {
    const resultado = filterCourseQuestions(duvidas, { searchTerm: "maria" });
    expect(resultado.map((q) => q.id)).toEqual(["q1", "q3"]);
  });

  it("a busca respeita o filtro de conteúdo aplicado", () => {
    // "Maria" aparece em aula1 e aula2; com o filtro em aula1 só a primeira vale.
    const resultado = filterCourseQuestions(duvidas, {
      contentId: "aula1",
      searchTerm: "maria",
    });
    expect(resultado.map((q) => q.id)).toEqual(["q1"]);
  });

  it("onlyPending descarta as já discutidas", () => {
    const resultado = filterCourseQuestions(duvidas, {
      contentId: "aula1",
      onlyPending: true,
    });
    expect(resultado.map((q) => q.id)).toEqual(["q1"]);
  });

  it("entrada inválida devolve lista vazia", () => {
    expect(filterCourseQuestions(null)).toEqual([]);
    expect(filterCourseQuestions(undefined, { contentId: "aula1" })).toEqual([]);
  });
});

describe("summarizeQuestionsByContent", () => {
  it("agrupa por conteúdo contando as dúvidas", () => {
    expect(summarizeQuestionsByContent(duvidas)).toEqual([
      { contentId: "aula1", contentTitle: "Aula 1", total: 2 },
      { contentId: "aula2", contentTitle: "Aula 2", total: 1 },
    ]);
  });

  it("ordena alfabeticamente, com números na ordem certa", () => {
    const fora = [
      { contentId: "c10", contentTitle: "Aula 10", text: "?", userName: "A" },
      { contentId: "c2", contentTitle: "Aula 2", text: "?", userName: "B" },
    ];
    expect(summarizeQuestionsByContent(fora).map((c) => c.contentTitle)).toEqual([
      "Aula 2",
      "Aula 10",
    ]);
  });

  it("ignora itens sem conteúdo associado", () => {
    expect(summarizeQuestionsByContent([{ id: "x", text: "?" }])).toEqual([]);
  });
});

// A normalização é o formato que TODAS as telas recebem, venha da busca pontual
// ou do observador em tempo real. Se ela divergir entre os dois caminhos, uma
// tela ao vivo passa a se comportar diferente da mesma tela recarregada.
describe("normalizeCourseQuestions", () => {
  it("devolve lista vazia para nó inexistente ou inválido", () => {
    expect(normalizeCourseQuestions(null)).toEqual([]);
    expect(normalizeCourseQuestions(undefined)).toEqual([]);
    expect(normalizeCourseQuestions("nada")).toEqual([]);
  });

  it("transforma o nó em lista com o id da chave e ordena da mais antiga para a mais nova", () => {
    const lista = normalizeCourseQuestions({
      antiga: {
        contentId: "aula1",
        contentTitle: "Aula 1",
        text: "Primeira",
        userId: "u1",
        userName: "Maria",
        createdAt: "2026-08-18T10:00:00.000Z",
        discussed: false,
      },
      nova: {
        contentId: "aula1",
        contentTitle: "Aula 1",
        text: "Segunda",
        userId: "u2",
        userName: "João",
        createdAt: "2026-08-18T11:00:00.000Z",
        discussed: true,
      },
    });

    expect(lista.map((d) => d.text)).toEqual(["Primeira", "Segunda"]);
    expect(lista[0].id).toBe("antiga");
    expect(lista[1].discussed).toBe(true);
  });

  it("preenche os campos que faltam e descarta entradas quebradas", () => {
    const lista = normalizeCourseQuestions({
      q1: { text: "Sem título de conteúdo" },
      q2: null,
      q3: "lixo",
    });

    expect(lista).toHaveLength(1);
    expect(lista[0].contentTitle).toBe("Conteúdo sem título");
    expect(lista[0].userName).toBe("Aluno");
    expect(lista[0].discussed).toBe(false);
    expect(lista[0].discussedAt).toBeNull();
  });
});
