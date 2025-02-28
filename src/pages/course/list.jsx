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

const MyCourses = () => {
    const [selectedTab, setSelectedTab] = useState(0);
    const [inProgressCourses, setInProgressCourses] = useState([]);
    const [completedCourses, setCompletedCourses] = useState([]);
    const { userDetails } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const loadCourses = async () => {
            if (!userDetails?.userId) {
                console.log("Usuário não autenticado. Aguardando userId...");
                return;
            }

            try {
                const coursesRef = ref(database, "courses");
                const snapshot = await get(coursesRef);
                if (snapshot.exists()) {
                    const coursesData = snapshot.val();
                    const coursesArray = Object.entries(coursesData).map(([courseId, course]) => ({
                        courseId,
                        title: course.title,
                        description: course.description,
                    }));

                    const studentCoursesRef = ref(database, `studentCourses/${userDetails.userId}`);
                    const studentSnapshot = await get(studentCoursesRef);
                    const studentCourses = studentSnapshot.val() || {};

                    console.log("StudentCourses carregado:", studentCourses);

                    const enrichedCourses = coursesArray.map(course => {
                        const studentCourse = studentCourses[course.courseId] || {};
                        return {
                            ...course,
                            progress: studentCourse.progress !== undefined ? studentCourse.progress : 0,
                            status: studentCourse.status || "in_progress",
                        };
                    });

                    console.log("Cursos enriquecidos:", enrichedCourses);

                    const inProgress = enrichedCourses.filter(course => course.status === "in_progress");
                    const completed = enrichedCourses.filter(course => course.status === "completed");
                    setInProgressCourses(inProgress);
                    setCompletedCourses(completed);
                } else {
                    console.log("Nenhum curso encontrado.");
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

    const handleContinueCourse = (course) => {
        navigate(`/classes?courseId=${course.courseId}`);
    };

    const handleViewCertificate = (course) => {
        alert(`Certificado de: ${course.title}`);
    };

    const renderCourses = (courses, actionButtonLabel, onClickAction) => {
        if (!courses || courses.length === 0) {
            return <Typography variant="body1">Nenhum curso encontrado.</Typography>;
        }

        return (
            <Grid container spacing={3}>
                {courses.map((course) => (
                    <Grid item xs={12} sm={6} md={4} key={course.courseId}>
                        <Card
                            sx={{
                                backgroundColor: "#ffffff !important",
                                boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
                                borderRadius: "8px",
                                height: "100%",
                                display: "flex",
                                flexDirection: "column",
                                transition: 'transform 0.2s ease-in-out',
                                '&:hover': {
                                    transform: 'scale(1.02)',
                                    boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.2)"
                                }
                            }}
                        >
                            <CardContent>
                                <Typography
                                    variant="subtitle1"
                                    sx={{
                                        fontWeight: "bold",
                                        textAlign: "center",
                                        mb: 1
                                    }}
                                >
                                    {course.title || "Título do Curso"}
                                </Typography>
                                <Typography
                                    variant="body2"
                                    color="textSecondary"
                                >
                                    {course.description || "Descrição do curso"}
                                </Typography>
                                <Typography
                                    variant="body2"
                                    color="textSecondary"
                                    sx={{ mt: 1 }}
                                >
                                    Progresso: {(course.progress || 0).toFixed(2)}%
                                </Typography>
                            </CardContent>
                            <CardActions sx={{ p: 2, justifyContent: 'center', mt: 'auto' }}>
                                <Button
                                    size="small"
                                    variant="contained"
                                    sx={{
                                        m: 1,
                                        padding: '6px 10px',
                                        borderRadius: '8px',
                                        backgroundColor: '#9041c1',
                                        color: 'white',
                                        fontWeight: 'bold',
                                        fontSize: '14px',
                                        textTransform: 'none',
                                        width: 'calc(100% - 16px)',
                                        '&:hover': {
                                            backgroundColor: '#7d37a7'
                                        }
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
                p: 4,
                maxWidth: "1200px",
                margin: "0 auto",
                backgroundColor: "#f9f9f9",
                borderRadius: "12px",
                boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
                mt: 5,
            }}
        >
            <Topbar />
            <Box sx={{ height: "24px" }} />

            <Paper
                sx={{
                    p: 2,
                    backgroundColor: "#ffffff",
                    borderRadius: "12px",
                    boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
                }}
            >
                <Tabs
                    value={selectedTab}
                    onChange={handleTabChange}
                    textColor="primary"
                    centered
                    sx={{
                        mb: 4,
                        "& .MuiTab-root": { fontWeight: "bold" },
                        "& .MuiTabs-indicator": { backgroundColor: "#9041c1" },
                        "& .Mui-selected": { color: "#9041c1 !important" },
                    }}
                >
                    <Tab label="Em Andamento" />
                    <Tab label="Concluídos" />
                </Tabs>

                {selectedTab === 0 && (
                    <Box>
                        {renderCourses(inProgressCourses, "Continuar", handleContinueCourse)}
                    </Box>
                )}

                {selectedTab === 1 && (
                    <Box>
                        {renderCourses(completedCourses, "Ver Certificado", handleViewCertificate)}
                    </Box>
                )}
            </Paper>
        </Box>
    );
};

export default MyCourses;