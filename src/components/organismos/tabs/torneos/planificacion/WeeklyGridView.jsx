import React, { useMemo } from "react";
import styled from "styled-components";
import { v } from "../../../../../index";

// Se añade "externalMatches = []" para evitar el error si no se pasa la prop
export function WeeklyGridView({ weekStartDate, scheduledMatches, externalMatches = [], divisionActual }) {
    const weekDays = useMemo(() => {
        if (!weekStartDate) return [];
        const start = new Date(weekStartDate + "T00:00:00");
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            return d.toISOString().split('T')[0];
        });
    }, [weekStartDate]);

    const formatShortDay = (dateStr) => {
        const date = new Date(dateStr + "T00:00:00");
        return date.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit' });
    };

    return (
        <GridContainer>
            {weekDays.map(day => {
                const currentDay = scheduledMatches.filter(m => m.date === day).map(m => ({...m, division: divisionActual}));
                
                // Ahora externalMatches es un array (vacío o con datos), por lo que .filter no fallará
                const otherDay = externalMatches.filter(m => m.date.startsWith(day)).map(m => ({
                    time: m.date.split('T')[1].substring(0,5),
                    local: { name: m.team1.name },
                    visitante: { name: m.team2.name },
                    division: m.jornada.tournament.division.name,
                    isExternal: true
                }));

                const allMatches = [...currentDay, ...otherDay].sort((a,b) => a.time.localeCompare(b.time));

                return (
                    <DayColumn key={day}>
                        <DayHeader>{formatShortDay(day)}</DayHeader>
                        <MatchesList>
                            {allMatches.map((m, idx) => (
                                <MiniCard key={idx} $isExternal={m.isExternal}>
                                    <div className="div-badge">{m.division}</div>
                                    <div className="time">{m.time}</div>
                                    <div className="teams">
                                        <span>{m.local.name}</span>
                                        <small>vs</small>
                                        <span>{m.visitante.name}</span>
                                    </div>
                                </MiniCard>
                            ))}
                            {allMatches.length === 0 && <Empty>Libre</Empty>}
                        </MatchesList>
                    </DayColumn>
                );
            })}
        </GridContainer>
    );
}

const GridContainer = styled.div` display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; background: ${({theme})=>theme.bg4}; height: 100%; border-radius: 10px; overflow: hidden; `;
const DayColumn = styled.div` background: ${({theme})=>theme.bgcards}; display: flex; flex-direction: column; `;
const DayHeader = styled.div` background: ${({theme})=>theme.bg3}; padding: 10px; text-align: center; font-weight: 700; font-size: 0.75rem; color: ${v.colorPrincipal}; `;
const MatchesList = styled.div` padding: 8px; display: flex; flex-direction: column; gap: 8px; flex: 1; overflow-y: auto; `;
const MiniCard = styled.div` 
    background: ${({theme, $isExternal})=> $isExternal ? theme.bg3 : theme.bgtotal}; border: 1px solid ${({theme})=>theme.bg4}; padding: 8px; border-radius: 8px; opacity: ${({$isExternal})=> $isExternal ? 0.6 : 1};
    .div-badge { font-size: 0.55rem; font-weight: 900; color: ${v.colorPrincipal}; text-transform: uppercase; margin-bottom: 2px; }
    .time { font-size: 0.7rem; font-weight: 800; }
    .teams { display: flex; flex-direction: column; font-size: 0.7rem; line-height: 1.1; span { font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } small { opacity: 0.4; } }
`;
const Empty = styled.div` font-size: 0.65rem; opacity: 0.2; text-align: center; margin-top: 10px; `;