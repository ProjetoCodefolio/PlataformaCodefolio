import * as S from "./styles";
import { BlackBox } from "../../../components/blackBox";

export const SectionThree = () => {

    const cards = [
        {
          title: 'Modelos Interpretaveis com Inteligência Artificial Explicável' +
            '(XAI) na Detecção de Intrusões em Redes Intra-Veiculares' +
            'Controller Area Network (CAN)',
          author: 'Felipe Dresch; Felipe Scherer'
        },
        {
          title: 'Codefólio: Construção de Portfólios e Compartilhamento de Conhecimentos através da Extensão Universitária',
          author: 'Felipe Dresch; Felipe Scherer, Nicolas Faria, Estefano Soares, Camilla Borchhardt, Silvio Quincozes, Williamson Silva',
        },
        {
          title: 'Artigo 3',
          author: 'Felipe Dresch; Felipe Scherer',
        },
        {
          title: 'Artigo 4',
          author: 'Felipe Dresch; Felipe Scherer',
        },
        {
          title: 'Artigo 5',
          author: 'Felipe Dresch; Felipe Scherer',
        }
      ];

    return (
        <S.Wrapper id="artigos">
            <S.BoxAlgn>
                {cards.slice(0,4).map((card, index)=>(
                    <BlackBox content={
                        <>
                            <S.Text>
                                {card.title}
                            </S.Text>
                            <S.Description>
                                {card.author}
                            </S.Description>
                        </>
                    }/>
                ))}
            </S.BoxAlgn>
            <BlackBox content={
                <>
                    <S.Text>
                        {cards[4].title}
                    </S.Text>
                    <S.Description>
                        {cards[4].author}
                    </S.Description>
                </>
            }/>
        </S.Wrapper>
    );
}