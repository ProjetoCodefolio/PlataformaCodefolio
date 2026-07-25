// Lógica PURA de auditoria/recuperação de progresso de curso (sem Firebase).
//
// Os scripts em `scripts/` fazem o IO (admin SDK) e delegam o cálculo para cá,
// seguindo a mesma separação usada nas notas (cálculo puro vs. acesso ao banco).
// Assim estas funções são testáveis sem emulador.
//
// Contexto do problema: o progresso por item vive em
// `videoProgress/{uid}/{courseId}/{contentId}`, chaveado pelo id do conteúdo.
// Quando um conteúdo é deletado (e recadastrado com um id novo), o nó de
// progresso do aluno fica "órfão": seu id não corresponde a nenhum conteúdo
// atual do curso, e o item recriado aparece sem o check de assistido.

/**
 * Extrai o id de um vídeo do YouTube de uma URL (watch?v=, youtu.be/, /embed/).
 * @param {string} url
 * @returns {string|null}
 */
export const extractYouTubeId = (url) => {
  if (!url || typeof url !== "string") return null;
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id || null;
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (u.pathname === "/watch") return u.searchParams.get("v") || null;
      const parts = u.pathname.split("/").filter(Boolean);
      // /embed/ID ou /v/ID
      if (parts[0] === "embed" || parts[0] === "v") return parts[1] || null;
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Normaliza um título para comparação frouxa (case/espaços/acentos).
 * @param {string} title
 * @returns {string}
 */
export const normalizeTitle = (title) =>
  (title || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/**
 * Um item conta como assistido no progresso salvo quando o flag `watched` é
 * verdadeiro OU o percentual chegou a >= 90 (mesmo limiar de saveVideoProgress).
 * @param {Object} node - nó de videoProgress
 * @returns {boolean}
 */
export const isWatchedNode = (node) =>
  !!node &&
  (node.watched === true ||
    (typeof node.percentageWatched === "number" && node.percentageWatched >= 90));

/**
 * Espelha isContentCompleted (students.js), mas sem depender do Firebase:
 * concluído = assistido e, havendo quiz, aprovado.
 * @param {{watched?:boolean, hasQuiz?:boolean, quizPassed?:boolean}} item
 * @returns {boolean}
 */
export const isItemCompleted = (item) =>
  !!item && !!item.watched && (!item.hasQuiz || !!item.quizPassed);

/**
 * Reúne o conjunto de ids de conteúdo ATUAIS do curso a partir dos nós brutos
 * das quatro origens. Slides entram no conjunto (para não marcá-los órfãos),
 * mas o chamador decide se contam no denominador.
 * @param {Object} sources - { content, videos, slides, flippedIds }
 *   content/videos/slides são objetos { id: item } do RTDB; flippedIds é um array.
 * @returns {Set<string>}
 */
export const collectCurrentContentIds = ({
  content = {},
  videos = {},
  slides = {},
  flippedIds = [],
} = {}) => {
  const ids = new Set();
  [content, videos, slides].forEach((node) => {
    if (node && typeof node === "object") {
      Object.keys(node).forEach((id) => {
        if (node[id] && typeof node[id] === "object") ids.add(id);
      });
    }
  });
  flippedIds.forEach((id) => id && ids.add(id));
  return ids;
};

/**
 * Encontra os nós de progresso "órfãos" de um aluno num curso: assistidos, mas
 * cujo id não está entre os conteúdos atuais.
 * @param {Object} userCourseProgress - videoProgress/{uid}/{courseId} (objeto id→nó)
 * @param {Set<string>} currentIds
 * @returns {Array<{id:string, watched:boolean, percentageWatched:number, quizPassed:boolean}>}
 */
export const findOrphanProgress = (userCourseProgress = {}, currentIds = new Set()) => {
  const orphans = [];
  if (!userCourseProgress || typeof userCourseProgress !== "object") return orphans;
  for (const [id, node] of Object.entries(userCourseProgress)) {
    if (!node || typeof node !== "object") continue;
    if (currentIds.has(id)) continue;
    if (!isWatchedNode(node)) continue;
    orphans.push({
      id,
      watched: node.watched === true,
      percentageWatched:
        typeof node.percentageWatched === "number" ? node.percentageWatched : 0,
      quizPassed: node.quizPassed === true,
    });
  }
  return orphans;
};

/**
 * Recalcula o progresso agregado de um aluno com a MESMA definição do app
 * (updateCourseProgress): considera todo o conteúdo atual exceto slides fora do
 * denominador? Não — o app conta slides como concluídos e no denominador. Aqui
 * replicamos isso: cada item atual conta; concluído = assistido e (sem quiz ou
 * quiz aprovado). Slides entram como sempre assistidos.
 * @param {Array<{id:string, isSlide:boolean, hasQuiz:boolean}>} currentItems
 * @param {Object} userCourseProgress - id→nó de videoProgress do aluno
 * @param {Object} quizPassedById - id→boolean (aprovação, de quizResults/videoProgress)
 * @returns {{completed:number, total:number, progress:number}}
 */
export const recomputeAggregate = (
  currentItems = [],
  userCourseProgress = {},
  quizPassedById = {}
) => {
  const seen = new Set();
  let total = 0;
  let completed = 0;
  for (const item of currentItems) {
    if (!item || item.id == null || seen.has(item.id)) continue;
    seen.add(item.id);
    total += 1;
    const node = userCourseProgress?.[item.id];
    const watched = item.isSlide ? true : isWatchedNode(node);
    const quizPassed =
      quizPassedById[item.id] === true || (node && node.quizPassed === true);
    if (isItemCompleted({ watched, hasQuiz: item.hasQuiz, quizPassed })) {
      completed += 1;
    }
  }
  const progress = total > 0 ? (completed / total) * 100 : 0;
  return { completed, total, progress };
};

// --- Quiz: aprovação e resultados órfãos ------------------------------------
//
// A aprovação no quiz é a fonte de verdade do app: vive em
// `quizResults/{uid}/{courseId}/{key}`, onde `key` é o id do conteúdo — exceto
// slides LEGADOS, cuja chave tem prefixo `slide_`. Como o progresso, ela ORFANA
// quando o conteúdo é deletado e recadastrado (id novo).

/** Um resultado de quiz conta como aprovado quando isPassed/passed é verdadeiro. */
export const isQuizPassedResult = (node) =>
  !!node && (node.isPassed === true || node.passed === true);

/**
 * Normaliza a chave de um resultado de quiz para o id do conteúdo, removendo o
 * prefixo `slide_` dos slides legados.
 * @param {string} key
 * @returns {string}
 */
export const normalizeQuizResultId = (key) =>
  typeof key === "string" && key.startsWith("slide_") ? key.slice(6) : key;

/**
 * Mapa id-do-conteúdo → true para os quizzes aprovados de um aluno, a partir do
 * seu nó `quizResults/{uid}/{courseId}`. É o que o app usa para decidir conclusão
 * (não o espelho `quizPassed` em videoProgress).
 * @param {Object} userQuizResults - key → resultado
 * @returns {Object<string, boolean>}
 */
export const buildQuizPassedById = (userQuizResults = {}) => {
  const map = {};
  if (!userQuizResults || typeof userQuizResults !== "object") return map;
  for (const [key, node] of Object.entries(userQuizResults)) {
    if (isQuizPassedResult(node)) map[normalizeQuizResultId(key)] = true;
  }
  return map;
};

/**
 * Resultados de quiz APROVADOS cujo id (normalizado) não é mais um conteúdo do
 * curso — candidatos a recuperação junto do progresso órfão.
 * @param {Object} userQuizResults - key → resultado
 * @param {Set<string>} currentIds
 * @returns {Array<{key:string, contentId:string}>}
 */
export const findOrphanQuizResults = (userQuizResults = {}, currentIds = new Set()) => {
  const orphans = [];
  if (!userQuizResults || typeof userQuizResults !== "object") return orphans;
  for (const [key, node] of Object.entries(userQuizResults)) {
    if (!isQuizPassedResult(node)) continue;
    const contentId = normalizeQuizResultId(key);
    if (currentIds.has(contentId) || currentIds.has(key)) continue;
    orphans.push({ key, contentId });
  }
  return orphans;
};

/**
 * Merge MONOTÔNICO de um resultado de quiz da origem (órfã) sobre o destino:
 * restaura a aprovação sem rebaixar um destino que já esteja aprovado. Retorna o
 * objeto a gravar no destino, ou null se nada a fazer.
 * @param {Object} source - resultado do id antigo
 * @param {Object} target - resultado do id novo (pode ser undefined)
 * @returns {Object|null}
 */
export const mergeQuizResultNode = (source, target) => {
  if (!isQuizPassedResult(source)) return null; // só migramos aprovações
  if (isQuizPassedResult(target)) return null; // destino já aprovado
  if (!target || typeof target !== "object") {
    return { ...source, isPassed: true, passed: true };
  }
  return { ...target, isPassed: true, passed: true };
};

/**
 * Faz o merge MONOTÔNICO de um nó de progresso de origem sobre o destino: nunca
 * rebaixa o que já existe no destino e preserva quizPassed/hasQuizData. Retorna
 * o objeto a ser gravado com update() no destino (ou null se nada a fazer).
 * @param {Object} source - nó de progresso órfão (origem)
 * @param {Object} target - nó de progresso atual do destino (pode ser undefined)
 * @returns {Object|null}
 */
export const mergeProgressNode = (source, target = {}) => {
  if (!source || typeof source !== "object") return null;
  const t = target && typeof target === "object" ? target : {};

  const srcPct =
    typeof source.percentageWatched === "number" ? source.percentageWatched : 0;
  const tgtPct = typeof t.percentageWatched === "number" ? t.percentageWatched : 0;
  const percentageWatched = Math.max(srcPct, tgtPct);
  const watched = percentageWatched >= 90 || t.watched === true || source.watched === true;
  const completed =
    percentageWatched >= 100 || t.completed === true || source.completed === true;

  const merged = {
    percentageWatched,
    watched,
    completed,
    // Preserva a maior marca de tempo assistido conhecida.
    watchedTimeInSeconds: Math.max(
      typeof source.watchedTimeInSeconds === "number" ? source.watchedTimeInSeconds : 0,
      typeof t.watchedTimeInSeconds === "number" ? t.watchedTimeInSeconds : 0
    ),
    lastUpdated: new Date().toISOString(),
  };

  // quizPassed/hasQuizData: nunca rebaixar uma aprovação existente.
  if (t.quizPassed === true || source.quizPassed === true) merged.quizPassed = true;
  if (t.hasQuizData === true || source.hasQuizData === true) merged.hasQuizData = true;

  // Se o destino já cobre tudo (>= origem em tudo), não há o que gravar.
  const nothingToDo =
    percentageWatched === tgtPct &&
    watched === (t.watched === true) &&
    completed === (t.completed === true) &&
    (merged.quizPassed === true) === (t.quizPassed === true) &&
    (merged.hasQuizData === true) === (t.hasQuizData === true);
  if (nothingToDo) return null;

  return merged;
};
