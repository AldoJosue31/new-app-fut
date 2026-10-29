import React, { useEffect, useMemo, useRef } from 'react';
import styled from 'styled-components';
import { Modal } from '../../../Modal';
import { TeamLogo } from '../../../teamDetailModal/TeamLogo';
import { formatShortDate } from '../../../../../utils/dateUtils';
import { getStandingsTeamResults } from '../../../../../utils/standingsTeamResults.js';

const resultLabels = { G: 'Ganado', E: 'Empatado', P: 'Perdido' };

export function StandingsTeamResultsModal({
  team, teams, torneoNombre, partidos, jornadas, repositionMappings,
  repositionMatchMappings, jornadaLimit, onClose,
}) {
  const dialogRef = useRef(null);
  const results = useMemo(() => getStandingsTeamResults({
    teamId: team.id, partidos, jornadas, repositionMappings, repositionMatchMappings, jornadaLimit,
  }), [team.id, partidos, jornadas, repositionMappings, repositionMatchMappings, jornadaLimit]);
  const teamsById = useMemo(() => new Map(teams.map((item) => [String(item.id), {
    name: item.nombre, logo_url: item.logo, color: item.color,
  }])), [teams]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    const previousFocus = document.activeElement;
    const closeButton = dialog.querySelector('button');
    closeButton?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
      // The close button is the only interactive control in this read-only dialog.
      if (event.key === 'Tab') {
        event.preventDefault();
        closeButton?.focus();
      }
    };
    dialog.addEventListener('keydown', handleKeyDown);
    return () => {
      dialog.removeEventListener('keydown', handleKeyDown);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [onClose]);

  const getClub = (match, side) => teamsById.get(String(match[`team${side}_id`]))
    || match[`team${side}`] || { name: 'Equipo' };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Resultados de ${team.nombre}`}
      dialogRef={dialogRef}
      width="680px"
      bodyPadding="0"
    >
      <ResultsContent>
        <p className="context">
          {[torneoNombre, Number.isFinite(jornadaLimit) && `Hasta la jornada ${jornadaLimit}`].filter(Boolean).join(' · ')}
        </p>
        {results.length === 0 ? (
          <p className="empty">Este equipo aún no tiene resultados registrados en las jornadas de esta tabla.</p>
        ) : (
          <ol aria-label="Resultados del equipo">
            {results.map((match) => (
              <li className="match-row" key={match.id}>
                <div className="match-meta">
                  <span className="jornada">Jornada {match.jornadaNumber}</span>
                  {match.date && <time dateTime={match.date}>{formatShortDate(match.date)}</time>}
                </div>
                <ResultLabel $result={match.result}>{resultLabels[match.result]}</ResultLabel>
                <div className="match-score">
                  <div className="club home">
                    <span className="logo"><TeamLogo club={getClub(match, 1)} /></span>
                    <span className="club-name" title={getClub(match, 1).name}>{getClub(match, 1).name}</span>
                  </div>
                  <strong className="scoreline" aria-label={`${match.goals1} a ${match.goals2}`}>
                    <span>{match.goals1}</span><span className="score-divider">-</span><span>{match.goals2}</span>
                  </strong>
                  <div className="club away">
                    <span className="logo"><TeamLogo club={getClub(match, 2)} /></span>
                    <span className="club-name" title={getClub(match, 2).name}>{getClub(match, 2).name}</span>
                  </div>
                </div>
                {(match.penalties || match.doubleWalkover) && (
                  <div className="match-notes">
                    {match.penalties && <p>Penales: {match.penalties}</p>}
                    {match.doubleWalkover && <p>Doble W.O. · Ambos equipos pierden por default</p>}
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </ResultsContent>
    </Modal>
  );
}

const ResultsContent = styled.div`
  --score-width: 80px;
  padding: 20px 24px 24px;
  color: ${({ theme }) => theme.text};
  font-size: 0.875rem;
  font-variant-numeric: tabular-nums;

  .context, .empty, .match-meta time, .match-notes {
    color: ${({ theme }) => theme.tournamentDashboard?.muted || theme.colorSubtitle};
  }
  .context { margin: 0 0 20px; line-height: 1.5; overflow-wrap: anywhere; }
  .empty { margin: 32px 0; text-align: center; line-height: 1.6; }
  ol { display: grid; gap: 12px; list-style: none; padding: 0; margin: 0; }
  .match-row {
    display: grid;
    grid-template-columns: 72px minmax(0, 1fr) 72px;
    grid-template-areas: 'meta fixture result';
    align-items: center;
    column-gap: 12px;
    row-gap: 8px;
    padding: 16px;
    min-height: 96px;
    box-sizing: border-box;
    border-radius: 12px;
    background: ${({ theme }) => theme.tournamentDashboard?.itemSurface || theme.bg2};
  }
  .match-row:has(.match-notes) { grid-template-areas: 'meta fixture result' '. notes .'; }
  .match-meta { grid-area: meta; display: grid; gap: 4px; font-size: 0.75rem; line-height: 1.4; }
  .jornada { font-weight: 600; }
  .match-score {
    grid-area: fixture;
    display: grid;
    grid-template-columns: minmax(0, 1fr) var(--score-width) minmax(0, 1fr);
    align-items: center;
    gap: 8px;
    min-width: 0;
  }
  .scoreline {
    display: grid;
    grid-template-columns: 1fr 12px 1fr;
    align-items: center;
    text-align: center;
    font-size: 1.5rem;
    line-height: 1;
    white-space: nowrap;
  }
  .score-divider { font-size: 1rem; font-weight: 400; }
  .club { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .club-name { min-width: 0; overflow-wrap: anywhere; line-height: 1.4; font-weight: 500; }
  .home { flex-direction: row-reverse; text-align: right; }
  .logo { display: flex; flex: 0 0 28px; width: 28px; height: 28px; align-items: center; justify-content: center; }
  .logo img { width: 100%; height: 100%; object-fit: contain; }
  .match-notes { grid-area: notes; text-align: center; font-size: 0.75rem; line-height: 1.4; }
  .match-notes p { margin: 0; }

  @media (max-width: 640px) {
    padding: 16px;
    .context { margin-bottom: 16px; }
    .match-row {
      grid-template-columns: minmax(0, 1fr) auto;
      grid-template-areas: 'meta result' 'fixture fixture';
      row-gap: 12px;
    }
    .match-row:has(.match-notes) { grid-template-areas: 'meta result' 'fixture fixture' 'notes notes'; }
    .match-meta { display: flex; align-items: baseline; flex-wrap: wrap; gap: 4px 8px; }
  }

  @media (max-width: 520px) {
    --score-width: 72px;
    .match-row { padding: 12px; }
    .match-score { align-items: start; }
    .scoreline { align-self: center; }
    .club { flex-direction: column; text-align: center; gap: 8px; }
    .club-name {
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow: hidden;
      width: 100%;
      min-height: 2.8em;
      font-size: 0.8125rem;
    }
  }
`;

const ResultLabel = styled.span`
  grid-area: result;
  justify-self: end;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.75rem;
  line-height: 1.4;
  font-weight: 600;
  white-space: nowrap;
  background: ${({ theme, $result }) => $result === 'G'
    ? theme.tournamentDashboard?.metrics?.accentSoft || theme.bg
    : theme.tournamentDashboard?.surface || theme.bg};
  color: ${({ theme, $result }) => $result === 'G'
    ? theme.tournamentDashboard?.metrics?.accentStrong || theme.text
    : theme.text};
`;
