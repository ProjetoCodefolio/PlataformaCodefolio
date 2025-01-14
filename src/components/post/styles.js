import styled from "styled-components";

export const Wrapper = styled.div`
    display: flex;
    flex-direction: column;
    width: 100vw;
    align-items: center;
`

export const WrapperModal = styled.div`
    display: flex;
    justify-content: center;
`

export const WrapperContent = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 12px;
    align-items: center;

    @media(min-width: 750px){
        flex-direction: row;
        align-items: flex-start;
        justify-content: center;
    }
`

export const CardWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    align-items: center;
`