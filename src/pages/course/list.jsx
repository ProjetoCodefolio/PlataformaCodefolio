import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Card,
  CardContent,
  CardActions,
  Button,
  Grid,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import Topbar from "../../components/topbar/Topbar";
import { ref, get } from "firebase/database";
import { database } from "../../service/firebase.jsx";
import { useAuth } from "../../context/AuthContext";
import LockIcon from "@mui/icons-material/Lock";
import PinAccessModal from "../../components/modals/PinAccessModal";

const MyCourses = () => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [inProgressCourses, setInProgressCourses] = useState([]);
  const [completedCourses, setCompletedCourses] = useState([]);
  const [filteredAvailableCourses, setFilteredAvailableCourses] = useState([]);
  const [filteredInProgressCourses, setFilteredInProgressCourses] = useState([]);
  const [filteredCompletedCourses, setFilteredCompletedCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const { userDetails } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const loadCourses = async () => {
      try {
        const coursesRef = ref(database, "courses");
        const snapshot = await get(coursesRef);
        if (!snapshot.exists()) return;

        const coursesData = snapshot.val();
        const coursesArray = Object.entries(coursesData).map(([courseId, course]) => ({
          courseId,
          ...course,
        }));

        if (userDetails) {
          const studentCoursesRef = ref(database, `studentCourses/${userDetails.userId}`);
          const studentSnapshot = await get(studentCoursesRef);
          const studentCourses = studentSnapshot.val() || {};


          const enrichedCourses = coursesArray.map((course) => {
            const studentCourse = studentCourses[course.courseId] || {};
            return {
              ...course,
              progress: studentCourse.progress !== undefined ? studentCourse.progress : 0,
              accessed: studentCourse.progress !== undefined,
              status: studentCourse.status || "available",
            };
          });

          const available = enrichedCourses.filter((course) => !course.accessed);
          const inProgress = enrichedCourses.filter((course) => course.accessed && course.status === "in_progress");
          const completed = enrichedCourses.filter((course) => course.status === "completed");

          setAvailableCourses(available);
          setInProgressCourses(inProgress);
          setCompletedCourses(completed);
          setFilteredAvailableCourses(available);
          setFilteredInProgressCourses(inProgress);
          setFilteredCompletedCourses(completed);
        } else {
          const storedProgress = sessionStorage.getItem("videoProgress");
          let localProgress = {};

          if (storedProgress) {
            const progressArray = JSON.parse(storedProgress);
            localProgress = progressArray.reduce((acc, video) => {
              const courseId = video.courseId;
              if (!acc[courseId]) {
                acc[courseId] = { totalVideos: 0, completedVideos: 0 };
              }
              acc[courseId].totalVideos += 1;
              if (video.watched && (!video.quizId || video.quizPassed)) {
                acc[courseId].completedVideos += 1;
              }
              return acc;
            }, {});
          }

          const enrichedCourses = await Promise.all(
            coursesArray.map(async (course) => {
              const courseVideosRef = ref(database, `courseVideos/${course.courseId}`);
              const videoSnapshot = await get(courseVideosRef);
              const videosData = videoSnapshot.val() || {};
              const totalVideos = Object.keys(videosData).length;
              const progressData = localProgress[course.courseId] || { totalVideos: 0, completedVideos: 0 };
              const effectiveTotal = Math.max(totalVideos, progressData.totalVideos);
              const progress = effectiveTotal > 0 ? (progressData.completedVideos / effectiveTotal) * 100 : 0;

              return {
                ...course,
                progress,
                accessed: progressData.totalVideos > 0,
              };
            })
          );

          const available = enrichedCourses.filter((course) => !course.accessed);
          const inProgress = enrichedCourses.filter((course) => course.accessed && course.progress < 100);
          const completed = enrichedCourses.filter((course) => course.progress === 100);

          setAvailableCourses(available);
          setInProgressCourses(inProgress);
          setCompletedCourses(completed);
          setFilteredAvailableCourses(available);
          setFilteredInProgressCourses(inProgress);
          setFilteredCompletedCourses(completed);
        }
      } catch (error) {
        console.error("Erro ao carregar cursos:", error);
      }
    };

    loadCourses();
  }, [userDetails]);

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const handleSearch = (searchTerm) => {
    const term = searchTerm.toLowerCase();
    setFilteredAvailableCourses(
      availableCourses.filter(
        (course) =>
          course.title.toLowerCase().includes(term) ||
          course.description.toLowerCase().includes(term)
      )
    );
    setFilteredInProgressCourses(
      inProgressCourses.filter(
        (course) =>
          course.title.toLowerCase().includes(term) ||
          course.description.toLowerCase().includes(term)
      )
    );
    setFilteredCompletedCourses(
      completedCourses.filter(
        (course) =>
          course.title.toLowerCase().includes(term) ||
          course.description.toLowerCase().includes(term)
      )
    );
  };

  const handleStartCourse = (course) => {
    if (course.pinEnabled) {
      setSelectedCourse(course);
      setShowPinModal(true);
    } else {
      navigate(`/classes?courseId=${course.courseId}`);
    }
  };

  const handlePinSubmit = (course) => {
    navigate(`/classes?courseId=${course.courseId}`);
  };

  const handleContinueCourse = (course) => {
    navigate(`/classes?courseId=${course.courseId}`);
  };

  const handleViewCourse = (course) => {
    navigate(`/classes?courseId=${course.courseId}`);
  };

  const renderCourses = (courses, actionButtonLabel, onClickAction) => {
    if (!courses || courses.length === 0) {
      return <Typography variant="body1" color="textSecondary">Nenhum curso encontrado.</Typography>;
    }
     
    return (
      <Grid container spacing={2}>
        {courses.map((course) => (
          <Grid item xs={12} sm={6} md={4} key={course.courseId}>
            <Card
              sx={{
                backgroundColor: "#ffffff",
                boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
                borderRadius: "16px",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                transition: "transform 0.2s ease-in-out",
                "&:hover": {
                  transform: "scale(1.02)",
                  boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.2)",
                },
              }}
            >
              <CardContent sx={{ flex: 1 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mb: 1,
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: "bold",
                      textAlign: "center",
                      color: "#333",
                      fontSize: { xs: "0.9rem", sm: "1rem" },
                    }}
                  >
                    {course.title || "Título do Curso"}
                  </Typography>
                  {course.pinEnabled && (
                    <LockIcon
                      sx={{
                        color: "#9041c1",
                        ml: 1,
                        fontSize: { xs: "1rem", sm: "1.2rem" },
                      }}
                    />
                  )}
                </Box>
                <Typography
                  variant="body2"
                  color="textSecondary"
                  sx={{
                    mb: 1,
                    fontSize: { xs: "0.8rem", sm: "0.875rem" },
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {course.description || "Descrição do curso"}
                </Typography>
                <Typography
                  variant="body2"
                  color="textSecondary"
                  sx={{
                    mt: 1,
                    fontSize: { xs: "0.8rem", sm: "0.875rem" },
                  }}
                >
                  Progresso: {(course.progress || 0).toFixed(2)}%
                </Typography>
              </CardContent>
              <CardActions sx={{ p: 2, justifyContent: "center", mt: "auto" }}>
                <Button
                  variant="contained"
                  sx={{
                    backgroundColor: "#9041c1",
                    color: "white",
                    borderRadius: "8px",
                    "&:hover": { backgroundColor: "#7d37a7" },
                    textTransform: "none",
                    fontWeight: "bold",
                    fontSize: { xs: "12px", sm: "14px" },
                    padding: "6px 10px",
                    width: "calc(100% - 16px)",
                  }}
                  onClick={() => onClickAction(course)}
                >
                  {actionButtonLabel}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  return (
    <Box
      sx={{
        minHeight: "calc(100vh - 64px)",
        backgroundColor: "#F5F5FA",
        pt: { xs: 8, sm: 10 },
        pb: { xs: 1, sm: 2 },
        px: { xs: 1, sm: 2 },
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Topbar onSearch={handleSearch} />
      <Box sx={{ height: { xs: "16px", sm: "24px" } }} />

      <Paper
        sx={{
          p: { xs: 1, sm: 2 },
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
          width: "100%",
          maxWidth: { xs: "calc(100% - 16px)", sm: "1200px" },
        }}
      >
        <Tabs
          value={selectedTab}
          onChange={handleTabChange}
          textColor="inherit"
          centered
          variant={{ xs: "scrollable", sm: "standard" }}
          scrollButtons={{ xs: "auto", sm: false }}
          sx={{
            mb: { xs: 2, sm: 4 },
            "& .MuiTab-root": {
              fontWeight: "bold",
              color: "#666",
              "&.Mui-selected": { color: "#9041c1" },
              fontSize: { xs: "0.7rem", sm: "1rem" },
              padding: { xs: "8px 8px", sm: "12px 16px" },
              minWidth: { xs: "90px", sm: "auto" },
              whiteSpace: { xs: "normal", sm: "nowrap" },
              wordBreak: { xs: "break-word", sm: "normal" },
              textAlign: "center",
            },
            "& .MuiTabs-indicator": { backgroundColor: "#9041c1" },
          }}
        >
          <Tab label="Disponíveis" />
          <Tab label="Em Andamento" />
          <Tab label="Concluídos" />
        </Tabs>

        {selectedTab === 0 && (
          <Box sx={{ p: { xs: 1, sm: 2 } }}>
            {renderCourses(filteredAvailableCourses, "Começar", handleStartCourse)}
          </Box>
        )}
        {selectedTab === 1 && (
          <Box sx={{ p: { xs: 1, sm: 2 } }}>
            {renderCourses(filteredInProgressCourses, "Continuar", handleContinueCourse)}
          </Box>
        )}
        {selectedTab === 2 && (
          <Box sx={{ p: { xs: 1, sm: 2 } }}>
            {renderCourses(filteredCompletedCourses, "Ver Curso", handleViewCourse)}
          </Box>
        )}
      </Paper>

      <PinAccessModal
        open={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSubmit={handlePinSubmit}
        selectedCourse={selectedCourse}
      />

    </Box>
  );
};

export default MyCourses;