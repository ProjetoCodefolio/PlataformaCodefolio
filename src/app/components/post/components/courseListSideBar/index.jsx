import React, { useState, useEffect } from "react";
import { Box, Typography, Card, CardContent, Button, Grid } from "@mui/material";
import { ref, get } from "firebase/database";
import { database } from "$api/config/firebase";
import { useNavigate } from "react-router-dom";
import LockIcon from '@mui/icons-material/Lock';
import { useAuth } from "$context/AuthContext";
import PinAccessModal from "$components/modals/PinAccessModal";
import { fetchCourses, checkStudentCourseEnrollment } from "$api/services/courses/courses";

const CourseListSidebar = ({ onSelectCourse }) => {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const { userDetails } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const loadCourses = async () => {
      const coursesData = await fetchCourses(5);
      setCourses(coursesData);
    };

    loadCourses();
  }, []);

  const handleContinueCourse = async (course) => {
    let isEnrolled = false
    // if (!userDetails?.userId) {
    //   return;
    // }

    if (userDetails?.userId) {
      isEnrolled = await checkStudentCourseEnrollment(userDetails.userId, course.courseId);
      // return;
    }

    if (isEnrolled) {
      navigate(`/classes?courseId=${course.courseId}`);
    } else {
      if (course.pinEnabled) {
        setSelectedCourse(course);
        setShowPinModal(true);
      } else {
        navigate(`/classes?courseId=${course.courseId}`);
      }
    }
  };

  const handlePinSubmit = (course) => {
    navigate(`/classes?courseId=${course.courseId}`);
  };

  return (
    <Box
      sx={{
        p: 2,
        backgroundColor: "#ffffff",
        borderRadius: "12px",
        boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
        width: '100%',
        minWidth: '310px',
        maxWidth: '600px',
        boxSizing: 'border-box',
        margin: '0 auto',
      }}
    >
      <Typography
        variant="h6"
        sx={{
          mb: 2,
          fontWeight: "bold",
          textAlign: "center",
          color: "#333",
          fontSize: '1.2rem'
        }}
      >
        Cursos Recomendados
      </Typography>
      <Grid
        container
        direction="column"
        spacing={2}
        sx={{
          width: '100%',
          alignItems: 'center'
        }}
      >
        {courses.map((course) => (
          <Grid
            item
            key={course.courseId}
            sx={{
              width: '100%'
            }}
          >
            <Card
              sx={{
                backgroundColor: "#ffff",
                boxShadow: "0px 1px 2px rgba(0, 0, 0, 0.25)",
                borderRadius: "16px",
                width: '100%',
                minWidth: '280px',
                minHeight: '160px',
                transition: 'transform 0.2s ease-in-out',
                '&:hover': {
                  transform: 'scale(1.02)',
                },
              }}
            >
              <CardContent
                sx={{
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '12px',
                  height: '100%',
                  backgroundColor: '#ffff',
                  color: '#ffffff'
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: "bold",
                      textAlign: "left",
                      width: '100%',
                      fontSize: '1.1rem',
                      color: '#333333'
                    }}
                  >
                    {course.title || "Título do Curso"}
                  </Typography>
                  {course.pinEnabled && (
                    <LockIcon
                      sx={{
                        color: '#9041c1',
                        ml: 1,
                      }}
                    />
                  )}
                </Box>
                <Typography
                  variant="body2"
                  sx={{
                    textAlign: 'left',
                    width: '100%',
                    fontSize: '1rem',
                    color: '#b3b3b3'
                  }}
                >
                  {course.description || "Descrição do curso"}
                </Typography>
                <Button
                  variant="contained"
                  sx={{
                    mt: 'auto',
                    padding: '8px 24px',
                    borderRadius: '8px',
                    backgroundColor: '#9041c1',
                    color: 'white',
                    fontWeight: 'bold',
                    textTransform: 'none',
                    width: '100%',
                    fontSize: '1rem',
                    '&:hover': {
                      backgroundColor: '#7d37a7'
                    }
                  }}
                  onClick={() => handleContinueCourse(course)}
                >
                  Acessar
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box>
        {/* ... */}
        <PinAccessModal
          open={showPinModal}
          onClose={() => setShowPinModal(false)}
          onSubmit={handlePinSubmit}
          selectedCourse={selectedCourse}
        />
      </Box>
    </Box>
  );
};

export default CourseListSidebar;