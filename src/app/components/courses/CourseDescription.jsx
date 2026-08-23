import { useLayoutEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import LockIcon from "@mui/icons-material/Lock";

const LINHAS_VISIVEIS = 3;
const ALTURA_LINHA = 1.5;
const TEXTO_PADRAO = "Descrição do curso";

/**
 * Descrição do curso dentro de um card de catálogo.
 *
 * O texto é recortado em três linhas e o espaço dele é sempre o mesmo, para um
 * curso de descrição longa não esticar o card e desalinhar a grade. O que sobra
 * fica atrás do "ver mais", que abre um diálogo com a descrição inteira, um X
 * para fechar e o mesmo botão de acesso do card.
 */
export default function CourseDescription({ course = {}, actionLabel = "Acessar", onAction, sx }) {
  const texto = course.description || TEXTO_PADRAO;
  const textoRef = useRef(null);
  const [transborda, setTransborda] = useState(false);
  const [aberto, setAberto] = useState(false);

  // O "ver mais" só aparece quando o recorte esconde mesmo alguma coisa, o que
  // depende da largura do card — daí a remedição a cada mudança de tamanho.
  useLayoutEffect(() => {
    const elemento = textoRef.current;
    if (!elemento) return undefined;

    const medir = () => setTransborda(elemento.scrollHeight > elemento.clientHeight + 1);
    medir();

    const observador = new ResizeObserver(medir);
    observador.observe(elemento);
    return () => observador.disconnect();
  }, [texto]);

  const acessar = () => {
    setAberto(false);
    if (onAction) onAction();
  };

  return (
    <>
      <Box sx={{ width: "100%" }}>
        <Typography
          ref={textoRef}
          variant="body2"
          sx={{
            textAlign: "left",
            width: "100%",
            lineHeight: ALTURA_LINHA,
            height: `${ALTURA_LINHA * LINHAS_VISIVEIS}em`,
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: LINHAS_VISIVEIS,
            WebkitBoxOrient: "vertical",
            whiteSpace: "pre-wrap",
            ...sx,
          }}
        >
          {texto}
        </Typography>

        {/* A linha do "ver mais" é reservada mesmo quando o texto cabe inteiro,
            para que todos os cards fiquem com a mesma altura. */}
        <Box sx={{ minHeight: "24px", display: "flex", alignItems: "center" }}>
          {transborda && (
            <Button
              variant="text"
              size="small"
              onClick={() => setAberto(true)}
              sx={{
                padding: 0,
                minWidth: 0,
                textTransform: "none",
                fontSize: "0.8rem",
                fontWeight: "bold",
                color: "#9041c1",
                "&:hover": { backgroundColor: "transparent", textDecoration: "underline" },
              }}
            >
              ver mais
            </Button>
          )}
        </Box>
      </Box>

      <Dialog open={aberto} onClose={() => setAberto(false)} fullWidth maxWidth="sm">
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            pr: 6,
            fontWeight: "bold",
            color: "#333",
          }}
        >
          {course.title || "Título do Curso"}
          {course.pinEnabled && <LockIcon sx={{ color: "#9041c1" }} />}
        </DialogTitle>

        <IconButton
          aria-label="Fechar"
          onClick={() => setAberto(false)}
          sx={{ position: "absolute", top: 8, right: 8, color: "#666" }}
        >
          <CloseIcon />
        </IconButton>

        <DialogContent dividers>
          <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", color: "#555" }}>
            {texto}
          </Typography>
        </DialogContent>

        {onAction && (
          <DialogActions sx={{ p: 2 }}>
            <Button
              variant="contained"
              onClick={acessar}
              sx={{
                backgroundColor: "#9041c1",
                color: "white",
                borderRadius: "8px",
                fontWeight: "bold",
                textTransform: "none",
                "&:hover": { backgroundColor: "#7d37a7" },
              }}
            >
              {actionLabel}
            </Button>
          </DialogActions>
        )}
      </Dialog>
    </>
  );
}
