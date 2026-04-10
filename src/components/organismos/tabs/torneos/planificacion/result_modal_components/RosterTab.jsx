// src/components/organismos/tabs/torneos/planificacion/result_modal_components/RosterTab.jsx
import React from "react";
import styled from "styled-components";
import { v } from "../../../../../../index";
import { RiMagicLine, RiUserStarFill, RiUserAddLine } from "react-icons/ri";

const PlayerRow = React.memo(({ slot, idx, team, players, globalRoster, isWalkover, onUpdate }) => {
    return (
        <RowContainer>
            <div className="player-select">
                <select
                    value={slot.playerId}
                    onChange={(e) => onUpdate(team, idx, 'playerId', e.target.value)}
                >
                    <option value="">Seleccionar jugador...</option>
                    {players.map(p => (
                        <option
                            key={p.id}
                            value={p.id}
                            disabled={globalRoster.some(r => String(r.playerId) === String(p.id) && r.idTemp !== slot.idTemp)}
                        >
                            {p.first_name} {p.last_name} {p.dorsal ? `(${p.dorsal})` : ''}
                        </option>
                    ))}
                </select>
            </div>

            <div className="stats-actions">
                <div className="goals-wrapper">
                    <span className="mobile-label">Goles:</span>
                    <input
                        type="number"
                        min="0"
                        value={isWalkover ? 0 : slot.goals}
                        onChange={(e) => onUpdate(team, idx, 'goals', e.target.value)}
                        disabled={!slot.playerId || isWalkover}
                        className="number-input"
                    />
                </div>

                <div className="cards-wrapper">
                    <CardCheck
                        $color="#f1c40f"
                        $active={!isWalkover && slot.yellow}
                        onClick={() => slot.playerId && !isWalkover && onUpdate(team, idx, 'yellow', !slot.yellow)}
                        title="Tarjeta Amarilla"
                    >
                        TA
                    </CardCheck>
                    <CardCheck
                        $color="#e74c3c"
                        $active={!isWalkover && slot.red}
                        onClick={() => slot.playerId && !isWalkover && onUpdate(team, idx, 'red', !slot.red)}
                        title="Tarjeta Roja"
                    >
                        TR
                    </CardCheck>
                </div>
            </div>
        </RowContainer>
    );
});

export const RosterTab = ({ roster, teamKey, players, isWalkover, minPlayers, onUpdate, onAutoFillStarters }) => {
    const hasEmptyStarters = roster.some(slot => slot.isStarter && !slot.playerId);

    return (
        <RosterGrid>
            <SectionHeader>
                <div className="section-copy">
                    <div className="section-title"><RiUserStarFill /> Titulares (Minimo {minPlayers})</div>
                    <div className="section-hint">Completa espacios vacios usando a los jugadores con mas asistencias a partidos.</div>
                </div>
                <AutoFillButton
                    type="button"
                    onClick={() => onAutoFillStarters?.(teamKey)}
                    disabled={!onAutoFillStarters || !players.length || !hasEmptyStarters}
                >
                    <RiMagicLine />
                    <span>Auto-rellenar titulares</span>
                </AutoFillButton>
            </SectionHeader>

            <div className="header-row">
                <span className="player-col">Jugador</span>
                <span className="stats-col">Goles / Tarjetas</span>
            </div>

            {roster.map((slot, idx) => slot.isStarter && (
                <PlayerRow
                    key={slot.idTemp}
                    slot={slot}
                    idx={idx}
                    team={teamKey}
                    players={players}
                    globalRoster={roster}
                    isWalkover={isWalkover}
                    onUpdate={onUpdate}
                />
            ))}

            <div className="section-title subs"><RiUserAddLine /> Suplentes</div>

            {roster.map((slot, idx) => !slot.isStarter && (
                <PlayerRow
                    key={slot.idTemp}
                    slot={slot}
                    idx={idx}
                    team={teamKey}
                    players={players}
                    globalRoster={roster}
                    isWalkover={isWalkover}
                    onUpdate={onUpdate}
                />
            ))}
        </RosterGrid>
    );
};

const RosterGrid = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;

    .section-title {
        font-size: 0.85rem;
        font-weight: 700;
        color: ${v.colorPrincipal};
        display: flex;
        align-items: center;
        gap: 8px;

        &.subs {
            color: ${({theme}) => theme.text};
            opacity: 0.7;
            margin-top: 10px;
        }
    }

    .section-hint {
        font-size: 0.78rem;
        color: ${({theme}) => theme.text};
        opacity: 0.65;
        line-height: 1.35;
    }

    .header-row {
        display: flex;
        padding: 0 10px;
        font-size: 0.7rem;
        opacity: 0.5;
        text-transform: uppercase;

        .player-col {
            flex: 1;
        }

        .stats-col {
            width: 140px;
            text-align: center;
        }

        @media (max-width: 500px) {
            display: none;
        }
    }
`;

const SectionHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-top: 10px;
    flex-wrap: wrap;

    .section-copy {
        display: flex;
        flex-direction: column;
        gap: 4px;
        flex: 1 1 280px;
        min-width: 0;
    }

    @media (max-width: 768px) {
        align-items: stretch;
    }
`;

const AutoFillButton = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 44px;
    padding: 10px 16px;
    border-radius: 12px;
    border: 1px solid ${v.colorPrincipal};
    background: ${`${v.colorPrincipal}14`};
    color: ${v.colorPrincipal};
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 8px 18px rgba(0, 0, 0, 0.08);

    span {
        line-height: 1.2;
        text-align: center;
    }

    &:hover:not(:disabled) {
        transform: translateY(-1px);
        background: ${v.colorPrincipal};
        color: white;
        box-shadow: 0 12px 22px rgba(0, 0, 0, 0.14);
    }

    &:disabled {
        opacity: 0.55;
        cursor: not-allowed;
        box-shadow: none;
    }

    @media (max-width: 768px) {
        width: 100%;
    }

    @media (max-width: 500px) {
        padding: 12px 14px;
        font-size: 0.82rem;
    }
`;

const RowContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 15px;
    padding: 8px;
    background: ${({theme}) => theme.bgtotal};
    border-radius: 8px;
    border: 1px solid ${({theme}) => theme.bg4};

    .player-select {
        flex: 1;
        min-width: 120px;
    }

    .stats-actions {
        display: flex;
        align-items: center;
        gap: 15px;
        width: 140px;
        justify-content: flex-end;
    }

    .goals-wrapper {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .mobile-label {
        display: none;
        font-size: 0.8rem;
        font-weight: 700;
        opacity: 0.7;
        color: ${({theme}) => theme.text};
    }

    select, input {
        background: ${({theme}) => theme.bg3};
        border: 1px solid ${({theme}) => theme.bg4};
        color: ${({theme}) => theme.text};
        padding: 8px;
        border-radius: 5px;
        width: 100%;
        outline: none;
        box-sizing: border-box;
        font-size: 0.9rem;
    }

    .number-input {
        width: 55px;
        text-align: center;
        font-weight: 700;
    }

    .cards-wrapper {
        display: flex;
        gap: 8px;
    }

    @media (max-width: 500px) {
        flex-direction: column;
        gap: 8px;
        align-items: stretch;

        .stats-actions {
            width: 100%;
            justify-content: space-between;
            background: ${({theme}) => theme.bg3};
            padding: 8px 12px;
            border-radius: 6px;
        }

        .mobile-label {
            display: block;
        }

        .number-input {
            background: ${({theme}) => theme.bgtotal};
            width: 65px;
        }

        .cards-wrapper {
            gap: 12px;
        }
    }
`;

const CardCheck = styled.div`
    width: 32px;
    height: 36px;
    border-radius: 4px;
    cursor: pointer;
    border: 2px solid ${({$active, $color}) => $active ? $color : 'transparent'};
    background: ${({$color, $active}) => $active ? $color : $color + '33'};
    transition: 0.2s;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 0.65rem;
    font-weight: 800;
    color: ${({theme}) => theme.text};
    opacity: ${({$active}) => $active ? 1 : 0.4};

    &:active {
        transform: scale(0.9);
    }
`;
