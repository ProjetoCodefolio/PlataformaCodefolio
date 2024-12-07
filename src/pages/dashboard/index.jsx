import { useState } from "react";
import Topbar from "../../components/topbar/Topbar";
import * as S from "./styles";
import Post from "../../components/post/Post";

const Dashboard = () => {
    const [searchTerm, setSearchTerm] = useState("");

    const handleSearch = (term) => {
        setSearchTerm(term);
    };

    return (
        <S.Wrapper>
            <Topbar onSearch={handleSearch}/>
            <S.PageContentWrapper>
                <Post searchTerm={searchTerm}/>
            </S.PageContentWrapper>
        </S.Wrapper>
    );
}

export default Dashboard;