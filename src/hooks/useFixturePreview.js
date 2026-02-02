import { useState, useEffect, useCallback } from "react";
import { generarEstructuraInicial, validarFixture, autoCorregirFixture, transformarPartidosExistentes } from "../utils/fixtureAlgorithms";

export const useFixturePreview = (teams, config, isOpen, existingData = null) => {
    const [matches, setMatches] = useState([]);
    const [isAnimating, setIsAnimating] = useState(false);
    const [draggedMatch, setDraggedMatch] = useState(null);
    const [conflicts, setConflicts] = useState({});
    const [selectedTeamId, setSelectedTeamId] = useState(null);
    
    const isEditMode = !!existingData;

    // Inicializar Datos
    useEffect(() => {
        if (isOpen && teams.length > 0) {
            setIsAnimating(true);
            const timer = setTimeout(() => {
                if (isEditMode) {
                    const initial = transformarPartidosExistentes(existingData.matches, existingData.jornadas, teams);
                    setMatches(initial);
                } else {
                    if (matches.length === 0) {
                        const initial = generarEstructuraInicial(teams, config);
                        setMatches(initial);
                    }
                }
                setIsAnimating(false);
            }, 50);
            
            setSelectedTeamId(null);
            return () => clearTimeout(timer);
        } else if (!isOpen) {
             setMatches([]);
             setConflicts({});
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, isEditMode]); 

    // Validar en cada cambio
    useEffect(() => {
        if (matches.length > 0) {
            const { conflicts: newConflicts } = validarFixture(matches);
            setConflicts(newConflicts);
        }
    }, [matches]);

    // --- ACCIONES DE UI ---
    
    const handleTeamClick = (teamId) => {
        setSelectedTeamId(prev => prev === teamId ? null : teamId);
    };

    const toggleLock = (matchId) => {
        setMatches(prev => prev.map(m => {
            if (m.id === matchId) {
                if (m.roundLocked) return m;
                return { ...m, locked: !m.locked };
            }
            return m;
        }));
    };

    const handleShuffle = () => {
        const hasManualLocks = matches.some(m => m.locked && !m.roundLocked);
        if (hasManualLocks) {
            if(!window.confirm("Se perderán los bloqueos manuales. Las jornadas confirmadas se mantendrán. ¿Continuar?")) return;
        }

        setIsAnimating(true);
        setTimeout(() => {
            let newMatches;
            if (isEditMode) {
                newMatches = transformarPartidosExistentes(existingData.matches, existingData.jornadas, teams);
            } else {
                newMatches = generarEstructuraInicial(teams, config);
            }
            setMatches(newMatches);
            setIsAnimating(false);
            setSelectedTeamId(null);
        }, 300);
    };

    const handleAutoFix = () => {
        setIsAnimating(true);
        setTimeout(() => {
            const fixedMatches = autoCorregirFixture(matches, 5000); 
            setMatches(fixedMatches);
            setIsAnimating(false);
        }, 100);
    };

    // --- DRAG & DROP CORREGIDO ---

    const handleDragStart = useCallback((e, match) => {
        // Bloquear arrastre si la jornada está confirmada
        if (match.roundLocked) {
            e.preventDefault();
            return;
        }
        setDraggedMatch(match);
        e.dataTransfer.effectAllowed = "move";
        // Opcional: configurar ghost image
    }, []);

    const handleDropOnMatch = useCallback((e, targetMatch) => {
        e.preventDefault();
        e.stopPropagation(); // <--- CRÍTICO: Evita que el evento suba a la Jornada y duplique la acción

        if (!draggedMatch || draggedMatch.id === targetMatch.id) return;
        if (targetMatch.roundLocked) return; 

        if (draggedMatch.isByeMatch !== targetMatch.isByeMatch) {
            alert("Solo puedes intercambiar partidos del mismo tipo (Descanso vs Descanso o Normal vs Normal).");
            return;
        }

        setMatches(prev => {
            const newMatches = [...prev];
            const sourceIdx = newMatches.findIndex(m => m.id === draggedMatch.id);
            const targetIdx = newMatches.findIndex(m => m.id === targetMatch.id);
            
            if(sourceIdx === -1 || targetIdx === -1) return prev;

            // Guardamos las jornadas originales antes de tocar nada
            const sourceJornada = newMatches[sourceIdx].jornadaIndex;
            const targetJornada = newMatches[targetIdx].jornadaIndex;

            // Intercambio Directo (Swap)
            newMatches[sourceIdx] = { 
                ...newMatches[sourceIdx], 
                jornadaIndex: targetJornada, 
                locked: true // Se bloquea al moverse manualmente
            };
            newMatches[targetIdx] = { 
                ...newMatches[targetIdx], 
                jornadaIndex: sourceJornada 
                // El target no necesariamente se bloquea, o puedes decidir bloquearlo también
            };
            
            return newMatches;
        });
        setDraggedMatch(null);
    }, [draggedMatch]);

    const handleDropOnJornada = useCallback((e, targetJornadaIndex) => {
        e.preventDefault();
        e.stopPropagation(); // <--- CRÍTICO: Buena práctica para evitar efectos secundarios

        if (!draggedMatch) return;
        if (draggedMatch.jornadaIndex === targetJornadaIndex) return;

        // Validar bloqueo de jornada destino
        const targetIsLocked = matches.some(m => m.jornadaIndex === targetJornadaIndex && m.roundLocked);
        if (targetIsLocked) {
            alert("Esta jornada ya fue jugada o confirmada.");
            return;
        }

        const targetMatches = matches.filter(m => m.jornadaIndex === targetJornadaIndex);
        
        // 1. Buscar candidato ideal (mismo tipo, NO bloqueado, NO confirmado)
        let candidate = targetMatches.find(m => 
            m.isByeMatch === draggedMatch.isByeMatch && 
            !m.locked && 
            !m.roundLocked
        );

        // 2. Fallback: Buscar candidato bloqueado manualmente (pero NO confirmado)
        if (!candidate) {
            candidate = targetMatches.find(m => 
                m.isByeMatch === draggedMatch.isByeMatch && 
                !m.roundLocked
            );
        }

        setMatches(prev => {
            const newMatches = [...prev];
            const sourceIdx = newMatches.findIndex(m => m.id === draggedMatch.id);
            if (sourceIdx === -1) return prev;

            // CASO A: Hay espacio libre (raro en ligas llenas, posible si hay desbalance)
            // O no se encontró candidato compatible para swap
            if (!candidate && targetMatches.length < matches.filter(m => m.jornadaIndex === draggedMatch.jornadaIndex).length) {
                 newMatches[sourceIdx] = { 
                    ...newMatches[sourceIdx], 
                    jornadaIndex: targetJornadaIndex, 
                    locked: true 
                };
                return newMatches;
            }

            if (!candidate) {
                alert("No hay espacio o partidos intercambiables en esa jornada.");
                return prev;
            }

            const targetIdx = newMatches.findIndex(m => m.id === candidate.id);
            if (targetIdx === -1) return prev;

            // CASO B: Swap con candidato encontrado al azar en la columna
            const sourceJornada = newMatches[sourceIdx].jornadaIndex;
            
            newMatches[sourceIdx] = { 
                ...newMatches[sourceIdx], 
                jornadaIndex: targetJornadaIndex, // Usamos el índice explícito del drop
                locked: true 
            };
            newMatches[targetIdx] = { 
                ...newMatches[targetIdx], 
                jornadaIndex: sourceJornada 
            };

            return newMatches;
        });

        setDraggedMatch(null);
    }, [draggedMatch, matches]);

    // --- PREPARAR SALIDA ---
    
    const matchesByRound = {};
    matches.forEach(m => {
        if(!matchesByRound[m.jornadaIndex]) matchesByRound[m.jornadaIndex] = [];
        matchesByRound[m.jornadaIndex].push(m);
    });

    Object.keys(matchesByRound).forEach(key => {
        matchesByRound[key].sort((a, b) => {
            if (a.isByeMatch && !b.isByeMatch) return -1;
            if (!a.isByeMatch && b.isByeMatch) return 1;
            return 0;
        });
    });

    return {
        matches,
        matchesByRound,
        conflicts,
        selectedTeamId,
        isAnimating,
        isEditMode,
        handleTeamClick,
        toggleLock,
        handleShuffle,
        handleAutoFix,
        handleDragStart,
        handleDropOnMatch,
        handleDropOnJornada
    };
};