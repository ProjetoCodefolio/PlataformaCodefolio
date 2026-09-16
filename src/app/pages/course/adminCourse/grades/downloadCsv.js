/**
 * Dispara o download de um conteúdo CSV no navegador. Isola o boilerplate de
 * `Blob`/`URL.createObjectURL`/link temporário repetido nas telas de notas/
 * avaliações do professor.
 * @param {string} filename
 * @param {string} content
 */
export const downloadCsv = (filename, content) => {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.click();
};
