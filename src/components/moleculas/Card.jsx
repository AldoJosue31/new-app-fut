import styled from "styled-components";

export const Card = ({ children, width = "100%", maxWidth = "600px", className, ...props }) => {
  return (
<CardStyled 
      $width={width} 
      $maxWidth={maxWidth} 
      className={className} 
      {...props} // <--- ESTO ES LO QUE FALTABA: Pasa el onClick y otros eventos al div
    >
      {children}
    </CardStyled>
  );
};

const CardStyled = styled.div`
  background-color: ${({ theme }) => theme.bgcards};
  padding: 30px;
  border-radius: 16px;
  box-shadow: ${({ theme }) => theme.boxshadowGray};
  color: ${({ theme }) => theme.text};
  width: ${({ $width }) => $width};
  max-width: ${({ $maxWidth }) => $maxWidth};
  transition: all 0.3s ease;
`;