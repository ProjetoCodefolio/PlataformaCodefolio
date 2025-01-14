import styled from "styled-components";

export const Wrapper = styled.div`
    display: flex;
    flex-direction: column;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    width: 100%;
    border-radius: 10px;
`

export const LineWrapper = styled.div`
    padding: 12px;
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
`

export const ProfileButton = styled.button`
    display: flex;
    border-radius: 50px;
    border: none;
    background-color: transparent;
    cursor: pointer;
    gap: 10px;
    align-items: center;
`