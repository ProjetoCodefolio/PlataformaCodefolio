import React, { useState, useEffect } from "react";
import {
    Box,
    Typography,
    Button,
    Card,
    CardContent,
    CardActions,
    CircularProgress,
} from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";
import DescriptionIcon from "@mui/icons-material/Description";
import { toast } from "react-toastify";
import { useAuth } from "$context/AuthContext";
import { fetchCourseMaterials } from "$api/services/courses/extraMaterials";

const MaterialExtra = ({ courseId }) => {
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(false);
    const { userDetails } = useAuth();

    useEffect(() => {
        const loadMaterials = async () => {
            setLoading(true);
            try {
                const materialsData = await fetchCourseMaterials(courseId);
                setMaterials(materialsData);
            } catch (error) {
                console.error("Erro ao buscar materiais extras:", error);
                toast.error("Erro ao carregar os materiais extras");
            } finally {
                setLoading(false);
            }
        };

        loadMaterials();
    }, [courseId]);

    return (
        <Box sx={{ p: { xs: 1, sm: 2 }, backgroundColor: "#F5F5FA", minHeight: "100%" }}>
            {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", p: { xs: 2, sm: 5 } }}>
                    <CircularProgress sx={{ color: "#9041c1" }} />
                    <Typography variant="body1" sx={{ ml: 2, color: "#666" }}>
                        Carregando materiais...
                    </Typography>
                </Box>
            ) : !userDetails ? (
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "100%",
                        color: "#aaa",
                    }}
                >
                    <DescriptionIcon sx={{ fontSize: { xs: 40, sm: 60 }, mb: 2, color: "#bbb" }} />
                    <Typography
                        variant="h6"
                        sx={{ color: "#555", mb: 1, fontWeight: 600, fontSize: { xs: "1rem", sm: "1.25rem" } }}
                    >
                        Materiais Extras
                    </Typography>
                    <Typography variant="body1" sx={{ textAlign: "center", color: "#666" }}>
                        Você deve fazer login para ver os materiais extras deste curso
                    </Typography>
                </Box>
            ) : materials.length > 0 ? (
                materials.map((material) => (
                    <Card
                        key={material.id}
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            padding: { xs: 1, sm: 2 },
                            marginBottom: { xs: 1, sm: 2 },
                            backgroundColor: "#F5F5FA",
                            borderRadius: "16px",
                            border: "1px solid #e0e0e0",
                        }}
                    >
                        <CardContent>
                            <Typography
                                variant="h6"
                                fontWeight="bold"
                                sx={{
                                    color: "#333",
                                    mb: 1,
                                    fontSize: { xs: "1rem", sm: "1.25rem" },
                                }}
                            >
                                {material.name}
                            </Typography>
                        </CardContent>
                        <CardActions sx={{ px: { xs: 1, sm: 2 }, pb: 2 }}>
                            <Button
                                variant="contained"
                                href={material.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                fullWidth
                                startIcon={<LinkIcon />}
                                sx={{
                                    backgroundColor: "#9041c1",
                                    borderRadius: "12px",
                                    "&:hover": { backgroundColor: "#7d37a7" },
                                    textTransform: "none",
                                    fontWeight: 500,
                                    px: { xs: 2, sm: 4 },
                                    py: 1.5,
                                    fontSize: { xs: "0.8rem", sm: "0.875rem" },
                                }}
                            >
                                Acessar Material
                            </Button>
                        </CardActions>
                    </Card>
                ))
            ) : (
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "100%",
                        color: "#aaa",
                    }}
                >
                    <DescriptionIcon sx={{ fontSize: { xs: 40, sm: 60 }, mb: 2, color: "#bbb" }} />
                    <Typography
                        variant="h6"
                        sx={{ color: "#555", mb: 1, fontWeight: 600, fontSize: { xs: "1rem", sm: "1.25rem" } }}
                    >
                        Materiais Extras
                    </Typography>
                    <Typography variant="body1" sx={{ textAlign: "center", color: "#666" }}>
                        Não existem materiais extras relacionados a esta aula.
                    </Typography>
                </Box>
            )}
        </Box>
    );
};

export default MaterialExtra;