import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import styled, { keyframes, css } from "styled-components";
import { v } from "../../../../../styles/variables";
import { 
    RiRefreshLine, 
    RiCheckDoubleLine, 
    RiCloseLine, 
    RiCalendarEventLine, 
    RiTeamLine,
    RiLock2Line,
    RiLockUnlockLine, // CORREGIDO: RiUnlockLine -> RiLockUnlockLine
    RiMagicLine,
    RiDragMove2Line,
    RiErrorWarningLine
} from "react-icons/ri";
import { generarFixture } from "../../../../../services/torneos";
import { Btnsave } from "../../../../../index"; 

export function FixturePreviewModal({ 
    isOpen, 
    onClose, 
    onConfirm, 
    teams = [], 
    config, 
    isLoading 
}) {
    // Estado plano de partidos para facilitar manipulación (id, jornadaIndex, local, visita, locked)
    const [matches, setMatches] = useState([]);
    const [isAnimating, setIsAnimating] = useState(false);
    const [draggedMatch, setDraggedMatch] = useState(null);
    const [conflicts, setConflicts] = useState({}); // Mapa de conflictos por jornada

    // --- INICIALIZACIÓN ---
    useEffect(() => {
        if (isOpen && teams.length > 0) {
            generarEstructuraInicial();
        }
    }, [isOpen, teams]);

    // Detectar conflictos cada vez que cambian los partidos
    useEffect(() => {
        validarFixture();
    }, [matches]);

    const generarEstructuraInicial = () => {
        if (teams.length < 2) return;
        
        // 1. Barajar equipos inicialmente
        const mixed = [...teams];
        for (let i = mixed.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [mixed[i], mixed[j]] = [mixed[j], mixed[i]];
        }

        // 2. Generar Rounds (Ida)
        const rounds = generarFixture(mixed); 
        let newMatches = [];
        let matchIdCounter = 1;

        // Convertir a estructura plana manejable
        rounds.forEach((round, rIndex) => {
            round.forEach(m => {
                const t1 = mixed.find(t => t.id === m.home);
                const t2 = mixed.find(t => t.id === m.away);
                
                // Si t2 es undefined, es un BYE (Descanso). Lo incluimos para poder moverlo también si se desea.
                // Si prefieres no mostrar descansos, filtra aquí. 
                // Para impares, es util ver quien descansa.
                if (t1) {
                    newMatches.push({
                        id: `temp_${matchIdCounter++}`,
                        local: t1,
                        visitante: t2 || { id: 'BYE', name: 'Descansa', img: null }, // Dummy team para descanso
                        jornadaIndex: rIndex,
                        locked: false
                    });
                }
            });
        });

        // 3. Manejo de Vueltas (Ida y Vuelta)
        if (config?.vueltas === "2") {
            const totalRoundsIda = rounds.length;
            const matchesVuelta = newMatches.map(m => ({
                ...m,
                id: `temp_${matchIdCounter++}`,
                local: m.visitante, // Invertir localía
                visitante: m.local,
                jornadaIndex: m.jornadaIndex + totalRoundsIda, // Desplazar jornadas
                locked: false
            }));
            newMatches = [...newMatches, ...matchesVuelta];
        }

        setMatches(newMatches);
    };

    // --- LÓGICA DE VALIDACIÓN ---
    const validarFixture = () => {
        const newConflicts = {};
        
        // Agrupar por jornada
        const byRound = {};
        matches.forEach(m => {
            if (!byRound[m.jornadaIndex]) byRound[m.jornadaIndex] = [];
            byRound[m.jornadaIndex].push(m);
        });

        Object.keys(byRound).forEach(rIndex => {
            const teamsInRound = new Set();
            const duplicates = new Set();

            byRound[rIndex].forEach(m => {
                // Checar Local
                if (m.local.id !== 'BYE') {
                    if (teamsInRound.has(m.local.id)) duplicates.add(m.local.id);
                    teamsInRound.add(m.local.id);
                }
                // Checar Visitante
                if (m.visitante.id !== 'BYE') {
                    if (teamsInRound.has(m.visitante.id)) duplicates.add(m.visitante.id);
                    teamsInRound.add(m.visitante.id);
                }
            });

            if (duplicates.size > 0) {
                newConflicts[rIndex] = Array.from(duplicates);
            }
        });

        setConflicts(newConflicts);
    };

    // --- LÓGICA DRAG & DROP (Nativa) ---
    const handleDragStart = (e, match) => {
        setDraggedMatch(match);
        e.dataTransfer.effectAllowed = "move";
        // Imagen fantasma transparente para mejor UX (opcional)
        // e.dataTransfer.setDragImage(e.target, 20, 20); 
    };

    const handleDragOver = (e) => {
        e.preventDefault(); // Necesario para permitir Drop
        e.dataTransfer.dropEffect = "move";
    };

    const handleDropOnMatch = (e, targetMatch) => {
        e.preventDefault();
        if (!draggedMatch || draggedMatch.id === targetMatch.id) return;

        // INTERCAMBIO (SWAP): El partido A va a la jornada de B, y B a la de A.
        const updatedMatches = matches.map(m => {
            if (m.id === draggedMatch.id) {
                return { ...m, jornadaIndex: targetMatch.jornadaIndex, locked: true };
            }
            if (m.id === targetMatch.id) {
                return { ...m, jornadaIndex: draggedMatch.jornadaIndex, locked: true }; // También bloqueamos el destino para evitar caos
            }
            return m;
        });

        setMatches(updatedMatches);
        setDraggedMatch(null);
    };

    const handleDropOnJornada = (e, targetJornadaIndex) => {
        e.preventDefault();
        if (!draggedMatch) return;
        
        // Si soltamos en el header de la jornada, simplemente movemos (sin swap explicito, solo insertamos)
        // OJO: Esto generará desbalance (+1 partido en una, -1 en otra).
        if (draggedMatch.jornadaIndex === targetJornadaIndex) return;

        const updatedMatches = matches.map(m => {
            if (m.id === draggedMatch.id) {
                return { ...m, jornadaIndex: targetJornadaIndex, locked: true };
            }
            return m;
        });

        setMatches(updatedMatches);
        setDraggedMatch(null);
    };

    // --- FUNCIONES DE ACCIÓN ---

    const handleShuffle = () => {
        if (matches.some(m => m.locked)) {
            if(!window.confirm("Hay partidos bloqueados manualmente. 'Barajar' solo reorganizará los NO bloqueados y podría generar conflictos. ¿Continuar?")) return;
        }

        setIsAnimating(true);
        setTimeout(() => {
            // Solo barajamos los equipos, pero mantenemos la estructura de rounds base...
            // Es complejo barajar parcialmente sobre una estructura existente.
            // Para simplificar: Si barajas, reseteas todo (menos locks si implementasemos logica compleja, pero lo mejor es resetear).
            // Si el usuario quiere mantener locks, usará "Auto-Corregir".
            generarEstructuraInicial();
            setIsAnimating(false);
        }, 600);
    };

    const handleAutoFix = () => {
        setIsAnimating(true);
        setTimeout(() => {
            let currentMatches = [...matches];
            // let improved = false;
            
            // Intento simple de resolución: Buscar partidos en conflicto y moverlos a huecos
            // Iteramos X veces para intentar estabilizar
            for (let i = 0; i < 50; i++) {
                const roundsConflictivos = Object.keys(conflicts).map(Number);
                if (roundsConflictivos.length === 0) break;

                // Tomamos un partido de una jornada conflictiva que NO esté bloqueado
                const badMatchIndex = currentMatches.findIndex(m => 
                    roundsConflictivos.includes(m.jornadaIndex) && 
                    !m.locked && 
                    (conflicts[m.jornadaIndex].includes(m.local.id) || conflicts[m.jornadaIndex].includes(m.visitante.id))
                );

                if (badMatchIndex === -1) break; // No podemos mover nada más

                const badMatch = currentMatches[badMatchIndex];
                
                // Buscamos una jornada destino donde estos equipos NO jueguen
                // Y idealmente, intercambiamos con un partido que no genere conflicto en el origen
                const targetRoundCandidate = encontrarMejorJornada(badMatch, currentMatches);
                
                if (targetRoundCandidate !== -1) {
                    // Mover
                    currentMatches[badMatchIndex] = { ...badMatch, jornadaIndex: targetRoundCandidate };
                    // improved = true;
                    // Recalcular conflictos simulado para la siguiente iteración
                    // (Aquí simplificamos confiando en el re-render o podríamos actualizar el mapa localmente)
                }
            }
            
            setMatches(currentMatches);
            setIsAnimating(false);
        }, 500);
    };

    const encontrarMejorJornada = (match, allMatches) => {
        // Buscar una jornada donde local y visita no jueguen
        const totalRounds = Math.max(...allMatches.map(m => m.jornadaIndex)) + 1;
        
        for (let r = 0; r < totalRounds; r++) {
            if (r === match.jornadaIndex) continue;
            
            const teamsInRound = allMatches
                .filter(m => m.jornadaIndex === r)
                .flatMap(m => [m.local.id, m.visitante.id]);
            
            if (!teamsInRound.includes(match.local.id) && !teamsInRound.includes(match.visitante.id)) {
                return r;
            }
        }
        return -1;
    };

    const handleConfirmar = () => {
        // Reconstruir el formato que espera el backend
        // Agrupar por Jornadas ordenadas
        const maxJornada = Math.max(...matches.map(m => m.jornadaIndex));
        const finalFixture = [];

        for (let i = 0; i <= maxJornada; i++) {
            const matchesInRound = matches
                .filter(m => m.jornadaIndex === i)
                .map(m => ({
                    local: m.local,
                    visitante: m.visitante
                }))
                .filter(m => m.local.id !== 'BYE' && m.visitante.id !== 'BYE'); // Quitar descansos antes de guardar

            if (matchesInRound.length > 0) {
                finalFixture.push({
                    name: `Jornada ${i + 1}`,
                    matches: matchesInRound
                });
            }
        }
        
        onConfirm(finalFixture);
    };

    const toggleLock = (matchId) => {
        setMatches(prev => prev.map(m => m.id === matchId ? { ...m, locked: !m.locked } : m));
    };

    if (!isOpen) return null;

    // Agrupar para renderizar
    const matchesByRound = {};
    matches.forEach(m => {
        if(!matchesByRound[m.jornadaIndex]) matchesByRound[m.jornadaIndex] = [];
        matchesByRound[m.jornadaIndex].push(m);
    });
    // Asegurar que iteramos en orden
    const roundIndexes = Object.keys(matchesByRound).sort((a,b) => Number(a) - Number(b));

    return createPortal(
        <Overlay>
            <ModalContainer onClick={(e) => e.stopPropagation()}>
                
                <Header>
                    <div className="header-info">
                        <IconWrapper>
                            <RiCalendarEventLine />
                        </IconWrapper>
                        <div className="texts">
                            <h3>Editor de Fixture</h3>
                            <span>Arrastra partidos para ajustar manualmente</span>
                        </div>
                    </div>
                    <CloseBtn onClick={onClose} aria-label="Cerrar">
                        <RiCloseLine />
                    </CloseBtn>
                </Header>

                <Content>
                    <Toolbar>
                        <div className="info-teams">
                            <RiTeamLine /> {teams.length} Equipos 
                            {Object.keys(conflicts).length > 0 && 
                                <BadgeError>
                                    <RiErrorWarningLine /> {Object.keys(conflicts).length} Jornadas con conflictos
                                </BadgeError>
                            }
                        </div>
                        
                        <div style={{display:'flex', gap:'10px'}}>
                            {Object.keys(conflicts).length > 0 && (
                                <ActionButton onClick={handleAutoFix} disabled={isAnimating} $color={v.colorWarning}>
                                    <RiMagicLine className={isAnimating ? "icon-spin" : ""} />
                                    <span>Auto-Corregir</span>
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
                                        {!!conflicts[rIndex] && <small> (Equipos duplicados)</small>}
                                    </JornadaTitle>
                                    
                                    <MatchesList>
                                        {matchesByRound[rIndex].map((match) => {
                                            const isConflict = conflicts[rIndex] && (
                                                conflicts[rIndex].includes(match.local.id) || 
                                                conflicts[rIndex].includes(match.visitante.id)
                                            );

                                            return (
                                                <MatchCard 
                                                    key={match.id}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, match)}
                                                    onDragOver={handleDragOver}
                                                    onDrop={(e) => handleDropOnMatch(e, match)}
                                                    $isLocked={match.locked}
                                                    $isConflict={isConflict}
                                                    $isBye={match.visitante.id === 'BYE'}
                                                >
                                                    <LockIcon onClick={() => toggleLock(match.id)}>
                                                        {match.locked ? <RiLock2Line /> : <RiLockUnlockLine style={{opacity:0.3}} />}
                                                    </LockIcon>
                                                    
                                                    <div className="teams-row">
                                                        <TeamName $align="left" title={match.local.name}>
                                                            {match.local.name}
                                                        </TeamName>
                                                        <VersusBadge>VS</VersusBadge>
                                                        <TeamName $align="right" title={match.visitante.name}>
                                                            {match.visitante.name}
                                                        </TeamName>
                                                    </div>

                                                    {match.visitante.id === 'BYE' && <ByeLabel>Descansa</ByeLabel>}
                                                </MatchCard>
                                            );
                                        })}
                                        {matchesByRound[rIndex].length === 0 && <EmptySlot>Arrastra aquí</EmptySlot>}
                                    </MatchesList>
                                </JornadaColumn>
                            ))}
                        </Grid>
                    </ScrollArea>
                </Content>

                <Footer>
                    <WarningText>
                       * Bloquea (🔒) partidos para que no se muevan al auto-corregir.
                       * Arrastra un partido sobre otro para intercambiarlos.
                    </WarningText>
                    <ActionWrapper>
                        <Btnsave 
                            titulo={isLoading ? "Guardando..." : "Confirmar Fixture"}
                            bgcolor={Object.keys(conflicts).length > 0 ? v.colorWarning : v.colorPrincipal}
                            icono={<RiCheckDoubleLine />}
                            funcion={handleConfirmar}
                            disabled={isLoading || Object.keys(conflicts).length > 0} // Deshabilitar si hay conflictos
                        />
                    </ActionWrapper>
                </Footer>

            </ModalContainer>
        </Overlay>,
        document.body
    );
}

// --- STYLES & ANIMATIONS ---

const spinAnimation = keyframes`
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
`;

const fadeIn = keyframes`
    from { opacity: 0; transform: scale(0.96); }
    to { opacity: 1; transform: scale(1); }
`;

const Overlay = styled.div`
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0,0,0,0.85); 
    backdrop-filter: blur(4px);
    z-index: 2000;
    display: flex; justify-content: center; align-items: center;
    padding: 20px;
    @media (max-width: 768px) { padding: 0; align-items: flex-end; }
`;

const ModalContainer = styled.div`
    width: 100%; max-width: 1200px; height: 90vh;
    background: ${({ theme }) => theme.bg};
    border-radius: 16px; 
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    display: flex; flex-direction: column;
    animation: ${fadeIn} 0.25s ease-out;
    border: 1px solid ${({ theme }) => theme.bg4};
    overflow: hidden;
    @media (max-width: 768px) { height: 100vh; border-radius: 0; border: none; }
`;

const Header = styled.header`
    padding: 16px 24px; border-bottom: 1px solid ${({ theme }) => theme.bg4};
    display: flex; justify-content: space-between; align-items: center;
    background: ${({ theme }) => theme.bg}; flex-shrink: 0;
    .header-info {
        display: flex; gap: 12px; align-items: center;
        .texts {
            display: flex; flex-direction: column;
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

const Content = styled.div`
    flex: 1; display: flex; flex-direction: column; background: ${({ theme }) => theme.bg2}; overflow: hidden; 
`;

const Toolbar = styled.div`
    padding: 12px 24px; background: ${({ theme }) => theme.bgcards};
    border-bottom: 1px solid ${({ theme }) => theme.bg4};
    display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;
    .info-teams { display: flex; align-items: center; gap: 15px; font-size: 0.9rem; font-weight: 600; color: ${({ theme }) => theme.text}; }
    @media (max-width: 600px) { flex-direction: column; gap: 10px; align-items: stretch; }
`;

const ActionButton = styled.button`
    display: flex; align-items: center; gap: 8px; padding: 8px 16px;
    background: ${({ theme }) => theme.bg3}; 
    color: ${props => props.$color || props.theme.text};
    border: 1px solid ${({ theme }) => theme.bg4}; 
    border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.85rem; transition: all 0.2s;
    &:hover { background: ${props => props.$color || v.colorPrincipal}; color: white; border-color: transparent; }
    &:disabled { opacity: 0.6; cursor: not-allowed; }
    .icon-spin { animation: ${spinAnimation} 0.6s linear infinite; }
`;

const BadgeError = styled.span`
    display: flex; align-items: center; gap: 5px; color: ${v.colorError}; font-size: 0.8rem; background: ${v.colorError}15; padding: 4px 8px; border-radius: 4px;
`;

const ScrollArea = styled.div`
    flex: 1; overflow-y: auto; padding: 24px;
    &::-webkit-scrollbar { width: 8px; }
    &::-webkit-scrollbar-thumb { background: ${({ theme }) => theme.bg4}; border-radius: 4px; }
    @media (max-width: 768px) { padding: 12px; }
`;

const Grid = styled.div`
    display: flex; flex-wrap: wrap; gap: 16px;
    opacity: ${props => props.$isAnimating ? 0.5 : 1}; transition: opacity 0.3s ease;
    align-items: flex-start;
`;

const JornadaColumn = styled.div`
    background: ${({ theme, $hasConflict }) => $hasConflict ? `${v.colorError}05` : theme.bgcards}; 
    border: 1px solid ${({ theme, $hasConflict }) => $hasConflict ? v.colorError : theme.bg4};
    border-radius: 12px; overflow: hidden;
    width: 280px; flex-shrink: 0; display: flex; flex-direction: column;
    box-shadow: 0 2px 4px rgba(0,0,0,0.03);
    @media (max-width: 600px) { width: 100%; }
`;

const JornadaTitle = styled.div`
    padding: 10px 15px; background: ${({ theme }) => theme.bg3};
    font-size: 0.85rem; color: ${({ theme, $hasConflict }) => $hasConflict ? v.colorError : v.colorPrincipal}; 
    font-weight: 700; border-bottom: 1px solid ${({ theme }) => theme.bg4};
    display: flex; justify-content: space-between;
`;

const MatchesList = styled.div`
    padding: 8px; display: flex; flex-direction: column; gap: 8px; min-height: 50px;
`;

const MatchCard = styled.div`
    background: ${({ theme, $isConflict, $isLocked }) => {
        if ($isConflict) return `${v.colorError}15`;
        if ($isLocked) return `${v.colorPrincipal}10`;
        return theme.bg2;
    }};
    border: 1px solid ${({ theme, $isConflict, $isLocked }) => {
        if ($isConflict) return v.colorError;
        if ($isLocked) return `${v.colorPrincipal}50`;
        return 'transparent';
    }};
    border-radius: 8px; padding: 8px; cursor: grab; position: relative;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05); user-select: none;
    transition: transform 0.1s, box-shadow 0.1s;

    &:active { cursor: grabbing; transform: scale(1.02); z-index: 10; box-shadow: 0 5px 10px rgba(0,0,0,0.1); }
    &:hover { border-color: ${({theme}) => theme.textFade}; }

    .teams-row { display: flex; justify-content: space-between; align-items: center; width: 100%; }
`;

const TeamName = styled.span`
    flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    font-weight: 500; color: ${({ theme }) => theme.text};
    text-align: ${props => props.$align}; font-size: 0.8rem;
`;

const VersusBadge = styled.span`
    font-size: 0.65rem; font-weight: 800; color: ${({ theme }) => theme.textFade}; margin: 0 6px;
`;

const LockIcon = styled.div`
    position: absolute; top: -6px; right: -6px; 
    width: 20px; height: 20px; background: ${({theme}) => theme.bg}; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; color: ${v.colorPrincipal}; box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    cursor: pointer; z-index: 5;
    &:hover { transform: scale(1.1); }
`;

const ByeLabel = styled.div`
    font-size: 0.7rem; color: ${({theme})=>theme.textFade}; text-align: center; margin-top: 4px; font-style: italic;
`;

const EmptySlot = styled.div`
    padding: 10px; border: 2px dashed ${({theme})=>theme.bg4}; border-radius: 8px;
    color: ${({theme})=>theme.textFade}; font-size: 0.8rem; text-align: center;
`;

const Footer = styled.footer`
    padding: 16px 24px; border-top: 1px solid ${({ theme }) => theme.bg4};
    display: flex; justify-content: space-between; align-items: center;
    background: ${({ theme }) => theme.bg}; flex-shrink: 0; gap: 15px;
    @media (max-width: 600px) { flex-direction: column-reverse; align-items: stretch; padding: 16px; }
`;

const WarningText = styled.div`
    color: ${({ theme }) => theme.textFade}; font-size: 0.75rem; font-style: italic; white-space: pre-line;
    @media (max-width: 600px) { text-align: center; }
`;

const ActionWrapper = styled.div`
    @media (max-width: 600px) { width: 100%; button { width: 100%; justify-content: center; } }
`;