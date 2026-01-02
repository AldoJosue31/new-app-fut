import React from "react";
import styled from "styled-components";
import { Card } from "../../../index";
import { v } from "../../../styles/variables";
import { Device } from "../../../styles/breakpoints"; // Importamos los breakpoints
import { BiTrash } from "react-icons/bi";

export const ManagerCard = ({ manager, onClick, onDelete }) => {
  return (
    <StyledCard onClick={onClick}>
      <CardContainer>
        <InfoGroup>
          <AvatarContainer>
            {manager.avatar_url ? (
              <img src={manager.avatar_url} alt="avatar" />
            ) : (
              <v.iconoUser />
            )}
          </AvatarContainer>
          
          <TextContainer>
            <Name>{manager.full_name || "Sin Nombre"}</Name>
            <Email>{manager.email}</Email>
            
            {manager.leagues?.[0] ? (
              <LeagueBadge>
                <v.iconocorona /> {manager.leagues[0].name}
              </LeagueBadge>
            ) : (
              <NoLeagueBadge>Sin Liga Asignada</NoLeagueBadge>
            )}
          </TextContainer>
        </InfoGroup>

        <Actions>
          <DeleteButton
            onClick={(e) => {
              e.stopPropagation();
              onDelete(manager.email);
            }}
            title="Eliminar"
          >
            <BiTrash />
          </DeleteButton>
        </Actions>
      </CardContainer>
    </StyledCard>
  );
};

// --- STYLED COMPONENTS MEJORADOS ---

const StyledCard = styled(Card)`
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid transparent;
  background-color: ${({ theme }) => theme.bgcards};
  border-radius: ${v.borderRadius};
  width: 100%;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: ${v.boxshadowGray};
    border-color: ${({ theme }) => theme.bg4}; // Borde sutil al hacer hover
    background-color: ${({ theme }) => theme.bg2};
  }
`;

const CardContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: ${v.mdSpacing};
  gap: ${v.mdSpacing};
  position: relative;

  // En pantallas Tablet o superiores, cambiamos a fila
  @media ${Device.tablet} {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    text-align: left;
  }
`;

const InfoGroup = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${v.mdSpacing};
  width: 100%;

  @media ${Device.tablet} {
    flex-direction: row;
    width: auto;
  }
`;

const AvatarContainer = styled.div`
  width: 60px;
  height: 60px;
  min-width: 60px; // Evita que se aplaste
  border-radius: 50%;
  background: ${({ theme }) => theme.bg3};
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  font-size: 24px;
  color: ${({ theme }) => theme.text};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const TextContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;

  @media ${Device.tablet} {
    align-items: flex-start;
  }
`;

const Name = styled.h3`
  font-size: 16px;
  font-weight: 700;
  margin: 0;
  color: ${({ theme }) => theme.text};
  text-align: center;
  
  @media ${Device.tablet} {
    text-align: left;
  }
`;

const Email = styled.span`
  font-size: 13px;
  color: ${({ theme }) => theme.colorSubtitle}; // Usando variable del theme
  word-break: break-all; // Evita desbordes si el email es largo
`;

const LeagueBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background-color: ${v.rgbafondos}; // Fondo suave usando variable
  color: ${v.colorselector};
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  margin-top: 6px;
`;

const NoLeagueBadge = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.text};
  opacity: 0.5;
  font-style: italic;
  margin-top: 6px;
  background-color: ${({ theme }) => theme.bg4};
  padding: 4px 8px;
  border-radius: 4px;
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  
  // Posicionamiento absoluto en mobile para ahorrar espacio o relativo en desktop
  @media ${Device.tablet} {
    margin-left: auto;
  }
`;

const DeleteButton = styled.button`
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.text};
  opacity: 0.5;
  font-size: 20px;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: ${v.rojo}20; // Rojo con transparencia
    color: ${v.rojo};
    opacity: 1;
    transform: scale(1.1);
  }
`;