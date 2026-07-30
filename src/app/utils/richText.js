/**
 * Utilitários de texto rico (rich text) para enunciados e entregas.
 *
 * O HTML exibido vem de duas origens: do RichTextEditor (contentEditable, usado
 * nas entregas) e da conversão de markdown ($utils/markdown, usado no enunciado
 * do trabalho). Como esse HTML é criado por usuários e depois exibido para
 * outros (professor vê a entrega do aluno; alunos veem o enunciado do
 * professor), ele PRECISA ser sanitizado antes de ir para dentro de
 * dangerouslySetInnerHTML.
 *
 * A sanitização aqui é por lista branca (whitelist): apenas tags de formatação
 * são mantidas e TODOS os atributos são descartados, exceto href/src/alt
 * validados em <a> e <img>. Isso elimina scripts, handlers de evento
 * (onclick...), estilos e qualquer outro vetor de XSS. O parsing é feito com
 * DOMParser, que não executa scripts nem carrega recursos.
 */

// Tags de formatação permitidas (o restante é "desembrulhado", mantendo o texto).
const ALLOWED_TAGS = new Set([
  "P",
  "DIV",
  "BR",
  "B",
  "STRONG",
  "I",
  "EM",
  "U",
  "S",
  "STRIKE",
  "DEL",
  "UL",
  "OL",
  "LI",
  "A",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "BLOCKQUOTE",
  // Vindas do markdown
  "PRE",
  "CODE",
  "HR",
  "IMG",
  "TABLE",
  "THEAD",
  "TBODY",
  "TR",
  "TH",
  "TD",
]);

const SAFE_HREF = /^(https?:|mailto:)/i;
const SAFE_IMG_SRC = /^(https?:|data:image\/(png|jpe?g|gif|webp);)/i;

const escapeHtml = (str) =>
  String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const sanitizeNode = (node, outDoc) => {
  // Texto: sempre preservado.
  if (node.nodeType === 3 /* TEXT_NODE */) {
    return outDoc.createTextNode(node.nodeValue);
  }
  if (node.nodeType !== 1 /* ELEMENT_NODE */) return null;

  const tag = node.tagName;

  // Tag não permitida: descarta o elemento mas mantém seus filhos (unwrap).
  if (!ALLOWED_TAGS.has(tag)) {
    const frag = outDoc.createDocumentFragment();
    node.childNodes.forEach((child) => {
      const clean = sanitizeNode(child, outDoc);
      if (clean) frag.appendChild(clean);
    });
    return frag;
  }

  const el = outDoc.createElement(tag.toLowerCase());

  // Únicos atributos mantidos: href seguro em links e src/alt em imagens.
  if (tag === "A") {
    const href = (node.getAttribute("href") || "").trim();
    if (SAFE_HREF.test(href)) {
      el.setAttribute("href", href);
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener noreferrer");
    }
  } else if (tag === "IMG") {
    const src = (node.getAttribute("src") || "").trim();
    // Imagem com origem não confiável vira nada (nem o elemento sobra).
    if (!SAFE_IMG_SRC.test(src)) return null;
    el.setAttribute("src", src);
    el.setAttribute("alt", node.getAttribute("alt") || "");
  }

  node.childNodes.forEach((child) => {
    const clean = sanitizeNode(child, outDoc);
    if (clean) el.appendChild(clean);
  });
  return el;
};

/**
 * Retorna uma versão segura do HTML para exibição via dangerouslySetInnerHTML.
 * Conteúdo antigo em texto puro (sem tags) tem as quebras de linha preservadas.
 * @param {string} html
 * @returns {string}
 */
export const sanitizeRichHtml = (html) => {
  if (!html || typeof html !== "string") return "";
  // Conteúdo legado em texto puro: escapa e preserva quebras de linha.
  if (!html.includes("<")) {
    return escapeHtml(html).replace(/\r?\n/g, "<br>");
  }
  const inputDoc = new DOMParser().parseFromString(html, "text/html");
  const outDoc = document.implementation.createHTMLDocument("");
  const container = outDoc.createElement("div");
  Array.from(inputDoc.body.childNodes).forEach((child) => {
    const clean = sanitizeNode(child, outDoc);
    if (clean) container.appendChild(clean);
  });
  return container.innerHTML;
};

/**
 * Converte o HTML em texto puro (para validação / exportação).
 * @param {string} html
 * @returns {string}
 */
export const richTextToPlain = (html) => {
  if (!html || typeof html !== "string") return "";
  if (!html.includes("<")) return html.trim();
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent || "").trim();
};

/**
 * True quando o conteúdo não tem texto visível (vazio ou só marcação).
 * @param {string} html
 * @returns {boolean}
 */
export const richTextIsEmpty = (html) => richTextToPlain(html).length === 0;
