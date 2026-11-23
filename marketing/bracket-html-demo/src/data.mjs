import { buildTorneoStandingsSnapshot } from '../../../src/utils/standingsSnapshot.js';

// Synthetic league, teams and players. No production identity or network access.
export const division = { id: 94, name: 'Primera', league_id: 7 };
export const league = { id: 7, name: 'Liga Demo', owner_id: '00000000-0000-4000-8000-000000000002' };
export const teams = [
  { id: 17, name: 'Halcones', color: '#1976ad', division_id: 94 },
  { id: 18, name: 'Leones', color: '#cc841d', division_id: 94 },
  { id: 19, name: 'Tigres', color: '#673eb0', division_id: 94 },
  { id: 20, name: 'Lobos', color: '#26785e', division_id: 94 },
];
const names = {
  17: ['Alan', 'Bruno', 'Carlos', 'Diego', 'Emilio', 'Fabio', 'Gabriel'],
  18: ['Hugo', 'Iván', 'Jorge', 'Kevin', 'Luis', 'Mario', 'Nicolás'],
  19: ['Óscar', 'Pablo', 'Rafael', 'Saúl', 'Tomás', 'Uriel', 'Víctor'],
  20: ['Adrián', 'Benjamín', 'César', 'Daniel', 'Ernesto', 'Felipe', 'Gustavo'],
};
export const players = teams.flatMap(team => names[team.id].map((first_name, i) => ({
  id: team.id * 100 + i, team_id: team.id, first_name, last_name: 'Demo', dorsal: i + 1, is_active: true,
})));
export const jornadas = [
  { id: 455, tournament_id: 123, name: 'Jornada 1', status: 'Confirmada', start_date: '2026-10-26', end_date: '2026-11-01' },
  { id: 456, tournament_id: 123, name: 'Jornada 2', status: 'Confirmada', start_date: '2026-11-02', end_date: '2026-11-08' },
];
export const tournament = {
  id: 123, season: 'Apertura Demo', status: 'Activo', division_id: 94, division,
  start_date: '2026-10-26', is_public: false,
  config: { participatingIds: teams.map(t => t.id), jornadaDurationDays: 7, vueltas: '1', minPlayers: 7,
    winPoints: 3, drawPoints: 1, lossPoints: 0, tieBreakType: 'normal' },
  jornadas,
};
const finished = (id, jornada, team1_id, team2_id, goals1, goals2) => ({
  id, jornada_id: jornada.id, jornadas: jornada, team1_id, team2_id,
  date: `${jornada.start_date}T12:00:00`, status: 'Finalizado', goals1, goals2,
});
export const targetMatch = {
  id: 91, jornada_id: 456, jornadas: jornadas[1], team1_id: 17, team2_id: 18,
  date: '2026-11-08T10:00:00', status: 'Programado', local: teams[0], visitante: teams[1],
};
export const matchesBefore = [
  finished(87, jornadas[0], 17, 19, 2, 0), finished(88, jornadas[0], 18, 20, 1, 0),
  finished(90, jornadas[1], 19, 20, 1, 1), targetMatch,
];
export const matchesAfter = matchesBefore.map(m => m.id === 91
  ? { ...m, status: 'Finalizado', goals1: 1, goals2: 0, puntos1: 3, puntos2: 0 } : m);
export const snapshot = buildTorneoStandingsSnapshot({
  torneo: tournament, equipos: teams, partidos: matchesAfter, jornadasProp: jornadas,
});
export const STORY = [
  { title: 'Toda la jornada a la vista.', detail: 'Consulta la programación en lista o en grilla semanal, y abre el partido que vas a registrar.' },
  { title: 'Cada gol, en su lugar.', detail: 'Completa las alineaciones con los jugadores registrados y captura el gol de Halcones.' },
  { title: 'Revisa antes de guardar.', detail: 'Confirma los equipos y el marcador. El partido queda registrado como finalizado.' },
  { title: 'El resultado ya cuenta.', detail: 'Halcones suma tres puntos. La clasificación reúne los resultados del mismo torneo.' },
  { title: 'Una tabla lista para presentar.', detail: 'Abre la exportación con los mismos equipos, resultados y puntos de la competición.' },
];
