import PropTypes from "prop-types";
import { Avatar, Box, Stack, Typography } from "@mui/material";

/**
 * Avatar + nome (e opcionalmente email) do estudante, no padrão repetido nas
 * telas de notas/avaliações do professor. `truncate`+`showEmail` juntos
 * reproduzem o cabeçalho dos cards mobile (nome e email cortados com
 * reticências, empilhados ao lado do avatar); sem eles, é só o par
 * avatar+nome usado nas células de tabela desktop (onde o email vem numa
 * coluna própria).
 */
const StudentIdentityCell = ({ student, avatarSize = 40, truncate = false, showEmail = false }) => {
  const nameText = (
    <Typography
      variant={truncate ? "body1" : "body2"}
      sx={
        truncate
          ? {
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }
          : undefined
      }
    >
      {student.name}
    </Typography>
  );

  const emailText = showEmail && (
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}
    >
      {student.email}
    </Typography>
  );

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={2}
      sx={truncate ? { minWidth: 0, flex: 1 } : undefined}
    >
      <Avatar
        src={student.photoURL}
        alt={student.name}
        sx={{ bgcolor: "#9041c1", width: avatarSize, height: avatarSize }}
      >
        {student.name.charAt(0).toUpperCase()}
      </Avatar>
      {showEmail ? (
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {nameText}
          {emailText}
        </Box>
      ) : (
        nameText
      )}
    </Stack>
  );
};

StudentIdentityCell.propTypes = {
  student: PropTypes.shape({
    name: PropTypes.string.isRequired,
    email: PropTypes.string,
    photoURL: PropTypes.string,
  }).isRequired,
  avatarSize: PropTypes.number,
  truncate: PropTypes.bool,
  showEmail: PropTypes.bool,
};

export default StudentIdentityCell;
