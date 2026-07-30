import React, { useMemo, useRef, useState } from "react";
import { Box, Divider, IconButton, Tab, Tabs, Tooltip, Typography } from "@mui/material";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import StrikethroughSIcon from "@mui/icons-material/StrikethroughS";
import TitleIcon from "@mui/icons-material/Title";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";
import FormatQuoteIcon from "@mui/icons-material/FormatQuote";
import CodeIcon from "@mui/icons-material/Code";
import LinkIcon from "@mui/icons-material/Link";
import { markdownToHtml } from "$utils/markdown";

const PURPLE = "#9041c1";

/**
 * Estilos do conteúdo renderizado a partir do markdown. Usados tanto na
 * pré-visualização (professor) quanto na exibição (aluno), para que os dois
 * vejam exatamente a mesma coisa.
 */
const markdownContentSx = {
  color: "#444",
  lineHeight: 1.7,
  overflowWrap: "anywhere",
  "& > :first-of-type": { mt: 0 },
  "& > :last-child": { mb: 0 },
  "& h1, & h2, & h3, & h4, & h5, & h6": {
    color: "#333",
    fontWeight: 800,
    lineHeight: 1.3,
    mt: 2.5,
    mb: 1,
  },
  "& h1": { fontSize: "1.5rem" },
  "& h2": { fontSize: "1.3rem" },
  "& h3": { fontSize: "1.15rem" },
  "& h4, & h5, & h6": { fontSize: "1rem" },
  "& p": { my: 1 },
  "& ul, & ol": { pl: 3, my: 1 },
  "& li": { mb: 0.5 },
  "& a": { color: "#7d37a7" },
  "& blockquote": {
    borderLeft: `4px solid ${PURPLE}`,
    bgcolor: "#faf7fe",
    m: 0,
    my: 1.5,
    px: 2,
    py: 0.5,
    borderRadius: "0 6px 6px 0",
    color: "#555",
  },
  "& code": {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    fontSize: "0.875em",
    bgcolor: "#f3ebfb",
    color: "#5c2d80",
    px: 0.75,
    py: 0.25,
    borderRadius: 1,
  },
  "& pre": {
    bgcolor: "#2d2438",
    color: "#f5f0fb",
    borderRadius: 2,
    p: 2,
    my: 1.5,
    overflowX: "auto",
    "& code": { bgcolor: "transparent", color: "inherit", p: 0, fontSize: "0.85rem" },
  },
  "& img": { maxWidth: "100%", borderRadius: 2, display: "block", my: 1.5 },
  "& hr": { border: 0, borderTop: "1px solid #e0e0e0", my: 2.5 },
  "& table": {
    borderCollapse: "collapse",
    my: 1.5,
    width: "100%",
    display: "block",
    overflowX: "auto",
  },
  "& th, & td": { border: "1px solid #e0e0e0", px: 1.5, py: 0.75, textAlign: "left" },
  "& th": { bgcolor: "#f5f0fb", fontWeight: 700, color: "#5c2d80" },
};

/**
 * Exibe, com segurança, o markdown renderizado.
 */
export function MarkdownView({ markdown, sx }) {
  const html = useMemo(() => markdownToHtml(markdown), [markdown]);
  if (!html) return null;
  return <Box sx={{ ...markdownContentSx, ...sx }} dangerouslySetInnerHTML={{ __html: html }} />;
}

/**
 * Editor de markdown com abas "Escrever" e "Pré-visualizar".
 *
 * O professor digita markdown puro (o valor emitido por onChange é o markdown,
 * não HTML) e confere o resultado renderizado antes de salvar.
 */
export default function MarkdownEditor({
  value = "",
  onChange,
  placeholder = "",
  disabled = false,
  minHeight = 160,
  inputRef: externalInputRef,
}) {
  const [tab, setTab] = useState("write");
  const innerRef = useRef(null);

  const setRef = (node) => {
    innerRef.current = node;
    if (externalInputRef) externalInputRef.current = node;
  };

  /** Aplica uma transformação na seleção atual e devolve o foco ao textarea. */
  const applyToSelection = (transform) => {
    const el = innerRef.current;
    if (disabled || !el) return;
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const { text, selStart, selEnd } = transform(value, start, end);
    onChange?.(text);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(selStart, selEnd);
    });
  };

  /** Envolve a seleção (ou insere um exemplo, se não houver seleção). */
  const wrap = (before, after, sample) =>
    applyToSelection((text, start, end) => {
      const selected = text.slice(start, end) || sample;
      const inserted = `${before}${selected}${after}`;
      return {
        text: text.slice(0, start) + inserted + text.slice(end),
        selStart: start + before.length,
        selEnd: start + before.length + selected.length,
      };
    });

  /** Prefixa cada linha selecionada (títulos, listas, citação). */
  const prefixLines = (prefixFor) =>
    applyToSelection((text, start, end) => {
      const lineStart = text.lastIndexOf("\n", start - 1) + 1;
      const lineEnd = end === start ? (text.indexOf("\n", end) === -1 ? text.length : text.indexOf("\n", end)) : end;
      const block = text.slice(lineStart, lineEnd) || "";
      const prefixed = block
        .split("\n")
        .map((line, i) => `${prefixFor(i)}${line}`)
        .join("\n");
      return {
        text: text.slice(0, lineStart) + prefixed + text.slice(lineEnd),
        selStart: lineStart,
        selEnd: lineStart + prefixed.length,
      };
    });

  const toolBtn = (title, icon, onClick) => (
    <Tooltip title={title} key={title}>
      <span>
        <IconButton
          size="small"
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()} // preserva a seleção do texto
          onClick={onClick}
          sx={{ color: "#555", "&:hover": { color: PURPLE, bgcolor: "#f3ebfb" } }}
        >
          {icon}
        </IconButton>
      </span>
    </Tooltip>
  );

  return (
    <Box
      sx={{
        border: "1px solid #ccc",
        borderRadius: 1,
        opacity: disabled ? 0.6 : 1,
        "&:focus-within": { borderColor: PURPLE, boxShadow: `0 0 0 1px ${PURPLE}` },
      }}
    >
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{
          minHeight: 36,
          borderBottom: "1px solid #eee",
          bgcolor: "#fafafa",
          borderRadius: "4px 4px 0 0",
          "& .MuiTab-root": {
            minHeight: 36,
            textTransform: "none",
            fontWeight: 700,
            fontSize: "0.8rem",
            color: "#666",
            "&.Mui-selected": { color: PURPLE },
          },
          "& .MuiTabs-indicator": { backgroundColor: PURPLE },
        }}
      >
        <Tab value="write" label="Escrever" />
        <Tab value="preview" label="Pré-visualizar" />
      </Tabs>

      {tab === "write" ? (
        <>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.25,
              flexWrap: "wrap",
              px: 0.5,
              py: 0.25,
              borderBottom: "1px solid #eee",
            }}
          >
            {toolBtn("Negrito", <FormatBoldIcon fontSize="small" />, () => wrap("**", "**", "negrito"))}
            {toolBtn("Itálico", <FormatItalicIcon fontSize="small" />, () => wrap("*", "*", "itálico"))}
            {toolBtn("Tachado", <StrikethroughSIcon fontSize="small" />, () => wrap("~~", "~~", "tachado"))}
            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.5 }} />
            {toolBtn("Título", <TitleIcon fontSize="small" />, () => prefixLines(() => "## "))}
            {toolBtn("Lista com marcadores", <FormatListBulletedIcon fontSize="small" />, () =>
              prefixLines(() => "- ")
            )}
            {toolBtn("Lista numerada", <FormatListNumberedIcon fontSize="small" />, () =>
              prefixLines((i) => `${i + 1}. `)
            )}
            {toolBtn("Citação", <FormatQuoteIcon fontSize="small" />, () => prefixLines(() => "> "))}
            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.5 }} />
            {toolBtn("Código", <CodeIcon fontSize="small" />, () => wrap("`", "`", "código"))}
            {toolBtn("Link", <LinkIcon fontSize="small" />, () => wrap("[", "](https://)", "texto do link"))}
          </Box>
          <Box
            component="textarea"
            ref={setRef}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={placeholder}
            spellCheck
            sx={{
              display: "block",
              width: "100%",
              boxSizing: "border-box",
              minHeight,
              resize: "vertical",
              border: "none",
              outline: "none",
              bgcolor: "transparent",
              px: 1.5,
              py: 1.25,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
              fontSize: "0.9rem",
              lineHeight: 1.6,
              color: "#333",
              "&::placeholder": { color: "#9e9e9e", fontFamily: "inherit" },
            }}
          />
        </>
      ) : (
        <Box sx={{ minHeight, px: 1.5, py: 1.25 }}>
          {value.trim() ? (
            <MarkdownView markdown={value} />
          ) : (
            <Typography variant="body2" sx={{ color: "#9e9e9e", fontStyle: "italic" }}>
              Nada para pré-visualizar ainda.
            </Typography>
          )}
        </Box>
      )}

      <Box sx={{ px: 1.5, py: 0.75, borderTop: "1px solid #eee", bgcolor: "#fafafa" }}>
        <Typography variant="caption" sx={{ color: "#777" }}>
          Aceita <b>Markdown</b>: <code>**negrito**</code>, <code>*itálico*</code>, <code>## título</code>,{" "}
          <code>- lista</code>, <code>[link](url)</code>, <code>`código`</code> e blocos com <code>```</code>.
        </Typography>
      </Box>
    </Box>
  );
}
