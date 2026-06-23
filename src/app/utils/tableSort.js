/**
 * Utilitários de ordenação para tabelas.
 *
 * As tabelas do sistema são heterogêneas (campos diretos, derivados, datas em
 * string, números), então `sortRows` aceita um mapa opcional de "accessors" para
 * extrair o valor de ordenação de cada coluna. Valores vazios (null/undefined/"")
 * vão sempre para o fim, independentemente da direção, para não poluir o topo.
 */

/**
 * Ordena uma cópia do array `rows` por `sortField`/`sortOrder`.
 * @param {Array} rows - Linhas a ordenar (não é mutado)
 * @param {string} sortField - Chave da coluna ativa
 * @param {"asc"|"desc"} sortOrder - Direção da ordenação
 * @param {Object<string, (row:any)=>any>} [accessors] - Extratores por coluna
 * @returns {Array} - Novo array ordenado
 */
export const sortRows = (rows, sortField, sortOrder = "asc", accessors = {}) => {
  if (!sortField || !Array.isArray(rows)) return rows;

  const accessor = accessors[sortField] || ((row) => (row ? row[sortField] : undefined));
  const factor = sortOrder === "desc" ? -1 : 1;

  const isEmpty = (v) => v === null || v === undefined || v === "";

  return [...rows].sort((a, b) => {
    const va = accessor(a);
    const vb = accessor(b);

    const aEmpty = isEmpty(va);
    const bEmpty = isEmpty(vb);
    if (aEmpty && bEmpty) return 0;
    if (aEmpty) return 1; // vazios sempre por último
    if (bEmpty) return -1;

    if (typeof va === "number" && typeof vb === "number") {
      return (va - vb) * factor;
    }

    return (
      String(va).localeCompare(String(vb), "pt-BR", {
        numeric: true,
        sensitivity: "base",
      }) * factor
    );
  });
};

/**
 * Calcula o próximo estado de ordenação ao clicar numa coluna: alterna a direção
 * se a coluna já está ativa, ou ativa a coluna em ordem ascendente.
 * @param {{ sortField: string, sortOrder: "asc"|"desc" }} current
 * @param {string} field - Coluna clicada
 * @returns {{ sortField: string, sortOrder: "asc"|"desc" }}
 */
export const getNextSort = (current, field) => {
  if (current.sortField === field) {
    return { sortField: field, sortOrder: current.sortOrder === "asc" ? "desc" : "asc" };
  }
  return { sortField: field, sortOrder: "asc" };
};
