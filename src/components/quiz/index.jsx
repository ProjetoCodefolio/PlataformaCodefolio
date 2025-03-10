import React, { useState, useEffect } from "react";
import {
    Box,
    Button,
    Typography,
    RadioGroup,
    FormControlLabel,
    Radio,
    LinearProgress,
} from "@mui/material";
import { fetchQuizQuestions, validateQuizAnswers } from "../../service/courses";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";

const Quiz = ({ quizId, courseId, currentVideoId, videos, onComplete, onSubmit, onNextVideo }) => {
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [userAnswers, setUserAnswers] = useState({});
    const [loading, setLoading] = useState(true);
    const [quizCompleted, setQuizCompleted] = useState(false);
    const [result, setResult] = useState(null);
    const { userDetails } = useAuth();

    useEffect(() => {
        const loadQuiz = async () => {
            try {
                const quizData = await fetchQuizQuestions(quizId);
                if (quizData?.questions?.length > 0) {
                    setQuestions(quizData.questions);
                } else {
                    setQuestions([]);
                    toast.error("Nenhuma pergunta encontrada para este quiz.");
                }
                setLoading(false);
            } catch (error) {
                toast.error("Erro ao carregar o quiz.");
                setQuestions([]);
                setLoading(false);
            }
        };
        loadQuiz();
    }, [quizId]);

    const currentQuestion = questions[currentQuestionIndex];

    const handleNext = () => {
        if (selectedOption === null) {
            toast.warn("Selecione uma opção antes de avançar.");
            return;
        }
        const updatedAnswers = { ...userAnswers, [currentQuestion.id]: parseInt(selectedOption) };
        setUserAnswers(updatedAnswers);

        if (currentQuestionIndex === questions.length - 1) {
            handleSubmit(updatedAnswers);
        } else {
            setCurrentQuestionIndex((prev) => prev + 1);
            setSelectedOption(
                userAnswers[questions[currentQuestionIndex + 1]?.id]?.toString() || null
            );
        }
    };

    const handlePrevious = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex((prev) => prev - 1);
            setSelectedOption(
                userAnswers[questions[currentQuestionIndex - 1]?.id]?.toString() || null
            );
        }
    };

    const handleSubmit = async (answers) => {
        try {
            const result = await validateQuizAnswers(
                answers,
                quizId,
                /*userDetails.userId,
                courseId,*/
                questions[0]?.minPercentage || 70
            );
            const calculatedPercentage = (result.earnedPoints / result.totalPoints) * 100;
            const minPercentage = questions[0]?.minPercentage || 70;
            const isPassed = calculatedPercentage >= minPercentage;

            setResult({
                ...result,
                userAnswers: answers,
                isPassed,
                scorePercentage: calculatedPercentage,
            });
            setQuizCompleted(true);
            onSubmit(answers);
        } catch (error) {
            console.log("caiu em quiz")
            toast.error("Erro ao validar o quiz.");
            setQuizCompleted(false);
        }
    };

    const handleRetry = () => {
        setQuizCompleted(false);
        setCurrentQuestionIndex(0);
        setSelectedOption(null);
        setUserAnswers({});
        setResult(null);
    };

    const handleFinish = () => {
        onComplete(result?.isPassed || false);
    };

    const hasNextVideo = () => {
        const currentVideoIndex = videos.findIndex((v) => v.id === currentVideoId);
        return currentVideoIndex < videos.length - 1;
    };

    if (loading) return <Typography sx={{ textAlign: "center", mt: 4, color: "#666" }}>Carregando o quiz...</Typography>;
    if (questions.length === 0) return (
        <Box sx={{ textAlign: "center", mt: 4 }}>
            <Typography variant="h6" color="error">Nenhuma pergunta disponível.</Typography>
        </Box>
    );

    if (quizCompleted && result) {
        return (
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    minHeight: "70vh",
                    padding: 3,
                    backgroundColor: "#F5F5FA",
                }}
            >
                <Box
                    sx={{
                        width: "100%",
                        maxWidth: "780px",
                        p: 4,
                        borderRadius: "16px",
                        backgroundColor: "#F5F5FA",
                        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
                        border: "1px solid #e0e0e0",
                    }}
                >
                    <Typography
                        variant="h4"
                        sx={{
                            mb: 3,
                            textAlign: "center",
                            color: "#333",
                            fontWeight: 600,
                        }}
                    >
                        Resultado do Quiz
                    </Typography>
                    <Typography
                        variant="h6"
                        sx={{
                            mb: 2,
                            textAlign: "center",
                            color: "#666",
                        }}
                    >
                        Pontuação: {result.earnedPoints}/{result.totalPoints} ({result.scorePercentage.toFixed(2)}%)
                    </Typography>
                    <Typography
                        variant="h5"
                        sx={{
                            mb: 3,
                            textAlign: "center",
                            color: result.isPassed ? "#4caf50" : "#d32f2f",
                            fontWeight: "bold",
                        }}
                    >
                        {result.isPassed ? "Parabéns, você passou!" : "Você não atingiu a nota mínima."}
                    </Typography>
                    <Box sx={{ mb: 4 }}>
                        {questions.map((q) => (
                            <Box
                                key={q.id}
                                sx={{
                                    mb: 3,
                                    p: 2,
                                    border: "1px solid #e0e0e0",
                                    borderRadius: "8px",
                                    backgroundColor: "#ffffff",
                                }}
                            >
                                <Typography
                                    variant="body1"
                                    sx={{
                                        mb: 1,
                                        fontWeight: 500,
                                        color: "#333",
                                    }}
                                >
                                    {q.question}
                                </Typography>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        color: "#666",
                                    }}
                                >
                                    Sua resposta: {q.options[result.userAnswers[q.id]] || "Não respondida"}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "center",
                            gap: 2,
                            flexWrap: "wrap",
                        }}
                    >
                        {!result.isPassed && (
                            <Button
                                variant="contained"
                                onClick={handleRetry}
                                sx={{
                                    backgroundColor: "#9041c1",
                                    borderRadius: "12px",
                                    "&:hover": { backgroundColor: "#7d37a7" },
                                    textTransform: "none",
                                    fontWeight: 500,
                                    px: 4,
                                    py: 1.5,
                                }}
                            >
                                Refazer Quiz
                            </Button>
                        )}
                        <Button
                            variant="contained"
                            onClick={handleFinish}
                            sx={{
                                backgroundColor: "#9041c1",
                                borderRadius: "12px",
                                "&:hover": { backgroundColor: "#7d37a7" },
                                textTransform: "none",
                                fontWeight: 500,
                                px: 4,
                                py: 1.5,
                            }}
                        >
                            Voltar ao Vídeo
                        </Button>
                        {result.isPassed && hasNextVideo() && (
                            <Button
                                variant="contained"
                                onClick={onNextVideo}
                                sx={{
                                    backgroundColor: "#4caf50",
                                    borderRadius: "12px",
                                    "&:hover": { backgroundColor: "#388e3c" },
                                    textTransform: "none",
                                    fontWeight: 500,
                                    px: 4,
                                    py: 1.5,
                                }}
                            >
                                Ir para o Próximo Vídeo
                            </Button>
                        )}
                    </Box>
                </Box>
            </Box>
        );
    }

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                minHeight: "70vh",
                padding: 3,
                backgroundColor: "#F5F5FA",
            }}
        >
            <Box
                sx={{
                    width: "100%",
                    maxWidth: "780px",
                    p: 4,
                    borderRadius: "16px",
                    backgroundColor: "#F5F5FA",
                    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
                    border: "1px solid #e0e0e0",
                }}
            >
                <Typography
                    variant="h4"
                    sx={{
                        mb: 2,
                        textAlign: "center",
                        color: "#333",
                        fontWeight: 600,
                    }}
                >
                    Quiz
                </Typography>
                <Typography
                    variant="h6"
                    sx={{
                        mb: 3,
                        textAlign: "center",
                        color: "#666",
                    }}
                >
                    {`Questão ${currentQuestionIndex + 1} de ${questions.length}`}
                </Typography>
                <LinearProgress
                    variant="determinate"
                    value={((currentQuestionIndex + 1) / questions.length) * 100}
                    sx={{
                        mb: 4,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: "#e0e0e0",
                        "& .MuiLinearProgress-bar": {
                            backgroundColor: "#9041c1",
                            borderRadius: 5,
                        },
                    }}
                />
                <Typography
                    variant="h6"
                    sx={{
                        mb: 4,
                        color: "#333",
                        fontWeight: 500,
                    }}
                >
                    {currentQuestion?.question || "Pergunta indisponível"}
                </Typography>
                <RadioGroup
                    value={selectedOption}
                    onChange={(e) => setSelectedOption(e.target.value)}
                    sx={{ mb: 4 }}
                >
                    {currentQuestion?.options.map((option, index) => (
                        <FormControlLabel
                            key={index}
                            value={index.toString()}
                            control={<Radio sx={{ color: "#9041c1", "&.Mui-checked": { color: "#9041c1" } }} />}
                            label={option}
                            sx={{
                                backgroundColor: "#F5F5FA",
                                borderRadius: "8px",
                                mb: 1,
                                p: 1,
                                "&:hover": { backgroundColor: "#f0f0f0" },
                            }}
                        />
                    ))}
                </RadioGroup>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Button
                        variant="outlined"
                        onClick={handlePrevious}
                        disabled={currentQuestionIndex === 0}
                        sx={{
                            borderColor: "#9041c1",
                            color: "#9041c1",
                            borderRadius: "12px",
                            "&:hover": { borderColor: "#7d37a7", color: "#7d37a7" },
                            textTransform: "none",
                            fontWeight: 500,
                            px: 4,
                            py: 1.5,
                        }}
                    >
                        Voltar
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleNext}
                        sx={{
                            backgroundColor: "#9041c1",
                            borderRadius: "12px",
                            "&:hover": { backgroundColor: "#7d37a7" },
                            textTransform: "none",
                            fontWeight: 500,
                            px: 4,
                            py: 1.5,
                        }}
                    >
                        {currentQuestionIndex === questions.length - 1 ? "Finalizar" : "Próxima"}
                    </Button>
                </Box>
            </Box>
        </Box>
    );
};

export default Quiz;