import React, { useState, useEffect } from "react";
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Paper, 
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Chip,
  Avatar,
  Tooltip,
  InputAdornment
} from "@mui/material";
import { 
  Search, 
  Delete, 
  Edit, 
  Visibility, 
  Check, 
  Close,
  School,
  FilterList,
  Sort
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import Topbar from "../../components/topbar/Topbar";
import MyConfirm from "$components/post/components/confirm/Confirm";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "$context/AuthContext";
import { fetchCourses, deleteCourse } from "$api/services/courses/courses";
import { fetchUserById } from "$api/services/users";
import { fetchCourseStudents } from "$api/services/courses/students";

const AdminCourses = () => {
  const navigate = useNavigate();
  const { userDetails } = useAuth();
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("title");
  const [sortOrder, setSortOrder] = useState("asc");
  const [courseToDelete, setCourseToDelete] = useState(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Load all courses when component mounts
  useEffect(() => {
    const loadCourses = async () => {
      try {
        setLoading(true);
        const allCourses = await fetchCourses();
        
        // Add extra derived data for display and filtering
        const processedCoursesPromises = allCourses.map(async course => {
          // Fetch owner details for each course
          let ownerName = "Autor desconhecido";
          let ownerPhotoURL = "";
          
          if (course.userId) {
            try {
              const ownerData = await fetchUserById(course.userId);
              if (ownerData) {
                ownerName = ownerData.displayName;
                ownerPhotoURL = ownerData.photoURL;
              }
            } catch (error) {
              console.error(`Error fetching owner details for course ${course.courseId}:`, error);
            }
          }
          
          // Fetch actual student count for this course
          let studentCount = 0;
          try {
            if (course.courseId) {
              const enrolledStudents = await fetchCourseStudents(course.courseId);
              studentCount = enrolledStudents ? enrolledStudents.length : 0;
            }
          } catch (error) {
            console.error(`Error fetching students for course ${course.courseId}:`, error);
          }
          
          return {
            ...course,
            ownerName,
            ownerPhotoURL,
            studentCount,
            status: getStatus(course),
            progress: course.progress || 0,
            createdAt: course.createdAt || new Date().toISOString()
          };
        });
        
        const processedCourses = await Promise.all(processedCoursesPromises);
        setCourses(processedCourses);
        setFilteredCourses(processedCourses);
      } catch (err) {
        console.error("Error fetching courses:", err);
        setError("Não foi possível carregar os cursos. Por favor, tente novamente.");
      } finally {
        setLoading(false);
      }
    };

    loadCourses();
  }, []);

  // Get status label based on course data
  const getStatus = (course) => {
    if (course.published === false) return "draft";
    if (course.archived === true) return "archived";
    return "published";
  };

  // Filter and sort courses when search term, sort, or filter changes
  useEffect(() => {
    if (!courses.length) return;

    let result = [...courses];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        course => 
          (course.title && course.title.toLowerCase().includes(term)) || 
          (course.description && course.description.toLowerCase().includes(term)) ||
          (course.ownerName && course.ownerName.toLowerCase().includes(term))
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(course => course.status === statusFilter);
    }

    // Apply sorting
    result.sort((a, b) => {
      let valueA = a[sortField] || '';
      let valueB = b[sortField] || '';
      
      // Handle dates
      if (sortField === 'createdAt') {
        valueA = new Date(valueA).getTime();
        valueB = new Date(valueB).getTime();
      }
      
      // Compare values
      if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredCourses(result);
  }, [courses, searchTerm, sortField, sortOrder, statusFilter]);

  // Handle page change
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Handle sorting
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Handle delete confirmation
  const handleDeleteClick = (course) => {
    setCourseToDelete(course);
    setShowDeleteConfirmation(true);
  };

  // Handle delete cancellation
  const handleDeleteCancel = () => {
    setShowDeleteConfirmation(false);
    setCourseToDelete(null);
  };

  // Handle actual course deletion
  const handleDeleteConfirm = async () => {
    if (!courseToDelete) return;

    try {
      const result = await deleteCourse(courseToDelete.courseId);
      
      if (result.success) {
        // Update local state
        setCourses(prevCourses => 
          prevCourses.filter(course => course.courseId !== courseToDelete.courseId)
        );
        toast.success("Curso excluído com sucesso!");
      } else {
        toast.error(result.message || "Não foi possível excluir o curso.");
      }
    } catch (err) {
      console.error("Error deleting course:", err);
      toast.error("Erro ao excluir o curso. Por favor, tente novamente.");
    } finally {
      setShowDeleteConfirmation(false);
      setCourseToDelete(null);
    }
  };

  // Handle view course details
  const handleViewCourse = (courseId) => {
    navigate(`/classes?courseId=${courseId}`);
  };

  // Handle edit course
  const handleEditCourse = (courseId) => {
    navigate(`/adm-cursos?courseId=${courseId}`);
  };

  // Get status chip color
  const getStatusColor = (status) => {
    switch (status) {
      case 'published': return 'success';
      case 'draft': return 'warning';
      case 'archived': return 'error';
      default: return 'default';
    }
  };

  // Get status display name
  const getStatusName = (status) => {
    switch (status) {
      case 'published': return 'Publicado';
      case 'draft': return 'Rascunho';
      case 'archived': return 'Arquivado';
      default: return 'Desconhecido';
    }
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setSortField('title');
    setSortOrder('asc');
  };

  return (
    <Box
      sx={{
        minHeight: "97vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#F5F5FA",
        padding: 0,
        margin: 0,
      }}
    >
      <Topbar hideSearch={true} />
      <ToastContainer position="top-right" autoClose={3000} />
      
      <Box
        sx={{
          maxWidth: 1200,
          width: "100%",
          margin: "0 auto",
          padding: { xs: 2, sm: 3 },
          marginTop: 8,
        }}
      >
        <Typography variant="h4" gutterBottom sx={{ fontWeight: "bold", color: "#333", mb: 3 }}>
          Administração de Cursos
        </Typography>
        
        {/* Search and filters */}
        <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
          <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2, mb: 3 }}>
            <TextField
              fullWidth
              placeholder="Buscar por título, descrição ou autor"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              variant="outlined"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
            
            {/* <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Status"
              >
                <MenuItem value="all">Todos os status</MenuItem>
                <MenuItem value="published">Publicados</MenuItem>
                <MenuItem value="draft">Rascunhos</MenuItem>
                <MenuItem value="archived">Arquivados</MenuItem>
              </Select>
            </FormControl> */}
            
            {(searchTerm || statusFilter !== 'all') && (
              <Button
                variant="outlined"
                onClick={handleResetFilters}
                startIcon={<FilterList />}
                sx={{
                  borderColor: "#9041c1",
                  color: "#9041c1",
                  "&:hover": {
                    borderColor: "#7d37a7",
                    backgroundColor: "rgba(144, 65, 193, 0.04)",
                  },
                }}
              >
                Limpar filtros
              </Button>
            )}
          </Box>
          
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="body2" color="text.secondary">
              {filteredCourses.length} curso(s) encontrado(s)
            </Typography>
            
            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
              <Typography variant="body2" color="text.secondary">
                Ordenar por:
              </Typography>
              <FormControl sx={{ minWidth: 150 }} size="small">
                <Select
                  value={sortField}
                  onChange={(e) => {
                    setSortField(e.target.value);
                    // Reset to ascending order when changing sort field
                    setSortOrder('asc');
                  }}
                  displayEmpty
                  variant="outlined"
                  size="small"
                >
                  <MenuItem value="title">Título</MenuItem>
                  <MenuItem value="createdAt">Data de criação</MenuItem>
                  <MenuItem value="ownerName">Autor</MenuItem>
                  <MenuItem value="studentCount">Número de alunos</MenuItem>
                </Select>
              </FormControl>
              
              <IconButton 
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                sx={{ color: "#9041c1" }}
                title={sortOrder === 'asc' ? 'Ordem crescente' : 'Ordem decrescente'}
              >
                <Sort sx={{ transform: sortOrder === 'desc' ? 'rotate(180deg)' : 'none' }} />
              </IconButton>
            </Box>
          </Box>
        </Paper>
        
        {/* Course listing */}
        <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <CircularProgress sx={{ color: "#9041c1" }} />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>
          ) : filteredCourses.length === 0 ? (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <School sx={{ fontSize: 48, color: "#9041c1", mb: 2, opacity: 0.7 }} />
              <Typography variant="h6" color="text.secondary">
                Nenhum curso encontrado
              </Typography>
              {(searchTerm || statusFilter !== 'all') && (
                <Button
                  variant="text"
                  onClick={handleResetFilters}
                  sx={{ mt: 2, color: "#9041c1" }}
                >
                  Limpar filtros
                </Button>
              )}
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
                    <TableRow>
                      <TableCell 
                        onClick={() => handleSort('title')}
                        sx={{ cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          Título
                          {sortField === 'title' && (
                            <Sort sx={{ 
                              ml: 0.5, 
                              fontSize: 18,
                              transform: sortOrder === 'desc' ? 'rotate(180deg)' : 'none'
                            }} />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell 
                        onClick={() => handleSort('ownerName')}
                        sx={{ cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          Autor
                          {sortField === 'ownerName' && (
                            <Sort sx={{ 
                              ml: 0.5, 
                              fontSize: 18,
                              transform: sortOrder === 'desc' ? 'rotate(180deg)' : 'none'
                            }} />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell 
                        onClick={() => handleSort('studentCount')}
                        sx={{ cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          Alunos
                          {sortField === 'studentCount' && (
                            <Sort sx={{ 
                              ml: 0.5, 
                              fontSize: 18,
                              transform: sortOrder === 'desc' ? 'rotate(180deg)' : 'none'
                            }} />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell 
                        onClick={() => handleSort('createdAt')}
                        sx={{ cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          Data de criação
                          {sortField === 'createdAt' && (
                            <Sort sx={{ 
                              ml: 0.5, 
                              fontSize: 18,
                              transform: sortOrder === 'desc' ? 'rotate(180deg)' : 'none'
                            }} />
                          )}
                        </Box>
                      </TableCell>
                      {/* <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell> */}
                      <TableCell sx={{ fontWeight: 'bold' }}>Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(rowsPerPage > 0
                      ? filteredCourses.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      : filteredCourses
                    ).map((course) => (
                      <TableRow key={course.courseId} hover>
                        <TableCell>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {course.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 300 }}>
                            {course.description?.substring(0, 100)}{course.description?.length > 100 ? '...' : ''}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar 
                              src={course.ownerPhotoURL} 
                              alt={course.ownerName}
                              sx={{ width: 30, height: 30, mr: 1 }}
                            >
                              {course.ownerName?.charAt(0)}
                            </Avatar>
                            <Typography variant="body2">
                              {course.ownerName || "Autor desconhecido"}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {course.studentCount || 0}
                        </TableCell>
                        <TableCell>
                          {course.createdAt ? new Date(course.createdAt).toLocaleDateString('pt-BR') : '-'}
                        </TableCell>
                        {/* <TableCell>
                          <Chip 
                            label={getStatusName(course.status)}
                            size="small"
                            color={getStatusColor(course.status)}
                          />
                        </TableCell> */}
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="Visualizar curso">
                              <IconButton 
                                size="small" 
                                color="primary"
                                onClick={() => handleViewCourse(course.courseId)}
                              >
                                <Visibility fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Editar curso">
                              <IconButton 
                                size="small" 
                                color="secondary"
                                onClick={() => handleEditCourse(course.courseId)}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Excluir curso">
                              <IconButton 
                                size="small" 
                                color="error"
                                onClick={() => handleDeleteClick(course)}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              <TablePagination
                rowsPerPageOptions={[5, 10, 25, { label: 'Todos', value: -1 }]}
                component="div"
                count={filteredCourses.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="Cursos por página:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
              />
            </>
          )}
        </Paper>
      </Box>

      {/* Delete confirmation dialog */}
      <MyConfirm
        open={showDeleteConfirmation}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Confirmar exclusão"
        message={`Tem certeza que deseja excluir o curso "${courseToDelete?.title}"? Esta ação não pode ser desfeita.`}
      />
    </Box>
  );
};

export default AdminCourses;