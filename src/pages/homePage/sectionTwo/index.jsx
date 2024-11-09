import * as S from "./styles";
import { BlackBox } from "../../../components/blackBox";

export const SectionTwo = () => {

    const content = <S.Text>
        O projeto Codefólio busca conectar a universidade e a comunidade através de ações educativas e colaborativas.
        <br />
        Ele se estrutura em três frentes:
        <br />
        <ul>
            <li>Uma plataforma digital para agregação de conteúdos produzidos por estudantes;</li>
            <li>Um programa de tutoria que promove a mentoria de alunos mais experientes aos iniciantes;</li>
            <li>Realização de workshops voltados para a comunidade</li>
        </ul>
        A iniciativa tem se mostrado eficaz na prática, com destaque para o uso de vídeos didáticos voltados à formação de professores do ensino básico.
        <br />
        Apesar do projeto ainda estar em desenvolvimento, seu objetivo futuro é ampliar o alcance junto aos docentes.
        <br />
        O Codefólio é um exemplo de extensão universitária bem-sucedida, promovendo a troca de saberes e fortalecendo laços entre a comunidade interna e externa.
    </S.Text>;
    return(
        <S.Wrapper id="sec2">
            <S.SubTitle>
                Nossas Iniciativas
            </S.SubTitle>
            <BlackBox content={content}/>
        </S.Wrapper>
    );
}