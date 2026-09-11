import { Box, IconButton } from "@mui/material";
import SchoolIcon from "@mui/icons-material/School";
import PersonIcon from "@mui/icons-material/Person";
import SlideshowIcon from "@mui/icons-material/Slideshow";
import OutlinedFlagIcon from "@mui/icons-material/OutlinedFlag";
import EditIcon from "@mui/icons-material/Edit";
import QuestionAnswerIcon from "@mui/icons-material/QuestionAnswer";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { canRunCourse, canViewQuizResults } from "$api/utils/permissions";

const actionButtonSx = {
  color: "#fff",
  bgcolor: "#9041c1",
  mr: 1,
  p: 0.8,
  "&:hover": {
    bgcolor: "#7a35a3",
  },
};

/** Barra de ações do cabeçalho do player: slides, dúvidas, resultados, edição e denúncia. */
export default function VideoPlayerActionBar({
  video,
  userDetails,
  courseOwnerUid,
  courseId,
  hasSlide,
  onOpenSlidesClick,
  onAskQuestion,
  onOpenQuestions,
  onViewStudents,
  onOpenQuizGigi,
  onEditCourse,
  onReport,
}) {
  const canViewResults = canViewQuizResults(userDetails, courseOwnerUid, courseId);
  const canEdit = canRunCourse(userDetails, courseOwnerUid, courseId);

  return (
    <Box sx={{ display: "flex", ml: "auto", flexShrink: 0 }}>
      {hasSlide && (
        <IconButton onClick={onOpenSlidesClick} sx={actionButtonSx} title="Ver Slides">
          <SlideshowIcon sx={{ fontSize: "18px" }} />
        </IconButton>
      )}

      {onAskQuestion && (
        <IconButton
          onClick={onAskQuestion}
          sx={actionButtonSx}
          title="Registrar dúvida sobre este vídeo"
        >
          <QuestionAnswerIcon sx={{ fontSize: "18px" }} />
        </IconButton>
      )}

      {onOpenQuestions && canViewResults && (
        <IconButton
          onClick={onOpenQuestions}
          sx={actionButtonSx}
          title="Ver dúvidas da turma sobre este vídeo"
        >
          <HelpOutlineIcon sx={{ fontSize: "18px" }} />
        </IconButton>
      )}

      {canViewResults && video.quizId && (
        <>
          <IconButton onClick={onViewStudents} sx={actionButtonSx} title="Ver resultados dos estudantes">
            <PersonIcon sx={{ fontSize: "18px" }} />
          </IconButton>

          {onOpenQuizGigi && (
            <IconButton onClick={onOpenQuizGigi} sx={actionButtonSx} title="Abrir Quiz Gigi">
              <SchoolIcon sx={{ fontSize: "18px" }} />
            </IconButton>
          )}
        </>
      )}

      {canEdit && (
        <IconButton onClick={onEditCourse} sx={actionButtonSx} title="Editar curso">
          <EditIcon sx={{ fontSize: "18px" }} />
        </IconButton>
      )}

      <IconButton
        onClick={onReport}
        sx={{
          color: "text.secondary",
          bgcolor: "grey.200",
          mr: 1,
          p: 0.8,
          "&:hover": {
            bgcolor: "grey.300",
          },
        }}
        title="Reportar problema"
      >
        <OutlinedFlagIcon sx={{ fontSize: "18px" }} />
      </IconButton>
    </Box>
  );
}
