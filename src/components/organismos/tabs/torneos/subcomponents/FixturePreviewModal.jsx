import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import styled, { keyframes } from "styled-components";
import { v } from "../../../../../styles/variables";
import { 
    RiRefreshLine, 
    RiCheckDoubleLine, 
    RiCloseLine, 
    RiCalendarEventLine, 
    RiTeamLine,
    RiMagicLine,
    RiErrorWarningLine
} from "react-icons/ri";
import { Btnsave } from "../../../../../index"; 
import { generarEstructuraInicial, validarFixture, autoCorregirFixture } from "../../../../../utils/fixtureAlgorithms";
import { FixtureMatchCard } from "./FixtureMatchCard";

export function FixturePreviewModal({ 
    isOpen, 
    onClose, 
    onConfirm, 
    teams = [], 
    config, 
    isLoading 
}) {
    const [matches, setMatches] = useState([]);
    const [isAnimating, setIsAnimating] = useState(false);
    const [draggedMatch, setDraggedMatch] = useState(null);
    const [conflicts, setConflicts] = useState({});
    const [selectedTeamId, setSelectedTeamId] = useState(null);

    // --- EFECTOS ---
    useEffect(() => {
        if (isOpen && teams.length > 0) {
            // Solo generamos si está vacío para persistencia
            if (matches.length === 0) {
                const initial = generarEstructuraInicial(teams, config);
                setMatches(initial);
            }
            setSelectedTeamId(null); 
        }
    }, [isOpen, teams, config, matches.length]);

    useEffect(() => {
        const { conflicts: newConflicts } = validarFixture(matches);
        setConflicts(newConflicts);
    }, [matches]);

    // --- HANDLERS ---
    const handleTeamClick = (teamId) => {
        if (selectedTeamId === teamId) {
            setSelectedTeamId(null);
        } else {
            setSelectedTeamId(teamId);
        }
    };

    const toggleLock = (matchId) => {
        setMatches(prev => prev.map(m => m.id === matchId ? { ...m, locked: !m.locked } : m));
    };

    // --- DRAG & DROP ---
    const handleDragStart = (e, match) => {
        setDraggedMatch(match);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleDropOnMatch = (e, targetMatch) => {
        e.preventDefault();
        if (!draggedMatch || draggedMatch.id === targetMatch.id) return;

        // Validar tipos
        if (draggedMatch.isByeMatch !== targetMatch.isByeMatch) {
            alert("Para mantener el balance del torneo, solo puedes intercambiar un Descanso por otro Descanso.");
            return;
        }

        // SWAP
        const updatedMatches = matches.map(m => {
            if (m.id === draggedMatch.id) {
                // El partido que el usuario arrastró SÍ se bloquea
                return { ...m, jornadaIndex: targetMatch.jornadaIndex, locked: true };
            }
            if (m.id === targetMatch.id) {
                // El partido desplazado NO se autobloquea (mantiene su estado anterior o queda libre)
                // Se eliminó 'locked: true' para que el algoritmo pueda moverlo si es necesario
                return { ...m, jornadaIndex: draggedMatch.jornadaIndex };
            }
            return m;
        });

        setMatches(updatedMatches);
        setDraggedMatch(null);
    };

    const handleDropOnJornada = (e, targetJornadaIndex) => {
        e.preventDefault();
        if (!draggedMatch) return;
        if (draggedMatch.jornadaIndex === targetJornadaIndex) return;

        // Validar torneos impares
        const hasByes = matches.some(m => m.isByeMatch);
        if (hasByes) {
            return;
        }

        const updatedMatches = matches.map(m => {
            if (m.id === draggedMatch.id) {
                return { ...m, jornadaIndex: targetJornadaIndex, locked: true };
            }
            return m;
        });
        setMatches(updatedMatches);
        setDraggedMatch(null);
    };

    // --- ACCIONES ---
    const handleShuffle = () => {
        if (matches.some(m => m.locked)) {
            if(!window.confirm("Se perderán los bloqueos. ¿Continuar?")) return;
        }

        setIsAnimating(true);
        setTimeout(() => {
            const newMatches = generarEstructuraInicial(teams, config);
            setMatches(newMatches);
            setIsAnimating(false);
            setConflicts({});
            setSelectedTeamId(null);
        }, 300);
    };

    const handleAutoFix = () => {
        setIsAnimating(true);
        setTimeout(() => {
            const fixedMatches = autoCorregirFixture(matches, 15000); 
            setMatches(fixedMatches);
            setIsAnimating(false);
        }, 100);
    };

    const handleConfirmar = () => {
        const maxJornada = Math.max(...matches.map(m => m.jornadaIndex));
        const finalFixture = [];

        for (let i = 0; i <= maxJornada; i++) {
            const matchesInRound = matches
                .filter(m => m.jornadaIndex === i)
                .map(m => ({
                    local: m.local,
                    visitante: m.visitante
                }));
            
            if (matchesInRound.length > 0) {
                finalFixture.push({
                    name: `Jornada ${i + 1}`,
                    matches: matchesInRound
                });
            }
        }
        
        onConfirm(finalFixture);
    };

    if (!isOpen) return null;

    // --- PREPARACIÓN DEL RENDER ---
    const matchesByRound = {};
    matches.forEach(m => {
        if(!matchesByRound[m.jornadaIndex]) matchesByRound[m.jornadaIndex] = [];
        matchesByRound[m.jornadaIndex].push(m);
    });

    // --- ORDENAMIENTO VISUAL (NUEVO) ---
    // Recorremos cada jornada y ordenamos para que los partidos de descanso (isByeMatch) queden primeros.
    Object.keys(matchesByRound).forEach(key => {
        matchesByRound[key].sort((a, b) => {
            // Si 'a' es bye y 'b' no lo es, 'a' va antes (-1)
            if (a.isByeMatch && !b.isByeMatch) return -1;
            // Si 'b' es bye y 'a' no lo es, 'b' va antes (1)
            if (!a.isByeMatch && b.isByeMatch) return 1;
            return 0;
        });
    });
    
    const roundIndexes = Object.keys(matchesByRound).sort((a,b) => Number(a) - Number(b));
    const conflictCount = Object.keys(conflicts).length;

    return createPortal(
        <Overlay>
            <ModalContainer onClick={(e) => e.stopPropagation()}>
                <Header>
                    <div className="header-info">
                        <IconWrapper><RiCalendarEventLine /></IconWrapper>
                        <div className="texts">
                            <h3>Editor de Fixture</h3>
                            <span>Organiza las jornadas antes de guardar</span>
                        </div>
                    </div>
                    <CloseBtn onClick={onClose}><RiCloseLine /></CloseBtn>
                </Header>

                <Content>
                    <Toolbar>
                        <div className="info-teams">
                            <RiTeamLine /> {teams.length} Equipos 
                            {conflictCount > 0 ? (
                                <BadgeError><RiErrorWarningLine /> {conflictCount} Conflictos</BadgeError>
                            ) : (
                                <BadgeSuccess><RiCheckDoubleLine /> Fixture Válido</BadgeSuccess>
                            )}
                        </div>
                        <div style={{display:'flex', gap:'10px'}}>
                            {conflictCount > 0 && (
                                <ActionButton onClick={handleAutoFix} disabled={isAnimating} $color={v.colorWarning}>
                                    <RiMagicLine className={isAnimating ? "icon-spin" : ""} />
                                    <span>{isAnimating ? "Resolviendo..." : "Auto-Corregir"}</span>
                                </ActionButton>
                            )}
                            <ActionButton onClick={handleShuffle} disabled={isAnimating}>
                                <RiRefreshLine className={isAnimating ? "icon-spin" : ""} />
                                <span>Reiniciar</span>
                            </ActionButton>
                        </div>
                    </Toolbar>

                    <ScrollArea>
                        <Grid $isAnimating={isAnimating}>
                            {roundIndexes.map((rIndex) => (
                                <JornadaColumn 
                                    key={rIndex}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDropOnJornada(e, Number(rIndex))}
                                    $hasConflict={!!conflicts[rIndex]}
                                >
                                    <JornadaTitle $hasConflict={!!conflicts[rIndex]}>
                                        Jornada {Number(rIndex) + 1}
                                    </JornadaTitle>
                                    <MatchesList>
                                        {matchesByRound[rIndex].map((match) => {
                                            const isConflict = conflicts[rIndex] && (
                                                conflicts[rIndex].includes(match.local.id) || 
                                                conflicts[rIndex].includes(match.visitante.id)
                                            );
                                            return (
                                                <FixtureMatchCard 
                                                    key={match.id}
                                                    match={match}
                                                    onDragStart={handleDragStart}
                                                    onDragOver={handleDragOver}
                                                    onDrop={handleDropOnMatch}
                                                    toggleLock={toggleLock}
                                                    isConflict={isConflict}
                                                    selectedTeamId={selectedTeamId}
                                                    onTeamClick={handleTeamClick}
                                                />
                                            );
                                        })}
                                        {matchesByRound[rIndex].length === 0 && <EmptySlot>Vacío</EmptySlot>}
                                    </MatchesList>
                                </JornadaColumn>
                            ))}
                        </Grid>
                    </ScrollArea>
                </Content>
                <Footer>
                    <WarningText>
                       * Haz click en un equipo para ver su ruta.<br/>
                       * Arrastra un partido SOBRE otro para intercambiarlos.
                    </WarningText>
                    <ActionWrapper>
                        <Btnsave 
                            titulo={isLoading ? "Guardando..." : "Confirmar Fixture"}
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
const Overlay = styled.div`position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.85); backdrop-filter: blur(4px); z-index: 2000; display: flex; justify-content: center; align-items: center; padding: 20px; @media (max-width: 768px) { padding: 0; align-items: flex-end; }`;
const ModalContainer = styled.div`width: 100%; max-width: 1300px; height: 90vh; background: ${({ theme }) => theme.bg}; border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); display: flex; flex-direction: column; animation: ${fadeIn} 0.25s ease-out; border: 1px solid ${({ theme }) => theme.bg4}; overflow: hidden; @media (max-width: 768px) { height: 100vh; border-radius: 0; border: none; }`;
const Header = styled.header`padding: 16px 24px; border-bottom: 1px solid ${({ theme }) => theme.bg4}; display: flex; justify-content: space-between; align-items: center; background: ${({ theme }) => theme.bg}; flex-shrink: 0; .header-info { display: flex; gap: 12px; align-items: center; .texts { display: flex; flex-direction: column; h3 { margin: 0; font-size: 1.1rem; color: ${({ theme }) => theme.text}; font-weight: 700; } span { font-size: 0.85rem; color: ${({ theme }) => theme.textFade}; } } }`;
const IconWrapper = styled.div`width: 42px; height: 42px; border-radius: 12px; background: ${v.colorPrincipal}20; color: ${v.colorPrincipal}; display: flex; align-items: center; justify-content: center; font-size: 1.3rem;`;
const CloseBtn = styled.button`background: transparent; border: none; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; cursor: pointer; color: ${({ theme }) => theme.text}; &:hover { background: ${({ theme }) => theme.bg3}; color: ${v.colorError}; }`;
const Content = styled.div`flex: 1; display: flex; flex-direction: column; background: ${({ theme }) => theme.bg2}; overflow: hidden;`;
const Toolbar = styled.div`padding: 12px 24px; background: ${({ theme }) => theme.bgcards}; border-bottom: 1px solid ${({ theme }) => theme.bg4}; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; .info-teams { display: flex; align-items: center; gap: 15px; font-size: 0.9rem; font-weight: 600; color: ${({ theme }) => theme.text}; } @media (max-width: 600px) { flex-direction: column; gap: 10px; align-items: stretch; }`;
const ActionButton = styled.button`display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: ${({ theme }) => theme.bg3}; color: ${props => props.$color || props.theme.text}; border: 1px solid ${({ theme }) => theme.bg4}; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.85rem; transition: all 0.2s; &:hover { background: ${props => props.$color || v.colorPrincipal}; color: white; border-color: transparent; } &:disabled { opacity: 0.6; cursor: not-allowed; } .icon-spin { animation: ${spinAnimation} 0.6s linear infinite; }`;
const BadgeError = styled.span`display: flex; align-items: center; gap: 5px; color: ${v.colorError}; font-size: 0.8rem; background: ${v.colorError}15; padding: 4px 8px; border-radius: 4px;`;
const BadgeSuccess = styled.span`display: flex; align-items: center; gap: 5px; color: ${v.colorPrincipal}; font-size: 0.8rem; background: ${v.colorPrincipal}15; padding: 4px 8px; border-radius: 4px;`;
const ScrollArea = styled.div`flex: 1; overflow-y: auto; padding: 24px; &::-webkit-scrollbar { width: 8px; } &::-webkit-scrollbar-thumb { background: ${({ theme }) => theme.bg4}; border-radius: 4px; } @media (max-width: 768px) { padding: 12px; }`;
const Grid = styled.div`display: flex; flex-wrap: wrap; gap: 16px; opacity: ${props => props.$isAnimating ? 0.5 : 1}; transition: opacity 0.3s ease; align-items: flex-start;`;
const JornadaColumn = styled.div`background: ${({ theme, $hasConflict }) => $hasConflict ? `${v.colorError}05` : theme.bgcards}; border: 1px solid ${({ theme, $hasConflict }) => $hasConflict ? v.colorError : theme.bg4}; border-radius: 12px; overflow: hidden; width: 280px; flex-shrink: 0; display: flex; flex-direction: column; box-shadow: 0 2px 4px rgba(0,0,0,0.03); @media (max-width: 600px) { width: 100%; }`;
const JornadaTitle = styled.div`padding: 10px 15px; background: ${({ theme }) => theme.bg3}; font-size: 0.85rem; color: ${({ theme, $hasConflict }) => $hasConflict ? v.colorError : v.colorPrincipal}; font-weight: 700; border-bottom: 1px solid ${({ theme }) => theme.bg4}; display: flex; justify-content: space-between;`;
const MatchesList = styled.div`padding: 8px; display: flex; flex-direction: column; gap: 8px; min-height: 50px;`;
const EmptySlot = styled.div`padding: 10px; border: 2px dashed ${({theme})=>theme.bg4}; border-radius: 8px; color: ${({theme})=>theme.textFade}; font-size: 0.8rem; text-align: center;`;
const Footer = styled.footer`padding: 16px 24px; border-top: 1px solid ${({ theme }) => theme.bg4}; display: flex; justify-content: space-between; align-items: center; background: ${({ theme }) => theme.bg}; flex-shrink: 0; gap: 15px; @media (max-width: 600px) { flex-direction: column-reverse; align-items: stretch; padding: 16px; }`;
const WarningText = styled.div`color: ${({ theme }) => theme.textFade}; font-size: 0.75rem; font-style: italic; line-height: 1.4; @media (max-width: 600px) { text-align: center; }`;
const ActionWrapper = styled.div`@media (max-width: 600px) { width: 100%; button { width: 100%; justify-content: center; } }`;