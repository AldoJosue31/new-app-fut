import styled from "styled-components";
import { RiCalendarEventLine, RiCheckboxCircleLine } from "react-icons/ri";
import { formatDateWithWeekday } from "../../../../../utils/dateUtils";
import { getJornadaDisplayName } from "../../../../../utils/jornadaUtils";

const DateRange = ({ start, end }) => (
  start && end
    ? <>{formatDateWithWeekday(start)} al {formatDateWithWeekday(end)}</>
    : <>Fechas por definir</>
);

export function RepositionModalSummary({
  name,
  startDate,
  endDate,
  scheduledMatchesCount = 0,
  pendingMatchesCount = 0,
  nextJornada,
  originalJornadaName,
  dateEditor,
}) {
  return (
    <Summary>
      <section className="period" aria-label="Período de reposición">
        <RiCalendarEventLine aria-hidden="true" />
        <div>
          <h4>{getJornadaDisplayName(name) || "Reposición"}</h4>
          <p><DateRange start={startDate} end={endDate} /></p>
        </div>
      </section>

      {dateEditor}

      <dl className="match-counts">
        <div>
          <dt>{scheduledMatchesCount === 1 ? "Partido a publicar" : "Partidos a publicar"}</dt>
          <dd>{scheduledMatchesCount}</dd>
        </div>
        <div>
          <dt>{pendingMatchesCount === 1 ? "Pendiente restante" : "Pendientes restantes"}</dt>
          <dd>{pendingMatchesCount}</dd>
        </div>
      </dl>

      {nextJornada && (
        <section className="calendar-change" aria-label="Cambio en el calendario">
          <h4>{getJornadaDisplayName(nextJornada.name)} se recorre</h4>
          <p>Las jornadas siguientes se desplazan para dar espacio a la reposición.</p>
          <div className="calendar-dates">
            <div>
              <span>Fechas actuales</span>
              <strong><DateRange start={nextJornada.originalStartDate} end={nextJornada.originalEndDate} /></strong>
            </div>
            <div className="new-dates">
              <span>Nuevas fechas</span>
              <strong><DateRange start={nextJornada.start_date} end={nextJornada.end_date} /></strong>
            </div>
          </div>
        </section>
      )}

      {originalJornadaName && (
        <p className="preserved-matches">
          <RiCheckboxCircleLine aria-hidden="true" />
          <span>Los partidos de <strong>{originalJornadaName}</strong> conservarán su jornada y su estado actual.</span>
        </p>
      )}
    </Summary>
  );
}

const Summary = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  color: ${({ theme }) => theme.text};
  text-align: left;

  h4, p, dl, dd { margin: 0; }
  h4 { font-size: 0.94rem; font-weight: 650; line-height: 1.4; }
  p { font-size: 0.84rem; line-height: 1.6; }

  .period {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 18px;
    border-radius: 14px;
    background: ${({ theme }) => theme.tournamentDashboard.jornada.accentSoft};
    color: ${({ theme }) => theme.tournamentDashboard.jornada.accentStrong};
  }
  .period > svg { flex-shrink: 0; font-size: 1.8rem; }
  .period h4 { font-size: 1.15rem; font-weight: 700; margin-bottom: 4px; }
  .period p { color: ${({ theme }) => theme.text}; font-variant-numeric: tabular-nums; }

  .match-counts {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }
  .match-counts > div { display: flex; flex-direction: column; gap: 4px; }
  .match-counts dt { order: 1; font-size: 0.8rem; color: ${({ theme }) => theme.tournamentDashboard.muted}; }
  .match-counts dd { font-size: 1.5rem; line-height: 1.2; font-weight: 650; font-variant-numeric: tabular-nums; }
  .match-counts > div + div { border-left: 1px solid ${({ theme }) => theme.tournamentDashboard.border}; padding-left: 20px; }

  .calendar-change { border-top: 1px solid ${({ theme }) => theme.tournamentDashboard.border}; padding-top: 20px; }
  .calendar-change > p { margin-top: 5px; color: ${({ theme }) => theme.tournamentDashboard.muted}; }
  .calendar-dates { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 14px; }
  .calendar-dates > div { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
  .calendar-dates span { font-size: 0.76rem; color: ${({ theme }) => theme.tournamentDashboard.muted}; }
  .calendar-dates strong { font-size: 0.82rem; line-height: 1.6; font-weight: 550; font-variant-numeric: tabular-nums; }
  .new-dates strong { color: ${({ theme }) => theme.tournamentDashboard.jornada.accentStrong}; font-weight: 650; }

  .preserved-matches { display: flex; align-items: flex-start; gap: 9px; color: ${({ theme }) => theme.tournamentDashboard.muted}; }
  .preserved-matches svg { flex-shrink: 0; margin-top: 3px; font-size: 1.05rem; color: ${({ theme }) => theme.tournamentDashboard.jornada.accentStrong}; }
  .preserved-matches strong { font-weight: 600; color: ${({ theme }) => theme.text}; }

  @media (max-width: 480px) {
    gap: 16px;
    .period { padding: 14px; gap: 10px; align-items: flex-start; }
    .period > svg { font-size: 1.4rem; margin-top: 3px; }
    .period h4 { font-size: 1.05rem; }
    .calendar-dates { grid-template-columns: 1fr; gap: 12px; }
  }
`;
