import { useState, useEffect, useCallback, useRef } from "react";
import {
    generarEstructuraInicial,
    generarJornadaExtra,
    validarFixture,
    corregirFixtureConDiagnostico,
    restaurarFixtureRoundRobinCompleto,
    transformarPartidosExistentes,
} from "../utils/fixtureAlgorithms";
import {
    buildRepositionJornadaName,
    isOfficialJornadaName,
} from "../utils/jornadaUtils";
import {
    normalizeFixtureByeMatch as normalizeByeMatch,
    isFixtureMatchLocked,
    buildFixtureRoundMatchesFromPairs,
} from "../utils/fixtureRoundEditing.js";

export const useFixturePreview = (
    teams,
    config,
    isOpen,
    existingData = null,
    fixtureCriteria = null,
) => {
    const [matches, setMatches] = useState([]);
    const [isAnimating, setIsAnimating] = useState(false);
    const [draggedItem, setDraggedItem] = useState(null);
    const [conflicts, setConflicts] = useState({});
    const [selectedTeamId, setSelectedTeamId] = useState(null);
    const [deletedMatchIds, setDeletedMatchIds] = useState([]);
    const [initialMatches, setInitialMatches] = useState([]);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [autoFixResult, setAutoFixResult] = useState(null);
    const autoFixTimerRef = useRef(null);

    const isEditMode = !!existingData;

    useEffect(() => () => {
        clearTimeout(autoFixTimerRef.current);
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && teams.length > 0) {
            setIsAnimating(true);
            const timer = setTimeout(() => {
                if (isEditMode) {
                    const initial = transformarPartidosExistentes(
                        existingData.matches,
                        existingData.jornadas,
                        teams,
                        existingData.repositionMatchMappings,
                        existingData.repositionMappings
                    );
                    setMatches(initial);
                    setInitialMatches(initial);
                } else if (matches.length === 0) {
                    const initial = generarEstructuraInicial(teams, config);
                    setMatches(initial);
                    setInitialMatches(initial);
                }
                setIsAnimating(false);
            }, 50);

            setSelectedTeamId(null);
            setDraggedItem(null);
            setDeletedMatchIds([]);
            setInitialMatches([]);
            setAutoFixResult(null);
            setIsOptimizing(false);
            return () => clearTimeout(timer);
        }

        if (!isOpen) {
            setMatches([]);
            setConflicts({});
            setDraggedItem(null);
            setDeletedMatchIds([]);
            setInitialMatches([]);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, isEditMode]);

    useEffect(() => {
        if (matches.length > 0) {
            const { conflicts: newConflicts } = validarFixture(matches, config, fixtureCriteria, { teams });
            setConflicts(newConflicts);
            return;
        }

        setConflicts({});
    }, [matches, config, fixtureCriteria, teams]);

    const handleTeamClick = (teamId) => {
        setSelectedTeamId((prev) => (prev === teamId ? null : teamId));
    };

    const toggleLock = (matchId) => {
        setMatches((prev) =>
            prev.map((match) => {
                if (match.id !== matchId) return match;
                if (match.roundLocked || match.scanLocked) return match;
                return { ...match, locked: !match.locked };
            })
        );
    };

    const unlockScannedMatch = useCallback((matchId) => {
        setMatches((prev) =>
            prev.map((match) => {
                if (match.id !== matchId || match.roundLocked || !match.scanLocked) {
                    return match;
                }

                return {
                    ...match,
                    locked: false,
                    scanLocked: false,
                    date: null,
                    time: null,
                    scannedDate: "",
                    scannedTime: "",
                    scanScheduleAction: match.scanScheduleAccepted ? "clear" : null,
                    scanScheduleAccepted: false,
                    scanScheduleSource: null,
                };
            })
        );
    }, []);

    const handleShuffle = () => {
        const hasManualLocks = matches.some((match) => match.locked && !match.roundLocked);
        if (hasManualLocks) {
            if (!window.confirm("Se regeneraran todas las jornadas no confirmadas con Round Robin. Las jornadas confirmadas se mantendran. ¿Continuar?")) {
                return;
            }
        }

        setIsAnimating(true);
        setTimeout(() => {
            let newMatches;
            if (isEditMode) {
                const restoredFixture = restaurarFixtureRoundRobinCompleto({
                    teams,
                    config,
                    existingData,
                });
                if (restoredFixture.error) {
                    newMatches = matches;
                    setDeletedMatchIds([]);
                    alert(restoredFixture.error);
                } else {
                    newMatches = restoredFixture.matches;
                    setDeletedMatchIds(restoredFixture.deletedMatchIds);
                }
            } else {
                newMatches = generarEstructuraInicial(teams, config);
                setDeletedMatchIds([]);
            }

            setMatches(newMatches);
            setIsAnimating(false);
            setSelectedTeamId(null);
            setDraggedItem(null);
        }, 300);
    };

    const handleAutoFix = (sourceMatches = null, context = {}) => {
        if (isAnimating || isOptimizing) return;
        const matchesToFix = Array.isArray(sourceMatches) ? sourceMatches : matches;
        setIsAnimating(true);
        setIsOptimizing(true);
        setAutoFixResult(null);
        autoFixTimerRef.current = setTimeout(() => {
            try {
                const result = corregirFixtureConDiagnostico(
                    matchesToFix,
                    15000,
                    config,
                    fixtureCriteria,
                    { teams, ...context },
                );
                const retainedDbIds = new Set(result.matches.filter((match) => match.dbId).map((match) => String(match.dbId)));
                const removedDbIds = matches.filter((match) => match.dbId && !retainedDbIds.has(String(match.dbId))).map((match) => match.dbId);
                setMatches(result.matches);
                setDeletedMatchIds((previous) => [...new Set([...previous, ...removedDbIds, ...(result.deletedMatchIds || [])])]
                    .filter((id) => !retainedDbIds.has(String(id))));
                setAutoFixResult({ ...result, criteriaKey: JSON.stringify(fixtureCriteria) });
                setSelectedTeamId(null);
                setDraggedItem(null);
            } catch (error) {
                setAutoFixResult({
                    matches,
                    status: "incomplete",
                    blockingMatches: [],
                    message: error?.message || "No se pudo completar la corrección. Vuelve a intentarlo.",
                    criteriaKey: JSON.stringify(fixtureCriteria),
                });
            } finally {
                setIsAnimating(false);
                setIsOptimizing(false);
                autoFixTimerRef.current = null;
            }
        }, 100);
    };

    const handleDragStart = useCallback((e, match) => {
        if (isFixtureMatchLocked(match) || match.roundType === "extra") {
            e.preventDefault();
            return;
        }

        setDraggedItem({ type: "match", matchId: match.id });
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", `match:${match.id}`);
    }, []);

    const handleTeamDragStart = useCallback((e, match, teamSide) => {
        if (isFixtureMatchLocked(match)) {
            e.preventDefault();
            return;
        }

        e.stopPropagation();
        setDraggedItem({ type: "team", matchId: match.id, teamSide });
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", `team:${match.id}:${teamSide}`);
    }, []);

    const handleDropOnMatch = useCallback((e, targetMatch) => {
        e.preventDefault();
        e.stopPropagation();

        if (!draggedItem || draggedItem.type !== "match") return;
        if (isFixtureMatchLocked(targetMatch)) return;

        const sourceMatch = matches.find((match) => match.id === draggedItem.matchId);
        if (!sourceMatch || sourceMatch.id === targetMatch.id) return;
        if (isFixtureMatchLocked(sourceMatch)) return;
        if (sourceMatch.roundType === "extra" || targetMatch.roundType === "extra") return;

        if (sourceMatch.isByeMatch !== targetMatch.isByeMatch) {
            alert("Solo puedes intercambiar partidos del mismo tipo (Descanso vs Descanso o Normal vs Normal).");
            return;
        }

        setMatches((prev) => {
            const newMatches = [...prev];
            const sourceIdx = newMatches.findIndex((match) => match.id === sourceMatch.id);
            const targetIdx = newMatches.findIndex((match) => match.id === targetMatch.id);

            if (sourceIdx === -1 || targetIdx === -1) return prev;

            newMatches[sourceIdx] = {
                ...newMatches[sourceIdx],
                local: targetMatch.local,
                visitante: targetMatch.visitante,
            };
            newMatches[targetIdx] = {
                ...newMatches[targetIdx],
                local: sourceMatch.local,
                visitante: sourceMatch.visitante,
                locked: true,
            };

            return newMatches;
        });

        setDraggedItem(null);
    }, [draggedItem, matches]);

    const handleDropOnJornada = useCallback((e, targetJornadaIndex) => {
        e.preventDefault();
        e.stopPropagation();

        if (!draggedItem || draggedItem.type !== "match") return;

        const sourceMatch = matches.find((match) => match.id === draggedItem.matchId);
        if (!sourceMatch) return;
        if (isFixtureMatchLocked(sourceMatch)) return;
        if (sourceMatch.jornadaIndex === targetJornadaIndex) return;
        if (sourceMatch.roundType === "extra") return;

        const targetIsLocked = matches.some(
            (match) => match.jornadaIndex === targetJornadaIndex && match.roundLocked
        );
        if (targetIsLocked) {
            alert("Esta jornada ya fue jugada o confirmada.");
            return;
        }

        const targetMatches = matches.filter((match) => match.jornadaIndex === targetJornadaIndex);

        const candidate = targetMatches.find(
            (match) =>
                match.isByeMatch === sourceMatch.isByeMatch &&
                !isFixtureMatchLocked(match)
        );

        setMatches((prev) => {
            const newMatches = [...prev];
            const sourceIdx = newMatches.findIndex((match) => match.id === sourceMatch.id);
            if (sourceIdx === -1) return prev;

            const sourceRoundMatches = matches.filter(
                (match) => match.jornadaIndex === sourceMatch.jornadaIndex
            );

            if (!candidate && targetMatches.length < sourceRoundMatches.length) {
                newMatches[sourceIdx] = {
                    ...newMatches[sourceIdx],
                    jornadaIndex: targetJornadaIndex,
                    roundName: targetMatches[0]?.roundName || `Jornada ${targetJornadaIndex + 1}`,
                    locked: true,
                };
                return newMatches;
            }

            if (!candidate) {
                alert("No hay espacio o partidos intercambiables en esa jornada.");
                return prev;
            }

            const targetIdx = newMatches.findIndex((match) => match.id === candidate.id);
            if (targetIdx === -1) return prev;

            newMatches[sourceIdx] = {
                ...newMatches[sourceIdx],
                local: candidate.local,
                visitante: candidate.visitante,
            };
            newMatches[targetIdx] = {
                ...newMatches[targetIdx],
                local: sourceMatch.local,
                visitante: sourceMatch.visitante,
                locked: true,
            };

            return newMatches;
        });

        setDraggedItem(null);
    }, [draggedItem, matches]);

    const handleDropOnTeamSlot = useCallback((e, targetMatch, targetTeamSide) => {
        e.preventDefault();
        e.stopPropagation();

        if (!draggedItem || draggedItem.type !== "team") return;
        if (isFixtureMatchLocked(targetMatch)) return;

        const sourceMatch = matches.find((match) => match.id === draggedItem.matchId);
        if (!sourceMatch) return;
        if (isFixtureMatchLocked(sourceMatch)) return;

        const isSameSlot =
            sourceMatch.id === targetMatch.id && draggedItem.teamSide === targetTeamSide;
        if (isSameSlot) return;

        setMatches((prev) => {
            const sourceIdx = prev.findIndex((match) => match.id === sourceMatch.id);
            const targetIdx = prev.findIndex((match) => match.id === targetMatch.id);
            if (sourceIdx === -1 || targetIdx === -1) return prev;

            const next = [...prev];
            const sourceCurrent = next[sourceIdx];
            const targetCurrent = next[targetIdx];
            const sourceTeam = sourceCurrent[draggedItem.teamSide];
            const targetTeam = targetCurrent[targetTeamSide];

            if (!sourceTeam || !targetTeam) return prev;

            if (sourceIdx === targetIdx) {
                if (draggedItem.teamSide === targetTeamSide) return prev;

                next[sourceIdx] = normalizeByeMatch({
                    ...sourceCurrent,
                    local: sourceCurrent.visitante,
                    visitante: sourceCurrent.local,
                });

                return next;
            }

            next[sourceIdx] = normalizeByeMatch({
                ...sourceCurrent,
                [draggedItem.teamSide]: targetTeam,
            });
            next[targetIdx] = normalizeByeMatch({
                ...targetCurrent,
                [targetTeamSide]: sourceTeam,
            });

            return next;
        });

        setDraggedItem(null);
    }, [draggedItem, matches]);

    const handleGenerateExtraRound = useCallback(() => {
        if (!isEditMode || !Array.isArray(existingData?.jornadas) || teams.length < 2) {
            return;
        }

        const officialRoundsPlayed = existingData.jornadas.filter((jornada) =>
            isOfficialJornadaName(jornada?.name)
        ).length;
        const nextRoundIndex = existingData.jornadas.length;
        const roundName = `Jornada ${officialRoundsPlayed + 1}`;
        const extraRoundMatches = generarJornadaExtra({
            teams,
            config,
            officialRoundsPlayed,
            nextRoundIndex,
            roundName,
        });

        if (extraRoundMatches.length === 0) return;

        setMatches((prev) => [...prev, ...extraRoundMatches]);
    }, [config, existingData?.jornadas, isEditMode, teams]);

    const handleGenerateRepositionRound = useCallback(() => {
        if (!isEditMode || !Array.isArray(existingData?.jornadas) || !Array.isArray(existingData?.pendingMatches)) {
            return;
        }

        const repositionCandidates = existingData.pendingMatches.filter((match) => {
            const jornadaName = match?.jornadas?.name || "";
            const hasTeams = match?.team1_id && match?.team2_id;
            return hasTeams && isOfficialJornadaName(jornadaName);
        });

        if (repositionCandidates.length === 0) {
            return;
        }

        const nextRoundIndex = existingData.jornadas.length;
        const roundName = buildRepositionJornadaName({
            existingJornadas: existingData.jornadas,
        });

        const repositionMatches = repositionCandidates.reduce((acc, pendingMatch, index) => {
            const localTeam = teams.find((team) => String(team.id) === String(pendingMatch.team1_id));
            const visitanteTeam = teams.find((team) => String(team.id) === String(pendingMatch.team2_id));

            if (!localTeam || !visitanteTeam) {
                return acc;
            }

            acc.push({
                id: `temp_reposition_${pendingMatch.id}_${index + 1}`,
                dbId: pendingMatch.id,
                local: localTeam,
                visitante: visitanteTeam,
                jornadaIndex: nextRoundIndex,
                locked: false,
                roundLocked: false,
                isByeMatch: false,
                isGeneratedRound: true,
                roundType: "reposition",
                roundName,
                originalJornadaId: pendingMatch.jornada_id,
                originalJornadaName: pendingMatch?.jornadas?.name || "",
            });

            return acc;
        }, []);

        if (repositionMatches.length === 0) {
            return;
        }

        setMatches((prev) => [...prev, ...repositionMatches]);
    }, [existingData?.jornadas, existingData?.pendingMatches, isEditMode, teams]);

    const handleReplaceRoundMatches = useCallback((roundIndex, nextPairs = [], options = {}) => {
        if (isAnimating || isOptimizing) return false;
        const normalizedRoundIndex = Number(roundIndex);
        const roundMatches = matches.filter((match) => Number(match.jornadaIndex) === normalizedRoundIndex);
        const result = buildFixtureRoundMatchesFromPairs(normalizedRoundIndex, roundMatches, nextPairs, options);
        if (result.error) {
            alert(result.error);
            return false;
        }
        setMatches([
            ...matches.filter((match) => Number(match.jornadaIndex) !== normalizedRoundIndex),
            ...result.matches,
        ]);
        setDeletedMatchIds((previous) => [...new Set([...previous, ...result.deletedMatchIds])]);
        return true;
    }, [isAnimating, isOptimizing, matches]);

    const matchesByRound = {};
    matches.forEach((match) => {
        if (!matchesByRound[match.jornadaIndex]) matchesByRound[match.jornadaIndex] = [];
        matchesByRound[match.jornadaIndex].push(match);
    });

    Object.keys(matchesByRound).forEach((roundKey) => {
        matchesByRound[roundKey].sort((a, b) => {
            if (a.isByeMatch && !b.isByeMatch) return -1;
            if (!a.isByeMatch && b.isByeMatch) return 1;
            return 0;
        });
    });

    return {
        matches,
        matchesByRound,
        deletedMatchIds,
        initialMatches,
        conflicts,
        selectedTeamId,
        isAnimating,
        isOptimizing,
        autoFixResult: autoFixResult?.matches === matches && autoFixResult?.criteriaKey === JSON.stringify(fixtureCriteria)
            ? autoFixResult
            : null,
        isEditMode,
        handleTeamClick,
        toggleLock,
        unlockScannedMatch,
        handleShuffle,
        handleAutoFix,
        handleDragStart,
        handleTeamDragStart,
        handleDropOnMatch,
        handleDropOnJornada,
        handleDropOnTeamSlot,
        handleGenerateExtraRound,
        handleGenerateRepositionRound,
        handleReplaceRoundMatches,
    };
};
