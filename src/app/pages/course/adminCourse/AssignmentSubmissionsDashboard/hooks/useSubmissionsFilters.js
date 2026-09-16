import { useState } from "react";
import { gradeInBand } from "../constants";

/**
 * Busca/ordenação/filtros da lista de alunos no modo individual, e o filtro
 * de grupo/status/nota usados também no modo grupo (`GroupSubmissions`).
 */
export function useSubmissionsFilters() {
  const [sortBy, setSortBy] = useState("name");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterGradeBand, setFilterGradeBand] = useState("all");
  const [filterGroup, setFilterGroup] = useState("all");

  // Ordenação/filtro dos alunos (modo individual)
  const sortStudents = (list, { gradesByStudent, submissionsByKey }) => {
    const filtered = list.filter((s) => {
      const matchesSearch = search
        ? (s.name || s.email || "").toLowerCase().includes(search.toLowerCase())
        : true;
      const grade = gradesByStudent[s.userId];
      const hasGrade = grade != null && grade !== "";
      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "graded" && hasGrade) ||
        (filterStatus === "pending" && !hasGrade);
      const matchesGrade = gradeInBand(grade, filterGradeBand);
      return matchesSearch && matchesStatus && matchesGrade;
    });
    const arr = [...filtered];
    arr.sort((a, b) => {
      if (sortBy === "recent") {
        const sa = submissionsByKey[a.userId]?.submittedAt || "";
        const sb = submissionsByKey[b.userId]?.submittedAt || "";
        // mais recentes primeiro; sem entrega vai para o fim
        if (!sa && !sb) return (a.name || "").localeCompare(b.name || "");
        if (!sa) return 1;
        if (!sb) return -1;
        return sb.localeCompare(sa);
      }
      if (sortBy === "ungraded") {
        const ga = gradesByStudent[a.userId] != null ? 1 : 0;
        const gb = gradesByStudent[b.userId] != null ? 1 : 0;
        if (ga !== gb) return ga - gb; // não avaliados (0) primeiro
        return (a.name || "").localeCompare(b.name || "");
      }
      return (a.name || a.email || "").localeCompare(b.name || b.email || "");
    });
    return arr;
  };

  return {
    sortBy,
    setSortBy,
    search,
    setSearch,
    filterStatus,
    setFilterStatus,
    filterGradeBand,
    setFilterGradeBand,
    filterGroup,
    setFilterGroup,
    sortStudents,
  };
}
