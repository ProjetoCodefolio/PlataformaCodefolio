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
    Modal,
    Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { toast } from "react-toastify";

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

    // Busca materiais existentes do Firebase
    async function fetchCourseMaterials() {
        const courseMaterialsRef = firebaseRef(database, `courseMaterials/${courseId}`);
        const snapshot = await get(courseMaterialsRef);
        const courseMaterials = snapshot.val();

        if (courseMaterials) {
            const filteredMaterials = Object.entries(courseMaterials).map(([key, material]) => ({
                id: key,
                name: material.name,
                url: material.url,
                courseId: material.courseId,
            }));
            setMaterials(filteredMaterials);
        }
    }

    // Adiciona um material com modal de sucesso
    const handleAddMaterial = async () => {
        if (!materialName.trim() || !materialUrl.trim()) {
            toast.error("Preencha o nome e a URL do material");
            return;
        }

        const newMaterial = {
            name: materialName,
            url: materialUrl,
            courseId: courseId || null, // Será preenchido ao salvar o curso
        };

        try {
            const courseMaterialsRef = firebaseRef(database, `courseMaterials/${courseId}`);
            const newMaterialRef = push(courseMaterialsRef);
            await set(newMaterialRef, newMaterial);

            setMaterials((prev) => [...prev, { ...newMaterial, id: newMaterialRef.key }]);
            setMaterialName("");
            setMaterialUrl("");
            setShowSuccessModal(true);
        } catch (error) {
            console.error("Erro ao adicionar material:", error);
            toast.error("Erro ao adicionar material");
        }
    };

    // Abre o modal de confirmação para exclusão
    const handleRemoveMaterial = (id) => {
        const material = materials.find((m) => m.id === id);
        setMaterialToDelete(material);
        setShowDeleteModal(true);
    };

    const confirmRemoveMaterial = async () => {
        if (materialToDelete && materialToDelete.id) {
            try {
                const materialRef = firebaseRef(database, `courseMaterials/${courseId}/${materialToDelete.id}`);
                await set(materialRef, null); // Remove do Firebase
                setMaterials((prev) => prev.filter((material) => material.id !== materialToDelete.id));
                toast.success("Material excluído com sucesso!");
            } catch (error) {
                console.error("Erro ao excluir material:", error);
                toast.error("Erro ao excluir o material");
            }
        } else {
            setMaterials((prev) => prev.filter((material) => material.id !== materialToDelete.id));
        }
        setShowDeleteModal(false);
        setMaterialToDelete(null);
    };

    // Salva os materiais no Firebase
    const saveMaterials = async (newCourseId) => {
        const courseMaterialsRef = firebaseRef(database, `courseMaterials/${newCourseId || courseId}`);
        const snapshot = await get(courseMaterialsRef);
        const existingMaterials = snapshot.val() || {};

        const existingMaterialIds = new Set(Object.keys(existingMaterials));
        const currentMaterialIds = new Set(materials.map(material => material.id).filter(id => id));

        // Remove materiais que não estão mais na lista
        for (const id of existingMaterialIds) {
            if (!currentMaterialIds.has(id)) {
                const materialRef = firebaseRef(database, `courseMaterials/${newCourseId || courseId}/${id}`);
                await set(materialRef, null);
            }
        }

        // Adiciona ou atualiza materiais
        for (const material of materials) {
            const materialData = {
                courseId: newCourseId || courseId,
                name: material.name,
                url: material.url,
            };

            try {
                if (!material.id || !existingMaterialIds.has(material.id)) {
                    const newMaterialRef = push(courseMaterialsRef);
                    await set(newMaterialRef, materialData);
                    material.id = newMaterialRef.key; // Atualiza o ID no estado
                } else {
                    const materialRef = firebaseRef(database, `courseMaterials/${newCourseId || courseId}/${material.id}`);
                    await set(materialRef, materialData);
                }
            } catch (error) {
                console.error("Erro ao salvar material:", error);
                throw new Error("Erro ao salvar materiais");
            }
        }
    };

    useImperativeHandle(ref, () => ({
        saveMaterials,
    }));

    useEffect(() => {
        if (courseId) {
            fetchCourseMaterials();
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