import { isOfficialJornadaName, normalizeJornadaName, parseJornadaNumber } from "./jornadaUtils";
import { buildTorneoStandingsSnapshot } from "../hooks/useTorneoStandingsLogic";

export const PLAYOFF_PHASES = [
  { key: "round32", label: "Dieciseisavos de final", participants: 32 },
  { key: "round16", label: "Octavos de final", participants: 16 },
  { key: "quarterfinals", label: "Cuartos de final", participants: 8 },
  { key: "semifinals", label: "Semifinales", participants: 4 },
  { key: "final", label: "Final", participants: 2 },
];

export const PLAYOFF_PHASE_LEG_FIELDS = {
  round32: "playoffLegsRound32",
  round16: "playoffLegsRound16",
  quarterfinals: "playoffLegsQuarterfinals",
  semifinals: "playoffLegsSemifinals",
  final: "playoffLegsFinal",
};

const FINISHED_STATUSES = ["finalizado", "completado", "jugado", "terminado"];

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toId = (value) => (value === null || value === undefined ? "" : String(value));

export const isFinishedMatchStatus = (status = "") =>
  FINISHED_STATUSES.includes(String(status || "").trim().toLowerCase());

export const getPlayoffSettings = (config = {}) => ({
  reseed: config.playoffReseed ?? true,
  tieBreaker: config.playoffTieBreaker || "bestSeed",
  countGoalsPlayoffs: config.countGoalsPlayoffs ?? false,
  countGoalsRepechaje: config.countGoalsRepechaje ?? false,
  repechajeLegs: config.repechajeLegs || "single",
  playoffLegsRound32: config.playoffLegsRound32 || "single",
  playoffLegsRound16: config.playoffLegsRound16 || "single",
  playoffLegsQuarterfinals: config.playoffLegsQuarterfinals || "single",
  playoffLegsSemifinals: config.playoffLegsSemifinals || "single",
  playoffLegsFinal: config.playoffLegsFinal || "single",
});

export const getPhaseLegMode = (phaseKey, settings = {}) => {
  if (phaseKey === "repechaje") return settings.repechajeLegs || "single";
  const field = PLAYOFF_PHASE_LEG_FIELDS[phaseKey];
  return (field && settings[field]) || "single";
};

export const isRepechajeJornadaName = (name = "") =>
  normalizeJornadaName(name).includes("repechaje");

export const isPlayoffJornadaName = (name = "") => {
  const normalized = normalizeJornadaName(name);
  if (isRepechajeJornadaName(name)) return true;
  return [
    "dieciseisavos",
    "octavos",
    "cuartos",
    "semifinal",
    "semifinales",
    "final",
  ].some((token) => normalized.includes(token));
};

export const getPhaseLabelByKey = (phaseKey) => {
  if (phaseKey === "repechaje") return "Repechaje";
  return PLAYOFF_PHASES.find((phase) => phase.key === phaseKey)?.label || "Fase final";
};

export const getPhaseByParticipants = (participantCount) => {
  const count = Math.max(2, Number(participantCount) || 2);
  return [...PLAYOFF_PHASES].reverse().find((phase) => count <= phase.participants) || PLAYOFF_PHASES[0];
};

export const buildPhaseJornadaNames = (phaseKey, settings = {}) => {
  const label = getPhaseLabelByKey(phaseKey);
  const legMode = getPhaseLegMode(phaseKey, settings);
  if (legMode === "double") return [`${label} (ida)`, `${label} (vuelta)`];
  return [label];
};

export const getMatchJornadaName = (match = {}, jornadas = []) => {
  const directName = match?.jornadas?.name || match?.jornada?.name || "";
  if (directName) return directName;
  const jornada = jornadas.find((item) => toId(item?.id) === toId(match?.jornada_id));
  return jornada?.name || "";
};

export const getOfficialJornadaNumberForPlayoffMatch = (match = {}, jornadas = []) => {
  const jornadaName = getMatchJornadaName(match, jornadas);
  if (!isOfficialJornadaName(jornadaName)) return 0;
  return parseJornadaNumber(jornadaName, 0);
};

export const getCurrentStandingsJornadaLimit = ({ matches = [], jornadas = [] }) => {
  const confirmedNumbers = (jornadas || [])
    .filter((jornada) => isOfficialJornadaName(jornada?.name))
    .filter((jornada) => {
      const status = normalizeJornadaName(jornada?.status);
      return status.includes("confirmada") || status.includes("finalizada");
    })
    .map((jornada) => parseJornadaNumber(jornada.name, 0))
    .filter((value) => value > 0);

  if (confirmedNumbers.length > 0) return Math.max(...confirmedNumbers);

  const finishedNumbers = (matches || [])
    .filter((match) => isFinishedMatchStatus(match?.status))
    .map((match) => getOfficialJornadaNumberForPlayoffMatch(match, jornadas))
    .filter((value) => value > 0);

  return finishedNumbers.length > 0 ? Math.max(...finishedNumbers) : Number.MAX_SAFE_INTEGER;
};

export const calculateRegularStandings = ({
  teams = [],
  matches = [],
  jornadas = [],
  config = {},
  limitJornada = Number.MAX_SAFE_INTEGER,
}) => {
  const statsMap = new Map();
  teams.forEach((team) => {
    statsMap.set(toId(team.id), {
      id: team.id,
      teamId: team.id,
      name: team.name || team.nombre || "Equipo",
      logo_url: team.logo_url || team.logo || null,
      color: team.color || null,
      pj: 0,
      g: 0,
      e: 0,
      p: 0,
      gf: 0,
      gc: 0,
      dg: 0,
      pts: 0,
    });
  });

  const winPoints = toNumber(config.winPoints, 3);
  const drawPoints = toNumber(config.drawPoints, 1);
  const lossPoints = toNumber(config.lossPoints, 0);

  matches.forEach((match) => {
    const jornadaName = getMatchJornadaName(match, jornadas);
    if (!isOfficialJornadaName(jornadaName)) return;
    const jornadaNumber = parseJornadaNumber(jornadaName, 0);
    if (jornadaNumber <= 0 || jornadaNumber > limitJornada) return;
    if (!isFinishedMatchStatus(match.status)) return;
    if (!match.team1_id || !match.team2_id) return;

    const local = statsMap.get(toId(match.team1_id));
    const visitante = statsMap.get(toId(match.team2_id));
    if (!local || !visitante) return;

    const goals1 = Number.parseInt(match.goals1, 10);
    const goals2 = Number.parseInt(match.goals2, 10);
    if (!Number.isFinite(goals1) || !Number.isFinite(goals2)) return;

    local.pj += 1;
    visitante.pj += 1;
    local.gf += goals1;
    local.gc += goals2;
    visitante.gf += goals2;
    visitante.gc += goals1;

    let puntos1 = Number.parseInt(match.puntos1, 10);
    let puntos2 = Number.parseInt(match.puntos2, 10);

    if (!Number.isFinite(puntos1) || !Number.isFinite(puntos2) || (puntos1 === 0 && puntos2 === 0 && goals1 !== goals2)) {
      if (goals1 > goals2) {
        puntos1 = winPoints;
        puntos2 = lossPoints;
      } else if (goals2 > goals1) {
        puntos1 = lossPoints;
        puntos2 = winPoints;
      } else {
        puntos1 = drawPoints;
        puntos2 = drawPoints;
      }
    }

    if (goals1 > goals2) {
      local.g += 1;
      visitante.p += 1;
    } else if (goals2 > goals1) {
      visitante.g += 1;
      local.p += 1;
    } else {
      local.e += 1;
      visitante.e += 1;
    }

    local.pts += puntos1;
    visitante.pts += puntos2;
  });

  return Array.from(statsMap.values())
    .map((row) => ({ ...row, dg: row.gf - row.gc }))
    .sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.dg !== a.dg) return b.dg - a.dg;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
    })
    .map((row, index) => ({ ...row, seed: index + 1 }));
};

export const buildSeedRows = (standings = []) =>
  standings.map((row, index) => ({
    teamId: row.teamId || row.id,
    id: row.teamId || row.id,
    name: row.name || row.nombre || "Equipo",
    seed: row.seed || index + 1,
    logo_url: row.logo_url || row.logo || null,
    color: row.color || null,
  }));

export const pairHighLow = (seedRows = []) => {
  const rows = [...seedRows].sort((a, b) => (a.seed || 999) - (b.seed || 999));
  const pairs = [];
  let left = 0;
  let right = rows.length - 1;

  while (left < right) {
    pairs.push({
      id: `pair-${left + 1}`,
      home: rows[left],
      away: rows[right],
    });
    left += 1;
    right -= 1;
  }

  if (left === right) {
    pairs.push({
      id: `bye-${left + 1}`,
      home: rows[left],
      away: null,
      bye: true,
    });
  }

  return pairs;
};

const getPenaltyWinnerTeamId = (matches = []) => {
  const lastPenaltyMatch = [...matches].reverse().find((match) =>
    /pen\s*:\s*\d+\s*-\s*\d+/i.test(String(match?.observations || ""))
  );
  if (!lastPenaltyMatch) return null;

  const penaltyMatch = String(lastPenaltyMatch.observations || "").match(/pen\s*:\s*(\d+)\s*-\s*(\d+)/i);
  if (!penaltyMatch) return null;

  const localPenalties = Number(penaltyMatch[1]);
  const awayPenalties = Number(penaltyMatch[2]);
  if (localPenalties === awayPenalties) return null;
  return localPenalties > awayPenalties ? lastPenaltyMatch.team1_id : lastPenaltyMatch.team2_id;
};

export const resolveSeriesWinner = ({
  pair,
  matches = [],
  settings = {},
}) => {
  if (pair?.bye) return pair.home;

  const teamAId = toId(pair?.home?.teamId || pair?.home?.id);
  const teamBId = toId(pair?.away?.teamId || pair?.away?.id);
  let goalsA = 0;
  let goalsB = 0;

  const relevantMatches = matches.filter((match) => {
    const ids = [toId(match.team1_id), toId(match.team2_id)];
    return ids.includes(teamAId) && ids.includes(teamBId);
  });

  if (relevantMatches.length === 0) {
    return null;
  }

  const allFinished = relevantMatches.every(
    (match) =>
      isFinishedMatchStatus(match.status) &&
      match.goals1 !== null &&
      match.goals1 !== undefined &&
      match.goals2 !== null &&
      match.goals2 !== undefined
  );

  if (!allFinished) return null;

  relevantMatches.forEach((match) => {
    const goals1 = Number.parseInt(match.goals1, 10) || 0;
    const goals2 = Number.parseInt(match.goals2, 10) || 0;
    if (toId(match.team1_id) === teamAId) {
      goalsA += goals1;
      goalsB += goals2;
    } else {
      goalsA += goals2;
      goalsB += goals1;
    }
  });

  if (goalsA > goalsB) return pair.home;
  if (goalsB > goalsA) return pair.away;

  if (settings.tieBreaker === "penalties") {
    const penaltyWinnerId = getPenaltyWinnerTeamId(relevantMatches);
    if (toId(penaltyWinnerId) === teamAId) return pair.home;
    if (toId(penaltyWinnerId) === teamBId) return pair.away;
    return null;
  }

  return (pair.home?.seed || 999) <= (pair.away?.seed || 999) ? pair.home : pair.away;
};

export const getStageMatches = ({ phaseKey, matches = [], jornadas = [] }) => {
  const label = getPhaseLabelByKey(phaseKey);
  const normalizedLabel = normalizeJornadaName(label);

  return matches.filter((match) => {
    const jornadaName = getMatchJornadaName(match, jornadas);
    const normalizedName = normalizeJornadaName(jornadaName);
    if (phaseKey === "repechaje") return normalizedName.includes("repechaje");
    return normalizedName.startsWith(normalizedLabel);
  });
};

export const getPendingPhaseCounts = ({
  phaseKey,
  matches = [],
  jornadas = [],
}) => {
  const relevantJornadas = jornadas.filter((jornada) => {
    if (!phaseKey) return isOfficialJornadaName(jornada?.name);
    const normalizedName = normalizeJornadaName(jornada?.name);
    if (phaseKey === "repechaje") return normalizedName.includes("repechaje");
    return normalizedName.startsWith(normalizeJornadaName(getPhaseLabelByKey(phaseKey)));
  });

  const relevantJornadaIds = new Set(relevantJornadas.map((jornada) => toId(jornada.id)));
  const relevantMatches = matches.filter((match) =>
    relevantJornadaIds.has(toId(match.jornada_id || match.jornadas?.id))
  );

  const pendingJornadas = relevantJornadas.filter((jornada) => {
    const status = normalizeJornadaName(jornada?.status);
    return !status.includes("confirmada") && !status.includes("finalizada");
  }).length;

  const pendingMatches = relevantMatches.filter((match) => {
    if (!match.team1_id || !match.team2_id) return false;
    return (
      !isFinishedMatchStatus(match.status) ||
      match.goals1 === null ||
      match.goals1 === undefined ||
      match.goals2 === null ||
      match.goals2 === undefined
    );
  }).length;

  return { pendingJornadas, pendingMatches };
};

export const buildNextPlayoffPreview = ({
  torneo = {},
  teams = [],
  matches = [],
  jornadas = [],
  config = {},
  selectedJornadaView = "recent",
}) => {
  const settings = getPlayoffSettings(config);
  const state = config.playoffState || {};
  const directCount = Math.max(0, Number.parseInt(config.clasificados, 10) || 0);
  const repechajeCount = Math.max(0, Number.parseInt(config.repechajeTeams, 10) || 0);
  const standingsSnapshot = buildTorneoStandingsSnapshot({
    torneo: {
      ...torneo,
      config,
    },
    equipos: teams,
    partidos: matches,
    jornadasProp: jornadas,
    selectedJornadaView,
  });
  const standings = standingsSnapshot.tablaGeneral;
  const standingsLimit = standingsSnapshot.standingsLimit;
  const seeds = buildSeedRows(standings);
  const currentPhaseKey = state.currentPhaseKey || null;
  const previousStages = Array.isArray(state.stages) ? state.stages : [];

  if (!currentPhaseKey && repechajeCount > 0 && !previousStages.some((stage) => stage.phaseKey === "repechaje")) {
    const participants = seeds.slice(directCount, directCount + repechajeCount);
    return {
      phaseKey: "repechaje",
      phaseLabel: "Repechaje",
      source: "regular",
      participants,
      standings,
      standingsLimit,
      repechajeCount,
      settings,
      pairs: pairHighLow(participants),
      previousStages,
    };
  }

  let participants = [];
  let source = "regular";

  if (!currentPhaseKey) {
    participants = seeds.slice(0, directCount || seeds.length);
  } else {
    const currentStage = [...previousStages].reverse().find((stage) => stage.phaseKey === currentPhaseKey);
    if (!currentStage) {
      return { error: "No se encontro la fase actual en la configuracion." };
    }

    const stageMatches = getStageMatches({ phaseKey: currentPhaseKey, matches, jornadas });
    const winners = (currentStage.pairs || []).map((pair) =>
      resolveSeriesWinner({ pair, matches: stageMatches, settings })
    );

    if (winners.some((winner) => !winner)) {
      return {
        error:
          settings.tieBreaker === "penalties"
            ? "Hay series empatadas sin penales guardados o partidos pendientes."
            : "Hay partidos pendientes en la fase actual.",
      };
    }

    if (winners.length <= 1) {
      return {
        complete: true,
        champion: winners[0] || null,
        phaseLabel: "Campeon",
        settings,
        previousStages,
      };
    }

    if (currentPhaseKey === "repechaje") {
      const directTeams = seeds.slice(0, directCount);
      participants = [...directTeams, ...winners].sort((a, b) => (a.seed || 999) - (b.seed || 999));
      source = "repechaje";
    } else {
      participants = settings.reseed
        ? [...winners].sort((a, b) => (a.seed || 999) - (b.seed || 999))
        : winners;
      source = currentPhaseKey;
    }
  }

  const phase = getPhaseByParticipants(participants.length);

  return {
    phaseKey: phase.key,
    phaseLabel: phase.label,
    source,
    participants,
    standings,
    standingsLimit,
    repechajeCount,
    settings,
    pairs: pairHighLow(participants),
    previousStages,
  };
};
