/**
 * Reencaixa o índice em cartaz sempre que a lista de dúvidas muda (dúvida
 * nova chegando, troca de filtro, dúvida marcada como discutida ou excluída).
 *
 * A âncora é o ID da dúvida que estava em cartaz, não a posição: a lista
 * chega ao vivo e pode ser reordenada/encolhida a qualquer momento.
 *  - a dúvida em cartaz ainda está na lista → segue nela, na posição nova;
 *  - saiu da lista (discutida, excluída ou fora do filtro) → fica na MESMA
 *    posição, que agora é a dúvida seguinte, e não numa tela vazia.
 *
 * @param {Array} visiveis - lista de dúvidas no recorte atual
 * @param {string|null} anchorId - id da dúvida que estava em cartaz
 * @param {number} currentIndex - índice em cartaz antes do reencaixe
 * @returns {{ nextIndex: number, nextAnchorId: string|null }}
 */
export const reindexAnchoredPosition = (visiveis, anchorId, currentIndex) => {
  const total = visiveis.length;
  const posicao = anchorId ? visiveis.findIndex((item) => item?.id === anchorId) : -1;
  const nextIndex =
    posicao >= 0 ? posicao : total === 0 ? 0 : Math.min(currentIndex, total - 1);
  const nextAnchorId = visiveis[nextIndex]?.id || null;
  return { nextIndex, nextAnchorId };
};
