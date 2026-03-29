import React, { useMemo } from "react";
import styled from "styled-components";
import {
  RiArrowRightLine,
  RiCalendarEventLine,
  RiDraggable,
  RiSparklingLine,
} from "react-icons/ri";
import { Modal } from "../../../Modal";
import { v } from "../../../../../styles/variables";
import { addDaysToDate, formatDateWithWeekday } from "../../../../../utils/dateUtils";

const formatRange = (startDate, endDate) => {
  if (!startDate || !endDate) return "Sin definir";
  return `${formatDateWithWeekday(startDate)} al ${formatDateWithWeekday(endDate)}`;
};

const getDayDifference = (oldDate, newDate) => {
  if (!oldDate || !newDate) return 0;
  const oldValue = new Date(`${oldDate}T00:00:00`).getTime();
  const newValue = new Date(`${newDate}T00:00:00`).getTime();
  return Math.round((newValue - oldValue) / (1000 * 60 * 60 * 24));
};

export function RepositionPlannerModal({
  isOpen,
  onClose,
  onContinue,
  startDate,
  endDate,
  suggestedStartDate,
  jornadas = [],
  jornadaIndex = 0,
  futureJornadaPreview = [],
  onStartDateChange,
  onEndDateChange,
}) {
  const impactRows = useMemo(() => {
    return futureJornadaPreview.map((preview, offset) => {
      const original = jornadas[jornadaIndex + offset];
      return {
        id: preview.id || `synthetic-${offset}`,
        name: preview.name,
        originalStartDate: original?.start_date || "",
        originalEndDate: original?.end_date || "",
        nextStartDate: preview.start_date,
        nextEndDate: preview.end_date,
        shiftDays: getDayDifference(original?.start_date, preview.start_date),
        isCurrent: offset === 0,
      };
    });
  }, [futureJornadaPreview, jornadaIndex, jornadas]);

  const nextOfficialRow = impactRows[1] || null;
  const visibleRows = impactRows.slice(0, 4);
  const hiddenCount = Math.max(impactRows.length - visibleRows.length, 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Jornada de Reposicion"
      width="1080px"
      closeOnOverlayClick={false}
    >
      <Wrapper>
        <Hero>
          <div className="badge">
            <RiSparklingLine />
            Reposicion
          </div>
          <h4>Define la semana y revisa el desplazamiento</h4>
        </Hero>

        <TopGrid>
          <DateCard $accent="orange">
            <div className="head">
              <RiCalendarEventLine />
              <span>Inicio</span>
            </div>
            <input type="date" value={startDate || ""} onChange={onStartDateChange} />
            <small>
              Sugerida:{" "}
              <button
                type="button"
                onClick={() =>
                  onStartDateChange({ target: { value: suggestedStartDate || "" } })
                }
              >
                {suggestedStartDate
                  ? formatDateWithWeekday(suggestedStartDate)
                  : "Sin sugerencia"}
              </button>
            </small>
          </DateCard>

          <DateCard $accent="green">
            <div className="head">
              <RiCalendarEventLine />
              <span>Fin</span>
            </div>
            <input type="date" value={endDate || ""} onChange={onEndDateChange} />
            <small>
              {formatRange(
                startDate,
                endDate || (startDate ? addDaysToDate(startDate, 6) : "")
              )}
            </small>
          </DateCard>

          <HighlightCard>
            <span className="eyebrow">Jornada posterior desplazada</span>
            <strong>
              {nextOfficialRow
                ? `${nextOfficialRow.name}: ${formatRange(
                    nextOfficialRow.nextStartDate,
                    nextOfficialRow.nextEndDate
                  )}`
                : "Sin jornada posterior"}
            </strong>
            <small>
              {nextOfficialRow
                ? "Esta será la siguiente jornada después de la reposicion."
                : "No hay más jornadas para mover."}
            </small>
          </HighlightCard>
        </TopGrid>

        <ImpactBoard>
          <BoardHeader>
            <div>
              <span className="eyebrow">Vista previa</span>
              <h5>Antes y despues</h5>
            </div>
            <div className="legend">
              <span className="current">Reposicion</span>
              <span className="moved">Posterior</span>
            </div>
          </BoardHeader>

          <Rows>
            {visibleRows.map((row) => (
              <ImpactRow key={row.id} $current={row.isCurrent}>
                <div className="marker">
                  <RiDraggable />
                </div>

                <div className="content">
                  <div className="titleRow">
                    <div>
                      <strong>{row.name}</strong>
                      <small>
                        {row.isCurrent
                          ? "Nueva jornada"
                          : `${row.shiftDays > 0 ? "+" : ""}${row.shiftDays} dias`}
                      </small>
                    </div>
                    <span className={`tag ${row.isCurrent ? "current" : "moved"}`}>
                      {row.isCurrent ? "Reposicion" : "Ajuste"}
                    </span>
                  </div>

                  <div className="track">
                    <div className="box before">
                      <span>Antes</span>
                      <strong>{formatRange(row.originalStartDate, row.originalEndDate)}</strong>
                    </div>

                    <div className="arrow">
                      <RiArrowRightLine />
                    </div>

                    <div className="box after">
                      <span>Despues</span>
                      <strong>{formatRange(row.nextStartDate, row.nextEndDate)}</strong>
                    </div>
                  </div>
                </div>
              </ImpactRow>
            ))}
          </Rows>

          {hiddenCount > 0 && (
            <MoreNote>
              + {hiddenCount} jornadas mas seguiran el mismo desplazamiento
            </MoreNote>
          )}
        </ImpactBoard>

        <Footer>
          <button type="button" className="secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="primary"
            onClick={onContinue}
            disabled={!startDate || !endDate}
          >
            Continuar
          </button>
        </Footer>
      </Wrapper>
    </Modal>
  );
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Hero = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(243, 156, 18, 0.14), rgba(243, 156, 18, 0.04));
  border: 1px solid rgba(243, 156, 18, 0.2);

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    width: fit-content;
    padding: 5px 10px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.28);
    color: #9a5d00;
    font-size: 0.72rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.45px;
  }

  h4 {
    margin: 0;
    font-size: 1.02rem;
    line-height: 1.15;
  }
`;

const TopGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1.25fr;
  gap: 10px;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

const DateCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 12px;
  border-radius: 12px;
  background: ${({ theme }) => theme.bg3};
  border: 1px solid
    ${({ $accent, theme }) =>
      $accent === "orange"
        ? "rgba(243, 156, 18, 0.24)"
        : $accent === "green"
          ? "rgba(46, 204, 113, 0.24)"
          : theme.bg4};

  .head {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.78rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.45px;
    opacity: 0.78;
  }

  input {
    width: 100%;
    background: ${({ theme }) => theme.bgcards};
    border: 1px solid ${({ theme }) => theme.bg4};
    color: ${({ theme }) => theme.text};
    padding: 9px 11px;
    border-radius: 10px;
    font-size: 0.88rem;
  }

  small {
    font-size: 0.74rem;
    line-height: 1.35;
    opacity: 0.72;
  }

  button {
    background: transparent;
    border: none;
    color: ${v.colorPrincipal};
    font-weight: 700;
    cursor: pointer;
    padding: 0;
  }
`;

const HighlightCard = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  padding: 12px 14px;
  border-radius: 12px;
  background: ${({ theme }) => theme.bgtotal};
  border: 1px solid ${({ theme }) => theme.bg4};

  .eyebrow {
    font-size: 0.72rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.45px;
    opacity: 0.64;
  }

  strong {
    font-size: 0.88rem;
    line-height: 1.32;
  }

  small {
    font-size: 0.74rem;
    line-height: 1.35;
    opacity: 0.72;
  }
`;

const ImpactBoard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border-radius: 14px;
  background: ${({ theme }) => theme.bg2};
  border: 1px solid ${({ theme }) => theme.bg4};
`;

const BoardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 12px;

  .eyebrow {
    display: block;
    font-size: 0.72rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.45px;
    opacity: 0.65;
    margin-bottom: 3px;
  }

  h5 {
    margin: 0;
    font-size: 0.94rem;
  }

  .legend {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .legend span {
    padding: 5px 9px;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.45px;
  }

  .current {
    background: rgba(243, 156, 18, 0.14);
    color: #c57d0a;
  }

  .moved {
    background: rgba(46, 204, 113, 0.14);
    color: #1f8b4c;
  }

  @media (max-width: 700px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const Rows = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ImpactRow = styled.div`
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr);
  gap: 8px;
  align-items: stretch;

  .marker {
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 9px;
    background: ${({ $current, theme }) =>
      $current ? "rgba(243, 156, 18, 0.14)" : theme.bg3};
    color: ${({ $current }) => ($current ? "#c57d0a" : v.colorPrincipal)};
    border: 1px solid
      ${({ $current, theme }) =>
        $current ? "rgba(243, 156, 18, 0.24)" : theme.bg4};
    font-size: 0.76rem;
  }

  .content {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 12px;
    background: ${({ $current, theme }) =>
      $current
        ? "linear-gradient(135deg, rgba(243, 156, 18, 0.11), rgba(243, 156, 18, 0.03))"
        : theme.bgcards};
    border: 1px solid
      ${({ $current, theme }) =>
        $current ? "rgba(243, 156, 18, 0.22)" : theme.bg4};
  }

  .titleRow {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    align-items: start;
  }

  .titleRow strong {
    display: block;
    font-size: 0.86rem;
  }

  .titleRow small {
    display: block;
    margin-top: 2px;
    font-size: 0.72rem;
    opacity: 0.7;
  }

  .tag {
    flex-shrink: 0;
    padding: 5px 8px;
    border-radius: 999px;
    font-size: 0.68rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.45px;
  }

  .tag.current {
    background: rgba(243, 156, 18, 0.14);
    color: #c57d0a;
  }

  .tag.moved {
    background: rgba(46, 204, 113, 0.14);
    color: #1f8b4c;
  }

  .track {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    gap: 8px;
    align-items: center;
  }

  .arrow {
    color: ${v.colorPrincipal};
    font-size: 1rem;
  }

  .box {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px;
    border-radius: 10px;
  }

  .box.before {
    background: ${({ theme }) => theme.bg2};
  }

  .box.after {
    background: rgba(46, 204, 113, 0.1);
  }

  .box span {
    font-size: 0.68rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.45px;
    opacity: 0.62;
  }

  .box strong {
    font-size: 0.78rem;
    line-height: 1.3;
  }

  @media (max-width: 760px) {
    grid-template-columns: 1fr;

    .marker {
      display: none;
    }

    .track {
      grid-template-columns: 1fr;
    }

    .arrow {
      justify-self: center;
      transform: rotate(90deg);
    }
  }
`;

const MoreNote = styled.div`
  font-size: 0.74rem;
  opacity: 0.68;
  text-align: center;
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;

  button {
    min-width: 140px;
    padding: 10px 14px;
    border-radius: 10px;
    border: none;
    font-weight: 800;
    cursor: pointer;
    transition: 0.2s ease;
  }

  .secondary {
    background: ${({ theme }) => theme.bg3};
    color: ${({ theme }) => theme.text};
    border: 1px solid ${({ theme }) => theme.bg4};
  }

  .primary {
    background: linear-gradient(135deg, ${v.colorPrincipal}, #f39c12);
    color: white;
  }

  .primary:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  button:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  @media (max-width: 640px) {
    flex-direction: column-reverse;

    button {
      width: 100%;
    }
  }
`;
