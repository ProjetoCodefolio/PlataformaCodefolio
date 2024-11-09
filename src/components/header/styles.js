import styled from "styled-components";
import { colorConstants, textStyles } from "../../constants/constantStyles";

export const Wrapper = styled.div`
    display: flex;
    padding: 20px;
    align-items: center;
    height: 60px;
    background-color: ${colorConstants.purple.purple600};
    justify-content: space-between;
    @media(min-width: 600px) {
        padding: 20px 40px; 
    }
`

export const Logo = styled.img`
    width: 100px;
    height: 50px;
`

export const Options = styled.div`
    display: flex;
    gap: 20px;

    & a{
        text-decoration: none;
    }
`

export const Text = styled.p`
    margin: 0;
    padding: 0;
    color: ${colorConstants.white};
    font-size: ${textStyles.paragraph.p1.bold.fontSize}px;
    font-weight: ${textStyles.paragraph.p1.bold.fontWeight};
    line-height: ${textStyles.paragraph.p1.bold.lineHeight}px;
`