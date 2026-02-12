import React, { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { useLocation } from "react-router-dom";
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
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { toast } from "react-toastify";
import * as extraMaterialsService from "$api/services/courses/extraMaterials";

const CourseMaterialsTab = forwardRef((props, ref) => {
    const [materials, setMaterials] = useState([]);
    const [materialName, setMaterialName] = useState("");
    const [materialUrl, setMaterialUrl] = useState("");
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingMaterialId, setEditingMaterialId] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [materialToDelete, setMaterialToDelete] = useState(null);

    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const courseId = params.get("courseId");

    // Busca materiais usando a API
    const loadCourseMaterials = async () => {
        try {
            const materialsData = await extraMaterialsService.fetchCourseMaterials(courseId);
            setMaterials(materialsData);
        } catch (error) {
            console.error("Erro ao buscar materiais:", error);
            toast.error("Erro ao carregar materiais");
            setMaterials([]);
        }
    };

    // Adiciona um material usando a API
    const handleAddMaterial = async () => {
        if (!materialName.trim() || !materialUrl.trim()) {
            toast.error("Preencha o nome e a URL do material");
            return;
        }

        try {
            const materialData = {
                name: materialName,
                url: materialUrl
            };

            const newMaterial = await extraMaterialsService.addCourseMaterial(courseId, materialData);

            setMaterials((prev) => [...prev, newMaterial]);
            setMaterialName("");
            setMaterialUrl("");
            setShowSuccessModal(true);
        } catch (error) {
            console.error("Erro ao adicionar material:", error);
            toast.error(error.message || "Erro ao adicionar material");
        }
    };

    const handleEditMaterial = async (id) => {
        setIsEditing(true);

        const material = materials.find((m) => m.id === id);
        if (material) {
            setMaterialName(material.name);
            setMaterialUrl(material.url);
            setEditingMaterialId(id);
        }
    };

    const handleUpdateMaterial = async () => {
        if (!materialName.trim() || !materialUrl.trim()) {
            toast.error("Preencha o nome e a URL do material");
            return;
        }
        try {
            const updatedMaterialData = {
                name: materialName,
                url: materialUrl
            };
            const updatedMaterial = await extraMaterialsService.updateCourseMaterial(courseId, editingMaterialId, updatedMaterialData);
            setMaterials((prev) =>
                prev.map((material) =>
                    material.id === updatedMaterial.id ? updatedMaterial : material
                )
            );
            setMaterialName("");
            setMaterialUrl("");
            setIsEditing(false);
            toast.success("Material atualizado com sucesso!");
        } catch (error) {
            console.error("Erro ao atualizar material:", error);
            toast.error(error.message || "Erro ao atualizar material");
        }
    };

    // Abre o modal de confirmação para exclusão
    const handleRemoveMaterial = (id) => {
        const material = materials.find((m) => m.id === id);
        setMaterialToDelete(material);
        setShowDeleteModal(true);
    };

    // Remove um material usando a API
    const confirmRemoveMaterial = async () => {
        if (!materialToDelete || !materialToDelete.id) {
            setShowDeleteModal(false);
            setMaterialToDelete(null);
            return;
        }

        try {
            await extraMaterialsService.deleteCourseMaterial(courseId, materialToDelete.id);
            setMaterials((prev) => prev.filter((material) => material.id !== materialToDelete.id));
            toast.success("Material excluído com sucesso!");
        } catch (error) {
            console.error("Erro ao excluir material:", error);
            toast.error(error.message || "Erro ao excluir o material");
        }

        setShowDeleteModal(false);
        setMaterialToDelete(null);
    };

    // Expõe o método saveMaterials para o componente pai
    useImperativeHandle(ref, () => ({
        async saveMaterials(newCourseId = null) {
            try {
                const targetCourseId = newCourseId || courseId;
                if (!targetCourseId) throw new Error("ID do curso não disponível");

                return await extraMaterialsService.saveAllCourseMaterials(targetCourseId, materials);
            } catch (error) {
                console.error("Erro ao salvar materiais:", error);
                throw error;
            }
        }
    }));

    useEffect(() => {
        if (courseId) {
            loadCourseMaterials();
        }
    }, [courseId]);

    return (
        <Box>
            <Grid container spacing={2}>
                <Grid item xs={12} sm={8}>
                    <TextField
                        label="Nome do Material"
                        fullWidth
                        value={materialName}
                        onChange={(e) => setMaterialName(e.target.value)}
                        variant="outlined"
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                '&.Mui-focused fieldset': {
                                    borderColor: '#9041c1',
                                },
                            },
                            '& .MuiInputLabel-root.Mui-focused': {
                                color: '#9041c1',
                            },
                            "& .MuiInputLabel-root": {
                                fontSize: { xs: '0.875rem', sm: '1rem' }
                            },
                            "& .MuiInputBase-input": {
                                fontSize: { xs: '0.875rem', sm: '1rem' }
                            }
                        }}
                    />
                </Grid>
                <Grid item xs={12} sm={8}>
                    <TextField
                        label="URL do Material"
                        fullWidth
                        value={materialUrl}
                        onChange={(e) => setMaterialUrl(e.target.value)}
                        variant="outlined"
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                '&.Mui-focused fieldset': {
                                    borderColor: '#9041c1',
                                },
                            },
                            '& .MuiInputLabel-root.Mui-focused': {
                                color: '#9041c1',
                            },
                            "& .MuiInputLabel-root": {
                                fontSize: { xs: '0.875rem', sm: '1rem' }
                            },
                            "& .MuiInputBase-input": {
                                fontSize: { xs: '0.875rem', sm: '1rem' }
                            }
                        }}
                    />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Button
                        variant="contained"
                        fullWidth
                        sx={{
                            height: "100%",
                            backgroundColor: "#9041c1",
                            '&:hover': { backgroundColor: "#7d37a7" },
                            fontSize: { xs: '0.875rem', sm: '1rem' }
                        }}
                        onClick={isEditing ? handleUpdateMaterial : handleAddMaterial}
                    >
                        {isEditing ? "Editar Material" : "Adicionar Material"}
                    </Button>
                </Grid>
            </Grid>

            <Typography variant="h6" sx={{ mt: 4, mb: 2, fontWeight: "bold", color: "#333", fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
                Materiais Adicionados
            </Typography>

            <List sx={{ mt: 4 }}>
                {materials.map((material) => (
                    <ListItem
                        key={material.id || material.name}
                        sx={{
                            p: { xs: 1.5, sm: 2 },
                            border: "1px solid #ddd",
                            borderRadius: "8px",
                            mb: 2,
                            '&:hover': { backgroundColor: "rgba(144, 65, 193, 0.04)" },
                            flexWrap: { xs: 'wrap', sm: 'nowrap' },
                            alignItems: 'flex-start'
                        }}
                        secondaryAction={
                            <Box sx={{ display: 'flex', gap: { xs: 0.5, sm: 1 } }}>
                                <IconButton
                                    edge="end"
                                    onClick={() => handleEditMaterial(material.id)}
                                    sx={{ color: "#9041c1", p: { xs: 0.5, sm: 1 } }}
                                    size="small"
                                >
                                    <EditIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                    edge="end"
                                    onClick={() => handleRemoveMaterial(material.id)}
                                    sx={{ color: "#d32f2f", p: { xs: 0.5, sm: 1 } }}
                                    size="small"
                                >
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </Box>
                        }
                    >
                        <ListItemText
                            primary={material.name}
                            secondary={`URL: ${material.url}`}
                            primaryTypographyProps={{
                                sx: {
                                    fontSize: { xs: '0.875rem', sm: '1rem' },
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    maxWidth: { xs: '180px', sm: '400px', md: '600px' },
                                    display: 'block'
                                }
                            }}
                            secondaryTypographyProps={{
                                sx: {
                                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    maxWidth: { xs: '180px', sm: '400px', md: '600px' },
                                    display: 'block'
                                }
                            }}
                            sx={{
                                maxWidth: { xs: 'calc(100% - 80px)', sm: 'calc(100% - 96px)' },
                                pr: 1
                            }}
                        />
                    </ListItem>
                ))}
                {materials.length === 0 && (
                    <Typography variant="body2" color="textSecondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                        Nenhum material adicionado.
                    </Typography>
                )}
            </List>

            {/* Modal de sucesso ao adicionar */}
            <Modal
                open={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                aria-labelledby="success-modal-title"
            >
                <Box sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: { xs: '90%', sm: 400 },
                    maxWidth: 400,
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                    boxShadow: 24,
                    p: { xs: 3, sm: 4 },
                    textAlign: 'center',
                }}>
                    <CheckCircleOutlineIcon sx={{ fontSize: { xs: 50, sm: 60 }, color: '#4caf50', mb: 2 }} />
                    <Typography id="success-modal-title" variant="h6" sx={{ mb: 2, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                        Material adicionado com sucesso!
                    </Typography>
                    <Button
                        variant="contained"
                        onClick={() => setShowSuccessModal(false)}
                        sx={{ 
                            backgroundColor: "#9041c1", 
                            '&:hover': { backgroundColor: "#7d37a7" },
                            fontSize: { xs: '0.875rem', sm: '1rem' }
                        }}
                    >
                        OK
                    </Button>
                </Box>
            </Modal>

            {/* Modal de confirmação para exclusão */}
            <Modal
                open={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                aria-labelledby="delete-modal-title"
            >
                <Box sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: { xs: '90%', sm: 400 },
                    maxWidth: 400,
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                    boxShadow: 24,
                    p: { xs: 3, sm: 4 },
                    textAlign: 'center',
                }}>
                    <Typography id="delete-modal-title" variant="h6" sx={{ mb: 2, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                        Tem certeza que deseja excluir "{materialToDelete?.name}"?
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'center', gap: 2 }}>
                        <Button
                            variant="contained"
                            color="error"
                            onClick={confirmRemoveMaterial}
                            fullWidth={false}
                            sx={{
                                fontSize: { xs: '0.875rem', sm: '1rem' },
                                minWidth: { xs: '100%', sm: 'auto' }
                            }}
                        >
                            Sim, Excluir
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={() => setShowDeleteModal(false)}
                            fullWidth={false}
                            sx={{
                                fontSize: { xs: '0.875rem', sm: '1rem' },
                                minWidth: { xs: '100%', sm: 'auto' }
                            }}
                        >
                            Cancelar
                        </Button>
                    </Box>
                </Box>
            </Modal>
        </Box>
    );
});

export default CourseMaterialsTab;