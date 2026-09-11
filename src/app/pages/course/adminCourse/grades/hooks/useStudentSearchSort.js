import { useMemo, useState } from "react";

/**
 * Busca por nome + ordenação client-side de uma lista de estudantes, com o
 * clique-no-cabeçalho alternando asc/desc (ou trocando de coluna e voltando
 * pra asc). `extraFilter` permite compor um filtro adicional (ex.: status)
 * sem esse hook precisar conhecer o domínio de cada tela; `sortFn` é quem
 * sabe ordenar pelos campos específicos de cada lista.
 *
 * @param {Array} students
 * @param {Object} [options]
 * @param {string} [options.initialSortField]
 * @param {(list: Array, sortField: string, sortOrder: "asc"|"desc") => Array} [options.sortFn]
 * @param {(student: Object) => boolean} [options.extraFilter]
 */
export function useStudentSearchSort(students, { initialSortField = "name", sortFn, extraFilter } = {}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState(initialSortField);
  const [sortOrder, setSortOrder] = useState("asc");

  const handleSortClick = (field) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const filteredAndSorted = useMemo(() => {
    const term = searchTerm.toLowerCase();

    const filtered = students.filter((student) => {
      const matchesSearch = student.name.toLowerCase().includes(term);
      const matchesExtra = extraFilter ? extraFilter(student) : true;
      return matchesSearch && matchesExtra;
    });

    return sortFn ? sortFn(filtered, sortField, sortOrder) : filtered;
  }, [students, searchTerm, sortField, sortOrder, extraFilter, sortFn]);

  return {
    searchTerm,
    setSearchTerm,
    sortField,
    sortOrder,
    handleSortClick,
    filteredAndSorted,
  };
}
