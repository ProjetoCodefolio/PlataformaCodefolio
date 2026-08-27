import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Box, Typography, IconButton } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SchoolIcon from "@mui/icons-material/School";
import PersonIcon from "@mui/icons-material/Person";
import ReportIcon from "@mui/icons-material/Report";
import EditIcon from "@mui/icons-material/Edit";
import QuestionAnswerIcon from "@mui/icons-material/QuestionAnswer";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { useNavigate } from "react-router-dom";
import { prepareSlideUrl } from "$api/services/courses/slides";
import { checkSlideHasQuiz } from "$api/services/courses/slides";
import ReportModal from "$components/common/reportModal";
import { useAuth } from "$context/AuthContext";
import { canRunCourse, canViewQuizResults } from "$api/utils/permissions";

const SlidePlayer = ({
  slideData,
  onReturnToVideo,
  courseTitle,
  courseId,
  courseOwnerUid,
  onOpenQuizGigi,
  onAskQuestion,
  onOpenQuestions,
}) => {
  const navigate = useNavigate();
  const { userDetails } = useAuth();
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [hasQuiz, setHasQuiz] = useState(Boolean(slideData?.quizId));

  useEffect(() => {
    let isMounted = true;

    const verifyQuiz = async () => {
      try {
        if (slideData?.quizId) {
          if (isMounted) setHasQuiz(true);
          return;
        }

        if (!courseId || !slideData?.id) {
          if (isMounted) setHasQuiz(false);
          return;
        }

        const exists = await checkSlideHasQuiz(courseId, slideData.id);
        if (isMounted) setHasQuiz(Boolean(exists));
      } catch (error) {
        console.error("Erro ao verificar quiz do slide:", error);
        if (isMounted) setHasQuiz(false);
      }
    };

    verifyQuiz();
    return () => {
      isMounted = false;
    };
  }, [courseId, slideData?.id, slideData?.quizId]);

  const quizIdForActions = useMemo(() => {
    if (slideData?.quizId) return slideData.quizId;
    if (hasQuiz && courseId && slideData?.id) {
      return `${courseId}/slide_${slideData.id}`;
    }
    return null;
  }, [courseId, hasQuiz, slideData?.id, slideData?.quizId]);

  const quizKeyForDashboard = useMemo(() => {
    if (!quizIdForActions) return null;
    return quizIdForActions.split("/")[1] || quizIdForActions;
  }, [quizIdForActions]);

  const handleViewStudents = () => {
    if (!quizKeyForDashboard) return;
    navigate(`/studentDashboard?quizId=${quizKeyForDashboard}`);
  };

  const handleEditCourse = () => {
    if (!courseId) return;
    navigate(`/adm-cursos?courseId=${courseId}`);
  };

  // A saída antecipada precisa vir DEPOIS de todos os hooks: com ela antes, um
  // render sem slide chamava menos hooks que o anterior e o React derrubava a
  // árvore com "Rendered fewer hooks than expected". Os hooks acima já lidam
  // com slideData ausente (`slideData?.`).
  if (!slideData) {
    return (
      <Box
        sx={{
          p: { xs: 2, sm: 4 },
          textAlign: "center",
          backgroundColor: "#F5F5FA",
        }}
      >
        <Typography variant="h6" color="error">
          Erro: Slide não encontrado
        </Typography>
      </Box>
    );
  }

  // Assegure-se de que a URL está no formato correto
  const slideUrl = prepareSlideUrl(slideData);

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: { xs: "100%", sm: "840px" },
        mx: "auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        backgroundColor: "#F5F5FA",
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: { xs: "100%", sm: "780px" },
          display: "flex",
          alignItems: "center",
          mb: 2,
          ml: { xs: 0, sm: 2 },
        }}
      >
        <IconButton
          onClick={onReturnToVideo}
          sx={{
            color: "#9041c1",
            mr: 1,
          }}
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            color: "#555",
            fontSize: { xs: "1rem", sm: "1.25rem" },
            // Mesmo cabeçalho do player de vídeo: no celular o título cede
            // espaço com reticências para os botões não saírem da tela.
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {courseTitle ? `${courseTitle} - Slides` : slideData.title}
        </Typography>

        <Box sx={{ display: "flex", ml: "auto", flexShrink: 0 }}>
          {onAskQuestion && (
            <IconButton
              onClick={onAskQuestion}
              sx={{
                color: "#fff",
                bgcolor: "#9041c1",
                mr: 1,
                p: 0.8,
                "&:hover": {
                  bgcolor: "#7a35a3",
                },
              }}
              title="Registrar dúvida sobre este conteúdo"
            >
              <QuestionAnswerIcon sx={{ fontSize: "18px" }} />
            </IconButton>
          )}

          {onOpenQuestions && canViewQuizResults(userDetails, courseOwnerUid, courseId) && (
            <IconButton
              onClick={onOpenQuestions}
              sx={{
                color: "#fff",
                bgcolor: "#9041c1",
                mr: 1,
                p: 0.8,
                "&:hover": {
                  bgcolor: "#7a35a3",
                },
              }}
              title="Ver dúvidas da turma sobre este conteúdo"
            >
              <HelpOutlineIcon sx={{ fontSize: "18px" }} />
            </IconButton>
          )}

          {canViewQuizResults(userDetails, courseOwnerUid, courseId) && hasQuiz && (
            <>
              <IconButton
                onClick={handleViewStudents}
                sx={{
                  color: "#fff",
                  bgcolor: "#9041c1",
                  mr: 1,
                  p: 0.8,
                  "&:hover": {
                    bgcolor: "#7a35a3",
                  },
                }}
                title="Ver resultados dos estudantes"
              >
                <PersonIcon sx={{ fontSize: "18px" }} />
              </IconButton>

              {onOpenQuizGigi && (
                <IconButton
                  onClick={onOpenQuizGigi}
                  sx={{
                    color: "#fff",
                    bgcolor: "#9041c1",
                    mr: 1,
                    p: 0.8,
                    "&:hover": {
                      bgcolor: "#7a35a3",
                    },
                  }}
                  title="Abrir Quiz Gigi"
                >
                  <SchoolIcon sx={{ fontSize: "18px" }} />
                </IconButton>
              )}
            </>
          )}

          {canRunCourse(userDetails, courseOwnerUid, courseId) && (
            <IconButton
              onClick={handleEditCourse}
              sx={{
                color: "#fff",
                bgcolor: "#9041c1",
                mr: 1,
                p: 0.8,
                "&:hover": {
                  bgcolor: "#7a35a3",
                },
              }}
              title="Editar curso"
            >
              <EditIcon sx={{ fontSize: "18px" }} />
            </IconButton>
          )}

          <IconButton
            onClick={() => setReportModalOpen(true)}
            sx={{
              color: "#fff",
              bgcolor: "#f44336",
              mr: 1,
              p: 0.8,
              "&:hover": {
                bgcolor: "#d32f2f",
              },
            }}
            title="Reportar problema"
          >
            <ReportIcon sx={{ fontSize: "18px" }} />
          </IconButton>
        </Box>
      </Box>

      <Box
        sx={{
          width: "100%",
          maxWidth: { xs: "100%", sm: "780px" },
          position: "relative",
          borderRadius: "12px",
          overflow: "hidden",
          boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
          ml: { xs: 0, sm: 2 },
          backgroundColor: "#F5F5FA",
          pb: "56.25%" /* Proporção 16:9 */,
          height: 0,
        }}
      >
        <iframe
          src={slideUrl}
          title={slideData.title}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            border: 0,
          }}
          allowFullScreen
          mozallowfullscreen="true"
          webkitallowfullscreen="true"
        />
      </Box>

      {slideData.description && (
        <Box
          sx={{
            width: "100%",
            maxWidth: { xs: "100%", sm: "780px" },
            mt: { xs: 2, sm: 3 },
            ml: { xs: 0, sm: 2 },
            backgroundColor: "#F5F5FA",
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 600, mb: 1, color: "#555" }}
          >
            Descrição:
          </Typography>
          <Typography variant="body2" sx={{ color: "#666", lineHeight: 1.6 }}>
            {slideData.description.split("\n").map((line, index) => (
              <React.Fragment key={index}>
                {line}
                {index < slideData.description.split("\n").length - 1 && <br />}
              </React.Fragment>
            ))}
          </Typography>
        </Box>
      )}

      <ReportModal
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        reportType="slide"
        itemId={slideData?.id}
        courseId={courseId}
        userId={userDetails?.userId || "anonymous"}
        userName={userDetails?.displayName || "Usuário Anônimo"}
        currentTime={0}
      />
    </Box>
  );
};

SlidePlayer.propTypes = {
  slideData: PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string.isRequired,
    url: PropTypes.string.isRequired,
    description: PropTypes.string,
    videoId: PropTypes.string,
    quizId: PropTypes.string,
    isSlide: PropTypes.bool,
  }).isRequired,
  onReturnToVideo: PropTypes.func.isRequired,
  courseTitle: PropTypes.string,
  courseId: PropTypes.string,
  courseOwnerUid: PropTypes.string,
  onOpenQuizGigi: PropTypes.func,
  onAskQuestion: PropTypes.func,
  onOpenQuestions: PropTypes.func,
};

export default SlidePlayer;
