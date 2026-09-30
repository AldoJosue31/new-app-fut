import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { RiCheckDoubleLine, RiCloseCircleLine, RiSearchLine, RiCalendarEventLine } from "react-icons/ri";
import { Modal } from "../../../Modal";

const normalize = (value) => String(value || "").normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function PendingMatchesModal({
  isOpen, onClose, matches = [], onOpenResult, onCancelMatch, busy = false,
}) {
  const [search, setSearch] = useState("");
  const contentRef = useRef(null);
  const filteredMatches = matches.filter((match) => normalize(
    `${match.local?.name} ${match.visitante?.name} ${match.originJornada}`,
  ).includes(normalize(search)));

  useEffect(() => {
    if (!isOpen) return undefined;
    const previousFocus = document.activeElement;
    const frame = requestAnimationFrame(() => contentRef.current?.querySelector("input, button")?.focus());
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !busy) onClose();
      if (event.key !== "Tab") return;
      const controls = contentRef.current?.parentElement?.parentElement
        ?.querySelectorAll("button:not(:disabled), input:not(:disabled)");
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus?.();
    };
  }, [isOpen, busy, onClose]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Administrar partidos pendientes"
      width="820px" closeOnOverlayClick={false} closeDisabled={busy}>
      <Content ref={contentRef} data-pending-dialog role="dialog" aria-modal="true"
        aria-label="Administrar partidos pendientes" aria-busy={busy}>
        <p className="description">
          Aplazados de jornadas anteriores. Cada resultado se guarda en su jornada de origen.
        </p>
        <Toolbar>
          {matches.length > 0 && (
            <SearchField>
              <RiSearchLine aria-hidden="true" />
              <input type="search" aria-label="Buscar por equipo o jornada"
                placeholder="Buscar equipo o jornada" value={search}
                onChange={(event) => setSearch(event.target.value)} />
            </SearchField>
          )}
          <Count role="status">
            <strong>{filteredMatches.length}</strong>
            <span>{filteredMatches.length === 1 ? "partido pendiente" : "partidos pendientes"}</span>
          </Count>
        </Toolbar>
        {filteredMatches.length > 0 ? (
          <MatchList>
            {filteredMatches.map((match) => (
              <MatchItem key={match.id}>
                <div className="match-info">
                  <span className="origin"><RiCalendarEventLine aria-hidden="true" />{match.originJornada}</span>
                  <div className="teams">
                    <span className="team">{match.local?.name}</span>
                    <span className="vs">vs</span>
                    <span className="team">{match.visitante?.name}</span>
                  </div>
                </div>
                <div className="actions">
                  <ActionButton type="button" $primary disabled={busy} onClick={() => onOpenResult(match)}
                    aria-label={`Registrar resultado de ${match.local?.name} vs ${match.visitante?.name}`}>
                    <RiCheckDoubleLine aria-hidden="true" /> Dar resultado
                  </ActionButton>
                  <ActionButton type="button" disabled={busy} onClick={() => onCancelMatch(match)}
                    aria-label={`Cancelar pendiente de ${match.local?.name} vs ${match.visitante?.name}`}>
                    <RiCloseCircleLine aria-hidden="true" /> Cancelar pendiente
                  </ActionButton>
                </div>
              </MatchItem>
            ))}
          </MatchList>
        ) : (
          <EmptyState>
            <RiCheckDoubleLine size={28} aria-hidden="true" />
            <strong>{matches.length ? "Sin coincidencias" : "No hay partidos aplazados"}</strong>
            <p>{matches.length ? "Prueba con otro equipo o jornada." : "Todos los pendientes de jornadas anteriores están resueltos."}</p>
          </EmptyState>
        )}
        <div className="footer"><button type="button" onClick={onClose} disabled={busy}>Cerrar</button></div>
      </Content>
    </Modal>
  );
}

const Content = styled.div`
  color: ${({ theme }) => theme.text};
  .description {
    max-width: 60ch;
    margin: 0 0 22px;
    color: ${({ theme }) => theme.tournamentDashboard?.muted || theme.colorSubtitle};
    font-size: 0.9rem;
    line-height: 1.5;
  }
  .footer {
    display: flex;
    justify-content: flex-end;
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid ${({ theme }) => theme.tournamentDashboard?.border || theme.bg4};
  }
  .footer button {
    min-height: 44px; padding: 8px 20px; border-radius: 9px;
    border: 1px solid ${({ theme }) => theme.tournamentDashboard?.border || theme.bg4};
    background: transparent; color: inherit; font: inherit; font-weight: 600; cursor: pointer;
  }
  .footer button:hover:not(:disabled) { background: ${({ theme }) => theme.bg3}; }
  button:focus-visible {
    outline: 2px solid ${({ theme }) => theme.tournamentDashboard?.hero?.accentStrong || theme.color1};
    outline-offset: 3px;
  }
  button:disabled { opacity: 0.5; cursor: wait; }
`;

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;

  @media (max-width: 600px) {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
`;

const SearchField = styled.label`
  display: flex; align-items: center; gap: 10px; width: min(100%, 390px);
  padding: 0 14px; border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.tournamentDashboard?.border || theme.bg4};
  background: ${({ theme }) => theme.tournamentDashboard?.itemSurface || theme.bg3};
  color: ${({ theme }) => theme.tournamentDashboard?.muted || theme.colorSubtitle};
  transition: border-color 0.15s ease, background 0.15s ease;
  &:focus-within {
    border-color: ${({ theme }) => theme.tournamentDashboard?.hero?.accentStrong || theme.color1};
    background: ${({ theme }) => theme.tournamentDashboard?.surface || theme.bgcards};
    outline: 2px solid ${({ theme }) => theme.tournamentDashboard?.hero?.accentStrong || theme.color1};
    outline-offset: 2px;
  }
  svg { flex: 0 0 auto; font-size: 1.1rem; }
  input { width: 100%; min-width: 0; min-height: 44px; border: 0; outline: 0; background: transparent; color: ${({ theme }) => theme.text}; font: inherit; font-size: 0.9rem; }
  input::placeholder { color: ${({ theme }) => theme.tournamentDashboard?.muted || theme.colorSubtitle}; }

  @media (max-width: 600px) { width: 100%; }
`;

const Count = styled.p`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  flex: 0 0 auto;
  margin: 0;
  color: ${({ theme }) => theme.tournamentDashboard?.muted || theme.colorSubtitle};
  font-size: 0.82rem;
  font-weight: 600;
  strong {
    display: inline-grid;
    place-items: center;
    min-width: 28px;
    min-height: 28px;
    padding: 2px 7px;
    border-radius: 8px;
    background: ${({ theme }) => theme.tournamentDashboard?.primarySoft || theme.bg6};
    color: ${({ theme }) => theme.tournamentDashboard?.hero?.accentStrong || theme.color1};
    font-size: 0.88rem;
    font-variant-numeric: tabular-nums;
  }
`;

const MatchList = styled.ul`
  padding: 0;
  margin: 0;
  list-style: none;
  border: 1px solid ${({ theme }) => theme.tournamentDashboard?.border || theme.bg4};
  border-radius: 12px;
  overflow: hidden;
`;

const MatchItem = styled.li`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 19px 22px;
  background: ${({ theme }) => theme.tournamentDashboard?.surface || theme.bgcards};
  & + & { border-top: 1px solid ${({ theme }) => theme.tournamentDashboard?.border || theme.bg4}; }
  .match-info { min-width: 0; flex: 1; }
  .origin {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 10px;
    color: ${({ theme }) => theme.tournamentDashboard?.hero?.accentStrong || theme.color1};
    font-size: 0.79rem;
    font-weight: 700;
  }
  .origin svg { font-size: 1rem; }
  .teams {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 7px;
    font-size: 0.98rem;
    font-weight: 700;
    line-height: 1.35;
    overflow-wrap: anywhere;
  }
  .vs { font-size: 0.78rem; font-weight: 500; color: ${({ theme }) => theme.tournamentDashboard?.muted || theme.colorSubtitle}; }
  .actions { display: flex; flex-direction: column; align-items: stretch; gap: 7px; width: 175px; flex: 0 0 175px; }
  @media (max-width: 600px) {
    align-items: stretch;
    flex-direction: column;
    gap: 16px;
    padding: 18px;
    .actions { flex-direction: row; width: 100%; flex: none; }
    .actions button { flex: 1; }
  }
  @media (max-width: 460px) {
    .actions { flex-direction: column; }
  }
`;

const ActionButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 44px;
  padding: 8px 12px;
  border-radius: 9px;
  border: 1px solid ${({ $primary, theme }) => $primary
    ? theme.tournamentDashboard?.hero?.accentStrong || theme.color1
    : theme.tournamentDashboard?.border || theme.bg4};
  background: ${({ $primary, theme }) => $primary
    ? theme.tournamentDashboard?.hero?.accentStrong || theme.color1
    : "transparent"};
  color: ${({ $primary, theme }) => $primary
    ? theme.tournamentDashboard?.surface || theme.bgcards
    : theme.text};
  font: inherit;
  font-size: 0.82rem;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.15s ease, filter 0.15s ease;
  &:hover:not(:disabled) { ${({ $primary, theme }) => $primary ? "filter: brightness(0.9);" : `background: ${theme.tournamentDashboard?.itemSurface || theme.bg3};`} }
  svg { flex: 0 0 auto; }
  &:not(:first-child) svg { color: ${({ theme }) => theme.tournamentDashboard?.metrics?.danger || theme.text}; }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 9px;
  padding: 42px 20px;
  border: 1px dashed ${({ theme }) => theme.tournamentDashboard?.border || theme.bg4};
  border-radius: 12px;
  text-align: center;
  svg { margin-bottom: 4px; color: ${({ theme }) => theme.tournamentDashboard?.hero?.accentStrong || theme.color1}; }
  strong { font-size: 1rem; }
  p { max-width: 38ch; margin: 0; color: ${({ theme }) => theme.tournamentDashboard?.muted || theme.colorSubtitle}; font-size: 0.9rem; line-height: 1.5; }
`;
