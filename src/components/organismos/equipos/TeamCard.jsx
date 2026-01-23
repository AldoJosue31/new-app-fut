import React from "react";
import styled, { keyframes } from "styled-components";
import { RiPencilLine, RiDeleteBinLine, RiExchangeDollarLine } from "react-icons/ri";
import { v } from "../../../styles/variables";

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

export function TeamCard({ team, onEdit, onDelete, onTransfer, onView }) {
  return (
    <CardContainer onClick={() => onView(team)}>
      <div className="card-top" style={{ background: `linear-gradient(135deg, ${team.color}cc, ${team.color})` }}>
        <ActionButtons>
          <button className="btn-edit" onClick={(e) => { e.stopPropagation(); onEdit(team); }} title="Editar"><RiPencilLine /></button>
          <button className="btn-transfer" onClick={(e) => { e.stopPropagation(); onTransfer(team); }} title="Transferir"><RiExchangeDollarLine /></button>
          <button className="btn-delete" onClick={(e) => { e.stopPropagation(); onDelete(team.id); }} title="Eliminar"><RiDeleteBinLine /></button>
        </ActionButtons>
        <StatusBadge $active={team.status === 'Activo'}>
          {team.status}
        </StatusBadge>
        <LogoImg src={team.logo_url || "/logo_gen.png"} alt={team.name} />
      </div>
      <div className="card-body">
        <h3>{team.name}</h3>
        <div className="info-row"><v.iconoUser className="icon"/><span>{team.delegate_name || "Sin delegado"}</span></div>
        <div className="info-row"><span>📞 {team.contact_phone || "--"}</span></div>
      </div>
    </CardContainer>
  );
}

const CardContainer = styled.div`
    width: 250px; flex-shrink: 0; background-color: ${({theme})=> theme.bgtotal}; border: 1px solid ${({theme})=> theme.bg4};
    border-radius: 16px; overflow: hidden; transition: transform 0.2s, box-shadow 0.2s; display: flex; flex-direction: column; cursor: pointer;
    animation: ${fadeIn} 0.5s ease-out forwards;
    &:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.15); }
    .card-top { height: 110px; position: relative; display: flex; justify-content: center; align-items: flex-end; }
    .card-body { padding: 35px 15px 20px; text-align: center; flex: 1; 
        h3 { margin: 0 0 10px 0; color: ${({theme})=> theme.text}; font-size: 1.1rem; font-weight: 700; }
        .info-row { display: flex; align-items: center; justify-content: center; gap: 6px; color: ${({theme})=> theme.text}; opacity: 0.7; font-size: 0.85rem; margin-bottom: 6px; } }
`;

const LogoImg = styled.img`
    width: 85px; height: 85px; object-fit: contain; background-color: transparent; border: none;
    position: absolute; bottom: -25px; filter: drop-shadow(0 6px 6px rgba(0,0,0,0.3));
    transition: transform 0.3s; ${CardContainer}:hover & { transform: scale(1.1); }
`;

const ActionButtons = styled.div`
    position: absolute; top: 10px; left: 10px; display: flex; gap: 8px;
    button { width: 28px; height: 28px; border-radius: 50%; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 14px; transition: 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.2); color: white; }
    .btn-edit { background: rgba(255, 255, 255, 0.25); backdrop-filter: blur(4px); &:hover { background: ${({theme}) => theme.primary || v.colorPrincipal}; } }
    .btn-delete { background: rgba(0, 0, 0, 0.25); backdrop-filter: blur(4px); &:hover { background: #ff4757; } }
    .btn-transfer { background: rgba(0, 0, 0, 0.25); backdrop-filter: blur(4px); &:hover { background: #f39c12; } }
`;

const StatusBadge = styled.div`
    position: absolute; top: 10px; right: 10px;
    background: ${({$active}) => $active ? '#068d3eff' : '#ad1605ff'};
    color: white; font-size: 10px; padding: 4px 8px; border-radius: 10px; font-weight: 700; text-transform: uppercase; z-index: 2;
`;