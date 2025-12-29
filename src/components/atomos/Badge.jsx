import styled from "styled-components";

export const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  /* Lógica de colores basada en props */
  background: ${({ color, theme }) => color ? `${color}25` : theme.bg4}; /* 25 es transparencia hex */
  color: ${({ color, theme }) => color || theme.text};
  border: 1px solid ${({ color }) => color ? `${color}40` : 'transparent'};
`;