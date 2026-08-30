// Importação de CONTEÚDO (vídeo ou slide) de outro curso, opcionalmente com o
// questionário que estava preso a ele.
//
// A ordem das operações não é arbitrária. Um quiz é chaveado pelo conteúdo —
// `courseQuizzes/{courseId}/{contentId}` —, então o quiz só pode ser gravado
// depois que existe um id novo no destino. Por isso as chaves são geradas aqui
// (push sem gravar) e conteúdo e quiz saem juntos num único update na raiz: se
// o quiz falhasse depois, o professor ficaria com uma aula muda e sem aviso.
//
// O que é importado vai SEMPRE para a collection nova (`courseContent`), venha
// da collection nova ou dos nós legados da origem. Não há razão para criar
// registro legado novo.
//
// Vídeos de entrega (sala invertida) ficam de fora da lista: são trabalho de
// aluno de outra turma, não material do professor.

import { ref, get, push, update } from "firebase/database";
import { database } from "../../config/firebase";
import { validateContentUrl } from "./content";
import { getNextContentOrder } from "./contentOrder";
import { buildImportedQuiz } from "./quizImport";

/**
 * Marca o que já existe no destino, comparando pela URL.
 *
 * Importar de novo criaria um segundo item idêntico na lista do aluno — e, pior
 * que na lista de materiais, um conteúdo repetido conta duas vezes no
 * progresso do curso.
 *
 * @param {Array} sourceItems - conteúdo da origem
 * @param {Array} targetItems - conteúdo que já existe no destino
 * @returns {Array} os itens da origem com `alreadyImported`
 */
export const markAlreadyImportedContent = (sourceItems, targetItems) => {
  const urlsNoDestino = new Set(
    (targetItems || [])
      .map((item) => (item?.url || "").trim().toLowerCase())
      .filter(Boolean)
  );

  return (sourceItems || []).map((item) => ({
    ...item,
    alreadyImported: urlsNoDestino.has((item?.url || "").trim().toLowerCase()),
  }));
};

/**
 * Normaliza um registro cru de conteúdo, venha da collection nova ou de um nó
 * legado. `category` só existe na collection nova; nos legados ela é a própria
 * origem.
 */
const normalizarItem = (id, raw, categoriaPadrao) => {
  const category =
    categoriaPadrao ||
    (raw?.category === "slide" ? "slide" : "video");

  return {
    id,
    category,
    title:
      raw?.title ||
      (category === "slide" ? "Slide sem título" : "Vídeo sem título"),
    url: raw?.url || "",
    description: String(raw?.description || ""),
    requiresPrevious: !!raw?.requiresPrevious,
    order: typeof raw?.order === "number" ? raw.order : undefined,
  };
};

/** Ordena pela ordem global, com desempate determinístico por id. */
const porOrdem = (a, b) => {
  const oa = typeof a.order === "number" ? a.order : Number.POSITIVE_INFINITY;
  const ob = typeof b.order === "number" ? b.order : Number.POSITIVE_INFINITY;
  if (oa !== ob) return oa - ob;
  return String(a.id).localeCompare(String(b.id));
};

/**
 * Lista o conteúdo de um curso que pode servir de origem para uma importação,
 * já dizendo quais itens têm questionário preso.
 *
 * @param {string} courseId - curso de ORIGEM
 * @returns {Promise<Array>} itens com `{ id, category, title, url, description,
 *   requiresPrevious, order, hasQuiz }`
 */
export const fetchImportableContent = async (courseId) => {
  if (!courseId) return [];

  const [contentSnap, videosSnap, slidesSnap, quizzesSnap] = await Promise.all([
    get(ref(database, `courseContent/${courseId}`)),
    get(ref(database, `courseVideos/${courseId}`)),
    get(ref(database, `courseSlides/${courseId}`)),
    get(ref(database, `courseQuizzes/${courseId}`)),
  ]);

  const comQuiz = new Set(Object.keys(quizzesSnap.val() || {}));

  const daFonte = (snapshot, categoriaPadrao) =>
    Object.entries(snapshot.val() || {})
      .filter(([, raw]) => raw && typeof raw === "object")
      .map(([id, raw]) => normalizarItem(id, raw, categoriaPadrao));

  const itens = [
    ...daFonte(contentSnap, null),
    ...daFonte(videosSnap, "video"),
    ...daFonte(slidesSnap, "slide"),
  ];

  return itens
    .map((item) => ({ ...item, hasQuiz: comQuiz.has(item.id) }))
    .sort(porOrdem);
};

/**
 * Importa conteúdo de outro curso, trazendo junto o questionário dos itens em
 * que o professor pediu.
 *
 * Um item cuja URL não passa na validação da própria categoria é PULADO em vez
 * de derrubar a importação inteira: a origem pode ser antiga e ter um link que
 * as regras de hoje não aceitam mais, e o resto da seleção continua válido.
 *
 * @param {Object} params
 * @param {string} params.sourceCourseId
 * @param {string} params.targetCourseId
 * @param {Array<{contentId: string, withQuiz?: boolean}>} params.selections
 * @returns {Promise<{imported: Array, skipped: Array, quizzes: number}>}
 */
export const importContentFromCourse = async ({
  sourceCourseId,
  targetCourseId,
  selections,
}) => {
  if (!sourceCourseId || !targetCourseId) {
    throw new Error("Curso de origem e de destino são necessários");
  }
  if (sourceCourseId === targetCourseId) {
    throw new Error("O curso de origem não pode ser o próprio curso");
  }
  if (!Array.isArray(selections) || selections.length === 0) {
    throw new Error("Selecione ao menos um conteúdo para importar");
  }

  const disponiveis = await fetchImportableContent(sourceCourseId);
  const porId = new Map(disponiveis.map((item) => [item.id, item]));

  // Respeita a ordem em que os itens aparecem na ORIGEM, não a ordem em que o
  // professor foi clicando nas caixas.
  const escolhidos = disponiveis
    .map((item) => {
      const escolha = selections.find((s) => s?.contentId === item.id);
      return escolha ? { item, withQuiz: !!escolha.withQuiz } : null;
    })
    .filter(Boolean);

  if (escolhidos.length === 0) {
    throw new Error("Nenhum dos conteúdos selecionados existe mais na origem");
  }

  // A base é lida UMA vez e os itens entram em base, base+1, base+2… Assim a
  // importação anexa ao fim sem reindexar a lista que o professor arrastou.
  const base = await getNextContentOrder(targetCourseId);

  const quizzesDaOrigem = escolhidos.some((e) => e.withQuiz)
    ? (await get(ref(database, `courseQuizzes/${sourceCourseId}`))).val() || {}
    : {};

  const updates = {};
  const imported = [];
  const skipped = [];
  let quizzes = 0;

  escolhidos.forEach(({ item, withQuiz }) => {
    const validacao = validateContentUrl(item.url, item.category);
    if (!validacao.isValid) {
      skipped.push({ title: item.title, reason: validacao.message });
      return;
    }

    const novoId = push(ref(database, `courseContent/${targetCourseId}`)).key;
    const novo = {
      category: item.category,
      title: item.title,
      url: item.url.trim(),
      description: item.description,
      requiresPrevious: item.requiresPrevious,
      order: base + imported.length,
    };

    updates[`courseContent/${targetCourseId}/${novoId}`] = novo;
    imported.push({ ...novo, id: novoId, sourceId: item.id });

    if (!withQuiz) return;

    const origemQuiz = quizzesDaOrigem[item.id];
    if (!origemQuiz) {
      skipped.push({
        title: item.title,
        reason: "O questionário não existe mais na origem",
      });
      return;
    }

    try {
      updates[`courseQuizzes/${targetCourseId}/${novoId}`] = buildImportedQuiz({
        origem: origemQuiz,
        targetCourseId,
        targetContentId: novoId,
      });
      quizzes += 1;
    } catch (error) {
      // Quiz sem questões: o conteúdo entra assim mesmo, sem o questionário.
      skipped.push({ title: item.title, reason: error.message });
    }
  });

  if (imported.length === 0) {
    throw new Error("Nenhum conteúdo válido foi encontrado para importar");
  }

  await update(ref(database), updates);

  return { imported, skipped, quizzes };
};
