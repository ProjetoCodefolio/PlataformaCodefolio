import { describe, it, expect } from "vitest";
import {
  exportGradesToCSV,
  buildCsvHeader,
  parseCsv,
  parseGradeValue,
  buildGradesImportPlan,
} from "./gradesCsv";
import { computeStudentGradeSummary } from "./gradeSummary";

const assessments = [
  { id: "a1", name: "Prova 1", percentage: 40 },
  { id: "a2", name: "Prova 2", percentage: 60 },
];

// Monta um aluno no mesmo formato que fetchAllCourseGrades devolve
const makeStudent = (userId, name, email, gradesByAssessment) => ({
  userId,
  name,
  email,
  photoURL: "",
  ...computeStudentGradeSummary(gradesByAssessment, assessments),
});

const students = [
  makeStudent("u1", "Ana Souza", "ana@ex.com", { a1: { grade: 8 }, a2: { grade: 6 } }),
  makeStudent("u2", "Bruno Lima", "bruno@ex.com", { a1: { grade: 5 } }),
];

const header = "Nome,Email,Status,Prova 1 (40%),Prova 2 (60%),Nota Final";

const planFor = (csvText, roster = students) =>
  buildGradesImportPlan({ csvText, students: roster, assessments });

describe("exportGradesToCSV", () => {
  it("monta o cabeçalho com as colunas fixas e uma coluna por avaliação", () => {
    expect(buildCsvHeader(assessments)).toEqual([
      "Nome",
      "Email",
      "Status",
      "Prova 1 (40%)",
      "Prova 2 (60%)",
      "Nota Final",
    ]);
  });

  it("exporta uma linha por aluno, com nota vazia onde não há nota", () => {
    const csv = exportGradesToCSV(
      [makeStudent("u1", "Ana Souza", "ana@ex.com", { a1: { grade: 8 } })],
      assessments
    );

    expect(csv.trim().split("\n")[1]).toBe("Ana Souza,ana@ex.com,Pendente,8.00,,3.20");
  });

  it("mantém a contagem de colunas quando o nome do aluno tem vírgula", () => {
    const csv = exportGradesToCSV(
      [makeStudent("u1", "Silva, João", "joao@ex.com", { a1: { grade: 7 }, a2: { grade: 7 } })],
      assessments
    );
    const linha = csv.trim().split("\n")[1];

    expect(linha).toContain('"Silva, João"');
    // Sem o escape, a vírgula do nome viraria uma coluna a mais
    expect(linha.split(",")).toHaveLength(7);
  });

  it("mantém a contagem de colunas quando o nome da avaliação tem vírgula", () => {
    const comVirgula = [{ id: "a1", name: "Prova 1, parte A", percentage: 100 }];
    const csv = exportGradesToCSV(
      [
        {
          userId: "u1",
          name: "Ana",
          email: "ana@ex.com",
          ...computeStudentGradeSummary({ a1: { grade: 9 } }, comVirgula),
        },
      ],
      comVirgula
    );

    expect(csv.split("\n")[0]).toBe('Nome,Email,Status,"Prova 1, parte A (100%)",Nota Final');
  });

  it("escapa aspas duplicando-as, conforme o padrão de CSV", () => {
    const csv = exportGradesToCSV(
      [makeStudent("u1", 'Ana "Aninha"', "ana@ex.com", { a1: { grade: 7 }, a2: { grade: 7 } })],
      assessments
    );

    expect(csv).toContain('"Ana ""Aninha"""');
  });

  it("devolve string vazia quando não há alunos", () => {
    expect(exportGradesToCSV([], assessments)).toBe("");
  });
});

describe("parseGradeValue", () => {
  it("aceita o decimal com ponto e com vírgula", () => {
    expect(parseGradeValue("8.50")).toEqual({ value: 8.5 });
    expect(parseGradeValue("8,50")).toEqual({ value: 8.5 });
  });

  it("trata célula vazia como ausência de valor, e não como zero", () => {
    expect(parseGradeValue("")).toEqual({ empty: true });
    expect(parseGradeValue("   ")).toEqual({ empty: true });
    expect(parseGradeValue("0")).toEqual({ value: 0 });
  });

  it("rejeita valores fora da faixa de 0 a 10 e não numéricos", () => {
    expect(parseGradeValue("11")).toEqual({ invalid: true });
    expect(parseGradeValue("-1")).toEqual({ invalid: true });
    expect(parseGradeValue("abc")).toEqual({ invalid: true });
    expect(parseGradeValue("8,5,0")).toEqual({ invalid: true });
  });
});

describe("parseCsv", () => {
  it("detecta o separador ponto-e-vírgula do Excel em português", () => {
    expect(parseCsv("a;b;c\n1;2;3").delimiter).toBe(";");
    expect(parseCsv("a,b,c\n1,2,3").delimiter).toBe(",");
  });

  it("mantém o separador que está dentro de um campo entre aspas", () => {
    const { header: cols } = parseCsv('Nome,Email\n"Silva, João",j@ex.com');
    expect(cols).toEqual(["Nome", "Email"]);
    expect(parseCsv('Nome,Email\n"Silva, João",j@ex.com').rows[0]).toEqual([
      "Silva, João",
      "j@ex.com",
    ]);
  });

  it("ignora o BOM e a linha em branco final que o Excel escreve", () => {
    const { header: cols, rows } = parseCsv("﻿a,b\n1,2\n");
    expect(cols).toEqual(["a", "b"]);
    expect(rows).toHaveLength(1);
  });
});

describe("buildGradesImportPlan - round-trip", () => {
  it("não gera nenhuma mudança ao reimportar o CSV recém-exportado", () => {
    const plan = planFor(exportGradesToCSV(students, assessments));

    expect(plan.errors).toEqual([]);
    expect(plan.changes).toEqual([]);
    expect(plan.unmatched).toEqual([]);
  });

  it("preserva nome com vírgula no round-trip, sem quebrar as colunas", () => {
    const roster = [
      makeStudent("u1", "Silva, João", "joao@ex.com", { a1: { grade: 7 }, a2: { grade: 7 } }),
    ];
    const csv = exportGradesToCSV(roster, assessments);

    expect(csv).toContain('"Silva, João"');
    expect(planFor(csv, roster).errors).toEqual([]);
  });

  it("lê o arquivo salvo pelo Excel pt-BR igual ao formato exportado", () => {
    const excel = [
      "Nome;Email;Status;Prova 1 (40%);Prova 2 (60%);Nota Final",
      "Ana Souza;ana@ex.com;Aprovado;9,50;6,00;7,40",
    ].join("\n");
    const padrao = [header, "Ana Souza,ana@ex.com,Aprovado,9.50,6.00,7.40"].join("\n");

    expect(planFor(excel).changes).toEqual(planFor(padrao).changes);
    expect(planFor(excel).changes).toHaveLength(1);
    expect(planFor(excel).changes[0]).toMatchObject({
      userId: "u1",
      assessmentId: "a1",
      oldGrade: 8,
      newGrade: 9.5,
    });
  });
});

describe("buildGradesImportPlan - validações", () => {
  it("recusa linha com número de colunas diferente do cabeçalho", () => {
    const csv = [header, "Ana Souza,ana@ex.com,Aprovado,8.00,6.00,7.00,extra"].join("\n");
    const plan = planFor(csv);

    expect(plan.errors).toHaveLength(1);
    expect(plan.errors[0]).toContain("Linha 2");
    expect(plan.changes).toEqual([]);
  });

  it("recusa cabeçalho com coluna renomeada", () => {
    const csv = [
      "Nome,E-mail,Status,Prova 1 (40%),Prova 2 (60%),Nota Final",
      "Ana Souza,ana@ex.com,Aprovado,8.00,6.00,7.00",
    ].join("\n");
    const plan = planFor(csv);

    expect(plan.errors[0]).toContain("Email");
    expect(plan.changes).toEqual([]);
  });

  it("recusa cabeçalho cujo peso da avaliação não confere com o do sistema", () => {
    const csv = [
      "Nome,Email,Status,Prova 1 (50%),Prova 2 (60%),Nota Final",
      "Ana Souza,ana@ex.com,Aprovado,8.00,6.00,7.00",
    ].join("\n");

    expect(planFor(csv).errors[0]).toContain("Prova 1 (40%)");
  });

  it("aponta a linha e a coluna de uma nota inválida, sem gerar mudança", () => {
    const csv = [header, "Ana Souza,ana@ex.com,Aprovado,15,6.00,7.00"].join("\n");
    const plan = planFor(csv);

    expect(plan.errors).toHaveLength(1);
    expect(plan.errors[0]).toContain("Linha 2");
    expect(plan.errors[0]).toContain("Prova 1 (40%)");
    expect(plan.changes).toEqual([]);
  });

  it("recusa o mesmo email repetido no arquivo", () => {
    const csv = [
      header,
      "Ana Souza,ana@ex.com,Aprovado,8.00,6.00,7.00",
      "Ana Souza,ana@ex.com,Aprovado,9.00,6.00,7.20",
    ].join("\n");

    expect(planFor(csv).errors[0]).toContain("mais de uma vez");
  });

  it("reporta email que não pertence à turma, sem interromper o resto", () => {
    const csv = [
      header,
      "Carla Dias,carla@ex.com,Pendente,7.00,7.00,7.00",
      "Ana Souza,ana@ex.com,Aprovado,9.00,6.00,7.20",
    ].join("\n");
    const plan = planFor(csv);

    expect(plan.errors).toEqual([]);
    expect(plan.unmatched).toEqual([{ line: 2, email: "carla@ex.com", name: "Carla Dias" }]);
    expect(plan.changes).toHaveLength(1);
    expect(plan.changes[0]).toMatchObject({ userId: "u1", newGrade: 9 });
  });
});

describe("buildGradesImportPlan - célula vazia", () => {
  it("preserva a nota já lançada e avisa que foi mantida", () => {
    const csv = [header, "Ana Souza,ana@ex.com,Aprovado,,6.00,7.00"].join("\n");
    const plan = planFor(csv);

    expect(plan.errors).toEqual([]);
    expect(plan.changes).toEqual([]);
    expect(plan.keptEmpty).toHaveLength(1);
    expect(plan.keptEmpty[0]).toMatchObject({
      userId: "u1",
      assessmentId: "a1",
      oldGrade: 8,
    });
  });

  it("não avisa sobre célula vazia de aluno que já não tinha nota", () => {
    const csv = [header, "Bruno Lima,bruno@ex.com,Pendente,5.00,,2.00"].join("\n");
    const plan = planFor(csv);

    expect(plan.keptEmpty).toEqual([]);
    expect(plan.changes).toEqual([]);
  });

  it("distingue nota 0 de célula vazia", () => {
    const csv = [header, "Ana Souza,ana@ex.com,Reprovado,0,6.00,3.60"].join("\n");
    const plan = planFor(csv);

    expect(plan.keptEmpty).toEqual([]);
    expect(plan.changes).toHaveLength(1);
    expect(plan.changes[0]).toMatchObject({ assessmentId: "a1", oldGrade: 8, newGrade: 0 });
  });

  it("registra nota nova para aluno que ainda não tinha", () => {
    const csv = [header, "Bruno Lima,bruno@ex.com,Pendente,5.00,7.00,6.20"].join("\n");
    const plan = planFor(csv);

    expect(plan.changes).toHaveLength(1);
    expect(plan.changes[0]).toMatchObject({
      userId: "u2",
      assessmentId: "a2",
      oldGrade: null,
      newGrade: 7,
    });
  });

  it("ignora as colunas Status e Nota Final, que são derivadas", () => {
    const csv = [header, "Ana Souza,ana@ex.com,Reprovado,8.00,6.00,0.00"].join("\n");

    expect(planFor(csv).changes).toEqual([]);
  });

  it("não toca em aluno ausente do arquivo", () => {
    const csv = [header, "Ana Souza,ana@ex.com,Aprovado,8.00,6.00,7.00"].join("\n");
    const plan = planFor(csv);

    expect(plan.changes).toEqual([]);
    expect(plan.errors).toEqual([]);
  });
});
