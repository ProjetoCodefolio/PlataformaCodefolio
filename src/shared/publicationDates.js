// Regras de data da publicação programada, sem Firebase e sem relógio
// implícito: quem chama passa o `now`. Usado pelo app (publication.js, que
// acrescenta o relógio do servidor) e pelo Worker do Cloudflare, que decide
// na hora da publicação se o item já saiu.

/** Normaliza um `publishAt` para ISO. "" quando ausente ou inválido. */
export const normalizePublishAt = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
};

/** O `publishAt` ainda está no futuro em relação a `now` (item programado). */
export const isScheduledAt = (publishAt, now) => {
  const iso = normalizePublishAt(publishAt);
  if (!iso) return false;
  return now.getTime() < new Date(iso).getTime();
};

/**
 * Data de publicação EFETIVA de um quiz: ele só aparece quando ele e o
 * conteúdo ao qual está preso estiverem publicados, então vale a maior das
 * duas datas. "" quando nenhuma das duas tem data.
 */
export const effectiveQuizPublishAt = (quiz, content) => {
  const datas = [normalizePublishAt(quiz?.publishAt), normalizePublishAt(content?.publishAt)]
    .filter(Boolean)
    .sort();
  return datas.length ? datas[datas.length - 1] : "";
};
