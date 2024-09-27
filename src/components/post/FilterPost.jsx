import { useEffect, useState } from "react";
import { database } from "../../service/firebase";
import { ref, get, onValue } from "firebase/database";
import { Card, CardContent, Typography, Button, Checkbox, FormControlLabel } from "@mui/material";
import { abrirAlert } from "./utils";
import MyAlert from "./Alert";
import "./post.css";

const FilterPostCard = ({ onFilter }) => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [tags, setTags] = useState([]);
    const [selectedFilterTags, setSelectedFilterTags] = useState([]);
    const [alertOpen, setAlertOpen] = useState(false); // Estado para controlar a visibilidade do alerta
    const [alertMessage, setAlertMessage] = useState(''); // Estado para a mensagem do alerta
    const [alertSeverity, setAlertSeverity] = useState('success'); // Estado para a severidade do alerta

    const handleTagFilterChange = (tag, isChecked) => {
        setSelectedFilterTags(prev => isChecked ? [...prev, tag] : prev.filter(t => t !== tag));
    };

    const filtrarPosts = async (selectedCategory) => {
        setLoading(true);


        if (!Array.isArray(selectedCategory)) {
            selectedCategory = [selectedCategory];
        }

        if (selectedCategory.length === 0) {
            abrirAlert(setAlertMessage, setAlertSeverity, setAlertOpen, "Selecione ao menos uma tag para filtrar os posts.", "error");
            onFilter(undefined);
            return;
        }

        const postsQuery = ref(database, "post");
        const snapshot = await get(postsQuery);
        const postsData = snapshot.val();
        if (postsData) {
            const postsList = Object.keys(postsData).map((key) => ({
                id: key,
                ...postsData[key],
            })).reverse();

            const filteredPosts = postsList.filter((post) => {
                return selectedCategory.some(category => post.tags.includes(category));
            });

            setPosts(filteredPosts);
            onFilter(filteredPosts); // Call the callback function with the filtered posts
        }
        setLoading(false);
    };

    const limparFiltros = () => {
        setSelectedFilterTags([]);
        onFilter(undefined);
    };

    const fetchPosts = async () => {
        setLoading(true);
        const postsQuery = ref(database, "post");

        const snapshot = await get(postsQuery);
        const postsData = snapshot.val();
        if (postsData) {
            const postsList = Object.keys(postsData).map((key) => ({
                id: key,
                ...postsData[key],
            })).reverse();

            setPosts(postsList);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchPosts();
    }, []);

    useEffect(() => {
        const tagsRef = ref(database, 'tags');

        onValue(tagsRef, (snapshot) => {
            const data = snapshot.val();
            let tagsArray = [];
            for (let tag in data) {
                tagsArray.push(data[tag].nome);
            }
            setTags(tagsArray);
        }, (error) => {
            console.error("Error: ", error);
        });
    }, []);

    return (
        <Card sx={{ maxWidth: 345, m: 2 }}>
            <CardContent>
                <Typography component="div" variant="h6">
                    Categorias de Vídeos
                </Typography>
                {tags.map((tag, index) => (
                    <div key={index}>
                        <FormControlLabel
                            control={<Checkbox
                                onChange={(e) => handleTagFilterChange(tag, e.target.checked)}
                                checked={selectedFilterTags.includes(tag)} // Adicionado para controlar o estado marcado/desmarcado
                                sx={{
                                    color: "purple",
                                    "&.Mui-checked": {
                                        color: "purple",
                                    },
                                }}
                            />}
                            label={tag}
                        />
                    </div>
                ))}

                <br />

                <Button
                    onClick={() => limparFiltros()}
                    sx={{
                        backgroundColor: "purple",
                        color: "white",
                        marginRigth: "30%",
                        ":hover": {
                            backgroundColor: "purple",
                            color: "white",
                        },
                    }}
                >
                    Limpar
                </Button>

                <Button
                    onClick={() => filtrarPosts(selectedFilterTags)}
                    sx={{
                        backgroundColor: "purple",
                        color: "white",
                        marginLeft: "30%",
                        ":hover": {
                            backgroundColor: "purple",
                            color: "white",
                        },
                    }}
                >
                    Filtrar
                </Button>

                <MyAlert
                    open={alertOpen}
                    onClose={() => setAlertOpen(false)}
                    message={alertMessage}
                    severity={alertSeverity}
                />
                
            </CardContent>
        </Card>

    );
};

export default FilterPostCard;