import React, { useMemo, useState } from "react";
import styled, { css } from "styled-components";
import { RiDragDropLine } from "react-icons/ri";
import { v } from "../../../../../styles/variables";
import { addDaysToDate } from "../../../../../utils/dateUtils";

const buildWeekDays = (startDate, endDate) => {
  if (!startDate) return [];

  const safeEndDate =
    endDate && endDate >= startDate ? endDate : addDaysToDate(startDate, 6);

  const dates = [];
  let cursor = startDate;
  let guard = 0;

  while (cursor <= safeEndDate && guard < 14) {
    dates.push(cursor);
    cursor = addDaysToDate(cursor, 1);
    guard += 1;
  }

  return dates;
};

const formatWeekday = (dateStr) => {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("es-MX", { weekday: "long" });
};

const formatShortDate = (dateStr) => {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
  });
};

const getMatchLabel = (match) => {
  if (!match) return "";

  const homeName = match.homeTeam?.name || match.local?.name || "Local";
  const awayName = match.awayTeam?.name || match.visitante?.name || "Visitante";

  return `${homeName} vs ${awayName}`;
};

export function WeekDaysDropLayout({
  startDate = "",
  endDate = "",
  onDropDate,
  draggedMatch = null,
  isHighlighted = false,
}) {
  const [hoveredDate, setHoveredDate] = useState("");

  const weekDays = useMemo(
    () => buildWeekDays(startDate, endDate),
    [endDate, startDate]
  );

  if (!weekDays.length) return null;

  const matchLabel = getMatchLabel(draggedMatch);

  return (
    <Container $isHighlighted={isHighlighted}>
      <div className="summary">
        <span className="summary-text">
          {matchLabel
            ? `Suelta ${matchLabel} en el dia que quieras`
            : "Suelta el partido en el dia que quieras"}
        </span>
      </div>

      <div className="days-list">
        {weekDays.map((date) => {
          const isHovered = hoveredDate === date;

          return (
            <button
              key={date}
              type="button"
              className={`day-card${isHovered ? " is-hovered" : ""}`}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setHoveredDate(date);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (hoveredDate !== date) setHoveredDate(date);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (hoveredDate === date) setHoveredDate("");
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setHoveredDate("");
                onDropDate?.(date);
              }}
            >
              <div className="day-main">
                <span className="day-name">
                  {formatWeekday(date)} <span className="day-date">{formatShortDate(date)}</span>
                </span>
              </div>
              <span className="day-hint">
                <RiDragDropLine />
                {isHovered ? "Soltar aqui" : "Soltar"}
              </span>
            </button>
          );
        })}
      </div>
    </Container>
  );
}

const Container = styled.div`
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0;

  .summary {
    min-height: 18px;
    padding: 0 4px;
  }

  .summary-text {
    display: inline-block;
    font-size: 0.74rem;
    color: ${({ theme }) => theme.text};
    opacity: 0.58;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .days-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
    min-height: 0;
  }

  .day-card {
    width: 100%;
    flex: 1 1 0;
    min-height: 0;
    border: 1px solid ${({ theme }) => theme.bg4};
    border-radius: 8px;
    background: ${({ theme }) => theme.bgtotal};
    color: ${({ theme }) => theme.text};
    padding: 8px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    text-align: left;
    cursor: copy;
    transition: 0.2s ease;
  }

  .day-card > * {
    pointer-events: none;
  }

  .day-card:hover {
    border-color: ${v.colorPrincipal};
    background: ${v.colorPrincipal}08;
  }

  .day-card.is-hovered {
    border-color: ${v.colorPrincipal};
    background: ${v.colorPrincipal}12;
  }

  .day-main {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .day-name {
    font-size: 0.96rem;
    font-weight: 700;
    text-transform: capitalize;
  }

  .day-date {
    font-size: 0.96rem;
    font-weight: 600;
    opacity: 0.82;
  }

  .day-hint {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
    font-size: 0.72rem;
    font-weight: 700;
    color: ${v.colorPrincipal};
    background: transparent;
    border: 1px dashed ${v.colorPrincipal}40;
    border-radius: 999px;
    padding: 5px 9px;
  }

  ${({ $isHighlighted }) =>
    $isHighlighted &&
    css`
      .summary-text {
        color: ${v.colorPrincipal};
        opacity: 0.85;
      }
    `}

  .day-card.is-hovered .day-hint {
    border-style: solid;
    background: ${v.colorPrincipal}12;
  }

  @media (max-width: 640px) {
    .day-card {
      align-items: flex-start;
      flex-direction: column;
      justify-content: center;
    }

    .day-hint {
      align-self: flex-start;
    }
  }
`;
