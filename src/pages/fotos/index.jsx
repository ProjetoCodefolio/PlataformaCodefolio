import "../home.css";
import { React, useEffect, useState } from "react";
import { database } from "../../service/firebase";
import ComentariosYouTube from "../../components/youtube/comments";
import {
    ref,
    query,
    orderByKey,
    limitToFirst,
    startAt,
    get,
} from "firebase/database";
import {
    Button,
    Card,
    CardContent,
    Typography,
    Avatar,
    Grid,
    Box,
} from "@mui/material";

const FotosPage = () => {
    const [Fotos, setFotos] = useState([]);

    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const fetchFotos = async () => {
        setLoading(true);
        const FotosQuery = ref(database, "Fotos");

        const snapshot = await get(FotosQuery);
        const FotosData = snapshot.val();
        if (FotosData) {
            const FotosList = Object.keys(FotosData).map((key) => ({
                id: key,
                ...FotosData[key],
            }));

            setFotos(FotosList);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchFotos();
    }, []);

    console.log(Fotos);

    return (
        <>
            <Box sx={{ marginTop: "78px" }}>
                <Box className="homeContainer">
                <ComentariosYouTube/>
                </Box>
                <Grid container spacing={3}>
                    {Fotos.map((member) => (
                        <Grid item xs={12} sm={6} md={4} key={member.id}>
                            <Card>
                                <CardContent>
                                    <Box
                                        display="flex"
                                        flexDirection="column"
                                        alignItems="center"
                                    >
                                        <Avatar
                                            src={member.photoURL}
                                            alt={member.name}
                                            sx={{ width: 100, height: 100 }}
                                        />
                                        <Typography variant="h6" gutterBottom>
                                            {member.name}
                                        </Typography>
                                        <a
                                            href={member.githubURL}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            {member.githubURL || "URL do GitHub não fornecido"}
                                        </a>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
                {hasMore && (
                    <Box mt={3} display="flex" justifyContent="center">
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={() => fetchFotos(lastKey)}
                            disabled={loading}
                        >
                            {loading ? "Loading..." : "Ver Mais"}
                        </Button>
                    </Box>
                )}

                <Typography variant="h4" gutterBottom>
                    <br />
                    <br />
                </Typography>
            </Box>
        </>
    );
};

export default FotosPage;
