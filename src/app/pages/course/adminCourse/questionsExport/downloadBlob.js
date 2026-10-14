/**
 * Baixa um arquivo gerado no navegador (planilha, .docx ou PDF), pelo mesmo
 * caminho do `downloadCsv` das notas: link temporário com `createObjectURL`.
 * @param {string} filename
 * @param {Blob} blob
 */
export const downloadBlob = (filename, blob) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.click();
  // Solta o arquivo da memória depois que o navegador já começou o download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
