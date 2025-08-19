import { useEffect, useState } from "react";
import { abrirAlert } from "../../../../utils/postUtils";
import { useIsMobileHook } from "$components/useIsMobileHook";
import MyAlert from "../alert/Alert";
import * as S from "./styles";
import { colorConstants } from "../../../../constants/constantStyles";
import {
    fetchAllPosts,
    filterPostsByTags,
    listenToPostsAndGetDisabledTags,
    listenToTags
} from "$api/services/posts/";

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
            abrirAlert(
                setAlertMessage,
                setAlertSeverity,
                setAlertOpen,
                "Selecione ao menos uma tag para filtrar os posts.",
                "error"
            );
            onFilter(undefined);
            setLoading(false);
            return;
        }

        const result = await filterPostsByTags(selectedCategory);

        if (result.success) {
            setPosts(result.posts);
            onFilter(result.posts);
        } else {
            abrirAlert(
                setAlertMessage,
                setAlertSeverity,
                setAlertOpen,
                "Erro ao filtrar posts.",
                "error"
            );
        }

        setLoading(false);
    };

    const limparFiltros = () => {
        setSelectedFilterTags([]);
        onFilter(undefined);
    };

    // Load tags and initial posts
    useEffect(() => {
        const unsubscribeTags = listenToTags((tagsArray) => {
            setTags(tagsArray);

            // When tags are loaded, initialize posts
            const fetchInitialPosts = async () => {
                setLoading(true);
                const initialPosts = await fetchAllPosts();
                setPosts(initialPosts);
                setLoading(false);

                // Determine disabled tags on initial load
                const tagsWithPosts = new Set();
                initialPosts.forEach(post => {
                    if (Array.isArray(post.tags)) {
                        post.tags.forEach(tag => tagsWithPosts.add(tag));
                    }
                });

                setDisabledTags(tagsArray.filter(tag => !tagsWithPosts.has(tag)));
            };

            fetchInitialPosts();
        });

        // Cleanup function
        return () => {
            if (unsubscribeTags) unsubscribeTags();
        };
    }, []);

    // Monitor changes in posts and update disabled tags
    useEffect(() => {
        if (tags.length === 0) return;

        const unsubscribePosts = listenToPostsAndGetDisabledTags(
            tags,
            (postsList, disabledTagsList) => {
                setPosts(postsList);
                setDisabledTags(disabledTagsList);
            }
        );

        // Cleanup function
        return () => {
            if (unsubscribePosts) unsubscribePosts();
        };
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
                    <S.FilterButton
                        onClick={() => filtrarPosts(selectedFilterTags)}
                        disabled={loading || selectedFilterTags.length === 0}
                    >
                        {loading ? 'CARREGANDO...' : 'FILTRAR'}
                    </S.FilterButton>
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