import PropTypes from "prop-types";
import { TextField } from "@mui/material";

/**
 * Campo de busca padronizado do sistema (borda roxa, cantos arredondados).
 *
 * Extraído do padrão já usado na aba de Alunos para evitar despadronização entre
 * telas que filtram listas por nome/email.
 *
 * @param {string} value - Texto atual da busca
 * @param {(e:Object)=>void} onChange - Handler do input
 * @param {string} [placeholder] - Texto do placeholder
 * @param {boolean} [fullWidth] - Ocupa toda a largura (padrão true)
 * @param {"small"|"medium"} [size] - Tamanho do campo
 * @param {object} [sx] - Estilos extras mesclados à raiz
 */
const SearchField = ({
  value,
  onChange,
  placeholder = "Buscar por nome ou email...",
  fullWidth = true,
  size = "small",
  sx = {},
}) => (
  <TextField
    fullWidth={fullWidth}
    variant="outlined"
    size={size}
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    sx={{
      "& .MuiOutlinedInput-root": {
        borderRadius: 2,
        "& fieldset": { borderColor: "#9041c1" },
        "&:hover fieldset": { borderColor: "#7d37a7" },
        "&.Mui-focused fieldset": { borderColor: "#9041c1" },
      },
      "& .MuiInputBase-input": {
        fontSize: { xs: "0.875rem", sm: "1rem" },
      },
      ...sx,
    }}
  />
);

SearchField.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  fullWidth: PropTypes.bool,
  size: PropTypes.oneOf(["small", "medium"]),
  sx: PropTypes.object,
};

export default SearchField;
