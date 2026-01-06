import React, { useMemo } from "react";
import styled from "styled-components";
import { v } from "../../../../../index";
import { RiTrophyLine, RiTimeLine } from "react-icons/ri";

export function WeeklyGridView({
    weekStartDate,
    scheduledMatches,
    isConfirmed,
    onOpenResult,
    onPostpone
}) {
    // 1. Generar los 7 días de la semana basados en weekStartDate
    const weekDays = useMemo(() => {
        if (!weekStartDate) return [];
        const start = new Date(weekStartDate + "T00:00:00");
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            return d.toISOString().split('T')[0];
        });
    }, [weekStartDate]);

    // Helper para formatear encabezado (Lun 05/01)
    const formatHeaderDate = (dateStr) => {
        const date = new Date(dateStr + "T00:00:00");
        return date.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: '2-digit' });
    };

    return (
        <GridContainer>
            {weekDays.map(day => {
                // Filtramos y ordenamos partidos de este día específico
                const dayMatches = scheduledMatches
                  .filter(m => m.date === day)
                  .sort((a, b) => a.time.localeCompare(b.time));

                return (
                    <DayColumn key={day}>
                        <DayHeader>
                            <span>{formatHeaderDate(day)}</span>
                        </DayHeader>
                        <MatchesList>
                            {dayMatches.map(match => (
                                <MiniMatchCard key={match.id} $isConfirmed={isConfirmed}>
                                    <div className="match-time">{match.time}</div>
                                    <div className="match-teams">
                                        <div className="team-name">{match.local.name}</div>
                                        <div className="vs">vs</div>
                                        <div className="team-name">{match.visitante.name}</div>
                                    </div>
                                    
                                    {isConfirmed && (
                                        <div className="actions">
                                            <button onClick={() => onOpenResult(match)} className="btn-res">
                                                <RiTrophyLine />
                                            </button>
                                            <button onClick={() => onPostpone(match)} className="btn-pos">
                                                <RiTimeLine />
                                            </button>
                                        </div>
                                    )}
                                </MiniMatchCard>
                            ))}
                            {dayMatches.length === 0 && <EmptyState>Sin partidos</EmptyState>}
                        </MatchesList>
                    </DayColumn>
                );
            })}
        </GridContainer>
    );
}

const GridContainer = styled.div`
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    background: ${({ theme }) => theme.bg4};
    border: 1px solid ${({ theme }) => theme.bg4};
    border-radius: 10px;
    overflow: hidden;
    height: 100%;
    gap: 1px;
`;

const DayColumn = styled.div`
    background: ${({ theme }) => theme.bgcards};
    display: flex;
    flex-direction: column;
    min-width: 0;
`;

const DayHeader = styled.div`
    background: ${({ theme }) => theme.bg3};
    padding: 10px 5px;
    text-align: center;
    font-weight: 700;
    font-size: 0.75rem;
    text-transform: uppercase;
    color: ${v.colorPrincipal};
    border-bottom: 1px solid ${({ theme }) => theme.bg4};
`;

const MatchesList = styled.div`
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
    overflow-y: auto;
`;

const MiniMatchCard = styled.div`
    background: ${({ theme }) => theme.bgtotal};
    border: 1px solid ${({ theme, $isConfirmed }) => $isConfirmed ? '#2ecc7130' : theme.bg4};
    padding: 8px;
    border-radius: 8px;
    font-size: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 5px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);

    .match-time {
        font-weight: 800;
        opacity: 0.7;
        font-size: 0.7rem;
    }

    .match-teams {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        line-height: 1.2;
        .team-name {
            font-weight: 700;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            width: 100%;
        }
        .vs {
            font-size: 0.6rem;
            opacity: 0.5;
            margin: 2px 0;
        }
    }

    .actions {
        display: flex;
        justify-content: center;
        gap: 8px;
        padding-top: 5px;
        border-top: 1px solid ${({theme})=>theme.bg4};
        button {
            background: none; border: none; cursor: pointer; padding: 2px;
            &.btn-res { color: ${v.colorPrincipal}; }
            &.btn-pos { color: #f1c40f; }
        }
    }
`;

const EmptyState = styled.div`
    padding-top: 20px;
    text-align: center;
    font-size: 0.65rem;
    opacity: 0.3;
    font-style: italic;
`;