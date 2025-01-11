import styled from "styled-components";
import { colorConstants, textStyles } from "../../../../constants/constantStyles";

export const Wrapper = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    @media(min-width: 600px) {
        width: 200px;
    }
`

export const Content = styled.div`
    @media(min-width: 600px) {
        padding: 24px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        border-radius: 10px;
    }
`;

export const Title = styled.p`
    margin: 0;
    font-size: ${textStyles.principal.h4.light.fontSize}px;
    font-weight: ${textStyles.principal.h4.light.fontWeight};
    line-height: ${textStyles.principal.h4.light.lineHeight}px;
`

export const Options = styled.div`
    display: flex;
    @media(min-width: 600px) {
        flex-direction: column;
    }
`

export const Option = styled.div`
    display: flex;
    align-items: center;
    border-radius: 10px;
    @media(min-width: 600px) {
        gap: 5px;
        padding-top: 12px;
    }
`

export const CheckboxInput = styled.input.attrs({ type: 'checkbox' })`
    width: 18px;
    height: 18px;
    margin-right: 8px;
    border-color: ${colorConstants.purple.purple600};
    accent-color: ${colorConstants.purple.purple600};
`;

export const Text = styled.p`
    margin: 0;
    font-size: ${textStyles.paragraph.p1.light.fontSize}px;
    font-weight: ${textStyles.paragraph.p1.light.fontWeight};
    line-height: ${textStyles.paragraph.p1.light.lineHeight}px;

    @media(min-width: 600px) {
        font-size: ${textStyles.paragraph.p1.medium.fontSize}px;
        font-weight: ${textStyles.paragraph.p1.medium.fontWeight};
        line-height: ${textStyles.paragraph.p1.medium.lineHeight}px;
    }
`

export const FilterButton = styled.button`
    display: flex;
    border: none;
    padding: 10px;
    border-radius: 10px;
    cursor: pointer;
    background-color: ${colorConstants.purple.purple600};
    color: ${colorConstants.white};
`