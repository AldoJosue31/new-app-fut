import React from 'react';
import styled from 'styled-components';
import { Title } from '../atomos/Title'; 

const HeaderContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  margin-bottom: 30px;
`;

// Nuevo contenedor interno para alinear todo al centro con el mismo ancho
const ContentWrapper = styled.div`
  width: 100%;
  max-width: ${(props) => props.$maxWidth || '100%'};
  margin: 0 auto; /* Centrado horizontal */
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const TopRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
`;

const ActionsContainer = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
`;

const TabsContainer = styled.div`
  width: 100%;
  margin-top: 10px;
`;

export const PageHeader = ({ title, children, tabs, maxWidth }) => {
  return (
    <HeaderContainer>
      <ContentWrapper $maxWidth={maxWidth}>
        <TopRow>
          <Title>{title}</Title>
          {children && <ActionsContainer>{children}</ActionsContainer>}
        </TopRow>
        
        {tabs && (
          <TabsContainer>
            {tabs}
          </TabsContainer>
        )}
      </ContentWrapper>
    </HeaderContainer>
  );
};