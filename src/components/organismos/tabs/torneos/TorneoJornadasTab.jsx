import React, { useState, useEffect, useCallback, useMemo } from "react";
import styled, { keyframes } from "styled-components";
import { Toast } from "../../../../index";
import { JornadaPlanificacion } from "./JornadaPlanificacion"; 
import { JornadaResultados } from "./JornadaResultados";
import { FixturePreviewModal } from "./subcomponents/FixturePreviewModal";
import {
  actualizarConfigTorneoService,
  bulkInsertMatchesService,
  bulkUpdateJornadaFechas,
  bulkUpsertMatchesService,
  createJornadasService,
  getAllMatchesByTournament,
  getJornadas,
  getMatchesByIdsService,
  getMatchesByJornadaService,
  getPendingMatchesByTournamentService,
  getTournamentConfigService,
  guardarJornadaService,
  updateTournamentFieldsService,
  updateMatchResultService,
} from "../../../../services/torneos";
import { addDaysToDate } from "../../../../utils/dateUtils";
import {
  isOfficialJornadaName,
  isRepositionJornadaName,
  parseJornadaNumber,
  resolveRepositionMappings,
  sortJornadas,
} from "../../../../utils/jornadaUtils";

import { JornadaPlanificacionSkeleton } from "./planificacion/Skeletons";
import { NormalizeJornadaDatesModal } from "./planificacion/NormalizeJornadaDatesModal";

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

const hasValidSevenDayCadence = (jornadas = []) => {
  if (!Array.isArray(jornadas) || jornadas.length === 0) return false;

  const datedJornadas = sortJornadas(jornadas).filter(
    (jornada) => jornada?.start_date && jornada?.end_date
  );

  if (datedJornadas.length !== jornadas.length) return false;

  return datedJornadas.every((jornada, index) => {
    if (getDateDurationDays(jornada.start_date, jornada.end_date) !== 7) {
      return false;
    }

    if (index === 0) return true;

    return getDaysBetweenDates(
      datedJornadas[index - 1].start_date,
      jornada.start_date
    ) === 7;
  });
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
  configuredMappings = []
) => {
  const isCurrentCalendarValid = hasValidSevenDayCadence(jornadas);
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
      index === 0 ? anchorStartDate : addDaysToDate(anchorStartDate, index * 7);
    const nextEndDate = addDaysToDate(nextStartDate, 6);
    const currentDuration = getDateDurationDays(
      jornada?.start_date,
      jornada?.end_date
    );
    const changed =
      !isCurrentCalendarValid &&
      (String(jornada?.start_date || "") !== String(nextStartDate) ||
        String(jornada?.end_date || "") !== String(nextEndDate));
    const hasInvalidDuration = currentDuration !== 7;

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

export function TorneoJornadasTab({ activeTournament: initialTournament, participatingTeams, refreshStandings }) {
  const [activeTournament, setActiveTournament] = useState(initialTournament);
  const [jornadas, setJornadas] = useState([]);
  const [repositionMappings, setRepositionMappings] = useState([]);
  const [repositionMatchMappings, setRepositionMatchMappings] = useState([]);
  const [currentJornadaIndex, setCurrentJornadaIndex] = useState(0);
  const [currentMatches, setCurrentMatches] = useState([]); 
  const [allTournamentMatches, setAllTournamentMatches] = useState([]);
  const [globalPendingMatches, setGlobalPendingMatches] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [toastConfig, setToastConfig] = useState({ show: false, message: '', type: 'error' });
  
  const [dataVersion, setDataVersion] = useState(0);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isDateNormalizerOpen, setIsDateNormalizerOpen] = useState(false);
  const [editorData, setEditorData] = useState(null); 

  useEffect(() => {
    setActiveTournament(initialTournament);
  }, [initialTournament]);

  useEffect(() => {
    if (activeTournament?.id) {
        loadTournamentData();
    }
  }, [activeTournament?.id]);

  const resolveSelectedJornada = useCallback((sortedJornadas = [], preferredJornadaId = null) => {
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
      setLoading(true);
      setCurrentJornadaIndex(newIndex);

      try {
        await fetchCurrentJornadaMatches(
          targetJornada.id,
          jornadas,
          repositionMappings,
          repositionMatchMappings
        );
      } finally {
        setLoading(false);
      }
  };

  const loadTournamentData = useCallback(async ({ preserveData = false } = {}) => {
      setLoading(true);
      if (!preserveData) {
        setJornadas([]);
        setCurrentMatches([]);
        setAllTournamentMatches([]);
        setGlobalPendingMatches([]);
      }

      try {
          const updatedMappings = await fetchTournamentConfig();
          const jornadasResult = await fetchJornadas();
        const sortedJornadas = jornadasResult?.jornadas || [];
        const selectedJornada = jornadasResult?.selectedJornada || null;

        await Promise.all([
          fetchGlobalPendingMatches(),
          fetchAllTournamentMatches(),
          selectedJornada?.id
            ? fetchCurrentJornadaMatches(
                selectedJornada.id,
                sortedJornadas,
                updatedMappings?.jornadaMappings || [],
                updatedMappings?.matchMappings || []
              )
            : Promise.resolve(),
        ]);
      } finally {
        setLoading(false);
      }
  }, [activeTournament?.id, currentJornadaIndex]);

  const fetchAllTournamentMatches = async () => {
      try {
          const data = await getAllMatchesByTournament(activeTournament.id);
          setAllTournamentMatches(data || []);
          return data || [];
      } catch (error) {
          console.error("Error fetchAllTournamentMatches:", error);
          setAllTournamentMatches([]);
          return [];
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

  const fetchJornadas = async (preferredJornadaId = null) => {
    try {
      const data = await getJornadas(activeTournament.id);
      const sorted = sortJornadas(data);
      setJornadas(sorted);

      const { selectedIndex, selectedJornada } = resolveSelectedJornada(sorted, preferredJornadaId);
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
    matchMappingsSource = repositionMatchMappings
  ) => {
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

      const directMatches = await getMatchesByJornadaService(jornadaId);

      const extraMatchIds = normalizedMatchMappings
        .filter((mapping) => String(mapping?.originalJornadaId) === String(jornadaId))
        .map((mapping) => mapping.matchId)
        .filter(Boolean);
      const extraMatches = await getMatchesByIdsService(extraMatchIds);

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

      setCurrentMatches(enhancedMatches);
    } catch (e) { 
        console.error(e);
    }
  };

  const fetchGlobalPendingMatches = async () => {
      try {
          const data = await getPendingMatchesByTournamentService(activeTournament.id);

          // Se mantiene la busqueda de Programados sin fecha para que la UI 
          // los detecte de tu base de datos y no se vuelvan invisibles.
          const realPendingMatches = data.filter(m => 
              m.status === 'Pendiente' || (m.status === 'Programado' && !m.date)
          );

          setGlobalPendingMatches(realPendingMatches);
      } catch (error) { console.error("Error fetchGlobalPending:", error); }
  };

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
          setToastConfig({ show: true, message: "Error cargando fixture: " + error.message, type: "error" });
      } finally {
          setLoading(false);
      }
  };

  const handleConfirmFixtureUpdate = async (updatedMatches) => {
      setLoading(true);
      try {
        const originalMap = new Map(editorData.matches.map(m => [m.id, m]));
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
                ? addDaysToDate(lastJornada.start_date, 7)
                : activeTournament?.start_date
                  ? addDaysToDate(activeTournament.start_date, jornadas.length * 7)
                  : null;

            const jornadasToCreate = generatedRoundIndexes.map((roundIndex, offset) => {
              const roundMatches = updatedMatches.filter(
                (match) => Number(match.jornadaIndex) === roundIndex
              );
              const roundName =
                roundMatches[0]?.roundName ||
                `Jornada ${roundIndex + 1}`;
              const startDate = nextStartDate
                ? (offset === 0 ? nextStartDate : addDaysToDate(nextStartDate, offset * 7))
                : null;
              const endDate = startDate ? addDaysToDate(startDate, 6) : null;

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

            const payload = {
              jornada_id: targetJornadaId,
              team1_id: team1Id,
              team2_id: team2Id,
              date: null,
              status: 'Pendiente',
            };

            if (!m.dbId) {
              if (m.isGeneratedRound) {
                inserts.push(payload);
              }
              return;
            }

            const original = originalMap.get(m.dbId);
            if (!original) return;

            const jornadaChanged = String(original.jornada_id) !== String(targetJornadaId);
            const team1Changed = String(original.team1_id ?? '') !== String(team1Id ?? '');
            const team2Changed = String(original.team2_id ?? '') !== String(team2Id ?? '');

            if (jornadaChanged || team1Changed || team2Changed) {
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

        if(updates.length > 0 || inserts.length > 0) {
            if (updates.length > 0) {
              await bulkUpsertMatchesService(updates);
            }

            if (inserts.length > 0) {
              await bulkInsertMatchesService(inserts);
            }

            setToastConfig({
              show: true,
              message: generatedRoundIndexes.length > 0
                ? "Nueva jornada generada y guardada correctamente."
                : "Fixture reorganizado correctamente.",
              type: "success"
            });

            await loadTournamentData({ preserveData: true });

            setDataVersion(prev => prev + 1);
            
        } else {
            setToastConfig({
              show: true,
              message: generatedRoundIndexes.length > 0
                ? "La jornada se creo, pero no hubo partidos validos para guardar."
                : "No se detectaron cambios de jornada.",
              type: "warning"
            });
        }

        await new Promise((resolve) => setTimeout(resolve, 180));
        setIsEditorOpen(false);

      } catch (error) {
          setToastConfig({ show: true, message: "Error guardando cambios: " + error.message, type: "error" });
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
              ? "Cambio confirmado. La fecha de fin se ajusto 6 dias despues."
              : `Fechas actualizadas. Se recorrieron ${updates.length - 1} jornadas futuras.`;
          setToastConfig({ show: true, message: successMessage, type: "success" });
          await fetchJornadas(); 
          
      } catch (error) {
          console.error(error);
          setToastConfig({ show: true, message: "Error actualizando fechas: " + error.message, type: "error" });
      } finally {
          setLoading(false);
      }
  };

  const sevenDayPreview = useMemo(
    () =>
      buildSevenDayPreview(
        jornadas,
        activeTournament?.start_date || "",
        repositionMappings
      ),
    [activeTournament?.start_date, jornadas, repositionMappings]
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
      setToastConfig({
        show: true,
        message: "Calendario ajustado. Todas las jornadas duran 7 dias.",
        type: "success",
      });

      const updatedJornadasResult = await fetchJornadas(preservedJornadaId);
      const selectedJornada = updatedJornadasResult?.selectedJornada || null;
      if (selectedJornada?.id) {
        await fetchCurrentJornadaMatches(selectedJornada.id, updatedJornadasResult.jornadas);
      }
    } catch (error) {
      console.error(error);
      setToastConfig({
        show: true,
        message: "Error ajustando calendario: " + error.message,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

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
      setToastConfig({
        show: true,
        message: `Partidos ajustados a la semana de su jornada: ${updates.length}.`,
        type: "success",
      });

      await fetchAllTournamentMatches();
      if (jornadas[currentJornadaIndex]?.id) {
        await fetchCurrentJornadaMatches(
          jornadas[currentJornadaIndex].id,
          jornadas,
          repositionMappings,
          repositionMatchMappings
        );
      }
      await fetchGlobalPendingMatches();
      setDataVersion((prev) => prev + 1);
    } catch (error) {
      console.error(error);
      setToastConfig({
        show: true,
        message: "Error ajustando partidos: " + error.message,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmJornada = async (dataToSave) => {
    setLoading(true);
    try {
        const preservedJornadaId = jornadas[currentJornadaIndex]?.id || null;
        await guardarJornadaService(activeTournament.id, dataToSave);
        setToastConfig({ show: true, message: "Jornada confirmada exitosamente.", type: "success" });

        const updatedMappings = await fetchTournamentConfig();
        const updatedJornadasResult = await fetchJornadas(preservedJornadaId);
        const updatedJornadas = updatedJornadasResult?.jornadas || [];
        await fetchGlobalPendingMatches();
        await fetchAllTournamentMatches();

        const jornadaToRefresh =
          updatedJornadasResult?.selectedJornada ||
          updatedJornadas.find((jornada) => String(jornada.id) === String(preservedJornadaId)) ||
          updatedJornadas[currentJornadaIndex];

        if (jornadaToRefresh?.id) {
          await fetchCurrentJornadaMatches(
            jornadaToRefresh.id,
            updatedJornadas,
            updatedMappings?.jornadaMappings || [],
            updatedMappings?.matchMappings || []
          );
        }
        
        setDataVersion(prev => prev + 1);
        if (refreshStandings) await refreshStandings();
        
    } catch (error) { 
        setToastConfig({ show: true, message: error.message, type: "error" }); 
    } finally { 
        setLoading(false); 
    }
  };

  const handleSaveConfig = async (newConfig) => {
    setLoading(true);
    try {
        const baseJornadas = participatingTeams.length % 2 === 0 
            ? participatingTeams.length - 1 
            : participatingTeams.length;

        if (newConfig.startDate && newConfig.startDate !== activeTournament.start_date) {
            
            const isFirstConfirmed = jornadas.some(j => j.name === 'Jornada 1' && j.status === 'Confirmada');
            
            if (!isFirstConfirmed) {
                const updates = jornadas.map((j) => {
                    if (!isOfficialJornadaName(j.name)) return null;

                    const num = parseJornadaNumber(j.name, 0);
                    if (num === 0) return null;

                    const weeksOffset = (num - 1) * 7;
                    const newStart = addDaysToDate(newConfig.startDate, weeksOffset);
                    const newEnd = addDaysToDate(newStart, 6); 

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
                    setToastConfig(prev => ({ ...prev, show: true, message: "Fechas de jornadas recalculadas por cambio de inicio.", type: "success" }));
                }
            }
        }

        await actualizarConfigTorneoService(activeTournament.id, newConfig, baseJornadas);
        
        setActiveTournament(prev => ({ 
            ...prev, 
            config: newConfig,
            start_date: newConfig.startDate || prev.start_date 
        }));
        
        if (!toastConfig.show) { 
            setToastConfig({ show: true, message: "Cambios guardados exitosamente.", type: "success" });
        }
        
        await fetchJornadas(); 
    } catch (error) {
        setToastConfig({ show: true, message: error.message, type: "error" });
    } finally { setLoading(false); }
  };

  const handleMatchUpdate = async (matchId, updates) => {
    await updateMatchResultService(matchId, updates);
    await new Promise(res => setTimeout(res, 100));
    if (refreshStandings) await refreshStandings(); 
    await fetchCurrentJornadaMatches(jornadas[currentJornadaIndex].id);
    await fetchGlobalPendingMatches();
    await fetchAllTournamentMatches();
  };

  if (!activeTournament) return <EmptyState>No hay torneo activo.</EmptyState>;
  
  if (jornadas.length === 0 || (loading && !isEditorOpen)) {
      return (
        <TabContainer>
             <JornadaPlanificacionSkeleton />
        </TabContainer>
      );
  }

  const currentJornada = jornadas[currentJornadaIndex];
  const isPhaseAssignment = currentJornada.status !== 'Finalizada'; 
  const prevJornada = currentJornadaIndex > 0 ? jornadas[currentJornadaIndex - 1] : null;
  const canConfirm = !prevJornada || ['Confirmada', 'Finalizada'].includes(prevJornada.status);

  return (
    <TabContainer>
      <Toast show={toastConfig.show} message={toastConfig.message} type={toastConfig.type} onClose={() => setToastConfig({ ...toastConfig, show: false })} />
      
      <FixturePreviewModal 
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        teams={participatingTeams}
        config={activeTournament.config}
        onConfirm={handleConfirmFixtureUpdate}
        isLoading={loading}
        existingData={editorData} 
      />

      <NormalizeJornadaDatesModal
        isOpen={isDateNormalizerOpen}
        onClose={() => setIsDateNormalizerOpen(false)}
        onApply={handleNormalizeJornadaDates}
        onApplyMatches={handleNormalizeMatchDates}
        rows={sevenDayPreview.rows}
        irregularCount={sevenDayPreview.irregularCount}
        anchorStartDate={sevenDayPreview.anchorStartDate}
        matchRows={matchWeekPreview.rows}
        matchIssueCount={matchWeekPreview.irregularCount}
        initialView={matchWeekPreview.needsAdjustment ? "matches" : "jornadas"}
      />

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
            onChangeJornada={handleChangeJornada}
            totalJornadas={jornadas.length} 
            onMatchUpdate={handleMatchUpdate}
            canConfirm={canConfirm} 
            onSaveConfig={handleSaveConfig}
            onEditFixture={handleOpenFixtureEditor}
            isTournamentActive={true} 
            dataVersion={dataVersion}
            jornadas={jornadas} 
            onUpdateDates={handleCascadingDateUpdate}
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
