import styled from "styled-components";
import { colorConstants, textStyles } from "../../../constants/constantStyles";

export const Wrapper = styled.div`
    display: flex;
    flex-direction: column;
    color: ${colorConstants.white};
    background-color: ${colorConstants.purple.purple800};
    padding: 20px;
    gap: 20px;
    @media(min-width: 600px) {
        padding: 80px;
    }
`

export const SubTitle = styled.div`
    font-size: ${textStyles.principal.h2.light.fontSize}px;
    font-weight: ${textStyles.principal.h2.light.fontWeight};
    line-height: ${textStyles.principal.h2.light.lineHeight}px;
`

export const Text = styled.p`
    margin: 0;
    font-size: ${textStyles.paragraph.p1.bold.fontSize}px;
    font-weight: ${textStyles.paragraph.p1.bold.fontWeight};
    line-height: ${textStyles.paragraph.p1.bold.lineHeight}px;
`