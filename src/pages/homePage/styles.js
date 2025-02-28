import styled from "styled-components";
import { colorConstants } from "../../constants/constantStyles";

export const Wrapper = styled.div`
  width: 100%;
  overflow-x: hidden; /* Adiciona esta linha para evitar overflow horizontal */
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: ${colorConstants.whiteBackground};

  @media(min-width: 600px) {
    min-height: calc(100vh - 100px);
  }
`
