import PropTypes from "prop-types";
import { Chip, Typography } from "@mui/material";
import { formatGrade } from "./formatGrade";

/**
 * Nota de uma avaliação, em chip colorido (verde/vermelho conforme a mesma
 * regra de `gradeConstants.js`) — ou um traço quando o aluno ainda não tem
 * nota lançada. Repetido de forma idêntica na tabela desktop e nos cards
 * mobile das telas de notas.
 */
const GradeValueChip = ({ grade, color }) => {
  if (grade === null || grade === undefined) {
    return (
      <Typography variant="body2" color="text.secondary">
        -
      </Typography>
    );
  }

  return (
    <Chip
      label={formatGrade(grade)}
      size="small"
      sx={{ fontWeight: "bold", backgroundColor: color, color: "#fff" }}
    />
  );
};

GradeValueChip.propTypes = {
  grade: PropTypes.number,
  color: PropTypes.string.isRequired,
};

export default GradeValueChip;
