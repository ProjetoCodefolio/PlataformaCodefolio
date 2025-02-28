import styled from "styled-components";
import { colorConstants, textStyles } from "../../../../constants/constantStyles";

export const Wrapper = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    @media(min-width: 750px) {
        width: 250px; // Aumentado de 200px para 300px
    }
`

export const Content = styled.div`
    padding: 16px;
    background-color: #ffffff;
    border-radius: 12px;
    box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.1);
    max-width: 400px; // Aumentado de 350px para 400px
    width: 100%;
    box-sizing: border-box; // Evita que padding afete o tamanho total do card
`;
export const Title = styled.h6`
    margin: 0 0 16px 0;
    color: #333;
    font-weight: bold;
    text-align: center;
    font-size: 1.25rem;
`;

export const Options = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;



export const CheckboxInput = styled.input.attrs({ type: 'checkbox' })`
    min-width: 20px;
    width: 20px;
    height: 20px;
    margin-right: 8px;
    flex-shrink: 0; // Impede que o checkbox encolha
    border-color: ${colorConstants.purple.purple600};
    accent-color: ${colorConstants.purple.purple600};
`;

export const Text = styled.p`
    margin: 0;
    font-size: 14px;
    color: #333;
    font-weight: 500;
    white-space: nowrap; // Evita quebra de linha
    overflow: hidden; // Esconde o texto que ultrapassar
    text-overflow: ellipsis; // Adiciona ... quando o texto for muito grande
    flex: 1; // Permite que o texto ocupe o espaço disponível
`;

export const FilterButton = styled.button`
    width: 100%;
    padding: 8px 16px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    background-color: #9041c1;
    color: white;
    font-weight: 500;
    font-size: 14px;
    font-family: 'Roboto', sans-serif;
    transition: background-color 0.2s;

    &:hover {
        background-color: #7d37a7;
    }
`;

export const Option = styled.div`
    display: flex;
    align-items: center;
    padding: 8px;
    border-radius: 8px;
    width: calc(100% - 16px); // Reduz a largura do hover
    margin: 0 8px; // Adiciona margem para centralizar
    transition: background-color 0.2s;

    // Aplicar hover apenas quando não for container de botões
    &:not(:has(${FilterButton})):hover {
        background-color: rgba(144, 65, 193, 0.1);
    }
`;

export const ButtonContainer = styled.div`
    display: flex;
    gap: 8px;
    margin-top: 16px;

    ${FilterButton} {
        flex: 1;
    }
`;