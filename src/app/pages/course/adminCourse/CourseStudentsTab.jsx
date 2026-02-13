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
import SortIcon from "@mui/icons-material/Sort";
import FilterListIcon from '@mui/icons-material/FilterList';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { toast } from "react-toastify";
import MyConfirm from "$components/post/components/confirm/Confirm";
import {
    fetchCourseStudentsEnriched,
    updateStudentCourseRole,
    removeStudentFromCourse,
    checkUserCourseRole
} from "$api/services/courses/students";
import { fetchCourseDetails } from "$api/services/courses/courses";
import { useAuth } from "$context/AuthContext";
import { canManageStudents } from "$api/utils/permissions";

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
    const [courseDetails, setCourseDetails] = useState({})
    const [loading, setLoading] = useState(true);
    const [sortType, setSortType] = useState("name-asc");
    const [searchTerm, setSearchTerm] = useState("");
    const [progressFilter, setProgressFilter] = useState("all");
    const [roleFilter, setRoleFilter] = useState("all");
    const [activeFilters, setActiveFilters] = useState(0);
    const [updatingRole, setUpdatingRole] = useState(null);
    const [showDeleteAlert, setShowDeleteAlert] = useState(false);
    const [studentToDelete, setStudentToDelete] = useState(null);
    const [isCurrentUserTeacher, setIsCurrentUserTeacher] = useState(false);
    const { currentUser, userDetails } = useAuth();

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

    // Função para carregar estudantes usando a API
    const loadCourseStudents = async () => {
        try {
            setLoading(true);

            // Usar a função da API para buscar estudantes
            const studentsData = await fetchCourseStudentsEnriched(courseId);
            setStudents(studentsData);

        } catch (error) {
            console.error("Erro ao buscar estudantes:", error);
            toast.error("Não foi possível carregar os estudantes do curso");
            setStudents([]);
        } finally {
            setLoading(false);
        }
    };

    const loadCourseDetails = async (courseId) => {
        try {
            setLoading(true);

            const studentsData = await fetchCourseDetails(courseId);
            setCourseDetails(studentsData);

        } catch (error) {
            console.error("Erro ao buscar o curso:", error);
            toast.error("Não foi possível carregar os dados do curso");
            setCourseDetails([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (courseId) {
            loadCourseDetails(courseId)
            loadCourseStudents();
        }
    }, [courseId]);

    // Função para alterar role do estudante usando a API
    const handleRoleChange = async (userId, studentName, newRole) => {
        try {
            setUpdatingRole(userId);

            // Usar a função da API para atualizar a role
            await updateStudentCourseRole(userId, courseId, newRole);

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

    // Function to handle delete icon click
    const handleDeleteClick = (student) => {
        setStudentToDelete(student);
        setShowDeleteAlert(true);
    };

    // Function to handle alert close
    const handleAlertClose = () => {
        setShowDeleteAlert(false);
        setStudentToDelete(null);
    };

    // Function to confirm deletion
    const handleConfirmDelete = () => {
        if (studentToDelete) {
            // TODO descomentar e testar linha abaixo
            // handleRemoveStudent(studentToDelete.userId, studentToDelete.name);
        }
        setShowDeleteAlert(false);
        setStudentToDelete(null);
    };

    // Função para remover estudante do curso
    const handleRemoveStudent = async (userId, studentName) => {
        // Aqui você pode adicionar uma confirmação antes de remover
        try {
            // Usar a função da API para remover o estudante
            await removeStudentFromCourse(userId, courseId);

            // Atualizar a lista de estudantes localmente
            setStudents(prevStudents =>
                prevStudents.filter(student => student.userId !== userId)
            );

            toast.success(`${capitalizeWords(studentName)} foi removido do curso.`);
        } catch (error) {
            console.error("Erro ao remover estudante:", error);
            toast.error("Não foi possível remover o estudante do curso");
        }
    };

    const checkCurrentUserRole = async () => {
        try {
            if (!currentUser || !courseId || !courseDetails?.userId) return;

            // Verificar se é admin ou owner (pode gerenciar)
            const canManage = canManageStudents(userDetails, courseDetails.userId);
            // Se não pode gerenciar, é apenas professor
            setIsCurrentUserTeacher(!canManage);
        } catch (error) {
            console.error("Erro ao verificar papel do usuário:", error);
            setIsCurrentUserTeacher(false);
        }
    };

    useEffect(() => {
        if (courseId && currentUser && courseDetails?.userId) {
            checkCurrentUserRole();
        }
    }, [courseId, currentUser, courseDetails?.userId]);

    return (
        <Box sx={{ padding: { xs: 1, sm: 2 } }}>
            <Typography variant="h4" gutterBottom sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
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
                        "& .MuiInputBase-input": {
                            fontSize: { xs: '0.875rem', sm: '1rem' }
                        }
                    }}
                />

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                    {/* Opções de ordenação */}
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ width: { xs: '100%', sm: 'auto' } }}>
                        <SortIcon sx={{ color: "#9041c1", display: { xs: 'none', sm: 'block' } }} />
                        <FormControl variant="outlined" size="small" sx={{ minWidth: { xs: '100%', sm: 160 } }}>
                            <InputLabel id="sort-select-label" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Ordenar por</InputLabel>
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
                                    fontSize: { xs: '0.875rem', sm: '1rem' }
                                }}
                            >
                                <MenuItem value="name-asc" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Nome (A-Z)</MenuItem>
                                <MenuItem value="name-desc" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Nome (Z-A)</MenuItem>
                            </Select>
                        </FormControl>
                    </Stack>

                    {/* Filtro de progresso */}
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ width: { xs: '100%', sm: 'auto' } }}>
                        <FilterListIcon sx={{ color: progressFilter !== "all" ? "#9041c1" : "text.secondary", display: { xs: 'none', sm: 'block' } }} />
                        <FormControl variant="outlined" size="small" sx={{ minWidth: { xs: '100%', sm: 160 } }}>
                            <InputLabel id="progress-filter-label" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Filtrar por progresso</InputLabel>
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
                                    fontSize: { xs: '0.875rem', sm: '1rem' }
                                }}
                            >
                                <MenuItem value="all" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Todos</MenuItem>
                                <MenuItem value="completed" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Concluído (100%)</MenuItem>
                                <MenuItem value="high" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Avançado (75-99%)</MenuItem>
                                <MenuItem value="medium" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Intermediário (25-74%)</MenuItem>
                                <MenuItem value="low" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Iniciante (0-24%)</MenuItem>
                            </Select>
                        </FormControl>
                    </Stack>

                    {/* Filtro de roles */}
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ width: { xs: '100%', sm: 'auto' } }}>
                        <FilterListIcon sx={{ color: roleFilter !== "all" ? "#9041c1" : "text.secondary", display: { xs: 'none', sm: 'block' } }} />
                        <FormControl variant="outlined" size="small" sx={{ minWidth: { xs: '100%', sm: 140 } }}>
                            <InputLabel id="role-filter-label" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Filtrar por role</InputLabel>
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
                                    fontSize: { xs: '0.875rem', sm: '1rem' }
                                }}
                            >
                                <MenuItem value="all" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Todos</MenuItem>
                                <MenuItem value="student" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Estudante</MenuItem>
                                <MenuItem value="teacher" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Professor</MenuItem>
                                <MenuItem value="admin" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Admin</MenuItem>
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
                    <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                        Exibindo {getSortedStudents().length} de {students.length} estudantes
                    </Typography>

                    {students.length > 0 ? (
                        getSortedStudents().length > 0 ? (
                            <>
                                {/* Tabela para desktop */}
                                <TableContainer component={Paper} sx={{ boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.05)', display: { xs: 'none', md: 'block' } }}>
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
                                                            <Typography variant="body1" sx={{ 
                                                                maxWidth: '150px',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap'
                                                            }}>
                                                                {capitalizeWords(student.name)}
                                                            </Typography>
                                                        </Stack>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" sx={{ 
                                                            maxWidth: '200px',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap'
                                                        }}>
                                                            {student.email}
                                                        </Typography>
                                                    </TableCell>
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
                                                            disabled={courseDetails.userId !== currentUser.uid ||
                                                                updatingRole === student.userId ||
                                                                courseDetails.userId === student.userId ||
                                                                isCurrentUserTeacher}
                                                        >
                                                            <Select
                                                                value={courseDetails.userId === student.userId ? "admin" : student.role || "student"}
                                                                onChange={(e) => handleRoleChange(student.userId, student.name, e.target.value)}
                                                                variant="outlined"
                                                                sx={{
                                                                    borderRadius: 1,
                                                                    backgroundColor:
                                                                        student.role === "teacher" ? "#bbdefb" :
                                                                            courseDetails.userId === student.userId ? "#ffccbc" : "#e0e0e0",
                                                                    "& .MuiOutlinedInput-notchedOutline": {
                                                                        borderColor: "transparent"
                                                                    },
                                                                    "&:hover .MuiOutlinedInput-notchedOutline": {
                                                                        borderColor: "#9041c1"
                                                                    },
                                                                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                                                                        borderColor: "#9041c1"
                                                                    },
                                                                    "& .MuiSelect-select": {
                                                                        fontWeight: "medium",
                                                                        py: 0.5,
                                                                        fontSize: "0.875rem"
                                                                    }
                                                                }}
                                                                MenuProps={{
                                                                    PaperProps: {
                                                                        sx: {
                                                                            maxHeight: 200,
                                                                            mt: 0.5
                                                                        }
                                                                    }
                                                                }}
                                                            >
                                                                <MenuItem value="student">Estudante</MenuItem>
                                                                <MenuItem value="teacher">Professor</MenuItem>
                                                                {courseDetails.userId === student.userId && (
                                                                    <MenuItem value="admin">Admin</MenuItem>
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
                                                            disabled={isCurrentUserTeacher ||
                                                                courseDetails.userId !== currentUser.uid
                                                            }
                                                            size="small"
                                                            color="error"
                                                            onClick={() => handleDeleteClick(student)}
                                                        >
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>

                                {/* Cards para mobile */}
                                <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                                    {getSortedStudents().map((student) => (
                                        <Card key={student.id} sx={{ mb: 2, boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)' }}>
                                            <CardContent>
                                                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                                                    <Avatar
                                                        alt={student.name}
                                                        src={student.photoURL}
                                                        sx={{
                                                            width: 50,
                                                            height: 50,
                                                            backgroundColor: "#9041c1",
                                                            color: "white",
                                                            fontWeight: "bold",
                                                        }}
                                                    >
                                                        {student.name?.charAt(0).toUpperCase()}
                                                    </Avatar>
                                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                                        <Typography variant="h6" sx={{ 
                                                            fontSize: '1rem',
                                                            fontWeight: 'bold',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap'
                                                        }}>
                                                            {capitalizeWords(student.name)}
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary" sx={{ 
                                                            fontSize: '0.75rem',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap'
                                                        }}>
                                                            {student.email}
                                                        </Typography>
                                                    </Box>
                                                    {!isCurrentUserTeacher && courseDetails.userId === currentUser.uid && (
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            onClick={() => handleDeleteClick(student)}
                                                        >
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    )}
                                                </Stack>
                                                
                                                <Divider sx={{ my: 1.5 }} />
                                                
                                                <Box sx={{ mb: 1.5 }}>
                                                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                                                        Progresso
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        <Box
                                                            sx={{
                                                                flex: 1,
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
                                                        <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>
                                                            {parseInt(student.progress || 0)}%
                                                        </Typography>
                                                    </Box>
                                                </Box>

                                                <Box sx={{ mb: 1.5 }}>
                                                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                                                        Status
                                                    </Typography>
                                                    <Box
                                                        sx={{
                                                            backgroundColor: student.status === "completed" ? "#e8f5e9" : "#f5f5f5",
                                                            color: student.status === "completed" ? "#2e7d32" : "#666",
                                                            borderRadius: 1,
                                                            px: 1,
                                                            py: 0.5,
                                                            display: "inline-block",
                                                            fontWeight: "bold",
                                                            fontSize: '0.75rem'
                                                        }}
                                                    >
                                                        {student.status === "completed" ? "Concluído" : "Em Progresso"}
                                                    </Box>
                                                </Box>

                                                <Box>
                                                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                                                        Função
                                                    </Typography>
                                                    <FormControl
                                                        fullWidth
                                                        size="small"
                                                        disabled={courseDetails.userId !== currentUser.uid ||
                                                            updatingRole === student.userId ||
                                                            courseDetails.userId === student.userId ||
                                                            isCurrentUserTeacher}
                                                    >
                                                        <Select
                                                            value={courseDetails.userId === student.userId ? "admin" : student.role || "student"}
                                                            onChange={(e) => handleRoleChange(student.userId, student.name, e.target.value)}
                                                            variant="outlined"
                                                            sx={{
                                                                borderRadius: 1,
                                                                backgroundColor:
                                                                    student.role === "teacher" ? "#bbdefb" :
                                                                        courseDetails.userId === student.userId ? "#ffccbc" : "#e0e0e0",
                                                                "& .MuiOutlinedInput-notchedOutline": {
                                                                    borderColor: "transparent"
                                                                },
                                                                "&:hover .MuiOutlinedInput-notchedOutline": {
                                                                    borderColor: "#9041c1"
                                                                },
                                                                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                                                                    borderColor: "#9041c1"
                                                                },
                                                                "& .MuiSelect-select": {
                                                                    fontWeight: "medium",
                                                                    py: 0.5,
                                                                    fontSize: "0.875rem"
                                                                }
                                                            }}
                                                        >
                                                            <MenuItem value="student" sx={{ fontSize: '0.875rem' }}>Estudante</MenuItem>
                                                            <MenuItem value="teacher" sx={{ fontSize: '0.875rem' }}>Professor</MenuItem>
                                                            {courseDetails.userId === student.userId && (
                                                                <MenuItem value="admin" sx={{ fontSize: '0.875rem' }}>Admin</MenuItem>
                                                            )}
                                                        </Select>
                                                    </FormControl>
                                                    {updatingRole === student.userId && (
                                                        <Box sx={{ display: "flex", justifyContent: "center", my: 0.5 }}>
                                                            <CircularProgress size={20} sx={{ color: "#9041c1" }} />
                                                        </Box>
                                                    )}
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </Box>
                            </>
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
            <MyConfirm
                open={showDeleteAlert}
                onClose={handleAlertClose}
                onConfirm={handleConfirmDelete}
                title="Confirmar exclusão"
                message={`Tem certeza que deseja remover ${studentToDelete?.name ? capitalizeWords(studentToDelete.name) : 'este aluno'} do curso?`}
            />
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