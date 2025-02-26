import { ref as firebaseRef, set, push, get } from 'firebase/database';
import { database } from "../../../service/firebase";
import { useLocation } from "react-router-dom";
import React, { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import {
    Box,
    TextField,
    Button,
    IconButton,
    List,
    ListItem,
    ListItemText,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormHelperText
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";

const CourseQuizzesTab = forwardRef((props, ref) => {
    const [quizQuestions, setQuizQuestions] = useState([]);
    const [quizQuestion, setQuizQuestion] = useState("");
    const [quizOptions, setQuizOptions] = useState(["", ""]);
    const [correctOption, setCorrectOption] = useState(1);
    const [minPercentage, setMinPercentage] = useState(0);

    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const courseId = params.get("courseId");

    const handleAddQuizQuestion = () => {
        if (!quizQuestion.trim()) {
            alert("Por favor, insira uma pergunta");
            return;
        }

        const newQuestion = {
            id: Date.now(),
            question: quizQuestion,
            options: quizOptions,
            correctOption: correctOption - 1
        };
        setQuizQuestions(prev => [...prev, newQuestion]);
        setQuizQuestion("");
        setQuizOptions(["", ""]);
        setCorrectOption(1);
    };

    const handleRemoveQuizQuestion = (id) => {
        let response = window.confirm("Deseja realmente deletar esta questão?");
        if (response) {
            setQuizQuestions(prev => prev.filter(question => question.id !== id));
        }
    };

    const handleUpdateQuizOption = (index, value) => {
        setQuizOptions(prev => prev.map((opt, i) => i === index ? value : opt));
    };

    const handleAddQuizOption = () => {
        if (quizOptions.length < 5) {
            setQuizOptions(prev => [...prev, ""]);
        }
    };

    // Adicione a função para remover opção
    const handleRemoveQuizOption = (indexToRemove) => {
        if (quizOptions.length > 2) { // Mantém pelo menos 2 opções
            setQuizOptions(prev => prev.filter((_, index) => index !== indexToRemove));
            // Ajusta a opção correta se necessário
            if (correctOption > quizOptions.length - 1) {
                setCorrectOption(quizOptions.length - 1);
            }
        }
    };

    const saveQuizzes = async () => {
        try {
            const quizData = {
                questions: quizQuestions,
                minPercentage,
                courseId
            };

            const courseQuizzesRef = firebaseRef(database, `courseQuizzes/${courseId}`);
            await set(courseQuizzesRef, quizData);
            alert("Quiz salvo com sucesso!");
        } catch (error) {
            console.error("Erro ao salvar o quiz:", error);
            alert("Erro ao salvar o quiz.");
        }
    };

    useImperativeHandle(ref, () => ({
        saveQuizzes
    }));

    const fetchQuizzes = async () => {
        if (courseId) {
            const quizzesRef = firebaseRef(database, `courseQuizzes/${courseId}`);
            const snapshot = await get(quizzesRef);
            const quizData = snapshot.val();

            if (quizData) {
                setQuizQuestions(quizData.questions || []);
                setMinPercentage(quizData.minPercentage || 0);
            }
        }
    };

    useEffect(() => {
        fetchQuizzes();
    }, [courseId]);

    return (
        <Box sx={{ p: 3, backgroundColor: "#fff", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <TextField
                        label="Pergunta"
                        fullWidth
                        value={quizQuestion}
                        onChange={(e) => setQuizQuestion(e.target.value)}
                        variant="outlined"
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                '& fieldset': {
                                    borderColor: '#666',
                                },
                                '&:hover fieldset': {
                                    borderColor: '#9041c1',
                                },
                                '&.Mui-focused fieldset': {
                                    borderColor: '#9041c1',
                                },
                            },
                            '& .MuiInputLabel-root': {
                                color: '#666',
                                '&.Mui-focused': {
                                    color: '#9041c1',
                                },
                            },
                        }}
                    />
                </Grid>

                {quizOptions.map((option, index) => (
                    <Grid item xs={12} md={6} key={index}>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <TextField
                                label={`Opção ${index + 1}`}
                                fullWidth
                                value={option}
                                onChange={(e) => handleUpdateQuizOption(index, e.target.value)}
                                variant="outlined"
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        '& fieldset': {
                                            borderColor: '#666',
                                        },
                                        '&:hover fieldset': {
                                            borderColor: '#9041c1',
                                        },
                                        '&.Mui-focused fieldset': {
                                            borderColor: '#9041c1',
                                        },
                                    },
                                    '& .MuiInputLabel-root': {
                                        color: '#666',
                                        '&.Mui-focused': {
                                            color: '#9041c1',
                                        },
                                    },
                                }}
                            />
                            {quizOptions.length > 2 && ( // Só mostra o botão de remover se houver mais de 2 opções
                                <IconButton
                                    onClick={() => handleRemoveQuizOption(index)}
                                    sx={{
                                        color: '#666',
                                        '&:hover': {
                                            color: '#d32f2f'
                                        }
                                    }}
                                >
                                    <DeleteIcon />
                                </IconButton>
                            )}
                        </Box>
                    </Grid>
                ))}

                <Grid item xs={12}>
                    <Button
                        variant="outlined"
                        onClick={handleAddQuizOption}
                        disabled={quizOptions.length >= 5}
                        sx={{
                            color: '#9041c1',
                            borderColor: '#9041c1',
                            '&:hover': {
                                borderColor: '#7d37a7',
                                backgroundColor: 'rgba(144, 65, 193, 0.04)'
                            }
                        }}
                    >
                        Adicionar Opção
                    </Button>
                </Grid>

                <Grid item xs={12}>
                    <TextField
                        label="Opção Correta"
                        type="number"
                        fullWidth
                        value={correctOption}
                        onChange={(e) => {
                            const value = Math.max(1, Math.min(quizOptions.length, parseInt(e.target.value) || 1));
                            setCorrectOption(value);
                        }}
                        inputProps={{
                            min: 1,
                            max: quizOptions.length
                        }}
                        variant="outlined"
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                '& fieldset': {
                                    borderColor: '#666',
                                },
                                '&:hover fieldset': {
                                    borderColor: '#9041c1',
                                },
                                '&.Mui-focused fieldset': {
                                    borderColor: '#9041c1',
                                },
                            },
                            '& .MuiInputLabel-root': {
                                color: '#666',
                                '&.Mui-focused': {
                                    color: '#9041c1',
                                },
                            },
                        }}
                    />
                </Grid>

                <Grid item xs={12}>
                    <FormControl fullWidth>
                        <InputLabel 
                            id="min-percentage-label"
                            sx={{
                                color: '#666',
                                background: '#fff',
                                px: 1,
                                '&.Mui-focused': {
                                    color: '#9041c1',
                                }
                            }}
                        >
                            Nota Mínima (%)
                        </InputLabel>
                        <Select
                            labelId="min-percentage-label"
                            value={minPercentage}
                            onChange={(e) => setMinPercentage(e.target.value)}
                            sx={{
                                '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: '#666',
                                },
                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                    borderColor: '#9041c1',
                                },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                    borderColor: '#9041c1',
                                },
                            }}
                        >
                            {[...Array(11)].map((_, index) => (
                                <MenuItem key={index * 10} value={index * 10}>
                                    {index * 10}%
                                </MenuItem>
                            ))}
                        </Select>
                        <FormHelperText sx={{ mt: 1 }}>
                            Defina a porcentagem mínima para aprovação. Se for 0%, o quiz não será obrigatório.
                        </FormHelperText>
                    </FormControl>
                </Grid>
            </Grid>

            <Button
                variant="contained"
                onClick={handleAddQuizQuestion}
                sx={{
                    mt: 4,
                    backgroundColor: "#9041c1",
                    padding: "10px 30px",
                    fontWeight: "bold",
                    '&:hover': {
                        backgroundColor: "#7d37a7"
                    }
                }}
            >
                Adicionar Questão
            </Button>

            <List sx={{ mt: 4 }}>
                {quizQuestions.map((question) => (
                    <ListItem
                        key={question.id}
                        sx={{
                            p: 3,
                            border: '1px solid #e0e0e0',
                            borderRadius: '8px',
                            mb: 2,
                            backgroundColor: '#fff',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                backgroundColor: 'rgba(144, 65, 193, 0.04)',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                            }
                        }}
                        secondaryAction={
                            <IconButton
                                edge="end"
                                onClick={() => handleRemoveQuizQuestion(question.id)}
                                sx={{
                                    color: '#666',
                                    '&:hover': {
                                        color: '#d32f2f'
                                    }
                                }}
                            >
                                <DeleteIcon />
                            </IconButton>
                        }
                    >
                        <ListItemText
                            primary={question.question}
                            secondary={
                                <>
                                    Opções: {question.options.join(", ")}
                                    <br />
                                    Resposta correta: Opção {question.correctOption + 1}
                                </>
                            }
                            primaryTypographyProps={{
                                sx: {
                                    fontWeight: 500,
                                    color: '#333',
                                    mb: 1
                                }
                            }}
                            secondaryTypographyProps={{
                                sx: {
                                    color: '#666'
                                }
                            }}
                        />
                    </ListItem>
                ))}
            </List>
        </Box>
    );
});

export default CourseQuizzesTab;