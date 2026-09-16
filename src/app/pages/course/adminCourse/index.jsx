import { useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "$context/AuthContext";
import { Box, Button, Typography, Paper } from "@mui/material";
import Topbar from "$components/topbar/Topbar";
import CourseContentTab from "./CourseContentTab";
import CourseMaterialsTab from "./CourseMaterialsTab";
import CourseQuizzesTab from "./courseQuizzesTab/";
import CourseStudentsTab from "./CourseStudentsTab";
import CourseAssessmentsTab from "./CourseAssessmentsTab";
import CourseAssignmentsTab from "./CourseAssignmentsTab";
import CourseQuestionsTab from "./CourseQuestionsTab";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AdvancedSettingsModal from "../../../components/courses/AdvancedSettingsModal";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import IconButton from "@mui/material/IconButton";
import CourseFormFields from "./CourseFormFields";
import CourseTabsNav from "./CourseTabsNav";
import CourseSaveFeedbackModal from "./CourseSaveFeedbackModal";
import { useCourseUserRole } from "./hooks/useCourseUserRole";
import { useCourseFormFields } from "./hooks/useCourseFormFields";
import { useDisciplineLifecycle } from "./hooks/useDisciplineLifecycle";
import { useCourseSubmit } from "./hooks/useCourseSubmit";
import { useCourseTabs } from "./hooks/useCourseTabs";

const CourseForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userDetails } = useAuth();
  const params = new URLSearchParams(location.search);
  const [courseId, setCourseId] = useState(params.get("courseId"));

  const courseMaterialsRef = useRef();
  const courseQuizzesRef = useRef();

  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  const { isCurrentUserTeacher } = useCourseUserRole({ courseId, userDetails });

  const {
    courseTitle,
    setCourseTitle,
    courseDescription,
    setCourseDescription,
    courseAlias,
    setCourseAlias,
    aliasInvalido,
    pinRequired,
    setPinRequired,
    coursePin,
    setCoursePin,
    showPin,
    setShowPin,
    randomPin,
    pinNaoRecuperavel,
    archived,
    setArchived,
    courseType,
    setCourseType,
    closedAt,
    setClosedAt,
  } = useCourseFormFields({ courseId });

  const { encerrando, handleEncerrar, handleReabrir } = useDisciplineLifecycle({
    courseId,
    userDetails,
    closedAt,
    setClosedAt,
  });

  const {
    handleSubmit,
    isFormValid,
    showSuccessModal,
    setShowSuccessModal,
    showUpdateModal,
    setShowUpdateModal,
  } = useCourseSubmit({
    courseId,
    setCourseId,
    userDetails,
    courseMaterialsRef,
    courseQuizzesRef,
    courseTitle,
    courseDescription,
    courseAlias,
    aliasInvalido,
    courseType,
    pinRequired,
    coursePin,
    setCoursePin,
    archived,
    randomPin,
  });

  const { selectedTab, handleTabChange } = useCourseTabs(params.get("tab"));

  const handleAdvancedSettingsClick = () => {
    setShowAdvancedSettings(true);
  };

  return (
    <>
      <ToastContainer />
      <Topbar hideSearch={true} />
      <Box
        sx={{
          p: { xs: 2, sm: 3, md: 4 },
          maxWidth: "1200px",
          margin: { xs: "56px auto 0", sm: "64px auto 0" },
          backgroundColor: "#f9f9f9",
          borderRadius: "12px",
          boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Paper
          sx={{
            p: { xs: 2, sm: 3, md: 4 },
            mb: 4,
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
          }}
        >
          {/* Cabeçalho com título e menu de configurações */}
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              justifyContent: "space-between",
              alignItems: { xs: "flex-start", sm: "center" },
              mb: 3,
              gap: { xs: 2, sm: 0 },
            }}
          >
            <Typography
              variant="h4"
              component="h1"
              sx={{ fontWeight: 700, color: "#333", fontSize: { xs: "1.5rem", sm: "2rem" } }}
            >
              Gerenciar Curso
            </Typography>

            {/* Botão de três pontos */}
            <IconButton
              aria-label="configurações avançadas"
              onClick={handleAdvancedSettingsClick}
              sx={{ color: "#9041c1", alignSelf: { xs: "flex-end", sm: "center" } }}
              size="small"
            >
              <MoreVertIcon />
            </IconButton>
          </Box>

          <Typography
            variant="h5"
            sx={{ mb: 3, fontWeight: "bold", color: "#333", fontSize: { xs: "1.25rem", sm: "1.5rem" } }}
          >
            {courseId ? "Gerenciar Curso" : "Criar Novo Curso"}
          </Typography>

          {isCurrentUserTeacher && (
            <Typography
              sx={{
                mb: 3,
                p: 1.5,
                borderRadius: "8px",
                backgroundColor: "#F5F0FA",
                color: "#5B5566",
                fontSize: { xs: "0.8125rem", sm: "0.875rem" },
              }}
            >
              Você é professor desta turma. O conteúdo, os quizzes, os alunos e as
              notas são seus; o cadastro do curso (título, apelido, PIN e
              arquivamento) continua com quem criou o curso.
            </Typography>
          )}

          <CourseFormFields
            courseId={courseId}
            isCurrentUserTeacher={isCurrentUserTeacher}
            fields={{
              courseTitle,
              setCourseTitle,
              courseDescription,
              setCourseDescription,
              courseType,
              setCourseType,
              courseAlias,
              setCourseAlias,
              aliasInvalido,
              pinRequired,
              setPinRequired,
              coursePin,
              setCoursePin,
              showPin,
              setShowPin,
              randomPin,
              pinNaoRecuperavel,
              archived,
              setArchived,
            }}
            discipline={{ closedAt, encerrando, handleEncerrar, handleReabrir }}
          />

          {courseId && (
            <>
              <CourseTabsNav selectedTab={selectedTab} onChange={handleTabChange} />

              {selectedTab === 0 && (
                <CourseContentTab courseId={courseId} />
              )}
              {selectedTab === 1 && (
                <CourseMaterialsTab
                  ref={courseMaterialsRef}
                  courseId={courseId}
                />
              )}
              {selectedTab === 2 && (
                <CourseQuizzesTab
                  ref={courseQuizzesRef}
                  courseId={courseId}
                  courseTitle={courseTitle}
                />
              )}
              {selectedTab === 3 && (
                <CourseStudentsTab courseId={courseId} />
              )}
              {selectedTab === 4 && (
                <Typography variant="h6" sx={{ color: "#666" }}>
                  <CourseAssessmentsTab />
                </Typography>
              )}
              {selectedTab === 5 && <CourseAssignmentsTab />}
              {selectedTab === 6 && (
                <CourseQuestionsTab courseId={courseId} alias={courseAlias} />
              )}
            </>
          )}
        </Paper>

        {!isCurrentUserTeacher && (
          <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, justifyContent: "flex-end", gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => navigate("/manage-courses")}
              fullWidth={false}
              sx={{
                color: "#9041c1",
                borderColor: "#9041c1",
                "&:hover": { borderColor: "#7d37a7" },
                fontSize: { xs: "0.875rem", sm: "1rem" },
                minWidth: { xs: "100%", sm: "auto" },
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={!isFormValid()}
              fullWidth={false}
              sx={{
                backgroundColor: "#9041c1",
                "&:hover": { backgroundColor: "#7d37a7" },
                "&.Mui-disabled": {
                  backgroundColor: "rgba(0, 0, 0, 0.12)",
                  color: "rgba(0, 0, 0, 0.26)",
                },
                fontSize: { xs: "0.875rem", sm: "1rem" },
                minWidth: { xs: "100%", sm: "auto" },
              }}
            >
              Salvar Curso
            </Button>
          </Box>
        )}
      </Box>

      <CourseSaveFeedbackModal
        open={showSuccessModal}
        titleId="success-modal-title"
        title="Curso criado com sucesso!"
        onConfirm={() => {
          setShowSuccessModal(false);
          navigate(`/adm-cursos?courseId=${courseId}`);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />

      <CourseSaveFeedbackModal
        open={showUpdateModal}
        titleId="update-modal-title"
        title="Curso atualizado com sucesso!"
        onConfirm={() => {
          setShowUpdateModal(false);
          navigate(`/adm-cursos?courseId=${courseId}`);
        }}
      />

      {/* Modal de configurações avançadas */}
      <AdvancedSettingsModal
        open={showAdvancedSettings}
        onClose={() => setShowAdvancedSettings(false)}
        courseId={courseId}
      />
    </>
  );
};

export default CourseForm;
