import styled from "styled-components";
import { colorConstants, textStyles } from "../../../constants/constantStyles";

export const Wrapper = styled.div`
    margin-top:0;  
    display: flex;
    flex-direction: column;
    color: ${colorConstants.whiteBackground};
    padding: 20px;
    gap: 20px;
    @media(min-width: 600px) {
        padding: 80px;
    }
`

export const BoxAlgn = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
    @media(min-width: 600px) {
        flex-direction: row;
    }
`

export const Text = styled.p`
    margin: 0;
    font-size: ${textStyles.paragraph.p1.bold.fontSize}px;
    font-weight: ${textStyles.paragraph.p1.bold.fontWeight};
    line-height: ${textStyles.paragraph.p1.bold.lineHeight}px;
`

export const Description = styled.p`
    margin: 0;
    font-size: ${textStyles.paragraph.p1.light.fontSize}px;
    font-weight: ${textStyles.paragraph.p1.light.fontWeight};
    line-height: ${textStyles.paragraph.p1.light.lineHeight}px;
`