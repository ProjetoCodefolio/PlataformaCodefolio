import styled from 'styled-components';

export const Wrapper = styled.div`
  width: 100%;
  min-height: 100vh;
  overflow-x: hidden;
`;

export const WrapperModal = styled.div`
  width: 100%;
`;

export const WrapperContent = styled.div`
  width: 100%;
  padding: 0 16px;
  box-sizing: border-box;
`;

export const GridContainer = styled.div`
  display: grid;
  grid-template-columns: 250px minmax(0, 650px) 250px; // Aumentado de 600px para 650px
  gap: 20px;
  max-width: 1200px;
  margin: 0 auto;
  
  @media (max-width: 1200px) {
    grid-template-columns: 200px minmax(0, 1fr) 200px;
  }
  
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
`;

export const SidebarLeft = styled.div`
  @media (max-width: 900px) {
    display: none;
  }
`;

export const MainContent = styled.div`
  min-width: 0; // Importante para evitar overflow
  width: 100%;
`;

export const SidebarRight = styled.div`
  @media (max-width: 900px) {
    display: none;
  }
`;

export const CardWrapper = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;