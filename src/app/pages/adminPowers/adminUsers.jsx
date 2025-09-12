import React, { useState, useEffect } from "react";
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Paper, 
  List, 
  ListItem, 
  ListItemAvatar, 
  ListItemText,
  Avatar, 
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Autocomplete,
  IconButton,
} from "@mui/material";
import { Search, Person, Close } from "@mui/icons-material";
import Topbar from "../../components/topbar/Topbar";
import MyConfirm from "$components/post/components/confirm/Confirm";
import { updateUserRole, filterUsersBySearchTerm, sortUsers } from "$api/services/admin";
import { fetchAllUsers } from "$api/services/users";

// Função para formatar nomes com capitalização adequada
const capitalizeWords = (name) => {
    if (!name) return '';
    return name
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

const AdminPowers = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [autocompleteOptions, setAutocompleteOptions] = useState([]);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showRoleConfirmation, setShowRoleConfirmation] = useState(false);
  const [newRole, setNewRole] = useState("");
  const [sortOrder, setSortOrder] = useState("name-asc"); // Default sort by name ascending
  const [roleFilter, setRoleFilter] = useState("all");
  const [autocompleteKey, setAutocompleteKey] = useState(0);

  // Adicione esta função para filtrar por role
  const filterUsersByRole = (users, roleFilter) => {
    if (roleFilter === "all") return users;
    
    return users.filter(user => 
      (user.role || "user").toLowerCase() === roleFilter.toLowerCase()
    );
  };

  // Carrega todos os usuários usando o serviço da API
  useEffect(() => {
    const loadAllUsers = async () => {
      try {
        setInitialLoading(true);
        const usersList = await fetchAllUsers();
        setAllUsers(usersList);
        setAutocompleteOptions(usersList);
      } catch (error) {
        console.error("Erro ao carregar usuários:", error);
        setError("Não foi possível carregar a lista de usuários.");
      } finally {
        setInitialLoading(false);
      }
    };
    
    loadAllUsers();
  }, []);

  // Filtra usuários com base no termo de busca e role
  useEffect(() => {
    if (allUsers.length) {
      let filteredUsers = filterUsersBySearchTerm(allUsers, searchTerm);
      // Aplicar filtro por role
      if (roleFilter !== "all") {
        filteredUsers = filterUsersByRole(filteredUsers, roleFilter);
      }
      setAutocompleteOptions(filteredUsers);
    }
  }, [searchTerm, roleFilter, allUsers]);

    const handleSearch = () => {
    // Remover esta condição para permitir buscar sem filtros
    // if (!searchTerm.trim() && roleFilter === "all") return;
    
    let filtered = filterUsersBySearchTerm(allUsers, searchTerm);
    
    // Aplicar filtro por role
    if (roleFilter !== "all") {
      filtered = filterUsersByRole(filtered, roleFilter);
    }
    
    setUsers(filtered);
    setSelectedUser(null);
  };

  const handleAutocompleteChange = (event, newValue) => {
    if (newValue) {
      // Quando um usuário é selecionado no autocomplete
      // Verificar se o usuário corresponde ao filtro de role atual
      if (roleFilter !== "all") {
        const userRole = (newValue.role || "user").toLowerCase();
        if (userRole !== roleFilter.toLowerCase()) {
          // Se o usuário não corresponder ao filtro, não selecionar
          return;
        }
      }
      
      setSelectedUser(newValue);
      setUsers([newValue]);
      setSearchTerm(newValue.displayName || newValue.email);
    }
  };

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setSuccess(null);
    setError(null);
  };

  const handleRoleChange = (event) => {
    const selectedRole = event.target.value;
    setNewRole(selectedRole);
    setShowRoleConfirmation(true);
  };
  
  // Handler for closing the confirmation dialog
  const handleConfirmClose = () => {
    setShowRoleConfirmation(false);
  };
  
  // Handler for confirming the role change - agora usando o serviço da API
  const handleConfirmRoleChange = async () => {
    setUpdating(true);
    setSuccess(null);
    setError(null);
    
    try {
      // Chamar o serviço da API para atualizar a role
      const result = await updateUserRole(selectedUser.id, newRole);
      
      if (result.success) {
        // Update local state
        const updatedUser = { ...selectedUser, role: newRole };
        setSelectedUser(updatedUser);
        
        // Atualizar as listas de usuários
        const updateUserInList = (list) => 
          list.map(user => user.id === selectedUser.id ? { ...user, role: newRole } : user);
        
        setUsers(updateUserInList);
        setAllUsers(updateUserInList);
        setAutocompleteOptions(updateUserInList);
        
        setSuccess(`Categoria de ${selectedUser.displayName} alterada com sucesso para ${getRoleName(newRole)}`);
      } else {
        setError(result.message);
      }
    } catch (error) {
      console.error("Erro ao atualizar role:", error);
      setError("Erro ao atualizar role. Tente novamente.");
    } finally {
      setUpdating(false);
      setShowRoleConfirmation(false);
    }
  };

  const clearSelectedUser = () => {
    setSelectedUser(null);
    setSuccess(null);
    setError(null);
  };

  const handleSortChange = (event) => {
    const newSortOrder = event.target.value;
    setSortOrder(newSortOrder);
    
    // Usar o serviço da API para ordenar usuários
    const sortedUsers = sortUsers(autocompleteOptions, newSortOrder);
    setAutocompleteOptions(sortedUsers);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setRoleFilter("all");
    setUsers([]);
    setSelectedUser(null);
  };

    const handleClearResults = () => {
    // Limpar completamente todos os estados relacionados à busca
    setSearchTerm("");
    setUsers([]);
    setSelectedUser(null);
    
    // Forçar o Autocomplete a ser recriado com uma nova chave
    setAutocompleteKey(prevKey => prevKey + 1);
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
          Administração de Usuários
        </Typography>
        
        <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>
            Pesquisar Usuários
          </Typography>
          
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {/* Primeira linha: campo de busca e botão */}
            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
              <Box sx={{ flex: 1 }}>
                <Autocomplete
                  key={`user-search-${autocompleteKey}`}
                  fullWidth
                  options={autocompleteOptions}
                  getOptionLabel={(option) => option.displayName || option.email}
                  filterOptions={(x) => x}
                  inputValue={searchTerm}
                  onInputChange={(event, newInputValue) => {
                    setSearchTerm(newInputValue);
                  }}
                  onChange={handleAutocompleteChange}
                  loading={initialLoading}
                  getOptionKey={(option) => option.id}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Buscar por nome ou email"
                      variant="outlined"
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <>
                            <Search sx={{ color: "action.active", mr: 1 }} />
                            {params.InputProps.startAdornment}
                          </>
                        ),
                        endAdornment: (
                          <>
                            {initialLoading ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  renderOption={(props, option) => (
                    <li {...props}>
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        <Avatar 
                          src={option.photoURL}
                          alt={option.displayName}
                          sx={{ width: 40, height: 40, mr: 2 }}
                        >
                          {option.displayName?.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body1">{option.displayName}</Typography>
                          <Typography variant="body2" color="text.secondary">{option.email}</Typography>
                        </Box>
                      </Box>
                    </li>
                  )}
                />
              </Box>
              <Button
                variant="contained"
                onClick={handleSearch}
                disabled={loading}
                sx={{
                  backgroundColor: "#9041c1",
                  "&:hover": { backgroundColor: "#7d37a7" },
                  minWidth: 120,
                  height: 56, // Altura para alinhar com o Autocomplete
                }}
              >
                {loading ? <CircularProgress size={24} sx={{ color: "white" }} /> : "Buscar"}
              </Button>
            </Box>
            
            {/* Segunda linha: filtros e ordenação */}
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <FormControl variant="outlined" size="medium" sx={{ minWidth: 160 }}>
                <InputLabel>Ordenar por</InputLabel>
                <Select
                  value={sortOrder}
                  onChange={handleSortChange}
                  label="Ordenar por"
                >
                  <MenuItem value="name-asc">Nome (A-Z)</MenuItem>
                  <MenuItem value="name-desc">Nome (Z-A)</MenuItem>
                  <MenuItem value="email-asc">Email (A-Z)</MenuItem>
                  <MenuItem value="email-desc">Email (Z-A)</MenuItem>
                </Select>
              </FormControl>
              <FormControl variant="outlined" size="medium" sx={{ minWidth: 160 }}>
                <InputLabel>Filtrar por role</InputLabel>
                <Select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  label="Filtrar por role"
                  sx={{
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: roleFilter !== "all" ? "#9041c1" : "rgba(0, 0, 0, 0.23)"
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#9041c1" },
                  }}
                >
                  <MenuItem value="all">Todas as roles</MenuItem>
                  <MenuItem value="user">Usuário</MenuItem>
                  <MenuItem value="student">Estudante</MenuItem>
                  <MenuItem value="teacher">Professor</MenuItem>
                  <MenuItem value="admin">Administrador</MenuItem>
                </Select>
              </FormControl>
              {(roleFilter !== "all") && (
                <Button
                  variant="outlined"
                  onClick={handleClearFilters}
                  startIcon={<Close />}
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

              {users.length > 0 && (
                <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={handleClearResults}
                    startIcon={<Close />}
                    size="small"
                    sx={{
                      borderColor: "#ff0000",
                      color: "#ff0000",
                      "&:hover": {
                        borderColor: "#ff0000",
                        backgroundColor: "rgba(144, 65, 193, 0.04)",
                      },
                    }}
                  >
                    Limpar resultados
                  </Button>
                  </Box>
              )}
            </Box>
          </Box>
          
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </Paper>
        
        <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 3 }}>          
          {/* Lista de Usuários - mostrada quando há múltiplos resultados */}
          {users.length > 1 && (
            <Paper 
              sx={{ 
                p: 0, 
                borderRadius: 2, 
                flex: 1,
                maxHeight: 500,
                overflow: "auto"
              }}
            >
              <List sx={{ width: "100%" }}>
                {users.map((user, index) => (
                  <React.Fragment key={user.id}>
                    <ListItem 
                      button 
                      selected={selectedUser?.id === user.id}
                      onClick={() => handleUserSelect(user)}
                      sx={{
                        "&.Mui-selected": {
                          backgroundColor: "rgba(144, 65, 193, 0.1)",
                        },
                        "&.Mui-selected:hover": {
                          backgroundColor: "rgba(144, 65, 193, 0.2)",
                        },
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar src={user.photoURL} alt={user.displayName}>
                          {user.displayName?.charAt(0)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText 
                        primary={user.displayName || "Usuário sem nome"} 
                        secondary={user.email}
                      />
                    </ListItem>
                    {index < users.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          )}
          
          {/* Detalhes do Usuário */}
          {selectedUser && (
            <Paper sx={{ p: 3, borderRadius: 2, flex: 1 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="h6">
                  Detalhes do Usuário
                </Typography>
                <IconButton 
                  onClick={clearSelectedUser}
                  size="small"
                  aria-label="limpar seleção"
                  sx={{ 
                    color: "text.secondary",
                    '&:hover': { 
                      color: "#ff0000",
                      backgroundColor: "rgba(144, 65, 193, 0.1)" 
                    }
                  }}
                >
                  <Close />
                </IconButton>
              </Box>
              
              <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                <Avatar 
                  src={selectedUser.photoURL} 
                  alt={selectedUser.displayName}
                  sx={{ width: 64, height: 64, mr: 2 }}
                >
                  {selectedUser.displayName?.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="h6">{selectedUser.displayName}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    {selectedUser.email}
                  </Typography>
                </Box>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle1" gutterBottom>
                Gerenciar Permissões
              </Typography>
              
              <FormControl fullWidth sx={{ mt: 1 }}>
                <InputLabel id="role-select-label">Role</InputLabel>
                <Select
                  labelId="role-select-label"
                  id="role-select"
                  value={selectedUser.role || "user"}
                  label="Categoria"
                  onChange={handleRoleChange}
                  disabled={updating}
                  sx={{
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#666"
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#9041c1"
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#9041c1"
                    }
                  }}
                >
                  <MenuItem value="user">Usuário</MenuItem>
                  <MenuItem value="student">Estudante</MenuItem>
                  <MenuItem value="teacher">Professor</MenuItem>
                  <MenuItem value="admin">Administrador</MenuItem>
                </Select>
              </FormControl>
              
              {success && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  {success}
                </Alert>
              )}
              
              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
            </Paper>
          )}
        </Box>
      </Box>

      <MyConfirm
        open={showRoleConfirmation}
        onClose={handleConfirmClose}
        onConfirm={handleConfirmRoleChange}
        title="Confirmar alteração"
        message={`Tem certeza que deseja alterar o nível de acesso de ${selectedUser?.displayName ? capitalizeWords(selectedUser.displayName) : 'este usuário'} para ${getRoleName(newRole)}?`}
      />
    </Box>
  );
}

// Helper function to get the role name in Portuguese
const getRoleName = (role) => {
  switch (role) {
    case 'user': return 'Usuário';
    case 'student': return 'Estudante';
    case 'teacher': return 'Professor';
    case 'admin': return 'Administrador';
    default: return role;
  }
};

export default AdminPowers;