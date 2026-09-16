import { useState } from "react";
import Loader from "$components/common/Loader";
import { Box, Typography, Tabs, Tab } from "@mui/material";
import Topbar from "$components/topbar/Topbar";
import { useAuth } from "$context/AuthContext";
import { useStudentCourses } from "./hooks/useStudentCourses";
import { useAssessmentsTab } from "./hooks/useAssessmentsTab";
import { useAssignmentsTab } from "./hooks/useAssignmentsTab";
import AssignmentsTabPanel from "./AssignmentsTabPanel";
import AssessmentsTabPanel from "./AssessmentsTabPanel";

export default function MyAssessmentsPage() {
  const { userDetails } = useAuth();
  const userId = userDetails?.userId;

  const [searchTerm, setSearchTerm] = useState("");
  // Aba 0 = Trabalhos (enunciados), Aba 1 = Notas (avaliações já existentes)
  const [activeTab, setActiveTab] = useState(0);

  const { courses, loading, userName, getCourseId, getCourseTitle } = useStudentCourses({
    userId,
    userDetails,
  });

  const assessmentsTab = useAssessmentsTab({
    courses,
    userId,
    getCourseId,
    getCourseTitle,
    searchTerm,
  });

  const assignmentsTab = useAssignmentsTab({
    courses,
    getCourseId,
    getCourseTitle,
    searchTerm,
  });

  return (
    <>
      <Topbar hideSearch={false} onSearch={setSearchTerm} />
      <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1200, mx: "auto", mt: 8 }}>
        <Tabs
          value={activeTab}
          onChange={(e, v) => setActiveTab(v)}
          sx={{
            mb: 3,
            "& .MuiTab-root": {
              color: "#666",
              fontWeight: 700,
              "&.Mui-selected": { color: "#9041c1" },
            },
            "& .MuiTabs-indicator": { backgroundColor: "#9041c1" },
          }}
        >
          <Tab label="Trabalhos" />
          <Tab label="Notas" />
        </Tabs>
        {activeTab === 0 ? (
          loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
              <Loader />
            </Box>
          ) : courses.length === 0 ? (
            <Typography>Você ainda não está matriculado em nenhum curso.</Typography>
          ) : (
            <AssignmentsTabPanel
              courses={courses}
              filteredTrabalhoCourses={assignmentsTab.filteredTrabalhoCourses}
              assignmentsCountLoading={assignmentsTab.assignmentsCountLoading}
              onlyWithAssignments={assignmentsTab.onlyWithAssignments}
              setOnlyWithAssignments={assignmentsTab.setOnlyWithAssignments}
              expandedTrabalhoId={assignmentsTab.expandedTrabalhoId}
              setExpandedTrabalhoId={assignmentsTab.setExpandedTrabalhoId}
              getCourseId={getCourseId}
              getCourseTitle={getCourseTitle}
              getAssignmentsCount={assignmentsTab.getAssignmentsCount}
              userName={userName}
              userId={userId}
            />
          )
        ) : loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <Loader />
          </Box>
        ) : (
          <AssessmentsTabPanel
            courses={courses}
            filteredCourses={assessmentsTab.filteredCourses}
            courseAssessmentsMap={assessmentsTab.courseAssessmentsMap}
            assessmentsLoading={assessmentsTab.assessmentsLoading}
            onlyWithAssessments={assessmentsTab.onlyWithAssessments}
            setOnlyWithAssessments={assessmentsTab.setOnlyWithAssessments}
            expandedCourseId={assessmentsTab.expandedCourseId}
            onToggleCourse={assessmentsTab.handleToggleCourse}
            getCourseId={getCourseId}
            getCourseTitle={getCourseTitle}
            userName={userName}
          />
        )}
      </Box>
    </>
  );
}
