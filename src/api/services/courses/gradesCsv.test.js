import { describe, it, expect } from "vitest";
import { exportGradesToCSV, buildCsvHeader } from "./gradesCsv";
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
