import React, { useState, useEffect } from "react";
import styled, { keyframes, css } from "styled-components";
import { RiPencilLine, RiDeleteBinLine, RiExchangeDollarLine, RiTrophyLine, RiCheckboxCircleLine, RiCloseCircleLine } from "react-icons/ri";
import { v } from "../../../styles/variables";
import { DynamicTeamLogo } from "./DynamicTeamLogo";

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

export function TeamCard({ team, onEdit, onDelete, onTransfer, onView, isParticipating }) {
  // Estado para controlar qué badge mostrar
  const [showTournamentMode, setShowTournamentMode] = useState(false);

  // Efecto para alternar el badge cada 2.5 segundos (un poco más lento para apreciar la transición)
  useEffect(() => {
    let interval;
    if (isParticipating) {
        // Iniciamos mostrando el torneo para que se note que participa
        setShowTournamentMode(true);
        interval = setInterval(() => {
            setShowTournamentMode((prevMode) => !prevMode);
        }, 2500); 
    } else {
      setShowTournamentMode(false);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isParticipating]);

  const isActive = team.status === 'Activo';

  return (
    <CardContainer onClick={() => onView(team)}>
      <div className="card-top" style={{ background: `linear-gradient(135deg, ${team.color}cc, ${team.color})` }}>
        
        <ActionButtons>
          <button className="btn-edit" onClick={(e) => { e.stopPropagation(); onEdit(team); }} title="Editar"><RiPencilLine /></button>
          <button className="btn-transfer" onClick={(e) => { e.stopPropagation(); onTransfer(team); }} title="Transferir"><RiExchangeDollarLine /></button>
          <button className="btn-delete" onClick={(e) => { e.stopPropagation(); onDelete(team.id); }} title="Eliminar"><RiDeleteBinLine /></button>
        </ActionButtons>

        <BadgePosition>
            {/* Usamos un "Stack" para superponer los elementos y hacer fade entre ellos */}
            <BadgeStack>
                {/* Badge de ESTADO NORMAL */}
                <StatusBadge $visible={!showTournamentMode} $isActive={isActive}>
                    {isActive ? <RiCheckboxCircleLine size={11}/> : <RiCloseCircleLine size={11}/>}
                    <span>{team.status}</span>
                </StatusBadge>
                
                {/* Badge de TORNEO (Solo se renderiza si participa, se superpone al otro) */}
                {isParticipating && (
                    <TournamentBadge $visible={showTournamentMode}>
                        <RiTrophyLine size={11} />
                        <span>En Torneo</span>
                    </TournamentBadge>
                )}
            </BadgeStack>
        </BadgePosition>

        {/* CONTENEDOR DE LOGO DINÁMICO */}
        <LogoWrapper>
          {team.logo_url ? (
            <img src={team.logo_url} alt={team.name} />
          ) : (
            <DynamicTeamLogo 
              name={team.name} 
              color={team.color || "#000000"} 
              size="85px" 
            />
          )}
        </LogoWrapper>
      </div>
      
      <div className="card-body">
        <h3>{team.name}</h3>
        <div className="info-row"><v.iconoUser className="icon"/><span>{team.delegate_name || "Sin delegado"}</span></div>
        <div className="info-row"><span>📞 {team.contact_phone || "--"}</span></div>
      </div>
    </CardContainer>
  );
}

// --- STYLED COMPONENTS ---

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

// NUEVO: Un contenedor genérico para que tanto la imagen como el SVG tengan las mismas dimensiones y efectos
const LogoWrapper = styled.div`
    width: 85px; height: 85px; 
    position: absolute; bottom: -25px; 
    filter: drop-shadow(0 6px 6px rgba(0,0,0,0.3));
    transition: transform 0.3s; 
    
    ${CardContainer}:hover & { transform: scale(1.1); }

    img {
        width: 100%; height: 100%;
        object-fit: contain;
        background-color: transparent;
        border: none;
    }
`;

const ActionButtons = styled.div`
    position: absolute; top: 10px; left: 10px; display: flex; gap: 8px; z-index: 10;
    button { width: 28px; height: 28px; border-radius: 50%; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 14px; transition: 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.2); color: white; }
    .btn-edit { background: rgba(255, 255, 255, 0.25); backdrop-filter: blur(4px); &:hover { background: ${({theme}) => theme.primary || v.colorPrincipal}; } }
    .btn-delete { background: rgba(0, 0, 0, 0.25); backdrop-filter: blur(4px); &:hover { background: #ff4757; } }
    .btn-transfer { background: rgba(0, 0, 0, 0.25); backdrop-filter: blur(4px); &:hover { background: #f39c12; } }
`;

const BadgePosition = styled.div`
    position: absolute; top: 10px; right: 10px; z-index: 10;
`;

// Truco de CSS Grid para apilar elementos en el mismo espacio
const BadgeStack = styled.div`
    display: grid;
    grid-template-areas: "stack";
    /* Todos los hijos directos se colocarán en la misma área "stack" */
    > * { grid-area: stack; }
    align-items: center;
    justify-items: end;
`;

// Estilos base compartidos y lógica de transición suave
const sharedBadgeStyles = css`
    display: flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 20px;
    font-size: 10px; font-weight: 700; text-transform: uppercase; color: white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.15);
    
    /* LA CLAVE: Transición suave de 0.6s con curva bezier */
    transition: opacity 0.6s cubic-bezier(0.4, 0.0, 0.2, 1), 
                transform 0.6s cubic-bezier(0.4, 0.0, 0.2, 1),
                visibility 0.6s;

    /* Control de visibilidad basado en la prop $visible */
    opacity: ${({ $visible }) => ($visible ? 1 : 0)};
    /* Pequeño escalado y movimiento vertical para un efecto de "entrada/salida" */
    transform: ${({ $visible }) => ($visible ? 'translateY(0) scale(1)' : 'translateY(-5px) scale(0.95)')};
    /* visibility asegura que el elemento oculto no capture clicks */
    visibility: ${({ $visible }) => ($visible ? 'visible' : 'hidden')};
    pointer-events: ${({ $visible }) => ($visible ? 'auto' : 'none')};

    svg { flex-shrink: 0; }
`;

const StatusBadge = styled.div`
    ${sharedBadgeStyles}
    background: ${({ $isActive }) => ($isActive ? '#27ae60' : '#c0392b')};
`;

const TournamentBadge = styled.div`
    ${sharedBadgeStyles}
    background: linear-gradient(135deg, #f1c40f, #d35400);
    text-shadow: 0 1px 1px rgba(0,0,0,0.2);
`;