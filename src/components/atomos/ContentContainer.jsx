import styled from "styled-components";
import { Device } from "../../styles/breakpoints";

export const ContentContainer = styled.div`
  min-height: 100vh;
  /* MOBILE DEFAULT */
  padding: 20px;
  /* Espacio extra arriba para que el botón del menú no tape el título en móvil */
  padding-top: 100px; 
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
  background-color: ${({ theme }) => theme.bgtotal};
  
  /* IMPORTANTE: En móvil ocupamos todo el ancho disponible */
  width: 100%; 
  
  /* Transición suave */
  transition: all 0.3s ease;

  /* TABLET / DESKTOP */
  @media ${Device.tablet} {
    padding-top: 40px;
    padding-left: 20px;
    padding-right: 20px;
    
    /* CORRECCIÓN: */
    /* Eliminamos margin-left y el calc de width porque App.jsx ya usa CSS Grid */
    /* El contenedor padre (contentRouters) ya está ubicado a la derecha del sidebar */
    
    margin-left: 0; 
    width: 100%; 
  }
`;