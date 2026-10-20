export const makeForecastFixture = () => {
  const teams = ["Azules", "Rojos", "Verdes", "Dorados"].map((name, i) => ({ id: i + 1, name, color: "#147aa7" }));
  const jornadas = [1, 2, 3].map((id) => ({ id, name: `Jornada ${id}`, status: "Confirmada", tournament_id: 42 }));
  const pairs = [[1, 2], [3, 4], [1, 3], [2, 4], [1, 4], [2, 3]];
  const matches = pairs.map(([team1_id, team2_id], index) => ({
    id: index + 1, jornada_id: Math.floor(index / 2) + 1, team1_id, team2_id,
    status: index < 2 ? "Finalizado" : "Programado", goals1: index < 2 ? 3 : null, goals2: index < 2 ? 0 : null,
    puntos1: index < 2 ? 3 : null, puntos2: index < 2 ? 0 : null,
    observations: "", date: `2026-11-${String(1 + index).padStart(2, "0")}T18:00:00Z`, jornadas: jornadas[Math.floor(index / 2)],
  }));
  return { tournament: { id: 42, format: "Liga", status: "Activo", config: { participatingIds: [1, 2, 3, 4], vueltas: "1", winPoints: 3, drawPoints: 1, lossPoints: 0, zonaLiguilla: true, clasificados: 2, repechajeTeams: 2, ascensos: 1, descensos: 1, playoffTieBreaker: "bestSeed" } }, teams, jornadas, matches, teamId: 1, movement: { canPromote: true, canRelegate: true }, iterations: 300, seed: "tests" };
};
