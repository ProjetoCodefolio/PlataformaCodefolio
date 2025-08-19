import { useState } from "react";
import Topbar from "$components/topbar/Topbar";
import Post from "$components/post/Post";
import * as S from "./styles";

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