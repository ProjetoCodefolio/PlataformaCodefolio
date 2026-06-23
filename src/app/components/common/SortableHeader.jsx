import PropTypes from "prop-types";
import { TableCell, Box } from "@mui/material";
import SortIcon from "@mui/icons-material/Sort";

/**
 * Célula de cabeçalho de tabela com ordenação por clique.
 *
 * Segue o padrão visual já usado nas tabelas do sistema (rótulo + ícone de
 * ordenação que rotaciona conforme a direção). O ícone aparece esmaecido nas
 * colunas inativas para sinalizar que são ordenáveis.
 *
 * @param {string} label - Texto exibido no cabeçalho
 * @param {string} field - Chave da coluna (comparada com sortField)
 * @param {string} sortField - Coluna atualmente ativa
 * @param {"asc"|"desc"} sortOrder - Direção atual
 * @param {(field:string)=>void} onSort - Callback ao clicar
 * @param {"left"|"center"|"right"} [align] - Alinhamento da célula
 * @param {object} [sx] - Estilos extras para a TableCell
 */
const SortableHeader = ({
  label,
  field,
  sortField,
  sortOrder,
  onSort,
  align = "left",
  sx = {},
}) => {
  const active = sortField === field;
  const justifyContent =
    align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start";

  return (
    <TableCell
      align={align}
      onClick={() => onSort(field)}
      sx={{ cursor: "pointer", fontWeight: "bold", userSelect: "none", whiteSpace: "nowrap", ...sx }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent, gap: 0.5 }}>
        {label}
        <SortIcon
          sx={{
            fontSize: 18,
            opacity: active ? 1 : 0.3,
            transform: active && sortOrder === "desc" ? "rotate(180deg)" : "none",
            transition: "opacity 0.15s, transform 0.15s",
          }}
        />
      </Box>
    </TableCell>
  );
};

SortableHeader.propTypes = {
  label: PropTypes.node.isRequired,
  field: PropTypes.string.isRequired,
  sortField: PropTypes.string,
  sortOrder: PropTypes.oneOf(["asc", "desc"]),
  onSort: PropTypes.func.isRequired,
  align: PropTypes.oneOf(["left", "center", "right"]),
  sx: PropTypes.object,
};

export default SortableHeader;
