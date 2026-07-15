import { describe, it, expect } from "vitest";
import { computeStudentGradeSummary, getGradeColor } from "./gradeSummary";
import {
  GRADE_STATUS,
  GRADE_COLORS,
  MINIMUM_PASSING_GRADE,
} from "$api/constants/gradeConstants";

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

  it("aprova nota final que só não fecha em 6 por ruído de ponto flutuante", () => {
    // 9,6 com peso 10 + 5,6 com peso 90 dá exatamente 60 ponderado no papel,
    // mas 59.99999999999999 em JS — reprovava um 6 legítimo.
    const summary = computeStudentGradeSummary(
      { a1: { grade: 9.6 }, a2: { grade: 5.6 } },
      [
        { id: "a1", name: "Prova 1", percentage: 10 },
        { id: "a2", name: "Prova 2", percentage: 90 },
      ]
    );

    expect(summary.finalGrade).toBe(6);
    expect(summary.status).toBe(GRADE_STATUS.APPROVED);
  });

  it("aprova quando a nota final exibida como 6,00 arredonda para a mínima", () => {
    // Final real de 5,995: a tela e o CSV mostram "6,00", então reprovar seria
    // julgar por um valor que o professor não vê.
    const summary = computeStudentGradeSummary(
      { a1: { grade: 0.2 }, a2: { grade: 6.3 } },
      [
        { id: "a1", name: "Prova 1", percentage: 5 },
        { id: "a2", name: "Prova 2", percentage: 95 },
      ]
    );

    expect(summary.finalGrade).toBe(6);
    expect(summary.status).toBe(GRADE_STATUS.APPROVED);
  });

  it("reprova quando a nota final fica abaixo da mínima já arredondada", () => {
    const summary = computeStudentGradeSummary(
      { a1: { grade: 5.99 }, a2: { grade: 5.99 } },
      assessments
    );

    expect(summary.finalGrade).toBe(5.99);
    expect(summary.status).toBe(GRADE_STATUS.FAILED);
  });

  it("devolve a nota final já arredondada em 2 casas", () => {
    const summary = computeStudentGradeSummary(
      { a1: { grade: 7.777 }, a2: { grade: 7.777 } },
      assessments
    );

    expect(summary.finalGrade).toBe(7.78);
  });

  it("não quebra quando o curso não tem avaliações", () => {
    const summary = computeStudentGradeSummary({}, []);

    expect(summary.finalGrade).toBe(0);
    expect(summary.totalPercentage).toBe(0);
    expect(summary.status).toBe(GRADE_STATUS.PENDING);
  });
});

describe("coerência entre a nota exibida e o status", () => {
  // Como a tela e o CSV mostram a nota final com 2 casas, o status nunca pode
  // discordar do que o professor lê. Era exatamente aqui que um aluno com
  // "6,00" na tela aparecia reprovado.
  // Mesmo formato do fmt() da tela. Uma instância só: criar um Intl a cada
  // iteração domina o tempo da varredura.
  const formatador = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const exibir = (nota) => formatador.format(nota);

  it("nenhuma combinação de pesos e notas reprova um aluno exibido com 6,00 ou mais", () => {
    const divergentes = [];

    for (let peso1 = 5; peso1 <= 95; peso1 += 5) {
      const pesos = [
        { id: "a1", name: "Prova 1", percentage: peso1 },
        { id: "a2", name: "Prova 2", percentage: 100 - peso1 },
      ];

      for (let n1 = 0; n1 <= 100; n1 += 1) {
        for (let n2 = 0; n2 <= 100; n2 += 1) {
          const summary = computeStudentGradeSummary(
            { a1: { grade: n1 / 10 }, a2: { grade: n2 / 10 } },
            pesos
          );

          const exibida = parseFloat(exibir(summary.finalGrade).replace(",", "."));
          const aprovadoNaTela = exibida >= MINIMUM_PASSING_GRADE;
          const aprovadoNoStatus = summary.status === GRADE_STATUS.APPROVED;

          if (aprovadoNaTela !== aprovadoNoStatus) {
            divergentes.push(`pesos ${peso1}/${100 - peso1}, notas ${n1 / 10}/${n2 / 10} → exibe ${exibir(summary.finalGrade)} mas status é ${summary.status}`);
          }
        }
      }
    }

    expect(divergentes).toEqual([]);
  });
});

describe("getGradeColor", () => {
  it("pinta a nota mínima de verde, igual ao status que ela produz", () => {
    // A nota exatamente igual à mínima aprova; antes ela saía laranja,
    // contradizendo o próprio status do aluno.
    expect(getGradeColor(MINIMUM_PASSING_GRADE)).toBe(GRADE_COLORS.APPROVED);
    expect(
      computeStudentGradeSummary(
        { a1: { grade: MINIMUM_PASSING_GRADE }, a2: { grade: MINIMUM_PASSING_GRADE } },
        assessments
      ).status
    ).toBe(GRADE_STATUS.APPROVED);
  });

  it("usa só verde e vermelho, sem faixas intermediárias", () => {
    expect(getGradeColor(10)).toBe(GRADE_COLORS.APPROVED);
    expect(getGradeColor(7)).toBe(GRADE_COLORS.APPROVED);
    expect(getGradeColor(5.99)).toBe(GRADE_COLORS.FAILED);
    expect(getGradeColor(0)).toBe(GRADE_COLORS.FAILED);

    const cores = new Set([10, 9, 8, 7, 6, 5, 3, 0].map((n) => getGradeColor(n)));
    expect(cores).toEqual(new Set([GRADE_COLORS.APPROVED, GRADE_COLORS.FAILED]));
  });

  it("mostra nota não lançada como pendente", () => {
    expect(getGradeColor(null)).toBe(GRADE_COLORS.PENDING);
    expect(getGradeColor(undefined)).toBe(GRADE_COLORS.PENDING);
  });

  it("trata a nota final 0 de aluno sem nenhuma nota como pendente, não reprovado", () => {
    expect(getGradeColor(0, false)).toBe(GRADE_COLORS.PENDING);
    expect(getGradeColor(0, true)).toBe(GRADE_COLORS.FAILED);
  });
});
