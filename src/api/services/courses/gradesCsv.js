import { MAXIMUM_GRADE } from '$api/constants/gradeConstants';
import { translateStatus } from './gradeSummary';

/**
 * Formato CSV das notas do curso, nas duas direções.
 *
 * Exportação e importação vivem juntas de propósito: o fluxo é exportar, ajustar
 * no Excel e importar de volta, então as duas pontas precisam concordar sobre os
 * nomes das colunas e sobre o escape. Módulo puro (sem Firebase), testável no
 * ambiente `node`.
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

/**
 * Detecta o separador do arquivo. O Excel em português salva com ";", enquanto
 * a nossa exportação usa "," — o mesmo professor pode trazer os dois.
 * @param {string} firstLine - Primeira linha do arquivo
 * @returns {string} - "," ou ";"
 */
const detectDelimiter = (firstLine) => {
  const semicolons = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  return semicolons > commas ? ";" : ",";
};

/**
 * Quebra o texto em linhas e campos, respeitando campos entre aspas (que podem
 * conter o separador e quebras de linha).
 * @param {string} text - Conteúdo do arquivo
 * @param {string} delimiter - Separador de campos
 * @returns {Array<Array<string>>} - Linhas, cada uma com seus campos
 */
const tokenize = (text, delimiter) => {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (char === delimiter) {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (char === "\r") {
      i += 1;
      continue;
    }
    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += 1;
      continue;
    }

    field += char;
    i += 1;
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Linha em branco (comum no fim de arquivos do Excel) não é uma linha de dados
  return rows.filter((cells) => !(cells.length === 1 && cells[0].trim() === ""));
};

/**
 * Faz o parse do CSV, detectando o separador
 * @param {string} text - Conteúdo do arquivo
 * @returns {Object} - `{ delimiter, header, rows }`
 */
export const parseCsv = (text) => {
  // Remove o BOM que o Excel costuma escrever no início do arquivo
  const content = String(text ?? "").replace(/^\uFEFF/, "");
  const firstLine = content.split(/\r?\n/)[0] || "";
  const delimiter = detectDelimiter(firstLine);
  const rows = tokenize(content, delimiter);

  if (rows.length === 0) {
    return { delimiter, header: [], rows: [] };
  }

  return {
    delimiter,
    header: rows[0].map((cell) => cell.trim()),
    rows: rows.slice(1),
  };
};

/**
 * Interpreta o valor de uma nota vinda do CSV, aceitando "8,50" e "8.50"
 * @param {string} raw - Valor bruto da célula
 * @returns {Object} - `{ empty: true }`, `{ invalid: true }` ou `{ value }`
 */
export const parseGradeValue = (raw) => {
  const text = String(raw ?? "").trim();
  if (text === "") return { empty: true };

  const normalized = text.replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(normalized)) return { invalid: true };

  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0 || value > MAXIMUM_GRADE) {
    return { invalid: true };
  }

  return { value };
};

const normalizeEmail = (email) => String(email ?? "").trim().toLowerCase();

/**
 * Valida o cabeçalho do arquivo contra o que a exportação gera
 * @param {Array<string>} header - Cabeçalho encontrado
 * @param {Array} assessments - Avaliações do curso
 * @returns {Array<string>} - Erros encontrados
 */
const validateHeader = (header, assessments) => {
  const expected = buildCsvHeader(assessments);

  if (header.length !== expected.length) {
    return [
      `O arquivo tem ${header.length} coluna(s), mas o esperado são ${expected.length}. ` +
        `Cabeçalho esperado: ${expected.join(" | ")}`,
    ];
  }

  const errors = [];
  header.forEach((column, index) => {
    if (column !== expected[index]) {
      errors.push(
        `Coluna ${index + 1}: esperado "${expected[index]}", encontrado "${column}".`
      );
    }
  });

  return errors;
};

/**
 * Monta o plano de importação: o que mudaria se o arquivo fosse aplicado.
 *
 * Não escreve nada — o resultado alimenta a pré-visualização, e a gravação só
 * acontece se o professor confirmar.
 *
 * Regras:
 * - célula vazia preserva a nota já lançada (reportada em `keptEmpty`);
 * - as colunas Status e Nota Final são ignoradas, por serem derivadas;
 * - alunos ausentes do arquivo não são tocados.
 *
 * @param {Object} params
 * @param {string} params.csvText - Conteúdo do arquivo
 * @param {Array} params.students - Alunos com suas notas (de fetchAllCourseGrades)
 * @param {Array} params.assessments - Avaliações do curso
 * @returns {Object} - `{ errors, changes, keptEmpty, unmatched }`
 */
export const buildGradesImportPlan = ({ csvText, students, assessments }) => {
  const result = { errors: [], changes: [], keptEmpty: [], unmatched: [] };
  const assessmentList = assessments || [];

  const duplicatedColumns = assessmentList
    .map(assessmentColumnLabel)
    .filter((label, index, all) => all.indexOf(label) !== index);
  if (duplicatedColumns.length > 0) {
    result.errors.push(
      `O curso tem avaliações que geram colunas iguais (${[
        ...new Set(duplicatedColumns),
      ].join(", ")}). Renomeie-as antes de importar.`
    );
    return result;
  }

  const { header, rows } = parseCsv(csvText);

  if (header.length === 0) {
    result.errors.push("O arquivo está vazio.");
    return result;
  }

  const headerErrors = validateHeader(header, assessmentList);
  if (headerErrors.length > 0) {
    result.errors.push(...headerErrors);
    return result;
  }

  if (rows.length === 0) {
    result.errors.push("O arquivo não tem nenhuma linha de notas.");
    return result;
  }

  // Índice dos alunos por email. Emails repetidos na turma tornam a linha
  // ambígua — melhor barrar do que atribuir nota ao aluno errado.
  const studentsByEmail = new Map();
  const ambiguousEmails = new Set();
  (students || []).forEach((student) => {
    const email = normalizeEmail(student.email);
    if (!email) return;
    if (studentsByEmail.has(email)) {
      ambiguousEmails.add(email);
      return;
    }
    studentsByEmail.set(email, student);
  });

  const seenEmails = new Set();

  rows.forEach((cells, index) => {
    // +2: a linha 1 é o cabeçalho, e as linhas do arquivo começam em 1
    const line = index + 2;

    if (cells.length !== header.length) {
      result.errors.push(
        `Linha ${line}: esperado ${header.length} coluna(s), encontrado ${cells.length}.`
      );
      return;
    }

    const email = normalizeEmail(cells[1]);
    if (!email) {
      result.errors.push(`Linha ${line}: a coluna "${FIXED_COLUMNS.EMAIL}" está vazia.`);
      return;
    }
    if (seenEmails.has(email)) {
      result.errors.push(`Linha ${line}: o email "${email}" aparece mais de uma vez no arquivo.`);
      return;
    }
    seenEmails.add(email);

    if (ambiguousEmails.has(email)) {
      result.errors.push(
        `Linha ${line}: mais de um aluno do curso usa o email "${email}".`
      );
      return;
    }

    const student = studentsByEmail.get(email);
    if (!student) {
      result.unmatched.push({ line, email, name: cells[0].trim() });
      return;
    }

    assessmentList.forEach((assessment, assessmentIndex) => {
      const columnIndex = 3 + assessmentIndex;
      const raw = cells[columnIndex];
      const parsed = parseGradeValue(raw);
      const oldGrade = student.grades?.[assessment.id]?.grade ?? null;

      const entry = {
        line,
        userId: student.userId,
        name: student.name,
        email: student.email,
        assessmentId: assessment.id,
        assessmentName: assessment.name,
        oldGrade,
      };

      if (parsed.empty) {
        // Vazio não apaga: só avisa quando havia nota, para o professor ver que
        // aquela célula em branco não teve efeito.
        if (oldGrade !== null) {
          result.keptEmpty.push(entry);
        }
        return;
      }

      if (parsed.invalid) {
        result.errors.push(
          `Linha ${line}, coluna "${assessmentColumnLabel(assessment)}": ` +
            `nota inválida "${String(raw).trim()}". Use um valor de 0 a ${MAXIMUM_GRADE}.`
        );
        return;
      }

      if (parsed.value !== oldGrade) {
        result.changes.push({ ...entry, newGrade: parsed.value });
      }
    });
  });

  return result;
};
