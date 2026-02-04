import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  InputAdornment,
  Tooltip,
  IconButton,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  Add,
  Edit,
  Close,
  Save,
  Search,
  Refresh,
  FilterList,
  SwapHoriz,
  UnfoldMore,
} from "@mui/icons-material";
import Topbar from "$components/topbar/Topbar";
import BreadcrumbsComponent from "$components/common/BreadcrumbsComponent";
import { useNavigate } from "react-router-dom";
import * as LlmModelService from "$api/services/courses/llmModels";
import { toast } from "react-toastify";

const STATUS_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Ativos" },
  { value: "inactive", label: "Inativos" },
];

const AdminLlmModels = () => {
  const navigate = useNavigate();
  const [models, setModels] = useState([]);
  const [filteredModels, setFilteredModels] = useState([]);
  const [loading, setLoading] = useState(true);

  // filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // ordenação
  const [sortField, setSortField] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");

  // formulário
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedModel, setSelectedModel] = useState(null);

  const [modelId, setModelId] = useState("");
  const [modelName, setModelName] = useState("");
  const [maxContext, setMaxContext] = useState("");
  const [isActive, setIsActive] = useState(true);
  

  // confirmação
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [modelToChangeStatus, setModelToChangeStatus] = useState(null);

  useEffect(() => {
    loadModels();
  }, []);

  useEffect(() => {
    filterModels();
  }, [models, searchTerm, statusFilter, sortField, sortOrder]);

  const loadModels = async () => {
    try {
      setLoading(true);
      const data = await LlmModelService.fetchAllLlmModels();
      const list = Object.keys(data || {}).map((key) => ({
        id: key,
        ...data[key],
      }));
      setModels(list);
    } catch (e) {
      console.error("Erro ao carregar modelos:", e);
      toast.error("Erro ao carregar modelos. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const filterModels = () => {
    let filtered = [...models];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.name?.toLowerCase().includes(term) ||
          m.modelId?.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((m) =>
        statusFilter === "active" ? m.isActive : !m.isActive
      );
    }

    const getSortValue = (m) => {
      switch (sortField) {
        case "modelId":
          return m.modelId?.toLowerCase() || "";
        case "name":
          return m.name?.toLowerCase() || "";
        case "maxContext":
          return Number(m.maxContext || 0);
        case "status":
          return m.isActive ? 1 : 0;
        case "updatedAt":
          return new Date(m.updatedAt || m.createdAt || 0).getTime();
        default:
          return "";
      }
    };

    filtered.sort((a, b) => {
      const aVal = getSortValue(a);
      const bVal = getSortValue(b);
      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    setFilteredModels(filtered);
  };

  const handleSortClick = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const SortableHeader = ({ label, field, align = "left" }) => (
    <TableCell
      align={align}
      onClick={() => handleSortClick(field)}
      sx={{
        fontWeight: "bold",
        cursor: "pointer",
        userSelect: "none",
        "&:hover": { backgroundColor: "rgba(144, 65, 193, 0.05)" },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={0.5}>
        <span>{label}</span>
        {sortField === field && (
          <UnfoldMore
            sx={{
              fontSize: 16,
              transform: sortOrder === "asc" ? "rotate(0deg)" : "rotate(180deg)",
              transition: "transform 0.2s",
            }}
          />
        )}
      </Stack>
    </TableCell>
  );

  const handleBack = () => {
    navigate(-1);
  };

  const stats = {
    total: models.length,
    active: models.filter((m) => m.isActive).length,
    inactive: models.filter((m) => !m.isActive).length,
  };

  const handleOpenDialog = (model = null) => {
    if (model) {
      setEditMode(true);
      setSelectedModel(model);
      setModelId(model.modelId || "");
      setModelName(model.name || "");
      setMaxContext(model.maxContext || "");
      setIsActive(model.isActive ?? true);
    } else {
      setEditMode(false);
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedModel(null);
    setModelId("");
    setModelName("");
    setMaxContext("");
    setIsActive(true);
  };

  const handleSaveModel = async () => {

    let operation = "";

    if (!modelId.trim() || !modelName.trim() || !maxContext) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const modelData = {
      modelId: modelId.trim(),
      name: modelName.trim(),
      maxContext: parseInt(maxContext, 10),
      isActive,
      updatedAt: new Date().toISOString(),
    };

    try {
      if (editMode && selectedModel) {
        await LlmModelService.updateLlmModel(selectedModel.id, modelData);
        operation = "atualizado";
      } else {
        await LlmModelService.createLlmModel({
          ...modelData,
          createdAt: new Date().toISOString(),
        });
        operation = "criado";
      }

      await loadModels();
      toast.success(`Modelo ${operation} com sucesso!`);
      handleCloseDialog();
    } catch (e) {
      toast.error(`Falha ao ${operation == "atualizado" ? "atualizar" : "criar"} modelo: ${e.message}`);
      console.error("Erro ao salvar modelo:", e);
    }
  };

  const handleChangeStatus = async (model) => {
    try {
      await LlmModelService.changeStatusLlmModel(model.id, model.isActive);
      await loadModels();
      toast.success("Status do modelo atualizado com sucesso!");
    } catch (e) {
      toast.error(`Falha ao atualizar status do Modelo: ${e.message}`);
      console.error("Erro ao atualizar status do modelo:", e);
    }
  };

  const getStatusChip = (active) => (
    <Chip
      label={active ? "Ativo" : "Inativo"}
      color={active ? "success" : "default"}
      size="small"
      sx={{ fontWeight: "bold" }}
    />
  );

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    try {
      return new Date(timestamp).toLocaleString("pt-BR");
    } catch {
      return "Data inválida";
    }
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
          backgroundColor: "#f9f9f9",
          pt: { xs: 10, sm: 3 },
          pb: 4,
          px: { xs: 2, sm: 4 },
        }}
      >
        <BreadcrumbsComponent
          items={[{ label: "Admin", path: "/admin-panel" }, { label: "Modelos de LLM" }]}
          onBack={handleBack}
        />

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 3,
          }}
        >
          <Typography
            variant="h4"
            sx={{ fontWeight: "bold", color: "#333" }}
          >
            Gerenciamento de Modelos de LLM
          </Typography>

          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
            sx={{
              backgroundColor: "#9041c1",
              "&:hover": { backgroundColor: "#7d37a7" },
              textTransform: "none",
              fontWeight: "bold",
            }}
          >
            Novo Modelo
          </Button>
        </Box>

        {/* Cards de Estatísticas */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Total de Modelos
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: "bold", mt: 1 }}>
                  {stats.total}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Ativos
                </Typography>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: "bold", mt: 1, color: "#4caf50" }}
                >
                  {stats.active}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Inativos
                </Typography>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: "bold", mt: 1, color: "#9e9e9e" }}
                >
                  {stats.inactive}
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
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems="center"
          >
            <FilterList sx={{ color: "#9041c1" }} />

            <TextField
              fullWidth
              size="small"
              placeholder="Buscar por ID ou nome"
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
                {STATUS_FILTERS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Tooltip title="Atualizar">
              <IconButton
                onClick={loadModels}
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

        {/* Tabela */}
        {filteredModels.length === 0 ? (
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
              {searchTerm || statusFilter !== "all"
                ? "Nenhum modelo encontrado com os filtros aplicados."
                : "Nenhum modelo registrado ainda."}
            </Typography>
          </Paper>
        ) : (
          <TableContainer
            component={Paper}
            elevation={0}
            sx={{
              borderRadius: "12px",
              boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
            }}
          >
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                  <SortableHeader label="ID" field="modelId" />
                  <SortableHeader label="Nome" field="name" />
                  <SortableHeader label="Contexto Máx." field="maxContext" />
                  <SortableHeader label="Status" field="status" />
                  <SortableHeader label="Atualizado" field="updatedAt" />
                  <TableCell sx={{ fontWeight: "bold" }} align="center">
                    Ações
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredModels.map((model) => (
                  <TableRow
                    key={model.id}
                    hover
                    sx={{ "&:hover": { backgroundColor: "#f9f9f9" } }}
                  >
                    <TableCell>
                      <Chip
                        label={model.modelId || "N/A"}
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
                        {model.name || "Sem nome"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {model.maxContext?.toLocaleString() || "N/A"}
                      </Typography>
                    </TableCell>
                    <TableCell>{getStatusChip(model.isActive)}</TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(model.updatedAt || model.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Editar">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(model)}
                          sx={{ color: "#9041c1" }}
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Mudar Status">
                        <IconButton
                          size="small"
                          onClick={() => handleChangeStatus(model)}
                          sx={{ color: "#9041c1" }}
                        >
                          <SwapHoriz />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* Dialog Criar/Editar */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: "12px" } }}
      >
        <DialogTitle
          sx={{
            backgroundColor: "#9041c1",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="h6">
            {editMode ? "Editar Modelo" : "Novo Modelo"}
          </Typography>
          <IconButton onClick={handleCloseDialog} sx={{ color: "white" }}>
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ mt: 3, pt: 3 }}>
          <Stack spacing={2}>
            <TextField
              label="ID do Modelo"
              required
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              fullWidth
              variant="outlined"
              sx={{
                  "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: "#ddd" },
                  "&:hover fieldset": { borderColor: "#9041c1" },
                  "&.Mui-focused fieldset": { borderColor: "#9041c1" },
                },
                "& .MuiInputLabel-root.Mui-focused": {
                  color: "#9041c1",
                },
              }}
            />
            <TextField
              label="Nome do Modelo"
              required
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              fullWidth
              variant="outlined"
              sx={{
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: "#ddd" },
                  "&:hover fieldset": { borderColor: "#9041c1" },
                  "&.Mui-focused fieldset": { borderColor: "#9041c1" },
                },
                "& .MuiInputLabel-root.Mui-focused": {
                  color: "#9041c1",
                },
              }}
            />
            <TextField
              label="Contexto Máximo"
              required
              type="number"
              value={maxContext}
              onChange={(e) => setMaxContext(Number(e.target.value))}
              fullWidth
              variant="outlined"
              sx={{
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: "#ddd" },
                  "&:hover fieldset": { borderColor: "#9041c1" },
                  "&.Mui-focused fieldset": { borderColor: "#9041c1" },
                },
                "& .MuiInputLabel-root.Mui-focused": {
                  color: "#9041c1",
                },
              }}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseDialog} color="inherit">
            Cancelar
          </Button>
          <Button
            onClick={handleSaveModel}
            variant="contained"
            startIcon={<Save />}
            sx={{
              backgroundColor: "#9041c1",
              "&:hover": { backgroundColor: "#7d37a7" },
            }}
          >
            {editMode ? "Atualizar" : "Criar"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AdminLlmModels;