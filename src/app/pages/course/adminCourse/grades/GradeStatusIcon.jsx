import PropTypes from "prop-types";
import { Tooltip } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import PendingIcon from "@mui/icons-material/Pending";
import { GRADE_STATUS, GRADE_COLORS } from "$api/constants/gradeConstants";

const ICONS_BY_STATUS = {
  [GRADE_STATUS.APPROVED]: CheckCircleIcon,
  [GRADE_STATUS.FAILED]: CancelIcon,
  [GRADE_STATUS.PENDING]: PendingIcon,
};

const LABELS_BY_STATUS = {
  [GRADE_STATUS.APPROVED]: "Aprovado",
  [GRADE_STATUS.FAILED]: "Reprovado",
  [GRADE_STATUS.PENDING]: "Pendente",
};

/**
 * Ícone de status geral do aluno (aprovado/reprovado/pendente), com tooltip
 * do rótulo — mesmo par ícone+tooltip repetido na tabela desktop e nos cards
 * mobile das telas de notas.
 */
const GradeStatusIcon = ({ status }) => {
  const Icon = ICONS_BY_STATUS[status];
  if (!Icon) return null;

  return (
    <Tooltip title={LABELS_BY_STATUS[status] || status}>
      <Icon sx={{ color: GRADE_COLORS[status.toUpperCase()] }} />
    </Tooltip>
  );
};

GradeStatusIcon.propTypes = {
  status: PropTypes.string,
};

export default GradeStatusIcon;
