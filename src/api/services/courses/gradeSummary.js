import {
  MINIMUM_PASSING_GRADE,
  MAXIMUM_GRADE,
  GRADE_STATUS,
  GRADE_COLORS,
} from '$api/constants/gradeConstants';

/**
 * Cálculo e formatação das notas do curso.
 *
 * Vive separado de `grades.js` (que faz o I/O no Firebase) por dois motivos:
 * o modo de edição da tabela de notas e a pré-visualização da importação de CSV
 * precisam recalcular a nota final sem ir ao banco a cada alteração; e, por não
 * importar a configuração do Firebase, este módulo roda no ambiente `node` dos
 * testes. `grades.js` reexporta tudo daqui, então quem consome não muda.
 */

// A nota final é apresentada com 2 casas decimais, então é com 2 casas que ela
// vale. Arredondar antes de comparar com a nota mínima resolve dois problemas:
//
// 1. ruído de ponto flutuante: notas 9,6 e 5,6 com pesos 10/90 dão exatamente 60
//    ponderado no papel, mas 59.99999999999999 em JS — o aluno reprovava com um
//    6 legítimo;
// 2. divergência entre o que é julgado e o que é exibido: uma final de 5,995
//    aparece como "6,00" na tela e no CSV, e reprovar quem a tela mostra
//    aprovado é indefensável para o aluno.
const GRADE_DECIMALS = 2;

const roundGrade = (value) => {
  const factor = 10 ** GRADE_DECIMALS;
  return Math.round(value * factor) / factor;
};

/**
 * Determina o status do estudante baseado na nota final
 * @param {number} finalGrade - Nota final do estudante
 * @param {boolean} hasMissingGrades - Se tem notas faltando
 * @param {boolean} hasAnyGradeRecorded - Se tem alguma nota lançada
 * @param {boolean} allGradesAreZero - Se todas as notas lançadas são 0
 * @returns {string} - Status (pending, approved, failed)
 */
export const determineStudentStatus = (
  finalGrade,
  hasMissingGrades,
  hasAnyGradeRecorded = false,
  allGradesAreZero = true
) => {
  // Se não tem nenhuma nota lançada (nem parcial), é pendente
  if (!hasAnyGradeRecorded) {
    return GRADE_STATUS.PENDING;
  }

  // Se tem notas faltando, é pendente
  if (hasMissingGrades) {
    return GRADE_STATUS.PENDING;
  }

  // Se tem todas as notas e nota final >= MINIMUM_PASSING_GRADE, é aprovado
  if (finalGrade >= MINIMUM_PASSING_GRADE) {
    return GRADE_STATUS.APPROVED;
  }

  // Se tem todas as notas e nota final < MINIMUM_PASSING_GRADE, é reprovado
  return GRADE_STATUS.FAILED;
};

/**
 * Calcula o resumo de notas de um estudante (notas ponderadas, nota final e
 * status) a partir de dados já carregados.
 *
 * @param {Object} gradesByAssessmentId - Notas do estudante indexadas por ID da
 *   avaliação, no formato `{ [assessmentId]: { grade, assignedAt } }`. Uma
 *   avaliação ausente, ou com `grade` nula, conta como nota faltando.
 * @param {Array} assessments - Avaliações do curso (`{ id, name, percentage }`)
 * @returns {Object} - Resumo com notas, totais, nota final e status
 */
export const computeStudentGradeSummary = (gradesByAssessmentId, assessments) => {
  const grades = {};
  let totalWeighted = 0;
  let totalPercentage = 0;
  let hasMissingGrades = false;
  let hasAnyGradeRecorded = false;
  let allGradesAreZero = true;

  (assessments || []).forEach((assessment) => {
    const percentage = Number(assessment.percentage) || 0;
    totalPercentage += percentage;

    const recorded = gradesByAssessmentId?.[assessment.id];
    const hasGrade =
      recorded && recorded.grade !== null && recorded.grade !== undefined;

    if (hasGrade) {
      const grade = Number(recorded.grade) || 0;
      const weightedGrade = (grade * percentage) / 10;

      grades[assessment.id] = {
        assessmentName: assessment.name,
        percentage,
        grade,
        weightedGrade,
        assignedAt: recorded.assignedAt ?? null,
      };

      totalWeighted += weightedGrade;
      hasAnyGradeRecorded = true;

      // Se alguma nota for diferente de 0, não é "todas zeradas"
      if (grade !== 0) {
        allGradesAreZero = false;
      }
    } else {
      // Nota faltando
      hasMissingGrades = true;
      grades[assessment.id] = {
        assessmentName: assessment.name,
        percentage,
        grade: null,
        weightedGrade: 0,
        assignedAt: null,
      };
    }
  });

  const finalGrade = roundGrade(
    totalPercentage > 0 ? (totalWeighted * MAXIMUM_GRADE) / totalPercentage : 0
  );

  const status = determineStudentStatus(
    finalGrade,
    hasMissingGrades,
    hasAnyGradeRecorded,
    allGradesAreZero
  );

  return {
    grades,
    totalWeighted,
    totalPercentage,
    finalGrade,
    status,
    hasMissingGrades,
    hasAnyGradeRecorded,
    allGradesAreZero,
  };
};

/**
 * Calcula estatísticas das notas do curso
 * @param {Array} studentsGrades - Lista de notas dos estudantes
 * @returns {Object} - Estatísticas calculadas
 */
export const calculateGradeStatistics = (studentsGrades) => {
  if (!studentsGrades || studentsGrades.length === 0) {
    return {
      average: 0,
      highest: 0,
      lowest: 0,
      approvedCount: 0,
      failedCount: 0,
      pendingCount: 0,
      totalStudents: 0
    };
  }

  const totalStudents = studentsGrades.length;

  // Filtrar apenas estudantes com todas as notas (sem pendências e com pelo menos uma nota lançada)
  const completeGrades = studentsGrades
    .filter(s => !s.hasMissingGrades && s.hasAnyGradeRecorded)
    .map(s => s.finalGrade)
    .filter(g => g !== null && g !== undefined);

  // Contar por status
  const approvedCount = studentsGrades.filter(s => s.status === GRADE_STATUS.APPROVED).length;
  const failedCount = studentsGrades.filter(s => s.status === GRADE_STATUS.FAILED).length;
  const pendingCount = studentsGrades.filter(s => s.status === GRADE_STATUS.PENDING).length;

  // Calcular estatísticas
  let average = 0;
  let highest = 0;
  let lowest = MAXIMUM_GRADE;

  if (completeGrades.length > 0) {
    const sum = completeGrades.reduce((acc, g) => acc + g, 0);
    average = sum / completeGrades.length;
    highest = Math.max(...completeGrades);
    lowest = Math.min(...completeGrades);
  }

  return {
    average,
    highest,
    lowest,
    approvedCount,
    failedCount,
    pendingCount,
    totalStudents
  };
};

/**
 * Traduz o status para português
 * @param {string} status - Status em inglês
 * @returns {string} - Status em português
 */
export const translateStatus = (status) => {
  const translations = {
    [GRADE_STATUS.PENDING]: "Pendente",
    [GRADE_STATUS.APPROVED]: "Aprovado",
    [GRADE_STATUS.FAILED]: "Reprovado"
  };
  return translations[status] || status;
};

/**
 * Ordena e filtra as notas dos estudantes
 * @param {Array} studentsGrades - Lista de notas dos estudantes
 * @param {string} sortField - Campo a ordenar
 * @param {string} sortOrder - 'asc' ou 'desc'
 * @returns {Array} - Lista ordenada
 */
export const sortStudentsGrades = (studentsGrades, sortField = "name", sortOrder = "asc") => {
  if (!studentsGrades || studentsGrades.length === 0) return [];

  const sorted = [...studentsGrades].sort((a, b) => {
    let valueA, valueB;

    switch (sortField) {
      case "name":
        valueA = (a.name || "").toLowerCase();
        valueB = (b.name || "").toLowerCase();
        return sortOrder === "asc"
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA);

      case "email":
        valueA = (a.email || "").toLowerCase();
        valueB = (b.email || "").toLowerCase();
        return sortOrder === "asc"
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA);

      case "finalGrade":
        valueA = Number(a.finalGrade) || 0;
        valueB = Number(b.finalGrade) || 0;
        return sortOrder === "asc" ? valueA - valueB : valueB - valueA;

      case "totalPercentage":
        valueA = Number(a.totalPercentage) || 0;
        valueB = Number(b.totalPercentage) || 0;
        return sortOrder === "asc" ? valueA - valueB : valueB - valueA;

      default:
        return 0;
    }
  });

  return sorted;
};

/**
 * Determina a cor de uma nota — a final do aluno ou a de uma avaliação.
 *
 * Usa o mesmo corte de determineStudentStatus: nota exatamente igual à mínima
 * aprova, e portanto é verde. Antes havia faixas intermediárias (uma nota 6
 * saía laranja), o que contradizia o próprio status do aluno.
 *
 * @param {number} grade - Nota; `null`/`undefined` significa nota não lançada
 * @param {boolean} hasAnyGradeRecorded - Se o aluno tem alguma nota lançada;
 *   sem nenhuma, a nota final 0 é pendente, e não reprovação
 * @returns {string} - Cor em formato hex
 */
export const getGradeColor = (grade, hasAnyGradeRecorded = true) => {
  if (grade === null || grade === undefined) return GRADE_COLORS.PENDING;
  if (grade === 0 && !hasAnyGradeRecorded) return GRADE_COLORS.PENDING;

  return grade >= MINIMUM_PASSING_GRADE
    ? GRADE_COLORS.APPROVED
    : GRADE_COLORS.FAILED;
};
