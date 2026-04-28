import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styled, { keyframes, css } from "styled-components";
import { v } from "../../../../../styles/variables";
import {
    RiRefreshLine, RiCheckDoubleLine, RiCloseLine, RiCalendarEventLine,
    RiTeamLine, RiMagicLine, RiErrorWarningLine, RiLock2Line, RiAddLine,
    RiHistoryLine, RiEyeLine, RiEyeOffLine
} from "react-icons/ri";
import { Btnsave } from "../../../../../index"; 
import { FixtureMatchCard } from "./FixtureMatchCard";
import { useFixturePreview } from "../../../../../hooks/useFixturePreview";
import { isOfficialJornadaName } from "../../../../../utils/jornadaUtils";

const ROUND_ANIMATION_MS = 220;
const sortRoundIndexes = (indexes) => [...indexes].sort((a, b) => Number(a) - Number(b));

const clearRoundTimer = (timersRef, rIndex) => {
    if (timersRef.current[rIndex]) {
        clearTimeout(timersRef.current[rIndex]);
        delete timersRef.current[rIndex];
    }
};

const clearAllRoundTimers = (timersRef) => {
    Object.keys(timersRef.current).forEach((rIndex) => {
        clearRoundTimer(timersRef, rIndex);
    });
};

export function FixturePreviewModal({ 
    isOpen, onClose, onConfirm, teams = [], config, isLoading,
    existingData = null 
}) {
    const roundAnimationTimersRef = useRef({});
    const prevVisibleRoundsRef = useRef([]);
    const {
        matches, matchesByRound, conflicts, selectedTeamId, isAnimating, isEditMode,
        handleTeamClick, toggleLock, handleShuffle, handleAutoFix,
        handleDragStart, handleTeamDragStart, handleDropOnMatch,
        handleDropOnJornada, handleDropOnTeamSlot,
        handleGenerateExtraRound, handleGenerateRepositionRound
    } = useFixturePreview(teams, config, isOpen, existingData);
    const [showConfirmedRounds, setShowConfirmedRounds] = useState(false);
    const [renderedRoundIndexes, setRenderedRoundIndexes] = useState([]);
    const [roundAnimationState, setRoundAnimationState] = useState({});

    useEffect(() => {
        if (isOpen) {
            setShowConfirmedRounds(false);
        }
    }, [isOpen, isEditMode]);

    const handleConfirmar = () => {
        if (isEditMode) {
            onConfirm(matches);
        } else {
            // Lógica legacy para creación nueva
            const maxJornada = Math.max(...matches.map(m => m.jornadaIndex), 0);
            const finalFixture = [];
            for (let i = 0; i <= maxJornada; i++) {
                const matchesInRound = matches.filter(m => m.jornadaIndex === i).map(m => ({ local: m.local, visitante: m.visitante }));
                if (matchesInRound.length > 0) finalFixture.push({ name: `Jornada ${i + 1}`, matches: matchesInRound });
            }
            onConfirm(finalFixture);
        }
    };

    const persistedOfficialRounds = useMemo(() => {
        if (!isEditMode || !Array.isArray(existingData?.jornadas)) return [];

        return existingData.jornadas
            .map((jornada, index) => ({
                roundIndex: String(index),
                title: jornada?.name || `Jornada ${index + 1}`,
                isLocked:
                    jornada?.status === "Confirmada" ||
                    jornada?.status === "Finalizada" ||
                    (matchesByRound[index] || []).some((match) => match.roundLocked),
                isGenerated: false,
            }))
            .filter((round) =>
                isOfficialJornadaName(existingData.jornadas?.[Number(round.roundIndex)]?.name)
            );
    }, [existingData?.jornadas, isEditMode, matchesByRound]);

    const roundDefinitions = useMemo(() => {
        if (persistedOfficialRounds.length > 0) {
            const persistedIndexes = new Set(
                persistedOfficialRounds.map((round) => String(round.roundIndex))
            );

            const generatedRounds = Object.keys(matchesByRound)
                .filter((rIndex) => !persistedIndexes.has(String(rIndex)))
                .sort((a, b) => Number(a) - Number(b))
                .map((rIndex) => {
                    const firstMatch = matchesByRound[rIndex]?.[0];
                    return {
                        roundIndex: String(rIndex),
                        title:
                            firstMatch?.roundName ||
                            `Jornada ${Number(rIndex) + 1}`,
                        isLocked: (matchesByRound[rIndex] || []).some((match) => match.roundLocked),
                        isGenerated: true,
                    };
                });

            return [...persistedOfficialRounds, ...generatedRounds];
        }

        return Object.keys(matchesByRound)
            .sort((a, b) => Number(a) - Number(b))
            .map((rIndex) => ({
                roundIndex: rIndex,
                title: matchesByRound[rIndex]?.[0]?.roundName || `Jornada ${Number(rIndex) + 1}`,
                isLocked: (matchesByRound[rIndex] || []).some((match) => match.roundLocked),
                isGenerated: !!matchesByRound[rIndex]?.some((match) => match.isGeneratedRound),
            }));
    }, [matchesByRound, persistedOfficialRounds]);

    const roundDefinitionMap = useMemo(
        () =>
            roundDefinitions.reduce((acc, round) => {
                acc[round.roundIndex] = round;
                return acc;
            }, {}),
        [roundDefinitions]
    );

    const roundIndexes = useMemo(
        () => roundDefinitions.map((round) => round.roundIndex),
        [roundDefinitions]
    );
    const isRoundLocked = (rIndex) =>
        roundDefinitionMap[rIndex]?.isLocked ??
        (matchesByRound[rIndex] || []).some((match) => match.roundLocked);
    const getRoundTitle = (rIndex) =>
        roundDefinitionMap[rIndex]?.title || `Jornada ${Number(rIndex) + 1}`;
    const confirmedRoundsCount = roundDefinitions.filter((round) => round.isLocked).length;
    const hasGeneratedRound = roundDefinitions.some((round) => round.isGenerated);
    const pendingMatchesAvailable = useMemo(
        () =>
            Array.isArray(existingData?.pendingMatches) &&
            existingData.pendingMatches.some((match) => {
                const jornadaName = match?.jornadas?.name || "";
                return Boolean(match?.team1_id && match?.team2_id && isOfficialJornadaName(jornadaName));
            }),
        [existingData?.pendingMatches]
    );
    const allOfficialRoundsConfirmed =
        persistedOfficialRounds.length > 0 &&
        persistedOfficialRounds.every((round) => round.isLocked);
    const canShowRoundGenerators =
        isEditMode &&
        teams.length > 1 &&
        allOfficialRoundsConfirmed &&
        !showConfirmedRounds &&
        !hasGeneratedRound;
    const canGenerateExtraRound = canShowRoundGenerators;
    const canGenerateRepositionRound = canShowRoundGenerators && pendingMatchesAvailable;
    const visibleRoundIndexes = useMemo(
        () =>
            roundDefinitions
                .filter((round) => {
                    if (!isEditMode || showConfirmedRounds) return true;
                    return !round.isLocked;
                })
                .map((round) => round.roundIndex),
        [roundDefinitions, isEditMode, showConfirmedRounds]
    );
    const conflictCount = roundIndexes.filter((rIndex) => Boolean(conflicts[rIndex]?.length)).length;

    useEffect(() => {
        if (!isOpen) {
            clearAllRoundTimers(roundAnimationTimersRef);
            prevVisibleRoundsRef.current = [];
            setRenderedRoundIndexes((prev) => (prev.length === 0 ? prev : []));
            setRoundAnimationState((prev) =>
                Object.keys(prev).length === 0 ? prev : {}
            );
            return;
        }

        const prevVisibleRounds = prevVisibleRoundsRef.current;
        const enteringRounds = visibleRoundIndexes.filter((rIndex) => !prevVisibleRounds.includes(rIndex));
        const exitingRounds = prevVisibleRounds.filter((rIndex) => !visibleRoundIndexes.includes(rIndex));

        if (prevVisibleRounds.length === 0 && visibleRoundIndexes.length > 0) {
            setRenderedRoundIndexes(visibleRoundIndexes);
            setRoundAnimationState(
                visibleRoundIndexes.reduce((acc, rIndex) => {
                    acc[rIndex] = "enter";
                    return acc;
                }, {})
            );

            visibleRoundIndexes.forEach((rIndex) => {
                clearRoundTimer(roundAnimationTimersRef, rIndex);
                roundAnimationTimersRef.current[rIndex] = setTimeout(() => {
                    setRoundAnimationState((prev) => {
                        const next = { ...prev };
                        if (next[rIndex] === "enter") delete next[rIndex];
                        return next;
                    });
                    delete roundAnimationTimersRef.current[rIndex];
                }, ROUND_ANIMATION_MS);
            });
        } else {
            if (enteringRounds.length > 0) {
                setRenderedRoundIndexes((prev) => sortRoundIndexes([...new Set([...prev, ...enteringRounds])]));
                setRoundAnimationState((prev) => {
                    const next = { ...prev };
                    enteringRounds.forEach((rIndex) => {
                        next[rIndex] = "enter";
                    });
                    return next;
                });

                enteringRounds.forEach((rIndex) => {
                    clearRoundTimer(roundAnimationTimersRef, rIndex);
                    roundAnimationTimersRef.current[rIndex] = setTimeout(() => {
                        setRoundAnimationState((prev) => {
                            const next = { ...prev };
                            if (next[rIndex] === "enter") delete next[rIndex];
                            return next;
                        });
                        delete roundAnimationTimersRef.current[rIndex];
                    }, ROUND_ANIMATION_MS);
                });
            }

            if (exitingRounds.length > 0) {
                setRoundAnimationState((prev) => {
                    const next = { ...prev };
                    exitingRounds.forEach((rIndex) => {
                        next[rIndex] = "exit";
                    });
                    return next;
                });

                exitingRounds.forEach((rIndex) => {
                    clearRoundTimer(roundAnimationTimersRef, rIndex);
                    roundAnimationTimersRef.current[rIndex] = setTimeout(() => {
                        setRenderedRoundIndexes((prev) => prev.filter((value) => value !== rIndex));
                        setRoundAnimationState((prev) => {
                            const next = { ...prev };
                            delete next[rIndex];
                            return next;
                        });
                        delete roundAnimationTimersRef.current[rIndex];
                    }, ROUND_ANIMATION_MS);
                });
            }
        }

        prevVisibleRoundsRef.current = visibleRoundIndexes;
    }, [isOpen, visibleRoundIndexes]);

    useEffect(() => () => {
        clearAllRoundTimers(roundAnimationTimersRef);
    }, []);

    if (!isOpen) return null;

    const displayedRoundIndexes =
        renderedRoundIndexes.length === 0 && visibleRoundIndexes.length > 0
            ? visibleRoundIndexes
            : renderedRoundIndexes;

    return createPortal(
        <Overlay>
            <ModalContainer onClick={(e) => e.stopPropagation()}>
                <Header>
                    <div className="header-info">
                        <IconWrapper><RiCalendarEventLine /></IconWrapper>
                        <div className="texts">
                            <h3>{isEditMode ? "Reorganizar Calendario" : "Editor de Fixture"}</h3>
                            <span>{isEditMode ? "Modifica partidos futuros. El pasado es inmutable." : "Organiza las jornadas antes de guardar"}</span>
                        </div>
                    </div>
                    <CloseBtn onClick={onClose}><RiCloseLine /></CloseBtn>
                </Header>

                <Content>
                    <Toolbar>
                        <div className="info-teams">
                            <RiTeamLine /> {teams.length} Equipos 
                            {conflictCount > 0 ? (
                                <BadgeError><RiErrorWarningLine /> {conflictCount} Conflictos (Bloquea guardado)</BadgeError>
                            ) : (
                                <BadgeSuccess><RiCheckDoubleLine /> Fixture Válido</BadgeSuccess>
                            )}
                        </div>
                        <ToolbarActions>
                            {isEditMode && confirmedRoundsCount > 0 && (
                                <ToggleFilterButton
                                    type="button"
                                    onClick={() => setShowConfirmedRounds((prev) => !prev)}
                                    $active={showConfirmedRounds}
                                >
                                    {showConfirmedRounds ? <RiEyeOffLine /> : <RiEyeLine />}
                                    <span>
                                        {showConfirmedRounds
                                            ? "Ocultar confirmadas"
                                            : `Ver confirmadas (${confirmedRoundsCount})`}
                                    </span>
                                </ToggleFilterButton>
                            )}
                            {conflictCount > 0 && (
                                <ActionButton onClick={handleAutoFix} disabled={isAnimating} $color={v.colorWarning}>
                                    <RiMagicLine className={isAnimating ? "icon-spin" : ""} />
                                    <span>{isAnimating ? "Resolviendo..." : "Auto-Corregir"}</span>
                                </ActionButton>
                            )}
                            <ActionButton onClick={handleShuffle} disabled={isAnimating}>
                                <RiRefreshLine className={isAnimating ? "icon-spin" : ""} />
                                <span>{isEditMode ? "Restaurar" : "Reiniciar"}</span>
                            </ActionButton>
                        </ToolbarActions>
                    </Toolbar>

                    <ScrollArea>
                        {canShowRoundGenerators && (
                            <RoundCreationPanel>
                                {canGenerateExtraRound && (
                                    <button type="button" onClick={handleGenerateExtraRound}>
                                        <RiAddLine />
                                        <div>
                                            <strong>Jornada extra</strong>
                                            <span>Genera otra fecha regular con todos los participantes.</span>
                                        </div>
                                    </button>
                                )}
                                {canGenerateRepositionRound && (
                                    <button
                                        type="button"
                                        onClick={handleGenerateRepositionRound}
                                        className="reposition"
                                    >
                                        <RiHistoryLine />
                                        <div>
                                            <strong>Jornada de reposicion</strong>
                                            <span>Crea una fecha con los partidos pendientes del torneo.</span>
                                        </div>
                                    </button>
                                )}
                            </RoundCreationPanel>
                        )}
                        <Grid $isAnimating={isAnimating}>
                            {displayedRoundIndexes.length === 0 ? (
                                <EmptyRoundsState>
                                    {isEditMode && confirmedRoundsCount > 0 && !showConfirmedRounds
                                        ? "Las jornadas confirmadas estan ocultas. Activa el filtro para verlas."
                                        : "No hay jornadas para mostrar."}
                                </EmptyRoundsState>
                            ) : displayedRoundIndexes.map((rIndex) => {
                                // Detectar si la jornada está totalmente bloqueada (confirmada en BD)
                                const roundMatches = matchesByRound[rIndex] || [];
                                const roundIsLocked = isRoundLocked(rIndex);
                                const hasConflict = !!conflicts[rIndex];
                                const animationState = roundAnimationState[rIndex] || "idle";

                                return (
                                    <JornadaColumn 
                                        key={rIndex}
                                        $locked={roundIsLocked}
                                        $hasConflict={hasConflict}
                                        $animationState={animationState}
                                        onDragOver={(e) => { 
                                            if(!roundIsLocked && animationState !== "exit") { 
                                                e.preventDefault(); 
                                                e.dataTransfer.dropEffect = "move"; 
                                            }
                                        }}
                                        onDrop={(e) => { 
                                            if(!roundIsLocked && animationState !== "exit") handleDropOnJornada(e, Number(rIndex)) 
                                        }}
                                    >
                                        <JornadaTitle $hasConflict={hasConflict} $locked={roundIsLocked}>
                                            <span className="title-text">{getRoundTitle(rIndex)}</span>
                                            {roundIsLocked && <LockBadge><RiLock2Line /> Confirmada</LockBadge>}
                                        </JornadaTitle>
                                        
                                        <MatchesList>
                                            {roundMatches.map((match) => {
                                                const isConflict = conflicts[rIndex] && (
                                                    conflicts[rIndex].includes(match.local.id) || 
                                                    conflicts[rIndex].includes(match.visitante.id)
                                                );
                                                return (
                                                    <FixtureMatchCard 
                                                        key={match.id}
                                                        match={match}
                                                        onDragStart={handleDragStart}
                                                        onTeamDragStart={handleTeamDragStart}
                                                        onDragOver={(e) => { 
                                                            if(!match.roundLocked) { 
                                                                e.preventDefault(); 
                                                                e.dataTransfer.dropEffect = "move"; 
                                                            }
                                                        }}
                                                        onDrop={handleDropOnMatch}
                                                        onTeamDrop={handleDropOnTeamSlot}
                                                        toggleLock={toggleLock}
                                                        isConflict={isConflict}
                                                        selectedTeamId={selectedTeamId}
                                                        onTeamClick={handleTeamClick}
                                                    />
                                                );
                                            })}
                                            {roundMatches.length === 0 && <EmptySlot>Vacío</EmptySlot>}
                                        </MatchesList>
                                    </JornadaColumn>
                                );
                            })}
                        </Grid>
                    </ScrollArea>
                </Content>
                <Footer>
                    <WarningText>
                       * Haz click en un equipo para ver su ruta.<br/>
                       {isEditMode ? (
                        <>
                            * Puedes arrastrar equipos para cambiar rivales o invertir local y visitante.<br/>
                            * Las jornadas confirmadas (gris oscuro) no se pueden modificar ni generan conflictos.<br/>
                            * Solo se muestran jornadas naturales; las reposiciones no se editan aqui.
                        </>
                       ) : (
                        "* Puedes mover partidos entre jornadas."
                       )}
                    </WarningText>
                    <ActionWrapper>
                        <Btnsave 
                            titulo={isLoading ? "Guardando..." : (isEditMode ? "Guardar Cambios" : "Confirmar Fixture")}
                            bgcolor={conflictCount > 0 ? v.colorWarning : v.colorPrincipal}
                            icono={<RiCheckDoubleLine />}
                            funcion={handleConfirmar}
                            disabled={isLoading || conflictCount > 0} 
                        />
                    </ActionWrapper>
                </Footer>
            </ModalContainer>
        </Overlay>,
        document.body
    );
}

// --- STYLES ---
const spinAnimation = keyframes`from { transform: rotate(0deg); } to { transform: rotate(360deg); }`;
const fadeIn = keyframes`from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); }`;
const roundEnter = keyframes`
    from { opacity: 0; transform: translateY(14px) scale(0.97); }
    to { opacity: 1; transform: translateY(0) scale(1); }
`;
const roundExit = keyframes`
    from { opacity: 1; transform: translateY(0) scale(1); }
    to { opacity: 0; transform: translateY(14px) scale(0.97); }
`;

const Overlay = styled.div`
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; 
    background: rgba(0,0,0,0.85); backdrop-filter: blur(4px); 
    z-index: 2000; display: flex; justify-content: center; align-items: center; padding: 20px; 
    @media (max-width: 768px) { padding: 0; align-items: flex-end; }
`;

const ModalContainer = styled.div`
    width: 100%; max-width: 1300px; height: 90vh; 
    background: ${({ theme }) => theme.bg}; border-radius: 16px; 
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); 
    display: flex; flex-direction: column; 
    animation: ${fadeIn} 0.25s ease-out; border: 1px solid ${({ theme }) => theme.bg4}; 
    overflow: hidden; 
    @media (max-width: 768px) { height: 100vh; border-radius: 0; border: none; }
`;

const Header = styled.header`
    padding: 16px 24px; border-bottom: 1px solid ${({ theme }) => theme.bg4}; 
    display: flex; justify-content: space-between; align-items: center; 
    background: ${({ theme }) => theme.bg}; flex-shrink: 0; 
    .header-info { display: flex; gap: 12px; align-items: center; 
        .texts { display: flex; flex-direction: column; 
            h3 { margin: 0; font-size: 1.1rem; color: ${({ theme }) => theme.text}; font-weight: 700; } 
            span { font-size: 0.85rem; color: ${({ theme }) => theme.textFade}; } 
        } 
    }
`;

const IconWrapper = styled.div`
    width: 42px; height: 42px; border-radius: 12px; 
    background: ${v.colorPrincipal}20; color: ${v.colorPrincipal}; 
    display: flex; align-items: center; justify-content: center; font-size: 1.3rem;
`;

const CloseBtn = styled.button`
    background: transparent; border: none; width: 40px; height: 40px; border-radius: 50%; 
    display: flex; align-items: center; justify-content: center; font-size: 24px; cursor: pointer; 
    color: ${({ theme }) => theme.text}; 
    &:hover { background: ${({ theme }) => theme.bg3}; color: ${v.colorError}; }
`;

const Content = styled.div`flex: 1; display: flex; flex-direction: column; background: ${({ theme }) => theme.bg2}; overflow: hidden;`;

const Toolbar = styled.div`
    padding: 12px 24px; background: ${({ theme }) => theme.bgcards}; 
    border-bottom: 1px solid ${({ theme }) => theme.bg4}; 
    display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; 
    .info-teams { display: flex; align-items: center; gap: 15px; font-size: 0.9rem; font-weight: 600; color: ${({ theme }) => theme.text}; } 
    @media (max-width: 600px) { flex-direction: column; gap: 10px; align-items: stretch; }
`;

const ToolbarActions = styled.div`
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
`;

const ActionButton = styled.button`
    display: flex; align-items: center; gap: 8px; padding: 8px 16px; 
    background: ${({ theme }) => theme.bg3}; color: ${props => props.$color || props.theme.text}; 
    border: 1px solid ${({ theme }) => theme.bg4}; border-radius: 8px; 
    cursor: pointer; font-weight: 600; font-size: 0.85rem; transition: all 0.2s; 
    &:hover { background: ${props => props.$color || v.colorPrincipal}; color: white; border-color: transparent; } 
    &:disabled { opacity: 0.6; cursor: not-allowed; } 
    .icon-spin { animation: ${spinAnimation} 0.6s linear infinite; }
`;

const ToggleFilterButton = styled(ActionButton)`
    background: ${({ $active, theme }) => ($active ? `${v.colorPrincipal}18` : theme.bg3)};
    color: ${({ $active, theme }) => ($active ? v.colorPrincipal : theme.text)};
    border-color: ${({ $active, theme }) => ($active ? v.colorPrincipal : theme.bg4)};
`;

const BadgeError = styled.span`
    display: flex; align-items: center; gap: 5px; color: ${v.colorError}; 
    font-size: 0.8rem; background: ${v.colorError}15; padding: 4px 8px; border-radius: 4px; border: 1px solid ${v.colorError}30;
`;

const BadgeSuccess = styled.span`
    display: flex; align-items: center; gap: 5px; color: ${v.colorPrincipal}; 
    font-size: 0.8rem; background: ${v.colorPrincipal}15; padding: 4px 8px; border-radius: 4px;
`;

const ScrollArea = styled.div`
    flex: 1; overflow-y: auto; padding: 24px; 
    &::-webkit-scrollbar { width: 8px; } 
    &::-webkit-scrollbar-thumb { background: ${({ theme }) => theme.bg4}; border-radius: 4px; } 
    @media (max-width: 768px) { padding: 12px; }
`;

const Grid = styled.div`
    display: flex; flex-wrap: wrap; gap: 16px; 
    opacity: ${props => props.$isAnimating ? 0.5 : 1}; 
    transition: opacity 0.3s ease; align-items: flex-start;
`;

const RoundCreationPanel = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 14px;
    margin-bottom: 18px;
    animation: ${roundEnter} 0.24s cubic-bezier(0.22, 1, 0.36, 1) both;

    button {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 16px;
        border-radius: 14px;
        border: 1px solid ${({ theme }) => theme.bg4};
        background: ${({ theme }) => theme.bgcards};
        color: ${({ theme }) => theme.text};
        cursor: pointer;
        text-align: left;
        transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
    }

    button:hover {
        transform: translateY(-2px);
        border-color: ${v.colorPrincipal};
        box-shadow: 0 12px 26px rgba(0, 0, 0, 0.1);
    }

    button.reposition:hover {
        border-color: ${v.colorWarning};
    }

    svg {
        flex-shrink: 0;
        margin-top: 2px;
        font-size: 1.25rem;
        color: ${v.colorPrincipal};
    }

    button.reposition svg {
        color: ${v.colorWarning};
    }

    div {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
    }

    strong {
        font-size: 0.92rem;
    }

    span {
        font-size: 0.8rem;
        color: ${({ theme }) => theme.textFade};
        line-height: 1.4;
    }
`;

const EmptyRoundsState = styled.div`
    width: 100%;
    min-height: 180px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    border: 1px dashed ${({ theme }) => theme.bg4};
    border-radius: 12px;
    color: ${({ theme }) => theme.textFade};
    font-size: 0.9rem;
    text-align: center;
    background: ${({ theme }) => theme.bgcards};
`;

const JornadaColumn = styled.div`
    background: ${({ theme, $hasConflict, $locked }) => 
        $locked ? theme.bg2 : ($hasConflict ? `${v.colorError}05` : theme.bgcards)}; 
    border: 1px solid ${({ theme, $hasConflict, $locked }) => 
        $locked ? theme.bg4 : ($hasConflict ? v.colorError : theme.bg4)}; 
    border-radius: 12px; overflow: hidden; width: 280px; flex-shrink: 0; display: flex; flex-direction: column; 
    box-shadow: ${({$locked}) => $locked ? 'none' : '0 2px 4px rgba(0,0,0,0.03)'}; 
    opacity: ${({$locked}) => $locked ? 0.8 : 1};
    transform-origin: top center;
    pointer-events: ${({ $animationState }) => $animationState === "exit" ? "none" : "auto"};
    transition: box-shadow 0.2s ease, border-color 0.2s ease, background 0.2s ease;
    animation: ${({ $animationState }) => {
        if ($animationState === "enter") {
            return css`${roundEnter} 0.22s cubic-bezier(0.22, 1, 0.36, 1) both`;
        }
        if ($animationState === "exit") {
            return css`${roundExit} 0.22s ease both`;
        }
        return "none";
    }};
    @media (max-width: 600px) { width: 100%; }
`;

const JornadaTitle = styled.div`
    padding: 10px 15px; 
    background: ${({ theme, $locked }) => $locked ? theme.bg4 : theme.bg3}; 
    border-bottom: 1px solid ${({ theme }) => theme.bg4}; 
    display: flex; justify-content: space-between; align-items: center;
    
    .title-text {
        font-size: 0.85rem; 
        font-weight: 700;
        color: ${({ theme, $hasConflict, $locked }) => 
            $locked ? theme.textFade : ($hasConflict ? v.colorError : v.colorPrincipal)}; 
    }
`;

const LockBadge = styled.div`
    display: flex; align-items: center; gap: 4px;
    font-size: 0.7rem; color: ${({theme})=>theme.textFade}; font-weight: 600;
    text-transform: uppercase;
`;

const MatchesList = styled.div`padding: 8px; display: flex; flex-direction: column; gap: 8px; min-height: 50px;`;
const EmptySlot = styled.div`padding: 10px; border: 2px dashed ${({theme})=>theme.bg4}; border-radius: 8px; color: ${({theme})=>theme.textFade}; font-size: 0.8rem; text-align: center;`;

const Footer = styled.footer`
    padding: 16px 24px; border-top: 1px solid ${({ theme }) => theme.bg4}; 
    display: flex; justify-content: space-between; align-items: center; 
    background: ${({ theme }) => theme.bg}; flex-shrink: 0; gap: 15px; 
    @media (max-width: 600px) { flex-direction: column-reverse; align-items: stretch; padding: 16px; }
`;

const WarningText = styled.div`
    color: ${({ theme }) => theme.textFade}; font-size: 0.75rem; font-style: italic; line-height: 1.4; 
    @media (max-width: 600px) { text-align: center; }
`;

const ActionWrapper = styled.div`
    @media (max-width: 600px) { width: 100%; button { width: 100%; justify-content: center; } }
`;
