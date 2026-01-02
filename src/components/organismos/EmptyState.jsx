import React from 'react';
import styled from 'styled-components';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  text-align: center;
  background-color: ${({ theme }) => theme.bg || 'transparent'};
  border-radius: 10px;
  border: 2px dashed ${({ theme }) => theme.textFade || '#ccc'};
  margin: 20px 0;
`;

const IconWrapper = styled.div`
  font-size: 40px;
  margin-bottom: 15px;
  color: ${({ theme }) => theme.primary || '#888'};
`;

const Title = styled.h3`
  margin: 0 0 10px 0;
  color: ${({ theme }) => theme.text};
`;

const Description = styled.p`
  color: ${({ theme }) => theme.textFade || '#888'};
  margin: 0 0 20px 0;
  max-width: 300px;
`;

export const EmptyState = ({ 
  icon = "📂", 
  title = "No hay datos", 
  description = "No se encontró información para mostrar aquí.", 
  actionComponent 
}) => {
  return (
    <Container>
      <IconWrapper>{icon}</IconWrapper>
      <Title>{title}</Title>
      <Description>{description}</Description>
      {actionComponent && <div>{actionComponent}</div>}
    </Container>
  );
};