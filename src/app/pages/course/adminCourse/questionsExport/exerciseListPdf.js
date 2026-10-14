// Gera a lista de exercícios em PDF a partir do mesmo modelo do .docx
// (`buildExerciseListDocument`, questionExport.js). O `pdfmake` e as fontes
// (uns 2 MB) entram só aqui, por import dinâmico: são baixados apenas quando o
// professor clica em exportar, nunca no carregamento do site.

const CINZA = "#777777";
// A4 (595 pt) menos as margens de 50 pt de cada lado.
const LARGURA_UTIL = 495;

// Uma linha NOVA a cada chamada: o pdfmake anota posições no próprio objeto
// enquanto monta a página, e o mesmo objeto repetido em vários exercícios
// fazia as linhas sumirem (só uma sobrava, perdida no fim da página).
const linhaDeResposta = () => ({
  canvas: [{ type: "line", x1: 0, y1: 0, x2: LARGURA_UTIL, y2: 0, lineWidth: 0.5, lineColor: "#999999" }],
  margin: [0, 18, 0, 0],
});

/**
 * Monta a definição do documento do pdfmake. Separada do download para poder
 * ser conferida em teste sem gerar o arquivo.
 * @param {ReturnType<import("$api/services/courses/questionExport").buildExerciseListDocument>} lista
 * @returns {Object}
 */
export const buildExerciseListPdfDefinition = (lista) => {
  const content = [];

  if (lista.courseName) {
    content.push({ text: lista.courseName, bold: true, alignment: "center", fontSize: 12 });
  }
  if (lista.title) {
    content.push({ text: lista.title, bold: true, alignment: "center", fontSize: 18, margin: [0, 4, 0, 0] });
  }
  if (lista.date) {
    content.push({ text: lista.date, alignment: "center", color: CINZA, margin: [0, 4, 0, 0] });
  }
  if (lista.studentFields) {
    content.push(
      { text: "Nome: ____________________________________________", margin: [0, 16, 0, 0] },
      { text: "Matrícula: ____________________", margin: [0, 8, 0, 0] }
    );
  }
  if (lista.instructions) {
    content.push({ text: lista.instructions, italics: true, margin: [0, 16, 0, 0] });
  }

  lista.exercises.forEach((exercicio) => {
    content.push({
      // O enunciado e o espaço de resposta ficam juntos: sem isso a quebra de
      // página separaria a pergunta das linhas onde se responde.
      stack: [
        { text: [{ text: `${exercicio.number}. `, bold: true }, exercicio.text] },
        ...(exercicio.reference
          ? [{ text: `Referente a: ${exercicio.reference}`, italics: true, color: CINZA, fontSize: 9 }]
          : []),
        ...Array.from({ length: exercicio.answerLines }, linhaDeResposta),
      ],
      unbreakable: true,
      margin: [0, 16, 0, 0],
    });
  });

  return {
    info: { title: lista.title || lista.courseName || "Lista de exercícios", creator: "Codefólio" },
    pageSize: "A4",
    pageMargins: [50, 50, 50, 50],
    defaultStyle: { fontSize: 11, lineHeight: 1.2 },
    content,
  };
};

/**
 * Monta e baixa a lista em PDF.
 * @param {ReturnType<import("$api/services/courses/questionExport").buildExerciseListDocument>} lista
 * @param {string} filename
 */
export const downloadExerciseListPdf = async (lista, filename) => {
  const [{ default: pdfMake }, { default: vfs }] = await Promise.all([
    import("pdfmake/build/pdfmake"),
    import("pdfmake/build/vfs_fonts"),
  ]);
  pdfMake.addVirtualFileSystem(vfs);
  await pdfMake.createPdf(buildExerciseListPdfDefinition(lista)).download(filename);
};
