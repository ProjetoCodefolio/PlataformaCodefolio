import styled from "styled-components";
import { colorConstants, textStyles } from "../../../constants/constantStyles";

export const Wrapper = styled.div`
    display: flex;
    flex-direction: column;
    color: ${colorConstants.white};
    box-sizing: border-box;
    padding: 20px;
    @media(min-width: 600px) {
        padding: 80px;
    }
`

export const LogInButton = styled.button`
    display: flex;
    width: 180px;
    height: 60px;
    margin: 120px 0;
    align-self: center;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid ${colorConstants.white};
    border-radius: 10px;
    color: ${colorConstants.white};
    font-size: ${textStyles.paragraph.p1.bold.fontSize}px;
    font-weight: ${textStyles.paragraph.p1.bold.fontWeight};
    line-height: ${textStyles.paragraph.p1.bold.lineHeight}px;
    cursor: pointer;
    transition: all 0.3s ease;
    
    &:hover {
        transform: scale(1.05);
    }
`;

export const Title = styled.p`
    font-size: ${textStyles.paragraph.p1.larger.fontSize}px;
    font-weight: ${textStyles.paragraph.p1.larger.fontWeight};
    line-height: ${textStyles.paragraph.p1.larger.lineHeight}px;
    @media(min-width: 600px){
        font-size: ${textStyles.principal.h1.bold.fontSize}px;
        font-weight: ${textStyles.principal.h1.bold.fontWeight};
        line-height: ${textStyles.principal.h1.bold.lineHeight}px;
    }
`

export const Text = styled.p`
    margin: 0;
    font-size: ${textStyles.paragraph.p1.bold.fontSize}px;
    font-weight: ${textStyles.paragraph.p1.bold.fontWeight};
    line-height: ${textStyles.paragraph.p1.bold.lineHeight}px;
`