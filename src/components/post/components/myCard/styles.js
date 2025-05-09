import styled from "styled-components";

export const Wrapper = styled.div`
    display: flex;
    flex-direction: column;
    width: 99%;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    border-radius: 10px;
`

export const Line = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;    
    padding: 12px;
    gap: 12px;
    
    @media(min-width: 600px) {
        justify-content: space-between;    
    }
`