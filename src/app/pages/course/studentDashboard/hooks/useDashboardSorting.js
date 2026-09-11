import { useState } from "react";
import { getSortedStudentResults } from "$api/services/courses/studentDashboard";
import { sortRows, getNextSort } from "$utils/tableSort";

/**
 * Busca + ordenação da lista de estudantes. O dropdown (`sortType`) e os
 * cabeçalhos clicáveis (`sortField`/`sortOrder`) compartilham a mesma lista:
 * usar o dropdown devolve o controle da ordenação a ele, limpando o sort por
 * cabeçalho.
 */
export function useDashboardSorting({ studentResults, liveQuizResults, customQuizResults }) {
  const [sortType, setSortType] = useState("name");
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [searchTerm, setSearchTerm] = useState("");

  const handleSortChange = (event) => {
    setSortType(event.target.value);
    setSortField("");
  };

  // Ordenação por clique no cabeçalho (sobrepõe o dropdown enquanto ativa)
  const handleSort = (field) => {
    const next = getNextSort({ sortField, sortOrder }, field);
    setSortField(next.sortField);
    setSortOrder(next.sortOrder);
  };

  // Acessores para colunas derivadas da tabela principal (status e total geral)
  const dashboardSortAccessors = {
    status: (s) => (s.passed ? 1 : 0),
    totalCorrect: (s) =>
      (s.correctAnswers || 0) +
      (liveQuizResults[s.userId]?.correctAnswers || 0) +
      (customQuizResults[s.userId]?.correctAnswers || 0),
  };

  // Lista final exibida nas tabelas: aplica o sort por cabeçalho sobre o
  // resultado do serviço (que já faz busca + ordenação do dropdown). Quando
  // nenhum cabeçalho está ativo (sortField vazio), mantém a ordem do serviço.
  const getSortedResults = () => getSortedStudentResults(studentResults, searchTerm, sortType);
  const sortedResults = sortField
    ? sortRows(getSortedResults(), sortField, sortOrder, dashboardSortAccessors)
    : getSortedResults();

  return {
    sortType,
    sortField,
    sortOrder,
    searchTerm,
    setSearchTerm,
    handleSortChange,
    handleSort,
    sortedResults,
  };
}
