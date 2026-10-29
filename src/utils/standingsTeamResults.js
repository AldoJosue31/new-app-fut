import {
  FINISHED_STATUSES,
  getOfficialJornadaNumberForMatch,
  isDoubleWalkoverMatch,
} from './standingsSnapshot.js';

const parseScore = (value) => {
  if (value == null || String(value).trim() === '') return null;
  const score = Number(value);
  return Number.isInteger(score) && score >= 0 ? score : null;
};

// Receives the tournament's already loaded matches; no team request is needed.
export const getStandingsTeamResults = ({
  teamId,
  partidos = [],
  jornadas = [],
  repositionMappings = [],
  repositionMatchMappings = [],
  jornadaLimit = Infinity,
}) => {
  if (teamId == null) return [];

  return partidos.flatMap((match) => {
    if (match.team1_id == null || match.team2_id == null) return [];
    const isHome = String(match.team1_id) === String(teamId);
    if (!isHome && String(match.team2_id) !== String(teamId)) return [];
    if (!FINISHED_STATUSES.includes(String(match.status || '').trim().toLowerCase())) return [];

    const jornadaNumber = getOfficialJornadaNumberForMatch(
      match, jornadas, repositionMappings, repositionMatchMappings,
    );
    if (jornadaNumber <= 0 || jornadaNumber > jornadaLimit) return [];

    const goals1 = parseScore(match.goals1);
    const goals2 = parseScore(match.goals2);
    if (goals1 === null || goals2 === null) return [];

    const doubleWalkover = isDoubleWalkoverMatch(match);
    const myGoals = isHome ? goals1 : goals2;
    const rivalGoals = isHome ? goals2 : goals1;
    const result = doubleWalkover ? 'P' : myGoals > rivalGoals ? 'G' : myGoals < rivalGoals ? 'P' : 'E';
    const penalties = String(match.observations || '').match(/Pen.*:\s*(\d+)\s*-\s*(\d+)/i);

    return [{
      ...match,
      goals1,
      goals2,
      jornadaNumber,
      result,
      doubleWalkover,
      penalties: penalties ? `${penalties[1]} - ${penalties[2]}` : null,
    }];
  }).sort((a, b) => (
    b.jornadaNumber - a.jornadaNumber || String(b.date || '').localeCompare(String(a.date || ''))
  ));
};
