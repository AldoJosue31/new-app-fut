import { useState, useEffect } from "react";
import { generarEstructuraInicial, validarFixture, autoCorregirFixture } from "../utils/fixtureAlgorithms";

export const useFixturePreview = (teams, config, isOpen) => {
    const [matches, setMatches] = useState([]);
    const [isAnimating, setIsAnimating] = useState(false);
    const [draggedMatch, setDraggedMatch] = useState(null);
    const [conflicts, setConflicts] = useState({});
    const [selectedTeamId, setSelectedTeamId] = useState(null);

    // Inicializar
    useEffect(() => {
        if (isOpen && teams.length > 0) {
            if (matches.length === 0) {
                const initial = generarEstructuraInicial(teams, config);
                setMatches(initial);
            }
            setSelectedTeamId(null); 
        }
    }, [isOpen, teams, config, matches.length]);

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
        setMatches(prev => prev.map(m => m.id === matchId ? { ...m, locked: !m.locked } : m));
    };

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
            // Pasamos teams.length para calcular el balance ideal
            const fixedMatches = autoCorregirFixture(matches, teams.length, 10000); 
            setMatches(fixedMatches);
            setIsAnimating(false);
        }, 100);
    };

    // --- DRAG & DROP ---

    const handleDragStart = (e, match) => {
        setDraggedMatch(match);
        // Efecto visual
        e.dataTransfer.effectAllowed = "move";
        // Opcional: setear una imagen fantasma personalizada si se desea
    };

    const handleDropOnMatch = (e, targetMatch) => {
        e.preventDefault();
        if (!draggedMatch || draggedMatch.id === targetMatch.id) return;

        // Validar que no mezclemos Bye con Normales (Descanso vs Descanso o Normal vs Normal)
        if (draggedMatch.isByeMatch !== targetMatch.isByeMatch) {
            alert("Solo puedes intercambiar partidos del mismo tipo (Descanso vs Descanso o Normal vs Normal).");
            return;
        }

        // SWAP Explícito (Usuario soltó A sobre B)
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

        // --- LÓGICA DE AUTO-SWAP ---
        // Buscamos un candidato en la jornada destino para intercambiar y mantener el balance.
        
        const targetMatches = matches.filter(m => m.jornadaIndex === targetJornadaIndex);
        
        // 1. Filtrar candidatos válidos:
        //    Deben ser del mismo tipo (Bye con Bye, Normal con Normal) para no romper la estructura.
        let candidates = targetMatches.filter(m => m.isByeMatch === draggedMatch.isByeMatch);
        
        // 2. Si NO hay candidatos (ej: jornada vacía o solo tiene partidos incompatibles),
        //    hacemos un movimiento simple (MOVE).
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

        // 3. Si hay candidatos, elegimos uno para hacer SWAP.
        //    Estrategia: Preferimos uno que NO esté bloqueado. Si todos están bloqueados, tomamos el primero.
        let matchToSwap = candidates.find(m => !m.locked);
        if (!matchToSwap) {
            matchToSwap = candidates[0];
        }

        // 4. Ejecutar el intercambio
        const updatedMatches = matches.map(m => {
            if (m.id === draggedMatch.id) {
                // El partido que arrastró el usuario va al destino y se bloquea
                return { ...m, jornadaIndex: targetJornadaIndex, locked: true };
            }
            if (m.id === matchToSwap.id) {
                // El partido "sacrificado" toma el lugar del arrastrado en la jornada origen
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

    // Ordenar: Byes primero
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
        handleTeamClick,
        toggleLock,
        handleShuffle,
        handleAutoFix,
        handleDragStart,
        handleDropOnMatch,
        handleDropOnJornada
    };
};