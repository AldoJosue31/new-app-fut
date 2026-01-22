import React, { useMemo } from "react";
import styled, { keyframes, css } from "styled-components";
import { v } from "../../../../../index";
import { Device } from "../../../../../styles/breakpoints";
// Asegúrate de ajustar la ruta de importación
import { formatTimeTo12Hour } from "../../../../../utils/dateUtils";

export function WeeklyGridView({ weekStartDate, scheduledMatches, externalMatches = [], divisionActual, isConfirmed }) {
    
    // Generar los 7 días de la semana
    const weekDays = useMemo(() => {
        if (!weekStartDate) return [];
        const start = new Date(weekStartDate + "T00:00:00");
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            return d.toISOString().split('T')[0];
        });
    }, [weekStartDate]);

    // Formateadores de fecha
    const formatMobileDay = (dateStr) => {
        const date = new Date(dateStr + "T00:00:00");
        return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    };

    const formatDesktopDay = (dateStr) => {
        const date = new Date(dateStr + "T00:00:00");
        return date.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit' });
    };

    return (
        <Container>
            {weekDays.map(day => {
                // 1. Partidos de la División Actual (Editables / Principales)
                // Si la jornada NO está confirmada, estos son "Previsualizaciones/Borradores"
                const currentDay = scheduledMatches
                    .filter(m => m.date === day)
                    .map(m => ({
                        ...m, 
                        division: divisionActual,
                        isExternal: false,
                        // Flag para saber si es un borrador (preview)
                        isPreview: !isConfirmed 
                    }));
                
                // 2. Partidos de Otras Divisiones (Fantasmas / Solo lectura)
                const otherDay = externalMatches
                    .filter(m => m.date && m.date.startsWith(day))
                    .map(m => ({
                        time: m.time,
                        local: { name: m.team1.name },
                        visitante: { name: m.team2.name },
                        division: m.divisionName,
                        isExternal: true,
                        isPreview: false
                    }));
                
                // 3. Unir y ordenar cronológicamente (Usamos formato 24h para ordenar correctamente)
                const allMatches = [...currentDay, ...otherDay].sort((a,b) => a.time.localeCompare(b.time));

                return (
                    <DayWrapper key={day}>
                        <MobileHeader>{formatMobileDay(day)}</MobileHeader>
                        
                        <DayColumn>
                            <DesktopHeader>{formatDesktopDay(day)}</DesktopHeader>
                            
                            <MatchesList>
                                {allMatches.map((m, idx) => (
                                    <MatchCard 
                                        key={idx} 
                                        $isExternal={m.isExternal}
                                        $isPreview={m.isPreview}
                                        $divisionName={m.division}
                                    >
                                        {/* APLICADO AQUÍ: Visualización en formato 12h */}
                                        <div className="time-pill">{formatTimeTo12Hour(m.time)}</div>
                                        <div className="info">
                                            {/* Badge de División con color dinámico */}
                                            <span className={`div-tag ${m.isExternal ? 'external' : 'local'}`}>
                                                {m.division}
                                                {m.isPreview && " (Borrador)"}
                                            </span>
                                            
                                            <div className="teams">
                                                <span>{m.local?.name || 'Local'}</span>
                                                <span className="vs">vs</span>
                                                <span>{m.visitante?.name || 'Visita'}</span>
                                            </div>
                                        </div>
                                    </MatchCard>
                                ))}
                                {allMatches.length === 0 && <EmptyState>Libre</EmptyState>}
                            </MatchesList>
                        </DayColumn>
                    </DayWrapper>
                );
            })}
        </Container>
    );
}

// --- ANIMACIONES ---
const pulseAnimation = keyframes`
  0% { opacity: 0.7; box-shadow: 0 0 0 rgba(0,0,0,0); }
  50% { opacity: 1; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
  100% { opacity: 0.7; box-shadow: 0 0 0 rgba(0,0,0,0); }
`;

// --- ESTILOS RESPONSIVOS ---

const Container = styled.div`
    display: flex; flex-direction: column; gap: 15px; width: 100%; height: 100%;
    
    @media ${Device.laptop} {
        display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px;
        background: ${({theme})=>theme.bg4}; border-radius: 10px; overflow: hidden;
    }
`;

const DayWrapper = styled.div`
    display: flex; flex-direction: column; gap: 5px; width: 100%;
    @media ${Device.laptop} { gap: 0; height: 100%; min-width: 0; }
`;

const MobileHeader = styled.div`
    font-size: 0.95rem; font-weight: 700; color: ${v.text}; padding-left: 4px; text-transform: capitalize;
    @media ${Device.laptop} { display: none; }
`;

const DesktopHeader = styled.div`
    display: none;
    @media ${Device.laptop} {
        display: block; background: ${({theme})=>theme.bg3}; padding: 8px;
        text-align: center; font-weight: 700; font-size: 0.75rem; color: ${v.colorPrincipal};
    }
`;

const DayColumn = styled.div`
    background: ${({theme})=>theme.bgtotal}; border-radius: 8px; border: 1px solid ${({theme})=>theme.bg4};
    display: flex; flex-direction: column; min-height: 60px;
    @media ${Device.laptop} { background: ${({theme})=>theme.bgcards}; border: none; height: 100%; }
`;

const MatchesList = styled.div`
    padding: 10px; display: flex; flex-direction: column; gap: 8px; flex: 1;
    @media ${Device.laptop} {
        padding: 5px; overflow-y: auto;
        &::-webkit-scrollbar { width: 4px; }
        &::-webkit-scrollbar-thumb { background: ${({theme})=>theme.bg4}; border-radius: 4px; }
    }
`;

const MatchCard = styled.div`
    display: flex; align-items: center; gap: 12px;
    border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    transition: all 0.3s ease;

    /* Estilos Base (Confirmado o Normal) */
    background: ${({theme, $isExternal})=> $isExternal ? theme.bg3 : theme.bg2};
    opacity: ${({$isExternal}) => $isExternal ? 0.85 : 1};
    border-left: 4px solid ${({ $isExternal }) => $isExternal ? 'transparent' : v.colorPrincipal};

    /* ESTILOS PARA PREVIEW / BORRADOR (Lo que pidió el usuario) */
    ${({ $isPreview, theme }) => $isPreview && css`
        background: ${theme.bg4}; /* Fondo Gris */
        border-left: 4px solid #95a5a6; /* Borde Gris */
        border: 1px dashed #7f8c8d; /* Borde punteado para indicar borrador */
        animation: ${pulseAnimation} 2s infinite ease-in-out; /* Parpadeo suave */
        
        .time-pill {
            background: #bdc3c7 !important;
            color: #2c3e50 !important;
        }
        
        .div-tag.local {
            color: #7f8c8d !important;
        }
    `}

    /* Colores dinámicos para externos si no es preview */
    ${({ $isExternal, $divisionName }) => $isExternal && `
        border-left-color: hsl(${($divisionName?.split('').reduce((a,c)=>a+c.charCodeAt(0),0) * 50) % 360}, 70%, 50%);
    `}

    .time-pill {
        font-weight: 800; font-size: 0.85rem; background: ${({theme})=>theme.bgtotal};
        padding: 4px 8px; border-radius: 4px; color: ${v.text}; white-space: nowrap;
    }

    .info {
        display: flex; flex-direction: column; flex: 1; overflow: hidden;
        
        .div-tag { 
            font-size: 0.65rem; text-transform: uppercase; font-weight: 800; margin-bottom: 2px;
            &.local { color: ${v.colorPrincipal}; }
            &.external { color: gray; }
        }

        .teams {
            display: flex; align-items: center; gap: 6px; font-size: 0.9rem; font-weight: 600; white-space: nowrap;
            span { overflow: hidden; text-overflow: ellipsis; }
            .vs { font-size: 0.75rem; opacity: 0.5; font-weight: 400; flex-shrink: 0; }
        }
    }

    @media ${Device.laptop} {
        flex-direction: column; align-items: flex-start; gap: 6px; padding: 8px;
        .time-pill { font-size: 0.7rem; padding: 2px 6px; }
        .info {
            width: 100%;
            .teams { flex-direction: column; align-items: flex-start; gap: 2px; font-size: 0.75rem; line-height: 1.2; .vs { display: none; } }
        }
    }
`;

const EmptyState = styled.div`
    text-align: center; font-size: 0.8rem; opacity: 0.4; font-style: italic; padding: 10px;
`;