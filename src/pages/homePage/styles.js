import styled from "styled-components";
import { colorConstants } from "../../constants/constantStyles";

export const Wrapper = styled.section`
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background: linear-gradient(110deg, ${colorConstants.purple.purple600},  ${colorConstants.purple.purple800});

    @media(min-width: 600px) {
        min-height: calc(100vh - 100px);
    }
`
