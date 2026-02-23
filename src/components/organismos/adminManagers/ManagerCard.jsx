import React from "react";
import styled from "styled-components";
import { Card } from "../../../index";
import { v } from "../../../styles/variables";
import { Device } from "../../../styles/breakpoints"; 
import { BiTrash, BiEditAlt } from "react-icons/bi"; // Añadido BiEditAlt

export const ManagerCard = ({ manager, onClick, onDelete, onEditAuth }) => {
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
          {/* NUEVO BOTÓN DE EDICIÓN */}
          <ActionButton
            className="edit"
            onClick={(e) => {
              e.stopPropagation();
              onEditAuth();
            }}
            title="Editar Credenciales (Correo/Contraseña)"
          >
            <BiEditAlt />
          </ActionButton>

          <ActionButton
            className="delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(manager.email);
            }}
            title="Eliminar"
          >
            <BiTrash />
          </ActionButton>
        </Actions>
      </CardContainer>
    </StyledCard>
  );
};

// --- STYLED COMPONENTS ---

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
    border-color: ${({ theme }) => theme.bg4}; 
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
  min-width: 60px; 
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
  color: ${({ theme }) => theme.colorSubtitle}; 
  word-break: break-all; 
`;

const LeagueBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background-color: ${v.rgbafondos}; 
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
  gap: 8px;
  
  @media ${Device.tablet} {
    margin-left: auto;
  }
`;

const ActionButton = styled.button`
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

  &.edit:hover {
    background: ${v.colorPrincipal}20; 
    color: ${v.colorPrincipal};
    opacity: 1;
    transform: scale(1.1);
  }

  &.delete:hover {
    background: ${v.rojo}20; 
    color: ${v.rojo};
    opacity: 1;
    transform: scale(1.1);
  }
`;