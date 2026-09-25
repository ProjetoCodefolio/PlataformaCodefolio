import { Chip, Tooltip } from "@mui/material";
import ScheduleSendIcon from "@mui/icons-material/ScheduleSend";
import { formatPublishAt, isScheduled } from "$api/services/courses/publication";

/**
 * Selo "Programado" das listas do professor. Não renderiza nada quando o item
 * já está publicado.
 */
const ScheduledChip = ({ publishAt, sx }) => {
  if (!isScheduled(publishAt)) return null;
  const quando = formatPublishAt(publishAt);
  return (
    <Tooltip title={`Oculto para os alunos até ${quando}.`}>
      <Chip
        icon={<ScheduleSendIcon />}
        label={`Programado · ${quando}`}
        size="small"
        variant="outlined"
        sx={{
          color: "primary.main",
          borderColor: "rgba(144, 65, 193, 0.4)",
          backgroundColor: "rgba(144, 65, 193, 0.06)",
          "& .MuiChip-icon": { color: "primary.main" },
          ...sx,
        }}
      />
    </Tooltip>
  );
};

export default ScheduledChip;
