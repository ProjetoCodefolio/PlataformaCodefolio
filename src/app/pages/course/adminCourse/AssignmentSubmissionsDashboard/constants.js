export const SORT_OPTIONS = [
  { value: "name", label: "Ordem alfabética" },
  { value: "recent", label: "Ordem de envio (mais recentes)" },
  { value: "ungraded", label: "Não avaliados primeiro" },
];

export const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "graded", label: "Avaliados" },
  { value: "pending", label: "Pendentes (sem nota)" },
];

export const GRADE_BAND_OPTIONS = [
  { value: "all", label: "Todas as notas" },
  { value: "9-10", label: "9 – 10" },
  { value: "7-8.99", label: "7 – 8,9" },
  { value: "6-6.99", label: "6 – 6,9" },
  { value: "0-5.99", label: "Abaixo de 6" },
];

/** Retorna true se a nota (número ou null) cai na faixa selecionada. */
export const gradeInBand = (grade, band) => {
  if (band === "all") return true;
  if (grade == null || grade === "") return false;
  const n = Number(grade);
  if (Number.isNaN(n)) return false;
  switch (band) {
    case "9-10":
      return n >= 9;
    case "7-8.99":
      return n >= 7 && n < 9;
    case "6-6.99":
      return n >= 6 && n < 7;
    case "0-5.99":
      return n < 6;
    default:
      return true;
  }
};
