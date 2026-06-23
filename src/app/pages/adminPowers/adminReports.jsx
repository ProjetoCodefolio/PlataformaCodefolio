import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  Tooltip,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  InputAdornment,
  Stack,
  Divider,
} from "@mui/material";
import { useTheme, useMediaQuery } from '@mui/material';
import {
  Visibility,
  Image as ImageIcon,
  Close,
  FilterList,
  Search,
  Refresh,
} from "@mui/icons-material";
import Topbar from "$components/topbar/Topbar";
import BreadcrumbsComponent from "$components/common/BreadcrumbsComponent";
import { fetchAllReports, updateReportStatus } from "$api/services/courses/report";
import { toast } from "react-toastify";
import { useAuth } from "$context/AuthContext";
import { useNavigate } from "react-router-dom";
import SortableHeader from "$components/common/SortableHeader";
import { sortRows, getNextSort } from "$utils/tableSort";

const STATUS_OPTIONS = [
  { value: "pendente", label: "Pendente", color: "warning" },
  { value: "trabalhando", label: "Trabalhando", color: "info" },
  { value: "resolvido", label: "Resolvido", color: "success" },
  { value: "rejeitado", label: "Rejeitado", color: "error" },
];

const TYPE_LABELS = {
  video: "Vídeo",
  quiz: "Quiz",
  slide: "Slide",
  geral: "Geral",
};

export default function AdminReports() {
  const { userDetails } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortField, setSortField] = useState("reportNumber");
  const [sortOrder, setSortOrder] = useState("desc");

  const handleSort = (field) => {
    const next = getNextSort({ sortField, sortOrder }, field);
    setSortField(next.sortField);
    setSortOrder(next.sortOrder);
  };

  // Acessores para colunas cujo valor de ordenação difere do campo bruto
  const reportSortAccessors = {
    createdAt: (r) => (r.createdAt ? new Date(r.createdAt).getTime() : null),
  };

  // Verifica se é admin
  useEffect(() => {
    if (userDetails && userDetails.role !== "admin") {
      toast.error("Acesso negado. Apenas administradores podem acessar esta página.");
      navigate("/dashboard");
    }
  }, [userDetails, navigate]);

  // Carrega reportes
  useEffect(() => {
    loadReports();
  }, []);

  // Filtra reportes
  useEffect(() => {
    filterReports();
  }, [reports, searchTerm, statusFilter, typeFilter]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await fetchAllReports();
      setReports(data);
    } catch (error) {
      console.error("Erro ao carregar reportes:", error);
      toast.error("Erro ao carregar reportes");
    } finally {
      setLoading(false);
    }
  };

  const filterReports = () => {
    let filtered = [...reports];

    // Filtro de busca
    if (searchTerm) {
      filtered = filtered.filter(
        (report) =>
          report.reportName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          report.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          report.reportNumber?.toString().includes(searchTerm)
      );
    }

    // Filtro de status
    if (statusFilter !== "all") {
      filtered = filtered.filter((report) => report.status === statusFilter);
    }

    // Filtro de tipo
    if (typeFilter !== "all") {
      filtered = filtered.filter((report) => report.type === typeFilter);
    }

    setFilteredReports(filtered);
  };

  const handleViewDetails = (report) => {
    setSelectedReport(report);
    setDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedReport(null);
  };

  const handleStatusChange = async (reportId, newStatus) => {
    try {
      await updateReportStatus(reportId, newStatus);
      toast.success("Status atualizado com sucesso!");
      loadReports();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  const getStatusChip = (status) => {
    const statusOption = STATUS_OPTIONS.find((opt) => opt.value === status);
    return (
      <Chip
        label={statusOption?.label || status}
        color={statusOption?.color || "default"}
        size="small"
        sx={{ fontWeight: "bold" }}
      />
    );
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "Data não disponível";
    try {
      return new Date(timestamp).toLocaleString("pt-BR");
    } catch {
      return "Data inválida";
    }
  };

  // Estatísticas
  const stats = {
    total: reports.length,
    pendente: reports.filter((r) => r.status === "pendente").length,
    trabalhando: reports.filter((r) => r.status === "trabalhando").length,
    resolvido: reports.filter((r) => r.status === "resolvido").length,
  };

  if (loading) {
    return (
      <>
        <Topbar hideSearch={true} />
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "calc(100vh - 64px)",
            pt: 8,
          }}
        >
          <CircularProgress sx={{ color: "#9041c1" }} />
        </Box>
      </>
    );
  }

  return (
    <>
      <Topbar hideSearch={true} />
      <Box
        sx={{
          minHeight: "calc(100vh - 64px)",
          backgroundColor: "#F5F5FA",
          pt: { xs: 10, sm: 12 },
          pb: 4,
          px: { xs: 2, sm: 4 },
        }}
      >

        {/* Título */}
        <Typography
          variant="h4"
          sx={{ 
            fontWeight: "bold", 
            mb: 3, 
            color: "#333",
            fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' }
          }}
        >
          Gerenciamento de Reportes
        </Typography>

        {/* Cards de Estatísticas */}
        <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={6} md={3}>
            <Card sx={{ borderRadius: 2, height: '100%' }}>
              <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                <Typography 
                  variant="subtitle2" 
                  color="text.secondary"
                  sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}
                >
                  Total de Reportes
                </Typography>
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: "bold", 
                    mt: 1,
                    fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' }
                  }}
                >
                  {stats.total}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={6} md={3}>
            <Card sx={{ borderRadius: 2, height: '100%' }}>
              <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                <Typography 
                  variant="subtitle2" 
                  color="text.secondary"
                  sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}
                >
                  Pendentes
                </Typography>
                <Typography
                  variant="h4"
                  sx={{ 
                    fontWeight: "bold", 
                    mt: 1, 
                    color: "#ff9800",
                    fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' }
                  }}
                >
                  {stats.pendente}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={6} md={3}>
            <Card sx={{ borderRadius: 2, height: '100%' }}>
              <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                <Typography 
                  variant="subtitle2" 
                  color="text.secondary"
                  sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}
                >
                  Em Andamento
                </Typography>
                <Typography
                  variant="h4"
                  sx={{ 
                    fontWeight: "bold", 
                    mt: 1, 
                    color: "#2196f3",
                    fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' }
                  }}
                >
                  {stats.trabalhando}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={6} md={3}>
            <Card sx={{ borderRadius: 2, height: '100%' }}>
              <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                <Typography 
                  variant="subtitle2" 
                  color="text.secondary"
                  sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}
                >
                  Resolvidos
                </Typography>
                <Typography
                  variant="h4"
                  sx={{ 
                    fontWeight: "bold", 
                    mt: 1, 
                    color: "#4caf50",
                    fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' }
                  }}
                >
                  {stats.resolvido}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filtros */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            borderRadius: "12px",
            boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
          }}
        >
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
            <FilterList sx={{ color: "#9041c1" }} />
            
            <TextField
              fullWidth
              size="small"
              placeholder="Buscar por nome, usuário ou número..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  "& fieldset": { borderColor: "#9041c1" },
                  "&:hover fieldset": { borderColor: "#7d37a7" },
                  "&.Mui-focused fieldset": { borderColor: "#9041c1" },
                },
              }}
            />

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">Todos</MenuItem>
                {STATUS_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Tipo</InputLabel>
              <Select
                value={typeFilter}
                label="Tipo"
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <MenuItem value="all">Todos</MenuItem>
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Tooltip title="Atualizar">
              <IconButton
                onClick={loadReports}
                sx={{
                  color: "#9041c1",
                  "&:hover": { backgroundColor: "rgba(144, 65, 193, 0.08)" },
                }}
              >
                <Refresh />
              </IconButton>
            </Tooltip>
          </Stack>
        </Paper>

        {/* Tabela de Reportes - Desktop */}
        {filteredReports.length === 0 ? (
          <Paper
            elevation={0}
            sx={{
              p: 4,
              textAlign: "center",
              borderRadius: "12px",
              boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
            }}
          >
            <Typography variant="body1" color="text.secondary">
              {searchTerm || statusFilter !== "all" || typeFilter !== "all"
                ? "Nenhum reporte encontrado com os filtros aplicados."
                : "Nenhum reporte registrado ainda."}
            </Typography>
          </Paper>
        ) : (
          <>
            <TableContainer
              component={Paper}
              elevation={0}
              sx={{
                display: { xs: 'none', md: 'block' },
                borderRadius: "12px",
                boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
              }}
            >
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                  <SortableHeader label="#" field="reportNumber" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
                  <SortableHeader label="Nome" field="reportName" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
                  <SortableHeader label="Tipo" field="type" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
                  <SortableHeader label="Usuário" field="userName" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
                  <SortableHeader label="Status" field="status" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
                  <SortableHeader label="Data" field="createdAt" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
                  <TableCell sx={{ fontWeight: "bold" }} align="center">
                    Ações
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortRows(filteredReports, sortField, sortOrder, reportSortAccessors).map((report) => (
                  <TableRow
                    key={report.id}
                    hover
                    sx={{ "&:hover": { backgroundColor: "#f9f9f9" } }}
                  >
                    <TableCell>
                      <Chip
                        label={`#${report.reportNumber || "N/A"}`}
                        size="small"
                        sx={{
                          bgcolor: "#9041c1",
                          color: "white",
                          fontWeight: "bold",
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {report.reportName || "Sem nome"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={TYPE_LABELS[report.type] || report.type}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Avatar
                          src={report.userPhotoURL}
                          alt={report.userName}
                          sx={{ width: 30, height: 30 }}
                        >
                          {report.userName?.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2">
                            {report.userName || "Anônimo"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {report.userEmail || "Email não disponível"}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{getStatusChip(report.status)}</TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(report.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Ver detalhes">
                        <IconButton
                          size="small"
                          onClick={() => handleViewDetails(report)}
                          sx={{ color: "#9041c1" }}
                        >
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Cards Mobile */}
          <Box sx={{ display: { xs: 'block', md: 'none' } }}>
            <Stack spacing={2}>
              {sortRows(filteredReports, sortField, sortOrder, reportSortAccessors).map((report) => (
                <Card
                  key={report.id}
                  sx={{
                    borderRadius: 2,
                    boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
                  }}
                >
                  <CardContent sx={{ p: 2 }}>
                    {/* Cabeçalho */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Chip
                        label={`#${report.reportNumber || "N/A"}`}
                        size="small"
                        sx={{
                          bgcolor: "#9041c1",
                          color: "white",
                          fontWeight: "bold",
                        }}
                      />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography 
                          variant="body1" 
                          sx={{ 
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {report.reportName || "Sem nome"}
                        </Typography>
                        <Chip
                          label={TYPE_LABELS[report.type] || report.type}
                          size="small"
                          variant="outlined"
                          sx={{ mt: 0.5 }}
                        />
                      </Box>
                      {getStatusChip(report.status)}
                    </Box>

                    <Divider sx={{ my: 1.5 }} />

                    {/* Usuário */}
                    <Box sx={{ mb: 1.5 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Usuário
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Avatar
                          src={report.userPhotoURL}
                          alt={report.userName}
                          sx={{ width: 30, height: 30 }}
                        >
                          {report.userName?.charAt(0)}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography 
                            variant="body2"
                            sx={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {report.userName || "Anônimo"}
                          </Typography>
                          <Typography 
                            variant="caption" 
                            color="text.secondary"
                            sx={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              display: 'block'
                            }}
                          >
                            {report.userEmail || "Email não disponível"}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    {/* Data */}
                    <Box sx={{ mb: 1.5 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Data
                      </Typography>
                      <Typography variant="body2">
                        {formatDate(report.createdAt)}
                      </Typography>
                    </Box>

                    {/* Botão de Ações */}
                    <Button
                      variant="outlined"
                      fullWidth
                      size="small"
                      startIcon={<Visibility />}
                      onClick={() => handleViewDetails(report)}
                      sx={{
                        mt: 1,
                        borderColor: "#9041c1",
                        color: "#9041c1",
                        "&:hover": {
                          borderColor: "#7d37a7",
                          backgroundColor: "rgba(144, 65, 193, 0.04)",
                        },
                      }}
                    >
                      Ver Detalhes
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Box>
          </>
        )}
      </Box>

      {/* Dialog de Detalhes */}
      <Dialog
        open={detailsOpen}
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            borderRadius: "12px",
            maxHeight: "90vh",
          },
        }}
      >
        {selectedReport && (
          <>
            <DialogTitle
              sx={{
                backgroundColor: "#9041c1",
                color: "white",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Box>
                <Typography variant="h6">
                  Reporte #{selectedReport.reportNumber}
                </Typography>
                <Typography variant="caption">
                  {selectedReport.reportName}
                </Typography>
              </Box>
              <IconButton onClick={handleCloseDetails} sx={{ color: "white" }}>
                <Close />
              </IconButton>
            </DialogTitle>

            <DialogContent sx={{ mt: 2 }}>
              {/* Status */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: "bold" }}>
                  Status
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    value={selectedReport.status || "pendente"}
                    onChange={(e) =>
                      handleStatusChange(selectedReport.id, e.target.value)
                    }
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Informações do Reporte */}
              <Paper sx={{ p: 2, mb: 2, bgcolor: "#f9f9f9" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
                  📋 Informações do Reporte
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Tipo:
                    </Typography>
                    <Typography variant="body2">
                      {TYPE_LABELS[selectedReport.type] || selectedReport.type}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Data:
                    </Typography>
                    <Typography variant="body2">
                      {formatDate(selectedReport.createdAt)}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* Usuário */}
              <Paper sx={{ p: 2, mb: 2, bgcolor: "#f9f9f9" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
                  👤 Usuário
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Avatar
                    src={selectedReport.userPhotoURL}
                    alt={selectedReport.userName}
                    sx={{ width: 50, height: 50 }}
                  >
                    {selectedReport.userName?.charAt(0)}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {selectedReport.userName || "Anônimo"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {selectedReport.userEmail || "Email não disponível"}
                    </Typography>
                  </Box>
                </Box>
              </Paper>

              {/* Curso */}
              {selectedReport.courseTitle && (
                <Paper sx={{ p: 2, mb: 2, bgcolor: "#f9f9f9" }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
                    📚 Curso
                  </Typography>
                  <Typography variant="body2">
                    {selectedReport.courseTitle}
                  </Typography>
                </Paper>
              )}

              {/* Conteúdo */}
              {selectedReport.contentTitle && (
                <Paper sx={{ p: 2, mb: 2, bgcolor: "#f9f9f9" }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
                    🎯 Conteúdo
                  </Typography>
                  <Typography variant="body2">
                    {selectedReport.contentTitle}
                  </Typography>
                </Paper>
              )}

              {/* Descrição */} 
              <Paper sx={{ p: 2, mb: 2, bgcolor: "#f9f9f9" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
                  💬 Descrição do Problema
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ whiteSpace: "pre-wrap", wordWrap: "break-word" }}
                >
                  {selectedReport.message || "Sem descrição"}
                </Typography>
              </Paper>

              {/* Imagem */}
              {selectedReport.hasImage && (
                <Paper sx={{ p: 2, mb: 2, bgcolor: "#f9f9f9" }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
                    📸 Imagem Anexada
                  </Typography>
                  <Alert severity="info" sx={{ mb: 1 }}>
                    Uma imagem foi anexada a este reporte.
                  </Alert>
                  <Button
                    variant="outlined"
                    startIcon={<ImageIcon />}
                    onClick={() =>
                      window.open(`/reporte-imagem/${selectedReport.id}`, "_blank")
                    }
                    fullWidth
                    sx={{
                      borderColor: "#9041c1",
                      color: "#9041c1",
                      "&:hover": {
                        borderColor: "#7d37a7",
                        backgroundColor: "rgba(144, 65, 193, 0.04)",
                      },
                    }}
                  >
                    Ver e Copiar Link da Imagem
                  </Button>
                </Paper>
              )}

              {/* Informações Técnicas */}
              <Paper sx={{ p: 2, bgcolor: "#f9f9f9" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
                  🔧 Informações Técnicas
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Resolução:
                    </Typography>
                    <Typography variant="body2">
                      {selectedReport.screenResolution || "N/A"}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Navegador:
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: "0.75rem",
                        wordBreak: "break-word",
                      }}
                    >
                      {selectedReport.userAgent || "N/A"}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
              <Button onClick={handleCloseDetails} variant="outlined">
                Fechar
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
}
