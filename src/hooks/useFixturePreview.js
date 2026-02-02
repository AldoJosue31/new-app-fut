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
            // Pequeño timeout para no bloquear el render inicial del modal
            const timer = setTimeout(() => {
                if (isEditMode) {
                    // MODO EDICIÓN: Transformar DB -> Editor
                    const initial = transformarPartidosExistentes(existingData.matches, existingData.jornadas, teams);
                    setMatches(initial);
                } else {
                    // MODO CREACIÓN: Generar nuevo
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
             // Limpiar estado al cerrar
             setMatches([]);
             setConflicts({});
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, isEditMode]); 

    // Validar en cada cambio de matches
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
                // PROHIBIDO desbloquear si la jornada entera está confirmada
                if (m.roundLocked) return m;
                return { ...m, locked: !m.locked };
            }
            return m;
        }));
    };

    const handleShuffle = () => {
        const hasManualLocks = matches.some(m => m.locked && !m.roundLocked);
        if (hasManualLocks) {
            if(!window.confirm("Se perderán los bloqueos manuales (candados naranjas). Las jornadas confirmadas se mantendrán. ¿Continuar?")) return;
        }

        setIsAnimating(true);
        setTimeout(() => {
            let newMatches;
            if (isEditMode) {
                // "Restaurar" a estado inicial DB, respetando confirmados
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
            // El autofix ahora respeta 'roundLocked' internamente
            const fixedMatches = autoCorregirFixture(matches, 5000); 
            setMatches(fixedMatches);
            setIsAnimating(false);
        }, 100);
    };

    // --- DRAG & DROP ---

    const handleDragStart = useCallback((e, match) => {
        if (match.roundLocked) {
            e.preventDefault();
            return;
        }
        setDraggedMatch(match);
        e.dataTransfer.effectAllowed = "move";
        // Ghost image opcional
    }, []);

    const handleDropOnMatch = useCallback((e, targetMatch) => {
        e.preventDefault();
        
        // Validaciones preventivas
        if (!draggedMatch || draggedMatch.id === targetMatch.id) return;
        if (targetMatch.roundLocked) return; // No tocar confirmados

        if (draggedMatch.isByeMatch !== targetMatch.isByeMatch) {
            alert("Solo puedes intercambiar partidos del mismo tipo (Descanso vs Descanso o Normal vs Normal).");
            return;
        }

        setMatches(prev => {
            const newMatches = [...prev];
            const sourceIdx = newMatches.findIndex(m => m.id === draggedMatch.id);
            const targetIdx = newMatches.findIndex(m => m.id === targetMatch.id);
            
            if(sourceIdx === -1 || targetIdx === -1) return prev;

            // Intercambiar Jornadas
            const tempJornada = newMatches[sourceIdx].jornadaIndex;
            newMatches[sourceIdx] = { 
                ...newMatches[sourceIdx], 
                jornadaIndex: newMatches[targetIdx].jornadaIndex, 
                locked: true // Auto-lock al mover manualmente
            };
            newMatches[targetIdx] = { 
                ...newMatches[targetIdx], 
                jornadaIndex: tempJornada 
            };
            
            return newMatches;
        });
        setDraggedMatch(null);
    }, [draggedMatch]);

    const handleDropOnJornada = useCallback((e, targetJornadaIndex) => {
        e.preventDefault();
        if (!draggedMatch) return;
        if (draggedMatch.jornadaIndex === targetJornadaIndex) return;

        // Validar si la jornada destino está bloqueada (Confirmada)
        const targetIsLocked = matches.some(m => m.jornadaIndex === targetJornadaIndex && m.roundLocked);
        if (targetIsLocked) {
            alert("Esta jornada ya fue jugada o confirmada. No se pueden agregar partidos.");
            return;
        }

        const targetMatches = matches.filter(m => m.jornadaIndex === targetJornadaIndex);
        
        // Buscar candidato para swap
        // Prioridad: 1. Mismo tipo (Bye/Normal), 2. No bloqueado, 3. No confirmado
        let candidate = targetMatches.find(m => 
            m.isByeMatch === draggedMatch.isByeMatch && 
            !m.locked && 
            !m.roundLocked
        );

        // Si no hay libre, buscamos uno bloqueado manual (pero no confirmado)
        if (!candidate) {
            candidate = targetMatches.find(m => 
                m.isByeMatch === draggedMatch.isByeMatch && 
                !m.roundLocked
            );
        }

        setMatches(prev => {
            const newMatches = [...prev];
            const sourceIdx = newMatches.findIndex(m => m.id === draggedMatch.id);
            
            // Si hay hueco (no hay candidato porque la jornada tiene menos partidos), mover directo
            // Esto pasa raro en ligas completas, pero posible si hay desbalance
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

            // Swap
            const tempJornada = newMatches[sourceIdx].jornadaIndex;
            newMatches[sourceIdx] = { 
                ...newMatches[sourceIdx], 
                jornadaIndex: newMatches[targetIdx].jornadaIndex, 
                locked: true 
            };
            newMatches[targetIdx] = { 
                ...newMatches[targetIdx], 
                jornadaIndex: tempJornada 
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

    // Ordenar visualmente
    Object.keys(matchesByRound).forEach(key => {
        matchesByRound[key].sort((a, b) => {
            if (a.isByeMatch && !b.isByeMatch) return -1; // Bye primero
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