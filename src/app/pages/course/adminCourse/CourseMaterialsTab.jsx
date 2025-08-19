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
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { toast } from "react-toastify";
import {
    fetchCourseMaterials,
    addCourseMaterial,
    deleteCourseMaterial,
    saveAllCourseMaterials
} from "$api/services/courses/extraMaterials";

const CourseMaterialsTab = forwardRef((props, ref) => {
    const [materials, setMaterials] = useState([]);
    const [materialName, setMaterialName] = useState("");
    const [materialUrl, setMaterialUrl] = useState("");
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [materialToDelete, setMaterialToDelete] = useState(null);

    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const courseId = params.get("courseId");

    // Busca materiais usando a API
    const loadCourseMaterials = async () => {
        try {
            const materialsData = await fetchCourseMaterials(courseId);
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
            
            const newMaterial = await addCourseMaterial(courseId, materialData);
            
            setMaterials((prev) => [...prev, newMaterial]);
            setMaterialName("");
            setMaterialUrl("");
            setShowSuccessModal(true);
        } catch (error) {
            console.error("Erro ao adicionar material:", error);
            toast.error(error.message || "Erro ao adicionar material");
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
            await deleteCourseMaterial(courseId, materialToDelete.id);
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
                
                return await saveAllCourseMaterials(targetCourseId, materials);
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
                <Grid item xs={8}>
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
                        }}
                    />
                </Grid>
                <Grid item xs={8}>
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
                        }}
                    />
                </Grid>
                <Grid item xs={4}>
                    <Button
                        variant="contained"
                        sx={{
                            height: "100%",
                            backgroundColor: "#9041c1",
                            '&:hover': { backgroundColor: "#7d37a7" },
                        }}
                        onClick={handleAddMaterial}
                    >
                        Adicionar Material
                    </Button>
                </Grid>
            </Grid>

            <Typography variant="h6" sx={{ mt: 4, mb: 2, fontWeight: "bold", color: "#333" }}>
                Materiais Adicionados
            </Typography>

            <List sx={{ mt: 4 }}>
                {materials.map((material) => (
                    <ListItem
                        key={material.id || material.name} // Usa name como fallback se id ainda não existir
                        sx={{
                            p: 2,
                            border: "1px solid #ddd",
                            borderRadius: "8px",
                            mb: 2,
                            '&:hover': { backgroundColor: "rgba(144, 65, 193, 0.04)" },
                        }}
                        secondaryAction={
                            <IconButton
                                edge="end"
                                onClick={() => handleRemoveMaterial(material.id)}
                            >
                                <DeleteIcon />
                            </IconButton>
                        }
                    >
                        <ListItemText
                            primary={material.name}
                            secondary={`URL: ${material.url}`}
                        />
                    </ListItem>
                ))}
                {materials.length === 0 && (
                    <Typography variant="body2" color="textSecondary">
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
                    width: 400,
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                    boxShadow: 24,
                    p: 4,
                    textAlign: 'center',
                }}>
                    <CheckCircleOutlineIcon sx={{ fontSize: 60, color: '#4caf50', mb: 2 }} />
                    <Typography id="success-modal-title" variant="h6" sx={{ mb: 2 }}>
                        Material adicionado com sucesso!
                    </Typography>
                    <Button
                        variant="contained"
                        onClick={() => setShowSuccessModal(false)}
                        sx={{ backgroundColor: "#9041c1", '&:hover': { backgroundColor: "#7d37a7" } }}
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
                    width: 400,
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                    boxShadow: 24,
                    p: 4,
                    textAlign: 'center',
                }}>
                    <Typography id="delete-modal-title" variant="h6" sx={{ mb: 2 }}>
                        Tem certeza que deseja excluir "{materialToDelete?.name}"?
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                        <Button
                            variant="contained"
                            color="error"
                            onClick={confirmRemoveMaterial}
                        >
                            Sim, Excluir
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={() => setShowDeleteModal(false)}
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