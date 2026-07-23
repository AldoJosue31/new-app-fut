import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styled, { keyframes, css } from "styled-components";
import { v } from "../../../../../styles/variables";
import {
    RiRefreshLine, RiCheckDoubleLine, RiCloseLine, RiCalendarEventLine,
    RiTeamLine, RiMagicLine, RiErrorWarningLine, RiLock2Line, RiAddLine,
    RiHistoryLine, RiEyeLine, RiEyeOffLine, RiEdit2Line, RiLayoutGridLine,
    RiScan2Line, RiLockUnlockLine
} from "react-icons/ri";
import { Btnsave } from "../../../../moleculas/Btnsave";
import { FixtureMatchCard } from "./FixtureMatchCard";
import { useFixturePreview } from "../../../../../hooks/useFixturePreview";
import { RolJuegoScanFlow } from "./RolJuegoScanFlow";
import { ConfirmModal } from "../../../ConfirmModal";
import { validarFixture } from "../../../../../utils/fixtureAlgorithms";
import {
    isOfficialJornadaName,
    isRepositionJornadaName,
} from "../../../../../utils/jornadaUtils";

const ROUND_ANIMATION_MS = 220;
const sortRoundIndexes = (indexes) => [...indexes].sort((a, b) => Number(a) - Number(b));

const isRepositionRound = (roundMatches = [], roundTitle = "") =>
    roundMatches.length > 0 &&
    (
        isRepositionJornadaName(roundTitle) ||
        roundMatches.every(
            (match) =>
                match.roundType === "reposition" ||
                isRepositionJornadaName(match.roundName)
        )
    );

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

const BYE_TEAM = { id: "BYE", name: "DESCANSA", img: null, isBye: true };

const normalizeLookupValue = (value = "") =>
    String(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();

const normalizeTeamToken = (value = "") =>
    normalizeLookupValue(
        String(value)
            .replace(/^\d+[\s).-]*/, "")
            .replace(/^[\s:.-]+|[\s:.;-]+$/g, "")
    );

const getTeamLookupAliases = (value = "") => {
    const normalized = normalizeLookupValue(value);
    const token = normalizeTeamToken(value);
    const aliases = [normalized, token];

    [normalized, token].forEach((alias) => {
        if (!alias) return;
        aliases.push(alias.replace(/\./g, ""));
        aliases.push(alias.replace(/\bfc\b/g, "f c"));
        aliases.push(alias.replace(/\bf c\b/g, "fc"));
    });

    return [...new Set(aliases.filter(Boolean))];
};

const getTeamKey = (team) => String(team?.id ?? "");

const buildTeamOptions = (teams = []) => {
    const options = [...teams.filter((team) => team?.id !== undefined && team?.id !== null), BYE_TEAM];
    const seen = new Set();

    return options.reduce((acc, team) => {
        const id = getTeamKey(team);
        if (!id || seen.has(id)) return acc;
        seen.add(id);
        acc.push({
            ...team,
            normalizedName: normalizeTeamToken(team.name),
            normalizedAliases: getTeamLookupAliases(team.name),
        });
        return acc;
    }, []);
};

const buildTeamLookup = (teamOptions = []) =>
    teamOptions.reduce((acc, team) => {
        (team.normalizedAliases || [team.normalizedName]).forEach((alias) => {
            if (alias && !acc.has(alias)) {
                acc.set(alias, team);
            }
        });
        return acc;
    }, new Map());

const formatMatchText = (match) =>
    `${match.local?.name || ""} vs ${match.visitante?.name || ""}`.trim();

const formatRoundText = (roundMatches = []) =>
    roundMatches.map(formatMatchText).filter(Boolean).join(",\n");

const MATCH_SEPARATOR_PATTERN = /(?:,|\n|;)+/;
const VS_SEPARATOR_PATTERN = /\s+(?:v\.?s\.?|vs\.?|versus)\s+/i;

const resolveTeamToken = (token = "", teamLookup = new Map()) => {
    const aliases = getTeamLookupAliases(token);
    for (const alias of aliases) {
        const match = teamLookup.get(alias);
        if (match) return match;
    }

    return null;
};

const parseRoundText = (text = "", teamLookup = new Map()) =>
    String(text)
        .split(MATCH_SEPARATOR_PATTERN)
        .map((chunk) => chunk.trim())
        .filter(Boolean)
        .reduce((acc, chunk) => {
            const parts = chunk.split(VS_SEPARATOR_PATTERN);
            if (parts.length < 2) return acc;

            const local = resolveTeamToken(parts[0], teamLookup);
            const visitante = resolveTeamToken(parts.slice(1).join(" vs "), teamLookup);

            if (!local || !visitante || getTeamKey(local) === getTeamKey(visitante)) {
                return acc;
            }

            acc.push({ local, visitante });
            return acc;
        }, []);

const isPlayablePair = (pair) =>
    pair?.local?.id !== "BYE" && pair?.visitante?.id !== "BYE";

const isPlayableMatch = (match) =>
    match &&
    !match.isByeMatch &&
    match.local?.id !== "BYE" &&
    match.visitante?.id !== "BYE";

const countPlayablePairs = (pairs = []) => pairs.filter(isPlayablePair).length;
const countPlayableMatches = (roundMatches = []) => roundMatches.filter(isPlayableMatch).length;

const getActiveTeamQuery = (text = "", caretPosition = 0, teamOptions = []) => {
    const safeCaret = Math.max(0, Math.min(caretPosition, text.length));
    const beforeCaret = text.slice(0, safeCaret);
    const lastCommaIndex = beforeCaret.lastIndexOf(",");
    const lastLineBreakIndex = beforeCaret.lastIndexOf("\n");
    const segmentStart = Math.max(lastCommaIndex, lastLineBreakIndex) + 1;
    const segmentBeforeCaret = beforeCaret.slice(segmentStart);
    const vsRegex = /\s+(?:v\.?s\.?|vs\.?|versus)\s*/gi;
    let lastVsMatch = null;
    let currentMatch = vsRegex.exec(segmentBeforeCaret);

    while (currentMatch) {
        lastVsMatch = currentMatch;
        currentMatch = vsRegex.exec(segmentBeforeCaret);
    }

    const rawStart = lastVsMatch
        ? segmentStart + lastVsMatch.index + lastVsMatch[0].length
        : segmentStart;
    const rawFragment = text.slice(rawStart, safeCaret);
    const leadingSpaces = rawFragment.match(/^\s*/)?.[0]?.length || 0;
    const queryStart = rawStart + leadingSpaces;
    const query = text.slice(queryStart, safeCaret).trim();
    const nextCommaIndex = text.indexOf(",", queryStart);
    const nextLineBreakIndex = text.indexOf("\n", queryStart);
    const segmentEnd = [nextCommaIndex, nextLineBreakIndex]
        .filter((index) => index !== -1)
        .reduce((min, index) => Math.min(min, index), text.length);
    const segmentFromQuery = text.slice(queryStart, segmentEnd);
    const nextVsMatch = segmentFromQuery.match(VS_SEPARATOR_PATTERN);
    const tokenEnd =
        lastVsMatch || !nextVsMatch
            ? segmentEnd
            : queryStart + nextVsMatch.index;
    const fullToken = text.slice(queryStart, tokenEnd).trim();
    const isCompleteTeam = teamOptions.some(
        (team) => (team.normalizedAliases || []).some((alias) =>
            getTeamLookupAliases(fullToken).includes(alias)
        )
    );

    if (isCompleteTeam) return null;

    if (normalizeLookupValue(query).length < 2) return null;

    return {
        query,
        queryStart,
        queryEnd: safeCaret,
    };
};

const getTeamSuggestions = (query, teamOptions = []) => {
    const normalizedQuery = normalizeLookupValue(query);
    if (normalizedQuery.length < 2) return [];

    return teamOptions
        .filter((team) => team.normalizedName.includes(normalizedQuery))
        .slice(0, 6);
};

const normalizeTextMatch = (match) => {
    const localId = getTeamKey(match.local);
    const visitanteId = getTeamKey(match.visitante);

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
        isByeMatch: localId === "BYE" || visitanteId === "BYE",
    };
};

const buildRoundMatchesFromTextPairs = (roundIndex, roundMatches = [], pairs = []) =>
    pairs.map((pair, index) => {
        const current = roundMatches[index];
        const normalizedRoundIndex = Number(roundIndex);

        return normalizeTextMatch({
            ...(current || {}),
            id:
                current?.id ||
                `temp_text_${normalizedRoundIndex}_${index + 1}_${getTeamKey(pair.local)}_${getTeamKey(pair.visitante)}`,
            dbId: current?.dbId || null,
            local: pair.local,
            visitante: pair.visitante,
            jornadaIndex: normalizedRoundIndex,
            locked: current?.locked || false,
            roundLocked: false,
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

const buildMatchesFromTextState = ({
    matches = [],
    roundIndexes = [],
    roundTextByIndex = {},
    teamLookup,
}) => {
    let nextMatches = [...matches];

    roundIndexes.forEach((rIndex) => {
        if (!Object.prototype.hasOwnProperty.call(roundTextByIndex, rIndex)) return;

        const normalizedRoundIndex = Number(rIndex);
        const roundMatches = nextMatches.filter(
            (match) => Number(match.jornadaIndex) === normalizedRoundIndex
        );

        if (roundMatches.some((match) => match.roundLocked)) return;

        const pairs = parseRoundText(roundTextByIndex[rIndex], teamLookup);
        const nextRoundMatches = buildRoundMatchesFromTextPairs(
            normalizedRoundIndex,
            roundMatches,
            pairs
        );

        nextMatches = [
            ...nextMatches.filter((match) => Number(match.jornadaIndex) !== normalizedRoundIndex),
            ...nextRoundMatches,
        ];
    });

    return nextMatches;
};

const buildTextPieces = (text = "", teamOptions = []) => {
    const sortedTeams = [...teamOptions]
        .filter((team) => team.name)
        .sort((a, b) => String(b.name).length - String(a.name).length);
    const pieces = [];
    let index = 0;

    while (index < text.length) {
        const teamMatch = sortedTeams.find((team) => {
            const candidate = text.slice(index, index + String(team.name).length);
            return (team.normalizedAliases || []).some((alias) =>
                getTeamLookupAliases(candidate).includes(alias)
            );
        });

        if (teamMatch) {
            pieces.push({
                type: "team",
                text: text.slice(index, index + String(teamMatch.name).length),
            });
            index += String(teamMatch.name).length;
            continue;
        }

        const vsMatch = text.slice(index).match(/^vs\b/i);
        if (vsMatch) {
            pieces.push({ type: "vs", text: vsMatch[0] });
            index += vsMatch[0].length;
            continue;
        }

        pieces.push({ type: "text", text: text[index] });
        index += 1;
    }

    return pieces;
};

const buildHighlightedPieces = (text = "", teamOptions = []) => buildTextPieces(text, teamOptions);

const getRecognizedMatchMarkers = (text = "", teamOptions = []) => {
    const teamLookup = buildTeamLookup(teamOptions);
    const markers = [];
    let matchNumber = 0;
    let segmentStart = 0;

    const collectSegment = (segment, startIndex) => {
        if (!segment) return;

        const recognized = parseRoundText(segment, teamLookup);
        if (recognized.length === 1) {
            const leadingSpaces = segment.match(/^\s*/)?.[0] || "";
            matchNumber += 1;
            markers.push({
                number: matchNumber,
                index: startIndex + leadingSpaces.length,
            });
        }
    };

    for (let index = 0; index < text.length; index += 1) {
        if (![",", "\n", ";"].includes(text[index])) continue;

        collectSegment(text.slice(segmentStart, index), segmentStart);
        segmentStart = index + 1;
    }

    collectSegment(text.slice(segmentStart), segmentStart);

    return markers;
};

export function FixturePreviewModal({ 
    isOpen, onClose, onConfirm, teams = [], config, isLoading,
    existingData = null,
    divisionName = "",
    tournamentName = "",
}) {
    const roundAnimationTimersRef = useRef({});
    const prevVisibleRoundsRef = useRef([]);
    const manualTextRoundsRef = useRef(new Set());
    const {
        matches, matchesByRound, conflicts, selectedTeamId, isAnimating, isEditMode,
        handleTeamClick, toggleLock, unlockScannedMatch, handleShuffle, handleAutoFix,
        handleDragStart, handleTeamDragStart, handleDropOnMatch,
        handleDropOnJornada, handleDropOnTeamSlot,
        handleGenerateExtraRound, handleGenerateRepositionRound,
        handleReplaceRoundMatches
    } = useFixturePreview(teams, config, isOpen, existingData);
    const [showConfirmedRounds, setShowConfirmedRounds] = useState(false);
    const [renderedRoundIndexes, setRenderedRoundIndexes] = useState([]);
    const [roundAnimationState, setRoundAnimationState] = useState({});
    const [viewMode, setViewMode] = useState("cards");
    const [roundTextByIndex, setRoundTextByIndex] = useState({});
    const [focusedRoundIndex, setFocusedRoundIndex] = useState(null);
    const [activeSuggestion, setActiveSuggestion] = useState(null);
    const [scanRoundIndex, setScanRoundIndex] = useState(null);
    const [pendingUnlockMatch, setPendingUnlockMatch] = useState(null);
    const textInputRefs = useRef({});

    const teamOptions = useMemo(() => buildTeamOptions(teams), [teams]);
    const teamLookup = useMemo(() => buildTeamLookup(teamOptions), [teamOptions]);

    useEffect(() => {
        if (isOpen) {
            setShowConfirmedRounds(false);
            setViewMode("cards");
            setScanRoundIndex(null);
            setPendingUnlockMatch(null);
            manualTextRoundsRef.current = new Set();
        }
    }, [isOpen, isEditMode]);

    const handleConfirmar = () => {
        if (invalidTextRoundIndexes.length > 0) {
            alert("Hay jornadas incompletas en el editor de texto. Completa los partidos esperados antes de guardar.");
            return;
        }

        const finalMatches =
            viewMode === "text"
                ? buildMatchesFromTextState({
                    matches,
                    roundIndexes,
                    roundTextByIndex,
                    teamLookup,
                })
                : matches;

        const { conflicts: latestConflicts } = validarFixture(finalMatches, config);
        const latestBlockingConflicts = Object.entries(latestConflicts).reduce(
            (acc, [rIndex, roundConflicts]) => {
                const roundMatches = finalMatches.filter(
                    (match) => Number(match.jornadaIndex) === Number(rIndex)
                );
                const roundTitle =
                    roundDefinitionMap[rIndex]?.title ||
                    roundMatches[0]?.roundName ||
                    "";

                if (!isRepositionRound(roundMatches, roundTitle)) {
                    acc[rIndex] = roundConflicts;
                }

                return acc;
            },
            {}
        );

        if (Object.keys(latestBlockingConflicts).length > 0) {
            alert(
                "El fixture tiene equipos repetidos dentro de una jornada o cruces duplicados entre jornadas. En modalidad de solo ida, un cruce solo puede repetirse en una jornada extra."
            );
            return;
        }

        if (isEditMode) {
            onConfirm(finalMatches);
        } else {
            // Lógica legacy para creación nueva
            const maxJornada = Math.max(...finalMatches.map(m => m.jornadaIndex), 0);
            const finalFixture = [];
            for (let i = 0; i <= maxJornada; i++) {
                const matchesInRound = finalMatches
                    .filter(m => m.jornadaIndex === i)
                    .map(m => ({
                        local: m.local,
                        visitante: m.visitante,
                        scannedDate: m.scanScheduleAccepted ? m.scannedDate : "",
                        scannedTime: m.scanScheduleAccepted ? m.scannedTime : "",
                        scanScheduleAccepted: Boolean(m.scanScheduleAccepted),
                    }));
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
    const blockingConflicts = useMemo(
        () =>
            Object.entries(conflicts).reduce((acc, [rIndex, roundConflicts]) => {
                const roundMatches = matchesByRound[rIndex] || [];
                const roundTitle =
                    roundDefinitionMap[rIndex]?.title ||
                    roundMatches[0]?.roundName ||
                    "";

                if (isRepositionRound(roundMatches, roundTitle)) {
                    return acc;
                }

                acc[rIndex] = roundConflicts;
                return acc;
            }, {}),
        [conflicts, matchesByRound, roundDefinitionMap]
    );
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
    const defaultRoundMatchCount = useMemo(
        () => Math.floor(teams.filter((team) => team?.id !== undefined && team?.id !== null).length / 2),
        [teams]
    );
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

    const expectedRoundCounts = useMemo(
        () =>
            roundDefinitions.reduce((acc, round) => {
                const rIndex = round.roundIndex;
                const roundMatches = matchesByRound[rIndex] || [];
                const roundTitle = round.title || roundMatches[0]?.roundName || "";
                const currentCount = countPlayableMatches(roundMatches);
                const fallbackCount = isRepositionRound(roundMatches, roundTitle)
                    ? currentCount
                    : defaultRoundMatchCount;
                const expectedCount = Math.max(currentCount, fallbackCount);

                if (expectedCount > 0) {
                    acc[rIndex] = expectedCount;
                }

                return acc;
            }, {}),
        [defaultRoundMatchCount, matchesByRound, roundDefinitions]
    );

    const textRoundStats = useMemo(
        () =>
            roundIndexes.reduce((acc, rIndex) => {
                const text = Object.prototype.hasOwnProperty.call(roundTextByIndex, rIndex)
                    ? roundTextByIndex[rIndex]
                    : formatRoundText(matchesByRound[rIndex] || []);
                const detected = countPlayablePairs(parseRoundText(text, teamLookup));
                const expected =
                    expectedRoundCounts[rIndex] ||
                    countPlayableMatches(matchesByRound[rIndex] || []) ||
                    defaultRoundMatchCount;
                const isLocked =
                    roundDefinitionMap[rIndex]?.isLocked ??
                    (matchesByRound[rIndex] || []).some((match) => match.roundLocked);

                acc[rIndex] = {
                    detected,
                    expected,
                    isComplete: isLocked || expected === 0 || detected === expected,
                    isLocked,
                };
                return acc;
            }, {}),
        [
            defaultRoundMatchCount,
            expectedRoundCounts,
            matchesByRound,
            roundDefinitionMap,
            roundIndexes,
            roundTextByIndex,
            teamLookup,
        ]
    );

    const invalidTextRoundIndexes = useMemo(
        () =>
            roundIndexes.filter((rIndex) => {
                const stats = textRoundStats[rIndex];
                return stats && !stats.isLocked && !stats.isComplete;
            }),
        [roundIndexes, textRoundStats]
    );
    const conflictCount = useMemo(() => {
        const conflictRoundSet = new Set(
            roundIndexes.filter((rIndex) => Boolean(blockingConflicts[rIndex]?.length))
        );

        invalidTextRoundIndexes.forEach((rIndex) => conflictRoundSet.add(rIndex));
        return conflictRoundSet.size;
    }, [blockingConflicts, invalidTextRoundIndexes, roundIndexes]);

    useEffect(() => {
        if (!isOpen) {
            setRoundTextByIndex((prev) =>
                Object.keys(prev).length === 0 ? prev : {}
            );
            setFocusedRoundIndex((prev) => (prev === null ? prev : null));
            setActiveSuggestion((prev) => (prev === null ? prev : null));
            manualTextRoundsRef.current = new Set();
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        setRoundTextByIndex((prev) => {
            let changed = false;
            const next = { ...prev };
            const roundIndexSet = new Set(roundIndexes.map(String));

            Object.keys(next).forEach((rIndex) => {
                if (!roundIndexSet.has(String(rIndex))) {
                    delete next[rIndex];
                    changed = true;
                }
            });

            roundIndexes.forEach((rIndex) => {
                if (String(focusedRoundIndex) === String(rIndex)) return;
                if (manualTextRoundsRef.current.has(String(rIndex))) return;

                const nextText = formatRoundText(matchesByRound[rIndex] || []);
                if (next[rIndex] !== nextText) {
                    next[rIndex] = nextText;
                    changed = true;
                }
            });

            return changed ? next : prev;
        });
    }, [focusedRoundIndex, isOpen, matchesByRound, roundIndexes]);

    const updateActiveSuggestion = (rIndex, text, caretPosition) => {
        const activeQuery = getActiveTeamQuery(text, caretPosition, teamOptions);
        if (!activeQuery) {
            setActiveSuggestion(null);
            return;
        }

        const suggestions = getTeamSuggestions(activeQuery.query, teamOptions);
        setActiveSuggestion(
            suggestions.length > 0
                ? { rIndex: String(rIndex), ...activeQuery, suggestions }
                : null
        );
    };

    const handleRoundTextChange = (rIndex, value, caretPosition) => {
        manualTextRoundsRef.current.add(String(rIndex));
        setRoundTextByIndex((prev) => ({
            ...prev,
            [rIndex]: value,
        }));
        updateActiveSuggestion(rIndex, value, caretPosition);
    };

    const handleRoundTextCaret = (rIndex, value, caretPosition) => {
        updateActiveSuggestion(rIndex, value, caretPosition);
    };

    const handleRoundTextBlur = (rIndex) => {
        const currentText = roundTextByIndex[rIndex] || "";
        if (currentText.trim().length === 0) {
            setRoundTextByIndex((prev) => ({
                ...prev,
                [rIndex]: "",
            }));
            setFocusedRoundIndex(null);
            setActiveSuggestion(null);
            return;
        }

        const pairs = parseRoundText(currentText, teamLookup);
        const stats = textRoundStats[rIndex];
        const detectedPlayable = countPlayablePairs(pairs);
        const expectedPlayable =
            stats?.expected ||
            countPlayableMatches(matchesByRound[rIndex] || []) ||
            defaultRoundMatchCount;

        if (detectedPlayable !== expectedPlayable) {
            setFocusedRoundIndex(null);
            setActiveSuggestion(null);
            return;
        }

        const cleanText = pairs
            .map((pair) => `${pair.local.name} vs ${pair.visitante.name}`)
            .join(",\n");

        setRoundTextByIndex((prev) => ({
            ...prev,
            [rIndex]: cleanText,
        }));
        setFocusedRoundIndex(null);
        setActiveSuggestion(null);

        if (pairs.length > 0) {
            handleReplaceRoundMatches(Number(rIndex), pairs);
        }
    };

    const handleSuggestionSelect = (team) => {
        if (!activeSuggestion) return;

        const { rIndex, queryStart, queryEnd } = activeSuggestion;
        const currentText = roundTextByIndex[rIndex] || "";
        const nextText = `${currentText.slice(0, queryStart)}${team.name}${currentText.slice(queryEnd)}`;
        const nextCaret = queryStart + String(team.name).length;

        setRoundTextByIndex((prev) => ({
            ...prev,
            [rIndex]: nextText,
        }));
        setActiveSuggestion(null);

        window.setTimeout(() => {
            const input = textInputRefs.current[rIndex];
            if (!input) return;
            input.focus();
            input.setSelectionRange(nextCaret, nextCaret);
        }, 0);
    };

    const handleApplyRolJuego = (pairs, { preserveDetectedSchedule = false } = {}) => {
        if (scanRoundIndex === null) return;
        const normalizedRoundIndex = Number(scanRoundIndex);
        handleReplaceRoundMatches(normalizedRoundIndex, pairs, {
            lockMatches: true,
            preserveDetectedSchedule,
        });
        manualTextRoundsRef.current.delete(String(scanRoundIndex));
        setRoundTextByIndex((prev) => ({
            ...prev,
            [scanRoundIndex]: pairs.map((pair) => `${pair.local.name} vs ${pair.visitante.name}`).join(",\n"),
        }));
        setViewMode("cards");
        setScanRoundIndex(null);
    };

    const handleLockRequest = (match) => {
        if (!match || match.roundLocked) return;

        if (match.locked && match.scanLocked) {
            if (match.scanScheduleAccepted && match.scannedDate && match.scannedTime) {
                setPendingUnlockMatch(match);
                return;
            }

            unlockScannedMatch(match.id);
            return;
        }

        toggleLock(match.id);
    };

    const confirmScannedUnlock = () => {
        if (!pendingUnlockMatch) return;
        unlockScannedMatch(pendingUnlockMatch.id);
        setPendingUnlockMatch(null);
    };

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
        <>
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
                            <ToggleFilterButton
                                type="button"
                                onClick={() => setViewMode((prev) => (prev === "text" ? "cards" : "text"))}
                                $active={viewMode === "text"}
                            >
                                {viewMode === "text" ? <RiLayoutGridLine /> : <RiEdit2Line />}
                                <span>{viewMode === "text" ? "Vista tarjetas" : "Editar texto"}</span>
                            </ToggleFilterButton>
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
                                const roundIsScanned = roundMatches.length > 0
                                    && roundMatches.every((match) => match.scanLocked);
                                const roundTextStat = textRoundStats[rIndex] || {
                                    detected: 0,
                                    expected: countPlayableMatches(roundMatches) || defaultRoundMatchCount,
                                    isComplete: false,
                                };
                                const hasTextCountError = invalidTextRoundIndexes.includes(rIndex);
                                const hasConflict = !!blockingConflicts[rIndex] || hasTextCountError;
                                const animationState = roundAnimationState[rIndex] || "idle";
                                const roundOnlySwapsTeams = roundMatches.some(
                                    (match) => match.roundType === "extra"
                                );

                                return (
                                    <JornadaColumn 
                                        key={rIndex}
                                        $locked={roundIsLocked}
                                        $hasConflict={hasConflict}
                                        $animationState={animationState}
                                        $textMode={viewMode === "text"}
                                        onDragOver={(e) => { 
                                            if(!roundIsLocked && !roundIsScanned && !roundOnlySwapsTeams && animationState !== "exit") {
                                                e.preventDefault(); 
                                                e.dataTransfer.dropEffect = "move"; 
                                            }
                                        }}
                                        onDrop={(e) => { 
                                            if(!roundIsLocked && !roundIsScanned && !roundOnlySwapsTeams && animationState !== "exit") {
                                                handleDropOnJornada(e, Number(rIndex));
                                            }
                                        }}
                                    >
                                        <JornadaTitle $hasConflict={hasConflict} $locked={roundIsLocked}>
                                            <span className="title-text">{getRoundTitle(rIndex)}</span>
                                            <JornadaTitleActions>
                                                {!roundIsLocked && (
                                                    <RoundScanButton
                                                        type="button"
                                                        onClick={() => setScanRoundIndex(String(rIndex))}
                                                        title={`Escanear rol de juego de ${getRoundTitle(rIndex)}`}
                                                        aria-label={`Escanear rol de juego de ${getRoundTitle(rIndex)}`}
                                                    >
                                                        <RiScan2Line />
                                                        <span>Escanear</span>
                                                    </RoundScanButton>
                                                )}
                                                {roundIsScanned && (
                                                    <ScannedBadge><RiCheckDoubleLine /> Escaneada</ScannedBadge>
                                                )}
                                                {viewMode === "text" && (
                                                    <RoundCountBadge $complete={roundTextStat.isComplete}>
                                                        <span>{roundTextStat.detected}/{roundTextStat.expected}</span>
                                                        {roundTextStat.isComplete ? <RiCheckDoubleLine /> : <RiCloseLine />}
                                                    </RoundCountBadge>
                                                )}
                                                {roundIsLocked && <LockBadge><RiLock2Line /> Confirmada</LockBadge>}
                                            </JornadaTitleActions>
                                        </JornadaTitle>
                                        
                                        {viewMode === "text" ? (
                                            <TextRoundEditor
                                                rIndex={rIndex}
                                                value={roundTextByIndex[rIndex] || ""}
                                                disabled={roundIsLocked || roundIsScanned}
                                                hasConflict={hasConflict}
                                                inputRef={(node) => {
                                                    if (node) textInputRefs.current[rIndex] = node;
                                                }}
                                                teamOptions={teamOptions}
                                                suggestions={
                                                    activeSuggestion?.rIndex === String(rIndex)
                                                        ? activeSuggestion.suggestions
                                                        : []
                                                }
                                                isFocused={focusedRoundIndex === String(rIndex)}
                                                onFocus={() => setFocusedRoundIndex(String(rIndex))}
                                                onChange={handleRoundTextChange}
                                                onCaret={handleRoundTextCaret}
                                                onBlur={handleRoundTextBlur}
                                                onSelectSuggestion={handleSuggestionSelect}
                                            />
                                        ) : (
                                        <MatchesList>
                                            {roundMatches.map((match) => {
                                                const isConflict = blockingConflicts[rIndex] && (
                                                    blockingConflicts[rIndex].includes(String(match.local.id)) ||
                                                    blockingConflicts[rIndex].includes(String(match.visitante.id))
                                                );
                                                return (
                                                    <FixtureMatchCard 
                                                        key={match.id}
                                                        match={match}
                                                        canDragMatch={!match.locked && !match.roundLocked && match.roundType !== "extra"}
                                                        onDragStart={handleDragStart}
                                                        onTeamDragStart={handleTeamDragStart}
                                                        onDragOver={(e) => { 
                                                            if(!match.locked && !match.roundLocked && match.roundType !== "extra") {
                                                                e.preventDefault(); 
                                                                e.dataTransfer.dropEffect = "move"; 
                                                            }
                                                        }}
                                                        onDrop={handleDropOnMatch}
                                                        onTeamDrop={handleDropOnTeamSlot}
                                                        toggleLock={handleLockRequest}
                                                        isConflict={isConflict}
                                                        selectedTeamId={selectedTeamId}
                                                        onTeamClick={handleTeamClick}
                                                    />
                                                );
                                            })}
                                            {roundMatches.length === 0 && <EmptySlot>Vacío</EmptySlot>}
                                        </MatchesList>
                                        )}
                                    </JornadaColumn>
                                );
                            })}
                        </Grid>
                    </ScrollArea>
                    {scanRoundIndex !== null && (
                        <RoundScanViewport>
                            <RolJuegoScanFlow
                                roundTitle={getRoundTitle(scanRoundIndex)}
                                divisionName={divisionName}
                                tournamentName={tournamentName}
                                roundStartDate={existingData?.jornadas?.[Number(scanRoundIndex)]?.start_date || ""}
                                roundEndDate={existingData?.jornadas?.[Number(scanRoundIndex)]?.end_date || ""}
                                teams={teams}
                                onCancel={() => setScanRoundIndex(null)}
                                onApply={handleApplyRolJuego}
                            />
                        </RoundScanViewport>
                    )}
                </Content>
                {scanRoundIndex === null && <Footer>
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
                </Footer>}
            </ModalContainer>
        </Overlay>
        <ConfirmModal
            isOpen={Boolean(pendingUnlockMatch)}
            onClose={() => setPendingUnlockMatch(null)}
            onConfirm={confirmScannedUnlock}
            title="Desbloquear partido escaneado"
            message={pendingUnlockMatch
                ? `¿Quieres desbloquear ${pendingUnlockMatch.local?.name} vs ${pendingUnlockMatch.visitante?.name}?`
                : "¿Quieres desbloquear este partido?"}
            subMessage="Se eliminarán la fecha y la hora detectadas para este partido. Después podrás modificar el cruce."
            confirmText="Desbloquear y borrar horario"
            confirmColor={v.colorError}
            confirmIcon={<RiLockUnlockLine />}
            width="440px"
            thinButtons
        />
        </>,
        document.body
    );
}

const TextRoundEditor = ({
    rIndex,
    value,
    disabled,
    hasConflict,
    inputRef,
    teamOptions,
    suggestions,
    isFocused,
    onFocus,
    onChange,
    onCaret,
    onBlur,
    onSelectSuggestion,
}) => {
    const [scrollTop, setScrollTop] = useState(0);
    const [caretIndex, setCaretIndex] = useState(0);
    const [suggestionPosition, setSuggestionPosition] = useState({ left: 12, top: 34 });
    const [matchNumberPositions, setMatchNumberPositions] = useState([]);
    const [hasSelection, setHasSelection] = useState(false);
    const textAreaRef = useRef(null);
    const caretMarkerRef = useRef(null);
    const matchMarkerRefs = useRef({});
    const highlightedPieces = useMemo(
        () => buildHighlightedPieces(value, teamOptions),
        [teamOptions, value]
    );
    const recognizedMatchMarkers = useMemo(
        () => getRecognizedMatchMarkers(value, teamOptions),
        [teamOptions, value]
    );
    const mirrorBeforeCaret = value.slice(0, caretIndex);
    const mirrorAfterCaret = value.slice(caretIndex) || " ";

    const setTextAreaNode = (node) => {
        textAreaRef.current = node;
        inputRef(node);
    };

    const syncCaret = (target) => {
        if (!target) return;
        setCaretIndex(target.selectionStart || 0);
        setScrollTop(target.scrollTop || 0);
        setHasSelection(target.selectionStart !== target.selectionEnd);
    };

    useLayoutEffect(() => {
        const marker = caretMarkerRef.current;
        const textarea = textAreaRef.current;
        if (!marker || !textarea) return;

        const lineHeight = Number.parseFloat(window.getComputedStyle(textarea).lineHeight) || 20;
        const maxLeft = Math.max(12, textarea.clientWidth - 180);
        const nextLeft = Math.min(Math.max(marker.offsetLeft, 8), maxLeft);
        const nextTop = Math.min(
            Math.max(marker.offsetTop + lineHeight - scrollTop + 4, 8),
            textarea.clientHeight - 8
        );

        setSuggestionPosition({ left: nextLeft, top: nextTop });
    }, [caretIndex, scrollTop, value]);

    useLayoutEffect(() => {
        const textarea = textAreaRef.current;
        if (!textarea) return;

        const nextPositions = recognizedMatchMarkers
            .map((marker) => {
                const node = matchMarkerRefs.current[marker.number];
                if (!node) return null;

                return {
                    number: marker.number,
                    left: Math.max(4, node.offsetLeft - 28),
                    top: node.offsetTop - scrollTop,
                };
            })
            .filter(Boolean);

        setMatchNumberPositions((prev) => {
            const isSame =
                prev.length === nextPositions.length &&
                prev.every((item, index) => {
                    const next = nextPositions[index];
                    return item.number === next.number && item.left === next.left && item.top === next.top;
                });

            return isSame ? prev : nextPositions;
        });
    }, [recognizedMatchMarkers, scrollTop, value]);

    const renderMarkerMirror = () => {
        if (recognizedMatchMarkers.length === 0) return value || " ";

        const pieces = [];
        let cursor = 0;

        recognizedMatchMarkers.forEach((marker) => {
            pieces.push(value.slice(cursor, marker.index));
            pieces.push(
                <span
                    key={`match-marker-${marker.number}`}
                    ref={(node) => {
                        if (node) {
                            matchMarkerRefs.current[marker.number] = node;
                        } else {
                            delete matchMarkerRefs.current[marker.number];
                        }
                    }}
                />
            );
            cursor = marker.index;
        });

        pieces.push(value.slice(cursor) || " ");
        return pieces;
    };

    return (
        <TextEditorBox $disabled={disabled} $hasConflict={hasConflict}>
            <TextInputLayer $numberGutter={!isFocused}>
                <MatchNumberMirror aria-hidden="true">
                    {renderMarkerMirror()}
                </MatchNumberMirror>
                <MatchNumberMarks aria-hidden="true" $hidden={hasSelection || isFocused}>
                    {matchNumberPositions.map((position) => (
                        <span
                            key={position.number}
                            style={{
                                left: position.left,
                                top: position.top,
                            }}
                        >
                            {position.number}
                        </span>
                    ))}
                </MatchNumberMarks>
                <TextHighlighter
                    aria-hidden="true"
                    $hidden={hasSelection}
                    style={{ transform: `translateY(-${scrollTop}px)` }}
                >
                    {value ? (
                        highlightedPieces.map((piece, index) => (
                            <span key={`${piece.type}-${index}`} className={piece.type}>
                                {piece.text}
                            </span>
                        ))
                    ) : (
                        <span className="placeholder">Equipo A vs Equipo B, Equipo C vs Equipo D</span>
                    )}
                </TextHighlighter>
                <CaretMirror aria-hidden="true">
                    {mirrorBeforeCaret}
                    <span ref={caretMarkerRef} />
                    {mirrorAfterCaret}
                </CaretMirror>
                <RoundTextArea
                    ref={setTextAreaNode}
                    value={value}
                    $showNativeText={hasSelection}
                    disabled={disabled}
                    spellCheck={false}
                    onFocus={(event) => {
                        onFocus();
                        syncCaret(event.currentTarget);
                    }}
                    onChange={(event) => {
                        syncCaret(event.currentTarget);
                        onChange(rIndex, event.target.value, event.target.selectionStart);
                    }}
                    onKeyUp={(event) => {
                        syncCaret(event.currentTarget);
                        onCaret(rIndex, event.target.value, event.target.selectionStart);
                    }}
                    onClick={(event) => {
                        syncCaret(event.currentTarget);
                        onCaret(rIndex, event.target.value, event.target.selectionStart);
                    }}
                    onSelect={(event) => syncCaret(event.currentTarget)}
                    onScroll={(event) => syncCaret(event.currentTarget)}
                    onBlur={() => {
                        setHasSelection(false);
                        onBlur(rIndex);
                    }}
                />

                {suggestions.length > 0 && !disabled && (
                    <SuggestionsList
                        style={{
                            left: suggestionPosition.left,
                            top: suggestionPosition.top,
                        }}
                    >
                        {suggestions.map((team) => (
                            <button
                                key={getTeamKey(team)}
                                type="button"
                                onMouseDown={(event) => {
                                    event.preventDefault();
                                    onSelectSuggestion(team);
                                }}
                            >
                                {team.name}
                            </button>
                        ))}
                    </SuggestionsList>
                )}
            </TextInputLayer>
        </TextEditorBox>
    );
};

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

const Content = styled.div`position:relative;flex: 1; display: flex; flex-direction: column; background: ${({ theme }) => theme.bg2}; overflow: hidden;`;

const RoundScanViewport = styled.div`
    position:absolute;inset:0;z-index:3;overflow-y:auto;background:${({theme})=>theme.bg2};
`;

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
    border-radius: 12px; overflow: hidden;
    width: ${({ $textMode }) => ($textMode ? "calc((100% - 32px) / 3)" : "280px")};
    min-width: ${({ $textMode }) => ($textMode ? "320px" : "280px")};
    flex-shrink: ${({ $textMode }) => ($textMode ? 1 : 0)};
    display: flex; flex-direction: column; 
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
    @media (max-width: 600px) { width: 100%; min-width: 0; }
`;

const JornadaTitle = styled.div`
    padding: 10px 15px; 
    background: ${({ theme, $locked }) => $locked ? theme.bg4 : theme.bg3}; 
    border-bottom: 1px solid ${({ theme }) => theme.bg4}; 
    display: flex; justify-content: space-between; align-items: center; gap: 8px;
    
    .title-text {
        font-size: 0.85rem; 
        font-weight: 700;
        color: ${({ theme, $hasConflict, $locked }) => 
            $locked ? theme.textFade : ($hasConflict ? v.colorError : v.colorPrincipal)}; 
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
`;

const JornadaTitleActions = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
`;

const RoundScanButton = styled.button`
    min-height:28px;padding:4px 7px;border:1px solid ${v.colorPrincipal}55;border-radius:7px;background:${v.colorPrincipal}12;color:${v.colorPrincipal};display:inline-flex;align-items:center;gap:4px;font:inherit;font-size:.7rem;font-weight:750;cursor:pointer;
    &:hover{background:${v.colorPrincipal};color:#fff;} &:focus-visible{outline:3px solid ${v.colorPrincipal}3d;outline-offset:2px;}
    @media(max-width:600px){span{display:none;}svg{font-size:.95rem;}}
`;

const ScannedBadge = styled.div`
    display:inline-flex;align-items:center;gap:4px;padding:3px 6px;border-radius:999px;background:${v.colorPrincipal}14;color:${v.colorPrincipal};font-size:.68rem;font-weight:750;
    @media(max-width:600px){font-size:0;svg{font-size:.9rem;}}
`;

const RoundCountBadge = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 6px;
    border-radius: 999px;
    border: 1px solid ${({ $complete }) => ($complete ? `${v.colorPrincipal}45` : `${v.colorError}55`)};
    background: ${({ $complete }) => ($complete ? `${v.colorPrincipal}14` : `${v.colorError}14`)};
    color: ${({ $complete }) => ($complete ? v.colorPrincipal : v.colorError)};
    font-size: 0.7rem;
    font-weight: 800;
    line-height: 1;

    svg {
        font-size: 0.85rem;
        flex-shrink: 0;
    }
`;

const LockBadge = styled.div`
    display: flex; align-items: center; gap: 4px;
    font-size: 0.7rem; color: ${({theme})=>theme.textFade}; font-weight: 600;
    text-transform: uppercase;
`;

const MatchesList = styled.div`padding: 8px; display: flex; flex-direction: column; gap: 8px; min-height: 50px;`;
const EmptySlot = styled.div`padding: 10px; border: 2px dashed ${({theme})=>theme.bg4}; border-radius: 8px; color: ${({theme})=>theme.textFade}; font-size: 0.8rem; text-align: center;`;

const TextEditorBox = styled.div`
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    opacity: ${({ $disabled }) => ($disabled ? 0.72 : 1)};
`;

const TextInputLayer = styled.div`
    position: relative;
    height: 172px;
    --fixture-text-left-pad: ${({ $numberGutter }) => ($numberGutter ? "38px" : "12px")};
    border: 1px solid ${({ theme }) => theme.bg4};
    border-radius: 8px;
    background: ${({ theme }) => theme.bg2};
    overflow: hidden;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;

    &:focus-within {
        border-color: ${v.colorPrincipal};
        box-shadow: 0 0 0 3px ${v.colorPrincipal}18;
    }
`;

const TextHighlighter = styled.div`
    position: absolute;
    inset: 0;
    z-index: 1;
    padding: 11px 12px 11px var(--fixture-text-left-pad);
    box-sizing: border-box;
    white-space: pre-wrap;
    word-break: break-word;
    overflow: visible;
    color: ${({ theme }) => theme.text};
    font-size: 0.84rem;
    line-height: 1.45;
    pointer-events: none;
    opacity: ${({ $hidden }) => ($hidden ? 0 : 1)};
    transition: transform 0.02s linear;

    .team {
        color: ${v.colorPrincipal};
        background: ${v.colorPrincipal}18;
        border-radius: 4px;
    }

    .vs {
        color: ${({ theme }) => theme.textFade};
    }

    .placeholder {
        color: ${({ theme }) => theme.textFade};
    }
`;

const MirrorTextBase = styled.div`
    position: absolute;
    inset: 0;
    padding: 11px 12px 11px var(--fixture-text-left-pad);
    box-sizing: border-box;
    white-space: pre-wrap;
    word-break: break-word;
    overflow: hidden;
    visibility: hidden;
    font-size: 0.84rem;
    line-height: 1.45;
    font-family: inherit;
`;

const MatchNumberMirror = styled(MirrorTextBase)`
    z-index: 0;

    span {
        display: inline-block;
        width: 0;
        height: 1em;
    }
`;

const MatchNumberMarks = styled.div`
    position: absolute;
    inset: 0;
    z-index: 3;
    pointer-events: none;
    overflow: hidden;
    opacity: ${({ $hidden }) => ($hidden ? 0 : 1)};

    span {
        position: absolute;
        width: 16px;
        height: 16px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: ${v.colorPrincipal};
        color: white;
        font-size: 0.62rem;
        font-weight: 800;
        line-height: 1;
        transform: translateY(2px);
    }
`;

const CaretMirror = styled.div`
    position: absolute;
    inset: 0;
    z-index: 0;
    padding: 11px 12px 11px var(--fixture-text-left-pad);
    box-sizing: border-box;
    white-space: pre-wrap;
    word-break: break-word;
    overflow: hidden;
    visibility: hidden;
    font-size: 0.84rem;
    line-height: 1.45;
    font-family: inherit;

    span {
        display: inline-block;
        width: 1px;
        height: 1em;
    }
`;

const RoundTextArea = styled.textarea`
    position: absolute;
    inset: 0;
    z-index: 2;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    resize: none;
    border: 0;
    outline: 0;
    padding: 11px 12px 11px var(--fixture-text-left-pad);
    background: transparent;
    color: ${({ $showNativeText, theme }) => ($showNativeText ? theme.text : "transparent")};
    caret-color: ${({ theme }) => theme.text};
    font-size: 0.84rem;
    line-height: 1.45;
    font-family: inherit;
    overflow-y: auto;
    overflow-x: hidden;
    white-space: pre-wrap;
    word-break: break-word;
    user-select: text;
    -webkit-user-select: text;

    &::-webkit-scrollbar {
        width: 8px;
    }

    &::-webkit-scrollbar-thumb {
        background: ${({ theme }) => theme.bg4};
        border-radius: 8px;
    }

    &::selection {
        background: ${v.colorPrincipal}35;
    }

    &:disabled {
        cursor: not-allowed;
    }
`;

const SuggestionsList = styled.div`
    position: absolute;
    z-index: 8;
    min-width: 180px;
    max-width: calc(100% - 16px);
    max-height: 150px;
    display: flex;
    flex-direction: column;
    border: 1px solid ${({ theme }) => theme.bg4};
    border-radius: 8px;
    background: ${({ theme }) => theme.bg};
    overflow-y: auto;
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.12);

    &::-webkit-scrollbar {
        width: 7px;
    }

    &::-webkit-scrollbar-thumb {
        background: ${({ theme }) => theme.bg4};
        border-radius: 8px;
    }

    button {
        border: 0;
        background: transparent;
        color: ${({ theme }) => theme.text};
        text-align: left;
        padding: 8px 10px;
        font-size: 0.82rem;
        font-weight: 650;
        cursor: pointer;
    }

    button:hover {
        background: ${v.colorPrincipal}18;
        color: ${v.colorPrincipal};
    }
`;

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
