// Serviço de ordenação unificada do conteúdo do curso.
//
// O conteúdo de um curso vive hoje em TRÊS lugares que compartilham UMA única
// ordem global e arrastável (`order`, sequência 0..N-1 que atravessa todos):
//   - courseContent/{courseId}  → nova collection unificada (source: 'content')
//   - courseVideos/{courseId}   → vídeos legados            (source: 'video')
//   - courseSlides/{courseId}   → slides legados            (source: 'slide')
//
// Isto permite intercalar vídeo e slide (novos ou legados) na ordem que o
// professor quiser. Este módulo lê o banco diretamente (sem depender de
// content.js / videos.js / slides.js) para não criar dependências circulares.

import { ref, get, update } from "firebase/database";
import { database } from "../../config/firebase";

// Caminho no banco para cada origem de conteúdo.
const SOURCE_NODES = {
  content: "courseContent",
  video: "courseVideos",
  slide: "courseSlides",
};

/**
 * Compara dois itens por ordem, com desempate determinístico.
 * Itens sem `order` numérico vão para o fim (ex.: slides legados antigos),
 * preservando o comportamento anterior.
 */
const compareContent = (a, b) => {
  const orderA = typeof a.order === "number" ? a.order : Number.POSITIVE_INFINITY;
  const orderB = typeof b.order === "number" ? b.order : Number.POSITIVE_INFINITY;
  if (orderA !== orderB) return orderA - orderB;
  // Desempate estável: vídeos antes de slides, depois por id.
  if (a.category !== b.category) return a.category === "video" ? -1 : 1;
  return String(a.id).localeCompare(String(b.id));
};

/**
 * Lê um nó de origem e devolve seus itens normalizados para ordenação.
 */
const readSource = async (courseId, source) => {
  const node = SOURCE_NODES[source];
  const snapshot = await get(ref(database, `${node}/${courseId}`));
  if (!snapshot.exists()) return [];

  const raw = snapshot.val() || {};
  return Object.entries(raw)
    .filter(([, item]) => item && typeof item === "object")
    .map(([id, item]) => {
      // A categoria vem do próprio item (nova collection) ou é inferida da
      // origem legada.
      let category;
      if (source === "content") {
        category = item.category === "slide" ? "slide" : "video";
      } else {
        category = source; // 'video' | 'slide'
      }
      return {
        id,
        source,
        legacy: source !== "content",
        category,
        title:
          item.title ||
          (category === "slide" ? "Slide sem título" : "Vídeo sem título"),
        url: item.url || "",
        order: typeof item.order === "number" ? item.order : undefined,
      };
    });
};

/**
 * Busca TODO o conteúdo do curso (nova collection + legado) já mesclado e
 * ordenado pela ordem global. Cada item traz
 * `{ id, source, legacy, category, title, url, order }`.
 * @param {string} courseId
 * @returns {Promise<Array>}
 */
export const fetchCourseContent = async (courseId) => {
  if (!courseId) return [];

  const [content, videos, slides] = await Promise.all([
    readSource(courseId, "content"),
    readSource(courseId, "video"),
    readSource(courseId, "slide"),
  ]);

  return [...content, ...videos, ...slides].sort(compareContent);
};

/**
 * Retorna o próximo valor de ordem global (max + 1) considerando as três
 * origens. Usado ao adicionar um novo item para que ele caia no fim da lista.
 * @param {string} courseId
 * @returns {Promise<number>}
 */
export const getNextContentOrder = async (courseId) => {
  if (!courseId) return 0;

  const snapshots = await Promise.all(
    Object.values(SOURCE_NODES).map((node) =>
      get(ref(database, `${node}/${courseId}`))
    )
  );

  let maxOrder = -1;
  snapshots.forEach((snap) => {
    if (!snap.exists()) return;
    Object.values(snap.val() || {}).forEach((item) => {
      if (item && typeof item === "object" && typeof item.order === "number") {
        if (item.order > maxOrder) maxOrder = item.order;
      }
    });
  });

  return maxOrder + 1;
};

/**
 * Persiste a nova ordem global do conteúdo. Reindexa 0..N-1 na ordem recebida,
 * escrevendo apenas o campo `order` de cada item no nó correto conforme sua
 * origem (multi-path update atômico), sem tocar em nenhum outro dado.
 * @param {string} courseId
 * @param {Array<{id:string, source:'content'|'video'|'slide'}>} orderedItems
 * @returns {Promise<boolean>}
 */
export const saveCourseContentOrder = async (courseId, orderedItems) => {
  if (!courseId) throw new Error("ID do curso não disponível");
  if (!Array.isArray(orderedItems)) throw new Error("Lista de conteúdo inválida");

  const updates = {};
  orderedItems.forEach((item, index) => {
    if (!item || !item.id) return;
    const node = SOURCE_NODES[item.source] || SOURCE_NODES.video;
    updates[`${node}/${courseId}/${item.id}/order`] = index;
  });

  if (Object.keys(updates).length > 0) {
    await update(ref(database), updates);
  }

  return true;
};
