import React from "react";
import styled from "styled-components";
import { RiCalendarEventLine, RiLock2Line, RiLockUnlockLine } from "react-icons/ri";
import { v } from "../../../../../styles/variables";
import { formatDateWithWeekday, formatTimeTo12Hour } from "../../../../../utils/dateUtils";

export const FixtureMatchCard = ({ 
    match, 
    canDragMatch = true,
    onDragStart, 
    onDragOver, 
    onDrop, 
    onTeamDragStart,
    onTeamDrop,
    toggleLock, 
    isConflict,
    selectedTeamId,
    onTeamClick
}) => {
    // Determinar si algún equipo de este partido está seleccionado globalmente
    const isLocalSelected = selectedTeamId && match.local.id === selectedTeamId;
    const isVisitSelected = selectedTeamId && match.visitante.id === selectedTeamId;
    const isHighlighted = isLocalSelected || isVisitSelected;

    const isByeMatch = match.visitante.id === 'BYE' || match.local.id === 'BYE';

    return (
        <CardContainer
            draggable={canDragMatch}
            onDragStart={(e) => onDragStart(e, match)}
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, match)}
            $isLocked={match.locked}
            $isConflict={isConflict}
            $isBye={isByeMatch}
            $isHighlighted={isHighlighted}
            $canDragMatch={canDragMatch}
        >
            <LockIcon
                type="button"
                disabled={match.roundLocked}
                title={match.scanLocked ? "Desbloquear partido escaneado" : match.locked ? "Desbloquear partido" : "Bloquear partido"}
                aria-label={match.scanLocked ? "Desbloquear partido escaneado" : match.locked ? "Desbloquear partido" : "Bloquear partido"}
                onClick={(e) => { e.stopPropagation(); toggleLock(match); }}
            >
                {match.locked ? <RiLock2Line /> : <RiLockUnlockLine className="unlock" />}
            </LockIcon>
            
            <TeamsRow>
                <TeamName 
                    $align="left" 
                    $isSelected={isLocalSelected}
                    $draggable={!match.locked && !match.roundLocked}
                    draggable={!match.locked && !match.roundLocked}
                    onDragStart={(e) => onTeamDragStart(e, match, "local")}
                    onDragOver={(e) => {
                        if (!match.locked && !match.roundLocked) {
                            e.preventDefault();
                            e.stopPropagation();
                            e.dataTransfer.dropEffect = "move";
                        }
                    }}
                    onDrop={(e) => onTeamDrop(e, match, "local")}
                    onClick={(e) => { e.stopPropagation(); onTeamClick(match.local.id); }}
                    title={match.local.name}
                >
                    {match.local.name}
                </TeamName>
                
                <VersusBadge $isBye={isByeMatch}>
                    {isByeMatch ? 'DESCANSA' : 'VS'}
                </VersusBadge>
                
                {/* Si es BYE, no lo hacemos clickeable para filtrar, o sí, dependiendo de preferencia. 
                    Normalmente BYE no es un equipo real, así que evitamos click en él */}
                <TeamName 
                    $align="right" 
                    $isSelected={isVisitSelected}
                    $isBye={match.visitante.id === 'BYE'}
                    $draggable={!match.locked && !match.roundLocked}
                    draggable={!match.locked && !match.roundLocked}
                    onDragStart={(e) => onTeamDragStart(e, match, "visitante")}
                    onDragOver={(e) => {
                        if (!match.locked && !match.roundLocked) {
                            e.preventDefault();
                            e.stopPropagation();
                            e.dataTransfer.dropEffect = "move";
                        }
                    }}
                    onDrop={(e) => onTeamDrop(e, match, "visitante")}
                    onClick={(e) => { 
                        if(match.visitante.id !== 'BYE') {
                            e.stopPropagation(); 
                            onTeamClick(match.visitante.id);
                        }
                    }}
                    title={match.visitante.name}
                >
                    {match.visitante.name}
                </TeamName>
            </TeamsRow>
            {match.scanScheduleAccepted && match.scannedDate && match.scannedTime && (
                <ScannedSchedule>
                    <RiCalendarEventLine />
                    <span>{formatDateWithWeekday(match.scannedDate)}</span>
                    <strong>{formatTimeTo12Hour(match.scannedTime)}</strong>
                </ScannedSchedule>
            )}
        </CardContainer>
    );
};

// --- STYLES ---

const CardContainer = styled.div`
    background: ${({ theme, $isConflict, $isLocked, $isBye, $isHighlighted }) => {
        if ($isHighlighted) return `${v.colorPrincipal}20`; // Prioridad al highlight
        if ($isConflict) return `${v.colorError}15`;
        if ($isLocked) return theme.bg3; // Grisaceo para locked
        if ($isBye) return theme.bg; // Fondo más suave para descansos
        return theme.bg2;
    }};
    border: 2px solid ${({ $isConflict, $isLocked, $isHighlighted }) => {
        if ($isHighlighted) return v.colorPrincipal; // Borde fuerte si está seleccionado
        if ($isConflict) return v.colorError;
        if ($isLocked) return `${v.colorPrincipal}50`;
        return 'transparent';
    }};
    border-radius: 8px;
    padding: 10px;
    cursor: ${({ $canDragMatch }) => ($canDragMatch ? "grab" : "default")};
    position: relative;
    box-shadow: ${({ $isHighlighted }) => $isHighlighted ? '0 0 10px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.05)'};
    user-select: none;
    transition: all 0.2s ease;
    
    /* Escalar ligeramente si está seleccionado para que destaque */
    transform: ${({ $isHighlighted }) => $isHighlighted ? 'scale(1.02)' : 'scale(1)'};
    z-index: ${({ $isHighlighted }) => $isHighlighted ? '10' : '1'};

    &:active {
        cursor: ${({ $canDragMatch }) => ($canDragMatch ? "grabbing" : "default")};
        transform: scale(1.03);
        z-index: 20;
    }
    &:hover { border-color: ${({theme, $isHighlighted}) => $isHighlighted ? v.colorPrincipal : theme.textFade}; }

    .unlock { opacity: 0; transition: opacity 0.2s; }
    &:hover .unlock { opacity: 0.5; }
`;

const TeamsRow = styled.div`
    display: flex; justify-content: space-between; align-items: center; width: 100%; gap: 8px;
`;

const TeamName = styled.div`
    flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    font-weight: ${({ $isSelected }) => $isSelected ? '800' : '500'};
    color: ${({ theme, $isSelected, $isBye }) => {
        if ($isBye) return theme.textFade; // Color apagado para texto 'BYE'
        if ($isSelected) return v.colorPrincipal;
        return theme.text;
    }};
    text-align: ${props => props.$align}; 
    font-size: 0.85rem;
    cursor: ${({ $draggable, $isBye }) => {
        if ($draggable) return "grab";
        return $isBye ? "default" : "pointer";
    }};
    padding: 2px 4px; border-radius: 4px;

    &:hover {
        background: ${({ $isBye, theme }) => $isBye ? 'transparent' : theme.bg3};
    }

    &:active {
        cursor: ${({ $draggable, $isBye }) => {
            if ($draggable) return "grabbing";
            return $isBye ? "default" : "pointer";
        }};
    }
`;

const VersusBadge = styled.span`
    font-size: ${({ $isBye }) => $isBye ? '0.6rem' : '0.65rem'};
    font-weight: 800; 
    color: ${({ theme, $isBye }) => $isBye ? theme.textFade : theme.textFade}; 
    text-transform: uppercase;
    background: ${({theme}) => theme.bg3};
    padding: 2px 6px; border-radius: 4px;
`;

const LockIcon = styled.button`
    position: absolute; top: -8px; right: -8px; 
    width: 24px; height: 24px; background: ${({theme}) => theme.bg}; border-radius: 50%;
    border: 0; padding: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; color: ${v.colorPrincipal}; 
    box-shadow: 0 2px 5px rgba(0,0,0,0.15);
    cursor: pointer; z-index: 15;
    transition: transform 0.2s;
    &:hover { transform: scale(1.1); }
    &:disabled { cursor: default; }
    &:disabled:hover { transform: none; }
    &:focus-visible { outline: 3px solid ${v.colorPrincipal}44; outline-offset: 2px; }
`;

const ScannedSchedule = styled.div`
    display:flex;align-items:center;justify-content:center;gap:6px;margin-top:7px;padding-top:7px;border-top:1px solid ${({theme})=>theme.bg4};color:${({theme})=>theme.textFade};font-size:.72rem;
    svg{color:${v.colorPrincipal};flex-shrink:0;}strong{color:${({theme})=>theme.text};font-size:.72rem;}
`;
