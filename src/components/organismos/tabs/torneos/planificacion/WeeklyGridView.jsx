import React, { useMemo } from "react";
import styled, { keyframes, css } from "styled-components";
import { v } from "../../../../../index";
import { Device } from "../../../../../styles/breakpoints";
import { formatTimeTo12Hour } from "../../../../../utils/dateUtils";

export function WeeklyGridView({ weekStartDate, scheduledMatches, externalMatches = [], divisionActual, isConfirmed }) {
    
    // 1. Generar los 7 días de la semana
    const weekDays = useMemo(() => {
        if (!weekStartDate) return [];
        const start = new Date(weekStartDate + "T00:00:00");
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            // Formato YYYY-MM-DD local manual
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        });
    }, [weekStartDate]);

    // 2. Agrupar partidos por fecha
    const groupedMatches = useMemo(() => {
        const groups = {};

        const addToGroup = (dateKey, matchItem) => {
            if (!groups[dateKey]) groups[dateKey] = [];
            groups[dateKey].push(matchItem);
        };

        // Procesar partidos locales
        scheduledMatches.forEach(m => {
            if (m.date) {
                addToGroup(m.date, {
                    ...m,
                    division: divisionActual,
                    isExternal: false,
                    isPreview: !isConfirmed 
                });
            }
        });

        // Procesar partidos externos
        externalMatches.forEach(m => {
            // Aseguramos compatibilidad con ambas propiedades de fecha
            const dateKey = m.rawDate || m.date; 
            if (dateKey) {
                addToGroup(dateKey, {
                    id: m.id,
                    time: m.time,
                    local: { name: m.local_name || m.local },
                    visitante: { name: m.visitante_name || m.visitante },
                    // IMPORTANTE: Aseguramos que el nombre de la división llegue para el color
                    division: m.division_name || m.divisionName || "Otra",
                    isExternal: true,
                    isPreview: false
                });
            }
        });

        // Ordenar por hora
        Object.keys(groups).forEach(date => {
            groups[date].sort((a, b) => (a.time || "").localeCompare(b.time || ""));
        });

        return groups;
    }, [scheduledMatches, externalMatches, divisionActual, isConfirmed]);

    // Formateadores
    const formatMobileDay = (dateStr) => {
        const parts = dateStr.split('-');
        const date = new Date(parts[0], parts[1] - 1, parts[2]);
        return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    };

    const formatDesktopDay = (dateStr) => {
        const parts = dateStr.split('-');
        const date = new Date(parts[0], parts[1] - 1, parts[2]);
        return date.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit' });
    };

    return (
        <Container>
            <Legend>
               <div className="item"><span className="dot local"></span> {divisionActual || "Esta División"}</div>
               {externalMatches.length > 0 && <div className="item"><span className="dot external"></span> Otras Divisiones</div>}
            </Legend>

            <GridContainer>
                {weekDays.map(day => {
                    const matchesForDay = groupedMatches[day] || [];

                    return (
                        <DayWrapper key={day}>
                            <MobileHeader>{formatMobileDay(day)}</MobileHeader>
                            <DayColumn>
                                <DesktopHeader>{formatDesktopDay(day)}</DesktopHeader>
                                <MatchesList>
                                    {matchesForDay.map((m, idx) => (
                                        <MatchCard 
                                            key={m.id || `temp-${idx}`} 
                                            $isExternal={m.isExternal}
                                            $isPreview={m.isPreview}
                                            $divisionName={m.division} 
                                        >
                                            <div className="time-pill">{formatTimeTo12Hour(m.time)}</div>
                                            <div className="info">
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
                                    {matchesForDay.length === 0 && <EmptyState>Libre</EmptyState>}
                                </MatchesList>
                            </DayColumn>
                        </DayWrapper>
                    );
                })}
            </GridContainer>
        </Container>
    );
}

// --- ESTILOS ---
const pulseAnimation = keyframes`
  0% { opacity: 0.7; box-shadow: 0 0 0 rgba(0,0,0,0); }
  50% { opacity: 1; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
  100% { opacity: 0.7; box-shadow: 0 0 0 rgba(0,0,0,0); }
`;

const Container = styled.div`
    display: flex; flex-direction: column; gap: 10px; width: 100%; height: 100%;
    @media ${Device.laptop} {
        display: grid; grid-template-rows: auto 1fr; gap: 5px;
    }
`;

const Legend = styled.div`
    display: flex; gap: 15px; font-size: 0.75rem; font-weight: 700; 
    color: ${({theme})=>theme.text};
    padding-left: 5px; opacity: 0.8;
    .item { display: flex; align-items: center; gap: 5px; }
    .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
    .local { background: ${v.colorPrincipal}; }
    .external { background: ${({theme})=>theme.text}; opacity: 0.5; }
`;

const GridContainer = styled.div`
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
    font-size: 0.95rem; font-weight: 700; color: ${({theme})=>theme.text}; padding-left: 4px; text-transform: capitalize;
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

    background: ${({theme, $isExternal})=> $isExternal ? theme.bg4 : theme.bg2};
    border-left: 4px solid ${({ $isExternal }) => $isExternal ? 'transparent' : v.colorPrincipal};

    /* ESTILOS PREVIEW */
    ${({ $isPreview, theme }) => $isPreview && css`
        background: ${theme.bg4}; 
        border-left: 4px solid #95a5a6;
        border: 1px dashed #7f8c8d;
        animation: ${pulseAnimation} 2s infinite ease-in-out;
        .time-pill { background: #bdc3c7 !important; color: #2c3e50 !important; }
        .div-tag.local { color: #7f8c8d !important; }
    `}

    /* --- LÓGICA DE COLORES ORIGINAL RESTAURADA --- */
    ${({ $isExternal, $divisionName }) => $isExternal && `
        border-left-color: hsl(${($divisionName?.split('').reduce((a,c)=>a+c.charCodeAt(0),0) * 50) % 360}, 50%, 50%);
    `}
    /* --------------------------------------------- */

    .time-pill {
        font-weight: 800; font-size: 0.85rem; background: ${({theme})=>theme.bgtotal};
        padding: 4px 8px; border-radius: 4px; color: ${({theme})=>theme.text}; white-space: nowrap;
    }

    .info {
        display: flex; flex-direction: column; flex: 1; overflow: hidden;
        
        .div-tag { 
            font-size: 0.7rem; 
            text-transform: uppercase; font-weight: 800; margin-bottom: 2px;
            &.local { color: ${v.colorPrincipal}; }
            &.external { color: ${({theme})=>theme.text}; opacity: 0.7; }
        }

        .teams {
            display: flex; align-items: center; gap: 6px; font-size: 0.9rem; font-weight: 600; white-space: nowrap;
            color: ${({theme})=>theme.text};
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
    color: ${({theme})=>theme.text};
`;