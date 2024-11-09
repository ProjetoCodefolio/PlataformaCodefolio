import styled from "styled-components";
import { colorConstants } from "../../constants/constantStyles";

export const Wrapper = styled.div`
    display: flex;
    flex-direction: column;
    padding: 40px;
    gap: 20px;
    border-radius: 10px;
    width: 60%;
    align-self: center;
    background-color: ${colorConstants.gray.gray900};
    box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    
    &:hover {
        box-shadow: 0px 10px 20px rgba(0, 0, 0, 0.2);
        transform: translateY(-5px);
    }
`;