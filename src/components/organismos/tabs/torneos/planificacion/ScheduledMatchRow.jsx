import React, { memo, useMemo, useState, useRef } from "react";
import styled, { css } from "styled-components";
import { v } from "../../../../../index";
import { 
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiDeleteBinLine, 
  RiHandCoinLine,
  RiTrophyLine, 
  RiTimeLine, 
  RiEditLine, 
  RiFileTextLine,
  RiPrinterLine 
} from "react-icons/ri";
import { Device } from "../../../../../styles/breakpoints";
import { addDaysToDate, formatTimeTo12Hour, formatDateWithWeekday } from "../../../../../utils/dateUtils";
import { parseJornadaNumber } from "../../../../../utils/jornadaUtils";
import { RiArrowLeftUpLine, RiLinksLine, RiRouteLine } from "react-icons/ri";

// Importar los modales
import MatchSheetModal from "../exports/match-sheets/MatchSheetModal";
import { PreMatchSheetModal } from "../exports/match-sheets/PreMatchSheetModal";

const getPenaltyScore = (observations) => {
    if (!observations) return null;
    const regex = /Pen.*:\s*(\d+)\s*-\s*(\d+)/i;
    const match = observations.match(regex);
    if (match) {
        return { local: match[1], visit: match[2] };
    }
    return null;
};

const isWalkoverObservation = (observations) => (
    /victoria por default/i.test(String(observations || "")) ||
    /doble\s*w\.?o\.?/i.test(String(observations || "")) ||
    /ambos\s+pierden\s+por\s+default/i.test(String(observations || ""))
);

const isDoubleWalkoverObservation = (observations) => (
    /doble\s*w\.?o\.?/i.test(String(observations || "")) ||
    /ambos\s+pierden\s+por\s+default/i.test(String(observations || ""))
);

const normalizeTimeValue = (timeValue) => {
    if (!timeValue) return "";
    const match = String(timeValue).match(/^(\d{2}):(\d{2})/);
    if (!match) return "";
    return `${match[1]}:${match[2]}`;
};

const timeToMinutes = (timeValue) => {
    const normalized = normalizeTimeValue(timeValue);
    if (!normalized) return null;
    const [hours, minutes] = normalized.split(":").map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return (hours * 60) + minutes;
};

const minutesToTime = (totalMinutes) => {
    if (!Number.isFinite(totalMinutes)) return "";
    const normalizedMinutes = Math.max(0, Math.min((23 * 60) + 59, totalMinutes));
    const hours = String(Math.floor(normalizedMinutes / 60)).padStart(2, "0");
    const minutes = String(normalizedMinutes % 60).padStart(2, "0");
    return `${hours}:${minutes}`;
};

export const ScheduledMatchRow = memo(function ScheduledMatchRow({ 
    match, 
    isConfirmed, 
    jornadaStartDate = "",
    jornadaEndDate = "",
    timeStepMinutes = 0,
    timeMin = "",
    timeMax = "",
    defaultTime = "",
    onUpdateDate, 
    onUpdateTime, 
    onRemove, 
    onOpenResult, 
    onPostpone,
    groupLabel,
    onDropOnDate,
    currentJornadaNumber = 1,
    isTapDropEnabled = false,
    onTapDrop,
}) {
  
  const [isDragOver, setIsDragOver] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [showPreSheet, setShowPreSheet] = useState(false);
  const isReferenceOnly = Boolean(match.isReferenceOnly);
  const isWalkover = isWalkoverObservation(match.observations);
  const isDoubleWalkover = isDoubleWalkoverObservation(match.observations);
  
  // Referencia para evitar parpadeos en DnD
  const dragCounter = useRef(0);

  const penalties = useMemo(() => {
      if (isConfirmed && match.status === 'Finalizado') {
          return getPenaltyScore(match.observations);
      }
      return null;
  }, [match.observations, match.status, isConfirmed]);

  const isDraggedDelayedMatch = useMemo(() => {
      if (!match.originJornada || match.isReferenceOnly || match.isRepositionScheduled) {
          return false;
      }
      return parseJornadaNumber(match.originJornada, currentJornadaNumber) < currentJornadaNumber;
  }, [
      currentJornadaNumber,
      match.isReferenceOnly,
      match.isRepositionScheduled,
      match.originJornada,
  ]);

  const handleDragEnter = (e) => {
      e.preventDefault();
      if (!isConfirmed && !isReferenceOnly) {
          dragCounter.current += 1;
          if (dragCounter.current === 1) setIsDragOver(true);
      }
  };

  const handleDragOver = (e) => {
      e.preventDefault(); 
  };

  const handleDragLeave = (e) => {
      e.preventDefault();
      if (!isConfirmed && !isReferenceOnly) {
          dragCounter.current -= 1;
          if (dragCounter.current === 0) setIsDragOver(false);
      }
  };

  const handleDrop = (e) => {
      e.preventDefault();
      dragCounter.current = 0; 
      setIsDragOver(false);
      
      if (!isConfirmed && !isReferenceOnly && onDropOnDate && match.date) {
          e.stopPropagation();
          onDropOnDate(match.date);
      }
  };

  const handleSaveSheet = (sheetData) => {
    console.log("Cédula guardada/actualizada:", sheetData);
    setShowSheet(false);
  };

  const displayLabel = (!match.date || String(groupLabel).includes('Invalid') || String(groupLabel).includes('NaN')) 
      ? 'Partidos definidos sin fecha (Default)' 
      : groupLabel;
  const draggedBadgeLabel = isDraggedDelayedMatch
      ? `Desde ${match.originJornada || "Jornada anterior"}`
      : "";
  const draggedBadgeShortLabel = isDraggedDelayedMatch
      ? `De J${parseJornadaNumber(match.originJornada, currentJornadaNumber)}`
      : "";
  const isReferenceBadge = Boolean(match.playedInJornada);
  const isConfirmedRepositionBadge = Boolean(
      match.isRepositionScheduled && match.originJornada
  );
  const hasFloatingOriginBadge =
      isReferenceBadge || isDraggedDelayedMatch || isConfirmedRepositionBadge;
  const floatingBadgeLabel = isReferenceBadge
      ? `Se jugo en ${match.playedInJornada}`
      : isConfirmedRepositionBadge
        ? `Pendiente de ${match.originJornada}`
        : draggedBadgeLabel;
  const floatingBadgeShortLabel = isReferenceBadge
      ? `En ${match.playedInJornada}`
      : isConfirmedRepositionBadge
        ? `Pend. J${parseJornadaNumber(match.originJornada, currentJornadaNumber)}`
        : draggedBadgeShortLabel;
  const floatingBadgeClassName = isReferenceBadge
      ? "origin-badge is-reference is-floating"
      : isConfirmedRepositionBadge
        ? "origin-badge is-reposition is-floating"
        : "origin-badge is-delayed is-floating";
  const FloatingBadgeIcon = isReferenceBadge
      ? RiLinksLine
      : isConfirmedRepositionBadge
        ? RiRouteLine
        : RiArrowLeftUpLine;
  const hasDateBounds =
      Boolean(jornadaStartDate && jornadaEndDate) &&
      jornadaStartDate <= jornadaEndDate;
  const isDateWithinBounds =
      hasDateBounds &&
      Boolean(match.date) &&
      match.date >= jornadaStartDate &&
      match.date <= jornadaEndDate;
  const dateMin = isDateWithinBounds ? jornadaStartDate : undefined;
  const dateMax = isDateWithinBounds ? jornadaEndDate : undefined;
  const previousDate = match.date ? addDaysToDate(match.date, -1) : "";
  const nextDate = match.date ? addDaysToDate(match.date, 1) : "";
  const canMoveDateBackward =
      Boolean(match.date) &&
      !isReferenceOnly &&
      (!dateMin || previousDate >= dateMin);
  const canMoveDateForward =
      Boolean(match.date) &&
      !isReferenceOnly &&
      (!dateMax || nextDate <= dateMax);

  const safeTimeStep = useMemo(() => {
      const parsed = parseInt(timeStepMinutes, 10);
      return Number.isNaN(parsed) || parsed <= 0 ? 105 : parsed;
  }, [timeStepMinutes]);
  const normalizedTimeMin = normalizeTimeValue(timeMin);
  const normalizedTimeMax = normalizeTimeValue(timeMax);
  const rawCurrentTime = normalizeTimeValue(match.time);
  const fallbackTime = normalizeTimeValue(defaultTime || normalizedTimeMin);
  const baseTimeValue = rawCurrentTime || fallbackTime;
  const baseTimeMinutes = timeToMinutes(baseTimeValue);
  const minTimeMinutes = timeToMinutes(normalizedTimeMin);
  const maxTimeMinutes = timeToMinutes(normalizedTimeMax);
  const hasValidTimeBounds =
      minTimeMinutes !== null &&
      maxTimeMinutes !== null &&
      minTimeMinutes <= maxTimeMinutes;
  const isTimeWithinBounds =
      hasValidTimeBounds &&
      baseTimeMinutes !== null &&
      baseTimeMinutes >= minTimeMinutes &&
      baseTimeMinutes <= maxTimeMinutes;
  const inputTimeMin = isTimeWithinBounds ? normalizedTimeMin : undefined;
  const inputTimeMax = isTimeWithinBounds ? normalizedTimeMax : undefined;
  const effectiveTimeMin = isTimeWithinBounds ? minTimeMinutes : 0;
  const effectiveTimeMax = isTimeWithinBounds ? maxTimeMinutes : (23 * 60) + 59;
  const canMoveTimeBackward =
      Boolean(baseTimeValue) &&
      !isReferenceOnly &&
      (
          !rawCurrentTime ||
          (baseTimeMinutes !== null && (baseTimeMinutes - safeTimeStep) >= effectiveTimeMin)
      );
  const canMoveTimeForward =
      Boolean(baseTimeValue) &&
      !isReferenceOnly &&
      (
          !rawCurrentTime ||
          (baseTimeMinutes !== null && (baseTimeMinutes + safeTimeStep) <= effectiveTimeMax)
      );
  const canAcceptTapDrop =
      isTapDropEnabled &&
      !isConfirmed &&
      !isReferenceOnly &&
      Boolean(match.date) &&
      typeof onTapDrop === "function";
  const handleShiftDate = (days) => {
      if (isReferenceOnly || !match.date) return;

      const nextValue = addDaysToDate(match.date, days);
      if (days < 0 && !canMoveDateBackward) return;
      if (days > 0 && !canMoveDateForward) return;

      onUpdateDate(nextValue);
  };

  const handleShiftTime = (direction) => {
      if (isReferenceOnly || !baseTimeValue) return;

      if (!rawCurrentTime) {
          onUpdateTime(baseTimeValue);
          return;
      }

      const nextMinutes = baseTimeMinutes + (direction * safeTimeStep);
      if (nextMinutes < effectiveTimeMin || nextMinutes > effectiveTimeMax) return;

      onUpdateTime(minutesToTime(nextMinutes));
  };

  return (
    <>
        <Wrapper 
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {groupLabel && (
                <DateDivider>
                    <span>{displayLabel}</span>
                    <div className="line"></div>
                </DateDivider>
            )}

            <Container
                $isConfirmed={isConfirmed}
                $isDragOver={isDragOver}
                $hasFloatingBadge={hasFloatingOriginBadge}
            >
                {isDragOver && match.date && <DropOverlay>Añadir a esta fecha (+{formatDateWithWeekday(match.date)})</DropOverlay>}
                {canAcceptTapDrop && (
                    <TapDropOverlay
                        type="button"
                        onClick={() => onTapDrop(match.date)}
                        aria-label={`Mover a ${formatDateWithWeekday(match.date)}`}
                        title={`Mover a ${formatDateWithWeekday(match.date)}`}
                    >
                        <RiHandCoinLine />
                    </TapDropOverlay>
                )}

                {hasFloatingOriginBadge && (
                    <div className={floatingBadgeClassName}>
                        <FloatingBadgeIcon />
                        <span className="label-desktop">{floatingBadgeLabel}</span>
                        <span className="label-mobile">{floatingBadgeShortLabel}</span>
                    </div>
                )}

                <div className="content">
                    <div className="info">
                        <div className="team local">
                            <span className="name">{match.homeTeam?.name || match.local?.name || "Equipo Local"}</span>
                            {isConfirmed && match.status === 'Finalizado' && (
                                <ScoreWrapper>
                                    <span className="main-score">{match.goals1 || match.homeScore || 0}</span>
                                    {penalties && <span className="pen-score">({penalties.local})</span>}
                                </ScoreWrapper>
                            )}
                        </div>

                        <span className="vs">VS</span>

                        <div className="team visit">
                            {isConfirmed && match.status === 'Finalizado' && (
                                <ScoreWrapper>
                                    <span className="main-score">{match.goals2 || match.awayScore || 0}</span>
                                    {penalties && <span className="pen-score">({penalties.visit})</span>}
                                </ScoreWrapper>
                            )}
                            <span className="name">{match.awayTeam?.name || match.visitante?.name || "Equipo Visitante"}</span>
                        </div>
                    </div>

                </div>

                <div className="settings">
                    {isConfirmed ? (
                        <div className="confirmed-actions">
                            <div className="datetime-display">
                                {match.date ? (
                                    <>
                                        <span className="date-text mobile-only">{formatDateWithWeekday(match.date)}</span>
                                        <small>{formatTimeTo12Hour(match.time)}</small>
                                        {isWalkover && (
                                            <span className="wo-badge-small" style={{ fontSize: '0.7rem', background: '#e74c3c20', color: '#e74c3c', padding: '2px 6px', borderRadius: '4px', marginLeft: '5px', fontWeight: 'bold' }}>
                                                {isDoubleWalkover ? 'Doble W.O.' : 'W.O.'}
                                            </span>
                                        )}
                                    </>
                                ) : (
                                    <span className="no-date-badge">
                                        {isDoubleWalkover ? 'Doble W.O.' : isWalkover ? 'Victoria Default' : 'Sin Fecha'}
                                    </span>
                                )}
                            </div>
                            <div className="btns-row">
                                <button className="action-btn result" onClick={() => onOpenResult(match)}>
                                    {match.status === 'Finalizado' ? <RiEditLine /> : <RiTrophyLine />}
                                    {match.status === 'Finalizado' ? 'Editar' : 'Resultado'}
                                </button>
                                
                                {match.status === 'Finalizado' ? (
                                    <button className="action-btn sheet" onClick={() => setShowSheet(true)}>
                                        <RiFileTextLine />
                                        Ver Cédula
                                    </button>
                                ) : (
                                    <>
                                        <button 
                                            className="action-btn print" 
                                            onClick={() => setShowPreSheet(true)}
                                            title="Imprimir Hoja de Alineación para Árbitro"
                                        >
                                            <RiPrinterLine />
                                            Pre-Cédula
                                        </button>

                                        <button className="action-btn postpone" onClick={() => onPostpone(match)}>       
                                            <RiTimeLine />
                                            Aplazar
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ) : (
                        <>
                            {match.date ? (
                                <>
                                    <div className="input-control input-date-control">
                                        <button
                                            type="button"
                                            className="step-btn"
                                            onClick={() => handleShiftDate(-1)}
                                            disabled={!canMoveDateBackward}
                                            title="Regresar un día"
                                        >
                                            <RiArrowLeftSLine />
                                        </button>
                                        <input 
                                            type="date" 
                                            className="input-date" 
                                            value={match.date || ''} 
                                            min={dateMin}
                                            max={dateMax}
                                            onChange={(e)=> onUpdateDate(e.target.value)}
                                            disabled={isReferenceOnly}
                                        />
                                        <button
                                            type="button"
                                            className="step-btn"
                                            onClick={() => handleShiftDate(1)}
                                            disabled={!canMoveDateForward}
                                            title="Avanzar un día"
                                        >
                                            <RiArrowRightSLine />
                                        </button>
                                    </div>
                                    <div className="input-control input-time-control">
                                        <button
                                            type="button"
                                            className="step-btn"
                                            onClick={() => handleShiftTime(-1)}
                                            disabled={!canMoveTimeBackward}
                                            title={`Restar ${safeTimeStep} min`}
                                        >
                                            <RiArrowLeftSLine />
                                        </button>
                                        <input 
                                            type="time" 
                                            className="input-time" 
                                            value={match.time || ''} 
                                            min={inputTimeMin}
                                            max={inputTimeMax}
                                            onChange={(e)=> onUpdateTime(e.target.value)}
                                            disabled={isReferenceOnly}
                                        />
                                        <button
                                            type="button"
                                            className="step-btn"
                                            onClick={() => handleShiftTime(1)}
                                            disabled={!canMoveTimeForward}
                                            title={`Sumar ${safeTimeStep} min`}
                                        >
                                            <RiArrowRightSLine />
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="no-date-control">
                                    <span className="no-date-badge">Victoria Default</span>
                                </div>
                            )}
                            {!isReferenceOnly && (
                                <button className="del" onClick={onRemove} title="Desagendar">
                                    <RiDeleteBinLine/>
                                </button>
                            )}
                        </>
                    )}
                </div>
            </Container>
        </Wrapper>

        <MatchSheetModal 
            isOpen={showSheet} 
            onClose={() => setShowSheet(false)} 
            match={match}
            onSaveSheet={handleSaveSheet}
        />

        {showPreSheet && (
             <PreMatchSheetModal 
                isOpen={showPreSheet}
                onClose={() => setShowPreSheet(false)}
                matchId={match.id}
            />
        )}
    </>
  );
});

// --- ESTILOS ---
const Wrapper = styled.div`
    width: 100%;
    display: flex; flex-direction: column; gap: 10px; position: relative; 
    flex-shrink: 0; 
`;

const DateDivider = styled.div`
    display: flex; align-items: center; gap: 15px; padding-top: 15px; padding-bottom: 5px; width: 100%;
    span { font-weight: 800; color: ${({theme})=>theme.text1}; font-size: 1rem; text-transform: capitalize; white-space: nowrap; }
    .line { height: 1px; background: ${({theme})=>theme.bg4}; width: 100%; flex: 1; }
`;

const ScoreWrapper = styled.div`
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    background: ${({theme})=>theme.bg3}; padding: 2px 8px; border-radius: 4px; min-width: 30px;
    flex-shrink: 0;
    .main-score { font-size: 1.1rem; font-weight: 700; line-height: 1.2; }
    .pen-score { font-size: 0.75rem; font-weight: 600; color: ${({theme})=>theme.text}; opacity: 0.7; margin-top: -2px; }
`;

const DropOverlay = styled.div`
    position: absolute; top: 0; left: 0; right: 0; bottom: 0;
    background: ${v.colorPrincipal}20; border: 2px dashed ${v.colorPrincipal}; border-radius: 8px;
    display: flex; align-items: center; justify-content: center; font-weight: 800; color: ${v.colorPrincipal};
    z-index: 10; backdrop-filter: blur(2px); pointer-events: none; 
`;

const TapDropOverlay = styled.button`
    position: absolute;
    top: 8px;
    right: 8px;
    width: 30px;
    height: 30px;
    border: 1px solid ${v.colorPrincipal};
    border-radius: 8px;
    background: ${({ theme }) => theme.bg3};
    color: ${v.colorPrincipal};
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    cursor: pointer;
    z-index: 6;
    box-shadow: 0 2px 8px rgba(0,0,0,0.16);

    svg {
        font-size: 0.95rem;
    }
`;

const Container = styled.div`
    display: flex; flex-direction: column; 
    gap: 8px; 
    background: ${({theme})=>theme.bgtotal}; 
    padding: ${({ $hasFloatingBadge }) =>
        $hasFloatingBadge ? '28px 10px 10px 10px' : '10px'}; 
    border-radius: 8px; 
    border: 1px solid ${({theme, $isConfirmed})=> $isConfirmed ? '#2ecc7140' : theme.bg4}; width: 100%;
    position: relative; transition: all 0.2s ease; overflow: hidden;

    ${({ $isDragOver }) => $isDragOver && css`
        border-color: ${v.colorPrincipal}; transform: scale(1.01); box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    `}
    
    @media ${Device.tablet} {
        display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, auto); align-items: center; gap: 12px;
        padding: ${({ $hasFloatingBadge }) =>
            $hasFloatingBadge ? '18px 12px 10px 12px' : '10px 12px'};
    }

    @media (min-width: 768px) and (max-width: 1024px) {
        grid-template-columns: minmax(0, 1fr);
        align-items: stretch;
    }

    .content {
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-width: 0;
    }

    .info { 
        display: flex; gap: 10px; font-weight: 600; justify-content: space-between; align-items: center; width: 100%; min-width: 0;
        .team { display: flex; align-items: center; gap: 8px; flex: 1 1 0; min-width: 0; overflow: hidden; }
        .name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.9rem; line-height: 1.25; min-width: 0; }
        .local { justify-content: flex-start; text-align: left; order: 1; }
        .visit { justify-content: flex-end; text-align: right; order: 3; }
        .vs { order: 2; font-size: 0.8rem; opacity: 0.6; flex-shrink: 0; }
        @media (max-width: 480px) {
            gap: 6px;
            .team { gap: 5px; }
            .name { font-size: 0.82rem; }
            .vs { font-size: 0.72rem; }
        }
        @media ${Device.tablet} {
            justify-content: center;
            .local { justify-content: flex-end; text-align: right; }
            .visit { justify-content: flex-start; text-align: left; }
        }
    }

    .settings { 
        display: flex; gap: 8px; width: 100%; justify-content: space-between; min-width: 0;
        @media ${Device.tablet} { width: auto; max-width: 100%; justify-content: flex-end; align-items: center; flex-shrink: 0; }
        @media (min-width: 768px) and (max-width: 1024px) {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
            align-items: stretch;
            width: 100%;
            justify-content: stretch;
        }
        .input-control {
            display: flex;
            align-items: stretch;
            flex: 1;
            min-width: 0;
            width: 100%;
            max-width: 100%;
            background: ${({theme})=>theme.bg3};
            border: 1px solid ${({theme})=>theme.bg4};
            border-radius: 6px;
            overflow: hidden;

            @media ${Device.tablet} {
                flex: none;
            }
        }
        .input-control input {
            background: transparent;
            border: none;
            color: ${({theme})=>theme.text};
            padding: 8px 6px;
            flex: 1;
            min-width: 0;
            width: 1px;
            max-width: 100%;
            font-size: 0.9rem;
            text-align: center;
            box-sizing: border-box;

            @media ${Device.tablet} {
                padding: 5px 8px;
                font-size: 0.95rem;
            }

            &:focus {
                outline: 1px solid ${v.colorPrincipal};
                outline-offset: -1px;
            }
        }
        .input-date,
        .input-time {
            min-width: 0;
            width: 1px;
            max-width: 100%;
        }
        .step-btn {
            width: 34px;
            border: none;
            background: ${({theme})=>theme.bg3};
            color: ${({theme})=>theme.text};
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: 0.2s;
            flex-shrink: 0;
            font-size: 1.05rem;

            &:first-child {
                border-right: 1px solid ${({theme})=>theme.bg4};
            }

            &:last-child {
                border-left: 1px solid ${({theme})=>theme.bg4};
            }

            &:hover:not(:disabled) {
                background: ${v.colorPrincipal}15;
                color: ${v.colorPrincipal};
            }

            &:disabled {
                opacity: 0.35;
                cursor: not-allowed;
            }
        }
        .input-date-control {
            @media ${Device.tablet} {
                width: 212px;
            }
            @media (min-width: 768px) and (max-width: 1024px) {
                width: auto;
            }
        }
        .input-time-control {
            @media ${Device.tablet} {
                width: 198px;
            }
            @media (min-width: 768px) and (max-width: 1024px) {
                width: auto;
            }
        }
        .del { 
            background: #e74c3c20; color: #e74c3c; border: none; border-radius: 6px; cursor: pointer; padding: 8px 12px;
            display: flex; align-items: center; justify-content: center; transition: 0.2s; flex-shrink: 0;
            &:hover { background: #e74c3c; color: white; }
        } 
        .no-date-control {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 0;
        }
        .no-date-badge {
            font-weight: 800;
            color: #e74c3c;
            background: #e74c3c20;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 0.8rem;
            text-align: center;
            white-space: nowrap;
            border: 1px solid #e74c3c40;
        }
        .confirmed-actions { 
            display: flex; align-items: stretch; gap: 10px; width: 100%; flex-direction: column; min-width: 0; 
            @media (min-width: 640px) { flex-direction: row; justify-content: space-between; align-items: center; }
            @media ${Device.tablet} { width: auto; max-width: 100%; gap: 15px; }
            @media (min-width: 768px) and (max-width: 1024px) { width: 100%; }
            
            .datetime-display { 
                display: flex; flex-direction: row; gap: 8px; align-items: center; font-size: 0.85rem; opacity: 0.9; width: 100%;
                justify-content: center; background: ${({theme})=>theme.bg3}; padding: 5px 10px; border-radius: 6px;
                min-width: 0; flex-wrap: wrap; text-align: center;
                @media ${Device.tablet} { background: transparent; padding: 0; flex-direction: column; align-items: flex-end; width: auto; gap: 2px; flex-wrap: nowrap; text-align: right; }
                @media (min-width: 768px) and (max-width: 1024px) { background: ${({theme})=>theme.bg3}; padding: 5px 10px; flex-direction: row; align-items: center; width: 100%; justify-content: center; flex-wrap: wrap; text-align: center; }
                .date-text { font-weight: 500; text-transform: capitalize; min-width: 0; &.mobile-only { @media (min-width: 1025px) { display: none; } } }
                small { font-weight: 700; color: ${v.colorPrincipal}; font-size: 0.95rem; } 
                .wo-badge-small { margin-left: 0 !important; }
                
                .no-date-badge {
                    font-size: 0.8rem;
                }
            }
            .btns-row {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(112px, 1fr));
                gap: 5px;
                width: 100%;
                min-width: 0;
                @media (min-width: 640px) { width: min(100%, 380px); }
                @media ${Device.tablet} { display: flex; width: auto; flex-wrap: wrap; justify-content: flex-end; }
                @media (min-width: 768px) and (max-width: 1024px) { width: 100%; display: grid; grid-template-columns: repeat(auto-fit, minmax(126px, 1fr)); justify-content: stretch; }
            }
            .action-btn { 
                border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center;
                gap: 5px; font-weight: 600; font-size: 0.8rem; flex: 1; transition: 0.2s; min-width: 0; white-space: nowrap;
                svg { flex-shrink: 0; }
                @media ${Device.tablet} { padding: 6px 12px; flex: 0 0 auto; }
                @media (min-width: 768px) and (max-width: 1024px) { flex: 1; }
                &.result { background: ${v.colorPrincipal}; color: white; &:hover{ filter: brightness(1.1); } }
                &.postpone { background: #f1c40f20; color: #f1c40f; &:hover{ background: #f1c40f; color: black; } }
                &.sheet { background: #3498db20; color: #3498db; &:hover{ background: #3498db; color: white; } }
                &.print { background: #95a5a620; color: #7f8c8d; &:hover{ background: #95a5a6; color: white; } }
            }
        }

        @media (max-width: 768px) {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
            align-items: stretch;

            .step-btn {
                width: 28px;
                font-size: 0.95rem;
            }

            .input-control input {
                padding: 8px 4px;
                font-size: 0.78rem;
            }

            .del {
                width: 38px;
                min-width: 38px;
                padding: 0;
            }

            .confirmed-actions,
            .no-date-control {
                grid-column: 1 / -1;
            }
        }

        @media (max-width: 560px) {
            grid-template-columns: minmax(0, 1fr) auto;

            .input-date-control {
                grid-column: 1 / -1;
            }

            .input-time-control {
                grid-column: 1 / 2;
            }

            .del {
                grid-column: 2 / 3;
                width: 38px;
                min-width: 38px;
                height: 100%;
            }

            .confirmed-actions .btns-row,
            .confirmed-actions .datetime-display {
                grid-column: 1 / -1;
            }
        }

        @media (max-width: 400px) {
            gap: 6px;

            .step-btn {
                width: 26px;
            }

            .input-control input {
                font-size: 0.74rem;
                padding: 8px 2px;
            }

            .del {
                width: 34px;
                min-width: 34px;
            }
        }
    }

    .badge-row {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        align-items: center;
        min-width: 0;
    }

    .origin-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        width: fit-content;
        background: linear-gradient(135deg, rgba(243, 156, 18, 0.18), rgba(243, 156, 18, 0.08));
        color: #f8c35c;
        border: 1px solid rgba(243, 156, 18, 0.34);
        border-radius: 999px;
        padding: 6px 11px;
        font-size: 0.74rem;
        font-weight: 800;
        letter-spacing: 0.2px;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
        max-width: 100%;
    }

    .origin-badge span {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .origin-badge svg {
        font-size: 0.9rem;
        flex-shrink: 0;
    }

    .origin-badge.is-reference {
        background: linear-gradient(135deg, rgba(52, 152, 219, 0.18), rgba(52, 152, 219, 0.08));
        color: #64c7ff;
        border-color: rgba(52, 152, 219, 0.34);
    }

    .origin-badge.is-reposition {
        background: linear-gradient(135deg, rgba(231, 76, 60, 0.16), rgba(231, 76, 60, 0.08));
        color: #ff8c7f;
        border-color: rgba(231, 76, 60, 0.3);
    }

    .origin-badge.is-floating {
        background: linear-gradient(135deg, rgba(243, 156, 18, 0.18), rgba(192, 120, 20, 0.08));
        color: #ffb347;
        border-color: rgba(243, 156, 18, 0.38);
        position: absolute;
        top: 6px;
        left: 10px;
        z-index: 5;
        padding: 2px 8px;
        font-size: 0.64rem;
        line-height: 1;
        max-width: calc(100% - 20px);
    }

    .origin-badge.is-floating svg {
        font-size: 0.78rem;
    }

    .origin-badge.is-reposition.is-floating {
        background: linear-gradient(135deg, rgba(231, 76, 60, 0.16), rgba(231, 76, 60, 0.08));
        color: #ff8c7f;
        border-color: rgba(231, 76, 60, 0.3);
    }

    .origin-badge.is-reference.is-floating {
        background: linear-gradient(135deg, rgba(52, 152, 219, 0.18), rgba(52, 152, 219, 0.08));
        color: #64c7ff;
        border-color: rgba(52, 152, 219, 0.34);
    }

    .origin-badge.is-floating .label-mobile {
        display: none;
    }

    @media (max-width: 768px) {
        .origin-badge.is-floating {
            top: 6px;
            left: 8px;
            padding: 2px 6px;
            font-size: 0.58rem;
            gap: 3px;
            max-width: calc(100% - 16px);
        }

        .origin-badge.is-floating svg {
            font-size: 0.7rem;
        }

        .origin-badge.is-floating .label-desktop {
            display: none;
        }

        .origin-badge.is-floating .label-mobile {
            display: inline;
        }
    }
`;
