/**
 * Markdown do enunciado do trabalho.
 *
 * O professor escreve markdown (fonte da verdade, salvo em
 * `descriptionMarkdown`); a plataforma renderiza para HTML na pré-visualização
 * do formulário e na tela do aluno. O HTML gerado passa SEMPRE pelo sanitizador
 * de $utils/richText — markdown aceita HTML bruto no meio do texto, então sem a
 * sanitização um `<script>` digitado no enunciado chegaria ao aluno.
 */

import { marked } from "marked";
import { sanitizeRichHtml } from "./richText";

// gfm: tabelas, ~~tachado~~ e afins. breaks: quebra de linha simples vira <br>,
// que é o que um professor espera ao apertar Enter (estilo GitHub/WhatsApp).
const MARKED_OPTIONS = { gfm: true, breaks: true, async: false };

/**
 * Converte markdown em HTML já sanitizado, pronto para dangerouslySetInnerHTML.
 * @param {string} markdown
 * @returns {string}
 */
export const markdownToHtml = (markdown) => {
  if (!markdown || typeof markdown !== "string") return "";
  return sanitizeRichHtml(marked.parse(markdown, MARKED_OPTIONS));
};

/**
 * True quando não há conteúdo digitado (só espaços em branco).
 * @param {string} markdown
 * @returns {boolean}
 */
export const markdownIsEmpty = (markdown) =>
  !markdown || typeof markdown !== "string" || markdown.trim().length === 0;

// --- Migração do conteúdo legado (HTML do RichTextEditor) -------------------

// Caracteres que, soltos no texto, o markdown interpretaria como marcação.
const escapeMarkdown = (text) => text.replace(/([\\`*_[\]#>])/g, "\\$1");

const BLOCK_TAGS = new Set(["P", "DIV", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "UL", "OL"]);

const nodeToMarkdown = (node, listContext) => {
  if (node.nodeType === 3 /* TEXT_NODE */) {
    // Quebras de linha do HTML são só formatação da fonte; o espaçamento real
    // vem das tags de bloco.
    return escapeMarkdown(node.nodeValue.replace(/\s*\r?\n\s*/g, " "));
  }
  if (node.nodeType !== 1 /* ELEMENT_NODE */) return "";

  const tag = node.tagName;
  const inner = childrenToMarkdown(node, listContext);
  const trimmed = inner.trim();

  switch (tag) {
    case "BR":
      return "\n";
    case "B":
    case "STRONG":
      return trimmed ? `**${trimmed}**` : "";
    case "I":
    case "EM":
      return trimmed ? `*${trimmed}*` : "";
    case "S":
    case "STRIKE":
    case "DEL":
      return trimmed ? `~~${trimmed}~~` : "";
    case "U":
      // Markdown não tem sublinhado; o HTML bruto sobrevive à sanitização.
      return trimmed ? `<u>${trimmed}</u>` : "";
    case "A": {
      const href = (node.getAttribute("href") || "").trim();
      if (!trimmed) return "";
      return href ? `[${trimmed}](${href})` : trimmed;
    }
    case "H1":
    case "H2":
    case "H3":
    case "H4":
    case "H5":
    case "H6":
      return trimmed ? `\n\n${"#".repeat(Number(tag[1]))} ${trimmed}\n\n` : "";
    case "BLOCKQUOTE":
      return trimmed ? `\n\n${trimmed.split("\n").map((l) => `> ${l}`).join("\n")}\n\n` : "";
    case "UL":
    case "OL":
      return `\n\n${childrenToMarkdown(node, tag).trim()}\n\n`;
    case "LI": {
      if (!trimmed) return "";
      const marker = listContext === "OL" ? "1." : "-";
      return `${marker} ${trimmed}\n`;
    }
    case "P":
    case "DIV":
      return trimmed ? `\n\n${trimmed}\n\n` : "";
    default:
      return inner;
  }
};

function childrenToMarkdown(node, listContext) {
  let out = "";
  node.childNodes.forEach((child) => {
    out += nodeToMarkdown(child, BLOCK_TAGS.has(child.tagName) ? undefined : listContext);
  });
  return out;
}

/**
 * Converte o HTML legado (produzido pelo antigo editor WYSIWYG do enunciado)
 * em markdown, para que enunciados antigos continuem editáveis sem perda.
 * @param {string} html
 * @returns {string}
 */
export const htmlToMarkdown = (html) => {
  if (!html || typeof html !== "string") return "";
  // Enunciado antiquíssimo em texto puro: já é markdown válido.
  if (!html.includes("<")) return html.trim();
  const doc = new DOMParser().parseFromString(html, "text/html");
  const out = childrenToMarkdown(doc.body, undefined);
  return out
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};
