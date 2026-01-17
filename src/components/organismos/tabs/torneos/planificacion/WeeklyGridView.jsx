import React, { useMemo } from "react";
import styled from "styled-components";
import { v } from "../../../../../index";
import { Device } from "../../../../../styles/breakpoints";

export function WeeklyGridView({ weekStartDate, scheduledMatches, externalMatches = [], divisionActual }) {
    
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
        // Ejemplo: "Lunes 16 de Octubre"
        const date = new Date(dateStr + "T00:00:00");
        return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    };

    const formatDesktopDay = (dateStr) => {
        // Ejemplo: "Lun 16"
        const date = new Date(dateStr + "T00:00:00");
        return date.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit' });
    };

    return (
        <Container>
            {weekDays.map(day => {
                // Filtrar partidos del día
                const currentDay = scheduledMatches.filter(m => m.date === day).map(m => ({...m, division: divisionActual}));
                const otherDay = externalMatches.filter(m => m.date.startsWith(day)).map(m => ({
                    time: m.date.split('T')[1].substring(0,5),
                    local: { name: m.team1.name },
                    visitante: { name: m.team2.name },
                    division: m.jornada.tournament.division.name,
                    isExternal: true
                }));
                
                // Unir y ordenar por hora
                const allMatches = [...currentDay, ...otherDay].sort((a,b) => a.time.localeCompare(b.time));

                return (
                    <DayWrapper key={day}>
                        {/* Cabecera visible solo en móvil */}
                        <MobileHeader>{formatMobileDay(day)}</MobileHeader>
                        
                        <DayColumn>
                            {/* Cabecera visible solo en escritorio */}
                            <DesktopHeader>{formatDesktopDay(day)}</DesktopHeader>
                            
                            <MatchesList>
                                {allMatches.map((m, idx) => (
                                    <MatchCard key={idx} $isExternal={m.isExternal}>
                                        <div className="time-pill">{m.time}</div>
                                        <div className="info">
                                            <span className="div-tag">{m.division}</span>
                                            <div className="teams">
                                                <span>{m.local.name}</span>
                                                <span className="vs">vs</span>
                                                <span>{m.visitante.name}</span>
                                            </div>
                                        </div>
                                    </MatchCard>
                                ))}
                                {allMatches.length === 0 && <EmptyState>Sin partidos</EmptyState>}
                            </MatchesList>
                        </DayColumn>
                    </DayWrapper>
                );
            })}
        </Container>
    );
}

// --- ESTILOS RESPONSIVOS ---

const Container = styled.div`
    display: flex;
    flex-direction: column; /* MÓVIL: Lista vertical (evita ancho excesivo) */
    gap: 15px;
    width: 100%;
    
    /* ESCRITORIO: Cuadrícula de 7 columnas */
    @media ${Device.laptop} {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 1px;
        background: ${({theme})=>theme.bg4};
        height: 100%;
        border-radius: 10px;
        overflow: hidden;
    }
`;

const DayWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 5px;
    width: 100%;

    @media ${Device.laptop} {
        gap: 0;
        height: 100%;
        min-width: 0; /* Previene desbordamiento en grid */
    }
`;

const MobileHeader = styled.div`
    font-size: 0.95rem;
    font-weight: 700;
    color: ${v.text};
    padding-left: 4px;
    text-transform: capitalize;
    
    @media ${Device.laptop} {
        display: none; /* Ocultar en escritorio */
    }
`;

const DesktopHeader = styled.div`
    display: none; /* Ocultar en móvil */
    
    @media ${Device.laptop} {
        display: block;
        background: ${({theme})=>theme.bg3};
        padding: 8px;
        text-align: center;
        font-weight: 700;
        font-size: 0.75rem;
        color: ${v.colorPrincipal};
        white-space: nowrap;
    }
`;

const DayColumn = styled.div`
    background: ${({theme})=>theme.bgtotal};
    border-radius: 8px;
    border: 1px solid ${({theme})=>theme.bg4};
    display: flex;
    flex-direction: column;
    min-height: 60px; /* Altura mínima para que se vea si está vacío */

    @media ${Device.laptop} {
        background: ${({theme})=>theme.bgcards};
        border-radius: 0;
        border: none;
        height: 100%;
    }
`;

const MatchesList = styled.div`
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;

    @media ${Device.laptop} {
        padding: 5px;
        overflow-y: auto; /* Scroll interno solo en escritorio */
        
        /* Personalizar scrollbar fina */
        &::-webkit-scrollbar { width: 4px; }
        &::-webkit-scrollbar-thumb { background: ${({theme})=>theme.bg4}; border-radius: 4px; }
    }
`;

const MatchCard = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    background: ${({theme, $isExternal})=> $isExternal ? theme.bg3 : theme.bg2};
    padding: 10px;
    border-radius: 6px;
    border-left: 3px solid ${({$isExternal})=> $isExternal ? 'gray' : v.colorPrincipal};
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);

    .time-pill {
        font-weight: 800;
        font-size: 0.85rem;
        background: ${({theme})=>theme.bgtotal};
        padding: 4px 8px;
        border-radius: 4px;
        color: ${v.text};
        white-space: nowrap;
    }

    .info {
        display: flex;
        flex-direction: column;
        flex: 1;
        overflow: hidden;
        
        .div-tag { 
            font-size: 0.65rem; 
            text-transform: uppercase; 
            font-weight: 800; 
            opacity: 0.6; 
            margin-bottom: 2px;
        }

        .teams {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.9rem;
            font-weight: 600;
            white-space: nowrap;
            
            span { overflow: hidden; text-overflow: ellipsis; }
            .vs { font-size: 0.75rem; opacity: 0.5; font-weight: 400; flex-shrink: 0; }
        }
    }

    /* ESTILO COMPACTO PARA ESCRITORIO */
    @media ${Device.laptop} {
        flex-direction: column;
        align-items: flex-start;
        gap: 6px;
        padding: 8px;
        
        .time-pill { font-size: 0.7rem; padding: 2px 6px; }
        
        .info {
            width: 100%;
            .teams {
                flex-direction: column;
                align-items: flex-start;
                gap: 2px;
                font-size: 0.75rem;
                line-height: 1.2;
                
                .vs { display: none; } /* Ocultar 'vs' para ahorrar espacio */
            }
        }
    }
`;

const EmptyState = styled.div`
    text-align: center;
    font-size: 0.8rem;
    opacity: 0.4;
    font-style: italic;
    padding: 10px;
`;