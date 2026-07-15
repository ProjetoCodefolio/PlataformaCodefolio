import { translateStatus } from './gradeSummary';

/**
 * Formato CSV das notas do curso.
 *
 * Módulo puro (sem Firebase), testável no ambiente `node`.
 */

export const FIXED_COLUMNS = {
  NAME: "Nome",
  EMAIL: "Email",
  STATUS: "Status",
  FINAL_GRADE: "Nota Final",
};

/**
 * Rótulo da coluna de uma avaliação. Única definição do formato — a importação
 * valida o cabeçalho contra ela.
 * @param {Object} assessment - Avaliação (`{ name, percentage }`)
 * @returns {string} - Ex.: "Prova 1 (40%)"
 */
export const assessmentColumnLabel = (assessment) =>
  `${assessment.name} (${assessment.percentage}%)`;

/**
 * Monta o cabeçalho esperado do CSV para um conjunto de avaliações
 * @param {Array} assessments - Avaliações do curso
 * @returns {Array<string>} - Nomes das colunas, em ordem
 */
export const buildCsvHeader = (assessments) => [
  FIXED_COLUMNS.NAME,
  FIXED_COLUMNS.EMAIL,
  FIXED_COLUMNS.STATUS,
  ...(assessments || []).map(assessmentColumnLabel),
  FIXED_COLUMNS.FINAL_GRADE,
];

/**
 * Escapa um campo conforme RFC 4180. Sem isso, um aluno "Silva, João" ou uma
 * avaliação com vírgula no nome quebram a contagem de colunas do arquivo.
 * @param {*} value - Valor do campo
 * @returns {string} - Campo pronto para o CSV
 */
const escapeCsvField = (value) => {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",;\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

/**
 * Exporta as notas para CSV
 * @param {Array} studentsGrades - Lista de notas dos estudantes
 * @param {Array} assessments - Lista de avaliações
 * @returns {string} - Conteúdo CSV
 */
export const exportGradesToCSV = (studentsGrades, assessments) => {
  if (!studentsGrades || studentsGrades.length === 0) return "";

  const lines = [buildCsvHeader(assessments).map(escapeCsvField).join(",")];

  studentsGrades.forEach((student) => {
    const cells = [
      student.name,
      student.email,
      translateStatus(student.status),
      ...assessments.map((assessment) => {
        const grade = student.grades[assessment.id];
        return grade && grade.grade !== null ? grade.grade.toFixed(2) : "";
      }),
      student.finalGrade.toFixed(2),
    ];
    lines.push(cells.map(escapeCsvField).join(","));
  });

  return `${lines.join("\n")}\n`;
};
