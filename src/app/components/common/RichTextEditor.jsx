import React, { useEffect, useMemo, useRef } from "react";
import { Box, Divider, IconButton, Tooltip } from "@mui/material";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FormatUnderlinedIcon from "@mui/icons-material/FormatUnderlined";
import StrikethroughSIcon from "@mui/icons-material/StrikethroughS";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";
import FormatClearIcon from "@mui/icons-material/FormatClear";
import { sanitizeRichHtml } from "$utils/richText";

const PURPLE = "#9041c1";

const contentSx = {
  overflowWrap: "anywhere",
  "& ul, & ol": { pl: 3, my: 0.5 },
  "& li": { mb: 0.25 },
  "& p": { my: 0.5 },
  "& a": { color: "#7d37a7" },
};

/**
 * Editor de texto rico leve (sem dependências externas). Usa contentEditable +
 * document.execCommand para negrito, itálico, sublinhado, tachado e listas.
 * Emite HTML simples via onChange; use RichTextView (ou sanitizeRichHtml) para
 * exibir esse HTML com segurança.
 */
export default function RichTextEditor({
  value = "",
  onChange,
  placeholder = "",
  disabled = false,
  minHeight = 120,
  editableRef,
}) {
  const ref = useRef(null);
  const setRef = (node) => {
    ref.current = node;
    if (editableRef) editableRef.current = node;
  };

  // Sincroniza o conteúdo vindo de fora (ex.: abrir o form para editar) sem
  // atrapalhar a digitação — só atualiza quando o editor não está focado.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const incoming = value || "";
    if (document.activeElement !== el && el.innerHTML !== incoming) {
      el.innerHTML = incoming;
    }
  }, [value]);

  const emit = () => {
    if (ref.current && onChange) onChange(ref.current.innerHTML);
  };

  const exec = (command) => {
    if (disabled) return;
    const el = ref.current;
    if (!el) return;
    el.focus();
    // Prefere tags de apresentação (<b>, <i>) em vez de estilo inline, o que
    // mantém a saída simples e compatível com o sanitizador.
    try {
      document.execCommand("styleWithCSS", false, false);
    } catch (_) {
      /* alguns navegadores não suportam; segue com o padrão */
    }
    document.execCommand(command, false, null);
    emit();
  };

  const toolBtn = (title, icon, command) => (
    <Tooltip title={title}>
      <span>
        <IconButton
          size="small"
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()} // preserva a seleção do texto
          onClick={() => exec(command)}
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
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.25,
          flexWrap: "wrap",
          px: 0.5,
          py: 0.25,
          borderBottom: "1px solid #eee",
          bgcolor: "#fafafa",
          borderRadius: "4px 4px 0 0",
        }}
      >
        {toolBtn("Negrito", <FormatBoldIcon fontSize="small" />, "bold")}
        {toolBtn("Itálico", <FormatItalicIcon fontSize="small" />, "italic")}
        {toolBtn("Sublinhado", <FormatUnderlinedIcon fontSize="small" />, "underline")}
        {toolBtn("Tachado", <StrikethroughSIcon fontSize="small" />, "strikeThrough")}
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.5 }} />
        {toolBtn("Lista com marcadores", <FormatListBulletedIcon fontSize="small" />, "insertUnorderedList")}
        {toolBtn("Lista numerada", <FormatListNumberedIcon fontSize="small" />, "insertOrderedList")}
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.5 }} />
        {toolBtn("Limpar formatação", <FormatClearIcon fontSize="small" />, "removeFormat")}
      </Box>
      <Box
        ref={setRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        data-placeholder={placeholder}
        sx={{
          minHeight,
          px: 1.5,
          py: 1.25,
          fontSize: "1rem",
          lineHeight: 1.6,
          color: "#333",
          outline: "none",
          ...contentSx,
          "&:empty:before": { content: "attr(data-placeholder)", color: "#9e9e9e" },
        }}
      />
    </Box>
  );
}

/**
 * Exibe, com segurança, o HTML produzido pelo RichTextEditor.
 */
export function RichTextView({ html, sx }) {
  const clean = useMemo(() => sanitizeRichHtml(html), [html]);
  if (!clean) return null;
  return (
    <Box
      sx={{ color: "#444", lineHeight: 1.7, ...contentSx, ...sx }}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
