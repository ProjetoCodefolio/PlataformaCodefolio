import styled from "styled-components";
import { colorConstants, textStyles } from "../../../constants/constantStyles";


export const Wrapper = styled.div`
    display: flex;
    color: ${colorConstants.purple.purple750};
    box-sizing: border-box;
    padding: 10px;
    @media(min-width: 600px) {
    padding: 80px;
    margin-left:5%;
`

export const Title = styled.p`
   
    margin-top: 0.5%;
    font-size: ${textStyles.paragraph.p1.medium.fontSize}px
    font-weight: ${textStyles.paragraph.p1.medium.fontWeight}; 
    line-height: ${textStyles.paragraph.p1.larger.lineHeight}px;
    @media(min-width: 600px){
        font-size: ${textStyles.principal.h1.regular.fontSize}px;
        font-weight: ${textStyles.principal.h1.bold.fontWeight};
        line-height: ${textStyles.principal.h1.bold.lineHeight}px;
    }
`

export const Text = styled.p`
    font-size: ${textStyles.paragraph.p1.bold.fontSize}px;
    font-weight: ${textStyles.paragraph.p1.bold.fontWeight};
    line-height: ${textStyles.paragraph.p1.bold.lineHeight}px;
`