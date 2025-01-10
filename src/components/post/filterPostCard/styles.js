import styled from "styled-components";
import { colorConstants, textStyles } from "../../../constants/constantStyles";

export const Wrapper = styled.div`
    display: flex;
    flex-direction: column;
    width: 90%;
`

export const Content = styled.div`
    padding: 24px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    border-radius: 10px;
`;

export const Title = styled.p`
    margin: 0;
    font-size: ${textStyles.principal.h4.light.fontSize}px;
    font-weight: ${textStyles.principal.h4.light.fontWeight};
    line-height: ${textStyles.principal.h4.light.lineHeight}px;
`

export const Option = styled.div`
    display: flex;
    align-items: center;
    padding-top: 12px;
    gap: 5px;
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
    font-size: ${textStyles.paragraph.p1.medium.fontSize}px;
    font-weight: ${textStyles.paragraph.p1.medium.fontWeight};
    line-height: ${textStyles.paragraph.p1.medium.lineHeight}px;
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