import { createHash } from "node:crypto";
import {
  buildTorneoStandingsSnapshot,
  FINISHED_STATUSES,
  getOfficialJornadaNumberForMatch,
} from "../../utils/standingsSnapshot.js";
import { normalizeJornadaName, resolveRepositionMappings } from "../../utils/jornadaUtils.js";

const VERSION = "poisson-regularized-v1";
const SIMULATIONS = 5000;
const PRIOR_MATCHES = 6;
const HALF_LIFE_ROUNDS = 6;
const cache = new Map();
const key = (value) => String(value ?? "");
const status = (value) => key(value).trim().toLowerCase();
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const round = (value, digits = 2) => Number(value.toFixed(digits));
const validGoal = (value) => value !== null && value !== undefined && value !== "" && Number.isInteger(Number(value)) && Number(value) >= 0;
const finished = (match) => FINISHED_STATUSES.includes(status(match.status));
const scored = (match) => finished(match) && validGoal(match.goals1) && validGoal(match.goals2);
const involves = (match, teamId) => key(match.team1_id) === key(teamId) || key(match.team2_id) === key(teamId);
const walkover = (match) => /w\s*\.?\s*o\s*\.?|por\s+default|incomparecencia/i.test(match.observations || "");
const playable = (match) => ["pendiente", "programado", "aplazado", "pospuesto", "en curso", "en juego"].includes(status(match.status));
const sortRows = (a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf || a.pj - b.pj;

export const parseForecastConfig = (value) => {
  if (typeof value === "string") {
    try { return parseForecastConfig(JSON.parse(value)); } catch { return {}; }
  }
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
};

const getFixtures = ({ tournament, teams, matches, jornadas }) => {
  const config = parseForecastConfig(tournament.config);
  const ids = new Set(teams.map((team) => key(team.id)));
  const mappings = resolveRepositionMappings({ jornadas, configuredMappings: config.repositionMappings || [] });
  const seen = new Set();
  return matches.filter((match) => {
    const jornada = jornadas.find((item) => key(item.id) === key(match.jornada_id));
    const tournamentId = match.jornadas?.tournament_id || match.tournament_id || jornada?.tournament_id;
    if (key(tournamentId) !== key(tournament.id)) return false;
    if (seen.has(key(match.id))) return false;
    seen.add(key(match.id));
    return ids.has(key(match.team1_id)) && ids.has(key(match.team2_id)) && key(match.team1_id) !== key(match.team2_id);
  }).map((match) => {
    const name = match.jornadas?.name || jornadas.find((item) => key(item.id) === key(match.jornada_id))?.name || "";
    const regularRound = getOfficialJornadaNumberForMatch(match, jornadas, mappings, config.repositionMatchMappings || []);
    const playoff = /repechaje|dieciseisavos|octavos|cuartos|semifinal|^final(?:\s|$)/.test(normalizeJornadaName(name));
    return { ...match, round: regularRound, isRegular: regularRound > 0, stageName: playoff ? name : null };
  }).filter((match) => match.isRegular || match.stageName).sort((a, b) => a.round - b.round || Number(a.id) - Number(b.id));
};

// Regularized Poisson attack/defence fit. Team 1 is not assumed to have home advantage.
export const fitGoalModel = (teams, matches, { roundDays = 7 } = {}) => {
  const latest = Math.max(0, ...matches.map((match) => match.round));
  const dated = matches.length > 0 && matches.every((match) => match.date && Number.isFinite(Date.parse(match.date)));
  const latestDate = dated ? Math.max(...matches.map((match) => Date.parse(match.date))) : 0;
  const games = matches.filter((match) => scored(match) && !walkover(match)).map((match) => ({
    a: key(match.team1_id), b: key(match.team2_id),
    x: Number(match.goals1), y: Number(match.goals2),
    weight: 2 ** (-(dated ? (latestDate - Date.parse(match.date)) / (Math.max(1, roundDays) * 86400000) : latest - match.round) / HALF_LIFE_ROUNDS),
  }));
  const weight = games.reduce((sum, game) => sum + game.weight, 0);
  const totalGoals = games.reduce((sum, game) => sum + game.weight * (game.x + game.y), 0);
  const base = Math.max(0.15, (totalGoals + 4) / (2 * weight + 2));
  const ratings = new Map(teams.map((team) => [key(team.id), { attack: 1, defence: 1, count: 0 }]));
  games.forEach((game) => { ratings.get(game.a).count++; ratings.get(game.b).count++; });
  for (let iteration = 0; iteration < 35; iteration++) {
    const totals = new Map(teams.map((team) => [key(team.id), { gf: PRIOR_MATCHES * base, gc: PRIOR_MATCHES * base, attackExposure: PRIOR_MATCHES * base, defenceExposure: PRIOR_MATCHES * base }]));
    games.forEach((game) => {
      const a = totals.get(game.a); const b = totals.get(game.b);
      a.gf += game.weight * game.x; a.gc += game.weight * game.y;
      b.gf += game.weight * game.y; b.gc += game.weight * game.x;
      a.attackExposure += game.weight * base * ratings.get(game.b).defence;
      a.defenceExposure += game.weight * base * ratings.get(game.b).attack;
      b.attackExposure += game.weight * base * ratings.get(game.a).defence;
      b.defenceExposure += game.weight * base * ratings.get(game.a).attack;
    });
    ratings.forEach((rating, id) => {
      const total = totals.get(id);
      rating.attack = (rating.attack + total.gf / total.attackExposure) / 2;
      rating.defence = (rating.defence + total.gc / total.defenceExposure) / 2;
    });
  }
  return { base, ratings, matches: matches.filter((match) => scored(match) && !walkover(match)) };
};

const comparePlayedDates = (a, b) => {
  const aTime = a.date ? Date.parse(a.date) : NaN; const bTime = b.date ? Date.parse(b.date) : NaN;
  if (Number.isFinite(aTime) && Number.isFinite(bTime)) return aTime - bTime || a.round - b.round || Number(a.id) - Number(b.id);
  // Undated results appear first, in official-round order, so they cannot
  // displace the latest dated encounters from a recent-history slice.
  if (Number.isFinite(aTime)) return 1;
  if (Number.isFinite(bTime)) return -1;
  return a.round - b.round || Number(a.id) - Number(b.id);
};

const teamGames = (matches, teamId) => [...matches].sort(comparePlayedDates).filter((match) => involves(match, teamId)).map((match) => {
  const first = key(match.team1_id) === key(teamId);
  const gf = Number(first ? match.goals1 : match.goals2);
  const gc = Number(first ? match.goals2 : match.goals1);
  return { opponentId: first ? match.team2_id : match.team1_id, gf, gc, round: match.round, stageName: match.stageName, date: match.date, result: gf > gc ? "G" : gf < gc ? "P" : "E" };
});

const commonOpponents = (model, teamId, rivalId, teams) => {
  const own = teamGames(model.matches, teamId);
  const rival = teamGames(model.matches, rivalId);
  return teams.filter((team) => key(team.id) !== key(teamId) && key(team.id) !== key(rivalId)).flatMap((team) => {
    const a = own.filter((game) => key(game.opponentId) === key(team.id));
    const b = rival.filter((game) => key(game.opponentId) === key(team.id));
    if (!a.length || !b.length) return [];
    const summarize = (games) => ({ games: games.length, goalDifference: round(games.reduce((sum, game) => sum + game.gf - game.gc, 0) / games.length), results: games.slice(-3).map((game) => `${game.gf}–${game.gc}`) });
    return [{ id: team.id, name: team.name, own: summarize(a), rival: summarize(b) }];
  });
};

export const poissonDistribution = (rate) => {
  const lambda = clamp(rate, 0.05, 40);
  const probabilities = [Math.exp(-lambda)];
  let sum = probabilities[0];
  for (let goals = 1; goals < 160 && (goals < lambda || sum < 1 - 1e-12); goals++) {
    probabilities.push(probabilities[goals - 1] * lambda / goals);
    sum += probabilities[goals];
  }
  return probabilities.map((probability) => probability / sum);
};

export const predictMatch = (model, teamId, rivalId, teams = []) => {
  const a = model.ratings.get(key(teamId)); const b = model.ratings.get(key(rivalId));
  const common = commonOpponents(model, teamId, rivalId, teams);
  // A small residual correction avoids treating common-opponent results as transitive wins.
  const expectedDifference = (id, opponentId) => {
    const own = model.ratings.get(key(id)); const opponent = model.ratings.get(key(opponentId));
    return model.base * (own.attack * opponent.defence - opponent.attack * own.defence);
  };
  const residuals = common.map((entry) => {
    const residual = entry.own.goalDifference - entry.rival.goalDifference - expectedDifference(teamId, entry.id) + expectedDifference(rivalId, entry.id);
    return residual * Math.min(entry.own.games, entry.rival.games) / (Math.min(entry.own.games, entry.rival.games) + 4);
  });
  const adjustment = clamp(residuals.reduce((sum, value) => sum + value, 0) / Math.max(1, residuals.length) * 0.04, -0.12, 0.12);
  const ownGoals = clamp(model.base * a.attack * b.defence * Math.exp(adjustment), 0.05, 40);
  const rivalGoals = clamp(model.base * b.attack * a.defence * Math.exp(-adjustment), 0.05, 40);
  const ownDistribution = poissonDistribution(ownGoals); const rivalDistribution = poissonDistribution(rivalGoals);
  let win = 0; let draw = 0; let lose = 0;
  ownDistribution.forEach((p, x) => rivalDistribution.forEach((q, y) => {
    if (x > y) win += p * q;
    else if (x === y) draw += p * q;
    else lose += p * q;
  }));
  // Largest-remainder rounding keeps the displayed percentages exactly at 100.
  const values = [win, draw, lose].map((p) => p * 100);
  const percentages = values.map(Math.floor);
  const remainderOrder = values.map((value, index) => ({ index, fraction: value - percentages[index] })).sort((x, y) => y.fraction - x.fraction);
  const missing = 100 - percentages.reduce((sum, p) => sum + p, 0);
  for (let i = 0; i < missing; i++) percentages[remainderOrder[i].index]++;
  return { win, draw, lose, percentages, ownGoals, rivalGoals, ownDistribution, rivalDistribution, common };
};

const seededRandom = (seed) => {
  let state = Number.parseInt(createHash("sha256").update(seed).digest("hex").slice(0, 8), 16);
  return () => {
    state += 0x6D2B79F5;
    let value = Math.imul(state ^ state >>> 15, 1 | state);
    value ^= value + Math.imul(value ^ value >>> 7, 61 | value);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
};
const sampleGoals = (distribution, random) => {
  let value = random();
  for (let i = 0; i < distribution.length; i++) { value -= distribution[i]; if (value <= 0) return i; }
  return distribution.length - 1;
};

const scheduleReadiness = (tournament, teams, fixtures) => {
  const config = parseForecastConfig(tournament.config);
  if (new Set((config.participatingIds || []).map(key)).size !== teams.length) return "Faltan datos de equipos participantes para proyectar la clasificación.";
  if ((tournament.format || config.format) !== "Liga") return "La proyección de posiciones requiere un torneo con fase de liga.";
  if (config.playoffState?.currentPhaseKey || config.playoffState?.stages?.length) return "La liguilla ya comenzó; la proyección de la fase regular está cerrada.";
  if (config.fixtureCriteria?.enforceRoundRobin === false) return "El calendario es flexible y no permite verificar cuántos encuentros faltan para cerrar la fase regular.";
  const turns = Number(config.vueltas);
  if (!Number.isInteger(turns) || turns < 1 || turns > 4) return "Falta definir el número de vueltas del torneo.";
  const counts = new Map();
  fixtures.filter((match) => status(match.status) !== "cancelado").forEach((match) => {
    const pair = [key(match.team1_id), key(match.team2_id)].sort().join(":");
    counts.set(pair, (counts.get(pair) || 0) + 1);
  });
  if (counts.size !== teams.length * (teams.length - 1) / 2 || [...counts.values()].some((count) => count !== turns)) return "El calendario todavía está incompleto o tiene cruces adicionales. La proyección se habilitará cuando esté completo.";
  if (fixtures.some((match) => status(match.status) !== "cancelado" && !scored(match) && !playable(match))) return "Hay resultados incompletos o partidos sin un estado válido para proyectar la temporada.";
  return null;
};

const simulateSeason = ({ tournament, teams, fixtures, standings, model, teamId, movement, seed, iterations }) => {
  const regularFixtures = fixtures.filter((match) => match.isRegular);
  const reason = scheduleReadiness(tournament, teams, regularFixtures);
  if (reason) return { available: false, reason };
  const config = parseForecastConfig(tournament.config);
  const remaining = regularFixtures.filter(playable);
  const forecasts = remaining.map((match) => ({ match, prediction: predictMatch(model, match.team1_id, match.team2_id, teams) }));
  const random = seededRandom(seed);
  const direct = config.zonaLiguilla ? clamp(Number(config.clasificados) || 0, 0, teams.length) : 0;
  const rep = direct ? clamp(Number(config.repechajeTeams) || 0, 0, teams.length - direct) : 0;
  const hasTies = standings.some((row, index) => index > 0 && !sortRows(row, standings[index - 1]));
  const count = remaining.length || rep || hasTies ? iterations : 1;
  const promotion = clamp(Number(config.ascensos) || 0, 0, teams.length);
  const relegation = clamp(Number(config.descensos) || 0, 0, teams.length);
  const wins = { direct: 0, repechage: 0, qualified: 0, promotion: 0, relegation: 0, survival: 0 };
  const positions = []; const points = [];
  let unresolvedTie = false;
  const repForecasts = new Map();
  for (let iteration = 0; iteration < count; iteration++) {
    const rows = standings.map((row) => ({ ...row, tie: random() }));
    const byId = new Map(rows.map((row) => [key(row.id), row]));
    forecasts.forEach(({ match, prediction }) => {
      const x = sampleGoals(prediction.ownDistribution, random); const y = sampleGoals(prediction.rivalDistribution, random);
      const a = byId.get(key(match.team1_id)); const b = byId.get(key(match.team2_id));
      a.pj++; b.pj++; a.gf += x; b.gf += y; a.gc += y; b.gc += x; a.dg = a.gf - a.gc; b.dg = b.gf - b.gc;
      const winPoints = Number(config.winPoints ?? 3); const drawPoints = Number(config.drawPoints ?? 1); const lossPoints = Number(config.lossPoints ?? 0);
      a.pts += x > y ? winPoints : x < y ? lossPoints : drawPoints;
      b.pts += y > x ? winPoints : y < x ? lossPoints : drawPoints;
      if (x === y && ["penalties", "shoutouts", "shouts", "penales"].includes(status(config.tieBreakType))) {
        // There is no penalty-shootout skill data: symmetric chance for the extra point.
        (random() < 0.5 ? a : b).pts++;
      }
    });
    rows.sort((a, b) => sortRows(a, b) || a.tie - b.tie);
    const index = rows.findIndex((row) => key(row.id) === key(teamId));
    const place = index + 1; const own = rows[index];
    if ((index > 0 && !sortRows(own, rows[index - 1])) || (index < rows.length - 1 && !sortRows(own, rows[index + 1]))) unresolvedTie = true;
    positions.push(place); points.push(own.pts);
    if (direct && place <= direct) { wins.direct++; wins.qualified++; }
    if (rep && place > direct && place <= direct + rep) {
      wins.repechage++;
      const repIndex = place - direct - 1; const opponent = rows[direct + rep - 1 - repIndex];
      const aSeed = Math.min(place, direct + rep - repIndex); const bSeed = Math.max(place, direct + rep - repIndex);
      if (opponent.id === own.id) wins.qualified++;
      else {
        const pairKey = `${own.id}:${opponent.id}`;
        if (!repForecasts.has(pairKey)) repForecasts.set(pairKey, predictMatch(model, own.id, opponent.id, teams));
        const prediction = repForecasts.get(pairKey);
        let margin = 0;
        const legs = config.repechajeLegs === "double" ? 2 : 1;
        for (let leg = 0; leg < legs; leg++) margin += sampleGoals(prediction.ownDistribution, random) - sampleGoals(prediction.rivalDistribution, random);
        const tieWin = config.playoffTieBreaker === "penalties" ? random() < 0.5 : place === aSeed && aSeed < bSeed;
        if (margin > 0 || (margin === 0 && tieWin)) wins.qualified++;
      }
    }
    if (promotion && place <= promotion) wins.promotion++;
    if (relegation && place > teams.length - relegation) wins.relegation++;
    else wins.survival++;
  }
  const exact = !remaining.length && !unresolvedTie;
  const probability = (value) => ({ percent: round(value / count * 100, 1), exact });
  const objectives = [];
  if (direct) objectives.push({ id: "direct", label: "Liguilla directa", ...probability(wins.direct) });
  if (rep) {
    objectives.push({ id: "repechage", label: "Entrar a repechaje", ...probability(wins.repechage) });
    objectives.push({ id: "qualified", label: "Liguilla, incluido repechaje", ...probability(wins.qualified), exact: false });
  }
  if (promotion) objectives.push({ id: "promotion", label: movement.canPromote ? "Ascender" : "Zona de ascenso", ...probability(wins.promotion) });
  if (relegation) {
    objectives.push({ id: "relegation", label: movement.canRelegate ? "Descender" : "Zona de descenso", ...probability(wins.relegation) });
    objectives.push({ id: "survival", label: "Permanencia", ...probability(wins.survival) });
  }
  positions.sort((a, b) => a - b); points.sort((a, b) => a - b);
  const quantile = (values, q) => values[Math.floor((values.length - 1) * q)];
  return { available: true, simulations: count, remainingMatches: remaining.length, objectives, positionRange: [quantile(positions, 0.1), quantile(positions, 0.9)], pointsRange: [quantile(points, 0.1), quantile(points, 0.9)], expectedPoints: round(points.reduce((sum, value) => sum + value, 0) / count, 1), unresolvedTie, exact };
};

export const evaluateForecast = (teams, fixtures, options = {}) => {
  // Repositioned games may belong to an old official round. Validate by playing
  // date, never the original round, and omit undated games from this evaluation.
  const games = fixtures.filter((match) => scored(match) && !walkover(match) && match.date && Number.isFinite(Date.parse(match.date)))
    .map((game) => ({ ...game, validationDay: Math.floor(Date.parse(game.date) / 86400000) }));
  const days = [...new Set(games.map((game) => game.validationDay))].sort((a, b) => a - b).slice(-6);
  let total = 0; let baseline = 0; let count = 0;
  days.forEach((day) => {
    const training = games.filter((game) => game.validationDay < day);
    if (training.length < Math.max(6, teams.length)) return;
    const model = fitGoalModel(teams, training, options);
    games.filter((game) => game.validationDay === day).forEach((game) => {
      const prediction = predictMatch(model, game.team1_id, game.team2_id, teams);
      const outcome = Number(game.goals1) > Number(game.goals2) ? 0 : Number(game.goals1) === Number(game.goals2) ? 1 : 2;
      [prediction.win, prediction.draw, prediction.lose].forEach((p, i) => { total += (p - Number(i === outcome)) ** 2; baseline += (1 / 3 - Number(i === outcome)) ** 2; });
      count++;
    });
  });
  return { matches: count, brier: count ? round(total / count, 3) : null, baselineBrier: count ? round(baseline / count, 3) : null };
};

export const buildTournamentForecast = ({ tournament, teams = [], matches = [], jornadas = [], teamId, movement = {}, iterations = SIMULATIONS, seed = "forecast" }) => {
  if (!tournament) return { available: false, reason: "Tu equipo aún no tiene un torneo activo." };
  const fixtures = getFixtures({ tournament, teams, matches, jornadas });
  const results = fixtures.filter(scored);
  const ownResults = results.filter((match) => involves(match, teamId));
  if (!ownResults.length || !results.some((match) => !involves(match, teamId))) return { available: false, reason: "Necesitamos al menos un resultado de tu equipo y uno de otros equipos del torneo para iniciar el análisis." };
  const sportingResults = results.filter((match) => !walkover(match));
  if (!sportingResults.length) return { available: false, reason: "Los resultados disponibles son por default. Falta un partido jugado para estimar el rendimiento deportivo." };
  const lastRegularRound = Math.max(1, ...fixtures.filter((match) => match.isRegular).map((match) => match.round));
  // Playoff results inform the next opponent without being added to the regular-season table.
  sportingResults.forEach((match) => { if (!match.isRegular) match.round = lastRegularRound + 1; });
  const snapshot = buildTorneoStandingsSnapshot({ torneo: tournament, equipos: teams, partidos: matches, jornadasProp: jornadas, selectedJornadaView: String(lastRegularRound) });
  const standings = snapshot.tablaGeneral;
  const modelOptions = { roundDays: Number(parseForecastConfig(tournament.config).jornadaDurationDays) || 7 };
  const model = fitGoalModel(teams, sportingResults, modelOptions);
  const summarize = (id) => {
    const index = standings.findIndex((row) => key(row.id) === key(id));
    const row = standings[index]; const games = teamGames(sportingResults, id);
    return { position: index + 1, played: row?.pj || 0, analyzed: games.length, pointsPerGame: row?.pj ? round(row.pts / row.pj) : 0, goalsForPerGame: row?.pj ? round(row.gf / row.pj) : 0, goalsAgainstPerGame: row?.pj ? round(row.gc / row.pj) : 0, form: games.slice(-5).map((game) => game.result) };
  };
  const upcoming = fixtures.filter((match) => playable(match) && involves(match, teamId)).sort((a, b) => {
    const aTime = a.date ? Date.parse(a.date) : NaN; const bTime = b.date ? Date.parse(b.date) : NaN;
    if (Number.isFinite(aTime) && Number.isFinite(bTime)) return aTime - bTime;
    if (Number.isFinite(aTime)) return -1;
    if (Number.isFinite(bTime)) return 1;
    return a.round - b.round || Number(a.id) - Number(b.id);
  }).map((match) => {
    const rivalId = key(match.team1_id) === key(teamId) ? match.team2_id : match.team1_id;
    const rival = teams.find((team) => key(team.id) === key(rivalId));
    const prediction = predictMatch(model, teamId, rivalId, teams);
    const rivalStats = summarize(rivalId); const ownStats = summarize(teamId);
    const relativeStrength = prediction.win / (prediction.win + prediction.lose);
    const difficulty = relativeStrength < 0.3 ? "Muy alta" : relativeStrength < 0.45 ? "Alta" : relativeStrength < 0.65 ? "Media" : "Baja";
    const explanations = [];
    if (!rivalStats.analyzed) explanations.push("El rival aún no tiene partidos jugados: se usa el promedio del torneo.");
    else {
      explanations.push(`El rival ocupa el puesto ${rivalStats.position} y suma ${rivalStats.pointsPerGame} puntos por partido.`);
      explanations.push(`Marca ${rivalStats.goalsForPerGame} y recibe ${rivalStats.goalsAgainstPerGame} goles por partido.`);
    }
    if (prediction.common.length) explanations.push(`Hay ${prediction.common.length} rival${prediction.common.length === 1 ? "" : "es"} en común; su efecto en el cálculo es limitado.`);
    return { matchId: match.id, round: match.round, stageName: match.stageName, date: match.date, rival: { id: rivalId, name: rival?.name || "Rival", logo_url: rival?.logo_url, color: rival?.color }, probabilities: { win: prediction.percentages[0], draw: prediction.percentages[1], lose: prediction.percentages[2] }, estimatedGoals: [round(prediction.ownGoals, 1), round(prediction.rivalGoals, 1)], difficulty, own: ownStats, opponent: rivalStats, limitedData: Math.min(ownStats.analyzed, rivalStats.analyzed) < 5, commonOpponents: prediction.common, headToHead: teamGames(sportingResults, teamId).filter((game) => key(game.opponentId) === key(rivalId)).slice(-5), explanations };
  });
  return {
    available: true, version: VERSION, analyzedMatches: sportingResults.length, excludedWalkovers: results.length - sportingResults.length,
    own: summarize(teamId), upcoming,
    season: simulateSeason({ tournament, teams, fixtures, standings, model, teamId, movement, seed, iterations: clamp(iterations, 100, 10000) }),
    validation: evaluateForecast(teams, sportingResults, modelOptions),
    methodology: { priorMatches: PRIOR_MATCHES, halfLifeRounds: HALF_LIFE_ROUNDS, penaltyChance: 0.5, calibrated: false },
  };
};

export const getCachedTournamentForecast = (input) => {
  const fingerprint = createHash("sha256").update(JSON.stringify([VERSION, input.teamId, input.tournament, input.teams, input.matches, input.jornadas, input.movement])).digest("hex");
  const hit = cache.get(fingerprint);
  if (hit && hit.expires > Date.now()) return hit.result;
  const result = { ...buildTournamentForecast({ ...input, seed: fingerprint }), computedAt: new Date().toISOString() };
  if (cache.size >= 32) cache.delete(cache.keys().next().value);
  cache.set(fingerprint, { result, expires: Date.now() + 60000 });
  return result;
};
