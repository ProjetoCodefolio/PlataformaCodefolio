    import { useNavigate } from "react-router-dom";
    import Typography  from "@mui/material/Typography";
    import * as S from "./styles";
    import "../../../tailwind.css";
    import React from "react";

    import astronautaHeader from "../../../assets/img/astronautaheader.svg";

  const SectionOne = () => {
        const navigate = useNavigate();
        const handleLearnMore = () => {
            navigate("/learn-more");
        };

        return (
            <S.Wrapper >
                <div className="w-1/2 mr-16">
                    <Typography
                        variant="h1"
                        style={{ fontWeight: 'bold', width: '120%', marginBottom: '1px', fontSize:'10rem' }}
                    >
                        Codefólio
                    </Typography>
                    <S.Title >
                        Construindo Conhecimento
                        <br />
                        Documentando Competências
                        <br />
                        Disseminando Aprendizado
                    </S.Title>
                    <S.Text>
                        Acesse o Codefólio e faça parte dessa jornada!
                    </S.Text>
                    <button
                        onClick={handleLearnMore}
                        style={{
                            marginTop: '6.5rem',
                            backgroundColor: '#6B21A8',
                            color: '#FFFFFF',
                            fontSize: '1.2rem', 
                            fontWeight: 'bold', 
                            padding: '0.5rem 1rem',
                            borderRadius: '1.2rem',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'background-color 0.3s',
                            width: '13rem',
                            height: '3.4rem',
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#5A1996'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#6B21A8'}
                    >
                        SAIBA MAIS
                    </button>

                </div>
                <div className="w-1/2 flex justify-center">
                    <img
                        src={astronautaHeader}
                        alt="Codefólio Illustration"
                        className="w-3/4 max-w-sm object-contain"
                    />
                </div>
            </S.Wrapper>
        );
    };

export default SectionOne;