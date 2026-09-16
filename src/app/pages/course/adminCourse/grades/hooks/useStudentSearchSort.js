import { useMemo, useState } from "react";

const defaultMatchesSearch = (student, term) => student.name.toLowerCase().includes(term);

/**
 * Busca + ordenação client-side de uma lista de estudantes, com o
 * clique-no-cabeçalho alternando asc/desc (ou trocando de coluna e voltando
 * pra asc). `extraFilter` permite compor um filtro adicional (ex.: status)
 * sem esse hook precisar conhecer o domínio de cada tela; `sortFn` é quem
 * sabe ordenar pelos campos específicos de cada lista; `matchesSearch` troca
 * o que conta como "bater a busca" (por padrão, só o nome — algumas telas
 * também buscam por email).
 *
 * @param {Array} students
 * @param {Object} [options]
 * @param {string} [options.initialSortField]
 * @param {(list: Array, sortField: string, sortOrder: "asc"|"desc") => Array} [options.sortFn]
 * @param {(student: Object) => boolean} [options.extraFilter]
 * @param {(student: Object, term: string) => boolean} [options.matchesSearch]
 */
export function useStudentSearchSort(
  students,
  { initialSortField = "name", sortFn, extraFilter, matchesSearch = defaultMatchesSearch } = {}
) {
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
      const search = matchesSearch(student, term);
      const matchesExtra = extraFilter ? extraFilter(student) : true;
      return search && matchesExtra;
    });

    return sortFn ? sortFn(filtered, sortField, sortOrder) : filtered;
  }, [students, searchTerm, sortField, sortOrder, extraFilter, sortFn, matchesSearch]);

  return {
    searchTerm,
    setSearchTerm,
    sortField,
    sortOrder,
    handleSortClick,
    filteredAndSorted,
  };
}
