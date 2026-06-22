// src/components/organismos/tabs/torneos/JornadaPlanificacion.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import styled, { keyframes } from "styled-components";
import { v, Btnsave, Toast } from "../../../../index";
import {
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

import { PlanningHeader } from "./planificacion/PlanningHeader";
import { PlanningSidebar } from "./planificacion/PlanningSidebar";
import { ScheduledMatchRow } from "./planificacion/ScheduledMatchRow";
import { ResultModal } from "./planificacion/ResultModal";
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

const getMatchTeamsLabel = (match) => {
  if (!match) return "";
  const homeName = match.homeTeam?.name || match.local?.name || "Local";
  const awayName = match.awayTeam?.name || match.visitante?.name || "Visitante";
  return `${homeName} vs ${awayName}`;
};

export function JornadaPlanificacion({
  matchesDB = [],
  globalPendingMatches = [],
  teams,
  jornadaIndex,
  activeTournament,
  jornadaData,
  onConfirm,
  onChangeJornada,
  totalJornadas,
  onMatchUpdate,
  canConfirm,
  onSaveConfig,
  onEditFixture,
  isTournamentActive,
  dataVersion,
  jornadas = [],
  onUpdateDates,
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
    isPlanningDataReady,
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
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 768;
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [selectedMatchResult, setSelectedMatchResult] = useState(null);
  const [toast, setToast] = useState({ show: false, msg: "", type: "" });

  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [batchPrintOpen, setBatchPrintOpen] = useState(false);
  const [scheduleExportOpen, setScheduleExportOpen] = useState(false);

  const [repositionPlannerOpen, setRepositionPlannerOpen] = useState(false);
  const [confirmJornadaModalOpen, setConfirmJornadaModalOpen] = useState(false);
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
    const isPendingResult = match.status !== "Finalizado";
    return isSaved && isPendingResult;
  });

  const editableScheduledMatches = useMemo(
    () => scheduledMatches.filter((match) => !match.isReferenceOnly),
    [scheduledMatches]
  );

  const confirmedResultsProgress = useMemo(() => {
    const trackableMatches = scheduledMatches.filter(
      (match) => !match.isReferenceOnly && !match.isByeMatch
    );

    return {
      completed: trackableMatches.filter((match) => match.status === "Finalizado").length,
      total: trackableMatches.length,
    };
  }, [scheduledMatches]);

  const pendientesEstaJornada = sidebarMatches.filter(
    (match) => match.originJornada === currentJornadaName && !match.isByeMatch
  );
  const pendingAfterRepositionConfirm = sidebarMatches.filter((match) => {
    if (match.isByeMatch) return false;
    if (match.resolution?.type === "default") return false;
    return parseJornadaNumber(match.originJornada, currentJornadaNumber) < currentJornadaNumber;
  }).length;

  const suggestedRepositionWindow = useMemo(
    () =>
      getSuggestedRepositionWindow({
        jornadas,
        jornadaIndex,
        fallbackStartDate:
          jornadaData?.start_date || weekStartDate || activeTournament?.start_date,
      }),
    [activeTournament?.start_date, jornadaData?.start_date, jornadaIndex, jornadas, weekStartDate]
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
      }),
    [
      jornadaIndex,
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
    (planningWindowStartDate ? addDaysToDate(planningWindowStartDate, 6) : "");
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
      setToast({
        show: true,
        msg: "Define el inicio y fin de la semana de reposicion",
        type: "error",
      });
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
        setToast({
          show: true,
          msg: "Jornada confirmada correctamente",
          type: "success",
        });
      } catch (serverErr) {
        console.error("Error guardando:", serverErr);
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
            setToast({ show: true, msg: serverMessage, type: "error" });
          }
        } else {
          setToast({ show: true, msg: serverMessage, type: "error" });
        }
        return;
      }
    } catch (err) {
      console.error(err);
      setToast({ show: true, msg: "Error verificando horarios", type: "error" });
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

  if (!isPlanningDataReady) {
    return <JornadaPlanificacionSkeleton />;
  }

  return (
    <Container>
      <Toast
        show={toast.show}
        message={toast.msg}
        type={toast.type}
        onClose={() => setToast({ ...toast, show: false })}
      />

      <PlanningHeader
        jornadaIndex={jornadaIndex}
        jornadaData={headerJornadaData}
        status={
          isRepositionMode
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
                            onOpenResult={(selected) => {
                              setSelectedMatchResult(selected);
                              setResultModalOpen(true);
                            }}
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
              />
            )}
          </MainZone>
        </Workspace>
      </TransitionWrapper>

      <Footer>
        <div className="note">
          Duración Estimada: {durationMatch} min (Partido + Descanso)
        </div>
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
      </Footer>

      <TournamentConfigModal
        isOpen={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
        activeTournament={activeTournament}
        onSave={onSaveConfig}
        isVueltasLocked={isVueltasLocked}
        isStartDateLocked={isFirstJornadaConfirmed}
      />

      <ResultModal
        isOpen={resultModalOpen}
        onClose={() => setResultModalOpen(false)}
        match={selectedMatchResult}
        activeTournament={activeTournament}
        onSave={async (id, updates) => await onMatchUpdate?.(id, updates)}
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
            setToast({
              show: true,
              msg: "Define el inicio y fin de la semana de reposicion",
              type: "error",
            });
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
            endDate: startDate ? addDaysToDate(startDate, 6) : "",
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
            setToast({
              show: true,
              msg: "Define el inicio y fin de la semana de reposicion",
              type: "error",
            });
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
        isOpen={!!matchToPostpone}
        onClose={() => setMatchToPostpone(null)}
        onConfirm={async () => {
          if (matchToPostpone) {
            await onMatchUpdate?.(matchToPostpone.id, {
              status: "Pendiente",
              date: null,
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
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 0;
  transition: all 0.3s ease;

  @media (min-width: 768px) {
    padding: 15px;
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
