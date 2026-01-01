import React from "react";
import styled from "styled-components";
import { Card } from "../../../index"; // Ajusta la ruta según tu estructura
import { v } from "../../../styles/variables";
import { BiTrash, BiUserCircle } from "react-icons/bi";

export const ManagerCard = ({ manager, onClick, onDelete }) => {
  return (
    <StyledCard maxWidth="100%" onClick={onClick}>
      <CardContent>
        <div className="left-section">
          <div className="avatar-container">
            {manager.avatar_url ? (
              <img src={manager.avatar_url} alt="avatar" />
            ) : (
              <v.iconoUser />
            )}
          </div>
          <div className="text-info">
            <h3>{manager.full_name || "Sin Nombre"}</h3>
            <span className="email">{manager.email}</span>
            {manager.leagues?.[0] ? (
              <span className="league-tag">
                <v.iconocorona /> {manager.leagues[0].name}
              </span>
            ) : (
              <span className="no-league-tag">Sin Liga Asignada</span>
            )}
          </div>
        </div>
        <div className="actions">
          <DeleteButton
            onClick={(e) => {
              e.stopPropagation();
              onDelete(manager.email);
            }}
            title="Eliminar"
          >
            <BiTrash />
          </DeleteButton>
        </div>
      </CardContent>
    </StyledCard>
  );
};

// --- STYLED COMPONENTS DEL CARD ---
const StyledCard = styled(Card)`
  cursor: pointer;
  transition: transform 0.2s;
  &:hover {
    transform: translateY(-3px);
    background-color: ${({ theme }) => theme.bg2};
  }
`;

const CardContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px;
  .left-section {
    display: flex;
    align-items: center;
    gap: 15px;
  }
  .avatar-container {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: ${({ theme }) => theme.bg3};
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }
  .text-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    h3 {
      font-size: 15px;
      font-weight: 700;
      margin: 0;
      color: ${({ theme }) => theme.text};
    }
    .email {
      font-size: 12px;
      opacity: 0.7;
    }
    .league-tag {
      font-size: 11px;
      color: ${({ theme }) => theme.primary};
      display: flex;
      align-items: center;
      gap: 4px;
      font-weight: 600;
      margin-top: 4px;
    }
    .no-league-tag {
      font-size: 11px;
      opacity: 0.5;
      font-style: italic;
      margin-top: 4px;
    }
  }
`;

const DeleteButton = styled.button`
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.text};
  opacity: 0.3;
  font-size: 18px;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  &:hover {
    background: ${v.rojo}20;
    color: ${v.rojo};
    opacity: 1;
  }
`;