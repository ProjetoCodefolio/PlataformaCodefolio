import React from "react";
import { CircularProgress } from "@mui/material";

/**
 * Spinner padrão do Codefólio: sempre roxo (tema `primary`), em vez de cada
 * tela reimplementar `sx={{ color: "#9041c1" }}` (ou uma constante local
 * PURPLE/ROXO) à mão. Foi assim que `color="secondary"` (verde no tema, não
 * roxo) se espalhou por algumas telas sem ninguém notar — cor errada em
 * lugar nenhum além daqui, uma mudança de marca é só neste arquivo.
 *
 * Para um spinner DENTRO de um botão/área colorida (deve herdar a cor do
 * texto ao redor, não ser sempre roxo), use `<CircularProgress color="inherit" />`
 * diretamente — esse é um caso diferente, não uma duplicação a evitar.
 */
export default function Loader({ size = 24, sx, ...props }) {
  return (
    <CircularProgress
      size={size}
      sx={{ color: "primary.main", ...sx }}
      {...props}
    />
  );
}
