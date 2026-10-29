import React, { useMemo } from "react";
import styled from "styled-components";
import { v } from "../../../../../styles/variables";
import { Device } from "../../../../../styles/breakpoints";
import { formatTimeTo12Hour } from "../../../../../utils/dateUtils";
import {
    DIVISION_COLORS,
    buildDivisionColorMap,
    normalizeDivisionName,
} from "../../../../../utils/divisionColors";

function WeeklyMatchCard({ match, day }) {
    const homeName = match.local?.name || 'Local';
    const awayName = match.visitante?.name || 'Visita';
    const hasResult = [match.goals1, match.goals2].every((score) =>
        score !== null && score !== undefined && String(score).trim() !== '' &&
        Number.isInteger(Number(score)) && Number(score) >= 0
    );
    const homeScore = hasResult ? Number(match.goals1) : '—';
    const awayScore = hasResult ? Number(match.goals2) : '—';

    return (
        <MatchCard $isPreview={match.isPreview} $isExternal={match.isExternal} $divisionColor={match.divisionColor}>
            {match.isExternal && <span className="sr-only">Partido de otra división.</span>}
            <div className="match-header">
                <div className="kickoff">
                    <time className={match.time ? undefined : 'unscheduled'} dateTime={match.time ? `${day}T${match.time}` : undefined}>
                        {match.time ? formatTimeTo12Hour(match.time) : 'Sin horario'}
                    </time>
                    {match.isPreview && <span className="draft-label">Borrador</span>}
                </div>
                <div className="division-cell">
                    <span className="division-name" title={match.division}>{match.division}</span>
                </div>
            </div>
            <div className="scoreboard">
                <div className="team home">
                    <span className="sr-only">Local: </span>
                    <span className="team-name" title={homeName}>{homeName}</span>
                </div>
                <span className="team-score" role="group" aria-label={`Goles de ${homeName}`}>
                    {!hasResult && <span className="sr-only">Sin resultado</span>}
                    <span aria-hidden={hasResult ? undefined : true}>{homeScore}</span>
                </span>
                <div className="team away">
                    <span className="sr-only">Visitante: </span>
                    <span className="team-name" title={awayName}>{awayName}</span>
                </div>
                <span className="team-score" role="group" aria-label={`Goles de ${awayName}`}>
                    {!hasResult && <span className="sr-only">Sin resultado</span>}
                    <span aria-hidden={hasResult ? undefined : true}>{awayScore}</span>
                </span>
            </div>
        </MatchCard>
    );
}

export function WeeklyGridView({
    weekStartDate,
    scheduledMatches,
    externalMatches = [],
    divisionActual,
    isConfirmed,
    jornadaDurationDays = 7,
}) {
    const currentDivisionName = normalizeDivisionName(divisionActual || "Esta División");
    const durationDays = Math.max(1, parseInt(jornadaDurationDays, 10) || 7);

    const divisionColorMap = useMemo(() => buildDivisionColorMap([
        currentDivisionName,
        ...externalMatches.map(m => m.division_name || m.divisionName || "Otra"),
    ]), [currentDivisionName, externalMatches]);
    
    
    // 1. Generar los dias de la jornada segun configuracion
    const weekDays = useMemo(() => {
        if (!weekStartDate) return [];
        const start = new Date(weekStartDate + "T00:00:00");
        return Array.from({ length: durationDays }, (_, i) => {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            // Formato YYYY-MM-DD local manual
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        });
    }, [durationDays, weekStartDate]);

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
                const divisionName = currentDivisionName;
                addToGroup(m.date, {
                    ...m,
                    division: divisionName,
                    divisionColor: divisionColorMap.get(divisionName) || DIVISION_COLORS[0],
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
                const divisionName = normalizeDivisionName(m.division_name || m.divisionName || "Otra");
                addToGroup(dateKey, {
                    id: m.id,
                    time: m.time,
                    goals1: m.goals1,
                    goals2: m.goals2,
                    local: { name: m.local_name || m.local?.name || m.local },
                    visitante: { name: m.visitante_name || m.visitante?.name || m.visitante },
                    // IMPORTANTE: Aseguramos que el nombre de la división llegue para el color
                    division: divisionName,
                    divisionColor: divisionColorMap.get(divisionName) || DIVISION_COLORS[0],
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
    }, [scheduledMatches, externalMatches, currentDivisionName, divisionColorMap, isConfirmed]);

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
        <Container role="region" aria-label="Calendario semanal" tabIndex={0}>
            <Legend>
               {Array.from(divisionColorMap.entries()).map(([divisionName, color]) => (
                    <div className="item" key={divisionName}>
                        <span className="dot" style={{ backgroundColor: color }}></span>
                        {divisionName}
                    </div>
               ))}
            </Legend>

            <GridContainer $daysCount={durationDays}>
                {weekDays.map(day => {
                    const matchesForDay = groupedMatches[day] || [];

                    return (
                        <DayWrapper key={day}>
                            <MobileHeader>{formatMobileDay(day)}</MobileHeader>
                            <DayColumn>
                                <DesktopHeader>{formatDesktopDay(day)}</DesktopHeader>
                                <MatchesList aria-label={`Partidos del ${formatMobileDay(day)}`} tabIndex={matchesForDay.length ? 0 : undefined}>
                                    {matchesForDay.map((m, idx) => (
                                        <WeeklyMatchCard key={m.id || `temp-${idx}`} match={m} day={day} />
                                    ))}
                                    {matchesForDay.length === 0 && <EmptyState as="li">Libre</EmptyState>}
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
const Container = styled.div`
    display: flex; flex-direction: column; gap: 10px; width: 100%; height: 100%; flex: 1 1 auto; min-height: 0;
    overflow-y: auto;
    overscroll-behavior-y: contain;
    &:focus-visible { outline: 2px solid ${v.colorPrincipal}; outline-offset: -2px; }
    @media ${Device.laptop} {
        display: grid; grid-template-rows: auto minmax(0, 1fr); gap: 8px; overflow: hidden;
    }
`;

const Legend = styled.div`
    display: flex; flex-wrap: wrap; gap: 8px 15px; font-size: 0.75rem; font-weight: 600;
    color: ${({theme})=>theme.tournamentDashboard?.muted || theme.colorSubtitle};
    flex-shrink: 0;
    padding-left: 4px;
    .item { display: flex; align-items: center; gap: 5px; }
    .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
`;

const GridContainer = styled.div`
    display: flex; flex-direction: column; gap: 20px; width: 100%; flex: 1 0 auto; min-height: 0;
    @media ${Device.laptop} {
        display: grid; grid-template-columns: repeat(${({ $daysCount }) => $daysCount}, minmax(180px, 1fr)); grid-template-rows: minmax(0, 1fr); gap: 1px;
        background: ${({theme})=>theme.bg4}; border-radius: 10px; overflow: auto;
    }
`;

const DayWrapper = styled.div`
    display: flex; flex-direction: column; gap: 8px; width: 100%; flex-shrink: 0;
    min-height: 0;
    @media ${Device.laptop} { gap: 0; height: 100%; min-width: 0; }
`;

const MobileHeader = styled.div`
    font-size: 0.95rem; font-weight: 700; color: ${({theme})=>theme.text}; padding-left: 4px; text-transform: capitalize;
    @media ${Device.laptop} { display: none; }
`;

const DesktopHeader = styled.div`
    display: none;
    flex-shrink: 0;
    @media ${Device.laptop} {
        display: block; background: ${({theme})=>theme.bg3}; padding: 8px;
        text-align: center; font-weight: 700; font-size: 0.75rem; color: ${v.colorPrincipal};
    }
`;

const DayColumn = styled.div`
    container-type: inline-size;
    background: ${({theme})=>theme.bgtotal}; border-radius: 8px; border: 1px solid ${({theme})=>theme.bg4};
    display: flex; flex-direction: column; flex: 1 1 auto; min-height: 60px;
    @media ${Device.laptop} { background: ${({theme})=>theme.bgcards}; border: none; height: 100%; min-height: 0; }
`;

const MatchesList = styled.ul`
    margin: 0; list-style: none;
    padding: 10px; display: flex; flex-direction: column; gap: 8px; flex: 1 0 auto; min-height: 0;
    &:focus-visible { outline: 2px solid ${v.colorPrincipal}; outline-offset: -2px; }
    @media ${Device.laptop} {
        padding: 6px; overflow-y: auto; flex: 1 1 auto;
        &::-webkit-scrollbar { width: 4px; }
        &::-webkit-scrollbar-thumb { background: ${({theme})=>theme.bg4}; border-radius: 4px; }
    }
`;

const MatchCard = styled.li`
    --card-line: ${({ theme }) => theme.tournamentDashboard?.border || theme.color2};
    --division-color: ${({ $divisionColor }) => $divisionColor};
    --card-surface: ${({ theme, $isExternal }) => $isExternal ? theme.bg2 : theme.bgcards};
    position: relative;
    display: flex;
    flex-direction: column;
    flex: 0 0 auto;
    width: 100%;
    min-width: 0;
    overflow: hidden;
    border: 0;
    border-block: 1px ${({ $isPreview }) => $isPreview ? 'dashed' : 'solid'} var(--card-line);
    border-left: 3px solid var(--division-color);
    border-radius: 0 12px 12px 0;
    background: var(--card-surface);
    color: ${({ theme, $isExternal }) => $isExternal ? `color-mix(in srgb, ${theme.text} 85%, ${theme.bgcards})` : theme.text};

    .match-header {
        display: grid;
        grid-template-columns: minmax(64px, 0.85fr) minmax(0, 1.15fr);
        align-items: stretch;
        padding: 3px 8px;
        border-bottom: 1px solid var(--card-line);
        background: var(--card-surface);
    }
    .kickoff { display: grid; align-content: center; justify-items: start; gap: 0; padding-right: 6px; }
    time { font-size: 0.6875rem; font-weight: 600; line-height: 1.4; font-variant-numeric: tabular-nums; white-space: nowrap; }
    time.unscheduled { white-space: normal; text-align: left; }
    .draft-label { color: ${({ theme }) => theme.tournamentDashboard?.muted || theme.colorSubtitle}; font-size: 0.625rem; line-height: 1.3; }
    .division-cell { display: grid; align-items: center; min-width: 0; padding-left: 8px; border-left: 1px solid var(--card-line); }
    .division-name {
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        overflow: hidden;
        overflow-wrap: anywhere;
        text-align: right;
        color: inherit;
        font-size: 0.6875rem;
        font-weight: 600;
        line-height: 1.4;
        text-transform: uppercase;
    }

    .scoreboard {
        display: grid;
        flex: 1;
        grid-template-columns: minmax(0, 1fr) 24px;
        grid-template-rows: repeat(2, minmax(22px, 1fr));
        column-gap: 6px;
        padding: 3px 8px;
    }
    .team { position: relative; display: flex; align-items: center; min-width: 0; padding: 2px 0; }
    .team.home { border-bottom: 1px solid var(--card-line); }
    .team-name {
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        overflow: hidden;
        overflow-wrap: anywhere;
        font-size: 0.75rem;
        font-weight: 600;
        line-height: 1.3;
    }
    .team-score {
        position: relative;
        display: grid;
        place-items: center;
        min-width: 0;
        padding: 2px;
        border: 1px solid var(--card-line);
        border-radius: 6px;
        background: ${({ theme }) => theme.bg2};
        font-size: 0.875rem;
        font-weight: 600;
        line-height: 1;
        font-variant-numeric: tabular-nums;
    }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }

    @media ${Device.laptop} {
        flex-grow: 1;
        min-height: min-content;
        max-height: 92px;
    }

    @container (min-width: 580px) {
        max-width: 480px;
        align-self: center;
    }
`;

const EmptyState = styled.div`
    text-align: center; font-size: 0.8rem; padding: 10px;
    color: ${({theme})=>theme.tournamentDashboard?.muted || theme.colorSubtitle};
    flex: 1 1 auto;
    display: flex;
    align-items: center;
    justify-content: center;
`;
