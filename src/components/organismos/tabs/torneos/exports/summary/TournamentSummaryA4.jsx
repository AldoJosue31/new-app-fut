import React, { useMemo, useState } from "react";
import styled from "styled-components";
import {
    RiCheckLine,
    RiCloseLine,
    RiPauseLine,
    RiQuestionLine,
    RiSubtractLine,
} from "react-icons/ri";
import { PlayoffBracketView } from "../../subcomponents/PlayoffBracketView";
import { isRepositionJornadaName, resolveRepositionMappings } from "../../../../../../utils/jornadaUtils";

// Helpers
const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch { return dateString; }
};

const getDatePart = (dateString) => {
    if (!dateString) return "";
    return String(dateString).trim().split("T")[0].split(" ")[0];
};

const parseDateParts = (dateString) => {
    const datePart = getDatePart(dateString);
    const match = datePart.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!match) return null;

    const [, year, month, day] = match;
    return {
        year: Number(year),
        month: Number(month),
        day: Number(day),
        iso: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    };
};

const formatMatchDate = (dateString, baseDateString) => {
    const parts = parseDateParts(dateString);
    if (!parts) return "S/F";

    const baseYear = parseDateParts(baseDateString)?.year;
    const day = String(parts.day).padStart(2, "0");
    const month = String(parts.month).padStart(2, "0");

    if (baseYear && parts.year !== baseYear) {
        return `${day}/${month}/${String(parts.year).slice(-2)}`;
    }

    return `${day}/${month}`;
};

const addDaysToIsoDate = (dateString, days) => {
    const parts = parseDateParts(dateString);
    if (!parts) return "";

    const date = new Date(parts.year, parts.month - 1, parts.day);
    date.setDate(date.getDate() + days);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const formatJornadaDateRange = (jornada, baseDateString) => {
    const start = jornada?.start_date || jornada?.startDate || "";
    const end =
        jornada?.end_date ||
        jornada?.endDate ||
        (start ? addDaysToIsoDate(start, 6) : "");

    if (!start && !end) return "";
    if (start && !end) return formatMatchDate(start, baseDateString);
    if (!start && end) return formatMatchDate(end, baseDateString);

    return `${formatMatchDate(start, baseDateString)} - ${formatMatchDate(end, baseDateString)}`;
};

const getMatchDateIso = (match) => parseDateParts(match?.date || match?.fecha)?.iso || "";

const getMatchTimeValue = (match) => {
    const explicitTime = match?.time || match?.hora;
    if (explicitTime) return String(explicitTime).slice(0, 5);

    const rawDate = String(match?.date || match?.fecha || "");
    if (rawDate.includes("T")) return rawDate.split("T")[1]?.slice(0, 5) || "";
    if (rawDate.includes(" ")) return rawDate.split(" ")[1]?.slice(0, 5) || "";
    return "";
};

const compareMatchesByDate = (a, b) => {
    const dateA = getMatchDateIso(a);
    const dateB = getMatchDateIso(b);

    if (dateA && dateB && dateA !== dateB) return dateA.localeCompare(dateB);
    if (dateA && !dateB) return -1;
    if (!dateA && dateB) return 1;

    const timeCompare = getMatchTimeValue(a).localeCompare(getMatchTimeValue(b));
    if (timeCompare !== 0) return timeCompare;

    return String(a?.id || "").localeCompare(String(b?.id || ""));
};

const toComparableId = (value) => {
    if (value === null || value === undefined || value === "") return null;
    return String(value);
};

const isByeId = (id) => String(id || "").toUpperCase() === "BYE";

const resolveMatchTeamIds = (match) => {
    const localId = toComparableId(
        match?.team1_id ??
        match?.local_id ??
        match?.home_team_id ??
        match?.local?.id ??
        match?.homeTeam?.id ??
        match?.home?.id ??
        match?.team1?.id
    );
    const visitId = toComparableId(
        match?.team2_id ??
        match?.visitante_id ??
        match?.away_team_id ??
        match?.visitante?.id ??
        match?.awayTeam?.id ??
        match?.away?.id ??
        match?.team2?.id
    );

    return { localId, visitId };
};

const getTeamById = (teams, teamId) => {
    if (!teamId) return null;
    return teams?.find((team) => String(team.id) === String(teamId)) || null;
};

const getMatchTeamName = (teams, teamId, fallbackTeam, fallbackLabel) => {
    return getTeamById(teams, teamId)?.name || fallbackTeam?.name || fallbackLabel;
};

const getRestingTeamName = (match, teams) => {
    const { localId, visitId } = resolveMatchTeamIds(match);
    const activeTeamId = localId && !isByeId(localId) ? localId : visitId;
    const activeTeamFallback = localId && !isByeId(localId)
        ? match.local || match.homeTeam || match.home || match.team1
        : match.visitante || match.awayTeam || match.away || match.team2;

    return getMatchTeamName(teams, activeTeamId, activeTeamFallback, "Equipo");
};

const getRestingTeamKey = (match, teams) => {
    const { localId, visitId } = resolveMatchTeamIds(match);
    const activeTeamId = localId && !isByeId(localId) ? localId : visitId;
    if (activeTeamId && !isByeId(activeTeamId)) return `id:${activeTeamId}`;

    const teamName = getRestingTeamName(match, teams);
    return `name:${String(teamName).trim().toLowerCase()}`;
};

const isRestMatch = (match) => {
    if (match?.isByeMatch || match?.isBye) return true;

    const { localId, visitId } = resolveMatchTeamIds(match);
    if (isByeId(localId) || isByeId(visitId)) return true;

    const hasLocal = Boolean(localId);
    const hasVisit = Boolean(visitId);
    return hasLocal !== hasVisit;
};

const getConfigList = (config, key) => {
    const value = config?.[key];
    return Array.isArray(value) ? value : [];
};

const isFinalJornadaName = (name) => {
    const lower = String(name || "").toLowerCase();
    return lower.includes("final") && !lower.includes("semifinal") && !lower.includes("semi");
};

const getJornadaShortLabel = (name, index) => {
    const lower = String(name || "").toLowerCase();
    const number = lower.match(/jornada\s+(\d+)/i)?.[1] || (/^\d+$/.test(lower) ? lower : "");
    if (number) return `J${number}`;
    if (lower.includes("dieciseisavos")) return "16F";
    if (lower.includes("octavos")) return "OF";
    if (lower.includes("cuartos")) return "CF";
    if (lower.includes("semifinal") || lower.includes("semi")) {
        return lower.includes("vuelta") ? "SF V" : lower.includes("ida") ? "SF I" : "SF";
    }
    if (isFinalJornadaName(name)) {
        return lower.includes("vuelta") ? "F V" : lower.includes("ida") ? "F I" : "F";
    }
    return `J${index + 1}`;
};

const getStandingTeamName = (row) =>
    row?.nombre ||
    row?.name ||
    row?.team_name ||
    row?.equipo?.name ||
    row?.equipo?.nombre ||
    row?.team?.name ||
    row?.team?.nombre ||
    "--";

const getNumericStandingValue = (row, keys) => {
    for (const key of keys) {
        const value = row?.[key];
        if (value !== null && value !== undefined && String(value).trim() !== "") {
            const numeric = Number(value);
            if (Number.isFinite(numeric)) return numeric;
        }
    }
    return null;
};

const INDEX_ENTRIES_PER_PAGE = 18;

const getTeamMatchOutcome = (match, teamId) => {
    if (isRestMatch(match)) return "rest";

    const { localId, visitId } = resolveMatchTeamIds(match);
    const isLocal = String(localId) === String(teamId);
    const isVisit = String(visitId) === String(teamId);
    if (!isLocal && !isVisit) return null;

    const hasResult =
        String(match.status).toLowerCase() === "finalizado" &&
        match.goals1 !== null &&
        match.goals2 !== null &&
        match.goals1 !== undefined &&
        match.goals2 !== undefined &&
        String(match.goals1).trim() !== "" &&
        String(match.goals2).trim() !== "";

    if (!hasResult) return "pending";

    const teamGoals = Number(isLocal ? match.goals1 : match.goals2);
    const rivalGoals = Number(isLocal ? match.goals2 : match.goals1);
    if (teamGoals > rivalGoals) return "win";
    if (teamGoals < rivalGoals) return "loss";
    return "draw";
};

const OutcomeIcon = ({ type }) => {
    if (type === "win") return <RiCheckLine aria-label="Victoria" />;
    if (type === "loss") return <RiCloseLine aria-label="Derrota" />;
    if (type === "draw") return <RiSubtractLine aria-label="Empate" />;
    if (type === "pending") return <RiQuestionLine aria-label="No disputado" />;
    if (type === "rest") return <RiPauseLine aria-label="Descanso" />;
    return <span aria-label="Sin partido">-</span>;
};

const SmartLeagueLogo = ({ src }) => {
    const [renderState, setRenderState] = useState(null);
    const currentSrc = renderState?.src || src;
    const shouldUseCors = !renderState?.processed && !renderState?.noCorsRetry;

    const handleLoad = (event) => {
        if (renderState || !src) return;

        const image = event.currentTarget;
        const width = image.naturalWidth;
        const height = image.naturalHeight;
        if (!width || !height) return;

        try {
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext("2d", { willReadFrequently: true });
            if (!context) return;

            context.drawImage(image, 0, 0);
            const { data } = context.getImageData(0, 0, width, height);
            let minX = width;
            let minY = height;
            let maxX = -1;
            let maxY = -1;
            let transparentPixels = 0;
            let visiblePixels = 0;

            for (let y = 0; y < height; y += 1) {
                for (let x = 0; x < width; x += 1) {
                    const alpha = data[((y * width + x) * 4) + 3];
                    if (alpha < 245) transparentPixels += 1;
                    if (alpha > 24) {
                        visiblePixels += 1;
                        if (x < minX) minX = x;
                        if (y < minY) minY = y;
                        if (x > maxX) maxX = x;
                        if (y > maxY) maxY = y;
                    }
                }
            }

            const totalPixels = width * height;
            const transparentRatio = transparentPixels / totalPixels;
            const contentWidth = maxX - minX + 1;
            const contentHeight = maxY - minY + 1;
            const contentAreaRatio = visiblePixels / totalPixels;
            const shouldCrop =
                transparentRatio > 0.04 &&
                contentWidth > 0 &&
                contentHeight > 0 &&
                contentAreaRatio < 0.88;

            if (!shouldCrop) {
                setRenderState({
                    src,
                    mode: transparentRatio > 0.04 ? "transparent" : "framed",
                    processed: true,
                });
                return;
            }

            const padding = Math.max(4, Math.round(Math.max(contentWidth, contentHeight) * 0.08));
            const cropX = Math.max(0, minX - padding);
            const cropY = Math.max(0, minY - padding);
            const cropRight = Math.min(width, maxX + padding + 1);
            const cropBottom = Math.min(height, maxY + padding + 1);
            const cropWidth = cropRight - cropX;
            const cropHeight = cropBottom - cropY;

            const croppedCanvas = document.createElement("canvas");
            croppedCanvas.width = cropWidth;
            croppedCanvas.height = cropHeight;
            const croppedContext = croppedCanvas.getContext("2d");
            if (!croppedContext) return;

            croppedContext.drawImage(
                image,
                cropX,
                cropY,
                cropWidth,
                cropHeight,
                0,
                0,
                cropWidth,
                cropHeight
            );

            setRenderState({
                src: croppedCanvas.toDataURL("image/png"),
                mode: "cropped",
                processed: true,
            });
        } catch {
            setRenderState({ src, mode: "framed", processed: true });
        }
    };

    const handleError = () => {
        if (!renderState) {
            setRenderState({ src, mode: "framed", noCorsRetry: true });
        }
    };

    return (
        <img
            className={`smart-league-logo logo-${renderState?.mode || "loading"}`}
            src={currentSrc}
            alt="Logo Liga"
            crossOrigin={shouldUseCors ? "anonymous" : undefined}
            onLoad={handleLoad}
            onError={handleError}
        />
    );
};

export const TournamentSummaryA4 = ({ 
    activeTournament, 
    leagueData, 
    participatingTeams, 
    partidos, 
    allTournamentJornadas, 
    tournamentFinalResults, 
    stats,
    metaInfo,
    standings
}) => {

    const configObj = useMemo(() => {
        if (!activeTournament?.config) return {};
        try {
            return typeof activeTournament.config === "string"
                ? JSON.parse(activeTournament.config)
                : activeTournament.config;
        } catch {
            return {};
        }
    }, [activeTournament]);

    // Resolve mappings for reposicion jornadas
    const resolvedMappings = useMemo(() => {
        if (!allTournamentJornadas) return [];
        return resolveRepositionMappings({
            jornadas: allTournamentJornadas,
            configuredMappings: configObj?.repositionMappings || []
        });
    }, [allTournamentJornadas, configObj]);

    const repositionMatchMappings = useMemo(() => {
        return [
            ...getConfigList(configObj, "repositionMatchMappings"),
            ...getConfigList(configObj, "matchMappings"),
        ];
    }, [configObj]);

    // Group matches by jornada and sort them properly
    const jornadasWithMatches = useMemo(() => {
        if (!allTournamentJornadas || !partidos) return [];

        // 1. Map matches to their original jornada if they belong to a reposicion
        const mainJornadas = allTournamentJornadas.filter(j => !isRepositionJornadaName(j.name));

        const mappedJornadas = mainJornadas.map(j => {
            const matchesForJornada = partidos.filter(m => {
                let mappedJornadaId = m.jornada_id;

                let origId = null;
                const matchMap = repositionMatchMappings.find(map => String(map.matchId) === String(m.id));

                if (matchMap && matchMap.originalJornadaId) {
                    origId = matchMap.originalJornadaId;
                } else {
                    const mapping = resolvedMappings.find(map => String(map.repositionJornadaId) === String(m.jornada_id));
                    if (mapping) {
                        origId = mapping.originalJornadaId;
                    } else if (m.meta_info) {
                        try {
                            const meta = typeof m.meta_info === 'string' ? JSON.parse(m.meta_info) : m.meta_info;
                            if (meta?.originalJornadaId) {
                                origId = meta.originalJornadaId;
                            }
                        } catch {
                            // Ignore malformed meta_info and keep the match in its current jornada.
                        }
                    }
                }

                if (origId) {
                    mappedJornadaId = origId;
                }

                // If the IDs don't match type-wise, ensure we compare strings
                return String(mappedJornadaId) === String(j.id);
            });

            const isRegular = /jornada\s+\d+/i.test(j.name) || /^\d+$/.test(j.name);
            let restingMatches = [];

            if (isRegular && participatingTeams && participatingTeams.length % 2 !== 0) {
                const activeTeams = new Set();
                let hasExplicitRest = false;

                matchesForJornada.forEach(m => {
                    const { localId, visitId } = resolveMatchTeamIds(m);
                    if (localId && !isByeId(localId)) activeTeams.add(localId);
                    if (visitId && !isByeId(visitId)) activeTeams.add(visitId);
                    if (isRestMatch(m)) hasExplicitRest = true;
                });

                if (!hasExplicitRest) {
                    const restingTeams = participatingTeams.filter(t => !activeTeams.has(String(t.id)));
                    if (restingTeams.length === 1) {
                        restingMatches = restingTeams.map((t, idx) => ({
                            id: `resting-${j.id}-${t.id}-${idx}`,
                            jornada_id: j.id,
                            team1_id: t.id,
                            team2_id: 'BYE',
                            goals1: null,
                            goals2: null,
                            status: 'Descanso'
                        }));
                    }
                }
            }

            return {
                ...j,
                matches: [...matchesForJornada].sort(compareMatchesByDate).concat(restingMatches)
            };
        }).filter(j => j.matches.length > 0);
        
        // 2. Sort the jornadas so that liguilla is printed in order
        return mappedJornadas.sort((a, b) => {
            const getRank = (name) => {
                if (!name) return 0;
                const lower = name.toLowerCase();
                
                // Playoff ranks (dieciseisavos -> octavos -> cuartos -> semifinal -> final)
                if (lower.includes("dieciseisavos")) return 1000;
                if (lower.includes("octavos")) return 1001;
                if (lower.includes("cuartos")) return 1002;
                if (lower.includes("semifinal") || lower.includes("semi")) return 1003;
                if (lower.includes("final")) return 1004;
                
                // Regular jornadas (try to parse number)
                const isRegular = /jornada\s+\d+/i.test(lower) || /^\d+$/.test(lower);
                if (isRegular) {
                    const match = lower.match(/\d+/);
                    return match ? parseInt(match[0], 10) : 500;
                }
                
                return 500;
            };
            
            const rankA = getRank(a.name);
            const rankB = getRank(b.name);
            
            if (rankA !== rankB) return rankA - rankB;
            
            // If they are the same phase (e.g. both are Semifinal), sort by ida/vuelta
            const nameA = (a.name || "").toLowerCase();
            const nameB = (b.name || "").toLowerCase();
            if (nameA.includes("ida") && nameB.includes("vuelta")) return -1;
            if (nameA.includes("vuelta") && nameB.includes("ida")) return 1;
            
            // Fallback to ID sorting
            return (a.id || 0) - (b.id || 0);
        });
    }, [allTournamentJornadas, partidos, resolvedMappings, repositionMatchMappings, participatingTeams]);

    const leagueName = metaInfo?.league || leagueData?.name || "LIGA DE FÚTBOL";
    const divisionName = metaInfo?.division || "División Única";
    const leagueLogoUrl = metaInfo?.leagueLogo || leagueData?.logo_url || null;
    const tournamentName = activeTournament?.season || "Torneo Actual";
    
    const startDate = activeTournament?.start_date || activeTournament?.created_at || "N/A";
    const tournamentEndDate = useMemo(() => {
        const finalJornadas = jornadasWithMatches.filter((jornada) =>
            isFinalJornadaName(jornada?.name)
        );
        if (finalJornadas.length === 0) return "";

        const secondLegFinalJornadas = finalJornadas.filter((jornada) =>
            String(jornada?.name || "").toLowerCase().includes("vuelta")
        );
        const sourceJornadas =
            secondLegFinalJornadas.length > 0 ? secondLegFinalJornadas : finalJornadas;

        const datedFinalMatches = sourceJornadas
            .flatMap((jornada) => jornada.matches || [])
            .filter((match) => !isRestMatch(match))
            .map((match) => ({
                date: match.date || match.fecha || "",
                iso: getMatchDateIso(match),
            }))
            .filter((match) => Boolean(match.iso))
            .sort((a, b) => b.iso.localeCompare(a.iso));

        if (datedFinalMatches.length > 0) return datedFinalMatches[0].date;

        const datedFinalJornada = sourceJornadas
            .map((jornada) => jornada.end_date || jornada.start_date || "")
            .filter(Boolean)
            .sort()
            .pop();

        return datedFinalJornada || "";
    }, [jornadasWithMatches]);
    const totalTeams = participatingTeams?.length || 0;
    const totalJornadas = allTournamentJornadas?.length || 0;
    const totalMatches = partidos?.length || 0;

    const tournamentConfig = useMemo(() => {
        if (!activeTournament?.config) return {};
        if (typeof activeTournament.config === "string") {
            try { return JSON.parse(activeTournament.config); } catch { return {}; }
        }
        return activeTournament.config;
    }, [activeTournament?.config]);

    const hasPlayoff = Boolean(tournamentConfig.zonaLiguilla || (tournamentConfig.playoffState?.stages?.length > 0));

    // Ensure stats are computed if they are missing or if we need to guarantee accuracy
    const derivedStats = useMemo(() => {
        const standingsRows = Array.isArray(standings) ? standings : [];
        if (standingsRows.length > 0) {
            const rowsWithGf = standingsRows
                .map((row) => ({
                    row,
                    gf: getNumericStandingValue(row, ["gf", "GF", "golesFavor", "goles_favor", "goalsFor"]),
                }))
                .filter((entry) => entry.gf !== null);
            const rowsWithGc = standingsRows
                .map((row) => ({
                    row,
                    gc: getNumericStandingValue(row, ["gc", "GC", "golesContra", "goles_contra", "goalsAgainst"]),
                }))
                .filter((entry) => entry.gc !== null);

            const topScoring = rowsWithGf.reduce(
                (max, entry) => (entry.gf > max.gf ? entry : max),
                rowsWithGf[0]
            );
            const leastScored = rowsWithGc.reduce(
                (min, entry) => (entry.gc < min.gc ? entry : min),
                rowsWithGc[0]
            );

            if (topScoring || leastScored) {
                return {
                    topScoringTeam: topScoring ? getStandingTeamName(topScoring.row) : (stats?.topScoringTeam || "--"),
                    leastScoredTeam: leastScored ? getStandingTeamName(leastScored.row) : (stats?.leastScoredTeam || "--"),
                };
            }
        }

        if (stats?.topScoringTeam || stats?.leastScoredTeam) {
            return {
                topScoringTeam: stats?.topScoringTeam || "--",
                leastScoredTeam: stats?.leastScoredTeam || "--",
            };
        }

        if (!partidos || !participatingTeams) return stats || null;
        
        const teamStats = {};
        participatingTeams.forEach(t => teamStats[t.id] = { id: t.id, name: t.name, gf: 0, gc: 0 });
        
        partidos.forEach(m => {
            if (m.goals1 !== null && m.goals2 !== null && String(m.goals1).trim() !== "") {
                if (teamStats[m.team1_id]) {
                    teamStats[m.team1_id].gf += Number(m.goals1);
                    teamStats[m.team1_id].gc += Number(m.goals2);
                }
                if (teamStats[m.team2_id]) {
                    teamStats[m.team2_id].gf += Number(m.goals2);
                    teamStats[m.team2_id].gc += Number(m.goals1);
                }
            }
        });
        
        const teamsArray = Object.values(teamStats).filter(t => t.gf > 0 || t.gc > 0);
        if (teamsArray.length === 0) return stats || null;
        
        const topScoring = teamsArray.reduce((max, t) => t.gf > max.gf ? t : max, teamsArray[0]);
        const leastScored = teamsArray.reduce((min, t) => t.gc < min.gc ? t : min, teamsArray[0]);
        
        return {
            topScoringTeam: topScoring?.name || "--",
            leastScoredTeam: leastScored?.name || "--"
        };
    }, [stats, standings, partidos, participatingTeams]);

    // Patch activeTournament if the final match exists but the bracket stage isn't created
    const patchedTournament = useMemo(() => {
        if (!hasPlayoff) return activeTournament;
        try {
            const configObj = typeof activeTournament.config === "string" ? JSON.parse(activeTournament.config) : activeTournament.config;
            const stages = configObj?.playoffState?.stages || [];
            
            // Check if final exists in stages
            const hasFinalStage = stages.some(s => s.phaseKey === "final");
            
            // If it doesn't exist, let's see if we have a match for the final in partidos
            if (!hasFinalStage && partidos && allTournamentJornadas) {
                const finalJornada = allTournamentJornadas.find(j => j.name?.toLowerCase().includes("final") && !j.name?.toLowerCase().includes("semi") && !j.name?.toLowerCase().includes("cuartos"));
                if (finalJornada) {
                    const finalMatch = partidos.find(m => m.jornada_id === finalJornada.id);
                    if (finalMatch) {
                        const team1 = participatingTeams.find(t => t.id === finalMatch.team1_id);
                        const team2 = participatingTeams.find(t => t.id === finalMatch.team2_id);
                        
                        if (team1 && team2) {
                            const patchedStages = [...stages, {
                                phaseKey: "final",
                                phaseLabel: "Gran Final",
                                pairs: [{
                                    id: `manual-final-${finalMatch.id}`,
                                    home: { ...team1, seed: 1 },
                                    away: { ...team2, seed: 2 }
                                }]
                            }];
                            
                            return {
                                ...activeTournament,
                                config: {
                                    ...configObj,
                                    playoffState: {
                                        ...(configObj.playoffState || {}),
                                        stages: patchedStages
                                    }
                                }
                            };
                        }
                    }
                }
            }
        } catch(error) {
            console.error("Error patching tournament config", error);
        }
        return activeTournament;
    }, [activeTournament, hasPlayoff, partidos, allTournamentJornadas, participatingTeams]);

    const teamJourneyMatrix = useMemo(() => {
        if (!participatingTeams || !jornadasWithMatches) return [];

        return participatingTeams.map((team) => {
            const teamId = String(team.id);
            const teamNameKey = `name:${String(team.name || "").trim().toLowerCase()}`;
            const results = jornadasWithMatches.map((jornada) => {
                const restMatch = (jornada.matches || []).find((match) => {
                    if (!isRestMatch(match)) return false;
                    const restKey = getRestingTeamKey(match, participatingTeams);
                    return restKey === `id:${teamId}` || restKey === teamNameKey;
                });

                if (restMatch) return "rest";

                const teamMatch = (jornada.matches || []).find((match) => {
                    if (isRestMatch(match)) return false;
                    const { localId, visitId } = resolveMatchTeamIds(match);
                    return String(localId) === teamId || String(visitId) === teamId;
                });

                return getTeamMatchOutcome(teamMatch, teamId);
            });

            return { team, results };
        });
    }, [jornadasWithMatches, participatingTeams]);

    const documentIndexEntries = useMemo(() => {
        const entries = [];

        if (teamJourneyMatrix.length > 0) {
            entries.push({
                id: "summary-page-matrix",
                title: "Equipos por Jornada",
                subtitle: "Resumen de resultados por equipo",
            });
        }

        if (hasPlayoff) {
            entries.push({
                id: "summary-page-bracket",
                title: "Cuadro Final",
                subtitle: "",
            });
        }

        jornadasWithMatches.forEach((jornada, index) => {
            entries.push({
                id: `summary-page-jornada-${jornada.id || index}`,
                title: `Resultados: ${jornada.name}`,
                subtitle: formatJornadaDateRange(jornada, startDate),
            });
        });

        const indexPageCount = Math.max(1, Math.ceil(entries.length / INDEX_ENTRIES_PER_PAGE));
        let pageNumber = indexPageCount + 2; // Portada = 1, indice = 2..N.

        return entries.map((entry) => ({
            ...entry,
            anchorId: `${entry.id}-anchor`,
            pageNumber: pageNumber++,
        }));
    }, [hasPlayoff, jornadasWithMatches, startDate, teamJourneyMatrix.length]);

    const documentIndexPages = useMemo(() => {
        const pages = [];
        for (let index = 0; index < documentIndexEntries.length; index += INDEX_ENTRIES_PER_PAGE) {
            pages.push(documentIndexEntries.slice(index, index + INDEX_ENTRIES_PER_PAGE));
        }
        return pages.length > 0 ? pages : [[]];
    }, [documentIndexEntries]);

    return (
        <SummaryContainer>
            {/* HOJA 1: PORTADA */}
            <div className="print-page cover-page">
                <div className="header">
                    <div className="logo-container">
                        {leagueLogoUrl ? (
                            <SmartLeagueLogo key={leagueLogoUrl} src={leagueLogoUrl} />
                        ) : (
                            <div className="logo-text">LIGA</div>
                        )}
                    </div>
                    <div className="title-block">
                        <h1>{leagueName}</h1>
                        <h2>Resumen Oficial del Torneo - {divisionName}</h2>
                    </div>
                </div>

                <div className="cover-content">
                    <div className="tournament-banner">
                        <div className="label">TORNEO</div>
                        <div className="value">{tournamentName}</div>
                    </div>

                    {tournamentFinalResults && (
                        <div className="champion-highlight">
                            <div className="champ-block">
                                <span className="label">CAMPEÓN</span>
                                <div className="champ-name" style={{ color: '#F59E0B' }}>
                                    {tournamentFinalResults.champion?.name || "--"}
                                </div>
                            </div>
                            <div className="champ-block">
                                <span className="label">SUBCAMPEÓN</span>
                                <div className="champ-name" style={{ color: '#71717A' }}>
                                    {tournamentFinalResults.runnerUp?.name || "--"}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="stats-grid">
                        <div className="stat-card stat-half">
                            <span className="label">INICIO</span>
                            <span className="value">{formatDate(startDate)}</span>
                        </div>
                        <div className="stat-card stat-half">
                            <span className="label">FIN DEL TORNEO</span>
                            <span className="value">{tournamentEndDate ? formatDate(tournamentEndDate) : "--"}</span>
                        </div>
                        <div className="stat-card stat-third">
                            <span className="label">EQUIPOS PARTICIPANTES</span>
                            <span className="value">{totalTeams}</span>
                        </div>
                        <div className="stat-card stat-third">
                            <span className="label">JORNADAS</span>
                            <span className="value">{totalJornadas}</span>
                        </div>
                        <div className="stat-card stat-third">
                            <span className="label">PARTIDOS JUGADOS</span>
                            <span className="value">{totalMatches}</span>
                        </div>
                        
                        {derivedStats && (
                            <>
                                <div className="stat-card stat-feature">
                                    <span className="label">EQUIPO MÁS GOLEADOR (FASE REGULAR)</span>
                                    <span className="value">{derivedStats.topScoringTeam || "--"}</span>
                                </div>
                                <div className="stat-card stat-feature">
                                    <span className="label">EQUIPO MENOS GOLEADO (FASE REGULAR)</span>
                                    <span className="value">{derivedStats.leastScoredTeam || "--"}</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {documentIndexPages.map((entries, pageIndex) => (
                <div
                    key={`index-page-${pageIndex}`}
                    className="print-page index-page"
                    id={pageIndex === 0 ? "summary-page-index" : `summary-page-index-${pageIndex + 1}`}
                >
                    <div className="page-header">
                        <span className="league-mini">{leagueName} - {tournamentName} - {divisionName}</span>
                        <h3>Indice</h3>
                        <span className="jornada-date-range">Contenido del documento</span>
                    </div>

                    <div className="index-list">
                        {entries.map((entry) => (
                            <div className="index-row" key={entry.id}>
                                <div className="index-title">
                                    <strong>{entry.title}</strong>
                                    {entry.subtitle && <span>{entry.subtitle}</span>}
                                </div>
                                <span className="index-line" aria-hidden="true" />
                                <a
                                    className="index-page-number"
                                    href={`#${entry.anchorId}`}
                                    data-target-page={entry.pageNumber}
                                >
                                    {entry.pageNumber}
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {teamJourneyMatrix.length > 0 && (
                <div className="print-page matrix-page" id="summary-page-matrix">
                    <a id="summary-page-matrix-anchor" name="summary-page-matrix-anchor" className="pdf-anchor" aria-hidden="true" />
                    <div className="page-header">
                        <span className="league-mini">{leagueName} - {tournamentName} - {divisionName}</span>
                        <h3>Equipos por Jornada</h3>
                        <span className="jornada-date-range">Resumen de resultados por equipo</span>
                    </div>

                    <div className="matrix-legend">
                        <span><RiCheckLine /> Victoria</span>
                        <span><RiCloseLine /> Derrota</span>
                        <span><RiSubtractLine /> Empate</span>
                        <span><RiQuestionLine /> No disputado</span>
                        <span><RiPauseLine /> Descanso</span>
                    </div>

                    <table className="journey-matrix">
                        <thead>
                            <tr>
                                <th className="team-heading">Equipo</th>
                                {jornadasWithMatches.map((jornada, jornadaIndex) => (
                                    <th key={jornada.id || jornadaIndex}>
                                        {getJornadaShortLabel(jornada.name, jornadaIndex)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {teamJourneyMatrix.map(({ team, results }) => (
                                <tr key={team.id}>
                                    <td className="team-name">{team.name}</td>
                                    {results.map((result, resultIndex) => (
                                        <td key={`${team.id}-${resultIndex}`} className={`outcome-cell outcome-${result || "empty"}`}>
                                            <OutcomeIcon type={result} />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* HOJA DE LLAVES (PLAYOFFS) */}
            {hasPlayoff && (
                <div className="print-page bracket-page" id="summary-page-bracket">
                    <a id="summary-page-bracket-anchor" name="summary-page-bracket-anchor" className="pdf-anchor" aria-hidden="true" />
                    <div className="page-header">
                        <span className="league-mini">{leagueName} - {tournamentName} - {divisionName}</span>
                        <h3>Cuadro Final</h3>
                    </div>
                    
                    <div className="bracket-print-wrapper">
                        <PlayoffBracketView 
                            torneo={patchedTournament} 
                            partidos={partidos} 
                            jornadas={allTournamentJornadas} 
                            projectedStandings={standings || []}
                            isLoading={false}
                            layoutMode="print-vertical"
                        />
                    </div>
                </div>
            )}

            {/* HOJAS DE JORNADAS (Varias páginas según la cantidad de jornadas) */}
            {jornadasWithMatches.map((jornada, index) => {
                const regularMatches = jornada.matches
                    .filter((match) => !isRestMatch(match))
                    .sort(compareMatchesByDate);
                const seenRestingTeams = new Set();
                const restingMatches = jornada.matches.filter((match) => {
                    if (!isRestMatch(match)) return false;
                    const key = getRestingTeamKey(match, participatingTeams);
                    if (seenRestingTeams.has(key)) return false;
                    seenRestingTeams.add(key);
                    return true;
                });
                const jornadaDateRange = formatJornadaDateRange(jornada, startDate);

                return (
                    <div key={jornada.id || index} id={`summary-page-jornada-${jornada.id || index}`} className="print-page results-page">
                        <a
                            id={`summary-page-jornada-${jornada.id || index}-anchor`}
                            name={`summary-page-jornada-${jornada.id || index}-anchor`}
                            className="pdf-anchor"
                            aria-hidden="true"
                        />
                        <div className="page-header">
                            <span className="league-mini">{leagueName} - {tournamentName} - {divisionName}</span>
                            <h3>Resultados: {jornada.name}</h3>
                            {jornadaDateRange && (
                                <span className="jornada-date-range">{jornadaDateRange}</span>
                            )}
                        </div>

                        <table className="results-table">
                            <thead>
                                <tr>
                                    <th className="text-center">Fecha</th>
                                    <th className="text-right">Local</th>
                                    <th className="text-center">Res.</th>
                                    <th className="text-left">Visitante</th>
                                    <th className="text-left">Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {regularMatches.map(match => {
                                    const { localId, visitId } = resolveMatchTeamIds(match);
                                    const local = getMatchTeamName(
                                        participatingTeams,
                                        localId,
                                        match.local || match.homeTeam || match.home || match.team1,
                                        "Equipo Local"
                                    );
                                    const visit = getMatchTeamName(
                                        participatingTeams,
                                        visitId,
                                        match.visitante || match.awayTeam || match.away || match.team2,
                                        "Equipo Visitante"
                                    );
                                    const isDisputado = String(match.status).toLowerCase() === 'finalizado';
                                    const hasResult =
                                        isDisputado &&
                                        match.goals1 !== null &&
                                        match.goals2 !== null &&
                                        match.goals1 !== undefined &&
                                        match.goals2 !== undefined &&
                                        String(match.goals1).trim() !== "" &&
                                        String(match.goals2).trim() !== "";
                                    const result = hasResult ? `${match.goals1} - ${match.goals2}` : "VS";
                                    const status = hasResult ? "Finalizado" : "No disputado";
                                    const matchDate = formatMatchDate(match.date || match.fecha, startDate);

                                    return (
                                        <tr key={match.id}>
                                            <td className="match-date">{matchDate}</td>
                                            <td className="team local">{local}</td>
                                            <td className="score">{result}</td>
                                            <td className="team visit">{visit}</td>
                                            <td className="status">{status}</td>
                                        </tr>
                                    )
                                })}
                                {restingMatches.map((match) => {
                                    const teamName = getRestingTeamName(match, participatingTeams);

                                    return (
                                        <tr key={match.id} className="rest-row">
                                            <td colSpan={5} className="rest-cell">
                                                <span className="rest-pill">
                                                    <span className="rest-label">Descansa</span>
                                                    <strong>{teamName}</strong>
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                );
            })}

        </SummaryContainer>
    );
};

const SummaryContainer = styled.div`
    width: 210mm;
    background: transparent;
    color: #0f172a;
    font-family: 'Inter', sans-serif;
    margin: 0 auto;

    * { box-sizing: border-box; }

    .print-page {
        width: 210mm;
        height: 297mm;
        padding: 20mm;
        background: #ffffff;
        position: relative;
        margin-bottom: 20px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }

    .pdf-anchor {
        position: absolute;
        top: 0;
        left: 0;
        width: 1px;
        height: 1px;
        overflow: hidden;
        pointer-events: none;
    }

    /* Ocultar sombras en la impresión real */
    @media print {
        .print-page {
            box-shadow: none;
            margin-bottom: 0;
            page-break-after: always;
            break-after: page;
        }
    }

    /* HOJA 1: PORTADA */
    .cover-page {
        display: flex;
        flex-direction: column;
        
        .header {
            display: flex;
            align-items: center;
            border-bottom: 3px solid #1e293b;
            padding-bottom: 20px;
            margin-bottom: 40px;
            
            .logo-container {
                width: 124px;
                height: 124px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #f1f5f9;
                border-radius: 12px;
                margin-right: 34px;
                overflow: hidden;
                
                .smart-league-logo {
                    display: block;
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                }

                .logo-cropped,
                .logo-transparent {
                    width: 96%;
                    height: 96%;
                }

                .logo-framed {
                    width: 100%;
                    height: 100%;
                }

                .logo-text { font-weight: 800; font-size: 28px; color: #94a3b8; }
            }
            
            .title-block {
                h1 { margin: 0 0 5px 0; font-size: 32px; font-weight: 900; color: #0f172a; text-transform: uppercase; }
                h2 { margin: 0; font-size: 20px; font-weight: 500; color: #64748b; }
            }
        }
        
        .cover-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 40px;
            
            .tournament-banner {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 16px;
                padding: 30px;
                text-align: center;
                
                .label { font-size: 14px; font-weight: 700; color: #64748b; letter-spacing: 2px; margin-bottom: 10px; }
                .value { font-size: 36px; font-weight: 900; color: #1e293b; text-transform: uppercase; }
            }

            .champion-highlight {
                display: flex;
                gap: 20px;
                
                .champ-block {
                    flex: 1;
                    background: #ffffff;
                    border: 2px solid #f1f5f9;
                    border-radius: 16px;
                    padding: 25px;
                    text-align: center;
                    
                    .label { font-size: 12px; font-weight: 700; letter-spacing: 1.5px; display: block; margin-bottom: 15px; color: #94a3b8; }
                    .champ-name { font-size: 24px; font-weight: 800; text-transform: uppercase; }
                }
            }
            
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(6, minmax(0, 1fr));
                gap: 14px;
                
                .stat-card {
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    padding: 18px;
                    border-radius: 12px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    min-width: 0;
                    
                    .label { font-size: 11px; font-weight: 700; color: #64748b; margin-bottom: 8px; letter-spacing: 1px; }
                    .value { font-size: 20px; font-weight: 700; color: #0f172a; line-height: 1.2; }
                }

                .stat-half {
                    grid-column: span 3;
                }

                .stat-third {
                    grid-column: span 2;
                    align-items: center;
                    text-align: center;
                    padding: 15px 12px;

                    .label {
                        min-height: 26px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }

                    .value {
                        font-size: 24px;
                        font-weight: 800;
                    }
                }

                .stat-feature {
                    grid-column: span 3;

                    .value {
                        font-size: 18px;
                    }
                }
            }
        }
    }

    /* HOJAS RESULTADOS Y BRACKET */
    .results-page, .bracket-page, .matrix-page, .index-page {
        .page-header {
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 2px solid #e2e8f0;
            
            .league-mini { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 5px; }
            h3 { margin: 0; font-size: 24px; font-weight: 800; color: #0f172a; text-transform: uppercase; }
            .jornada-date-range {
                display: inline-flex;
                align-items: center;
                margin-top: 8px;
                padding: 4px 10px;
                border-radius: 999px;
                background: #f1f5f9;
                color: #475569;
                font-size: 12px;
                font-weight: 800;
                letter-spacing: 0.4px;
            }
        }
        
        .results-table {
            width: 100%;
            border-collapse: collapse;
            
            th {
                padding: 12px 15px;
                background: #f1f5f9;
                color: #475569;
                font-size: 12px;
                font-weight: 700;
                text-transform: uppercase;
                border-bottom: 2px solid #cbd5e1;
            }
            
            td {
                padding: 15px;
                border-bottom: 1px solid #e2e8f0;
                font-size: 14px;
                color: #1e293b;
            }
            
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .text-left { text-align: left; }
            
            .match-date {
                width: 12%;
                text-align: center;
                font-size: 12px;
                font-weight: 800;
                color: #475569;
                white-space: nowrap;
                background: #f8fafc;
                border-right: 1px solid #e2e8f0;
            }
            .team { font-weight: 600; width: 29%; }
            .local { text-align: right; }
            .visit { text-align: left; }
            .score { text-align: center; font-weight: 800; font-size: 16px; background: #f8fafc; width: 13%; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; }
            .status { font-size: 12px; color: #64748b; width: 17%; text-align: left;}

            .rest-row {
                .rest-cell {
                    padding: 18px 15px;
                    text-align: center;
                    background: #f8fafc;
                    border-top: 2px solid #cbd5e1;
                    border-bottom: 1px solid #e2e8f0;
                }

                & + .rest-row .rest-cell {
                    border-top: 1px solid #e2e8f0;
                    padding-top: 12px;
                }

                .rest-pill {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    min-width: 260px;
                    max-width: 100%;
                    padding: 8px 16px;
                    border: 1px solid #cbd5e1;
                    border-radius: 999px;
                    background: #ffffff;
                    color: #0f172a;
                    font-size: 13px;
                    line-height: 1.2;
                }

                .rest-label {
                    font-size: 11px;
                    font-weight: 800;
                    color: #475569;
                    text-transform: uppercase;
                    letter-spacing: 0.8px;
                }

                strong {
                    font-size: 14px;
                    font-weight: 800;
                }
            }
        }
    }

    .index-page {
        .page-header {
            margin-bottom: 18px;
        }

        .index-list {
            display: flex;
            flex-direction: column;
            gap: 4px;
            margin-top: 10px;
        }

        .index-row {
            display: grid;
            grid-template-columns: minmax(0, auto) minmax(24px, 1fr) 36px;
            align-items: end;
            gap: 8px;
            padding: 5px 0;
            border-bottom: 1px solid #eef2f7;
        }

        .index-title {
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 4px;

            strong {
                color: #0f172a;
                font-size: 13px;
                font-weight: 900;
                line-height: 1.15;
            }

            span {
                color: #64748b;
                font-size: 9.5px;
                font-weight: 800;
                line-height: 1.12;
            }
        }

        .index-line {
            height: 1px;
            margin-bottom: 7px;
            border-bottom: 1px dotted #cbd5e1;
        }

        .index-page-number {
            min-width: 30px;
            min-height: 24px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            justify-self: end;
            border: 1px solid #38bdf8;
            border-radius: 7px;
            background: #f0f9ff;
            color: #0369a1;
            font-size: 12px;
            font-weight: 950;
            text-decoration: none;
        }
    }

    .matrix-page {
        .page-header {
            margin-bottom: 18px;
        }

        .matrix-legend {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 14px;
            padding: 10px 12px;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            background: #f8fafc;

            span {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                color: #475569;
                font-size: 10px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.35px;
            }

            svg {
                width: 13px;
                height: 13px;
            }
        }

        .journey-matrix {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            border: 1px solid #cbd5e1;

            th,
            td {
                border: 1px solid #e2e8f0;
            }

            th {
                padding: 8px 4px;
                background: #f1f5f9;
                color: #475569;
                font-size: 9px;
                font-weight: 900;
                text-transform: uppercase;
                text-align: center;
                white-space: nowrap;
            }

            .team-heading {
                width: 32mm;
                text-align: left;
                padding-left: 10px;
            }

            .team-name {
                padding: 7px 8px;
                color: #0f172a;
                font-size: 10px;
                font-weight: 800;
                line-height: 1.15;
                background: #ffffff;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .outcome-cell {
                height: 25px;
                padding: 0;
                text-align: center;
                vertical-align: middle;
                color: #94a3b8;
                background: #ffffff;

                svg {
                    width: 15px;
                    height: 15px;
                    vertical-align: middle;
                    stroke-width: 3;
                }

                span {
                    display: inline-block;
                    color: #cbd5e1;
                    font-size: 10px;
                    font-weight: 800;
                }
            }

            .outcome-win {
                color: #15803d;
                background: #f0fdf4;
            }

            .outcome-loss {
                color: #b91c1c;
                background: #fef2f2;
            }

            .outcome-draw {
                color: #475569;
                background: #f8fafc;
            }

            .outcome-pending {
                color: #b45309;
                background: #fffbeb;
            }

            .outcome-rest {
                color: #2563eb;
                background: #eff6ff;
            }

            .outcome-empty {
                background: #ffffff;
            }
        }
    }
    
    .bracket-print-wrapper {
        width: 100%;
        flex: 1 1 auto;
        min-height: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        
        /* Forced light theme CSS variables for PlayoffBracketView when printed/previewed */
        --bracket-primary: #3b82f6;
        --bracket-primary-soft: #eff6ff;
        --bracket-surface: #ffffff;
        --bracket-item: #f8fafc;
        --bracket-border: #e2e8f0;
        --bracket-muted: #64748b;

        section {
            border: none;
            background: transparent;
            box-shadow: none;
            padding: 0;
            margin: 0;
            overflow: visible !important;
        }
    }

    .bracket-page {
        padding: 12mm 10mm;
        display: flex;
        flex-direction: column;

        .page-header {
            margin-bottom: 8px;
            padding-bottom: 10px;
        }
    }
`;
