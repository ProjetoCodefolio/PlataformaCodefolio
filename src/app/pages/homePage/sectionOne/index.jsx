import * as S from "./styles";
import React from "react";
import astronautaHeader from "$assets/img/astronautaheader.svg";

const SectionOne = () => {
    const codefolio = "<Codefólio/>";

    const scrollToSectionSeven = () => {
        const SectionSeven = document.getElementById('faq');
        if (SectionSeven) {
            const offset = -150; // Adjust this value as needed
            const bodyRect = document.body.getBoundingClientRect().top;
            const elementRect = SectionSeven.getBoundingClientRect().top;
            const elementPosition = elementRect - bodyRect;
            const offsetPosition = elementPosition + offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    };
    return (
        <S.Wrapper id="sectionOne">
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
                    <S.Button onClick={scrollToSectionSeven}>
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
