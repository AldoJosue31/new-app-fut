import React, { useMemo, useState } from "react";
import styled from "styled-components";
import {
  RiArrowDownSLine,
  RiArrowRightLine,
  RiCalendarEventLine,
  RiEdit2Line,
} from "react-icons/ri";
import { Modal } from "../../../Modal";
import { v } from "../../../../../styles/variables";
import { formatDateWithWeekday } from "../../../../../utils/dateUtils";

const toDateParts = (dateStr) => {
  if (!dateStr) return { day: "--", month: "Sin fecha" };
  const [year, month, day] = dateStr.split("-");
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
  return {
    day,
    month: `${months[Number(month) - 1]} ${year}`,
  };
};

const formatRange = (startDate, endDate) => {
  if (!startDate || !endDate) return "Sin definir";
  return `${formatDateWithWeekday(startDate)} al ${formatDateWithWeekday(endDate)}`;
};

const hasInvalidRange = (startDate, endDate) => {
  if (!startDate || !endDate) return true;
  return new Date(`${endDate}T00:00:00`) < new Date(`${startDate}T00:00:00`);
};

export function RepositionPlannerModal({
  isOpen,
  onClose,
  onContinue,
  startDate,
  endDate,
  suggestedStartDate,
  suggestedEndDate,
  jornadas = [],
  jornadaIndex = 0,
  futureJornadaPreview = [],
  onStartDateChange,
  onEndDateChange,
}) {
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);

  const repositionRow = futureJornadaPreview[0] || null;
  const invalidRange = hasInvalidRange(startDate, endDate);
  const nextOfficialRow = useMemo(() => {
    const shiftedRow =
      futureJornadaPreview.find((row) => !row?.isSynthetic) || null;

    if (!shiftedRow) return null;

    const originalRow =
      jornadas.find((jornada) => String(jornada?.id) === String(shiftedRow?.id)) ||
      jornadas[jornadaIndex] ||
      null;

    return {
      ...shiftedRow,
      originalStartDate: originalRow?.start_date || "",
      originalEndDate: originalRow?.end_date || "",
      shiftedStartDate: shiftedRow?.start_date || "",
      shiftedEndDate: shiftedRow?.end_date || "",
    };
  }, [futureJornadaPreview, jornadaIndex, jornadas]);

  const calendarCards = useMemo(() => {
    return [
      {
        key: "start",
        label: "Inicio",
        tone: "orange",
        date: startDate,
        caption: "Comienza la reposicion",
      },
      {
        key: "end",
        label: "Fin",
        tone: "orangeSoft",
        date: endDate,
        caption: "Termina la reposicion",
      },
      {
        key: "next",
        label: nextOfficialRow?.name || "Jornada posterior",
        tone: "green",
        date: nextOfficialRow?.shiftedStartDate || "",
        caption: nextOfficialRow?.shiftedEndDate
          ? `Hasta ${formatDateWithWeekday(nextOfficialRow.shiftedEndDate)}`
          : "Sin cambio posterior",
      },
    ];
  }, [endDate, nextOfficialRow, startDate]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reposicion de 1 semana"
      width="940px"
      closeOnOverlayClick={false}
    >
      <Wrapper>
        <SummaryGrid>
          {calendarCards.map((card) => {
            const parts = toDateParts(card.date);
            return (
              <CalendarCard key={card.key} $tone={card.tone}>
                <div className="head">{card.label}</div>
                <div className="date-chip">
                  <strong>{parts.day}</strong>
                  <span>{parts.month}</span>
                </div>
                <small>{card.caption}</small>
              </CalendarCard>
            );
          })}
        </SummaryGrid>

        <RangeStrip>
          <div className="item primary">
            <span>Reposicion</span>
            <strong>
              {repositionRow
                ? formatRange(repositionRow.start_date, repositionRow.end_date)
                : formatRange(startDate, endDate)}
            </strong>
          </div>

          <div className="item">
            <span>Jornada posterior</span>
            <strong>
              {nextOfficialRow
                ? formatRange(
                    nextOfficialRow.shiftedStartDate,
                    nextOfficialRow.shiftedEndDate
                  )
                : "Sin jornada posterior"}
            </strong>
          </div>
        </RangeStrip>

        <ToggleButton
          type="button"
          onClick={() => setShowAdvancedConfig((prev) => !prev)}
        >
          <RiEdit2Line />
          Modificar fecha
          <RiArrowDownSLine className={showAdvancedConfig ? "open" : ""} />
        </ToggleButton>

        {showAdvancedConfig && (
          <AdvancedSection>
            <EditorGrid>
              <InputCard>
                <label>
                  <span>Fecha de inicio</span>
                  <div className="input-wrap">
                    <RiCalendarEventLine />
                    <input
                      type="date"
                      value={startDate || ""}
                      onChange={onStartDateChange}
                    />
                  </div>
                </label>
                <button
                  type="button"
                  className="ghost"
                  onClick={() =>
                    onStartDateChange({ target: { value: suggestedStartDate || "" } })
                  }
                >
                  Sugerida:{" "}
                  {suggestedStartDate
                    ? formatDateWithWeekday(suggestedStartDate)
                    : "Sin sugerencia"}
                </button>
              </InputCard>

              <InputCard>
                <label>
                  <span>Fecha final</span>
                  <div className="input-wrap">
                    <RiCalendarEventLine />
                    <input
                      type="date"
                      value={endDate || ""}
                      onChange={onEndDateChange}
                    />
                  </div>
                </label>
                <button
                  type="button"
                  className="ghost"
                  onClick={() =>
                    onEndDateChange({ target: { value: suggestedEndDate || "" } })
                  }
                >
                  Sugerida:{" "}
                  {suggestedEndDate
                    ? formatDateWithWeekday(suggestedEndDate)
                    : "Sin sugerencia"}
                </button>
              </InputCard>

              <PreviewCard>
                <span>Resultado</span>
                <strong>{formatRange(startDate, endDate)}</strong>
                <small>
                  {nextOfficialRow
                    ? `${nextOfficialRow.name}: ${formatRange(
                        nextOfficialRow.shiftedStartDate,
                        nextOfficialRow.shiftedEndDate
                      )}`
                    : "No hay jornada posterior para desplazar."}
                </small>
              </PreviewCard>
            </EditorGrid>

            {nextOfficialRow && (
              <ShiftCard>
                <div className="title">
                  <span>{nextOfficialRow.name}</span>
                  <small>Así quedaría la fecha posterior</small>
                </div>

                <div className="track">
                  <div className="box before">
                    <span>Antes</span>
                    <strong>
                      {formatRange(
                        nextOfficialRow.originalStartDate,
                        nextOfficialRow.originalEndDate
                      )}
                    </strong>
                  </div>

                  <RiArrowRightLine className="arrow" />

                  <div className="box after">
                    <span>Después</span>
                    <strong>
                      {formatRange(
                        nextOfficialRow.shiftedStartDate,
                        nextOfficialRow.shiftedEndDate
                      )}
                    </strong>
                  </div>
                </div>
              </ShiftCard>
            )}
          </AdvancedSection>
        )}

        {invalidRange && (
          <WarningText>
            La fecha final debe ser igual o posterior a la fecha de inicio.
          </WarningText>
        )}

        <Footer>
          <button type="button" className="secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="primary"
            onClick={onContinue}
            disabled={invalidRange}
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

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

const CalendarCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 14px;
  background: ${({ $tone, theme }) =>
    $tone === "green"
      ? "rgba(46, 204, 113, 0.08)"
      : $tone === "orangeSoft"
        ? "rgba(243, 156, 18, 0.08)"
        : theme.bg3};
  border: 1px solid
    ${({ $tone, theme }) =>
      $tone === "green"
        ? "rgba(46, 204, 113, 0.22)"
        : $tone === "orange" || $tone === "orangeSoft"
          ? "rgba(243, 156, 18, 0.22)"
          : theme.bg4};

  .head {
    font-size: 0.74rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.45px;
    opacity: 0.7;
  }

  .date-chip {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 10px 12px;
    border-radius: 12px;
    background: ${({ theme }) => theme.bgcards};
  }

  .date-chip strong {
    font-size: 1.4rem;
    line-height: 1;
  }

  .date-chip span {
    font-size: 0.76rem;
    font-weight: 700;
    opacity: 0.72;
  }

  small {
    font-size: 0.74rem;
    line-height: 1.35;
    opacity: 0.72;
  }
`;

const RangeStrip = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;

  .item {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 11px 12px;
    border-radius: 12px;
    background: ${({ theme }) => theme.bg2};
    border: 1px solid ${({ theme }) => theme.bg4};
  }

  .item.primary {
    background: linear-gradient(
      135deg,
      rgba(243, 156, 18, 0.11),
      rgba(243, 156, 18, 0.03)
    );
    border-color: rgba(243, 156, 18, 0.2);
  }

  span {
    font-size: 0.72rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.45px;
    opacity: 0.7;
  }

  strong {
    font-size: 0.84rem;
    line-height: 1.35;
  }

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const ToggleButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  align-self: flex-start;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px dashed ${v.colorPrincipal};
  background: transparent;
  color: ${v.colorPrincipal};
  font-size: 0.8rem;
  font-weight: 800;
  cursor: pointer;

  .open {
    transform: rotate(180deg);
  }
`;

const AdvancedSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const EditorGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1.2fr;
  gap: 10px;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

const InputCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  background: ${({ theme }) => theme.bg3};
  border: 1px solid ${({ theme }) => theme.bg4};

  label {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  span {
    font-size: 0.76rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.45px;
    opacity: 0.78;
  }

  .input-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 10px;
    border-radius: 10px;
    background: ${({ theme }) => theme.bgcards};
    border: 1px solid ${({ theme }) => theme.bg4};
  }

  .input-wrap svg {
    flex-shrink: 0;
    color: ${v.colorPrincipal};
  }

  input {
    width: 100%;
    background: transparent;
    border: none;
    color: ${({ theme }) => theme.text};
    font-size: 0.88rem;
  }

  .ghost {
    align-self: flex-start;
    border: none;
    background: transparent;
    color: ${v.colorPrincipal};
    font-size: 0.74rem;
    font-weight: 800;
    cursor: pointer;
    padding: 0;
  }
`;

const PreviewCard = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  padding: 12px;
  border-radius: 12px;
  background: ${({ theme }) => theme.bg2};
  border: 1px solid ${({ theme }) => theme.bg4};

  span {
    font-size: 0.74rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.45px;
    opacity: 0.7;
  }

  strong {
    font-size: 0.9rem;
    line-height: 1.35;
  }

  small {
    font-size: 0.76rem;
    line-height: 1.4;
    opacity: 0.74;
  }
`;

const ShiftCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  background: ${({ theme }) => theme.bg3};
  border: 1px solid ${({ theme }) => theme.bg4};

  .title {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    align-items: center;
  }

  .title span {
    font-size: 0.84rem;
    font-weight: 800;
  }

  .title small {
    font-size: 0.72rem;
    opacity: 0.68;
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
    .track {
      grid-template-columns: 1fr;
    }

    .arrow {
      justify-self: center;
      transform: rotate(90deg);
    }
  }
`;

const WarningText = styled.div`
  font-size: 0.78rem;
  font-weight: 700;
  color: #e67e22;
  background: rgba(230, 126, 34, 0.1);
  border: 1px solid rgba(230, 126, 34, 0.2);
  border-radius: 10px;
  padding: 9px 11px;
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
