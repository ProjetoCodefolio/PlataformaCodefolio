import { useEffect, useState } from "react";
import { database } from "../../../../service/firebase";
import { ref, get, onValue } from "firebase/database";
import { abrirAlert } from "../../utils";
import { useIsMobileHook } from "../../../../components/useIsMobileHook"
import MyAlert from "../alert/Alert";
import * as S from "./styles";
import { colorConstants } from "../../../../constants/constantStyles";

export const FilterPost = ({onFilter}) => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(false);    
    const [tags, setTags] = useState([]);
    const [selectedFilterTags, setSelectedFilterTags] = useState([]);
    const [alertOpen, setAlertOpen] = useState(false); 
    const [alertMessage, setAlertMessage] = useState(''); 
    const [alertSeverity, setAlertSeverity] = useState('success');    


    const handleTagFilterChange = (tag, isChecked) => {
        setSelectedFilterTags(prev => isChecked ? [...prev, tag] : prev.filter(t => t !== tag));
    }

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
            onFilter(filteredPosts); 
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

    const isMobile = useIsMobileHook(750);
    const customStyle = {
        fontFamily: 'Arial, sans-serif',
        padding: '6px',
        margin: '0 2px',
        border: isMobile ? `1px solid ${colorConstants.purple.purple600}`
                            : 'none',
    }

    return(
        <S.Wrapper>
            <S.Content>
                {!isMobile && <S.Title>Categorias de Vídeos</S.Title>}
                <S.Options>
                    {tags.map((tag) => 
                        <S.Option key={tag} style={customStyle}>
                            <S.CheckboxInput
                                onChange={(e) => handleTagFilterChange(tag, e.target.checked)}
                                checked={selectedFilterTags.includes(tag)}
                            />
                            <S.Text>{tag}</S.Text>
                        </S.Option>
                    )}     
                </S.Options>       
                <S.Option style={{padding: '10px', justifySelf: 'center', gap: '12px'}}>
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
}