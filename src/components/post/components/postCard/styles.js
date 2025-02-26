import styled from "styled-components";

export const Wrapper = styled.div`
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow: 0px 2px 8px rgba(0, 0, 0, 0.1);
  margin: 16px auto;
  padding: 12px; // Reduzido de 16px para 12px
  width: 94%; // Ajustado para 94%
  display: flex;
  flex-direction: column;
  margin-right: 12px; // Reduzido de 16px para 12px
`;

export const LineWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  
  &[style*="column"] {
    align-items: flex-start;
    gap: 12px; // Reduzido de 16px para 12px
  }

  /* Container do vídeo */
  & > div[style*="position: relative"] {
    width: 100% !important;
    margin: 12px auto !important; // Reduzido de 16px para 12px
  }
`;

export const ProfileButton = styled.div`
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 8px 0;
  border-radius: 8px;
  transition: background-color 0.2s;
  gap: 24px; // Aumentado de 12px para 24px para mais espaço entre foto e nome

  &:hover {
    background-color: rgba(144, 65, 193, 0.04);
  }
`;