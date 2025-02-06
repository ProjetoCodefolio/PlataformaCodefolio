import styled from "styled-components";
import { colorConstants, textStyles } from "../../../constants/constantStyles";

export const Wrapper = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    color: ${colorConstants.purple.purple750};
    box-sizing: border-box;
    padding: 20px;
    width: 100%;
    min-height: 60vh; 

    @media (min-width: 768px) {
        padding: 40px 80px;
        margin-top:0;
    }
`;

export const ContentContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    max-width: 1200px;

    @media (min-width: 768px) {
        flex-direction: row;
        justify-content: space-between;
    }
`;

export const TextContainer = styled.div`
    text-align: center;
    width: 100%;
    margin-bottom: 2rem;

    @media (min-width: 768px) {
        text-align: left;
        width: 50%;
        margin-bottom: 0;
    }
`;

export const MainTitle = styled.h1`
    font-family: "Arial Unicode MS", Arial, sans-serif;  /* Fonte Arial Unicode */
    font-weight: ${textStyles.principal.h1.bold.fontWeight};  /* Mantém o mesmo peso da fonte */
    margin-bottom: 1px;
    line-height: 1;
    font-size: 3.2rem;

    @media (min-width: 768px) {
        font-size: 6.5rem;
    }
`;

export const Title = styled.p`
    font-family: "Arial Unicode MS", Arial, sans-serif;  
    margin-top: 1rem;
    font-size: ${textStyles.paragraph.p1.medium.fontSize}px;
    font-weight: ${textStyles.principal.h1.bold.fontWeight}; 
    line-height: ${textStyles.paragraph.p1.larger.lineHeight}px;
    color: ${colorConstants.purple.purple750};
    margin-bottom: 1.5rem;

    @media (min-width: 768px) {
        font-size: ${textStyles.principal.h1.regular.fontSize}px;
        line-height: ${textStyles.principal.h1.bold.lineHeight}px;
    }
`;

export const Text = styled.p`
    font-family: "Arial Unicode MS", Arial, sans-serif;  
    margin-top: 1rem;
    font-size: ${textStyles.paragraph.p1.bold.fontSize}px;
    font-weight: ${textStyles.principal.h1.bold.fontWeight}; 
    line-height: ${textStyles.paragraph.p1.bold.lineHeight}px;
    color: ${colorConstants.purple.purple750};
`;

export const Button = styled.button`
    margin-top: 2rem;
    background-color: ${colorConstants.purple.purple750};
    color: ${colorConstants.white};
    font-family: "Arial Unicode MS", Arial, sans-serif;  
    font-size: 1rem;
    font-weight: bold;
    padding: 0.5rem 1rem;
    border-radius: 1.2rem;
    border: none;
    cursor: pointer;
    transition: background-color 0.3s;
    width: 10rem;
    height: 3rem;

    &:hover {
        background-color: ${colorConstants.purple.purple900};
    }
`;

export const ImageContainer = styled.div`
    width: 100%;
    display: flex;
    justify-content: center;
    margin-top: 1rem;
        margin-left: 56px;

    @media (min-width: 768px) {
        width: 50%;
        justify-content: flex-end;
    }

    img {
        width: 80%;
        max-width: 300px;
        height: auto;

        @media (min-width: 1024px) {
            max-width: 500px;
        }
    }
`;
