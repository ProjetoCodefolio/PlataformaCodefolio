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
} from "@mui/material";

import DeleteIcon from "@mui/icons-material/Delete";

const CourseMaterialsTab = forwardRef((props, ref) => {

    const [materials, setMaterials] = useState([]);
    const [materialName, setMaterialName] = useState("");
    const [materialUrl, setMaterialUrl] = useState("");

    const location = useLocation();

    const params = new URLSearchParams(location.search);
    const courseId = params.get("courseId");

    async function fetchCourseMaterials() {
        const courseMaterialsRef = firebaseRef(database, 'courseMaterials');
        const snapshot = await get(courseMaterialsRef);
        const courseMaterials = snapshot.val();

        if (courseMaterials) {
            const filteredMaterials = Object.entries(courseMaterials)
                .filter(([key, material]) => material.courseId === courseId)
                .map(([key, material]) => ({ id: key, ...material }));
            setMaterials(filteredMaterials);
        }
    }

    const handleAddMaterial = () => {
        const newMaterial = {
            name: materialName,
            url: materialUrl,
        };
        setMaterials((prev) => [...prev, newMaterial]);
        setMaterialName("");
        setMaterialUrl("");
    };

    const handleRemoveMaterial = (id) => {
        let response = window.confirm("Deseja realmente deletar este material?")
        if (response) {
            setMaterials((prev) => prev.filter((material) => material.id !== id));
        }
    };

    const saveMaterials = async () => {
        const courseMaterialsRef = firebaseRef(database, "courseMaterials");
        const snapshot = await get(courseMaterialsRef);
        const existingMaterials = snapshot.val() || {};

        const existingMaterialIds = new Set(Object.keys(existingMaterials));
        const currentMaterialIds = new Set(materials.map(material => material.id));

        // Remove materials that are no longer in the state and belong to the current course
        for (const id of existingMaterialIds) {
            const material = existingMaterials[id];
            if (material.courseId === courseId && !currentMaterialIds.has(id)) {
                const materialRef = firebaseRef(database, `courseMaterials/${id}`);
                await set(materialRef, null);
            }
        }

        // Add or update materials in the state
        for (const material of materials) {
            const materialData = {
                courseId: courseId,
                name: material.name,
                url: material.url,
            };

            try {
                if (!material.id) {
                    const newMaterialRef = push(courseMaterialsRef);
                    await set(newMaterialRef, materialData);
                    material.id = newMaterialRef.key; // Save the generated ID back to the material
                } else {
                    const materialRef = firebaseRef(database, `courseMaterials/${material.id}`);
                    await set(materialRef, materialData);
                }
            } catch (error) {
                console.error("Erro ao salvar os materiais:", error);
                alert("Erro ao salvar os materiais.");
            }
        }

        alert("Materiais salvos com sucesso!");
    };

    useImperativeHandle(ref, () => ({
        saveMaterials,
    }));

    useEffect(() => {
        const loadCourse = async () => {
            if (courseId) {
                await fetchCourseMaterials();
            }
        };
        loadCourse();
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
                    />
                </Grid>
                <Grid item xs={8}>
                    <TextField
                        label="URL do Material"
                        fullWidth
                        value={materialUrl}
                        onChange={(e) => setMaterialUrl(e.target.value)}
                        variant="outlined"
                    />
                </Grid>
                <Grid item xs={4}>
                    <Button
                        variant="contained"
                        color="primary"
                        fullWidth
                        sx={{ height: "100%" }}
                        onClick={handleAddMaterial}
                    >
                        Adicionar Material
                    </Button>
                </Grid>
            </Grid>

            <List sx={{ mt: 4 }}>
                {materials.map((material) => (
                    <ListItem
                        key={material.id}
                        sx={{
                            p: 2,
                            border: "1px solid #ddd",
                            borderRadius: "8px",
                            mb: 2,
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
        </Box>
    );
});

export default CourseMaterialsTab;