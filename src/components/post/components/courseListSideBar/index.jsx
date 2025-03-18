import React, { useState, useEffect } from "react";
import { Box, Typography, Card, CardContent, Button, Grid, Modal, TextField } from "@mui/material";
import { ref, get } from "firebase/database";
import { database } from "../../../../service/firebase";
import { useNavigate } from "react-router-dom";
import LockIcon from '@mui/icons-material/Lock';
import { keyframes } from '@emotion/react';

const shake = keyframes`
  0% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  50% { transform: translateX(5px); }
  75% { transform: translateX(-5px); }
  100% { transform: translateX(0); }
`;

const CourseListSidebar = ({ onSelectCourse }) => {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [pinInput, setPinInput] = useState("");
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinError, setPinError] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const coursesRef = ref(database, "courses");
        const snapshot = await get(coursesRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          const coursesArray = Object.entries(data).map(([courseId, course]) => ({
            courseId,
            ...course,
          }));
          setCourses(coursesArray.slice(0, 5));
        }
      } catch (error) {
        console.error("Erro ao carregar cursos:", error);
      }
    };

    fetchCourses();
  }, []);

  const handleContinueCourse = (course) => {
    if (course.pin) {
      setSelectedCourse(course);
      setShowPinModal(true);
    } else {
      navigate(`/classes?courseId=${course.courseId}`);
    }
  };

  const handlePinSubmit = () => {
    if (pinInput === selectedCourse.pin) {
      setShowPinModal(false);
      navigate(`/classes?courseId=${selectedCourse.courseId}`);
    } else {
      console.log("PIN incorreto");
      setPinError(true);
      setTimeout(() => setPinError(false), 2000); // Remove o efeito de tremor após 500ms
    }
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
                  {course.pin && (
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

      <Modal open={showPinModal} onClose={() => setShowPinModal(false)}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: { xs: "90%", sm: 500 },
            bgcolor: "#fff",
            borderRadius: "20px",
            boxShadow: "0 12px 40px rgba(0, 0, 0, 0.3)",
            p: { xs: 3, sm: 4 },
            textAlign: "center",
            background: "linear-gradient(135deg, #9041c1 0%, #7d37a7 100%)",
            color: "#fff",
            animation: "zoomIn 0.5s ease-in-out",
            "@keyframes zoomIn": {
              "0%": { transform: "translate(-50%, -50%) scale(0.5)", opacity: 0 },
              "100%": { transform: "translate(-50%, -50%) scale(1)", opacity: 1 },
            },
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
          }}
        >
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Você está tentando acessar um curso que requer uma chave de acesso
          </Typography>
          <TextField
            label="PIN de Acesso"
            fullWidth
            inputProps={{ maxLength: 7 }}
            variant="outlined"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            sx={{
              mb: 2,
              animation: pinError ? `${shake} 0.5s` : 'none',
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: "#fff" },
                "&:hover fieldset": { borderColor: "#fff" },
                "&.Mui-focused fieldset": { borderColor: "#fff" },
              },
              "& .MuiInputLabel-root": {
                color: "#fff",
                "&.Mui-focused": { color: "#fff" },
              },
              "& .MuiOutlinedInput-input": {
                color: "#fff",
              },
            }}
          />
          {pinError && (
            <Typography variant="body2" sx={{ color: '#ff4d4d', mt: -2, mb: 2 }}>
              PIN incorreto. Tente novamente.
            </Typography>
          )}
          <Button
            variant="contained"
            onClick={handlePinSubmit}
            sx={{
              backgroundColor: "#fff",
              color: "#9041c1",
              borderRadius: "16px",
              "&:hover": { backgroundColor: "#f5f5fa", color: "#7d37a7" },
              textTransform: "none",
              fontWeight: 600,
              px: 4,
              py: 1.5,
              minWidth: 180,
            }}
          >
            Enviar
          </Button>
        </Box>
      </Modal>
    </Box>
  );
};

export default CourseListSidebar;