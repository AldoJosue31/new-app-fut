import styled from "styled-components";
import { Device } from "../../styles/breakpoints";

export const ContentContainer = styled.div`
  min-height: 100vh;
  padding: 20px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
  background-color: ${({ theme }) => theme.bgtotal};

  /* TUS AJUSTES DE RESPONSIVIDAD */
  padding-top: 80px; 

  @media ${Device.tablet} {
    padding-top: 20px;
  }
`;