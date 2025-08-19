import React, { useState, useEffect } from "react";
import {
    Box,
    Typography,
    Paper,
    Card,
    CardContent,
    CardActions,
    Button,
    Grid,
    CircularProgress,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import Topbar from "$components/topbar/Topbar";
// import { ref, get, query, orderByChild, equalTo, set } from "firebase/database";
// import { database } from "$api/config/firebase";

const AdminPanelComponent = ({ options }) => {

    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    
    // const [users, setUsers] = useState([]);
    // useEffect(() => {
    //     const fetchUsers = async () => {
    //         const usersRef = ref(database, "users");
    //         const emailQuery = query(usersRef, orderByChild("role"), equalTo("user"));
    //         const snapshot = await get(usersRef);
    //         const users = snapshot.val();
    //         if (users) {
    //             const usersList = Object.keys(users).map((key) => ({
    //                 id: key,
    //                 ...users[key],
    //             }));
    //             setUsers(usersList);
    //         }
    //     }
    //     fetchUsers();
    // }, []);

    return (
        <Box
            sx={{
                minHeight: "calc(100vh - 64px)",
                backgroundColor: "#F5F5FA",
                pt: { xs: 8, sm: 10 },
                pb: { xs: 1, sm: 2 },
                px: { xs: 1, sm: 2 },
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
            }}
        >
            <Topbar hideSearch={true} />
            <Box sx={{ height: { xs: "16px", sm: "24px" } }} />

            <Paper
                sx={{
                    p: { xs: 1, sm: 2 },
                    backgroundColor: "#ffffff",
                    borderRadius: "16px",
                    boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
                    width: "100%",
                    maxWidth: { xs: "calc(100% - 16px)", sm: "1200px" },
                }}
            >

                {loading ? (
                    <Box sx={{ p: 4, textAlign: "center" }}>
                        <CircularProgress color="secondary" />
                        <Typography variant="body1" sx={{ mt: 2, color: "#888" }}>
                            Carregando...
                        </Typography>
                    </Box>
                ) : (
                    <>
                        <Box sx={{ p: { xs: 1, sm: 2 } }}>
                            <Grid container spacing={2}>
                                {options.map((option) => (
                                    <Grid item xs={12} sm={6} md={4} key={option.id}>
                                        <Card
                                            sx={{
                                                backgroundColor: "#ffffff",
                                                boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
                                                borderRadius: "16px",
                                                height: "100%",
                                                display: "flex",
                                                flexDirection: "column",
                                                transition: "transform 0.2s ease-in-out",
                                                "&:hover": {
                                                    transform: "scale(1.02)",
                                                    boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.2)",
                                                },
                                            }}
                                        >
                                            <CardContent sx={{ flex: 1 }}>
                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        mb: 1,
                                                    }}
                                                >
                                                    <Typography
                                                        variant="subtitle1"
                                                        sx={{
                                                            fontWeight: "bold",
                                                            textAlign: "center",
                                                            color: "#333",
                                                            fontSize: { xs: "0.9rem", sm: "1rem" },
                                                        }}
                                                    >
                                                        {option.name || "Nome da Opção"}
                                                    </Typography>
                                                </Box>
                                                <Typography
                                                    variant="body2"
                                                    color="textSecondary"
                                                    sx={{
                                                        mb: 1,
                                                        fontSize: { xs: "0.8rem", sm: "0.875rem" },
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                        display: "-webkit-box",
                                                        WebkitLineClamp: 3,
                                                        WebkitBoxOrient: "vertical",
                                                    }}
                                                >
                                                    {option.description || "Descrição da Opção"}
                                                </Typography>
                                                <Typography
                                                    variant="body2"
                                                    color="textSecondary"
                                                    sx={{
                                                        mt: 1,
                                                        fontSize: { xs: "0.8rem", sm: "0.875rem" },
                                                    }}
                                                >
                                                </Typography>
                                            </CardContent>
                                            <CardActions sx={{ p: 2, justifyContent: "center", mt: "auto" }}>
                                                <Button
                                                    variant="contained"
                                                    sx={{
                                                        backgroundColor: "#9041c1",
                                                        color: "white",
                                                        borderRadius: "8px",
                                                        "&:hover": { backgroundColor: "#7d37a7" },
                                                        textTransform: "none",
                                                        fontWeight: "bold",
                                                        fontSize: { xs: "12px", sm: "14px" },
                                                        padding: "6px 10px",
                                                        width: "calc(100% - 16px)",
                                                    }}
                                                    onClick={() => navigate(option.path)}
                                                >
                                                    Ir
                                                </Button>
                                            </CardActions>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        </Box>
                    </>
                )}
            </Paper>
            {/* {users.length > 0 && (
                <Box sx={{ mt: 4, width: "100%", maxWidth: "1200px" }}>
                    <Typography variant="h5" sx={{ mb: 2, color: "#333", fontWeight: "bold" }}>
                        Usuários Cadastrados
                    </Typography>
                    <Paper sx={{ p: 2, backgroundColor: "#f9f9f9", borderRadius: "16px" }}>
                        <Grid container spacing={2}>
                            {users.map((user) => (
                                <Grid item xs={12} sm={6} md={4} key={user.id}>
                                    <Card
                                        sx={{
                                            backgroundColor: "#ffffff",
                                            boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
                                            borderRadius: "16px",
                                            height: "100%",
                                            display: "flex",
                                            flexDirection: "column",
                                            transition: "transform 0.2s ease-in-out",
                                            "&:hover": {
                                                transform: "scale(1.02)",
                                                boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.2)",
                                            },
                                        }}
                                    >
                                        <CardContent sx={{ flex: 1 }}>
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    mb: 1,
                                                }}
                                            >
                                                <Typography
                                                    variant="subtitle1"
                                                    sx={{
                                                        fontWeight: "bold",
                                                        textAlign: "center",
                                                        color: "#333",
                                                        fontSize: { xs: "0.9rem", sm: "1rem" },
                                                    }}
                                                >
                                                    {user.name || "Nome do Usuário"}
                                                </Typography>
                                            </Box>
                                            <Typography
                                                variant="body2"
                                                color="textSecondary"
                                                sx={{
                                                    mb: 1,
                                                    fontSize: { xs: "0.8rem", sm: "0.875rem" },
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    display: "-webkit-box",
                                                    WebkitLineClamp: 3,
                                                    WebkitBoxOrient: "vertical",
                                                }}
                                            >
                                                {user.email || "Email do Usuário"}
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                color="textSecondary"
                                                sx={{
                                                    mt: 1,
                                                    fontSize: { xs: "0.8rem", sm: "0.875rem" },
                                                }}
                                            >
                                                {user.role || "Papel do Usuário"}
                                            </Typography>
                                        </CardContent>
                                        <CardActions sx={{ p: 2, justifyContent: "center", mt: "auto" }}>
                                            <Button
                                                variant="contained"
                                                sx={{
                                                    backgroundColor: "#9041c1",
                                                    color: "white",
                                                    borderRadius: "8px",
                                                    "&:hover": { backgroundColor: "#7d37a7" },
                                                    textTransform: "none",
                                                    fontWeight: "bold",
                                                    fontSize: { xs: "12px", sm: "14px" },
                                                    padding: "6px 10px",
                                                    width: "calc(100% - 16px)",
                                                }}
                                                onClick={() => navigate(`/admin-users/${user.id}`)}
                                            >
                                                Ver Detalhes
                                            </Button>
                                        </CardActions>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    </Paper>
                </Box>
            )} */}
        </Box >
    )
}

export default AdminPanelComponent;