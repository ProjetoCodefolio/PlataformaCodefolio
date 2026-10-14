import { downloadBlob } from "./downloadBlob";

// Gera a lista de exercícios em .docx a partir do modelo de
// `buildExerciseListDocument` (questionExport.js). A biblioteca `docx` entra
// só aqui, por import dinâmico: o código dela vai para um pedaço separado do
// build, que o navegador baixa apenas quando o professor clica em exportar.

const CINZA = "777777";

/** Quebra um texto com várias linhas em TextRuns com quebra de linha entre elas. */
const linhasDoTexto = (TextRun, texto, estilo = {}) =>
  texto.split("\n").map((linha, index) => new TextRun({ text: linha, break: index > 0 ? 1 : 0, ...estilo }));

/**
 * Monta e baixa a lista em .docx.
 * @param {ReturnType<import("$api/services/courses/questionExport").buildExerciseListDocument>} lista
 * @param {string} filename
 */
export const downloadExerciseListDocx = async (lista, filename) => {
  const {
    AlignmentType,
    Document,
    HeadingLevel,
    LeaderType,
    Packer,
    Paragraph,
    Tab,
    TabStopPosition,
    TabStopType,
    TextRun,
  } = await import("docx");

  const children = [];

  if (lista.courseName) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: lista.courseName, bold: true, size: 24 })],
      })
    );
  }
  if (lista.title) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: lista.title })],
      })
    );
  }
  if (lista.date) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: lista.date, color: CINZA })],
      })
    );
  }
  if (lista.studentFields) {
    children.push(
      new Paragraph({
        spacing: { before: 240 },
        children: [new TextRun({ text: "Nome: ____________________________________________" })],
      }),
      new Paragraph({
        spacing: { before: 120 },
        children: [new TextRun({ text: "Matrícula: ____________________" })],
      })
    );
  }
  if (lista.instructions) {
    children.push(
      new Paragraph({
        spacing: { before: 240 },
        children: linhasDoTexto(TextRun, lista.instructions, { italics: true }),
      })
    );
  }

  lista.exercises.forEach((exercicio) => {
    children.push(
      new Paragraph({
        spacing: { before: 320 },
        children: [
          new TextRun({ text: `${exercicio.number}. `, bold: true }),
          ...linhasDoTexto(TextRun, exercicio.text),
        ],
      })
    );
    if (exercicio.reference) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Referente a: ${exercicio.reference}`, italics: true, color: CINZA, size: 18 }),
          ],
        })
      );
    }
    // Espaço para resposta: cada linha é uma tabulação até a margem direita
    // com preenchimento de sublinhado. Borda de baixo em parágrafos vazios não
    // serve: o Word junta parágrafos vizinhos com a mesma borda e desenha uma
    // linha só para o grupo inteiro.
    for (let i = 0; i < exercicio.answerLines; i += 1) {
      children.push(
        new Paragraph({
          spacing: { before: 200 },
          tabStops: [
            { type: TabStopType.RIGHT, position: TabStopPosition.MAX, leader: LeaderType.UNDERSCORE },
          ],
          children: [new TextRun({ children: [new Tab()], color: "999999" })],
        })
      );
    }
  });

  const documento = new Document({
    creator: "Codefólio",
    title: lista.title || lista.courseName || "Lista de exercícios",
    sections: [{ children }],
  });

  downloadBlob(filename, await Packer.toBlob(documento));
};
