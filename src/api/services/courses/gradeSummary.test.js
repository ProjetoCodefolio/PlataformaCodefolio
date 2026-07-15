import { describe, it, expect } from "vitest";
import { computeStudentGradeSummary } from "./gradeSummary";
import { GRADE_STATUS } from "$api/constants/gradeConstants";

const assessments = [
  { id: "a1", name: "Prova 1", percentage: 40 },
  { id: "a2", name: "Prova 2", percentage: 60 },
];

describe("computeStudentGradeSummary", () => {
  it("calcula a nota final ponderada pelos pesos das avaliações", () => {
    const summary = computeStudentGradeSummary(
      { a1: { grade: 5 }, a2: { grade: 10 } },
      assessments
    );

    // (5 * 40 / 10) + (10 * 60 / 10) = 20 + 60 = 80 ponderado
    expect(summary.totalWeighted).toBe(80);
    expect(summary.totalPercentage).toBe(100);
    // 80 * 10 / 100 = 8
    expect(summary.finalGrade).toBe(8);
    expect(summary.status).toBe(GRADE_STATUS.APPROVED);
  });

  it("reprova quando a nota final fica abaixo da mínima", () => {
    const summary = computeStudentGradeSummary(
      { a1: { grade: 4 }, a2: { grade: 5 } },
      assessments
    );

    expect(summary.finalGrade).toBeCloseTo(4.6);
    expect(summary.status).toBe(GRADE_STATUS.FAILED);
    expect(summary.hasMissingGrades).toBe(false);
  });

  it("mantém o aluno pendente enquanto faltar alguma nota", () => {
    const summary = computeStudentGradeSummary({ a1: { grade: 10 } }, assessments);

    expect(summary.hasMissingGrades).toBe(true);
    expect(summary.hasAnyGradeRecorded).toBe(true);
    expect(summary.status).toBe(GRADE_STATUS.PENDING);
    expect(summary.grades.a2.grade).toBeNull();
  });

  it("trata aluno sem nenhuma nota lançada como pendente com nota final 0", () => {
    const summary = computeStudentGradeSummary({}, assessments);

    expect(summary.finalGrade).toBe(0);
    expect(summary.hasAnyGradeRecorded).toBe(false);
    expect(summary.allGradesAreZero).toBe(true);
    expect(summary.status).toBe(GRADE_STATUS.PENDING);
  });

  it("distingue a nota 0 de nota ausente", () => {
    const summary = computeStudentGradeSummary(
      { a1: { grade: 0 }, a2: { grade: 0 } },
      assessments
    );

    expect(summary.hasAnyGradeRecorded).toBe(true);
    expect(summary.hasMissingGrades).toBe(false);
    expect(summary.allGradesAreZero).toBe(true);
    expect(summary.finalGrade).toBe(0);
    expect(summary.status).toBe(GRADE_STATUS.FAILED);
  });

  it("considera nota nula como faltando, e não como zero", () => {
    const summary = computeStudentGradeSummary(
      { a1: { grade: 10 }, a2: { grade: null } },
      assessments
    );

    expect(summary.hasMissingGrades).toBe(true);
    expect(summary.grades.a2.weightedGrade).toBe(0);
    expect(summary.status).toBe(GRADE_STATUS.PENDING);
  });

  it("normaliza a nota final quando os pesos não somam 100", () => {
    const summary = computeStudentGradeSummary(
      { a1: { grade: 8 }, a2: { grade: 8 } },
      [
        { id: "a1", name: "Prova 1", percentage: 25 },
        { id: "a2", name: "Prova 2", percentage: 25 },
      ]
    );

    // Pesos somam 50; a nota final é reescalada para a base 10.
    expect(summary.totalPercentage).toBe(50);
    expect(summary.finalGrade).toBeCloseTo(8);
  });

  it("preserva nome e peso da avaliação em cada nota do resumo", () => {
    const summary = computeStudentGradeSummary({ a1: { grade: 7 } }, assessments);

    expect(summary.grades.a1).toMatchObject({
      assessmentName: "Prova 1",
      percentage: 40,
      grade: 7,
      weightedGrade: 28,
    });
  });

  it("não quebra quando o curso não tem avaliações", () => {
    const summary = computeStudentGradeSummary({}, []);

    expect(summary.finalGrade).toBe(0);
    expect(summary.totalPercentage).toBe(0);
    expect(summary.status).toBe(GRADE_STATUS.PENDING);
  });
});
