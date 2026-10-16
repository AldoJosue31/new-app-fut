import React, { useId, useMemo, useState } from "react";
import styled from "styled-components";
import { RiArrowDownSLine, RiArrowRightLine, RiEdit2Line } from "react-icons/ri";
import { Modal } from "../../../Modal";
import { RepositionModalSummary } from "./RepositionModalSummary";

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
  scheduledMatchesCount = 0,
  pendingMatchesCount = 0,
  onStartDateChange,
  onEndDateChange,
}) {
  const [isEditingDates, setIsEditingDates] = useState(false);
  const editorId = useId();
  const errorId = `${editorId}-error`;
  const repositionRow = futureJornadaPreview[0];
  const invalidRange = !startDate || !endDate || endDate < startDate;
  const validationMessage = !startDate || !endDate
    ? "Elige una fecha de inicio y una fecha de fin para continuar."
    : "La fecha de fin debe ser igual o posterior a la de inicio.";
  const nextJornada = useMemo(() => {
    const shifted = futureJornadaPreview.find((row) => !row.isSynthetic);
    if (!shifted) return null;
    const original = jornadas.find((row) => String(row.id) === String(shifted.id));
    return {
      ...shifted,
      originalStartDate: original?.start_date,
      originalEndDate: original?.end_date,
    };
  }, [futureJornadaPreview, jornadas]);

  const useSuggestedDates = () => {
    onStartDateChange({ target: { value: suggestedStartDate } });
    onEndDateChange({ target: { value: suggestedEndDate } });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Planificar reposición" width="600px" closeOnOverlayClick={false}>
      <Wrapper>
        <p className="intro">Revisa las fechas y el ajuste del calendario antes de publicar los partidos pendientes.</p>

        <RepositionModalSummary
          name={repositionRow?.name}
          startDate={startDate}
          endDate={endDate}
          scheduledMatchesCount={scheduledMatchesCount}
          pendingMatchesCount={pendingMatchesCount}
          nextJornada={nextJornada}
          originalJornadaName={jornadas[jornadaIndex]?.name}
          dateEditor={
            <DateEditor>
              <button type="button" className="edit-toggle" onClick={() => setIsEditingDates((prev) => !prev)}
                aria-expanded={isEditingDates || invalidRange} aria-controls={editorId}>
                <RiEdit2Line aria-hidden="true" /> Editar fechas
                <RiArrowDownSLine className={isEditingDates || invalidRange ? "open" : ""} aria-hidden="true" />
              </button>
              {(isEditingDates || invalidRange) && (
                <div id={editorId} className="editor-fields">
                  <div className="fields">
                    <label>
                      <span>Fecha de inicio</span>
                      <input type="date" value={startDate || ""} onChange={onStartDateChange}
                        aria-invalid={invalidRange} aria-describedby={invalidRange ? errorId : undefined} />
                    </label>
                    <label>
                      <span>Fecha de fin</span>
                      <input type="date" value={endDate || ""} onChange={onEndDateChange} min={startDate || undefined}
                        aria-invalid={invalidRange} aria-describedby={invalidRange ? errorId : undefined} />
                    </label>
                  </div>
                  {suggestedStartDate && suggestedEndDate && (
                    <button type="button" className="suggested-dates" onClick={useSuggestedDates}>Usar fechas sugeridas</button>
                  )}
                </div>
              )}
            </DateEditor>
          }
        />

        {invalidRange && <p id={errorId} className="validation" role="alert">{validationMessage}</p>}

        <Footer>
          <button type="button" className="secondary" onClick={onClose}>Cancelar</button>
          <button type="button" className="primary" onClick={onContinue} disabled={invalidRange}>
            Revisar publicación <RiArrowRightLine aria-hidden="true" />
          </button>
        </Footer>
      </Wrapper>
    </Modal>
  );
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  color: ${({ theme }) => theme.text};
  font-family: inherit;

  .intro { margin: 0; font-size: 0.87rem; line-height: 1.6; color: ${({ theme }) => theme.tournamentDashboard.muted}; }
  .validation { margin: 0; font-size: 0.82rem; line-height: 1.5; color: ${({ theme }) => theme.text}; border: 1px solid ${({ theme }) => theme.tournamentDashboard.metrics.warning}; padding: 12px 14px; border-radius: 12px; }
  ::selection { background: ${({ theme }) => theme.tournamentDashboard.jornada.accentSoft}; color: ${({ theme }) => theme.tournamentDashboard.jornada.accentStrong}; }
  @media (max-width: 480px) { gap: 16px; }
`;

const DateEditor = styled.div`
  button { min-height: 44px; font: inherit; cursor: pointer; }
  .edit-toggle {
    display: inline-flex; align-items: center; gap: 8px; padding: 0;
    border: none; background: transparent;
    color: ${({ theme }) => theme.tournamentDashboard.jornada.accentStrong};
    font-size: 0.84rem; font-weight: 600;
  }
  .edit-toggle svg { font-size: 1rem; }
  .edit-toggle .open { transform: rotate(180deg); }
  .edit-toggle:hover, .suggested-dates:hover { text-decoration: underline; text-underline-offset: 4px; }
  .editor-fields { margin-top: 10px; }
  .fields { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  label { display: flex; flex-direction: column; gap: 7px; min-width: 0; }
  label span { font-size: 0.8rem; font-weight: 600; }
  input {
    width: 100%; min-width: 0; min-height: 44px; padding: 10px 12px; border-radius: 12px;
    border: 1px solid ${({ theme }) => theme.tournamentDashboard.muted};
    background: ${({ theme }) => theme.tournamentDashboard.surface}; color: ${({ theme }) => theme.text};
    font: inherit; font-size: 0.85rem; color-scheme: ${({ theme }) => theme.bodyRgba === "32,32,32" ? "dark" : "light"};
    caret-color: ${({ theme }) => theme.tournamentDashboard.jornada.accentStrong};
  }
  input[aria-invalid="true"] { border-color: ${({ theme }) => theme.tournamentDashboard.metrics.warning}; }
  .suggested-dates { padding: 0; border: none; background: transparent; font-size: 0.78rem; color: ${({ theme }) => theme.tournamentDashboard.jornada.accentStrong}; }
  button:focus-visible, input:focus-visible { outline: 2px solid ${({ theme }) => theme.tournamentDashboard.jornada.accentStrong}; outline-offset: 3px; }
  @media (max-width: 480px) { .fields { grid-template-columns: 1fr; } }
`;

const Footer = styled.div`
  display: flex; justify-content: flex-end; gap: 10px;
  border-top: 1px solid ${({ theme }) => theme.tournamentDashboard.border}; padding-top: 18px;
  button {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    min-height: 44px; padding: 10px 16px; border-radius: 12px; border: 1px solid transparent;
    font: inherit; font-size: 0.85rem; font-weight: 600; white-space: nowrap; cursor: pointer;
    transition: background-color 160ms ease-out;
  }
  .secondary { background: transparent; color: ${({ theme }) => theme.text}; border-color: ${({ theme }) => theme.tournamentDashboard.border}; }
  .secondary:hover { background: ${({ theme }) => theme.tournamentDashboard.itemSurface}; }
  .primary { background: ${({ theme }) => theme.tournamentDashboard.jornada.accentStrong}; color: ${({ theme }) => theme.tournamentDashboard.surface}; }
  .primary:hover:not(:disabled) { filter: brightness(0.93); }
  button:active:not(:disabled) { transform: translateY(1px); }
  .primary:disabled { background: ${({ theme }) => theme.tournamentDashboard.itemSurface}; color: ${({ theme }) => theme.tournamentDashboard.muted}; border-color: ${({ theme }) => theme.tournamentDashboard.border}; cursor: not-allowed; }
  button:focus-visible { outline: 2px solid ${({ theme }) => theme.tournamentDashboard.jornada.accentStrong}; outline-offset: 3px; }
  @media (prefers-reduced-motion: reduce) { button { transition: none; } button:active { transform: none; } }
  @media (max-width: 480px) { button { padding-inline: 12px; font-size: 0.8rem; } }
  @media (max-width: 360px) { flex-direction: column-reverse; button { width: 100%; } }
`;
