import { useNavigate } from "react-router-dom";
import * as S from "./styles";

export const SectionOne = () => {
    const navigate = useNavigate();

    const handleLogIn = () => {
      navigate('/login');
    }

    return(
        <S.Wrapper>
            <S.Title>
                Construindo Conhecimento
                <br />
                Documentando Competências
                <br />
                Disseminando Aprendizado.
            </S.Title>
            <S.Text>
                Acesse o Codefólio e faça parte dessa jornada!
            </S.Text>
            <S.LogInButton onClick={handleLogIn}>Log In</S.LogInButton>
        </S.Wrapper>
    );
}