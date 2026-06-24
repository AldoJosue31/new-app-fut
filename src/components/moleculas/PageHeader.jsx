import React from 'react';
import styled from 'styled-components';
import { Title } from '../atomos/Title';
import { v } from '../../styles/variables';

const HeaderContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  margin-bottom: ${(props) => props.$marginBottom || '30px'};
  transition: margin-bottom 0.3s ease;

  position: sticky;
  top: 0;
  z-index: 100;
  background-color: ${({ theme }) => theme.bgtotal || '#fff'};
  border-bottom: 1px solid ${({ theme }) => theme.bg3 || '#eee'};
  
  /* CAMBIO: Padding inferior a 0 para pegar los tabs al borde */
  padding: 0 20px;

  @media (max-width: 768px) {
    /* En móvil también quitamos el padding inferior */
    padding: 0 15px;
  }
`;

const ContentWrapper = styled.div`
  width: 100%;
  max-width: ${(props) => props.$maxWidth || '100%'};
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 0;
  /* Aseguramos que el wrapper ocupe altura completa si es necesario */
  padding-bottom: 0;
`;

const TopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  position: relative;
  height: 36px;
  min-height: 36px;
  /* Añadimos un pequeño margen bottom si NO hay tabs, pero si hay tabs, el gap del wrapper lo maneja */
`;

const LeftArea = styled.div`
  display: flex;
  align-items: center;
  z-index: 2;
`;

const CenterArea = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  width: auto;
  max-width: 60%;
  z-index: 1;
  
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  & > h1, & > div, & > span {
    display: block;
    transform: translateY(-1px);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin: 0;
    padding-bottom: 0;
    font-size: 24px;
    line-height: 1;
    
    @media (max-width: 768px) {
      font-size: 17px;
    }
  }
`;

const RightArea = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 2;
  margin-left: auto;
`;

const MenuButton = styled.div`
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  margin-left: -6px;
  border-radius: 50%;
  transition: background-color 0.2s;
  color: ${({ theme }) => theme.text};

  &:hover {
    background-color: ${({ theme }) => theme.bg3 || 'rgba(0,0,0,0.05)'};
  }

  svg {
    font-size: 22px;
  }

  @media (min-width: 768px) { 
    display: none; 
  }
`;

const TabsContainer = styled.div`
  width: 100%;
  margin-top: 0px;
`;

export const PageHeader = ({ title, children, tabs, maxWidth, marginBottom, state, setState }) => {
  return (
    <HeaderContainer $marginBottom={marginBottom}>
      <ContentWrapper $maxWidth={maxWidth}>
        <TopRow>
          <LeftArea>
            {setState && (
              <MenuButton onClick={() => setState(!state)}>
                <v.iconomenu />
              </MenuButton>
            )}
          </LeftArea>

          <CenterArea>
            <Title>{title}</Title>
          </CenterArea>

          {children && (
            <RightArea>
              {children}
            </RightArea>
          )}
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
