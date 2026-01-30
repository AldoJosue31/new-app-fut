import { useState, useEffect } from "react";
import { generarEstructuraInicial, validarFixture, autoCorregirFixture, transformarPartidosExistentes } from "../utils/fixtureAlgorithms";

export const useFixturePreview = (teams, config, isOpen, existingData = null) => {
    const [matches, setMatches] = useState([]);
    const [isAnimating, setIsAnimating] = useState(false);
    const [draggedMatch, setDraggedMatch] = useState(null);
    const [conflicts, setConflicts] = useState({});
    const [selectedTeamId, setSelectedTeamId] = useState(null);
    
    // existingData tiene: { matches: [], jornadas: [] } si es modo edición
    const isEditMode = !!existingData;

    // Inicializar
    useEffect(() => {
        if (isOpen && teams.length > 0) {
            if (isEditMode) {
                // MODO EDICIÓN: Cargar y transformar desde DB
                const initial = transformarPartidosExistentes(existingData.matches, existingData.jornadas, teams);
                setMatches(initial);
            } else {
                // MODO CREACIÓN: Generar nuevo Random
                if (matches.length === 0) {
                    const initial = generarEstructuraInicial(teams, config);
                    setMatches(initial);
                }
            }
            setSelectedTeamId(null); 
        } else if (!isOpen && !isEditMode) {
             // Limpiar al cerrar solo si es creación
             setMatches([]);
        }
    }, [isOpen, teams, config, isEditMode]); // Agregado existingData a deps indirectamente via isEditMode

    // Validar en cada cambio
    useEffect(() => {
        const { conflicts: newConflicts } = validarFixture(matches, teams.length);
        setConflicts(newConflicts);
    }, [matches, teams.length]);

    // --- ACCIONES DE UI ---
    
    const handleTeamClick = (teamId) => {
        setSelectedTeamId(prev => prev === teamId ? null : teamId);
    };

    const toggleLock = (matchId) => {
        setMatches(prev => prev.map(m => {
            if (m.id === matchId) {
                // No permitir desbloquear si la jornada entera está bloqueada (Confirmada)
                if (m.roundLocked) return m;
                return { ...m, locked: !m.locked };
            }
            return m;
        }));
    };

    const handleShuffle = () => {
        if (matches.some(m => m.locked && !m.roundLocked)) {
            if(!window.confirm("Se perderán los bloqueos manuales. ¿Continuar?")) return;
        }

        setIsAnimating(true);
        setTimeout(() => {
            let newMatches;
            if (isEditMode) {
                // En modo edición, el shuffle NO debe ser total, sino solo de lo disponible.
                // Como simplificación robusta, "Restaurar" devuelve al estado inicial de la DB
                newMatches = transformarPartidosExistentes(existingData.matches, existingData.jornadas, teams);
            } else {
                newMatches = generarEstructuraInicial(teams, config);
            }
            setMatches(newMatches);
            setIsAnimating(false);
            setConflicts({});
            setSelectedTeamId(null);
        }, 300);
    };

    const handleAutoFix = () => {
        setIsAnimating(true);
        setTimeout(() => {
            const fixedMatches = autoCorregirFixture(matches, teams.length, 5000); 
            setMatches(fixedMatches);
            setIsAnimating(false);
        }, 100);
    };

    // --- DRAG & DROP ---

    const handleDragStart = (e, match) => {
        // PREVENIR ARRASTRE SI ESTÁ BLOQUEADO POR JORNADA CONFIRMADA
        if (match.roundLocked) {
            e.preventDefault();
            return;
        }

        setDraggedMatch(match);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDropOnMatch = (e, targetMatch) => {
        e.preventDefault();
        if (!draggedMatch || draggedMatch.id === targetMatch.id) return;

        // PREVENIR DROP EN JORNADA BLOQUEADA
        if (targetMatch.roundLocked) {
            alert("No puedes mover partidos a una jornada ya confirmada.");
            return;
        }

        if (draggedMatch.isByeMatch !== targetMatch.isByeMatch) {
            alert("Solo puedes intercambiar partidos del mismo tipo (Descanso vs Descanso o Normal vs Normal).");
            return;
        }

        const updatedMatches = matches.map(m => {
            if (m.id === draggedMatch.id) {
                return { ...m, jornadaIndex: targetMatch.jornadaIndex, locked: true };
            }
            if (m.id === targetMatch.id) {
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

        // Validar si la jornada destino está bloqueada
        const targetIsLocked = matches.some(m => m.jornadaIndex === targetJornadaIndex && m.roundLocked);
        if (targetIsLocked) {
            alert("Esta jornada ya fue jugada o confirmada.");
            return;
        }

        const targetMatches = matches.filter(m => m.jornadaIndex === targetJornadaIndex);
        let candidates = targetMatches.filter(m => m.isByeMatch === draggedMatch.isByeMatch);
        
        // Si no hay candidatos (ej. jornada vacía de ese tipo), movemos directo sin swap
        if (candidates.length === 0) {
             const updatedMatches = matches.map(m => {
                if (m.id === draggedMatch.id) {
                    return { ...m, jornadaIndex: targetJornadaIndex, locked: true };
                }
                return m;
            });
            setMatches(updatedMatches);
            setDraggedMatch(null);
            return;
        }

        // Buscar swap disponible (que no esté locked ni roundLocked)
        let matchToSwap = candidates.find(m => !m.locked && !m.roundLocked);
        if (!matchToSwap) {
            matchToSwap = candidates.find(m => !m.roundLocked); // Fallback a bloqueado manual
        }
        
        if (!matchToSwap) {
             alert("No hay espacio disponible o partidos intercambiables en esta jornada.");
             return;
        }

        const updatedMatches = matches.map(m => {
            if (m.id === draggedMatch.id) {
                return { ...m, jornadaIndex: targetJornadaIndex, locked: true };
            }
            if (m.id === matchToSwap.id) {
                return { ...m, jornadaIndex: draggedMatch.jornadaIndex };
            }
            return m;
        });

        setMatches(updatedMatches);
        setDraggedMatch(null);
    };

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