import * as S from "./styles";
import logo from '../../assets/img/codefolio.png';

export const Header = ({idSecTwo, idSecThree}) => {
    return(
        <S.Wrapper>
            <S.Logo src={logo}/>
            <S.Options>
                <a href={idSecTwo}><S.Text>Iniciativas</S.Text></a>
                <a href={idSecThree}><S.Text>Artigos</S.Text></a>
            </S.Options>
        </S.Wrapper>
    );
}