// src/components/organismos/tabs/torneos/JornadaPlanificacion.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import styled, { css, keyframes } from "styled-components";
import { v } from "../../../../styles/variables";
import { Btnsave } from "../../../moleculas/Btnsave";
import {
  RiArrowGoBackLine,
  RiCheckDoubleLine,
  RiCloseLine,
  RiEyeLine,
  RiEyeOffLine,
  RiImageLine,
  RiTimeLine,
} from "react-icons/ri";

import { usePlanificacionMatches } from "../../../../hooks/usePlanificacionMatches";
import { addDaysToDate, formatDateWithWeekday } from "../../../../utils/dateUtils";
import { findScheduleConflicts, checkOverlap } from "../../../../utils/matchValidation";
import {
  isOfficialJornadaName,
  isRepositionJornadaName,
  parseJornadaNumber,
  sortJornadas,
} from "../../../../utils/jornadaUtils";
import { getSuggestedRepositionWindow } from "../../../../utils/repositionUtils";
import { buildRepositionPreview } from "../../../../utils/jornadaUtils";
import { isPlayoffJornadaName } from "../../../../utils/playoffUtils";
import { isMatchResultConflictError } from "../../../../utils/matchResultConcurrency";
import {
  buildPendingMatchCancellationRequest,
  buildPendingMatchResultRequest,
  buildUnresultedMatchPendingRequest,
  getMatchesForManagement,
} from "../../../../utils/pendingMatchManagement.js";

import { PlanningHeader } from "./planificacion/PlanningHeader";
import { PlanningSidebar } from "./planificacion/PlanningSidebar";
import { ScheduledMatchRow } from "./planificacion/ScheduledMatchRow";
import { ResultModal } from "./planificacion/ResultModal";
import { PendingMatchesModal } from "./planificacion/PendingMatchesModal";
import { WeeklyGridView } from "./planificacion/WeeklyGridView";
import { TournamentConfigModal } from "./subcomponents/TournamentConfigModal";
import { ConflictModal } from "./subcomponents/ConflictModal";
import { BatchPrintModal } from "./exports/match-sheets/BatchPrintModal";
import ScheduleExportModal from "./exports/schedule/ScheduleExportModal";
import { DaySeparatorDropZone } from "./planificacion/DaySeparatorDropZone";
import { EmptyDropZone } from "./planificacion/EmptyDropZone";
import { ConfirmModal } from "../../ConfirmModal";
import { MatchResolutionModal } from "./planificacion/MatchResolutionModal";
import { RepositionPlannerModal } from "./planificacion/RepositionPlannerModal";
import { JornadaPlanificacionSkeleton } from "./planificacion/Skeletons";
import { notify } from "../../../../lib/notifications/notify.js";

const getMatchTeamsLabel = (match) => {
  if (!match) return "";
  const homeName = match.homeTeam?.name || match.local?.name || "Local";
  const awayName = match.awayTeam?.name || match.visitante?.name || "Visitante";
  return `${homeName} vs ${awayName}`;
};

const getConfiguredJornadaDurationDays = (config, fallback = 7) => {
  const parsed = parseInt(config?.jornadaDurationDays, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const hasScoreValue = (value) =>
  value !== null && value !== undefined && String(value).trim() !== "";

const hasMatchResult = (match) =>
  match?.status === "Finalizado" ||
  (hasScoreValue(match?.goals1) && hasScoreValue(match?.goals2));

const customScrollbar = css`
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => theme.colorScroll} transparent;

  &::-webkit-scrollbar {
    width: 5px;
    height: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
    border-radius: 4px;
    margin: 5px 0;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colorScroll};
    border-radius: 4px;
    transition: background 0.3s ease;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.text};
  }
`;

export function JornadaPlanificacion({
  matchesDB = [],
  globalPendingMatches = [],
  teams,
  jornadaIndex,
  activeTournament,
  jornadaData,
  onConfirm,
  onUndoConfirmation,
  onChangeJornada,
  totalJornadas,
  onMatchUpdate,
  onRefreshAfterBulkPending,
  onResetMatchResult,
  canConfirm,
  onSaveConfig,
  onEditFixture,
  isTournamentActive,
  dataVersion,
  jornadas = [],
  allTournamentMatches = [],
  onUpdateDates,
  jornadaDurationDays: jornadaDurationDaysProp,
  onAutoFill,
  needsDateNormalization = false,
  onOpenDateNormalizer,
}) {
  const {
    scheduledMatches,
    setScheduledMatches,
    allPendingMatches,
    setAllPendingMatches,
    sidebarMatches,
    weekStartDate,
    durationMatch,
    autoAdjustTimes,
    currentJornadaName,
    currentJornadaNumber,
    clearDraft,
    saveDraft,
    hasLoadedPlanningData,
    showExternalMatches,
    toggleExternalMatches,
    externalMatches,
    loadingExternal,
    fetchExternalMatches,
  } = usePlanificacionMatches(
    activeTournament,
    jornadaIndex,
    teams,
    matchesDB,
    globalPendingMatches,
    jornadaData,
    dataVersion,
    jornadas
  );

  const [viewMode, setViewMode] = useState("list");
  const [draggedMatch, setDraggedMatch] = useState(null);
  const [selectedPendingMatch, setSelectedPendingMatch] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [selectedMatchResult, setSelectedMatchResult] = useState(null);
  const [savingResultMatchId, setSavingResultMatchId] = useState(null);
  const [pendingMatchesModalOpen, setPendingMatchesModalOpen] = useState(false);
  const [managedResultType, setManagedResultType] = useState(null);
  const [pendingMatchToCancel, setPendingMatchToCancel] = useState(null);
  const [cancelingPendingMatchId, setCancelingPendingMatchId] = useState(null);
  const [matchToMarkPending, setMatchToMarkPending] = useState(null);
  const [markingPendingMatchId, setMarkingPendingMatchId] = useState(null);
  const [matchesToMarkPending, setMatchesToMarkPending] = useState(null);
  const [bulkPendingProgress, setBulkPendingProgress] = useState(null);
  const [matchToResetResult, setMatchToResetResult] = useState(null);
  const [resettingResultMatchId, setResettingResultMatchId] = useState(null);

  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [batchPrintOpen, setBatchPrintOpen] = useState(false);
  const [scheduleExportOpen, setScheduleExportOpen] = useState(false);

  const [repositionPlannerOpen, setRepositionPlannerOpen] = useState(false);
  const [confirmJornadaModalOpen, setConfirmJornadaModalOpen] = useState(false);
  const [undoJornadaModalOpen, setUndoJornadaModalOpen] = useState(false);
  const [isUndoingConfirmation, setIsUndoingConfirmation] = useState(false);
  const [matchToPostpone, setMatchToPostpone] = useState(null);

  const [resolutionModalOpen, setResolutionModalOpen] = useState(false);
  const [matchToResolve, setMatchToResolve] = useState(null);
  const [repositionWeek, setRepositionWeek] = useState({ startDate: "", endDate: "" });

  const [conflictsFound, setConflictsFound] = useState([]);
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);

  const isConfirmed = jornadaData?.status === "Confirmada";
  const isRepositionMode = useMemo(
    () => isRepositionJornadaName(jornadaData?.name),
    [jornadaData?.name]
  );
  const isPlayoffJornada = useMemo(
    () => isPlayoffJornadaName(currentJornadaName),
    [currentJornadaName]
  );
  const chronologicalJornadas = useMemo(
    () => sortJornadas(jornadas),
    [jornadas]
  );
  const chronologicalJornadaIndex = useMemo(() => {
    const currentId = jornadaData?.id;
    if (!currentId) return jornadaIndex;

    const foundIndex = chronologicalJornadas.findIndex(
      (jornada) => String(jornada.id) === String(currentId)
    );

    return foundIndex === -1 ? jornadaIndex : foundIndex;
  }, [chronologicalJornadas, jornadaData?.id, jornadaIndex]);
  const matchProgressByJornada = useMemo(() => {
    return (allTournamentMatches || []).reduce((acc, match) => {
      const jornadaId = match?.jornada_id || match?.jornadas?.id || match?.jornada?.id;
      if (!jornadaId || !match?.team1_id || !match?.team2_id || match.status === "Cancelado") return acc;

      const key = String(jornadaId);
      const current = acc.get(key) || { completed: 0, total: 0 };
      current.total += 1;
      if (match.status === "Finalizado") {
        current.completed += 1;
      }
      acc.set(key, current);
      return acc;
    }, new Map());
  }, [allTournamentMatches]);

  const selectableJornadas = useMemo(() => {
    const lastConfirmedIndex = chronologicalJornadas.reduce((lastIndex, jornada, index) => {
      return ["Confirmada", "Finalizada"].includes(jornada?.status) ? index : lastIndex;
    }, -1);
    const nextAvailableIndex = lastConfirmedIndex + 1;
    const currentJornadaId = jornadaData?.id ? String(jornadaData.id) : null;

    return chronologicalJornadas
      .filter((jornada, index) => {
        const isConfirmedOrFinished = ["Confirmada", "Finalizada"].includes(jornada?.status);
        const isNextAvailable = index === nextAvailableIndex;
        const isCurrent = currentJornadaId && String(jornada?.id) === currentJornadaId;

        return isConfirmedOrFinished || isNextAvailable || isCurrent;
      })
      .map((jornada) => {
        const isConfirmedOrFinished = ["Confirmada", "Finalizada"].includes(jornada?.status);
        return {
          ...jornada,
          progress: isConfirmedOrFinished
            ? matchProgressByJornada.get(String(jornada.id)) || { completed: 0, total: 0 }
            : null,
        };
      });
  }, [chronologicalJornadas, jornadaData?.id, matchProgressByJornada]);
  const officialJornadasCount = jornadas.filter((jornada) =>
    isOfficialJornadaName(jornada?.name)
  ).length || totalJornadas;
  const isVueltasLocked =
    currentJornadaNumber > Math.ceil(officialJornadasCount / 2);
  const isFirstJornadaConfirmed = activeTournament?.jornadas?.some(
    (j) => j.name === "Jornada 1" && j.status === "Confirmada"
  );

  const matchesWithoutResult = scheduledMatches.filter((match) => {
    if (match.isReferenceOnly) return false;
    const isSaved = match.id && !String(match.id).startsWith("temp");
    const isPendingResult = !["Finalizado", "Cancelado"].includes(match.status);
    return isSaved && isPendingResult;
  });

  const editableScheduledMatches = useMemo(
    () => scheduledMatches.filter((match) => !match.isReferenceOnly && match.status !== "Cancelado"),
    [scheduledMatches]
  );

  const confirmedResultsProgress = useMemo(() => {
    const trackableMatches = scheduledMatches.filter(
      (match) => !match.isReferenceOnly && !match.isByeMatch && match.status !== "Cancelado"
    );

    return {
      completed: trackableMatches.filter(hasMatchResult).length,
      total: trackableMatches.length,
    };
  }, [scheduledMatches]);
  const canUndoJornadaConfirmation =
    isConfirmed &&
    confirmedResultsProgress.completed === 0 &&
    typeof onUndoConfirmation === "function";

  const pendientesEstaJornada = sidebarMatches.filter(
    (match) => match.originJornada === currentJornadaName && !match.isByeMatch
  );
  const pendingAfterRepositionConfirm = sidebarMatches.filter((match) => {
    if (match.isByeMatch) return false;
    if (match.resolution?.type === "default") return false;
    return parseJornadaNumber(match.originJornada, currentJornadaNumber) < currentJornadaNumber;
  }).length;

  const tournamentConfig = useMemo(() => {
    if (!activeTournament?.config) return {};

    if (typeof activeTournament.config === "string") {
      try {
        return JSON.parse(activeTournament.config);
      } catch (error) {
        console.error("Error parsing tournament config:", error);
        return {};
      }
    }

    return activeTournament.config;
  }, [activeTournament?.config]);
  const managedMatches = useMemo(() => getMatchesForManagement({
    matches: allTournamentMatches,
    jornadas,
    teams,
    config: tournamentConfig,
  }), [allTournamentMatches, jornadas, teams, tournamentConfig]);

  const jornadaDurationDays = getConfiguredJornadaDurationDays(
    tournamentConfig,
    jornadaDurationDaysProp || 7
  );

  const suggestedRepositionWindow = useMemo(
    () =>
      getSuggestedRepositionWindow({
        jornadas,
        jornadaIndex,
        fallbackStartDate:
          jornadaData?.start_date || weekStartDate || activeTournament?.start_date,
        jornadaDurationDays,
      }),
    [
      activeTournament?.start_date,
      jornadaData?.start_date,
      jornadaDurationDays,
      jornadaIndex,
      jornadas,
      weekStartDate,
    ]
  );

  const headerJornadaData = useMemo(() => {
    if (!isRepositionMode) return jornadaData;

    return {
      ...jornadaData,
      start_date: repositionWeek.startDate || suggestedRepositionWindow.startDate,
      end_date: repositionWeek.endDate || suggestedRepositionWindow.endDate,
    };
  }, [
    isRepositionMode,
    jornadaData,
    repositionWeek.endDate,
    repositionWeek.startDate,
    suggestedRepositionWindow.endDate,
    suggestedRepositionWindow.startDate,
  ]);

  const handleRepositionHeaderDates = useCallback((newStart, newEnd) => {
    setRepositionWeek({
      startDate: newStart,
      endDate: newEnd,
    });
  }, []);

  useEffect(() => {
    setRepositionWeek({ startDate: "", endDate: "" });
  }, [jornadaData?.id]);

  useEffect(() => {
    if (!isRepositionMode) {
      setRepositionWeek({ startDate: "", endDate: "" });
      return;
    }

    setRepositionWeek((prev) => ({
      startDate: prev.startDate || suggestedRepositionWindow.startDate,
      endDate: prev.endDate || suggestedRepositionWindow.endDate,
    }));
  }, [
    isRepositionMode,
    suggestedRepositionWindow.endDate,
    suggestedRepositionWindow.startDate,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleResize = () => {
      setIsMobileViewport(window.innerWidth <= 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const futureJornadaPreview = useMemo(
    () =>
      buildRepositionPreview({
        jornadas,
        jornadaIndex,
        repositionStartDate:
          repositionWeek.startDate || suggestedRepositionWindow.startDate,
        repositionEndDate:
          repositionWeek.endDate || suggestedRepositionWindow.endDate,
        jornadaDurationDays,
      }),
    [
      jornadaIndex,
      jornadaDurationDays,
      jornadas,
      repositionWeek.endDate,
      repositionWeek.startDate,
      suggestedRepositionWindow.endDate,
      suggestedRepositionWindow.startDate,
    ]
  );

  const nextJornadaPreview = futureJornadaPreview[1] || null;
  const planningReferenceStartDate = isRepositionMode
    ? repositionWeek.startDate || suggestedRepositionWindow.startDate
    : weekStartDate;
  const planningWindowStartDate =
    headerJornadaData?.start_date ||
    planningReferenceStartDate ||
    jornadaData?.start_date ||
    weekStartDate ||
    "";
  const planningWindowEndDate =
    headerJornadaData?.end_date ||
    (planningWindowStartDate
      ? addDaysToDate(planningWindowStartDate, jornadaDurationDays - 1)
      : "");
  const isTapSelectionEnabled = isMobileViewport && viewMode === "list" && !isConfirmed;
  const isTapDropEnabled = isTapSelectionEnabled && Boolean(selectedPendingMatch);
  const activePendingMatch = draggedMatch || selectedPendingMatch;
  const selectedPendingMatchLabel = useMemo(
    () => getMatchTeamsLabel(selectedPendingMatch),
    [selectedPendingMatch]
  );

  const handleOpenResolution = (match) => {
    setMatchToResolve(match);
    setResolutionModalOpen(true);
  };

  const handleCloseResultModal = useCallback(() => {
    setResultModalOpen(false);
    setSelectedMatchResult(null);
    setManagedResultType(null);
  }, []);

  const handleOpenResultModal = useCallback((selected) => {
    if (savingResultMatchId) return;
    setManagedResultType(null);
    setSelectedMatchResult(selected);
    setResultModalOpen(true);
  }, [savingResultMatchId]);

  const removeResolvedPendingMatch = useCallback((id, originJornadaId) => {
    const retainOtherMatches = (matches) => matches.filter((match) => String(match.id) !== String(id));
    setAllPendingMatches(retainOtherMatches);
    if (String(jornadaData?.id) !== String(originJornadaId)) {
      setScheduledMatches(retainOtherMatches);
    }
    setSelectedPendingMatch((match) => String(match?.id) === String(id) ? null : match);
    setDraggedMatch((match) => String(match?.id) === String(id) ? null : match);
  }, [jornadaData?.id, setAllPendingMatches, setScheduledMatches]);

  const handleClosePendingMatches = useCallback(() => setPendingMatchesModalOpen(false), []);

  const handleOpenManagedResult = (match, isUnresulted = false) => {
    if (savingResultMatchId || cancelingPendingMatchId || markingPendingMatchId) return;
    setSelectedMatchResult(match);
    setManagedResultType(isUnresulted ? "unresulted" : "pending");
    setResultModalOpen(true);
  };

  const handleCancelPendingMatch = async () => {
    if (!pendingMatchToCancel || cancelingPendingMatchId) return;
    const match = pendingMatchToCancel;
    setCancelingPendingMatchId(match.id);
    try {
      if (typeof onMatchUpdate !== "function") throw new Error("No se puede cancelar el pendiente.");
      await onMatchUpdate(match.id, buildPendingMatchCancellationRequest(match));
      removeResolvedPendingMatch(match.id, match.originJornadaId);
      setPendingMatchToCancel(null);
      notify.success(`Partido marcado como sin jugar en ${match.originJornada}.`);
    } catch (error) {
      if (isMatchResultConflictError(error)) setPendingMatchToCancel(null);
      notify.error(isMatchResultConflictError(error)
        ? "El partido fue actualizado desde otro dispositivo. Revisa su estado antes de cancelar el pendiente."
        : error?.message || "No se pudo cancelar el pendiente. Intenta de nuevo.");
    } finally {
      setCancelingPendingMatchId(null);
    }
  };

  const handleMarkUnresultedPending = async () => {
    if (!matchToMarkPending || markingPendingMatchId) return;
    const match = matchToMarkPending;
    setMarkingPendingMatchId(match.id);
    try {
      if (typeof onMatchUpdate !== "function") throw new Error("No se puede aplazar el partido.");
      await onMatchUpdate(match.id, buildUnresultedMatchPendingRequest(match));
      setMatchToMarkPending(null);
      notify.success(`Partido marcado como pendiente en ${match.originJornada}.`);
    } catch (error) {
      if (isMatchResultConflictError(error)) setMatchToMarkPending(null);
      notify.error(isMatchResultConflictError(error)
        ? "El partido fue actualizado desde otro dispositivo. Revisa su estado antes de aplazarlo."
        : error?.message || "No se pudo marcar el partido como pendiente. Intenta de nuevo.");
    } finally {
      setMarkingPendingMatchId(null);
    }
  };

  const handleMarkAllUnresultedPending = async () => {
    if (!matchesToMarkPending?.length || bulkPendingProgress) return;
    const matches = matchesToMarkPending;
    setBulkPendingProgress({ completed: 0, total: matches.length });
    let nextIndex = 0;
    let saved = 0;

    const markNext = async () => {
      while (nextIndex < matches.length) {
        const match = matches[nextIndex++];
        try {
          await onMatchUpdate(match.id, buildUnresultedMatchPendingRequest(match), { deferRefresh: true });
          saved += 1;
        } catch (error) {
          console.error(`No se pudo aplazar el partido ${match.id}:`, error);
        } finally {
          setBulkPendingProgress((current) => current && {
            ...current, completed: current.completed + 1,
          });
        }
      }
    };

    try {
      if (typeof onMatchUpdate !== "function") throw new Error("No se pueden aplazar los partidos.");
      await Promise.all(Array.from({ length: Math.min(3, matches.length) }, markNext));
      let refreshFailed = false;
      try {
        await onRefreshAfterBulkPending?.();
      } catch (error) {
        refreshFailed = true;
        console.error("No se pudieron sincronizar los partidos aplazados:", error);
      }

      setMatchesToMarkPending(null);
      const failed = matches.length - saved;
      const summary = failed
        ? `${saved} de ${matches.length} partidos marcados como pendientes; ${failed} no se pudieron actualizar.`
        : `${saved} ${saved === 1 ? "partido marcado" : "partidos marcados"} como ${saved === 1 ? "pendiente" : "pendientes"}.`;
      const message = refreshFailed ? `${summary} Actualiza la página para verificar los cambios.` : summary;
      if (failed === matches.length) notify.error(message);
      else if (failed || refreshFailed) notify.warning(message);
      else notify.success(message);
    } catch (error) {
      setMatchesToMarkPending(null);
      notify.error(error?.message || "No se pudieron marcar los partidos como pendientes.");
    } finally {
      setBulkPendingProgress(null);
    }
  };

  const handleSaveResult = useCallback(
    async (id, request) => {
      setSavingResultMatchId(id);
      try {
        if (typeof onMatchUpdate !== "function") throw new Error("No se puede guardar el resultado.");
        const managedMatch = managedResultType ? selectedMatchResult : null;
        const result = await onMatchUpdate(id, managedMatch
          ? buildPendingMatchResultRequest(managedMatch, request) : request);
        if (managedResultType === "pending") {
          removeResolvedPendingMatch(id, managedMatch.originJornadaId);
          setPendingMatchesModalOpen(false);
          const sourceIndex = jornadas.findIndex((round) => String(round.id) === String(managedMatch.originJornadaId));
          if (sourceIndex >= 0) await onChangeJornada?.(sourceIndex, { smooth: true });
        }
        return result;
      } finally {
        setSavingResultMatchId(null);
      }
    },
    [onMatchUpdate, managedResultType, selectedMatchResult, removeResolvedPendingMatch, jornadas, onChangeJornada]
  );

  const handleResetMatchResult = useCallback(async () => {
    if (!matchToResetResult?.id || resettingResultMatchId) return;

    const matchBeingReset = matchToResetResult;
    setResettingResultMatchId(matchToResetResult.id);
    try {
      const resetResult = await onResetMatchResult?.(
        matchToResetResult.id,
        matchBeingReset.result_revision,
      );
      const resetRevision = resetResult?.match?.result_revision;

      const resetStatus = matchBeingReset.date ? "Programado" : "Pendiente";
      const resetMatch = (match) =>
        String(match?.id) === String(matchBeingReset.id)
          ? {
              ...match,
              status: resetStatus,
              goals1: null,
              goals2: null,
              puntos1: null,
              puntos2: null,
              referee_id: null,
              observations: null,
              result_revision: resetRevision ?? match.result_revision,
              resolution: null,
              isModified: false,
            }
          : match;

      // Mantiene el borrador coherente incluso si el usuario deshace la
      // jornada inmediatamente despues de limpiar el resultado.
      setScheduledMatches((matches) => matches.map(resetMatch));
      setAllPendingMatches((matches) => matches.map(resetMatch));
      setMatchToResetResult(null);
      notify.success("Resultado deshecho. El partido vuelve a quedar pendiente.");
    } catch (error) {
      notify.error(
        isMatchResultConflictError(error)
          ? error?.resultRefreshFailed
            ? "No se deshizo el resultado porque otro dispositivo ya actualizó el partido. No se pudo recargar la jornada; actualiza la página antes de volver a editarlo."
            : "No se deshizo el resultado porque otro dispositivo ya actualizó el partido. Revisa la versión vigente."
          : error?.message || "No se pudo deshacer el resultado",
      );
    } finally {
      setResettingResultMatchId(null);
    }
  }, [
    matchToResetResult,
    onResetMatchResult,
    resettingResultMatchId,
    setAllPendingMatches,
    setScheduledMatches,
  ]);

  const handleResolveMatch = (resolution) => {
    if (!matchToResolve) return;
    const updated = allPendingMatches.map((match) =>
      match.id === matchToResolve.id
        ? { ...match, resolution, isModified: true }
        : match
    );
    setAllPendingMatches(updated);
  };

  const handleClearResolution = (matchId) => {
    const updated = allPendingMatches.map((match) =>
      match.id === matchId
        ? { ...match, resolution: null, isModified: true }
        : match
    );
    setAllPendingMatches(updated);
  };

  useEffect(() => {
    if (!selectedPendingMatch) return;

    const isStillAvailable = sidebarMatches.some(
      (match) => match.id === selectedPendingMatch.id && !match.resolution
    );

    if (!isStillAvailable) {
      setSelectedPendingMatch(null);
    }
  }, [selectedPendingMatch, sidebarMatches]);

  useEffect(() => {
    if (!isTapSelectionEnabled) {
      setSelectedPendingMatch(null);
    }
  }, [isTapSelectionEnabled]);

  useEffect(() => {
    if (!isMobileViewport || viewMode !== "list") {
      setIsSidebarCollapsed(false);
      return;
    }

    setIsSidebarCollapsed(Boolean(selectedPendingMatch));
  }, [isMobileViewport, selectedPendingMatch, viewMode]);

  useEffect(() => {
    if (draggedMatch) {
      setSelectedPendingMatch(null);
    }
  }, [draggedMatch]);

  const clearDraggedMatch = useCallback(() => {
    setDraggedMatch(null);
    setIsDragOver(false);
  }, []);

  const toggleSelectedPendingMatch = useCallback(
    (match) => {
      if (!isTapSelectionEnabled || !match || match.resolution) return;
      setDraggedMatch(null);
      setIsDragOver(false);
      setSelectedPendingMatch((prev) =>
        prev?.id === match.id ? null : match
      );
    },
    [isTapSelectionEnabled]
  );

  const assignDraggedMatchToDate = useCallback(
    (targetDate = null) => {
      setIsDragOver(false);
      const pendingMatch = draggedMatch || selectedPendingMatch;
      if (!pendingMatch || isConfirmed) return;

      const baseStartDate = planningWindowStartDate || weekStartDate;
      const finalDate = targetDate || baseStartDate;

      const matchesOfTargetDate = scheduledMatches.filter(
        (match) => match.date === finalDate
      );
      const configStartHour = tournamentConfig?.horaInicio || "08:00";
      let nextTime = configStartHour;

      if (matchesOfTargetDate.length > 0) {
        const last = matchesOfTargetDate
          .sort((a, b) => (a.time || "").localeCompare(b.time || ""))
          .pop();

        if (last?.time) {
          const [h, m] = last.time.split(":").map(Number);
          const total = h * 60 + m + durationMatch;
          nextTime = `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(
            total % 60
          ).padStart(2, "0")}`;
        }
      }

      const newMatch = {
        ...pendingMatch,
        time: nextTime,
        date: finalDate,
        status: "Programado",
        isModified: true,
      };

      const newList = [...scheduledMatches, newMatch];
      setScheduledMatches(autoAdjustTimes(newList, finalDate));
      setAllPendingMatches(
        allPendingMatches.filter((match) => match.id !== pendingMatch.id)
      );
      setDraggedMatch(null);
      setSelectedPendingMatch(null);
    },
    [
      allPendingMatches,
      autoAdjustTimes,
      draggedMatch,
      durationMatch,
      isConfirmed,
      planningWindowStartDate,
      scheduledMatches,
      selectedPendingMatch,
      setAllPendingMatches,
      setScheduledMatches,
      tournamentConfig?.horaInicio,
      weekStartDate,
    ]
  );

  const handleDrop = (e, targetDate = null) => {
    e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
    assignDraggedMatchToDate(targetDate);
  };

  const handleUpdateDate = (matchId, newDate) => {
    const updatedList = scheduledMatches.map((match) =>
      match.id === matchId ? { ...match, date: newDate, isModified: true } : match
    );
    setScheduledMatches(autoAdjustTimes(updatedList, newDate));
  };

  const parseDateTimeFromServerMessage = (msg) => {
    if (!msg) return null;
    const re = /(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/;
    const match = String(msg).match(re);
    if (!match) return null;
    return { date: match[1], time: match[2].slice(0, 5) };
  };

  const handleConfirmJornada = async () => {
    if (isRepositionMode && (!repositionWeek.startDate || !repositionWeek.endDate)) {
      notify.error("Define el inicio y fin de la semana de reposicion");
      return;
    }

    setIsCheckingConflicts(true);
    try {
      const rawExternalData = await fetchExternalMatches(planningReferenceStartDate);
      const currentJornadaId = jornadaData?.id;
      const currentTournamentId = activeTournament?.id;

      const filteredExternalData = rawExternalData.filter((ext) => {
        if (currentJornadaId && String(ext.jornada_id) === String(currentJornadaId)) {
          return false;
        }
        if (currentTournamentId && String(ext.original_id).includes(currentTournamentId)) {
          return false;
        }
        return true;
      });

      const detectedConflicts = findScheduleConflicts(
        editableScheduledMatches,
        filteredExternalData,
        durationMatch
      );

      if (detectedConflicts.length > 0) {
        setConflictsFound(detectedConflicts);
        setConflictModalOpen(true);
        setIsCheckingConflicts(false);
        return;
      }

      try {
        await Promise.resolve(
          onConfirm({
            jornada_id: jornadaData?.id,
            jornada_numero: currentJornadaNumber,
            jornada_name: jornadaData?.name,
            matches: editableScheduledMatches,
            allPendingMatches,
            repositionConfig: isRepositionMode
              ? {
                  enabled: true,
                  startDate: repositionWeek.startDate,
                  endDate: repositionWeek.endDate,
                  futureJornadaPreview,
                }
              : null,
          })
        );
        clearDraft();
        notify.success("Jornada confirmada correctamente");
      } catch (serverErr) {
        console.error("Error guardando:", serverErr);
        if (isMatchResultConflictError(serverErr)) {
          notify.warning(
            serverErr?.resultRefreshFailed
              ? "Otro dispositivo actualizó uno de los partidos. No se pudo recargar la jornada; actualiza la página antes de confirmarla de nuevo."
              : "Otro dispositivo actualizó uno de los partidos. La jornada se recargó con la versión vigente.",
          );
          return;
        }
        const serverMessage =
          serverErr?.message || serverErr?.error || String(serverErr);
        const dt = parseDateTimeFromServerMessage(serverMessage);

        if (dt) {
          const syntheticConflicts = scheduledMatches
            .filter((match) => !match.isReferenceOnly)
            .filter((internal) =>
              checkOverlap(
                internal,
                { date: dt.date, time: dt.time, duration: durationMatch },
                durationMatch
              )
            )
            .map((internal) => ({
              internal,
              external: {
                date: dt.date,
                time: dt.time,
                local_name: "Partido en BD",
                visitante_name: "",
                division_name: "Otra División",
              },
              duration: durationMatch,
            }));

          if (syntheticConflicts.length > 0) {
            setConflictsFound(syntheticConflicts);
            setConflictModalOpen(true);
          } else {
            notify.error(serverMessage);
          }
        } else {
          notify.error(serverMessage);
        }
        return;
      }
    } catch (err) {
      console.error(err);
      notify.error("Error verificando horarios");
    } finally {
      setIsCheckingConflicts(false);
    }
  };

  const sortedMatches = [...scheduledMatches].sort((a, b) => {
    const dateA = a.date || "9999-99-99";
    const dateB = b.date || "9999-99-99";

    if (dateA !== dateB) return dateA.localeCompare(dateB);

    const timeA = a.time || "99:99";
    const timeB = b.time || "99:99";
    return timeA.localeCompare(timeB);
  });

  const handleAutoFillWrapper = () => {
    if (window.confirm("¿Calcular fechas automáticamente?")) {
      onAutoFill(activeTournament.id, activeTournament.start_date);
    }
  };

  const handleOpenConfirmModal = () => {
    if (isRepositionMode) {
      setRepositionPlannerOpen(true);
      return;
    }

    setConfirmJornadaModalOpen(true);
  };

  const handleUndoJornadaConfirmation = async () => {
    if (!canUndoJornadaConfirmation || isUndoingConfirmation) return;

    saveDraft(
      { scheduledMatches, allPendingMatches },
      { includeInitialVersion: true }
    );
    setIsUndoingConfirmation(true);

    try {
      await onUndoConfirmation({
        jornadaId: jornadaData?.id,
        jornadaName: jornadaData?.name,
      });
      setUndoJornadaModalOpen(false);
      notify.success("Confirmacion deshecha. Puedes editar la jornada nuevamente.");
    } catch (error) {
      notify.error(error?.message || "No se pudo deshacer la confirmacion");
    } finally {
      setIsUndoingConfirmation(false);
    }
  };

  const handleChronologicalNavigation = useCallback(
    (nextChronologicalIndex) => {
      const targetJornada = chronologicalJornadas[nextChronologicalIndex];
      if (!targetJornada?.id) return;

      const targetSourceIndex = jornadas.findIndex(
        (jornada) => String(jornada.id) === String(targetJornada.id)
      );

      if (targetSourceIndex !== -1) {
        onChangeJornada(targetSourceIndex);
      }
    },
    [chronologicalJornadas, jornadas, onChangeJornada]
  );

  const handleSelectJornada = useCallback(
    (jornadaId) => {
      const targetIndex = chronologicalJornadas.findIndex(
        (jornada) => String(jornada.id) === String(jornadaId)
      );

      if (targetIndex !== -1) {
        handleChronologicalNavigation(targetIndex);
      }
    },
    [chronologicalJornadas, handleChronologicalNavigation]
  );

  if (!hasLoadedPlanningData) {
    return <JornadaPlanificacionSkeleton />;
  }

  return (
    <Container>
      <PlanningHeader
        jornadaIndex={jornadaIndex}
        jornadaData={headerJornadaData}
        status={
          isRepositionMode && !["Confirmada", "Finalizada"].includes(jornadaData?.status)
            ? "Jornada de Reposicion"
            : jornadaData?.status || "Pendiente"
        }
        onPrev={() =>
          handleChronologicalNavigation(Math.max(0, chronologicalJornadaIndex - 1))
        }
        onNext={() =>
          handleChronologicalNavigation(
            Math.min(chronologicalJornadas.length - 1, chronologicalJornadaIndex + 1)
          )
        }
        totalJornadas={totalJornadas}
        navigationIndex={chronologicalJornadaIndex}
        totalNavigationItems={chronologicalJornadas.length}
        jornadaOptions={selectableJornadas}
        selectedJornadaId={jornadaData?.id}
        onSelectJornada={handleSelectJornada}
        onSaveDates={onUpdateDates}
        onDateChange={handleRepositionHeaderDates}
        isRepositionMode={isRepositionMode}
        onAutoFill={handleAutoFillWrapper}
        onConfig={() => setConfigModalOpen(true)}
        viewMode={viewMode}
        onToggleView={setViewMode}
        onEditFixture={onEditFixture}
        isTournamentActive={isTournamentActive}
        needsDateNormalization={needsDateNormalization}
        onOpenDateNormalizer={onOpenDateNormalizer}
        onPrintBatch={() => setBatchPrintOpen(true)}
        matchesWithoutResultCount={matchesWithoutResult.length}
        confirmedResultsProgress={confirmedResultsProgress}
        jornadaDurationDays={jornadaDurationDays}
        pendingMatchesCount={managedMatches.pending.length + managedMatches.unresulted.length}
        onManagePendingMatches={() => setPendingMatchesModalOpen(true)}
      />

      {viewMode === "grid" && (
        <ControlsBar>
          <GhostButton onClick={toggleExternalMatches} $active={showExternalMatches}>
            {showExternalMatches ? <RiEyeOffLine /> : <RiEyeLine />}
            {showExternalMatches
              ? "Ocultar partidos de otras divisiones"
              : "Ver partidos de otras divisiones"}
            {loadingExternal && <span className="spinner">...</span>}
          </GhostButton>
          <GhostButton onClick={() => setScheduleExportOpen(true)}>
            <RiImageLine />
            Exportar rol
          </GhostButton>
          <span className="info-text">
            {showExternalMatches
              ? "Mostrando ocupación de canchas de TODAS las divisiones."
              : "Solo se muestran partidos de esta división."}
          </span>
        </ControlsBar>
      )}

      <TransitionWrapper key={jornadaIndex + viewMode}>
        <Workspace>
          {viewMode === "list" && (
            <PlanningSidebar
              matches={sidebarMatches}
              isConfirmed={isConfirmed}
              setDraggedMatch={setDraggedMatch}
              onDragEnd={clearDraggedMatch}
              jornadaIndex={jornadaIndex}
              currentJornadaNumber={currentJornadaNumber}
              onOpenResolution={handleOpenResolution}
              onClearResolution={handleClearResolution}
              isRepositionMode={isRepositionMode}
              isPlayoffMode={isPlayoffJornada}
              onSelectMatch={toggleSelectedPendingMatch}
              selectedMatchId={selectedPendingMatch?.id || null}
              isTapSelectionEnabled={isTapSelectionEnabled}
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={() =>
                setIsSidebarCollapsed((prev) => !prev)
              }
              canCollapse={isMobileViewport && viewMode === "list"}
            />
          )}

          <MainZone>
            {viewMode === "list" ? (
              <DropZone
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!isConfirmed) setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => handleDrop(e, null)}
                $isOver={isDragOver}
              >
                {isTapDropEnabled && selectedPendingMatch && (
                  <TapSelectionBanner>
                    <div className="copy">
                      <span className="title">Partido seleccionado</span>
                      <strong>{selectedPendingMatchLabel}</strong>
                      <small>Toca una fila o un dia para moverlo.</small>
                    </div>
                    <button
                      type="button"
                      aria-label="Cancelar selección de partido"
                      onClick={() => setSelectedPendingMatch(null)}
                      title="Cancelar seleccion"
                    >
                      <RiCloseLine />
                    </button>
                  </TapSelectionBanner>
                )}

                {sortedMatches.length === 0 ? (
                  <EmptyDropZone
                    isConfirmed={isConfirmed}
                    isDragOver={isDragOver}
                    draggedMatch={activePendingMatch}
                    jornadaStartDate={planningWindowStartDate}
                    jornadaEndDate={planningWindowEndDate}
                    jornadaDurationDays={jornadaDurationDays}
                    onDropDate={assignDraggedMatchToDate}
                    allowTapDrop={isTapDropEnabled}
                  />
                ) : (
                  <GridList>
                    {sortedMatches.map((match, idx, arr) => {
                      const prevMatch = arr[idx - 1];
                      const nextMatch = arr[idx + 1];
                      const isNewDay = !prevMatch || match.date !== prevMatch.date;

                      let groupLabel = null;
                      if (isNewDay) {
                        groupLabel = match.date
                          ? formatDateWithWeekday(match.date)
                          : "Partidos definidos sin fecha";
                      }

                      const isLastOfDate = !nextMatch || nextMatch.date !== match.date;

                      return (
                        <React.Fragment key={match.id}>
                          <ScheduledMatchRow
                            match={match}
                            groupLabel={groupLabel}
                            isConfirmed={isConfirmed}
                            jornadaStartDate={planningWindowStartDate}
                            jornadaEndDate={planningWindowEndDate}
                            timeStepMinutes={durationMatch}
                            timeMin={tournamentConfig?.horaInicio || ""}
                            timeMax={tournamentConfig?.horaFin || ""}
                            defaultTime={tournamentConfig?.horaInicio || "08:00"}
                            onDropOnDate={assignDraggedMatchToDate}
                            onTapDrop={assignDraggedMatchToDate}
                            onUpdateDate={(val) => handleUpdateDate(match.id, val)}
                            onUpdateTime={(val) => {
                              const updated = scheduledMatches.map((item) =>
                                item.id === match.id
                                  ? { ...item, time: val, isModified: true }
                                  : item
                              );
                              setScheduledMatches(updated);
                            }}
                            onRemove={() => {
                              setScheduledMatches(
                                scheduledMatches.filter((item) => item.id !== match.id)
                              );
                              setAllPendingMatches([
                                ...allPendingMatches,
                                {
                                  ...match,
                                  status: "Pendiente",
                                  date: null,
                                  time: null,
                                  isModified: true,
                                  resolution: null,
                                },
                              ]);
                            }}
                            onOpenResult={handleOpenResultModal}
                            onResetResult={
                              typeof onResetMatchResult === "function"
                                ? setMatchToResetResult
                                : undefined
                            }
                            isResettingResult={
                              String(resettingResultMatchId || "") === String(match.id)
                            }
                            onPostpone={(selected) => setMatchToPostpone(selected)}
                            isRepositionMode={isRepositionMode}
                            currentJornadaNumber={currentJornadaNumber}
                            isTapDropEnabled={isTapDropEnabled}
                            selectedPendingMatchLabel={selectedPendingMatchLabel}
                          />

                          {isLastOfDate && match.date && (
                            <DaySeparatorDropZone
                              baseDate={match.date}
                              onDropAction={assignDraggedMatchToDate}
                              isConfirmed={isConfirmed}
                              isTapDropEnabled={isTapDropEnabled}
                            />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </GridList>
                )}
              </DropZone>
            ) : (
              <WeeklyGridView
                weekStartDate={planningReferenceStartDate}
                scheduledMatches={scheduledMatches}
                externalMatches={externalMatches}
                divisionActual={
                  activeTournament?.division?.name || activeTournament?.divisions?.name
                }
                isConfirmed={isConfirmed}
                jornadaDurationDays={jornadaDurationDays}
              />
            )}
          </MainZone>
        </Workspace>
      </TransitionWrapper>

      <Footer>
        <div className="note">
          Duración Estimada: {durationMatch} min (Partido + Descanso)
        </div>
        <FooterActions>
          {!isConfirmed && (
            <Btnsave
              titulo={
                isCheckingConflicts
                  ? "Verificando..."
                  : isRepositionMode
                    ? "Confirmar Reposicion"
                    : "Confirmar Jornada"
              }
              funcion={handleOpenConfirmModal}
              icono={!isCheckingConflicts && <RiCheckDoubleLine />}
              bgcolor={
                canConfirm && !isCheckingConflicts
                  ? isRepositionMode
                    ? "#f39c12"
                    : v.colorPrincipal
                  : "#95a5a6"
              }
            />
          )}

          {canUndoJornadaConfirmation && (
            <Btnsave
              titulo={isUndoingConfirmation ? "Deshaciendo..." : "Deshacer confirmacion"}
              funcion={() => setUndoJornadaModalOpen(true)}
              icono={<RiArrowGoBackLine />}
              bgcolor="#e67e22"
              disabled={isUndoingConfirmation}
            />
          )}
        </FooterActions>
      </Footer>

      <TournamentConfigModal
        isOpen={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
        activeTournament={activeTournament}
        onSave={onSaveConfig}
        isVueltasLocked={isVueltasLocked}
        isStartDateLocked={isFirstJornadaConfirmed}
      />

      <PendingMatchesModal
        isOpen={pendingMatchesModalOpen}
        suspended={resultModalOpen || !!pendingMatchToCancel || !!matchToMarkPending || !!matchesToMarkPending}
        onClose={handleClosePendingMatches}
        matches={managedMatches.pending}
        unresultedMatches={managedMatches.unresulted}
        onOpenResult={handleOpenManagedResult}
        onCancelMatch={setPendingMatchToCancel}
        onMarkPending={setMatchToMarkPending}
        onMarkAllPending={setMatchesToMarkPending}
        busy={!!savingResultMatchId || !!cancelingPendingMatchId || !!markingPendingMatchId || !!bulkPendingProgress}
      />

      <ConfirmModal
        isOpen={!!pendingMatchToCancel}
        onClose={() => { if (!cancelingPendingMatchId) setPendingMatchToCancel(null); }}
        onConfirm={handleCancelPendingMatch}
        title="Cancelar pendiente"
        message="¿Marcar este partido como sin jugar?"
        subMessage={pendingMatchToCancel
          ? `${getMatchTeamsLabel(pendingMatchToCancel)} quedará en ${pendingMatchToCancel.originJornada}, sin marcador ni puntos. Dejará de aparecer como pendiente.`
          : ""}
        confirmText="Marcar sin jugar"
        loading={!!cancelingPendingMatchId}
        loadingMessage="Cancelando pendiente..."
        thinButtons
      />

      <ConfirmModal
        isOpen={!!matchToMarkPending}
        onClose={() => { if (!markingPendingMatchId) setMatchToMarkPending(null); }}
        onConfirm={handleMarkUnresultedPending}
        title="Marcar partido como pendiente"
        message="¿Quitar la programación de este partido?"
        subMessage={matchToMarkPending
          ? `${getMatchTeamsLabel(matchToMarkPending)} volverá a pendientes de ${matchToMarkPending.originJornada}, sin fecha ni horario.`
          : ""}
        confirmText="Marcar pendiente"
        loading={!!markingPendingMatchId}
        loadingMessage="Marcando pendiente..."
        thinButtons
      />

      <ConfirmModal
        isOpen={!!matchesToMarkPending}
        onClose={() => { if (!bulkPendingProgress) setMatchesToMarkPending(null); }}
        onConfirm={handleMarkAllUnresultedPending}
        title={matchesToMarkPending?.length === 1 ? "Marcar partido como pendiente" : "Marcar todos como pendientes"}
        message={matchesToMarkPending?.length === 1
          ? "¿Aplazar este partido sin resultado?"
          : `¿Aplazar ${matchesToMarkPending?.length || 0} partidos sin resultado?`}
        subMessage={matchesToMarkPending?.length === 1
          ? "Se quitarán su fecha y horario; el partido volverá a pendientes de su jornada de origen."
          : "Incluye todo el grupo, aunque la búsqueda oculte algunos. Se quitarán sus fechas y horarios; cada partido volverá a pendientes de su jornada de origen."}
        confirmText={matchesToMarkPending?.length === 1 ? "Marcar pendiente" : "Marcar todos pendientes"}
        loading={!!bulkPendingProgress}
        loadingMessage={bulkPendingProgress
          ? `Marcando pendientes: ${bulkPendingProgress.completed}/${bulkPendingProgress.total}`
          : "Marcando pendientes..."}
        thinButtons
      />

      <ResultModal
        isOpen={resultModalOpen}
        onClose={handleCloseResultModal}
        onBack={managedResultType ? handleCloseResultModal : undefined}
        match={selectedMatchResult}
        activeTournament={activeTournament}
        onSave={handleSaveResult}
        requireResult={!!managedResultType}
        defaultMatchDate={managedResultType === "pending" ? selectedMatchResult?.jornadas?.start_date : undefined}
      />

      <ConflictModal
        isOpen={conflictModalOpen}
        onClose={() => setConflictModalOpen(false)}
        conflicts={conflictsFound}
      />

      <BatchPrintModal
        isOpen={batchPrintOpen}
        onClose={() => setBatchPrintOpen(false)}
        matchesToPrint={matchesWithoutResult}
      />

      <ScheduleExportModal
        isOpen={scheduleExportOpen}
        onClose={() => setScheduleExportOpen(false)}
        weekStartDate={planningReferenceStartDate}
        scheduledMatches={scheduledMatches}
        externalMatches={showExternalMatches ? externalMatches : []}
        divisionActual={activeTournament?.division?.name || activeTournament?.divisions?.name}
        torneo={activeTournament}
        jornadaName={currentJornadaName}
        includeExternal={showExternalMatches}
        isConfirmed={isConfirmed}
      />

      <MatchResolutionModal
        key={`${matchToResolve?.id || "none"}-${resolutionModalOpen}`}
        isOpen={resolutionModalOpen}
        onClose={() => setResolutionModalOpen(false)}
        match={matchToResolve}
        onResolve={handleResolveMatch}
      />

      <RepositionPlannerModal
        isOpen={repositionPlannerOpen}
        onClose={() => setRepositionPlannerOpen(false)}
        onContinue={() => {
          if (!repositionWeek.startDate || !repositionWeek.endDate) {
            notify.error("Define el inicio y fin de la semana de reposicion");
            return;
          }

          setRepositionPlannerOpen(false);
          setConfirmJornadaModalOpen(true);
        }}
        startDate={repositionWeek.startDate}
        endDate={repositionWeek.endDate}
        suggestedStartDate={suggestedRepositionWindow.startDate}
        suggestedEndDate={suggestedRepositionWindow.endDate}
        jornadas={jornadas}
        jornadaIndex={jornadaIndex}
        futureJornadaPreview={futureJornadaPreview}
        onStartDateChange={(e) => {
          const startDate = e.target.value;
          setRepositionWeek({
            startDate,
            endDate: startDate ? addDaysToDate(startDate, jornadaDurationDays - 1) : "",
          });
        }}
        onEndDateChange={(e) => {
          const endDate = e.target.value;
          setRepositionWeek((prev) => ({
            startDate: prev.startDate,
            endDate,
          }));
        }}
      />

      <ConfirmModal
        isOpen={confirmJornadaModalOpen}
        onClose={() => setConfirmJornadaModalOpen(false)}
        onConfirm={() => {
          if (
            isRepositionMode &&
            (!repositionWeek.startDate || !repositionWeek.endDate)
          ) {
            notify.error("Define el inicio y fin de la semana de reposicion");
            return;
          }
          setConfirmJornadaModalOpen(false);
          handleConfirmJornada();
        }}
        title={isRepositionMode ? "Confirmar Jornada de Reposicion" : "Confirmar Jornada"}
        message={
          isRepositionMode
            ? "Define la semana de reposicion antes de publicar esta jornada."
            : "¿Estás seguro de confirmar y publicar esta jornada?"
        }
        confirmText={isRepositionMode ? "Publicar Reposicion" : "Publicar Jornada"}
        confirmColor={isRepositionMode ? "#f39c12" : v.colorPrincipal}
        confirmIcon={<RiCheckDoubleLine />}
        thinButtons={true}
      >
        <StatsContainer>
          {isRepositionMode ? (
            <StatBox $color="#f39c12">
              <span className="num">{pendingAfterRepositionConfirm}</span>
              <span className="lbl" style={{ textAlign: "center" }}>
                Quedaran Pendientes
              </span>
            </StatBox>
          ) : (
            <>
              <StatBox $color="#2ecc71">
                <span className="num">{editableScheduledMatches.length}</span>
                <span className="lbl">A Confirmar</span>
              </StatBox>

              <StatBox $color="#f39c12">
                <span className="num">{pendientesEstaJornada.length}</span>
                <span className="lbl" style={{ textAlign: "center" }}>
                  Sin Asignar
                  <br />
                  (Esta Jornada)
                </span>
              </StatBox>
            </>
          )}
        </StatsContainer>
        {isRepositionMode && nextJornadaPreview && (
          <ConfirmNote>
            La reposicion se publicará del{" "}
            <strong>{formatDateWithWeekday(repositionWeek.startDate)}</strong> al{" "}
            <strong>{formatDateWithWeekday(repositionWeek.endDate)}</strong>.{" "}
            {nextJornadaPreview.name} quedará del{" "}
            <strong>{formatDateWithWeekday(nextJornadaPreview.start_date)}</strong> al{" "}
            <strong>{formatDateWithWeekday(nextJornadaPreview.end_date)}</strong>.
          </ConfirmNote>
        )}
      </ConfirmModal>

      <ConfirmModal
        isOpen={undoJornadaModalOpen}
        onClose={() => {
          if (!isUndoingConfirmation) setUndoJornadaModalOpen(false);
        }}
        onConfirm={handleUndoJornadaConfirmation}
        title="Deshacer Confirmacion"
        message="Esta jornada volvera a modo editable."
        subMessage="Los partidos conservaran sus fechas y horarios actuales como borrador local."
        confirmText={isUndoingConfirmation ? "Deshaciendo..." : "Deshacer"}
        confirmColor="#e67e22"
        confirmIcon={<RiArrowGoBackLine />}
        thinButtons={true}
      />

      <ConfirmModal
        isOpen={!!matchToResetResult}
        onClose={() => {
          if (!resettingResultMatchId) setMatchToResetResult(null);
        }}
        onConfirm={handleResetMatchResult}
        title="Deshacer Resultado"
        message="Este partido volvera a quedar sin resultado."
        subMessage={
          matchToResetResult
            ? `${getMatchTeamsLabel(matchToResetResult)} conservara su fecha y hora, pero se borraran marcador, arbitro, observaciones y eventos.`
            : ""
        }
        confirmText={resettingResultMatchId ? "Deshaciendo..." : "Deshacer"}
        confirmColor="#e67e22"
        confirmIcon={<RiArrowGoBackLine />}
        thinButtons={true}
      />

      <ConfirmModal
        isOpen={!!matchToPostpone}
        onClose={() => setMatchToPostpone(null)}
        onConfirm={async () => {
          if (matchToPostpone) {
            await onMatchUpdate?.(matchToPostpone.id, {
              type: "atomic-result-save",
              expectedRevision: matchToPostpone.result_revision,
              events: null,
              updates: {
                status: "Pendiente",
                date: null,
              },
            });
            setMatchToPostpone(null);
          }
        }}
        title="Aplazar Partido"
        message="¿Deseas aplazar este partido?"
        subMessage={
          matchToPostpone
            ? `${matchToPostpone.local?.name || "Local"} VS ${
                matchToPostpone.visitante?.name || "Visitante"
              } regresará a la lista de pendientes.`
            : ""
        }
        confirmText="Aplazar"
        confirmColor="#f1c40f"
        confirmIcon={<RiTimeLine />}
        thinButtons={true}
      />
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  flex: 1 1 auto;
  height: 100%;
  min-height: 0;
`;

const TransitionWrapper = styled.div`
  animation: ${keyframes`
    from { opacity: 0; transform: translateX(20px); }
    to { opacity: 1; transform: translateX(0); }
  `} 0.4s both;
  width: 100%;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
`;

const Workspace = styled.div`
  display: flex;
  gap: 15px;
  flex: 1;
  min-height: 0;
  align-items: stretch;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const MainZone = styled.div`
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
`;

const DropZone = styled.div`
  flex: 1 1 auto;
  background: ${({ theme, $isOver }) => ($isOver ? `${theme.bg4}40` : theme.bgcards)};
  border: 2px dashed ${({ theme, $isOver }) => ($isOver ? v.colorPrincipal : theme.bg4)};
  border-radius: 10px;
  padding: 10px;
  overflow-y: auto;
  overflow-x: auto;
  padding-right: 15px;
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 0;
  transition: all 0.3s ease;
  ${customScrollbar}

  @media (min-width: 768px) {
    padding: 15px;
    padding-right: 20px;
  }
`;

const GridList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1 1 auto;
  min-height: 100%;
  padding-bottom: 5px;
`;

const TapSelectionBanner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  margin-bottom: 10px;
  border-radius: 10px;
  border: 1px solid ${v.colorPrincipal};
  background: ${v.colorPrincipal}12;
  color: ${({ theme }) => theme.text};

  .copy {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .title {
    font-size: 0.72rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: ${v.colorPrincipal};
  }

  strong {
    font-size: 0.9rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  small {
    font-size: 0.72rem;
    opacity: 0.75;
  }

  button {
    width: 34px;
    height: 34px;
    border: none;
    border-radius: 8px;
    background: ${({ theme }) => theme.bg3};
    color: ${({ theme }) => theme.text};
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
  }
`;

const Footer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 0 0 0;
  flex-shrink: 0;
  gap: 10px;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;

    .note {
      text-align: center;
    }
  }

  .note {
    font-size: 0.8rem;
    font-weight: 700;
    color: ${v.colorPrincipal};
    background: ${`${v.colorPrincipal}15`};
    padding: 8px 12px;
    border-radius: 8px;
  }
`;

const FooterActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    justify-content: center;
    width: 100%;

    button {
      width: 100%;
    }
  }
`;

const ControlsBar = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
  flex-shrink: 0;
  padding: 0 5px;
  animation: ${keyframes`
    from { opacity: 0; }
    to { opacity: 1; }
  `} 0.3s ease;

  .info-text {
    font-size: 0.85rem;
    color: ${({ theme }) => theme.text};
    opacity: 0.7;
    font-style: italic;
  }
`;

const GhostButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background: ${({ $active, theme }) => ($active ? theme.bgtotal : theme.bgcards)};
  color: ${({ $active, theme }) => ($active ? v.colorPrincipal : theme.text)};
  border: 1px solid ${({ $active, theme }) => ($active ? v.colorPrincipal : theme.bg4)};
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);

  &:hover {
    transform: translateY(-1px);
    border-color: ${v.colorPrincipal};
    color: ${v.colorPrincipal};
  }

  .spinner {
    animation: ${keyframes`
      0% { opacity: 0; }
      50% { opacity: 1; }
      100% { opacity: 0; }
    `} 1s infinite;
  }
`;

const StatsContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-top: 10px;
  width: 100%;
`;

const StatBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.bg3};
  padding: 15px;
  border-radius: 12px;
  border: 2px solid ${({ $color }) => `${$color}40`};
  min-width: 120px;

  .num {
    font-size: 2.5rem;
    font-weight: 800;
    color: ${({ $color }) => $color};
    line-height: 1;
    margin-bottom: 5px;
  }

  .lbl {
    font-size: 0.75rem;
    font-weight: 700;
    color: ${({ theme }) => theme.text};
    text-transform: uppercase;
    letter-spacing: 0.5px;
    opacity: 0.8;
  }
`;

const ConfirmNote = styled.div`
  width: 100%;
  margin-top: 14px;
  padding: 14px 16px;
  border-radius: 12px;
  background: rgba(243, 156, 18, 0.12);
  border: 1px solid rgba(243, 156, 18, 0.25);
  font-size: 0.88rem;
  line-height: 1.55;
  text-align: left;

  strong {
    color: #c57d0a;
  }
`;
