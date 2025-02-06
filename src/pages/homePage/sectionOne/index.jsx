import { useNavigate } from "react-router-dom";
import * as S from "./styles";
import "../../../tailwind.css";
import React from "react";
import astronautaHeader from "../../../assets/img/astronautaheader.svg";

const SectionOne = () => {
    const codefolio = "<Codefólio/>";
    const navigate = useNavigate();

    const handleLearnMore = () => {
        navigate("/learn-more");
    };

    return (
        <S.Wrapper>
            <S.ContentContainer>
                <S.TextContainer>
                    <S.MainTitle>
                        {codefolio}
                    </S.MainTitle>
                    <S.Title>
                        Construindo Conhecimento
                        <br />
                        Documentando Competências
                        <br />
                        Disseminando Aprendizado
                    </S.Title>
                    <S.Text>
                        Acesse o Codefólio e faça parte dessa jornada!
                    </S.Text>
                    <S.Button onClick={handleLearnMore}>
                        SAIBA MAIS
                    </S.Button>
                </S.TextContainer>
                <S.ImageContainer>
                    <img
                        src={astronautaHeader}
                        alt="Codefólio Illustration"
                        className="section-one-image"
                    />
                </S.ImageContainer>
            </S.ContentContainer>
        </S.Wrapper>
    );
};

export default SectionOne;
