/** Formata uma nota com 2 casas decimais em pt-BR; "0,00" para valores não numéricos. */
export const formatGrade = (n) =>
  Number.isFinite(n)
    ? n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "0,00";
