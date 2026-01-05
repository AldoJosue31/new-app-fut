import styled from "styled-components";
import { Device } from "../../styles/breakpoints";

export const ContentContainer = styled.div`
  min-height: 100vh;
  /* MOBILE DEFAULT */
  padding: 20px;
  /* Espacio extra arriba para que el botón del menú no tape el título */
  padding-top: 100px; 
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
  background-color: ${({ theme }) => theme.bgtotal};
  
  /* IMPORTANTE: width: 100% causa scroll horizontal si agregamos márgenes. 
     Usamos 'auto' para que ocupe el espacio disponible. */
  width: auto; 
  
  /* Transición suave para cuando cambia el layout */
  transition: all 0.3s ease;

  /* TABLET / DESKTOP */
  @media ${Device.tablet} {
    padding-top: 40px; /* Ya no necesitamos tanto espacio arriba */
    padding-left: 20px;
    padding-right: 20px;
    
    /* MARGEN DE SEGURIDAD PARA EL SIDEBAR (88px es el ancho del sidebar cerrado) */
    margin-left: 88px; 
    
    /* El ancho será el 100% menos el espacio del sidebar */
    width: calc(100% - 88px);
  }
`;