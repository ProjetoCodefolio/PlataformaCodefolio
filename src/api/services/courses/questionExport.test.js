import { describe, it, expect } from "vitest";
import {
  QUESTIONS_CSV_HEADER,
  buildQuestionsCsv,
  questionsCsvFilename,
  orderQuestionsByCourseContent,
  createExerciseListDraft,
  buildExerciseListDocument,
  exerciseListFilename,
  DEFAULT_ANSWER_LINES,
} from "./questionExport";

const TZ = "America/Sao_Paulo";

const duvidas = [
  {
    id: "q1",
    contentId: "aula2",
    contentTitle: "Aula 2",
    text: "O que é acoplamento?",
    userId: "u1",
    userName: "Maria Silva",
    createdAt: "2026-10-14T13:32:00.000Z",
    discussed: false,
    discussedAt: null,
  },
  {
    id: "q2",
    contentId: "aula1",
    contentTitle: "Aula 1",
    text: 'Quando usar "interface"?',
    userId: "u2",
    userName: "João Souza",
    createdAt: "2026-10-13T12:00:00.000Z",
    discussed: true,
    discussedAt: "2026-10-15T17:00:00.000Z",
  },
  {
    id: "q3",
    contentId: "aula1",
    contentTitle: "Aula 1",
    text: "E classe abstrata?",
    userId: "u3",
    userName: "Ana Lima",
    createdAt: "2026-10-12T12:00:00.000Z",
    discussed: false,
    discussedAt: null,
  },
];

describe("buildQuestionsCsv", () => {
  it("sai com o cabeçalho e uma linha por dúvida, na ordem recebida", () => {
    const linhas = buildQuestionsCsv(duvidas, { timeZone: TZ }).split("\n");

    expect(linhas[0]).toBe(QUESTIONS_CSV_HEADER.map((c) => `"${c}"`).join(","));
    expect(linhas).toHaveLength(4);
    expect(linhas[1]).toBe(
      '"Aula 2","O que é acoplamento?","Maria Silva","14/10/2026, 10:32","Pendente",""'
    );
  });

  it("escapa aspas e preenche a data de discussão só da discutida", () => {
    const linha = buildQuestionsCsv([duvidas[1]], { timeZone: TZ }).split("\n")[1];
    expect(linha).toBe(
      '"Aula 1","Quando usar ""interface""?","João Souza","13/10/2026, 09:00","Discutida","15/10/2026, 14:00"'
    );
  });

  it("sem dúvidas, sai só o cabeçalho", () => {
    expect(buildQuestionsCsv([]).split("\n")).toHaveLength(1);
    expect(buildQuestionsCsv(null).split("\n")).toHaveLength(1);
  });
});

it("questionsCsvFilename segue o padrão dos outros CSV", () => {
  expect(questionsCsvFilename("curso-x", new Date("2026-10-14T12:00:00Z"))).toBe(
    "duvidas_curso-x_2026-10-14.csv"
  );
});

describe("orderQuestionsByCourseContent", () => {
  it("segue a ordem dos conteúdos no curso e, dentro de cada um, a data", () => {
    const ordem = orderQuestionsByCourseContent(duvidas, ["aula1", "aula2"]);
    expect(ordem.map((q) => q.id)).toEqual(["q3", "q2", "q1"]);
  });

  it("conteúdo que não está mais no curso vai para o fim", () => {
    const ordem = orderQuestionsByCourseContent(duvidas, ["aula2"]);
    expect(ordem.map((q) => q.id)).toEqual(["q1", "q3", "q2"]);
  });

  it("não mexe na lista recebida", () => {
    const copia = [...duvidas];
    orderQuestionsByCourseContent(duvidas, ["aula1", "aula2"]);
    expect(duvidas).toEqual(copia);
  });
});

describe("createExerciseListDraft", () => {
  const draft = createExerciseListDraft({
    courseTitle: "Banco de Dados",
    questions: duvidas,
    contentOrder: ["aula1", "aula2"],
    today: new Date("2026-10-14T15:00:00Z"),
  });

  it("preenche o cabeçalho e deixa todas as opções desligadas", () => {
    expect(draft.header).toEqual({
      courseName: "Banco de Dados",
      title: "Lista de exercícios",
      date: "14/10/2026",
      instructions: "",
    });
    expect(draft.options).toEqual({
      studentFields: false,
      showContent: false,
      answerSpace: false,
      answerLines: DEFAULT_ANSWER_LINES,
    });
  });

  it("os itens vêm na ordem do curso e SEM o autor", () => {
    expect(draft.items).toEqual([
      { id: "q3", text: "E classe abstrata?", contentTitle: "Aula 1" },
      { id: "q2", text: 'Quando usar "interface"?', contentTitle: "Aula 1" },
      { id: "q1", text: "O que é acoplamento?", contentTitle: "Aula 2" },
    ]);
    const tudo = JSON.stringify(draft);
    for (const nome of ["Maria Silva", "João Souza", "Ana Lima", "u1", "u2", "u3"]) {
      expect(tudo).not.toContain(nome);
    }
  });
});

describe("buildExerciseListDocument", () => {
  const base = {
    header: { courseName: " Banco de Dados ", title: "Lista 3", date: "", instructions: "  " },
    options: { studentFields: false, showContent: false, answerSpace: false, answerLines: 5 },
    items: [
      { id: "a", text: " Primeiro ", contentTitle: "Aula 1" },
      { id: "b", text: "   ", contentTitle: "Aula 1" },
      { id: "c", text: "Terceiro", contentTitle: "Aula 2" },
    ],
  };

  it("limpa os textos, descarta item vazio e renumera de 1 a N", () => {
    const doc = buildExerciseListDocument(base);
    expect(doc).toEqual({
      courseName: "Banco de Dados",
      title: "Lista 3",
      date: "",
      instructions: "",
      studentFields: false,
      exercises: [
        { number: 1, text: "Primeiro", reference: "", answerLines: 0 },
        { number: 2, text: "Terceiro", reference: "", answerLines: 0 },
      ],
    });
  });

  it("aplica as opções: campos do aluno, conteúdo e linhas de resposta", () => {
    const doc = buildExerciseListDocument({
      ...base,
      options: { studentFields: true, showContent: true, answerSpace: true, answerLines: 10 },
    });
    expect(doc.studentFields).toBe(true);
    expect(doc.exercises[0]).toEqual({
      number: 1,
      text: "Primeiro",
      reference: "Aula 1",
      answerLines: 10,
    });
  });
});

describe("exerciseListFilename", () => {
  it("tira acentos e pontuação do título", () => {
    expect(exerciseListFilename("Lista 3: Álgebra Relacional", "docx")).toBe(
      "lista-3-algebra-relacional.docx"
    );
  });

  it("título vazio vira um nome padrão", () => {
    expect(exerciseListFilename("  ", "pdf")).toBe("lista-de-exercicios.pdf");
  });
});
