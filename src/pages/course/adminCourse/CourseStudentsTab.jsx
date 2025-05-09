import { ref as firebaseRef, set, push, get, update } from 'firebase/database';
import { database } from "../../../service/firebase";
import { useLocation } from "react-router-dom";
import React, { useEffect, useState, forwardRef } from "react";
import {
    Box,
    TextField,
    Button,
    IconButton,
    List,
    ListItem,
    ListItemText,
    Grid,
    Modal,
    Typography,
    CircularProgress,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Divider,
    Card,
    CardContent,
    Avatar,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Stack,
    Chip,
    Tooltip
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import SortIcon from '@mui/icons-material/Sort';
import FilterListIcon from '@mui/icons-material/FilterList';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { toast } from "react-toastify";

// Função para formatar nomes com capitalização adequada
const capitalizeWords = (name) => {
    if (!name) return "Nome Indisponível";
    return name
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
};

const CourseStudentsTab = forwardRef((props, ref) => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortType, setSortType] = useState("name-asc");
    const [searchTerm, setSearchTerm] = useState("");
    const [progressFilter, setProgressFilter] = useState("all");
    const [roleFilter, setRoleFilter] = useState("all");
    const [activeFilters, setActiveFilters] = useState(0);
    const [updatingRole, setUpdatingRole] = useState(null);
    const [courseOwner, setCourseOwner] = useState(null);

    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const courseId = params.get("courseId");

    // Atualizar contagem de filtros ativos
    useEffect(() => {
        let count = 0;
        if (progressFilter !== "all") count++;
        if (roleFilter !== "all") count++;
        if (searchTerm.trim() !== "") count++;
        setActiveFilters(count);
    }, [progressFilter, roleFilter, searchTerm]);

    // Função para ordenar e filtrar estudantes
    const getSortedStudents = () => {
        if (!students || students.length === 0) return [];

        let filteredStudents = [...students];

        // Aplicar filtro de busca
        if (searchTerm && searchTerm.trim() !== "") {
            const normalizedSearchTerm = searchTerm.toLowerCase().trim();
            filteredStudents = filteredStudents.filter(
                (student) =>
                    (student.name && student.name.toLowerCase().includes(normalizedSearchTerm)) ||
                    (student.email && student.email.toLowerCase().includes(normalizedSearchTerm))
            );
        }

        // Aplicar filtro de progresso
        if (progressFilter !== "all") {
            filteredStudents = filteredStudents.filter(student => {
                const studentProgress = parseInt(student.progress || 0);

                if (progressFilter === "completed") {
                    return studentProgress === 100 || student.status === "completed";
                } else if (progressFilter === "high") {
                    return studentProgress >= 75 && studentProgress < 100 && student.status !== "completed";
                } else if (progressFilter === "medium") {
                    return studentProgress >= 25 && studentProgress < 75;
                } else if (progressFilter === "low") {
                    return studentProgress < 25;
                }
                return true;
            });
        }

        // Aplicar filtro de role
        if (roleFilter !== "all") {
            filteredStudents = filteredStudents.filter(student => {
                const studentRole = (student.role || "student").toLowerCase();
                return studentRole === roleFilter.toLowerCase();
            });
        }

        // Aplicar ordenação
        switch (sortType) {
            case "name-asc":
                return filteredStudents.sort((a, b) => {
                    const nameA = (a.name || "").toLowerCase();
                    const nameB = (b.name || "").toLowerCase();
                    return nameA.localeCompare(nameB);
                });
            case "name-desc":
                return filteredStudents.sort((a, b) => {
                    const nameA = (a.name || "").toLowerCase();
                    const nameB = (b.name || "").toLowerCase();
                    return nameB.localeCompare(nameA);
                });
            default:
                return filteredStudents;
        }
    };

    // Função para lidar com a mudança do tipo de ordenação
    const handleSortChange = (event) => {
        setSortType(event.target.value);
    };

    // Limpar todos os filtros
    const handleClearFilters = () => {
        setProgressFilter("all");
        setRoleFilter("all");
        setSearchTerm("");
    };

    const fetchCourseOwner = async () => {
        try {
            const courseRef = firebaseRef(database, `courses/${courseId}`);
            const snapshot = await get(courseRef);

            if (snapshot.exists()) {
                const courseData = snapshot.val();
                setCourseOwner(courseData.userId);
            }
        } catch (error) {
            console.error("Erro ao buscar proprietário do curso:", error);
        }
    };

    const fetchStudentsCourse = async () => {
        try {
            setLoading(true);

            // Referência para toda a coleção studentCourses
            const studentsRef = firebaseRef(database, `studentCourses`);
            const snapshot = await get(studentsRef);

            if (snapshot.exists()) {
                const allStudentsData = snapshot.val();
                const studentsPromises = [];

                // Iterar sobre cada userId para verificar se contém o courseId desejado
                Object.entries(allStudentsData).forEach(([userId, courses]) => {
                    // Verificar se este usuário está inscrito no curso atual
                    if (courses && courses[courseId]) {
                        // Para cada estudante do curso, criar uma promessa que busca seus dados completos
                        const studentPromise = fetchStudentsData(userId).then(userData => {
                            if (userData) {
                                // Derivar o nome de exibição a partir dos dados disponíveis
                                let displayName = "Usuário Desconhecido";
                                if (userData.displayName) {
                                    displayName = userData.displayName;
                                } else if (userData.firstName) {
                                    displayName = `${userData.firstName} ${userData.lastName || ""}`;
                                } else if (userData.name) {
                                    displayName = userData.name;
                                } else if (userData.email) {
                                    displayName = userData.email.split("@")[0];
                                }

                                // Verificar se o usuário é professor deste curso específico
                                // Verificamos se existe uma entrada para este curso na coleção coursesTeacher do usuário
                                const isTeacher = userData.coursesTeacher &&
                                    userData.coursesTeacher[courseId] === true;

                                // Verificar se o usuário é o owner do curso
                                const isCourseOwner = userId === courseOwner;

                                // Definir role baseado na hierarquia: owner -> teacher -> student
                                const userRole = isCourseOwner ? "admin" : (isTeacher ? "teacher" : "student");

                                // Combinar os dados do curso com os dados do usuário
                                return {
                                    id: userId,
                                    userId: userId,
                                    name: displayName.trim() || "Usuário " + userId.substring(0, 6),
                                    ...courses[courseId],  // Dados específicos do curso
                                    ...userData,          // Dados do perfil do usuário (nome, email, etc)
                                    role: userRole, // Role com base na hierarquia
                                    isCourseOwner: isCourseOwner // Flag para indicar se é owner
                                };
                            }
                            return null;
                        });

                        studentsPromises.push(studentPromise);
                    }
                });

                // Esperar todas as promessas serem resolvidas
                const studentsArray = await Promise.all(studentsPromises);
                // Filtrar possíveis nulls (onde fetchStudentsData falhou)
                setStudents(studentsArray.filter(student => student !== null));
            } else {
                setStudents([]);
            }
        } catch (error) {
            console.error("Erro ao buscar estudantes:", error);
            toast.error("Não foi possível carregar os estudantes do curso");
            setStudents([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchStudentsData = async (userId) => {
        try {
            const studentsRef = firebaseRef(database, `users/${userId}`);
            const snapshot = await get(studentsRef);

            if (snapshot.exists()) {
                return snapshot.val();
            } else {
                console.log("Nenhum dado encontrado para o usuário:", userId);
                return null;
            }
        } catch (error) {
            console.error("Erro ao buscar dados do estudante:", error);
            return null;
        }
    };

    useEffect(() => {
        if (courseId) {
            fetchCourseOwner();
        }
    }, [courseId]);

    // Este useEffect depende de courseOwner, garantindo que só será chamado quando courseOwner for definido
    useEffect(() => {
        if (courseId && courseOwner !== null) {
            fetchStudentsCourse();
        }
    }, [courseId, courseOwner]);

    // Nova função para alterar role do estudante
    const handleRoleChange = async (userId, studentName, newRole) => {
        try {
            setUpdatingRole(userId);

            // Atualizar role no banco de dados
            const userRef = firebaseRef(database, `users/${userId}/coursesTeacher/${courseId}`);

            if (newRole === "teacher") {
                // Marcar como professor - adicionar courseId ao coursesTeacher
                await set(userRef, true);
            } else {
                // Remover marcação de professor - remover courseId do coursesTeacher
                await set(userRef, null);
            }

            // Atualizar o estado local
            setStudents(prevStudents => prevStudents.map(student =>
                student.userId === userId
                    ? { ...student, role: newRole }
                    : student
            ));

            toast.success(`${capitalizeWords(studentName)} ${newRole === "teacher" ? "promovido a professor" : "definido como estudante"} com sucesso!`);
        } catch (error) {
            console.error("Erro ao atualizar role:", error);
            toast.error("Não foi possível alterar a função do usuário");
        } finally {
            setUpdatingRole(null);
        }
    };

    const handleDisableStudent = async (userId) => {
        toast.warn("Função momentaneamente desabilitada. Em breve disponível.");
    };

    return (
        <Box sx={{ padding: 2 }}>
            <Typography variant="h4" gutterBottom>
                Estudantes do Curso
            </Typography>

            {/* Barra de pesquisa */}
            <Box sx={{ mb: 3 }}>
                <TextField
                    fullWidth
                    variant="outlined"
                    size="small"
                    placeholder="Buscar estudante por nome ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    sx={{
                        mb: 2,
                        "& .MuiOutlinedInput-root": {
                            borderRadius: 2,
                            "& fieldset": { borderColor: "#9041c1" },
                            "&:hover fieldset": { borderColor: "#7d37a7" },
                            "&.Mui-focused fieldset": { borderColor: "#9041c1" },
                        },
                    }}
                />

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                    {/* Opções de ordenação */}
                    <Stack direction="row" spacing={1} alignItems="center">
                        <SortIcon sx={{ color: "#9041c1" }} />
                        <FormControl variant="outlined" size="small" sx={{ minWidth: 160 }}>
                            <InputLabel id="sort-select-label">Ordenar por</InputLabel>
                            <Select
                                labelId="sort-select-label"
                                id="sort-select"
                                value={sortType}
                                onChange={handleSortChange}
                                label="Ordenar por"
                                sx={{
                                    borderRadius: 2,
                                    "& .MuiOutlinedInput-notchedOutline": { borderColor: "#9041c1" },
                                    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#7d37a7" },
                                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#9041c1" },
                                }}
                            >
                                <MenuItem value="name-asc">Nome (A-Z)</MenuItem>
                                <MenuItem value="name-desc">Nome (Z-A)</MenuItem>
                            </Select>
                        </FormControl>
                    </Stack>

                    {/* Filtro de progresso */}
                    <Stack direction="row" spacing={1} alignItems="center">
                        <FilterListIcon sx={{ color: progressFilter !== "all" ? "#9041c1" : "text.secondary" }} />
                        <FormControl variant="outlined" size="small" sx={{ minWidth: 160 }}>
                            <InputLabel id="progress-filter-label">Filtrar por progresso</InputLabel>
                            <Select
                                labelId="progress-filter-label"
                                id="progress-filter"
                                value={progressFilter}
                                onChange={(e) => setProgressFilter(e.target.value)}
                                label="Filtrar por progresso"
                                sx={{
                                    borderRadius: 2,
                                    "& .MuiOutlinedInput-notchedOutline": {
                                        borderColor: progressFilter !== "all" ? "#9041c1" : "rgba(0, 0, 0, 0.23)"
                                    },
                                    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#9041c1" },
                                }}
                            >
                                <MenuItem value="all">Todos</MenuItem>
                                <MenuItem value="completed">Concluído (100%)</MenuItem>
                                <MenuItem value="high">Avançado (75-99%)</MenuItem>
                                <MenuItem value="medium">Intermediário (25-74%)</MenuItem>
                                <MenuItem value="low">Iniciante (0-24%)</MenuItem>
                            </Select>
                        </FormControl>
                    </Stack>

                    {/* Filtro de roles */}
                    <Stack direction="row" spacing={1} alignItems="center">
                        <FilterListIcon sx={{ color: roleFilter !== "all" ? "#9041c1" : "text.secondary" }} />
                        <FormControl variant="outlined" size="small" sx={{ minWidth: 140 }}>
                            <InputLabel id="role-filter-label">Filtrar por role</InputLabel>
                            <Select
                                labelId="role-filter-label"
                                id="role-filter"
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                                label="Filtrar por role"
                                sx={{
                                    borderRadius: 2,
                                    "& .MuiOutlinedInput-notchedOutline": {
                                        borderColor: roleFilter !== "all" ? "#9041c1" : "rgba(0, 0, 0, 0.23)"
                                    },
                                    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#9041c1" },
                                }}
                            >
                                <MenuItem value="all">Todos</MenuItem>
                                <MenuItem value="student">Estudante</MenuItem>
                                <MenuItem value="teacher">Professor</MenuItem>
                                <MenuItem value="admin">Admin</MenuItem>
                            </Select>
                        </FormControl>
                    </Stack>

                    {/* Indicador de filtros ativos / botão para limpar */}
                    {activeFilters > 0 && (
                        <Tooltip title="Limpar todos os filtros">
                            <Chip
                                label={`${activeFilters} filtro${activeFilters > 1 ? 's' : ''} ativo${activeFilters > 1 ? 's' : ''}`}
                                onDelete={handleClearFilters}
                                color="primary"
                                sx={{
                                    bgcolor: "#9041c1",
                                    '& .MuiChip-deleteIcon': {
                                        color: 'white',
                                        '&:hover': { color: 'rgba(255, 255, 255, 0.7)' }
                                    }
                                }}
                            />
                        </Tooltip>
                    )}
                </Stack>
            </Box>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <Box>
                    {/* Estatística de contagem de estudantes */}
                    <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                        Exibindo {getSortedStudents().length} de {students.length} estudantes
                    </Typography>

                    {students.length > 0 ? (
                        getSortedStudents().length > 0 ? (
                            <TableContainer component={Paper} sx={{ boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.05)' }}>
                                <Table sx={{ minWidth: 650 }}>
                                    <TableHead>
                                        <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                                            <TableCell sx={{ fontWeight: "bold" }}>Estudante</TableCell>
                                            <TableCell sx={{ fontWeight: "bold" }}>Email</TableCell>
                                            <TableCell sx={{ fontWeight: "bold" }}>Progresso</TableCell>
                                            <TableCell sx={{ fontWeight: "bold" }}>Status</TableCell>
                                            <TableCell sx={{ fontWeight: "bold" }}>Role</TableCell>
                                            <TableCell sx={{ fontWeight: "bold" }}>Ações</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {getSortedStudents().map((student) => (
                                            <TableRow key={student.id} hover>
                                                <TableCell component="th" scope="row">
                                                    <Stack direction="row" alignItems="center" spacing={2}>
                                                        <Avatar
                                                            alt={student.name}
                                                            src={student.photoURL}
                                                            sx={{
                                                                width: 40,
                                                                height: 40,
                                                                backgroundColor: "#9041c1",
                                                                color: "white",
                                                                fontWeight: "bold",
                                                            }}
                                                        >
                                                            {student.name?.charAt(0).toUpperCase()}
                                                        </Avatar>
                                                        <Typography variant="body1">
                                                            {capitalizeWords(student.name)}
                                                        </Typography>
                                                    </Stack>
                                                </TableCell>
                                                <TableCell>{student.email}</TableCell>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        <Box
                                                            sx={{
                                                                width: 100,
                                                                mr: 1,
                                                                height: 8,
                                                                borderRadius: 4,
                                                                bgcolor: '#f0f0f0',
                                                                overflow: 'hidden',
                                                            }}
                                                        >
                                                            <Box
                                                                sx={{
                                                                    height: '100%',
                                                                    width: `${parseInt(student.progress || 0)}%`,
                                                                    bgcolor: getProgressColor(parseInt(student.progress || 0)),
                                                                    borderRadius: 4,
                                                                }}
                                                            />
                                                        </Box>
                                                        {parseInt(student.progress || 0)}%
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Box
                                                        sx={{
                                                            backgroundColor: student.status === "completed" ? "#e8f5e9" : "#f5f5f5",
                                                            color: student.status === "completed" ? "#2e7d32" : "#666",
                                                            borderRadius: 1,
                                                            px: 1,
                                                            py: 0.5,
                                                            display: "inline-block",
                                                            fontWeight: "bold",
                                                        }}
                                                    >
                                                        {student.status === "completed" ? "Concluído" : "Em Progresso"}
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <FormControl
                                                        fullWidth
                                                        size="small"
                                                        disabled={updatingRole === student.userId || student.isCourseOwner}
                                                    >
                                                        <Select
                                                            value={student.role || "student"}
                                                            onChange={(e) => handleRoleChange(student.userId, student.name, e.target.value)}
                                                            variant="outlined"
                                                            sx={{
                                                                borderRadius: 1,
                                                                backgroundColor:
                                                                    student.role === "admin" ? "#ffccbc" :
                                                                        student.role === "teacher" ? "#bbdefb" : "#e0e0e0",
                                                                "& .MuiOutlinedInput-notchedOutline": {
                                                                    borderColor: "transparent"
                                                                },
                                                                "&:hover .MuiOutlinedInput-notchedOutline": {
                                                                    borderColor: student.isCourseOwner ? "transparent" : "#9041c1"
                                                                },
                                                                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                                                                    borderColor: student.isCourseOwner ? "transparent" : "#9041c1"
                                                                },
                                                                "& .MuiSelect-select": {
                                                                    fontWeight: student.isCourseOwner ? "bold" : "medium",
                                                                    py: 0.5,
                                                                    fontSize: "0.875rem"
                                                                }
                                                            }}
                                                            MenuProps={{
                                                                PaperProps: {
                                                                    sx: { maxHeight: 200, mt: 0.5 }
                                                                }
                                                            }}
                                                        >
                                                            <MenuItem value="student">Estudante</MenuItem>
                                                            <MenuItem value="teacher">Professor</MenuItem>
                                                            {/* Opção Admin disponível apenas para o owner */}
                                                            {student.isCourseOwner && (
                                                                <MenuItem value="admin">Proprietário</MenuItem>
                                                            )}
                                                        </Select>
                                                    </FormControl>
                                                    {updatingRole === student.userId && (
                                                        <Box sx={{ display: "flex", justifyContent: "center", my: 0.5 }}>
                                                            <CircularProgress size={20} sx={{ color: "#9041c1" }} />
                                                        </Box>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => handleDisableStudent(student.userId)}
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        ) : (
                            <Box
                                sx={{
                                    p: 4,
                                    textAlign: 'center',
                                    bgcolor: '#f9f9f9',
                                    borderRadius: 2,
                                }}
                            >
                                <Typography variant="body1" sx={{ color: 'text.secondary', mb: 1 }}>
                                    Nenhum estudante corresponde aos filtros aplicados.
                                </Typography>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={handleClearFilters}
                                    sx={{ mt: 1 }}
                                >
                                    Limpar filtros
                                </Button>
                            </Box>
                        )
                    ) : (
                        <Typography variant="body1" sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>
                            Nenhum estudante matriculado neste curso.
                        </Typography>
                    )}
                </Box>
            )}
        </Box>
    );
});

// Função auxiliar para determinar cor da barra de progresso
const getProgressColor = (progress) => {
    if (progress >= 100) return '#4caf50'; // Verde para concluído
    if (progress >= 75) return '#8bc34a';  // Verde-claro para avançado
    if (progress >= 25) return '#ff9800';  // Laranja para intermediário
    return '#f44336';                      // Vermelho para iniciante
};

export default CourseStudentsTab;