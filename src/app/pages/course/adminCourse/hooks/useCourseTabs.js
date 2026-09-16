import { useState } from "react";

// Abas: 0 Conteúdo, 1 Materiais Extras, 2 Quiz, 3 Alunos, 4 Avaliações,
// 5 Trabalhos, 6 Dúvidas (esta só para o dono do curso e admins).
const LAST_TAB_INDEX = 6;

/**
 * Aba selecionada, com clamp para links antigos que apontavam para índices
 * que não existem mais.
 */
export function useCourseTabs(initialTabParam) {
  const [selectedTab, setSelectedTab] = useState(() => {
    const tab = parseInt(initialTabParam) || 0;
    return tab >= 0 && tab <= LAST_TAB_INDEX ? tab : 0;
  });

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  return { selectedTab, handleTabChange };
}
