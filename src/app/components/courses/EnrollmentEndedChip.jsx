import PropTypes from "prop-types";
import { Chip, Tooltip } from "@mui/material";
import { enrollmentEndedLabel } from "$api/services/courses/enrollment";

/**
 * Selo de quem está fora da turma (saiu do curso ou foi removido), ao lado do
 * nome nas listas do professor. A data vai na dica, para o selo caber em
 * qualquer célula. Não renderiza nada para quem está na turma.
 */
const EnrollmentEndedChip = ({ student, sx }) => {
  if (!student?.enrollmentEnded) return null;
  return (
    <Tooltip title={enrollmentEndedLabel(student)}>
      <Chip
        label={enrollmentEndedLabel(student, { withDate: false })}
        size="small"
        sx={{ ml: 0.5, height: 18, fontSize: 11, bgcolor: "#f0f0f0", color: "#555", ...sx }}
      />
    </Tooltip>
  );
};

EnrollmentEndedChip.propTypes = {
  student: PropTypes.shape({
    enrollmentEnded: PropTypes.bool,
    endReason: PropTypes.string,
    endedAt: PropTypes.string,
  }),
  sx: PropTypes.object,
};

export default EnrollmentEndedChip;
