import { useEffect, useState } from "react";
import { database } from "../../../../service/firebase";
import { ref, get, onValue } from "firebase/database";
import { abrirAlert } from "../../../../utils/postUtils";
import { useIsMobileHook } from "../../../../components/useIsMobileHook";
import MyAlert from "../alert/Alert";
import * as S from "./styles";
import { colorConstants } from "../../../../constants/constantStyles";

export const FilterPost = ({ onFilter }) => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [tags, setTags] = useState([]);
    const [selectedFilterTags, setSelectedFilterTags] = useState([]);
    const [disabledTags, setDisabledTags] = useState([]);
    const [alertOpen, setAlertOpen] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [alertSeverity, setAlertSeverity] = useState('success');

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
            setLoading(false);
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
                if (!post.tags || !Array.isArray(post.tags)) {
                    return false;
                }
                return selectedCategory.some(category => post.tags.includes(category));
            });

            setPosts(filteredPosts);
            onFilter(filteredPosts);
        }
        setLoading(false);
    };

    const limparFiltros = () => {
        setSelectedFilterTags([]);
        onFilter(undefined);
    };

    const fetchPosts = async (tagsArray) => {
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

            // Determine which tags have associated posts
            const tagsWithPosts = new Set();
            postsList.forEach(post => {
                if (Array.isArray(post.tags)) {
                    post.tags.forEach(tag => tagsWithPosts.add(tag));
                }
            });

            setDisabledTags(tagsArray.filter(tag => !tagsWithPosts.has(tag)));
        }
        setLoading(false);
    };

    useEffect(() => {
        const tagsRef = ref(database, 'tags');

        onValue(tagsRef, (snapshot) => {
            const data = snapshot.val();
            let tagsArray = [];
            for (let tag in data) {
                tagsArray.push(data[tag].nome);
            }
            setTags(tagsArray);
            fetchPosts(tagsArray);
        }, (error) => {
            console.error("Error: ", error);
        });
    }, []);

    // Monitor changes in posts and update disabled tags
    useEffect(() => {
        const postsRef = ref(database, 'post');

        onValue(postsRef, (snapshot) => {
            const postsData = snapshot.val();
            if (postsData) {
                const postsList = Object.keys(postsData).map((key) => ({
                    id: key,
                    ...postsData[key],
                })).reverse();

                setPosts(postsList);

                // Determine which tags have associated posts
                const tagsWithPosts = new Set();
                postsList.forEach(post => {
                    if (Array.isArray(post.tags)) {
                        post.tags.forEach(tag => tagsWithPosts.add(tag));
                    }
                });

                setDisabledTags(tags.filter(tag => !tagsWithPosts.has(tag)));
            }
        }, (error) => {
            console.error("Error: ", error);
        });
    }, [tags]);

    const isMobile = useIsMobileHook(750);
    const customStyle = {
        fontFamily: 'Arial, sans-serif',
        padding: '6px',
        margin: '0 2px',
        border: isMobile ? `1px solid ${colorConstants.purple.purple600}` : 'none',
        display: 'flex',
        alignItems: 'center'
    };

    return (
        <S.Wrapper>
            <S.Content>
                {!isMobile && <S.Title>Categorias de Vídeos</S.Title>}
                <S.Options>
                    {tags.map((tag) => (
                        <label key={tag} style={customStyle}>
                            <S.CheckboxInput
                                onChange={(e) => handleTagFilterChange(tag, e.target.checked)}
                                checked={selectedFilterTags.includes(tag)}
                                disabled={disabledTags.includes(tag)}
                            />
                            <S.Text>{tag}</S.Text>
                        </label>
                    ))}
                </S.Options>
                <S.Option style={{ padding: '10px', justifySelf: 'center', gap: '12px' }}>
                    <S.FilterButton onClick={() => limparFiltros()}>LIMPAR</S.FilterButton>
                    <S.FilterButton onClick={() => filtrarPosts(selectedFilterTags)}>FILTRAR</S.FilterButton>
                </S.Option>
                <MyAlert
                    open={alertOpen}
                    onClose={() => setAlertOpen(false)}
                    message={alertMessage}
                    severity={alertSeverity}
                />
            </S.Content>
        </S.Wrapper>
    );
};