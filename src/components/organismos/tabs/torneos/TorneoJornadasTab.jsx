import React, { useState, useEffect, useEffectEvent, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import styled, { keyframes } from "styled-components";
import { JornadaPlanificacion } from "./JornadaPlanificacion"; 
import { JornadaResultados } from "./JornadaResultados";
import {
  actualizarConfigTorneoService,
  bulkInsertMatchesService,
  bulkUpdateJornadaFechas,
  bulkUpsertMatchesService,
  createJornadasService,
  deleteMatchesForFixtureRestoreService,
  desconfirmarJornadaService,
  getAllMatchesByTournament,
  getJornadas,
  getMatchesByIdsService,
  getMatchesByJornadaService,
  getTournamentConfigService,
  guardarJornadaService,
  resetMatchResultService,
  updateTournamentFixtureCriteriaService,
  updateTournamentFieldsService,
  updateMatchResultService,
} from "../../../../services/torneos";
import { addDaysToDate } from "../../../../utils/dateUtils";
import {
  buildScannedMatchTimestamp,
  persistedDateTimeKey,
} from "../../../../utils/scannedScheduleUtils";
import {
  isOfficialJornadaName,
  isRepositionJornadaName,
  parseJornadaNumber,
  resolveRepositionMappings,
  sortJornadas,
} from "../../../../utils/jornadaUtils";

import { JornadaPlanificacionSkeleton } from "./planificacion/Skeletons";
import { notify } from "../../../../lib/notifications/notify.js";

const FixturePreviewModal = dynamic(
  () =>
    import("./subcomponents/FixturePreviewModal").then(
      (module) => module.FixturePreviewModal
    ),
  { loading: () => null, ssr: false }
);

const NormalizeJornadaDatesModal = dynamic(
  () =>
    import("./planificacion/NormalizeJornadaDatesModal").then(
      (module) => module.NormalizeJornadaDatesModal
    ),
  { loading: () => null, ssr: false }
);

const getDateDurationDays = (startDate, endDate) => {
  if (!startDate || !endDate) return null;

  const start = new Date(`${startDate}T00:00:00`).getTime();
  const end = new Date(`${endDate}T00:00:00`).getTime();
  const diff = Math.round((end - start) / (1000 * 60 * 60 * 24));

  return Number.isNaN(diff) ? null : diff + 1;
};

const getDateTimeValue = (dateStr) => {
  if (!dateStr) return null;
  const value = new Date(`${dateStr}T00:00:00`).getTime();
  return Number.isNaN(value) ? null : value;
};

const getDaysBetweenDates = (startDate, nextStartDate) => {
  const start = getDateTimeValue(startDate);
  const next = getDateTimeValue(nextStartDate);
  if (start === null || next === null) return null;
  return Math.round((next - start) / (1000 * 60 * 60 * 24));
};

const getConfiguredJornadaDurationDays = (config) => {
  const parsed = parseInt(config?.jornadaDurationDays, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 7;
};

const hasValidJornadaCadence = (jornadas = [], jornadaDurationDays = 7) => {
  if (!Array.isArray(jornadas) || jornadas.length === 0) return false;

  const datedJornadas = sortJornadas(jornadas).filter(
    (jornada) => jornada?.start_date && jornada?.end_date
  );

  if (datedJornadas.length !== jornadas.length) return false;

  return datedJornadas.every((jornada, index) => {
    if (getDateDurationDays(jornada.start_date, jornada.end_date) !== jornadaDurationDays) {
      return false;
    }

    if (index === 0) return true;

    return getDaysBetweenDates(
      datedJornadas[index - 1].start_date,
      jornada.start_date
    ) === jornadaDurationDays;
  });
};

const isPendingMatch = (match) =>
  match?.status === "Pendiente" ||
  (match?.status === "Programado" && !match?.date);

const resolveGlobalPendingMatches = (matches = []) =>
  (matches || []).filter(isPendingMatch);

const hasScoreValue = (value) =>
  value !== null && value !== undefined && String(value).trim() !== "";

const hasMatchResult = (match) =>
  match?.status === "Finalizado" ||
  (hasScoreValue(match?.goals1) && hasScoreValue(match?.goals2));

const isPlayableMatch = (match) =>
  !match?.isByeMatch &&
  match?.team1_id != null &&
  match?.team2_id != null &&
  String(match.team1_id) !== "BYE" &&
  String(match.team2_id) !== "BYE";

const hasAllResultsForJornada = (jornadaId, matches) => {
  // Si los partidos no se pudieron cargar, mantenemos la última jornada
  // confirmada como opción segura en vez de avanzar sin validar resultados.
  if (!Array.isArray(matches)) return false;

  return matches
    .filter(
      (match) =>
        String(match?.jornada_id || match?.jornadas?.id || "") === String(jornadaId) &&
        isPlayableMatch(match) &&
        !isPendingMatch(match)
    )
    .every(hasMatchResult);
};

const clearPlanningDraftsForRounds = (tournamentId, jornadas = [], roundIndexes = []) => {
  if (typeof window === "undefined" || !tournamentId) return;

  const prefixes = new Set();
  roundIndexes.forEach((roundIndex) => {
    const jornada = jornadas[Number(roundIndex)];
    if (jornada?.id) {
      prefixes.add(`planning_draft_${tournamentId}_id_${jornada.id}`);
    }
    prefixes.add(`planning_draft_${tournamentId}_J${Number(roundIndex)}`);
  });

  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index);
    if (key && [...prefixes].some((prefix) => key.startsWith(`${prefix}_v`) || key === prefix)) {
      window.localStorage.removeItem(key);
    }
  }
};

const sortJornadasForDateNormalization = (jornadas = [], configuredMappings = []) => {
  const resolvedMappings = resolveRepositionMappings({
    jornadas,
    configuredMappings,
  });
  const repositionBeforeOfficial = new Map();

  resolvedMappings.forEach((mapping) => {
    if (!mapping?.repositionJornadaId || !mapping?.originalJornadaId) return;
    repositionBeforeOfficial.set(
      String(mapping.repositionJornadaId),
      String(mapping.originalJornadaId)
    );
  });

  const getOrderKey = (jornada) => {
    if (isOfficialJornadaName(jornada?.name)) {
      return parseJornadaNumber(jornada?.name, jornada?.id || Number.MAX_SAFE_INTEGER) * 10;
    }

    if (isRepositionJornadaName(jornada?.name)) {
      const originalJornadaId = repositionBeforeOfficial.get(String(jornada?.id));
      const originalJornada = originalJornadaId
        ? jornadas.find((candidate) => String(candidate?.id) === originalJornadaId)
        : null;

      if (originalJornada) {
        return parseJornadaNumber(
          originalJornada?.name,
          originalJornada?.id || Number.MAX_SAFE_INTEGER
        ) * 10 - 1;
      }
    }

    return Number.MAX_SAFE_INTEGER;
  };

  return [...jornadas].sort((a, b) => {
    const keyA = getOrderKey(a);
    const keyB = getOrderKey(b);
    if (keyA !== keyB) return keyA - keyB;

    const officialA = isOfficialJornadaName(a?.name);
    const officialB = isOfficialJornadaName(b?.name);

    if (officialA && officialB) {
      const numA = parseJornadaNumber(a?.name, a?.id || Number.MAX_SAFE_INTEGER);
      const numB = parseJornadaNumber(b?.name, b?.id || Number.MAX_SAFE_INTEGER);
      if (numA !== numB) return numA - numB;
      return (a?.id || 0) - (b?.id || 0);
    }

    if (officialA) return -1;
    if (officialB) return 1;

    const startA = a?.start_date || "9999-12-31";
    const startB = b?.start_date || "9999-12-31";
    if (startA !== startB) return startA.localeCompare(startB);

    const numA = parseJornadaNumber(a?.name, a?.id || Number.MAX_SAFE_INTEGER);
    const numB = parseJornadaNumber(b?.name, b?.id || Number.MAX_SAFE_INTEGER);
    if (numA !== numB) return numA - numB;

    return (a?.id || 0) - (b?.id || 0);
  });
};

const buildSevenDayPreview = (
  jornadas = [],
  fallbackStartDate = "",
  configuredMappings = [],
  jornadaDurationDays = 7
) => {
  const isCurrentCalendarValid = hasValidJornadaCadence(jornadas, jornadaDurationDays);
  const sorted = isCurrentCalendarValid
    ? sortJornadas(jornadas)
    : sortJornadasForDateNormalization(jornadas, configuredMappings);
  const anchorStartDate =
    sorted[0]?.start_date ||
    fallbackStartDate ||
    "";

  if (!anchorStartDate) {
    return {
      anchorStartDate: "",
      rows: [],
      needsAdjustment: false,
      irregularCount: 0,
    };
  }

  const rows = sorted.map((jornada, index) => {
    const nextStartDate =
      index === 0 ? anchorStartDate : addDaysToDate(anchorStartDate, index * jornadaDurationDays);
    const nextEndDate = addDaysToDate(nextStartDate, jornadaDurationDays - 1);
    const currentDuration = getDateDurationDays(
      jornada?.start_date,
      jornada?.end_date
    );
    const changed =
      !isCurrentCalendarValid &&
      (String(jornada?.start_date || "") !== String(nextStartDate) ||
        String(jornada?.end_date || "") !== String(nextEndDate));
    const hasInvalidDuration = currentDuration !== jornadaDurationDays;

    return {
      ...jornada,
      currentDuration,
      nextStartDate,
      nextEndDate,
      changed,
      hasInvalidDuration,
    };
  });

  return {
    anchorStartDate,
    rows,
    needsAdjustment:
      !isCurrentCalendarValid &&
      rows.some((row) => row.changed || row.hasInvalidDuration),
    irregularCount: isCurrentCalendarValid
      ? 0
      : rows.filter((row) => row.changed || row.hasInvalidDuration).length,
  };
};

const getDatePart = (dateValue) => {
  if (!dateValue) return "";
  return String(dateValue).split("T")[0].split(" ")[0];
};

const getTimePart = (dateValue) => {
  if (!dateValue) return "10:00:00";

  const raw = String(dateValue);
  const timePart = raw.includes("T")
    ? raw.split("T")[1]
    : raw.includes(" ")
      ? raw.split(" ")[1]
      : "";
  const cleanTime = String(timePart || "").split(".")[0].replace("Z", "");

  if (!cleanTime) return "10:00:00";
  if (/^\d{2}:\d{2}$/.test(cleanTime)) return `${cleanTime}:00`;
  if (/^\d{2}:\d{2}:\d{2}$/.test(cleanTime)) return cleanTime;
  return "10:00:00";
};

const getWeekdayIndex = (dateStr) => {
  if (!dateStr) return 0;
  const [year, month, day] = String(dateStr).split("-").map(Number);
  return new Date(year, month - 1, day).getDay();
};

const buildMatchWeekPreview = ({
  matches = [],
  jornadas = [],
  repositionMatchMappings = [],
  teams = [],
}) => {
  const jornadaMap = new Map(
    (jornadas || []).map((jornada) => [String(jornada.id), jornada])
  );
  const teamMap = new Map((teams || []).map((team) => [String(team.id), team]));
  const repositionMatchIds = new Set(
    (repositionMatchMappings || [])
      .map((mapping) => mapping?.matchId)
      .filter(Boolean)
      .map((matchId) => String(matchId))
  );

  const rows = (matches || [])
    .filter((match) => match?.id && match?.date)
    .map((match) => {
      const jornada =
        jornadaMap.get(String(match.jornada_id)) ||
        jornadaMap.get(String(match.jornadas?.id)) ||
        null;

      if (!jornada?.start_date || !jornada?.end_date) return null;
      if (repositionMatchIds.has(String(match.id))) return null;

      const currentDate = getDatePart(match.date);
      if (!currentDate) return null;

      const isInsideJornada =
        currentDate >= String(jornada.start_date) &&
        currentDate <= String(jornada.end_date);
      if (isInsideJornada) return null;

      const jornadaStartWeekday = getWeekdayIndex(jornada.start_date);
      const matchWeekday = getWeekdayIndex(currentDate);
      const dayOffset = (matchWeekday - jornadaStartWeekday + 7) % 7;
      const nextDate = addDaysToDate(jornada.start_date, dayOffset);
      const nextDateTime = `${nextDate} ${getTimePart(match.date)}`;
      const homeTeam = teamMap.get(String(match.team1_id));
      const awayTeam = teamMap.get(String(match.team2_id));

      return {
        ...match,
        jornada,
        currentDate,
        currentDateTime: match.date,
        nextDate,
        nextDateTime,
        homeName: homeTeam?.name || match.team1?.name || "Local",
        awayName: awayTeam?.name || match.team2?.name || "Visitante",
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const jornadaA = parseJornadaNumber(a.jornada?.name, Number.MAX_SAFE_INTEGER);
      const jornadaB = parseJornadaNumber(b.jornada?.name, Number.MAX_SAFE_INTEGER);
      if (jornadaA !== jornadaB) return jornadaA - jornadaB;
      return String(a.currentDate).localeCompare(String(b.currentDate));
    });

  return {
    rows,
    needsAdjustment: rows.length > 0,
    irregularCount: rows.length,
  };
};

export function TorneoJornadasTab({
  activeTournament: initialTournament,
  buildJornadaPath,
  navigate,
  pathname = "/torneos/jornadas",
  participatingTeams,
  refreshStandings,
  divisionName = "",
  routeJornadaId,
}) {
  const [activeTournament, setActiveTournament] = useState(initialTournament);
  const [jornadas, setJornadas] = useState([]);
  const [repositionMappings, setRepositionMappings] = useState([]);
  const [repositionMatchMappings, setRepositionMatchMappings] = useState([]);
  const [currentJornadaIndex, setCurrentJornadaIndex] = useState(0);
  const [currentMatches, setCurrentMatches] = useState([]); 
  const [currentMatchesJornadaId, setCurrentMatchesJornadaId] = useState(null);
  const [allTournamentMatches, setAllTournamentMatches] = useState([]);
  const [globalPendingMatches, setGlobalPendingMatches] = useState([]); 
  const [loading, setLoading] = useState(false);
  
  const [dataVersion, setDataVersion] = useState(0);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isDateNormalizerOpen, setIsDateNormalizerOpen] = useState(false);
  const [editorData, setEditorData] = useState(null); 
  const currentJornadaMatchesRequestRef = useRef(0);
  const routeJornadaMatchesRequestRef = useRef(0);
  const tournamentDataLoadRef = useRef({ tournamentId: null, promise: null });

  const tournamentConfig = useMemo(() => {
    if (!activeTournament?.config) return {};
    if (typeof activeTournament.config === "string") {
      try {
        return JSON.parse(activeTournament.config) || {};
      } catch {
        return {};
      }
    }
    return activeTournament.config || {};
  }, [activeTournament?.config]);
  const jornadaDurationDays = getConfiguredJornadaDurationDays(tournamentConfig);

  useEffect(() => {
    setActiveTournament(initialTournament);
  }, [initialTournament]);

  const syncJornadaPath = useCallback(
    (jornadaId, options = {}) => {
      if (
        !jornadaId ||
        !pathname.includes("/jornadas") ||
        typeof buildJornadaPath !== "function" ||
        typeof navigate !== "function"
      ) {
        return;
      }

      const nextPath = buildJornadaPath(jornadaId);
      if (nextPath !== pathname.replace(/\/+$/, "")) {
        navigate(nextPath, options);
      }
    },
    [buildJornadaPath, navigate, pathname]
  );

  const resolveSelectedJornada = useCallback((
    sortedJornadas = [],
    preferredJornadaId = null,
    tournamentMatches = null
  ) => {
    if (!Array.isArray(sortedJornadas) || sortedJornadas.length === 0) {
      return { selectedIndex: 0, selectedJornada: null };
    }

    if (preferredJornadaId) {
      const preferredIndex = sortedJornadas.findIndex(
        (jornada) => String(jornada.id) === String(preferredJornadaId)
      );
      if (preferredIndex !== -1) {
        return {
          selectedIndex: preferredIndex,
          selectedJornada: sortedJornadas[preferredIndex],
        };
      }
    }

    const currentVisibleJornadaId = jornadas[currentJornadaIndex]?.id || null;
    if (currentVisibleJornadaId) {
      const currentIndex = sortedJornadas.findIndex(
        (jornada) => String(jornada.id) === String(currentVisibleJornadaId)
      );
      if (currentIndex !== -1) {
        return {
          selectedIndex: currentIndex,
          selectedJornada: sortedJornadas[currentIndex],
        };
      }
    }

    const currentCandidate = sortedJornadas[currentJornadaIndex] || null;
    if (
      currentCandidate &&
      currentCandidate.status !== 'Finalizada' &&
      currentCandidate.status !== 'Confirmada'
    ) {
      return {
        selectedIndex: currentJornadaIndex,
        selectedJornada: currentCandidate,
      };
    }

    const lastConfirmedIndex = sortedJornadas.reduce(
      (lastIndex, jornada, index) =>
        ['Confirmada', 'Finalizada'].includes(jornada?.status) ? index : lastIndex,
      -1
    );

    if (lastConfirmedIndex !== -1) {
      const lastConfirmedJornada = sortedJornadas[lastConfirmedIndex];
      const nextJornadaIndex = lastConfirmedIndex + 1;
      const canOpenNextJornada =
        nextJornadaIndex < sortedJornadas.length &&
        hasAllResultsForJornada(lastConfirmedJornada.id, tournamentMatches);
      const selectedIndex = canOpenNextJornada
        ? nextJornadaIndex
        : lastConfirmedIndex;

      return {
        selectedIndex,
        selectedJornada: sortedJornadas[selectedIndex],
      };
    }

    const activeIndex = sortedJornadas.findIndex(
      (jornada) => jornada.status !== 'Finalizada' && jornada.status !== 'Confirmada'
    );
    const selectedIndex = activeIndex !== -1 ? activeIndex : sortedJornadas.length - 1;

    return {
      selectedIndex,
      selectedJornada: sortedJornadas[selectedIndex] || null,
    };
  }, [currentJornadaIndex, jornadas]);

  const handleChangeJornada = async (newIndex) => {
      const targetJornada = jornadas[newIndex];
      if (!targetJornada?.id) return;

      setCurrentMatches([]); 
      setCurrentMatchesJornadaId(null);
      setLoading(true);
      setCurrentJornadaIndex(newIndex);
      syncJornadaPath(targetJornada.id);

      try {
        await fetchCurrentJornadaMatches(
          targetJornada.id,
          jornadas,
          repositionMappings,
          repositionMatchMappings,
          { matchesSource: allTournamentMatches }
        );
      } finally {
        setLoading(false);
      }
  };

  const loadTournamentData = async ({ preserveData = false } = {}) => {
      setLoading(true);
      if (!preserveData) {
        setJornadas([]);
        setCurrentMatches([]);
        setCurrentMatchesJornadaId(null);
        setAllTournamentMatches([]);
        setGlobalPendingMatches([]);
      }

      try {
        const [updatedMappings, tournamentMatches] = await Promise.all([
          fetchTournamentConfig(),
          fetchAllTournamentMatches(),
        ]);
        const jornadasResult = await fetchJornadas(
          routeJornadaId,
          tournamentMatches
        );
        const sortedJornadas = jornadasResult?.jornadas || [];
        const selectedJornada = jornadasResult?.selectedJornada || null;

        if (selectedJornada?.id) {
          await fetchCurrentJornadaMatches(
            selectedJornada.id,
            sortedJornadas,
            updatedMappings?.jornadaMappings || [],
            updatedMappings?.matchMappings || [],
            { matchesSource: tournamentMatches }
          );
        }
      } finally {
        setLoading(false);
      }
  };

  const fetchAllTournamentMatches = async ({
    preserveOnError = false,
    throwOnError = false,
  } = {}) => {
      try {
          const data = await getAllMatchesByTournament(activeTournament.id);
          const matches = data || [];
          setAllTournamentMatches(matches);
          setGlobalPendingMatches(resolveGlobalPendingMatches(matches));
          return matches;
      } catch (error) {
          console.error("Error fetchAllTournamentMatches:", error);
          if (!preserveOnError) {
            setAllTournamentMatches([]);
            setGlobalPendingMatches([]);
          }
          if (throwOnError) throw error;
          return null;
      }
  };

  const fetchTournamentConfig = async () => {
    try {
      const nextConfig = await getTournamentConfigService(activeTournament.id);

      const nextMappings = Array.isArray(nextConfig.repositionMappings)
        ? nextConfig.repositionMappings
        : [];
      const nextMatchMappings = Array.isArray(nextConfig.repositionMatchMappings)
        ? nextConfig.repositionMatchMappings
        : [];

      setRepositionMappings(nextMappings);
      setRepositionMatchMappings(nextMatchMappings);

      setActiveTournament((prev) => ({
        ...prev,
        config: {
          ...(prev?.config || {}),
          ...nextConfig,
        },
      }));

      return {
        jornadaMappings: nextMappings,
        matchMappings: nextMatchMappings,
      };
    } catch (error) {
      console.error("Error fetchTournamentConfig:", error);
      setRepositionMappings([]);
      setRepositionMatchMappings([]);
      return {
        jornadaMappings: [],
        matchMappings: [],
      };
    }
  };

  const fetchJornadas = async (
    preferredJornadaId = null,
    tournamentMatches = null
  ) => {
    try {
      const data = await getJornadas(activeTournament.id);
      const sorted = sortJornadas(data);
      setJornadas(sorted);

      const { selectedIndex, selectedJornada } = resolveSelectedJornada(
        sorted,
        preferredJornadaId,
        tournamentMatches
      );
      setCurrentJornadaIndex(selectedIndex);

      return {
        jornadas: sorted,
        selectedIndex,
        selectedJornada,
      };
    } catch (error) { console.error("Error fetchJornadas:", error); }
  };

  const fetchCurrentJornadaMatches = async (
    jornadaId,
    jornadasSource = jornadas,
    mappingsSource = repositionMappings,
    matchMappingsSource = repositionMatchMappings,
    {
      preserveOnError = false,
      throwOnError = false,
      matchesSource = null,
    } = {}
  ) => {
    const requestId = currentJornadaMatchesRequestRef.current + 1;
    currentJornadaMatchesRequestRef.current = requestId;

    try {
      const selectedJornada =
        (jornadasSource || []).find((jornada) => String(jornada.id) === String(jornadaId)) ||
        null;
      const resolvedJornadaMappings = resolveRepositionMappings({
        jornadas: jornadasSource,
        configuredMappings: mappingsSource,
      });
      const normalizedMatchMappings = Array.isArray(matchMappingsSource)
        ? matchMappingsSource
        : [];

      const canReuseTournamentMatches = Array.isArray(matchesSource);
      const directMatches = canReuseTournamentMatches
        ? matchesSource.filter(
            (match) => String(match?.jornada_id) === String(jornadaId)
          )
        : await getMatchesByJornadaService(jornadaId);

      const extraMatchIds = normalizedMatchMappings
        .filter((mapping) => String(mapping?.originalJornadaId) === String(jornadaId))
        .map((mapping) => mapping.matchId)
        .filter(Boolean);
      const sourceExtraMatches = canReuseTournamentMatches
        ? matchesSource.filter((match) =>
            extraMatchIds.some((matchId) => String(matchId) === String(match?.id))
          )
        : [];
      const missingExtraMatchIds = canReuseTournamentMatches
        ? extraMatchIds.filter(
            (matchId) =>
              !sourceExtraMatches.some(
                (match) => String(match?.id) === String(matchId)
              )
          )
        : extraMatchIds;
      const fetchedExtraMatches = await getMatchesByIdsService(missingExtraMatchIds);
      const extraMatches = [...sourceExtraMatches, ...fetchedExtraMatches];

      const mergedMatches = [...directMatches];
      extraMatches.forEach((match) => {
        if (!mergedMatches.some((current) => String(current.id) === String(match.id))) {
          mergedMatches.push(match);
        }
      });

      const enhancedMatches = mergedMatches.map((match) => {
        const matchMapping = normalizedMatchMappings.find(
          (mapping) => String(mapping?.matchId) === String(match.id)
        );

        if (matchMapping && String(matchMapping.originalJornadaId) === String(jornadaId)) {
          return {
            ...match,
            originJornada: matchMapping.originalJornadaName || selectedJornada?.name || "",
            originJornadaId: matchMapping.originalJornadaId || null,
            playedInJornada:
              matchMapping.repositionJornadaName || match.jornadas?.name || "",
            isReferenceOnly: String(match.jornada_id) !== String(jornadaId),
          };
        }

        if (matchMapping && String(matchMapping.repositionJornadaId) === String(jornadaId)) {
          return {
            ...match,
            originJornada: matchMapping.originalJornadaName || "",
            originJornadaId: matchMapping.originalJornadaId || null,
            isRepositionScheduled: true,
          };
        }

        const fallbackJornadaMapping = resolvedJornadaMappings.find(
          (mapping) => String(mapping?.repositionJornadaId) === String(match.jornada_id)
        );

        if (
          fallbackJornadaMapping &&
          String(fallbackJornadaMapping.repositionJornadaId) === String(jornadaId)
        ) {
          return {
            ...match,
            originJornada: fallbackJornadaMapping.originalJornadaName || "",
            originJornadaId: fallbackJornadaMapping.originalJornadaId || null,
            isRepositionScheduled: true,
          };
        }

        return match;
      });

      if (requestId === currentJornadaMatchesRequestRef.current) {
        setCurrentMatches(enhancedMatches);
        setCurrentMatchesJornadaId(jornadaId);
      }

      return enhancedMatches;
    } catch (e) { 
        console.error(e);
        if (!preserveOnError && requestId === currentJornadaMatchesRequestRef.current) {
          setCurrentMatches([]);
          setCurrentMatchesJornadaId(null);
        }
        if (throwOnError) throw e;
        return [];
    }
  };

  const loadTournamentDataEvent = useEffectEvent(() => {
    const tournamentId = activeTournament?.id;
    const currentLoad = tournamentDataLoadRef.current;

    if (
      currentLoad.promise &&
      String(currentLoad.tournamentId) === String(tournamentId)
    ) {
      return currentLoad.promise;
    }

    const promise = loadTournamentData().finally(() => {
      if (tournamentDataLoadRef.current.promise === promise) {
        tournamentDataLoadRef.current = { tournamentId: null, promise: null };
      }
    });

    tournamentDataLoadRef.current = { tournamentId, promise };
    return promise;
  });
  const fetchCurrentJornadaMatchesEvent = useEffectEvent(
    fetchCurrentJornadaMatches
  );

  useEffect(() => {
    if (activeTournament?.id) {
      loadTournamentDataEvent();
    }
  }, [activeTournament?.id]);

  const handleOpenFixtureEditor = async () => {
      setLoading(true);
      try {
          const allMatches = await getAllMatchesByTournament(activeTournament.id);

          setEditorData({
              matches: allMatches,
              jornadas: jornadas,
              pendingMatches: globalPendingMatches,
              repositionMappings,
              repositionMatchMappings,
          });
          setIsEditorOpen(true);

      } catch (error) {
          notify.error("Error cargando fixture: " + error.message);
      } finally {
          setLoading(false);
      }
  };

  const handleSaveFixtureCriteria = useCallback(async (fixtureCriteria) => {
    if (!activeTournament?.id) return null;

    try {
      const nextConfig = await updateTournamentFixtureCriteriaService(
        activeTournament.id,
        fixtureCriteria,
      );

      setActiveTournament((previous) => ({
        ...previous,
        config: nextConfig,
      }));
      notify.success('Criterios del fixture guardados para el torneo.');
      return nextConfig.fixtureCriteria;
    } catch (error) {
      notify.error(`No se pudieron guardar los criterios: ${error.message}`);
      throw error;
    }
  }, [activeTournament?.id]);

  const handleConfirmFixtureUpdate = async (
    updatedMatches,
    { deletedMatchIds = [] } = {},
  ) => {
      setLoading(true);
      let completionToast = null;
      try {
        const invalidScheduledMatch = updatedMatches.find(
          (match) => match.scanScheduleAccepted && !buildScannedMatchTimestamp(match)
        );
        if (invalidScheduledMatch) {
          throw new Error(
            `El horario de ${invalidScheduledMatch.local?.name || "un partido"} está incompleto. Revísalo antes de guardar.`
          );
        }

        const hasAcceptedScannedSchedules = updatedMatches.some(
          (match) => match.scanScheduleAccepted && buildScannedMatchTimestamp(match)
        );
        const scannedRoundIndexes = [
          ...new Set(
            updatedMatches
              .filter(
                (match) =>
                  match.scanScheduleAccepted && buildScannedMatchTimestamp(match)
              )
              .map((match) => Number(match.jornadaIndex))
              .filter(Number.isFinite)
          ),
        ];
        const originalMap = new Map(editorData.matches.map(m => [m.id, m]));
        const editableOfficialJornadaIds = jornadas
          .filter((jornada) =>
            isOfficialJornadaName(jornada?.name) &&
            !['Confirmada', 'Finalizada'].includes(jornada?.status)
          )
          .map((jornada) => jornada.id);
        const restoredDeletedMatchIds = [
          ...new Map(
            (deletedMatchIds || [])
              .filter((id) => id !== null && id !== undefined)
              .map((id) => [String(id), id])
          ).values(),
        ];
        const generatedRoundIndexes = [...new Set(
          updatedMatches
            .filter((match) => match.isGeneratedRound)
            .map((match) => Number(match.jornadaIndex))
        )].sort((a, b) => a - b);

        const generatedRoundIdMap = new Map();
        const generatedRoundMetaMap = new Map();

        if (generatedRoundIndexes.length > 0) {
            const lastJornada = jornadas[jornadas.length - 1] || null;
            const nextStartDate = lastJornada?.end_date
              ? addDaysToDate(lastJornada.end_date, 1)
              : lastJornada?.start_date
                ? addDaysToDate(lastJornada.start_date, jornadaDurationDays)
                : activeTournament?.start_date
                  ? addDaysToDate(activeTournament.start_date, jornadas.length * jornadaDurationDays)
                  : null;

            const jornadasToCreate = generatedRoundIndexes.map((roundIndex, offset) => {
              const roundMatches = updatedMatches.filter(
                (match) => Number(match.jornadaIndex) === roundIndex
              );
              const roundName =
                roundMatches[0]?.roundName ||
                `Jornada ${roundIndex + 1}`;
              const startDate = nextStartDate
                ? (offset === 0 ? nextStartDate : addDaysToDate(nextStartDate, offset * jornadaDurationDays))
                : null;
              const endDate = startDate ? addDaysToDate(startDate, jornadaDurationDays - 1) : null;

              return {
                tournament_id: activeTournament.id,
                name: roundName,
                status: 'Pendiente',
                start_date: startDate,
                end_date: endDate,
              };
            });

            const createdJornadas = await createJornadasService(jornadasToCreate);
            jornadasToCreate.forEach((jornadaToCreate, index) => {
              const createdJornada = createdJornadas.find(
                (jornada) => jornada.name === jornadaToCreate.name
              );
              if (createdJornada?.id) {
                const roundIndex = generatedRoundIndexes[index];
                generatedRoundIdMap.set(roundIndex, createdJornada.id);
                generatedRoundMetaMap.set(roundIndex, {
                  id: createdJornada.id,
                  name: createdJornada.name,
                  roundType: updatedMatches.find(
                    (match) => Number(match.jornadaIndex) === roundIndex
                  )?.roundType || "extra",
                });
              }
            });
        }

        const updates = [];
        const inserts = [];

        updatedMatches.forEach(m => {
            if (m.roundLocked) {
                return;
            }

            const targetJornadaId =
              generatedRoundIdMap.get(Number(m.jornadaIndex)) ||
              jornadas[m.jornadaIndex]?.id;
            const team1Id =
              m.local?.id && m.local.id !== 'BYE' ? Number(m.local.id) : null;
            const team2Id =
              m.visitante?.id && m.visitante.id !== 'BYE' ? Number(m.visitante.id) : null;

            if (!targetJornadaId || !team1Id) {
              return;
            }

            const scannedTimestamp = m.scanScheduleAccepted
              ? buildScannedMatchTimestamp(m)
              : null;
            const shouldApplyScannedSchedule = Boolean(scannedTimestamp);
            const shouldClearScannedSchedule = m.scanScheduleAction === "clear";
            const original = m.dbId ? originalMap.get(m.dbId) : null;

            const payload = {
              jornada_id: targetJornadaId,
              team1_id: team1Id,
              team2_id: team2Id,
              date: shouldApplyScannedSchedule
                ? scannedTimestamp
                : shouldClearScannedSchedule
                  ? null
                  : original?.date || null,
              status: shouldApplyScannedSchedule
                ? 'Programado'
                : shouldClearScannedSchedule
                  ? 'Pendiente'
                  : original?.status || 'Pendiente',
            };

            if (!m.dbId) {
              // Un partido agregado desde el editor de texto no tiene dbId.
              // Tambien puede pertenecer a una jornada existente (por ejemplo,
              // cuando se recupera un partido que fue borrado accidentalmente),
              // asi que no debemos limitar los inserts a jornadas generadas.
              inserts.push(payload);
              return;
            }

            if (!original) return;

            const jornadaChanged = String(original.jornada_id) !== String(targetJornadaId);
            const team1Changed = String(original.team1_id ?? '') !== String(team1Id ?? '');
            const team2Changed = String(original.team2_id ?? '') !== String(team2Id ?? '');
            const scheduleChanged = shouldApplyScannedSchedule
              ? persistedDateTimeKey(original.date) !== scannedTimestamp || original.status !== 'Programado'
              : shouldClearScannedSchedule
                ? Boolean(original.date) || original.status !== 'Pendiente'
                : false;

            if (
              jornadaChanged ||
              team1Changed ||
              team2Changed ||
              scheduleChanged
            ) {
              updates.push({
                id: m.dbId,
                ...payload,
              });
            }
        });

        const generatedRepositionRounds = [...generatedRoundMetaMap.entries()]
          .filter(([, meta]) => meta.roundType === "reposition")
          .map(([roundIndex, meta]) => ({
            roundIndex,
            ...meta,
          }));

        if (generatedRepositionRounds.length > 0) {
          const currentConfig = await getTournamentConfigService(activeTournament.id);
          const previousMappings = Array.isArray(currentConfig.repositionMappings)
            ? currentConfig.repositionMappings
            : [];
          const previousMatchMappings = Array.isArray(currentConfig.repositionMatchMappings)
            ? currentConfig.repositionMatchMappings
            : [];

          const nextMappings = [...previousMappings];
          const nextMatchMappings = [...previousMatchMappings];

          generatedRepositionRounds.forEach((roundMeta) => {
            const roundMatches = updatedMatches.filter(
              (match) =>
                Number(match.jornadaIndex) === Number(roundMeta.roundIndex) &&
                match.roundType === "reposition"
            );
            const firstOriginMatch = roundMatches.find(
              (match) => match.originalJornadaId || match.originalJornadaName
            );

            if (firstOriginMatch) {
              nextMappings.push({
                repositionJornadaId: roundMeta.id,
                repositionJornadaName: roundMeta.name,
                originalJornadaId: firstOriginMatch.originalJornadaId || null,
                originalJornadaName: firstOriginMatch.originalJornadaName || "",
              });
            }

            roundMatches.forEach((match) => {
              if (!match.dbId) return;
              nextMatchMappings.push({
                matchId: match.dbId,
                repositionJornadaId: roundMeta.id,
                repositionJornadaName: roundMeta.name,
                originalJornadaId: match.originalJornadaId || null,
                originalJornadaName: match.originalJornadaName || "",
              });
            });
          });

          const dedupedMappings = [...nextMappings].reduce((acc, mapping) => {
            acc.set(String(mapping.repositionJornadaId), mapping);
            return acc;
          }, new Map());

          const dedupedMatchMappings = [...nextMatchMappings].reduce((acc, mapping) => {
            acc.set(String(mapping.matchId), mapping);
            return acc;
          }, new Map());

          await updateTournamentFieldsService(activeTournament.id, {
            config: {
              ...currentConfig,
              repositionMappings: Array.from(dedupedMappings.values()),
              repositionMatchMappings: Array.from(dedupedMatchMappings.values()),
            },
          });
        }

        if (
          updates.length > 0 ||
          inserts.length > 0 ||
          restoredDeletedMatchIds.length > 0 ||
          hasAcceptedScannedSchedules
        ) {
            if (updates.length > 0) {
              await bulkUpsertMatchesService(updates);
            }

            if (inserts.length > 0) {
              await bulkInsertMatchesService(inserts);
            }

            if (restoredDeletedMatchIds.length > 0) {
              await deleteMatchesForFixtureRestoreService(
                restoredDeletedMatchIds,
                editableOfficialJornadaIds,
              );
            }

            completionToast = {
              type: 'success',
              message: generatedRoundIndexes.length > 0
                ? "Nueva jornada generada y guardada correctamente."
                : restoredDeletedMatchIds.length > 0
                  ? "Fixture restaurado y partidos excedentes eliminados correctamente."
                  : hasAcceptedScannedSchedules
                    ? "Fixture y horarios escaneados guardados correctamente."
                    : "Fixture reorganizado correctamente.",
            };

            await loadTournamentData({ preserveData: true });

            if (hasAcceptedScannedSchedules) {
              clearPlanningDraftsForRounds(
                activeTournament.id,
                jornadas,
                scannedRoundIndexes,
              );
            }

            setDataVersion(prev => prev + 1);
            
        } else {
            completionToast = {
              type: 'warning',
              message: generatedRoundIndexes.length > 0
                ? "La jornada se creo, pero no hubo partidos validos para guardar."
                : "No se detectaron cambios de jornada.",
            };
        }

        await new Promise((resolve) => setTimeout(resolve, 180));
        setIsEditorOpen(false);
        await new Promise((resolve) => setTimeout(resolve, 0));

        if (completionToast?.type === 'success') {
          notify.success(completionToast.message);
        } else if (completionToast?.type === 'warning') {
          notify.warning(completionToast.message);
        }

      } catch (error) {
          notify.error("Error guardando cambios: " + error.message);
      } finally {
          setLoading(false);
      }
  };

  const handleCascadingDateUpdate = async (newStart, newEnd) => {
      setLoading(true);
      try {
          const currentJornada = jornadas[currentJornadaIndex];
          
          let daysDiff = 0;
          if (currentJornada.start_date && newStart) {
              const oldDate = new Date(currentJornada.start_date);
              const newDate = new Date(newStart);
              const diffTime = newDate - oldDate;
              daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
          }

          const updates = [];

          updates.push({
              id: currentJornada.id,
              tournament_id: activeTournament.id, 
              name: currentJornada.name,
              status: currentJornada.status,
              start_date: newStart,
              end_date: newEnd
          });

          if (daysDiff !== 0) {
              for (let i = currentJornadaIndex + 1; i < jornadas.length; i++) {
                  const j = jornadas[i];
                  if (j.start_date && j.end_date) {
                      updates.push({
                          id: j.id,
                          tournament_id: activeTournament.id,
                          name: j.name,
                          status: j.status,
                          start_date: addDaysToDate(j.start_date, daysDiff),
                          end_date: addDaysToDate(j.end_date, daysDiff)
                      });
                  }
              }
          }

          await bulkUpdateJornadaFechas(updates);

          const successMessage =
            currentJornada.status === 'Confirmada'
              ? `Cambio confirmado. La fecha de fin se ajusto a ${jornadaDurationDays} dias.`
              : `Fechas actualizadas. Se recorrieron ${updates.length - 1} jornadas futuras.`;
          notify.success(successMessage);
          await fetchJornadas(); 
          
      } catch (error) {
          console.error(error);
          notify.error("Error actualizando fechas: " + error.message);
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
    const selectedJornadaId = jornadas[currentJornadaIndex]?.id || null;
    if (!activeTournament?.id || !selectedJornadaId) return;
    if (String(routeJornadaId || "") === String(selectedJornadaId)) return;

    const routePointsToKnownJornada =
      routeJornadaId &&
      jornadas.some((jornada) => String(jornada.id) === String(routeJornadaId));
    if (routePointsToKnownJornada) return;

    syncJornadaPath(selectedJornadaId, { replace: true });
  }, [
    activeTournament?.id,
    currentJornadaIndex,
    jornadas,
    routeJornadaId,
    syncJornadaPath,
  ]);

  const sevenDayPreview = useMemo(
    () =>
      buildSevenDayPreview(
        jornadas,
        activeTournament?.start_date || "",
        repositionMappings,
        jornadaDurationDays
      ),
    [activeTournament?.start_date, jornadaDurationDays, jornadas, repositionMappings]
  );

  const matchWeekPreview = useMemo(
    () =>
      buildMatchWeekPreview({
        matches: allTournamentMatches,
        jornadas,
        repositionMatchMappings,
        teams: participatingTeams,
      }),
    [allTournamentMatches, jornadas, participatingTeams, repositionMatchMappings]
  );

  const handleNormalizeJornadaDates = async () => {
    if (!sevenDayPreview.rows.length) return;

    setLoading(true);
    try {
      const preservedJornadaId = jornadas[currentJornadaIndex]?.id || null;
      const updates = sevenDayPreview.rows.map((jornada) => ({
        id: jornada.id,
        tournament_id: activeTournament.id,
        name: jornada.name,
        status: jornada.status,
        start_date: jornada.nextStartDate,
        end_date: jornada.nextEndDate,
      }));

      await bulkUpdateJornadaFechas(updates);
      setIsDateNormalizerOpen(false);
      notify.success(
        `Calendario ajustado. Todas las jornadas duran ${jornadaDurationDays} dias.`,
      );

      const updatedJornadasResult = await fetchJornadas(preservedJornadaId);
      const selectedJornada = updatedJornadasResult?.selectedJornada || null;
      if (selectedJornada?.id) {
        await fetchCurrentJornadaMatches(
          selectedJornada.id,
          updatedJornadasResult.jornadas,
          repositionMappings,
          repositionMatchMappings,
          { matchesSource: allTournamentMatches }
        );
      }
    } catch (error) {
      console.error(error);
      notify.error("Error ajustando calendario: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!activeTournament?.id || !routeJornadaId || jornadas.length === 0) return;

    const targetIndex = jornadas.findIndex(
      (jornada) => String(jornada.id) === String(routeJornadaId)
    );
    if (targetIndex === -1 || targetIndex === currentJornadaIndex) return;

    const targetJornada = jornadas[targetIndex];
    const requestId = routeJornadaMatchesRequestRef.current + 1;
    routeJornadaMatchesRequestRef.current = requestId;

    setCurrentMatches([]);
    setCurrentMatchesJornadaId(null);
    setLoading(true);
    setCurrentJornadaIndex(targetIndex);

    fetchCurrentJornadaMatchesEvent(
      targetJornada.id,
      jornadas,
      repositionMappings,
      repositionMatchMappings,
      { matchesSource: allTournamentMatches }
    ).finally(() => {
      if (requestId === routeJornadaMatchesRequestRef.current) {
        setLoading(false);
      }
    });
  }, [
    activeTournament?.id,
    allTournamentMatches,
    currentJornadaIndex,
    jornadas,
    repositionMappings,
    repositionMatchMappings,
    routeJornadaId,
  ]);

  const handleNormalizeMatchDates = async () => {
    if (!matchWeekPreview.rows.length) return;

    setLoading(true);
    try {
      const updates = matchWeekPreview.rows.map((match) => {
        const payload = {
          id: Number(match.id),
          jornada_id: match.jornada_id,
          team1_id: match.team1_id,
          team2_id: match.team2_id || null,
          status: match.status || "Programado",
          date: match.nextDateTime,
        };

        if (match.goals1 !== undefined) payload.goals1 = match.goals1;
        if (match.goals2 !== undefined) payload.goals2 = match.goals2;
        if (match.observations !== undefined) payload.observations = match.observations;

        return payload;
      });

      await bulkUpsertMatchesService(updates);
      setIsDateNormalizerOpen(false);
      notify.success(
        `Partidos ajustados a la semana de su jornada: ${updates.length}.`,
      );

      const tournamentMatches = await fetchAllTournamentMatches();
      if (jornadas[currentJornadaIndex]?.id) {
        await fetchCurrentJornadaMatches(
          jornadas[currentJornadaIndex].id,
          jornadas,
          repositionMappings,
          repositionMatchMappings,
          { matchesSource: tournamentMatches }
        );
      }
      setDataVersion((prev) => prev + 1);
    } catch (error) {
      console.error(error);
      notify.error("Error ajustando partidos: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmJornada = async (dataToSave) => {
    setLoading(true);
    try {
        const preservedJornadaId = jornadas[currentJornadaIndex]?.id || null;
        await guardarJornadaService(activeTournament.id, dataToSave);

        const updatedMappings = await fetchTournamentConfig();
        const updatedJornadasResult = await fetchJornadas(preservedJornadaId);
        const updatedJornadas = updatedJornadasResult?.jornadas || [];
        const tournamentMatches = await fetchAllTournamentMatches();

        const jornadaToRefresh =
          updatedJornadasResult?.selectedJornada ||
          updatedJornadas.find((jornada) => String(jornada.id) === String(preservedJornadaId)) ||
          updatedJornadas[currentJornadaIndex];

        if (jornadaToRefresh?.id) {
          await fetchCurrentJornadaMatches(
            jornadaToRefresh.id,
            updatedJornadas,
            updatedMappings?.jornadaMappings || [],
            updatedMappings?.matchMappings || [],
            { matchesSource: tournamentMatches }
          );
        }
        
        setDataVersion(prev => prev + 1);
        if (refreshStandings) await refreshStandings();
        
    } finally { 
        setLoading(false); 
    }
  };

  const handleUndoJornadaConfirmation = async ({ jornadaId }) => {
    const preservedJornadaId = jornadaId || jornadas[currentJornadaIndex]?.id || null;

    await desconfirmarJornadaService(activeTournament.id, preservedJornadaId);

    const updatedMappings = await fetchTournamentConfig();
    const updatedJornadasResult = await fetchJornadas(preservedJornadaId);
    const updatedJornadas = updatedJornadasResult?.jornadas || [];
    const tournamentMatches = await fetchAllTournamentMatches();

    const jornadaToRefresh =
      updatedJornadasResult?.selectedJornada ||
      updatedJornadas.find((jornada) => String(jornada.id) === String(preservedJornadaId)) ||
      updatedJornadas[currentJornadaIndex];

    if (jornadaToRefresh?.id) {
      await fetchCurrentJornadaMatches(
        jornadaToRefresh.id,
        updatedJornadas,
        updatedMappings?.jornadaMappings || [],
        updatedMappings?.matchMappings || [],
        { matchesSource: tournamentMatches }
      );
    }
  };

  const handleSaveConfig = async (newConfig) => {
    setLoading(true);
    try {
        let successMessage = "Cambios guardados exitosamente.";
        const baseJornadas = participatingTeams.length % 2 === 0 
            ? participatingTeams.length - 1 
            : participatingTeams.length;

        const nextJornadaDurationDays = getConfiguredJornadaDurationDays(newConfig);
        const baseStartDate = newConfig.startDate || activeTournament.start_date;
        const startDateChanged =
          Boolean(newConfig.startDate) && newConfig.startDate !== activeTournament.start_date;
        const durationChanged = nextJornadaDurationDays !== jornadaDurationDays;

        if (baseStartDate && (startDateChanged || durationChanged)) {
            
            const isFirstConfirmed = jornadas.some(j => j.name === 'Jornada 1' && j.status === 'Confirmada');
            
            if (!isFirstConfirmed) {
                const updates = jornadas.map((j) => {
                    if (!isOfficialJornadaName(j.name)) return null;

                    const num = parseJornadaNumber(j.name, 0);
                    if (num === 0) return null;

                    const weeksOffset = (num - 1) * nextJornadaDurationDays;
                    const newStart = addDaysToDate(baseStartDate, weeksOffset);
                    const newEnd = addDaysToDate(newStart, nextJornadaDurationDays - 1); 

                    return {
                        id: j.id,
                        tournament_id: activeTournament.id,
                        name: j.name,
                        status: j.status,
                        start_date: newStart,
                        end_date: newEnd
                    };
                }).filter(Boolean);

                if (updates.length > 0) {
                    await bulkUpdateJornadaFechas(updates);
                    const reason = startDateChanged
                      ? "cambio de inicio"
                      : "cambio de duracion";
                    successMessage = `Fechas de jornadas recalculadas por ${reason}.`;
                }
            }
        }

        await actualizarConfigTorneoService(activeTournament.id, newConfig, baseJornadas);
        
        setActiveTournament(prev => ({ 
            ...prev, 
            config: newConfig,
            start_date: newConfig.startDate || prev.start_date 
        }));
        
        await fetchJornadas(); 
        notify.success(successMessage);
    } catch (error) {
        notify.error(error);
    } finally { setLoading(false); }
  };

  const handleMatchUpdate = async (matchId, updates) => {
    await updateMatchResultService(matchId, updates);

    const mergeUpdatedMatch = (matches) =>
      (matches || []).map((match) =>
        String(match?.id) === String(matchId)
          ? { ...match, ...updates }
          : match
      );

    // La persistencia ya terminó correctamente. Reflejamos el resultado de
    // inmediato y dejamos las consultas derivadas como sincronización secundaria.
    setCurrentMatches(mergeUpdatedMatch);
    setAllTournamentMatches(mergeUpdatedMatch);
    setGlobalPendingMatches((matches) =>
      updates.status === 'Finalizado'
        ? (matches || []).filter((match) => String(match?.id) !== String(matchId))
        : mergeUpdatedMatch(matches)
    );

    const currentJornadaId = jornadas[currentJornadaIndex]?.id;
    const refreshTournamentMatches = Promise.resolve().then(async () => {
      const tournamentMatches = await fetchAllTournamentMatches({
        preserveOnError: true,
        throwOnError: true,
      });

      if (currentJornadaId) {
        await fetchCurrentJornadaMatches(
          currentJornadaId,
          jornadas,
          repositionMappings,
          repositionMatchMappings,
          {
            preserveOnError: true,
            throwOnError: true,
            matchesSource: tournamentMatches,
          }
        );
      }
    });
    const refreshTasks = [
      refreshStandings
        ? Promise.resolve().then(() => refreshStandings())
        : Promise.resolve(),
      refreshTournamentMatches,
    ];

    void Promise.allSettled(refreshTasks).then((results) => {
      const failures = results.filter((result) => result.status === 'rejected');
      if (failures.length === 0) return;

      console.error(
        "Resultado guardado, pero falló la sincronización posterior:",
        failures.map((failure) => failure.reason)
      );
      notify.warning(
        "Resultado guardado. Algunos datos no pudieron actualizarse; recarga la página si no ves los cambios.",
      );
    });
  };

  const handleResetMatchResult = async (matchId) => {
    const resetResult = await resetMatchResultService(activeTournament.id, matchId);
    const resetMatch = resetResult?.match;

    if (resetMatch?.id) {
      const mergeResetMatch = (matches) =>
        (matches || []).map((match) =>
          String(match?.id) === String(resetMatch.id)
            ? { ...match, ...resetMatch }
            : match
        );

      setCurrentMatches(mergeResetMatch);
      setAllTournamentMatches(mergeResetMatch);
    }

    await new Promise(res => setTimeout(res, 100));
    if (refreshStandings) await refreshStandings();
    const tournamentMatches = await fetchAllTournamentMatches();
    await fetchCurrentJornadaMatches(
      jornadas[currentJornadaIndex].id,
      jornadas,
      repositionMappings,
      repositionMatchMappings,
      { matchesSource: tournamentMatches }
    );

    return resetResult;
  };

  if (!activeTournament) return <EmptyState>No hay torneo activo.</EmptyState>;

  const currentJornada = jornadas[currentJornadaIndex] || null;
  const isCurrentJornadaMatchesReady =
    currentJornada?.id &&
    String(currentMatchesJornadaId || "") === String(currentJornada.id);
  
  if (
    jornadas.length === 0 ||
    !currentJornada ||
    (loading && !isEditorOpen) ||
    (currentJornada?.id && !isCurrentJornadaMatchesReady)
  ) {
      return (
        <TabContainer>
             <JornadaPlanificacionSkeleton />
        </TabContainer>
      );
  }

  const isPhaseAssignment = currentJornada.status !== 'Finalizada'; 
  const prevJornada = currentJornadaIndex > 0 ? jornadas[currentJornadaIndex - 1] : null;
  const canConfirm = !prevJornada || ['Confirmada', 'Finalizada'].includes(prevJornada.status);

  return (
    <TabContainer>
      {isEditorOpen && (
        <FixturePreviewModal
          isOpen
          onClose={() => setIsEditorOpen(false)}
          teams={participatingTeams}
          config={activeTournament.config}
          divisionName={activeTournament?.division?.name || activeTournament?.divisions?.name || divisionName}
          tournamentName={activeTournament?.season || activeTournament?.name || ""}
          onConfirm={handleConfirmFixtureUpdate}
          onSaveFixtureCriteria={handleSaveFixtureCriteria}
          isLoading={loading}
          existingData={editorData}
        />
      )}

      {isDateNormalizerOpen && (
        <NormalizeJornadaDatesModal
          isOpen
          onClose={() => setIsDateNormalizerOpen(false)}
          onApply={handleNormalizeJornadaDates}
          onApplyMatches={handleNormalizeMatchDates}
          rows={sevenDayPreview.rows}
          irregularCount={sevenDayPreview.irregularCount}
          anchorStartDate={sevenDayPreview.anchorStartDate}
          matchRows={matchWeekPreview.rows}
          matchIssueCount={matchWeekPreview.irregularCount}
          initialView={matchWeekPreview.needsAdjustment ? "matches" : "jornadas"}
          jornadaDurationDays={jornadaDurationDays}
        />
      )}

       {isPhaseAssignment ? (
          <JornadaPlanificacion 
            key={`plan-${currentJornada.id}-${dataVersion}`} 
            matchesDB={currentMatches} 
            globalPendingMatches={globalPendingMatches}
            teams={participatingTeams} 
            jornadaIndex={currentJornadaIndex} 
            activeTournament={activeTournament} 
            jornadaData={currentJornada}
            onConfirm={handleConfirmJornada} 
            onUndoConfirmation={handleUndoJornadaConfirmation}
            onChangeJornada={handleChangeJornada}
            totalJornadas={jornadas.length} 
            onMatchUpdate={handleMatchUpdate}
            onResetMatchResult={handleResetMatchResult}
            canConfirm={canConfirm} 
            onSaveConfig={handleSaveConfig}
            onEditFixture={handleOpenFixtureEditor}
            isTournamentActive={true} 
            dataVersion={dataVersion}
            jornadas={jornadas} 
            allTournamentMatches={allTournamentMatches}
            onUpdateDates={handleCascadingDateUpdate}
            jornadaDurationDays={jornadaDurationDays}
            needsDateNormalization={
              sevenDayPreview.needsAdjustment || matchWeekPreview.needsAdjustment
            }
            onOpenDateNormalizer={() => setIsDateNormalizerOpen(true)}
          />
       ) : (
        <JornadaResultados 
            key={`res-${currentJornada.id}-${dataVersion}`}
            matches={currentMatches} 
            teams={participatingTeams} 
            jornadaId={currentJornada.id} 
            activeTournament={activeTournament}
            refreshMatches={() => {
                fetchCurrentJornadaMatches(currentJornada.id);
                if(refreshStandings) refreshStandings(); 
            }} 
        />
       )}
    </TabContainer>
  );
}

const fadeIn = keyframes` from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } `;
const TabContainer = styled.div`
    display: flex; 
    flex-direction: column; 
    gap: 20px; 
    width: 100%; 
    flex: 1 1 auto;
    min-height: 0;
    max-width: 100vw; 
    box-sizing: border-box; 
    animation: ${fadeIn} 0.5s ease-out;
    overflow-x: hidden; 
`;
const EmptyState = styled.div` padding: 40px; text-align: center; opacity: 0.6; `;
