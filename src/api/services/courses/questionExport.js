// Exportação das dúvidas dos alunos (ver plano_exportacao_duvidas.md e os
// termos "Planilha de dúvidas" e "Lista de exercícios" no CONTEXT.md).
//
// Tudo aqui é puro: monta o CSV e o modelo da lista, sem tocar no banco nem no
// navegador. Os geradores de .docx e PDF consomem o MESMO modelo
// (`buildExerciseListDocument`), para as duas versões da lista nunca saírem
// diferentes uma da outra.
//
// A lista de exercícios vai para a turma e NUNCA leva o autor da dúvida: o
// rascunho já nasce sem `userName`/`userId`, então nenhum gerador consegue
// imprimir a autoria nem por engano.

/** Colunas da planilha de dúvidas, na ordem em que saem no arquivo. */
export const QUESTIONS_CSV_HEADER = [
  "Conteúdo",
  "Dúvida",
  "Autor",
  "Registrada em",
  "Situação",
  "Discutida em",
];

/** Quantidades de linhas oferecidas para o espaço de resposta. */
export const ANSWER_LINE_OPTIONS = [3, 5, 10];

export const DEFAULT_ANSWER_LINES = 5;

export const DEFAULT_EXERCISE_LIST_TITLE = "Lista de exercícios";

const csvCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

/**
 * Formata uma data ISO para o padrão brasileiro. Datas inválidas ou ausentes
 * viram "" (célula vazia na planilha, e não "Invalid Date").
 * @param {string} iso
 * @param {{ withTime?: boolean, timeZone?: string }} [options]
 * @returns {string}
 */
export const formatQuestionDate = (iso, { withTime = true, timeZone } = {}) => {
  if (!iso) return "";
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "";
  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    ...(timeZone ? { timeZone } : {}),
  });
};

/**
 * Monta o conteúdo da planilha de dúvidas, na ordem recebida (a tela passa as
 * dúvidas escolhidas já na ordenação ativa da tabela). Sem o BOM: quem baixa
 * acrescenta, como nos outros CSV do projeto.
 * @param {Array} questions - dúvidas escolhidas
 * @param {{ timeZone?: string }} [options]
 * @returns {string}
 */
export const buildQuestionsCsv = (questions, { timeZone } = {}) => {
  const linhas = (Array.isArray(questions) ? questions : []).map((question) => [
    question.contentTitle,
    question.text,
    question.userName,
    formatQuestionDate(question.createdAt, { timeZone }),
    question.discussed ? "Discutida" : "Pendente",
    question.discussed ? formatQuestionDate(question.discussedAt, { timeZone }) : "",
  ]);

  return [QUESTIONS_CSV_HEADER, ...linhas]
    .map((linha) => linha.map(csvCell).join(","))
    .join("\n");
};

/**
 * Nome do arquivo da planilha, no padrão dos outros CSV (`presenca_{curso}_{data}.csv`).
 * @param {string} courseId
 * @param {Date} [now]
 * @returns {string}
 */
export const questionsCsvFilename = (courseId, now = new Date()) =>
  `duvidas_${courseId}_${now.toISOString().split("T")[0]}.csv`;

/**
 * Ordem inicial da lista de exercícios: a ordem dos conteúdos no curso e,
 * dentro do mesmo conteúdo, a data da dúvida. Dúvida de conteúdo que não está
 * mais no curso (excluído depois; o título fica congelado na dúvida) vai para
 * o fim, ainda por data.
 * @param {Array} questions
 * @param {Array<string>} contentOrder - ids dos conteúdos, na ordem do curso
 * @returns {Array} - nova lista, sem mexer na recebida
 */
export const orderQuestionsByCourseContent = (questions, contentOrder = []) => {
  const posicao = new Map(contentOrder.map((id, index) => [id, index]));
  const fim = contentOrder.length;
  const posicaoDe = (question) => posicao.get(question.contentId) ?? fim;

  return [...(Array.isArray(questions) ? questions : [])].sort(
    (a, b) =>
      posicaoDe(a) - posicaoDe(b) ||
      String(a.createdAt || "").localeCompare(String(b.createdAt || ""))
  );
};

/**
 * Rascunho da lista de exercícios que a prévia edita: cabeçalho, opções e
 * itens. Os itens copiam só o que a lista pode mostrar (texto e conteúdo); a
 * autoria fica de fora de propósito.
 * @param {{ courseTitle?: string, questions: Array, contentOrder?: Array<string>, today?: Date }} params
 * @returns {{ header: Object, options: Object, items: Array }}
 */
export const createExerciseListDraft = ({
  courseTitle = "",
  questions = [],
  contentOrder = [],
  today = new Date(),
} = {}) => ({
  header: {
    courseName: courseTitle,
    title: DEFAULT_EXERCISE_LIST_TITLE,
    date: formatQuestionDate(today.toISOString(), { withTime: false }),
    instructions: "",
  },
  options: {
    studentFields: false,
    showContent: false,
    answerSpace: false,
    answerLines: DEFAULT_ANSWER_LINES,
  },
  items: orderQuestionsByCourseContent(questions, contentOrder).map((question) => ({
    id: question.id,
    text: question.text || "",
    contentTitle: question.contentTitle || "",
  })),
});

/**
 * Modelo final da lista, que os geradores de .docx e PDF imprimem como está:
 * textos sem espaços nas pontas, campos vazios do cabeçalho omitidos, itens
 * sem texto descartados e a numeração refeita de 1 a N.
 * @param {{ header: Object, options: Object, items: Array }} draft
 * @returns {{ courseName: string, title: string, date: string, instructions: string, studentFields: boolean, exercises: Array<{ number: number, text: string, reference: string, answerLines: number }> }}
 */
export const buildExerciseListDocument = ({ header = {}, options = {}, items = [] } = {}) => {
  const limpar = (value) => String(value ?? "").trim();
  const linhas = options.answerSpace ? Number(options.answerLines) || DEFAULT_ANSWER_LINES : 0;

  return {
    courseName: limpar(header.courseName),
    title: limpar(header.title),
    date: limpar(header.date),
    instructions: limpar(header.instructions),
    studentFields: !!options.studentFields,
    exercises: items
      .map((item) => ({ text: limpar(item.text), contentTitle: limpar(item.contentTitle) }))
      .filter((item) => item.text)
      .map((item, index) => ({
        number: index + 1,
        text: item.text,
        reference: options.showContent && item.contentTitle ? item.contentTitle : "",
        answerLines: linhas,
      })),
  };
};

/**
 * Nome do arquivo da lista a partir do título: "Lista 3: Álgebra Relacional"
 * vira `lista-3-algebra-relacional.docx`.
 * @param {string} title
 * @param {"docx"|"pdf"} extension
 * @returns {string}
 */
export const exerciseListFilename = (title, extension) => {
  const base = String(title || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "lista-de-exercicios"}.${extension}`;
};
