import { useState, useEffect, useCallback } from "react";
import {
    generarEstructuraInicial,
    generarJornadaExtra,
    validarFixture,
    autoCorregirFixture,
    transformarPartidosExistentes,
} from "../utils/fixtureAlgorithms";
import {
    buildRepositionJornadaName,
    isOfficialJornadaName,
} from "../utils/jornadaUtils";

const normalizeByeMatch = (match) => {
    const localId = match.local?.id;
    const visitanteId = match.visitante?.id;
    const isByeMatch = localId === "BYE" || visitanteId === "BYE";

    if (localId === "BYE" && visitanteId && visitanteId !== "BYE") {
        return {
            ...match,
            local: match.visitante,
            visitante: match.local,
            isByeMatch: true,
        };
    }

    return {
        ...match,
        isByeMatch,
    };
};

export const useFixturePreview = (teams, config, isOpen, existingData = null) => {
    const [matches, setMatches] = useState([]);
    const [isAnimating, setIsAnimating] = useState(false);
    const [draggedItem, setDraggedItem] = useState(null);
    const [conflicts, setConflicts] = useState({});
    const [selectedTeamId, setSelectedTeamId] = useState(null);

    const isEditMode = !!existingData;

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
                } else if (matches.length === 0) {
                    const initial = generarEstructuraInicial(teams, config);
                    setMatches(initial);
                }
                setIsAnimating(false);
            }, 50);

            setSelectedTeamId(null);
            setDraggedItem(null);
            return () => clearTimeout(timer);
        }

        if (!isOpen) {
            setMatches([]);
            setConflicts({});
            setDraggedItem(null);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, isEditMode]);

    useEffect(() => {
        if (matches.length > 0) {
            const { conflicts: newConflicts } = validarFixture(matches, config);
            setConflicts(newConflicts);
            return;
        }

        setConflicts({});
    }, [matches, config]);

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
            if (!window.confirm("Se perderan los bloqueos manuales. Las jornadas confirmadas se mantendran. ¿Continuar?")) {
                return;
            }
        }

        setIsAnimating(true);
        setTimeout(() => {
            let newMatches;
            if (isEditMode) {
                newMatches = transformarPartidosExistentes(
                    existingData.matches,
                    existingData.jornadas,
                    teams,
                    existingData.repositionMatchMappings,
                    existingData.repositionMappings
                );
            } else {
                newMatches = generarEstructuraInicial(teams, config);
            }

            setMatches(newMatches);
            setIsAnimating(false);
            setSelectedTeamId(null);
            setDraggedItem(null);
        }, 300);
    };

    const handleAutoFix = () => {
        setIsAnimating(true);
        setTimeout(() => {
            const previousValidation = validarFixture(matches, config);
            const fixedMatches = autoCorregirFixture(matches, 15000, config);
            const nextValidation = validarFixture(fixedMatches, config);
            const correctedConflicts = Math.max(
                0,
                previousValidation.totalConflicts - nextValidation.totalConflicts,
            );

            setMatches(fixedMatches);
            setIsAnimating(false);

            if (nextValidation.totalConflicts > 0) {
                if (correctedConflicts > 0) {
                    alert(
                        `Se corrigieron ${correctedConflicts} conflictos, pero no se encontro una combinacion completa sin modificar partidos escaneados, bloqueados o jornadas confirmadas.`,
                    );
                } else {
                    alert(
                        "No se encontro una combinacion valida que conserve intactos los partidos escaneados, bloqueados y las jornadas confirmadas.",
                    );
                }
            }
        }, 100);
    };

    const handleDragStart = useCallback((e, match) => {
        if (match.locked || match.roundLocked || match.roundType === "extra") {
            e.preventDefault();
            return;
        }

        setDraggedItem({ type: "match", matchId: match.id });
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", `match:${match.id}`);
    }, []);

    const handleTeamDragStart = useCallback((e, match, teamSide) => {
        if (match.locked || match.roundLocked) {
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
        if (targetMatch.locked || targetMatch.roundLocked) return;

        const sourceMatch = matches.find((match) => match.id === draggedItem.matchId);
        if (!sourceMatch || sourceMatch.id === targetMatch.id) return;
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

            const sourceJornada = newMatches[sourceIdx].jornadaIndex;
            const targetJornada = newMatches[targetIdx].jornadaIndex;

            newMatches[sourceIdx] = {
                ...newMatches[sourceIdx],
                jornadaIndex: targetJornada,
                locked: true,
            };
            newMatches[targetIdx] = {
                ...newMatches[targetIdx],
                jornadaIndex: sourceJornada,
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

        let candidate = targetMatches.find(
            (match) =>
                match.isByeMatch === sourceMatch.isByeMatch &&
                !match.locked &&
                !match.roundLocked
        );

        if (!candidate) {
            candidate = targetMatches.find(
                (match) =>
                    match.isByeMatch === sourceMatch.isByeMatch &&
                    !match.roundLocked
            );
        }

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

            const sourceJornada = newMatches[sourceIdx].jornadaIndex;

            newMatches[sourceIdx] = {
                ...newMatches[sourceIdx],
                jornadaIndex: targetJornadaIndex,
                locked: true,
            };
            newMatches[targetIdx] = {
                ...newMatches[targetIdx],
                jornadaIndex: sourceJornada,
            };

            return newMatches;
        });

        setDraggedItem(null);
    }, [draggedItem, matches]);

    const handleDropOnTeamSlot = useCallback((e, targetMatch, targetTeamSide) => {
        e.preventDefault();
        e.stopPropagation();

        if (!draggedItem || draggedItem.type !== "team") return;
        if (targetMatch.locked || targetMatch.roundLocked) return;

        const sourceMatch = matches.find((match) => match.id === draggedItem.matchId);
        if (!sourceMatch) return;

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
        const normalizedRoundIndex = Number(roundIndex);
        const lockMatches = Boolean(options.lockMatches);
        const preserveDetectedSchedule = Boolean(options.preserveDetectedSchedule);

        setMatches((prev) => {
            const roundMatches = prev.filter(
                (match) => Number(match.jornadaIndex) === normalizedRoundIndex
            );

            if (roundMatches.some((match) => match.roundLocked)) {
                return prev;
            }

            const nextRoundMatches = nextPairs.map((pair, index) => {
                const current = roundMatches[index];
                const isByeMatch =
                    pair.local?.id === "BYE" || pair.visitante?.id === "BYE";
                const scanScheduleAccepted = Boolean(
                    lockMatches &&
                    preserveDetectedSchedule &&
                    !isByeMatch &&
                    pair.scannedDate &&
                    pair.scannedTime
                );

                return normalizeByeMatch({
                    ...(current || {}),
                    id:
                        current?.id ||
                        `temp_text_${normalizedRoundIndex}_${Date.now()}_${index + 1}`,
                    dbId: current?.dbId || null,
                    local: pair.local,
                    visitante: pair.visitante,
                    jornadaIndex: normalizedRoundIndex,
                    locked: lockMatches || current?.locked || false,
                    scanLocked: lockMatches ? true : current?.scanLocked || false,
                    scannedDate: lockMatches
                        ? (scanScheduleAccepted ? pair.scannedDate : "")
                        : current?.scannedDate || "",
                    scannedTime: lockMatches
                        ? (scanScheduleAccepted ? pair.scannedTime : "")
                        : current?.scannedTime || "",
                    scanScheduleAccepted: lockMatches
                        ? scanScheduleAccepted
                        : Boolean(current?.scanScheduleAccepted),
                    scanScheduleAction: lockMatches
                        ? (scanScheduleAccepted ? "apply" : null)
                        : current?.scanScheduleAction || null,
                    scanScheduleSource: lockMatches
                        ? (scanScheduleAccepted ? "rol-juego" : null)
                        : current?.scanScheduleSource || null,
                    roundLocked: false,
                    isByeMatch,
                    isGeneratedRound:
                        current?.isGeneratedRound ||
                        roundMatches[0]?.isGeneratedRound ||
                        false,
                    roundType: current?.roundType || roundMatches[0]?.roundType,
                    roundName:
                        current?.roundName ||
                        roundMatches[0]?.roundName ||
                        `Jornada ${normalizedRoundIndex + 1}`,
                    originalJornadaId: current?.originalJornadaId,
                    originalJornadaName: current?.originalJornadaName,
                });
            });

            return [
                ...prev.filter((match) => Number(match.jornadaIndex) !== normalizedRoundIndex),
                ...nextRoundMatches,
            ];
        });
    }, []);

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
        conflicts,
        selectedTeamId,
        isAnimating,
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
