import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { RiCheckDoubleLine, RiCloseCircleLine, RiSearchLine, RiCalendarEventLine, RiTimeLine } from "react-icons/ri";
import { Modal } from "../../../Modal";
import { formatShortDate } from "../../../../../utils/dateUtils";

const normalize = (value) => String(value || "").normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function PendingMatchesModal({
  isOpen, suspended = false, onClose, matches = [], unresultedMatches = [], onOpenResult,
  onCancelMatch, onMarkPending, onMarkAllPending, busy = false,
}) {
  const [search, setSearch] = useState("");
  const contentRef = useRef(null);
  const returnFocusRef = useRef(null);
  const matchesSearch = (match) => normalize(
    `${match.local?.name} ${match.visitante?.name} ${match.originJornada}`,
  ).includes(normalize(search));
  const filteredMatches = matches.filter(matchesSearch);
  const filteredUnresulted = unresultedMatches.filter(matchesSearch);
  const totalMatches = matches.length + unresultedMatches.length;
  const visibleCount = filteredMatches.length + filteredUnresulted.length;

  const renderMatch = (match, isUnresulted) => (
    <MatchItem key={match.id}>
      <div className="match-info">
        <div className="match-meta">
          <span className="origin"><RiCalendarEventLine aria-hidden="true" />{match.originJornada}</span>
          {isUnresulted && <span className="scheduled-date">Programado: {formatShortDate(match.date)}</span>}
        </div>
        <div className="teams">
          <span className="team">{match.local?.name}</span>
          <span className="vs">vs</span>
          <span className="team">{match.visitante?.name}</span>
        </div>
      </div>
      <div className="actions">
        <ActionButton type="button" $primary disabled={busy} onClick={() => onOpenResult(match, isUnresulted)}
          aria-label={`Registrar resultado de ${match.local?.name} vs ${match.visitante?.name}`}>
          <RiCheckDoubleLine aria-hidden="true" /> Dar resultado
        </ActionButton>
        <ActionButton type="button" $danger={!isUnresulted} disabled={busy}
          onClick={() => isUnresulted ? onMarkPending(match) : onCancelMatch(match)}
          aria-label={isUnresulted
            ? `Marcar como pendiente a ${match.local?.name} vs ${match.visitante?.name}`
            : `Cancelar pendiente de ${match.local?.name} vs ${match.visitante?.name}`}>
          {isUnresulted ? <RiTimeLine aria-hidden="true" /> : <RiCloseCircleLine aria-hidden="true" />}
          {isUnresulted ? "Marcar pendiente" : "Cancelar pendiente"}
        </ActionButton>
      </div>
    </MatchItem>
  );

  useEffect(() => {
    if (!isOpen) {
      if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus();
      returnFocusRef.current = null;
      return undefined;
    }
    if (suspended) return undefined;
    const firstOpen = !returnFocusRef.current;
    if (firstOpen) returnFocusRef.current = document.activeElement;
    const frame = requestAnimationFrame(() => {
      contentRef.current?.querySelector("input, button")?.focus({ preventScroll: !firstOpen });
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen, suspended]);

  useEffect(() => () => {
    if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus();
  }, []);

  useEffect(() => {
    if (!isOpen || suspended) return undefined;
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
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, suspended, busy, onClose]);

  return (
    <Modal isOpen={isOpen} suspended={suspended} onClose={onClose} title="Administrar partidos pendientes"
      width="820px" closeOnOverlayClick={false} closeDisabled={busy}>
      <Content ref={contentRef} data-pending-dialog role="dialog" aria-modal="true"
        aria-label="Administrar partidos pendientes" aria-busy={busy}>
        <p className="description">
          Aplazados y partidos sin resultado de jornadas anteriores. La última jornada confirmada se gestiona en su propia jornada.
        </p>
        <Toolbar>
          {totalMatches > 0 && (
            <SearchField>
              <RiSearchLine aria-hidden="true" />
              <input type="search" aria-label="Buscar por equipo o jornada"
                placeholder="Buscar equipo o jornada" value={search}
                onChange={(event) => setSearch(event.target.value)} />
            </SearchField>
          )}
          <Count role="status">
            <strong>{visibleCount}</strong>
            <span>{visibleCount === 1 ? "partido por resolver" : "partidos por resolver"}</span>
          </Count>
        </Toolbar>
        {filteredMatches.length > 0 && (
          <MatchSection aria-labelledby="pending-section-title">
            <SectionTitle id="pending-section-title"><RiTimeLine aria-hidden="true" /> Partidos pendientes <span>{filteredMatches.length}</span></SectionTitle>
            <MatchList>{filteredMatches.map((match) => renderMatch(match, false))}</MatchList>
          </MatchSection>
        )}
        {filteredUnresulted.length > 0 && (
          <MatchSection aria-labelledby="unresulted-section-title">
            <SectionHeader>
              <SectionTitle id="unresulted-section-title"><RiCheckDoubleLine aria-hidden="true" /> Sin resultado <span>{filteredUnresulted.length}</span></SectionTitle>
              <BulkButton type="button" disabled={busy} onClick={() => onMarkAllPending(unresultedMatches)}
                aria-label={unresultedMatches.length === 1
                  ? "Marcar como pendiente el partido sin resultado"
                  : `Marcar como pendientes los ${unresultedMatches.length} partidos sin resultado`}>
                <RiTimeLine aria-hidden="true" />
                {unresultedMatches.length === 1 ? "Marcar pendiente" : "Marcar todos pendientes"}
                <span>{unresultedMatches.length}</span>
              </BulkButton>
            </SectionHeader>
            <MatchList>{filteredUnresulted.map((match) => renderMatch(match, true))}</MatchList>
          </MatchSection>
        )}
        {visibleCount === 0 && (
          <EmptyState>
            <RiCheckDoubleLine size={28} aria-hidden="true" />
            <strong>{totalMatches ? "Sin coincidencias" : "No hay partidos por resolver"}</strong>
            <p>{totalMatches ? "Prueba con otro equipo o jornada." : "No hay aplazados ni partidos sin resultado de jornadas anteriores."}</p>
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

const MatchSection = styled.section`
  & + & { margin-top: 24px; }
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px 16px;
  margin-bottom: 10px;
  h4 { margin-bottom: 0; }
`;

const SectionTitle = styled.h4`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 10px;
  color: ${({ theme }) => theme.text};
  font-size: 0.94rem;
  font-weight: 700;
  svg { color: ${({ theme }) => theme.tournamentDashboard?.hero?.accentStrong || theme.color1}; }
  span {
    margin-left: 2px;
    color: ${({ theme }) => theme.tournamentDashboard?.muted || theme.colorSubtitle};
    font-size: 0.8rem;
    font-variant-numeric: tabular-nums;
  }
`;

const BulkButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 38px;
  padding: 7px 10px;
  border: 1px solid ${({ theme }) => theme.tournamentDashboard?.border || theme.bg4};
  border-radius: 9px;
  background: ${({ theme }) => theme.tournamentDashboard?.primarySoft || theme.bg6};
  color: ${({ theme }) => theme.tournamentDashboard?.hero?.accentStrong || theme.color1};
  font: inherit;
  font-size: 0.79rem;
  font-weight: 700;
  cursor: pointer;
  &:hover:not(:disabled) { background: ${({ theme }) => theme.tournamentDashboard?.itemSurface || theme.bg3}; }
  span { font-variant-numeric: tabular-nums; }
  @media (max-width: 600px) { width: 100%; min-height: 44px; }
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
  .match-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 6px 14px; margin-bottom: 10px; }
  .origin {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: ${({ theme }) => theme.tournamentDashboard?.hero?.accentStrong || theme.color1};
    font-size: 0.79rem;
    font-weight: 700;
  }
  .origin svg { font-size: 1rem; }
  .scheduled-date { color: ${({ theme }) => theme.tournamentDashboard?.muted || theme.colorSubtitle}; font-size: 0.79rem; }
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
  ${({ $danger, theme }) => $danger && `svg { color: ${theme.tournamentDashboard?.metrics?.danger || theme.text}; }`}
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
