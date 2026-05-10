import React, { useEffect, useState } from "react";
import styled from "styled-components";
import {
  RiArrowRightLine,
  RiCalendarCheckLine,
  RiCalendarEventLine,
} from "react-icons/ri";
import { Modal } from "../../../Modal";
import { v } from "../../../../../styles/variables";
import { formatDateWithWeekday } from "../../../../../utils/dateUtils";

const months = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

const toDateParts = (dateStr) => {
  if (!dateStr) return { day: "--", month: "Sin fecha" };
  const [year, month, day] = String(dateStr).split("-");

  return {
    day: day || "--",
    month: month ? `${months[Number(month) - 1]} ${year}` : "Sin fecha",
  };
};

const formatRange = (startDate, endDate) => {
  if (!startDate || !endDate) return "Sin fecha";
  return `${formatDateWithWeekday(startDate)} al ${formatDateWithWeekday(endDate)}`;
};

const getChangeLabel = (row) => {
  if (!row?.start_date || !row?.end_date) return "Sin fecha";
  if (row?.hasInvalidDuration) return `${row.currentDuration || 0} dias`;
  if (row?.changed) return "Reordenar";
  return "OK";
};

export function NormalizeJornadaDatesModal({
  isOpen,
  onClose,
  onApply,
  onApplyMatches,
  rows = [],
  irregularCount = 0,
  anchorStartDate = "",
  matchRows = [],
  matchIssueCount = 0,
  initialView = "jornadas",
}) {
  const [activeView, setActiveView] = useState(initialView);
  const firstRow = rows[0] || null;
  const lastRow = rows[rows.length - 1] || null;
  const isMatchView = activeView === "matches";

  useEffect(() => {
    if (isOpen) {
      setActiveView(initialView);
    }
  }, [initialView, isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ajustar calendario"
      width="1080px"
      closeOnOverlayClick={false}
    >
      <Wrapper>
        <TabBar>
          <button
            type="button"
            className={activeView === "jornadas" ? "active" : ""}
            onClick={() => setActiveView("jornadas")}
          >
            Jornadas
            <span>{irregularCount}</span>
          </button>
          <button
            type="button"
            className={activeView === "matches" ? "active" : ""}
            onClick={() => setActiveView("matches")}
          >
            Partidos
            <span>{matchIssueCount}</span>
          </button>
        </TabBar>

        <SummaryGrid>
          <SummaryBlock>
            <span>{isMatchView ? "Partidos" : "Inicio"}</span>
            <strong>
              {isMatchView
                ? matchRows.length
                : anchorStartDate
                  ? formatDateWithWeekday(anchorStartDate)
                  : "Sin fecha"}
            </strong>
          </SummaryBlock>
          <SummaryBlock>
            <span>{isMatchView ? "Accion" : "Jornadas"}</span>
            <strong>{isMatchView ? "Mover a su semana" : rows.length}</strong>
          </SummaryBlock>
          <SummaryBlock $accent="warning">
            <span>Por ajustar</span>
            <strong>{isMatchView ? matchIssueCount : irregularCount}</strong>
          </SummaryBlock>
          <SummaryBlock $accent="success">
            <span>{isMatchView ? "Regla" : "Final ajustado"}</span>
            <strong>
              {isMatchView
                ? "Mismo dia de semana"
                : lastRow?.nextEndDate
                  ? formatDateWithWeekday(lastRow.nextEndDate)
                  : "Sin fecha"}
            </strong>
          </SummaryBlock>
        </SummaryGrid>

        {isMatchView ? (
          <MatchGrid>
            {matchRows.map((match) => {
              const parts = toDateParts(match.nextDate);
              return (
                <JornadaCard key={match.id} $changed>
                  <CardHeader>
                    <div>
                      <strong>{match.homeName} vs {match.awayName}</strong>
                      <span>{match.jornada?.name || "Jornada"}</span>
                    </div>
                    <DateBadge $changed>
                      <strong>{parts.day}</strong>
                      <small>{parts.month}</small>
                    </DateBadge>
                  </CardHeader>

                  <NewRange>
                    <RiCalendarCheckLine />
                    <span>{formatDateWithWeekday(match.nextDate)}</span>
                  </NewRange>

                  <CompareRow>
                    <div className="range before">
                      <span>Actual</span>
                      <strong>{formatDateWithWeekday(match.currentDate)}</strong>
                    </div>
                    <RiArrowRightLine className="arrow" />
                    <div className="range after">
                      <span>Ajustado</span>
                      <strong>{formatDateWithWeekday(match.nextDate)}</strong>
                    </div>
                  </CompareRow>
                </JornadaCard>
              );
            })}
          </MatchGrid>
        ) : (
          <>
            <RangeRail>
              <div className="point">
                <RiCalendarEventLine />
                <span>{firstRow?.name || "Primera jornada"}</span>
              </div>
              <div className="line" />
              <div className="point end">
                <RiCalendarCheckLine />
                <span>{lastRow?.name || "Ultima jornada"}</span>
              </div>
            </RangeRail>

            <CalendarGrid>
              {rows.map((row, index) => {
                const parts = toDateParts(row.nextStartDate);
                const isChanged = row.changed || row.hasInvalidDuration;

                return (
                  <JornadaCard key={row.id || `${row.name}-${index}`} $changed={isChanged}>
                    <CardHeader>
                      <div>
                        <strong>{row.name || `Jornada ${index + 1}`}</strong>
                        <span>{getChangeLabel(row)}</span>
                      </div>
                      <DateBadge $changed={isChanged}>
                        <strong>{parts.day}</strong>
                        <small>{parts.month}</small>
                      </DateBadge>
                    </CardHeader>

                    <NewRange>
                      <RiCalendarCheckLine />
                      <span>{formatRange(row.nextStartDate, row.nextEndDate)}</span>
                    </NewRange>

                    <CompareRow>
                      <div className="range before">
                        <span>Actual</span>
                        <strong>{formatRange(row.start_date, row.end_date)}</strong>
                      </div>
                      <RiArrowRightLine className="arrow" />
                      <div className="range after">
                        <span>Ajustado</span>
                        <strong>{formatRange(row.nextStartDate, row.nextEndDate)}</strong>
                      </div>
                    </CompareRow>
                  </JornadaCard>
                );
              })}
            </CalendarGrid>
          </>
        )}

        <Footer>
          <button type="button" className="secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="primary"
            onClick={isMatchView ? onApplyMatches : onApply}
            disabled={isMatchView ? matchRows.length === 0 : rows.length === 0}
          >
            <RiCalendarCheckLine />
            {isMatchView ? "Ajustar partidos" : "Aplicar ajuste"}
          </button>
        </Footer>
      </Wrapper>
    </Modal>
  );
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const TabBar = styled.div`
  display: inline-flex;
  width: fit-content;
  max-width: 100%;
  gap: 4px;
  padding: 4px;
  border-radius: 8px;
  background: ${({ theme }) => theme.bg3};
  border: 1px solid ${({ theme }) => theme.bg4};

  button {
    border: none;
    border-radius: 6px;
    min-height: 34px;
    padding: 0 12px;
    background: transparent;
    color: ${({ theme }) => theme.text};
    font-weight: 900;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }

  button.active {
    background: ${v.colorPrincipal};
    color: white;
  }

  span {
    min-width: 20px;
    height: 20px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.18);
    font-size: 0.72rem;
  }
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 860px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const SummaryBlock = styled.div`
  min-height: 74px;
  border: 1px solid
    ${({ $accent, theme }) =>
      $accent === "success"
        ? "#2ecc7155"
        : $accent === "warning"
          ? "#f1c40f66"
          : theme.bg4};
  background: ${({ $accent, theme }) =>
    $accent === "success"
      ? "#2ecc7114"
      : $accent === "warning"
        ? "#f1c40f14"
        : theme.bg3};
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;

  span {
    font-size: 0.74rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    opacity: 0.65;
  }

  strong {
    font-size: 0.95rem;
    line-height: 1.25;
    color: ${({ theme }) => theme.text};
  }
`;

const RangeRail = styled.div`
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  background: ${({ theme }) => theme.bg3};
  border: 1px solid ${({ theme }) => theme.bg4};

  .point {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-weight: 800;
    font-size: 0.9rem;
    min-width: 0;

    svg {
      color: ${v.colorPrincipal};
      flex-shrink: 0;
    }
  }

  .point.end svg {
    color: #2ecc71;
  }

  .line {
    height: 2px;
    border-radius: 999px;
    background: linear-gradient(90deg, ${v.colorPrincipal}, #2ecc71);
    opacity: 0.7;
  }

  @media (max-width: 620px) {
    grid-template-columns: 1fr;

    .line {
      height: 1px;
    }
  }
`;

const CalendarGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(270px, 1fr));
  gap: 12px;
  max-height: 56vh;
  overflow-y: auto;
  padding-right: 4px;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.bg4};
    border-radius: 999px;
  }
`;

const MatchGrid = styled(CalendarGrid)``;

const JornadaCard = styled.article`
  border: 1px solid
    ${({ $changed, theme }) => ($changed ? `${v.colorPrincipal}88` : theme.bg4)};
  background: ${({ $changed, theme }) =>
    $changed ? `${v.colorPrincipal}10` : theme.bg3};
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
`;

const CardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;

  > div {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  strong {
    font-size: 1rem;
    line-height: 1.15;
  }

  span {
    width: fit-content;
    border-radius: 999px;
    padding: 3px 8px;
    background: ${({ theme }) => theme.bg4};
    font-size: 0.7rem;
    font-weight: 800;
    text-transform: uppercase;
    opacity: 0.82;
  }
`;

const DateBadge = styled.div`
  width: 58px;
  min-width: 58px;
  aspect-ratio: 1;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: ${({ $changed }) => ($changed ? v.colorPrincipal : "#2ecc71")};
  color: white;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.12);

  strong {
    font-size: 1.28rem;
    line-height: 1;
  }

  small {
    font-size: 0.62rem;
    font-weight: 800;
    line-height: 1.05;
    text-align: center;
  }
`;

const NewRange = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  padding: 8px;
  border-radius: 8px;
  background: ${({ theme }) => theme.bgcards};
  border: 1px solid ${({ theme }) => theme.bg4};
  font-size: 0.85rem;
  font-weight: 800;

  svg {
    color: #2ecc71;
    flex-shrink: 0;
  }
`;

const CompareRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: stretch;
  gap: 8px;

  .arrow {
    align-self: center;
    color: ${v.colorPrincipal};
    flex-shrink: 0;
  }

  .range {
    min-width: 0;
    border-radius: 8px;
    padding: 8px;
    background: ${({ theme }) => theme.bgcards};
    border: 1px solid ${({ theme }) => theme.bg4};
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .range.after {
    border-color: #2ecc7155;
  }

  span {
    font-size: 0.68rem;
    font-weight: 900;
    text-transform: uppercase;
    opacity: 0.58;
  }

  strong {
    font-size: 0.76rem;
    line-height: 1.25;
  }

  @media (max-width: 520px) {
    grid-template-columns: 1fr;

    .arrow {
      transform: rotate(90deg);
      justify-self: center;
    }
  }
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 4px;

  button {
    min-height: 40px;
    border: none;
    border-radius: 8px;
    padding: 0 16px;
    font-weight: 800;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .secondary {
    background: ${({ theme }) => theme.bg4};
    color: ${({ theme }) => theme.text};
  }

  .primary {
    background: ${v.colorPrincipal};
    color: white;
  }

  @media (max-width: 520px) {
    flex-direction: column-reverse;

    button {
      width: 100%;
    }
  }
`;
