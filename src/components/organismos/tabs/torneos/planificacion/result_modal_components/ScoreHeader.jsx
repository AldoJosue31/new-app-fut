// src/components/organismos/tabs/torneos/planificacion/result_modal_components/ScoreHeader.jsx
import React from "react";
import styled from "styled-components";
import { v } from "../../../../../../index";
import { DynamicTeamLogo } from "../../../../equipos/DynamicTeamLogo";

// Función auxiliar para convertir hora de 24h a 12h (AM/PM)
const formatTimeAMPM = (timeStr) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    let hours = parseInt(h, 10);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    return `${hours}:${m} ${ampm}`;
};

export const ScoreHeader = ({ match, goalsLocal, goalsVisit, divisionName, displayDate, displayTime, isWalkover, isDoubleWalkover }) => {
    
    const timeAMPM = formatTimeAMPM(displayTime);
    const dateDisplay = isDoubleWalkover
        ? 'Doble W.O.'
        : isWalkover 
        ? 'Victoria Default (W.O.)'
        : (displayDate ? `${displayDate} - ${timeAMPM}` : 'Sin fecha');

    return (
        <Container>
            {/* EQUIPO LOCAL */}
            <TeamBlock $isLocal={true}>
                <LogoWrapper>
                    {match.local?.logo_url ? (
                        <img src={match.local.logo_url} alt="L" />
                    ) : (
                        <DynamicTeamLogo name={match.local?.name || "Local"} color={match.local?.color || "#000000"} size="100%" />
                    )}
                </LogoWrapper>
                <h3>{match.local?.name}</h3>
            </TeamBlock>

            {/* BLOQUE CENTRAL (División, Marcador, Fecha) */}
            <CenterBlock>
                <span className="meta-top">{divisionName}</span>
                <div className="score-wrapper">
                    <span className="score">{goalsLocal}</span>
                    <span className="vs">-</span>
                    <span className="score">{goalsVisit}</span>
                </div>
                <span className="meta-bottom">{dateDisplay}</span>
            </CenterBlock>

            {/* EQUIPO VISITANTE */}
            <TeamBlock $isLocal={false}>
                <LogoWrapper>
                    {match.visitante?.logo_url ? (
                        <img src={match.visitante.logo_url} alt="V" />
                    ) : (
                        <DynamicTeamLogo name={match.visitante?.name || "Visitante"} color={match.visitante?.color || "#000000"} size="100%" />
                    )}
                </LogoWrapper>
                <h3>{match.visitante?.name}</h3>
            </TeamBlock>
        </Container>
    );
};

// --- ESTILOS ---
const Container = styled.div` 
    display: flex; 
    justify-content: space-between;
    align-items: center;
    padding: 15px 20px; 
    background: ${({theme})=>theme.bg3}; 
    border-radius: 12px; 
    border: 1px solid ${({theme})=>theme.bg4}; 
    gap: 15px;

    @media (max-width: 500px) {
        padding: 12px 10px;
        gap: 8px;
    }
`;

const TeamBlock = styled.div` 
    display: flex; 
    align-items: center; 
    gap: 12px; 
    flex: 1; 
    flex-direction: ${({$isLocal}) => $isLocal ? 'row' : 'row-reverse'}; 
    min-width: 0; 
    
    h3 { 
        font-size: 0.9rem; 
        margin: 0;
        text-align: ${({$isLocal}) => $isLocal ? 'left' : 'right'}; 
        overflow: hidden; 
        text-overflow: ellipsis; 
        white-space: nowrap; 
    } 

    @media (max-width: 500px) {
        flex-direction: column; /* En móvil, apilamos el escudo sobre el nombre */
        gap: 6px; 
        
        h3 { 
            font-size: 0.7rem; 
            text-align: center; 
            /* Permite hasta 2 líneas de texto si el nombre es largo en móvil */
            white-space: normal; 
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            line-height: 1.1;
        }
    }
`;

// Wrapper para forzar que la imagen y el componente DynamicTeamLogo mantengan su tamaño exacto
const LogoWrapper = styled.div`
    width: 45px;
    height: 45px;
    flex-shrink: 0;
    display: flex;
    justify-content: center;
    align-items: center;

    img { 
        width: 100%; 
        height: 100%; 
        object-fit: contain; 
    }

    @media (max-width: 500px) {
        width: 35px;
        height: 35px;
    }
`;

const CenterBlock = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-width: 120px;
    gap: 4px;

    .meta-top {
        font-size: 0.75rem;
        font-weight: 800;
        color: ${({theme})=>theme.text};
        opacity: 0.5;
        text-transform: uppercase;
        letter-spacing: 1px;
    }

    .score-wrapper {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;

        .score { 
            font-size: 2.2rem; 
            font-weight: 800; 
            color: ${v.colorPrincipal}; 
            line-height: 1;
        }
        .vs {
            font-size: 1.2rem;
            font-weight: 700;
            opacity: 0.3;
        }
    }

    .meta-bottom {
        font-size: 0.75rem;
        font-weight: 700;
        opacity: 0.8;
        color: ${v.colorPrincipal};
        text-align: center;
    }

    @media (max-width: 500px) {
        min-width: 90px;
        
        .score-wrapper .score { font-size: 1.8rem; }
        .score-wrapper .vs { font-size: 1rem; }
        .meta-top { font-size: 0.65rem; }
        .meta-bottom { font-size: 0.65rem; }
    }
`;
