// src/components/organismos/tabs/torneos/planificacion/result_modal_components/RosterTab.jsx
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styled, { css, keyframes } from "styled-components";
import { InputNumber, Tooltip, v } from "../../../../../../index";
import { RiAlertFill, RiCloseLine, RiDeleteBinLine, RiMagicLine, RiUserStarFill, RiUserAddLine } from "react-icons/ri";

const normalizePlayerSearch = (value) =>
    String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();

const getPlayerLabel = (player) =>
    `${player?.first_name || ''} ${player?.last_name || ''} ${player?.dorsal ? `(${player.dorsal})` : ''}`
        .replace(/\s+/g, " ")
        .trim();

const toStatNumber = (value) => parseInt(value, 10) || 0;

const SearchablePlayerSelect = ({ slot, idx, team, players, globalRoster, onUpdate }) => {
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);
    const menuRef = useRef(null);
    const selectedPlayer = players.find((player) => String(player.id) === String(slot.playerId)) || null;
    const selectedLabel = selectedPlayer ? getPlayerLabel(selectedPlayer) : "";
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState(selectedLabel);
    const [menuStyle, setMenuStyle] = useState(null);

    useEffect(() => {
        if (!isOpen || !selectedLabel) {
            setInputValue(selectedLabel);
        }
    }, [selectedLabel, isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        const handlePointerDownOutside = (event) => {
            const clickedInsideInput = wrapperRef.current?.contains(event.target);
            const clickedInsideMenu = menuRef.current?.contains(event.target);

            if (!clickedInsideInput && !clickedInsideMenu) {
                setIsOpen(false);
                setInputValue(selectedLabel);
            }
        };

        document.addEventListener("mousedown", handlePointerDownOutside);
        return () => document.removeEventListener("mousedown", handlePointerDownOutside);
    }, [isOpen, selectedLabel]);

    useEffect(() => {
        if (!isOpen) return;

        const updateMenuPosition = () => {
            const inputNode = inputRef.current;
            if (!inputNode) return;

            const rect = inputNode.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;
            const spacing = 6;
            const minMenuHeight = 160;
            const maxMenuHeight = 220;
            const spaceBelow = viewportHeight - rect.bottom - 16;
            const spaceAbove = rect.top - 16;
            const shouldOpenUpwards = spaceBelow < minMenuHeight && spaceAbove > spaceBelow;
            const availableHeight = shouldOpenUpwards ? spaceAbove : spaceBelow;
            const resolvedMaxHeight = Math.max(120, Math.min(maxMenuHeight, availableHeight));
            const menuWidth = Math.min(rect.width, viewportWidth - rect.left - 16);

            setMenuStyle({
                left: rect.left,
                width: menuWidth,
                maxHeight: resolvedMaxHeight,
                top: shouldOpenUpwards ? "auto" : rect.bottom + spacing,
                bottom: shouldOpenUpwards ? viewportHeight - rect.top + spacing : "auto",
            });
        };

        updateMenuPosition();

        window.addEventListener("resize", updateMenuPosition);
        window.addEventListener("scroll", updateMenuPosition, true);

        return () => {
            window.removeEventListener("resize", updateMenuPosition);
            window.removeEventListener("scroll", updateMenuPosition, true);
        };
    }, [isOpen, inputValue, players.length, slot.playerId]);

    const effectiveQuery = isOpen && selectedLabel && inputValue === selectedLabel ? "" : inputValue;
    const normalizedQuery = normalizePlayerSearch(effectiveQuery);

    const filteredPlayers = players.filter((player) => {
        if (!normalizedQuery) return true;

        const searchableText = normalizePlayerSearch(
            `${player.first_name || ''} ${player.last_name || ''} ${player.dorsal || ''}`
        );

        return searchableText.includes(normalizedQuery);
    });

    const handleSelectPlayer = (player) => {
        onUpdate(team, idx, 'playerId', player.id);
        setInputValue(getPlayerLabel(player));
        setIsOpen(false);
    };

    const handleKeyDown = (event) => {
        if (event.key === "Escape") {
            setIsOpen(false);
            setInputValue(selectedLabel);
            return;
        }

        if (event.key === "Enter") {
            const firstAvailablePlayer = filteredPlayers.find((player) => (
                !globalRoster.some(
                    (rosterPlayer) =>
                        String(rosterPlayer.playerId) === String(player.id) &&
                        rosterPlayer.idTemp !== slot.idTemp
                )
            ));

            if (firstAvailablePlayer) {
                event.preventDefault();
                handleSelectPlayer(firstAvailablePlayer);
            }
        }
    };

    return (
        <SearchableSelectContainer ref={wrapperRef}>
            <input
                ref={inputRef}
                type="text"
                value={inputValue}
                placeholder="Seleccionar jugador..."
                onFocus={(event) => {
                    setIsOpen(true);
                    if (selectedLabel && inputValue === selectedLabel) {
                        event.target.select();
                    }
                }}
                onChange={(event) => {
                    setInputValue(event.target.value);
                    if (!isOpen) setIsOpen(true);
                }}
                onKeyDown={handleKeyDown}
            />

            {isOpen && (
                createPortal(
                    <OptionsList ref={menuRef} role="listbox" style={menuStyle || undefined}>
                        {filteredPlayers.length ? (
                            filteredPlayers.map((player) => {
                                const isDisabled = globalRoster.some(
                                    (rosterPlayer) =>
                                        String(rosterPlayer.playerId) === String(player.id) &&
                                        rosterPlayer.idTemp !== slot.idTemp
                                );
                                const isSelected = String(slot.playerId) === String(player.id);

                                return (
                                    <OptionButton
                                        key={player.id}
                                        type="button"
                                        $selected={isSelected}
                                        disabled={isDisabled}
                                        onMouseDown={(event) => event.preventDefault()}
                                        onClick={() => !isDisabled && handleSelectPlayer(player)}
                                    >
                                        <span>{getPlayerLabel(player)}</span>
                                        {isDisabled && <small>Ya seleccionado</small>}
                                    </OptionButton>
                                );
                            })
                        ) : (
                            <EmptyOptionsMessage>No hay jugadores que coincidan con la busqueda.</EmptyOptionsMessage>
                        )}
                    </OptionsList>,
                    document.body
                )
            )}
        </SearchableSelectContainer>
    );
};

const PlayerRow = React.memo(({ slot, idx, team, players, globalRoster, isWalkover, onUpdate }) => {
    const hasSelectedPlayer = Boolean(slot.playerId);
    const hasUnassignedGoals = !hasSelectedPlayer && !isWalkover && toStatNumber(slot.goals) > 0;
    const [animateSelect, setAnimateSelect] = useState(false);
    const [ownGoalsOpen, setOwnGoalsOpen] = useState(() => Boolean(parseInt(slot.ownGoals, 10)));

    useEffect(() => {
        if (!slot?.idTemp) return;
        setAnimateSelect(true);
        const timer = setTimeout(() => setAnimateSelect(false), 260);
        return () => clearTimeout(timer);
    }, [slot.playerId, slot.idTemp]);

    const handleOwnGoalsToggle = () => {
        if (isWalkover) return;

        if (ownGoalsOpen) {
            onUpdate(team, idx, 'ownGoals', 0);
            setOwnGoalsOpen(false);
            return;
        }

        setOwnGoalsOpen(true);
    };

    return (
        <RowContainer>
            <div className="player-select">
                <PlayerSelectShell $selected={hasSelectedPlayer} $animate={animateSelect}>
                    <SearchablePlayerSelect
                        slot={slot}
                        idx={idx}
                        team={team}
                        players={players}
                        globalRoster={globalRoster}
                        onUpdate={onUpdate}
                    />
                    <ClearPlayerButton
                        type="button"
                        $visible={hasSelectedPlayer}
                        disabled={!hasSelectedPlayer}
                        onClick={() => onUpdate(team, idx, 'playerId', '')}
                        title="Limpiar jugador seleccionado"
                        aria-label="Limpiar jugador seleccionado"
                    >
                        <RiCloseLine />
                    </ClearPlayerButton>
                </PlayerSelectShell>
            </div>

            <div className="stats-actions">
                <div className="stat-number goals">
                    <span className="stat-chip">G</span>
                    <GoalInputShell $warning={hasUnassignedGoals}>
                        <InputNumber
                            value={isWalkover ? 0 : slot.goals}
                            onChange={(e) => onUpdate(team, idx, 'goals', e.target.value)}
                        />
                        {hasUnassignedGoals && (
                            <WarningIconSlot>
                                <Tooltip text="No se asignaran a jugador." position="top">
                                    <UnassignedGoalWarning aria-label="Goles sin jugador asignado">
                                        <RiAlertFill />
                                    </UnassignedGoalWarning>
                                </Tooltip>
                            </WarningIconSlot>
                        )}
                    </GoalInputShell>
                </div>

                <div className="stat-number own-goals">
                    <button
                        type="button"
                        className="own-goals-toggle"
                        onClick={handleOwnGoalsToggle}
                        disabled={isWalkover}
                        aria-pressed={ownGoalsOpen}
                        title={ownGoalsOpen ? "Ocultar autogoles y limpiar valor" : "Registrar autogol"}
                    >
                        AG
                    </button>
                    {ownGoalsOpen && (
                        <InputNumber
                            value={isWalkover ? 0 : (slot.ownGoals || 0)}
                            onChange={(e) => onUpdate(team, idx, 'ownGoals', e.target.value)}
                        />
                    )}
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

export const RosterTab = ({ roster, teamKey, teamName, players, isWalkover, minPlayers, onUpdate, onAutoFillStarters, onClearRoster }) => {
    const hasEmptyStarters = roster.some(slot => slot.isStarter && !slot.playerId);
    const hasRosterData = roster.some(slot => (
        slot.playerId ||
        toStatNumber(slot.goals) > 0 ||
        toStatNumber(slot.ownGoals) > 0 ||
        slot.yellow ||
        slot.red
    ));

    return (
        <RosterGrid>
            <SectionHeader>
                <div className="section-copy">
                    <div className="team-name">{teamName}</div>
                    <div className="section-title"><RiUserStarFill /> Titulares (Minimo {minPlayers})</div>
                     <div className="section-hint">Completa espacios vacios usando a los jugadores con mas asistencias a partidos.</div>
                </div>
                <HeaderActions>
                    <AutoFillButton
                        type="button"
                        onClick={() => onAutoFillStarters?.(teamKey)}
                        disabled={!onAutoFillStarters || !players.length || !hasEmptyStarters}
                    >
                        <RiMagicLine />
                        <span>Auto-rellenar titulares</span>
                    </AutoFillButton>
                    <ClearRosterButton
                        type="button"
                        onClick={() => onClearRoster?.(teamKey)}
                        disabled={!onClearRoster || !hasRosterData}
                    >
                        <RiDeleteBinLine />
                        <span>Limpiar todos</span>
                    </ClearRosterButton>
                </HeaderActions>
            </SectionHeader>

            <div className="header-row">
                <span className="player-col">Jugador</span>
                <span className="stats-col">Goles / AG / Tarjetas</span>
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

    .team-name {
        color: ${({theme}) => theme.text};
        font-size: 1rem;
        font-weight: 900;
        line-height: 1.2;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
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
            width: 270px;
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

const HeaderActions = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: flex-end;

    @media (max-width: 768px) {
        width: 100%;
        flex-direction: column;
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

const ClearRosterButton = styled(AutoFillButton)`
    border-color: ${({theme}) => theme.bg4};
    background: ${({theme}) => theme.bg3};
    color: ${({theme}) => theme.text};
    box-shadow: none;

    &:hover:not(:disabled) {
        background: ${v.colorError};
        border-color: ${v.colorError};
        color: white;
        box-shadow: 0 12px 22px ${v.colorError}25;
    }
`;

const clearButtonIn = keyframes`
    0% {
        opacity: 0;
        transform: translateX(8px) scale(0.82);
    }
    70% {
        opacity: 1;
        transform: translateX(-1px) scale(1.05);
    }
    100% {
        opacity: 1;
        transform: translateX(0) scale(1);
    }
`;

const selectPulse = keyframes`
    0% {
        transform: scale(1);
        box-shadow: 0 0 0 0 rgba(28, 176, 246, 0);
    }
    45% {
        transform: scale(1.015);
        box-shadow: 0 0 0 4px rgba(28, 176, 246, 0.14);
    }
    100% {
        transform: scale(1);
        box-shadow: 0 0 0 0 rgba(28, 176, 246, 0);
    }
`;

const PlayerSelectShell = styled.div`
    display: flex;
    align-items: center;
    width: 100%;
    padding: 4px;
    border-radius: 14px;
    background: ${({$selected}) => $selected ? `${v.colorPrincipal}10` : 'transparent'};
    border: 1px solid ${({$selected}) => $selected ? `${v.colorPrincipal}22` : 'transparent'};
    transition: background 0.22s ease, border-color 0.22s ease, transform 0.22s ease;
    position: relative;
    ${({$animate}) => $animate && css`
        animation: ${selectPulse} 0.26s ease-out;
    `}

    input {
        flex: 1;
        padding-right: 54px;
    }
`;

const SearchableSelectContainer = styled.div`
    position: relative;
    flex: 1;

    input {
        background: ${({theme}) => theme.bg3};
        border: 1px solid ${({theme}) => theme.bg4};
        color: ${({theme}) => theme.text};
        padding: 8px 10px;
        border-radius: 10px;
        width: 100%;
        outline: none;
        box-sizing: border-box;
        font-size: 0.9rem;
        transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
    }

    input:focus {
        border-color: ${v.colorPrincipal};
        box-shadow: 0 0 0 3px ${`${v.colorPrincipal}20`};
    }
`;

const OptionsList = styled.div`
    position: fixed;
    z-index: 100002;
    display: flex;
    flex-direction: column;
    gap: 4px;
    overflow-y: auto;
    padding: 6px;
    border-radius: 12px;
    background: ${({theme}) => theme.bgtotal};
    border: 1px solid ${({theme}) => theme.bg4};
    box-shadow: 0 18px 36px rgba(0, 0, 0, 0.18);

    &::-webkit-scrollbar {
        width: 8px;
    }

    &::-webkit-scrollbar-track {
        background: transparent;
    }

    &::-webkit-scrollbar-thumb {
        background: ${({theme}) => theme.bg4};
        border-radius: 4px;
    }

    scrollbar-width: thin;
    scrollbar-color: ${({theme}) => theme.bg4} transparent;
`;

const OptionButton = styled.button`
    width: 100%;
    border: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    text-align: left;
    padding: 10px 12px;
    border-radius: 10px;
    background: ${({$selected}) => $selected ? `${v.colorPrincipal}18` : 'transparent'};
    color: ${({theme}) => theme.text};
    cursor: ${({disabled}) => disabled ? 'not-allowed' : 'pointer'};
    opacity: ${({disabled}) => disabled ? 0.45 : 1};
    transition: background 0.18s ease, transform 0.18s ease;

    span {
        min-width: 0;
        flex: 1;
    }

    small {
        color: ${v.colorError};
        font-size: 0.68rem;
        font-weight: 700;
    }

    &:hover:not(:disabled) {
        background: ${({theme, $selected}) => $selected ? `${v.colorPrincipal}22` : theme.bg3};
        transform: translateY(-1px);
    }
`;

const EmptyOptionsMessage = styled.div`
    padding: 12px 10px;
    text-align: center;
    font-size: 0.82rem;
    color: ${({theme}) => theme.text};
    opacity: 0.7;
`;

const ClearPlayerButton = styled.button`
    width: 32px;
    min-width: 32px;
    height: 32px;
    border: 1px solid ${({theme, $visible}) => $visible ? `${v.colorError}45` : theme.bg4};
    border-radius: 12px;
    background: ${({theme, $visible}) => $visible
        ? `linear-gradient(135deg, ${v.colorError}16, ${v.colorPrincipal}10)`
        : theme.bg3};
    color: ${({theme, $visible}) => $visible ? v.colorError : theme.text};
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: ${({$visible}) => $visible ? 'pointer' : 'default'};
    opacity: ${({$visible}) => $visible ? 1 : 0};
    pointer-events: ${({$visible}) => $visible ? 'auto' : 'none'};
    transform: ${({$visible}) => $visible ? 'translateY(-50%) scale(1)' : 'translateY(-50%) scale(0.82)'};
    box-shadow: ${({$visible}) => $visible ? `0 8px 18px ${v.colorError}18` : 'none'};
    transition: background 0.22s ease, color 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease, transform 0.22s ease, opacity 0.22s ease;
    position: absolute;
    right: 8px;
    top: 50%;
    z-index: 2;
    ${({$visible}) => $visible && css`
        animation: ${clearButtonIn} 0.28s cubic-bezier(0.175, 0.885, 0.32, 1.18);
    `}

    svg {
        font-size: 1.1rem;
    }

    &:hover:not(:disabled) {
        background: ${v.colorError};
        color: white;
        border-color: ${v.colorError};
        transform: translateY(-50%) scale(1.04);
        box-shadow: 0 12px 22px ${v.colorError}30;
    }

    &:active:not(:disabled) {
        transform: translateY(-50%) scale(0.94);
    }

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
`;

const RowContainer = styled.div`
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    column-gap: 28px;
    row-gap: 8px;
    padding: 8px 10px;
    background: ${({theme}) => theme.bgtotal};
    border-radius: 8px;
    border: 1px solid ${({theme}) => theme.bg4};

    .player-select {
        min-width: 0;
        position: relative;
        z-index: 2;
    }

    .stats-actions {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 270px;
        justify-content: flex-end;
        flex-shrink: 0;
        position: relative;
        z-index: 1;
    }

    .stat-number {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
        flex-shrink: 0;
    }

    .stat-chip {
        min-width: 28px;
        height: 28px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        font-size: 0.7rem;
        font-weight: 800;
        color: white;
        flex-shrink: 0;
    }

    .stat-number.goals .stat-chip {
        background: linear-gradient(135deg, #16a34a, #22c55e);
    }

    .stat-number.own-goals .stat-chip {
        background: linear-gradient(135deg, #f97316, #ef4444);
    }

    .own-goals-toggle {
        min-width: 38px;
        height: 38px;
        padding: 0 10px;
        border: 1px solid ${({theme}) => theme.bg4};
        border-radius: 10px;
        background: ${({theme}) => theme.bg3};
        color: ${({theme}) => theme.text};
        cursor: pointer;
        font-size: 0.72rem;
        font-weight: 900;
        transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
    }

    .own-goals-toggle[aria-pressed="true"] {
        background: linear-gradient(135deg, #f97316, #ef4444);
        border-color: #f97316;
        color: white;
        box-shadow: 0 8px 16px rgba(249, 115, 22, 0.2);
    }

    .own-goals-toggle:hover:not(:disabled) {
        transform: translateY(-1px);
        border-color: #f97316;
    }

    .own-goals-toggle:disabled {
        cursor: not-allowed;
        opacity: 0.55;
    }

    .stat-number > div:not(.goal-input-shell),
    .goal-input-shell > div:first-child {
        width: 82px;
        height: 40px;
        background: ${({theme}) => theme.bgtotal};
        border-color: ${({theme}) => theme.bg4};
        border-radius: 12px;
        overflow: hidden;
        box-shadow: none;
    }

    .stat-number input {
        background: transparent;
        border: none;
        color: ${({theme}) => theme.text};
        font-size: 0.98rem;
        font-weight: 800;
        padding-right: 22px;
    }

    .stat-number > div:not(.goal-input-shell) > div,
    .goal-input-shell > div:first-child > div {
        width: 24px;
        border-left: 1px solid ${({theme}) => theme.bg4};
    }

    .stat-number button {
        background: ${({theme}) => theme.bg3};
        color: ${({theme}) => theme.text};
    }

    .stat-number button:hover {
        background: ${({theme}) => theme.bg4};
    }

    .stat-number button:active {
        background: ${`${v.colorPrincipal}20`};
    }

    .stat-number[disabled] {
        opacity: 0.6;
    }

    .cards-wrapper {
        display: flex;
        gap: 6px;
        justify-content: flex-end;
    }

    @media (max-width: 900px) {
        .stats-actions {
            width: 258px;
            gap: 6px;
        }

        .stat-number > div:not(.goal-input-shell),
        .goal-input-shell {
            width: 78px;
        }
    }

    @media (max-width: 760px) {
        grid-template-columns: 1fr;
        gap: 8px;
        align-items: stretch;

        .stats-actions {
            width: 100%;
            justify-content: space-between;
            background: ${({theme}) => theme.bg3};
            padding: 8px 10px;
            border-radius: 10px;
            gap: 8px;
        }

        .stat-number {
            flex: 1;
        }

        .stat-number > div:not(.goal-input-shell),
        .goal-input-shell {
            width: 100%;
        }

        .cards-wrapper {
            align-self: center;
        }
    }

    @media (max-width: 520px) {
        .cards-wrapper {
            gap: 8px;
        }

        .stats-actions {
            display: grid;
            grid-template-columns: 1fr 1fr auto;
            align-items: center;
        }

        .stat-number {
            min-width: 0;
        }
    }

    @media (max-width: 420px) {
        .stats-actions {
            grid-template-columns: 1fr 1fr;
        }

        .cards-wrapper {
            grid-column: 1 / -1;
            justify-content: flex-end;
        }
    }
`;

const GoalInputShell = styled.div.attrs({ className: "goal-input-shell" })`
    position: relative;
    width: 82px;
    height: 40px;
    flex-shrink: 0;

    > div:first-child {
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
        ${({$warning}) => $warning && css`
            border-color: #f59e0b;
            box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.16);
        `}
    }
`;

const WarningIconSlot = styled.span`
    position: absolute;
    top: -7px;
    right: -7px;
    z-index: 4;
    line-height: 1;
`;

const UnassignedGoalWarning = styled.span`
    width: 19px;
    height: 19px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: ${({theme}) => theme.bgtotal};
    color: #f59e0b;
    border: 1px solid rgba(245, 158, 11, 0.42);
    box-shadow: 0 6px 14px rgba(245, 158, 11, 0.22);
    cursor: help;

    svg {
        font-size: 0.95rem;
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
