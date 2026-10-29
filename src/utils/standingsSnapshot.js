import { isOfficialJornadaName, normalizeJornadaName, parseJornadaNumber, resolveRepositionMappings } from "./jornadaUtils.js";

const getOfficialJornadaNumberFromName = (name) => {
  if (!isOfficialJornadaName(name)) return 0;
  return parseJornadaNumber(name, 0);
};

const findRepositionMapping = (jornadaId, jornadaName, repositionMappings = []) => {
  const normalizedName = normalizeJornadaName(jornadaName);

  return repositionMappings.find((mapping) => {
    if (jornadaId && Number(mapping?.repositionJornadaId) === Number(jornadaId)) {
      return true;
    }

    if (!normalizedName) return false;

    return (
      normalizeJornadaName(mapping?.repositionJornadaName) === normalizedName
    );
  }) || null;
};

const findRepositionMatchMapping = (matchId, repositionMatchMappings = []) => {
  if (!matchId) return null;

  return repositionMatchMappings.find(
    (mapping) => Number(mapping?.matchId) === Number(matchId)
  ) || null;
};

export const isDoubleWalkoverMatch = (match) => {
  const observations = String(match?.observations || '');
  return (
    /doble\s*w\.?o\.?/i.test(observations) ||
    /ambos\s+pierden\s+por\s+default/i.test(observations)
  );
};

export const FINISHED_STATUSES = ['finalizado', 'completado', 'jugado', 'terminado'];

export const getMatchStandingsPoints = (match, config = {}) => {
  if (isDoubleWalkoverMatch(match)) return [0, 0];

  const { winPoints = 3, drawPoints = 1, lossPoints = 0 } = config;
  const goals1 = parseInt(match.goals1, 10);
  const goals2 = parseInt(match.goals2, 10);
  let points1 = parseInt(match.puntos1, 10);
  let points2 = parseInt(match.puntos2, 10);
  if (isNaN(points1)) points1 = 0;
  if (isNaN(points2)) points2 = 0;

  const isZeroPointDraw = points1 === 0 && points2 === 0 && goals1 === goals2 && drawPoints === 0;
  if (points1 === 0 && points2 === 0 && !isZeroPointDraw) {
    if (goals1 > goals2) return [winPoints, lossPoints];
    if (goals1 < goals2) return [lossPoints, winPoints];
    return [drawPoints, drawPoints];
  }

  return [points1, points2];
};

export const toFiniteNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const getOfficialJornadaNumberFromMapping = (mapping, jornadas = []) => {
  if (!mapping) return 0;

  const mappedJornada = mapping?.originalJornadaId
    ? jornadas.find((jornada) => Number(jornada.id) === Number(mapping.originalJornadaId))
    : null;

  return getOfficialJornadaNumberFromName(
    mapping?.originalJornadaName || mappedJornada?.name
  );
};

export const getOfficialJornadaNumberForMatch = (
  match,
  jornadas = [],
  repositionMappings = [],
  repositionMatchMappings = []
) => {
  const matchMapping = findRepositionMatchMapping(match?.id, repositionMatchMappings);
  const mappedOfficialNum = getOfficialJornadaNumberFromMapping(matchMapping, jornadas);
  if (mappedOfficialNum > 0) return mappedOfficialNum;

  const originJornada = match?.originJornadaId
    ? jornadas.find((jornada) => Number(jornada.id) === Number(match.originJornadaId))
    : null;
  const originOfficialNum = getOfficialJornadaNumberFromName(match?.originJornada);
  if (originOfficialNum > 0) return originOfficialNum;

  const originJornadaOfficialNum = getOfficialJornadaNumberFromName(originJornada?.name);
  if (originJornadaOfficialNum > 0) return originJornadaOfficialNum;

  const directName = match?.jornadas?.name || match?.jornada?.name || '';
  const directOfficialNum = getOfficialJornadaNumberFromName(directName);
  if (directOfficialNum > 0) return directOfficialNum;

  const jornadaId = match?.jornada_id || match?.jornadas?.id || match?.jornada?.id;
  const jornadaObj = jornadaId
    ? jornadas.find((jornada) => Number(jornada.id) === Number(jornadaId))
    : null;

  const jornadaOfficialNum = getOfficialJornadaNumberFromName(jornadaObj?.name);
  if (jornadaOfficialNum > 0) return jornadaOfficialNum;

  const mapping = findRepositionMapping(
    jornadaId,
    directName || jornadaObj?.name,
    repositionMappings
  );

  if (!mapping) return 0;

  return getOfficialJornadaNumberFromMapping(mapping, jornadas);
};

export const getStandingsViewStorageKey = (torneoId) =>
  `torneo-standings-selected-view:${torneoId || 'default'}`;

export const buildTorneoStandingsSnapshot = ({
  torneo,
  equipos = [],
  partidos = [],
  jornadasProp = [],
  reglas = {},
  selectedJornadaView = 'recent',
}) => {
  const mergedJornadas = Array.isArray(jornadasProp) ? jornadasProp : [];
  const parsedTournamentConfig = (() => {
    if (typeof torneo?.config === 'string') {
      try {
        return JSON.parse(torneo.config) || {};
      } catch {
        return {};
      }
    }

    return torneo?.config || {};
  })();

  const repositionMappings = resolveRepositionMappings({
    jornadas: mergedJornadas,
    configuredMappings: Array.isArray(parsedTournamentConfig?.repositionMappings)
      ? parsedTournamentConfig.repositionMappings
      : [],
  });

  const repositionMatchMappings = Array.isArray(parsedTournamentConfig?.repositionMatchMappings)
    ? parsedTournamentConfig.repositionMatchMappings
    : [];

  let c = {};
  if (typeof torneo?.config === 'string') {
    try { c = JSON.parse(torneo.config); } catch { c = {}; }
  } else {
    c = torneo?.config || reglas || {};
  }

  const config = {
    ascensos: parseInt(c.ascensos) || 0,
    descensos: parseInt(c.descensos) || 0,
    zonaLiguilla: c.zonaLiguilla || false,
    clasificados: parseInt(c.clasificados) || 0,
    repechaje: parseInt(c.repechajeTeams) || 0,
    winPoints: c.winPoints !== undefined ? Number(c.winPoints) : 3,
    drawPoints: c.drawPoints !== undefined ? Number(c.drawPoints) : 1,
    lossPoints: c.lossPoints !== undefined ? Number(c.lossPoints) : 0,
    tieBreakType: c.tieBreakType || 'normal',
  };

  const equiposMap = new Map();
  equipos.forEach((equipo) => equiposMap.set(equipo.id, equipo));
  const uniqueEquipos = Array.from(equiposMap.values());

  const relevantMatches = !Array.isArray(partidos) ? [] : partidos.filter((partido) => {
    const torneoFromMatch =
      (partido.jornadas && (partido.jornadas.tournament_id || partido.jornadas.tournament)) ||
      (partido.jornada && (partido.jornada.tournament_id || partido.jornada.tournament)) ||
      partido.tournament_id || null;

    if (!torneo?.id) return true;

    if (!torneoFromMatch) {
      if (partido.jornada_id && mergedJornadas.length > 0) {
        const jornada = mergedJornadas.find((item) => Number(item.id) === Number(partido.jornada_id));
        if (jornada && (Number(jornada.tournament_id) === Number(torneo.id) || !jornada.tournament_id)) return true;
      }
      return false;
    }

    return Number(torneoFromMatch) === Number(torneo.id);
  });

  const matchesByJornada = {};
  let maxJFromMatches = 0;

  relevantMatches.forEach((partido) => {
    const jornadaNumber = getOfficialJornadaNumberForMatch(
      partido,
      mergedJornadas,
      repositionMappings,
      repositionMatchMappings
    );

    if (jornadaNumber <= 0) return;

    if (!matchesByJornada[jornadaNumber]) matchesByJornada[jornadaNumber] = [];
    matchesByJornada[jornadaNumber].push(partido);
    if (jornadaNumber > maxJFromMatches) maxJFromMatches = jornadaNumber;
  });

  let maxConfirmed = 0;
  const confirmedList = [];

  const confirmedJornadas = mergedJornadas
    .filter((jornada) => isOfficialJornadaName(jornada?.name))
    .map((jornada) => ({
      num: parseJornadaNumber(jornada.name, 0),
      status: (jornada.status || '').toLowerCase(),
    }))
    .filter((jornada) => jornada.num > 0 && jornada.status.includes('confirmad'))
    .sort((a, b) => a.num - b.num);

  if (confirmedJornadas.length > 0) {
    const lastConfirmedNum = confirmedJornadas[confirmedJornadas.length - 1].num;
    maxConfirmed = lastConfirmedNum;

    confirmedJornadas.forEach((jornada) => {
      const matches = matchesByJornada[jornada.num] || [];
      let pendingCount = 0;
      let allFinished = true;

      matches.forEach((match) => {
        const status = String(match.status || '').trim().toLowerCase();
        if (!FINISHED_STATUSES.includes(status)) allFinished = false;
        if (status === 'pendiente' && match.team1_id != null && match.team2_id != null) {
          pendingCount += 1;
        }
      });

      if (jornada.num === lastConfirmedNum && !allFinished) return;
      confirmedList.push({ num: jornada.num, pendientes: pendingCount });
    });
  }

  confirmedList.sort((a, b) => a.num - b.num);
  const effectiveJornada = maxConfirmed > 0 ? maxConfirmed : (maxJFromMatches || 1);

  const buildTableUpTo = (limitJornada) => {
    const statsMap = {};
    uniqueEquipos.forEach((equipo) => {
      statsMap[equipo.id] = { pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, dg: 0, pts: 0, partidosPendientes: 0 };
    });

    relevantMatches.forEach((partido) => {
      const jornadaNumber = getOfficialJornadaNumberForMatch(
        partido,
        mergedJornadas,
        repositionMappings,
        repositionMatchMappings
      );

      if (jornadaNumber <= 0 || jornadaNumber > limitJornada) return;

      const statusLower = String(partido.status || '').trim().toLowerCase();
      const localId = partido.team1_id;
      const visitanteId = partido.team2_id;

      if (statusLower === 'pendiente') {
        if (localId && visitanteId) {
          if (statsMap[localId]) statsMap[localId].partidosPendientes += 1;
          if (statsMap[visitanteId]) statsMap[visitanteId].partidosPendientes += 1;
        }
        return;
      }

      if (!FINISHED_STATUSES.includes(statusLower)) return;
      if (!localId || !visitanteId) return;

      const local = statsMap[localId];
      const visitante = statsMap[visitanteId];
      if (!local || !visitante) return;

      const golesLocal = parseInt(partido.goals1, 10);
      const golesVisitante = parseInt(partido.goals2, 10);
      if (isNaN(golesLocal) || isNaN(golesVisitante)) return;

      if (isDoubleWalkoverMatch(partido)) {
        local.pj += 1;
        visitante.pj += 1;
        local.p += 1;
        visitante.p += 1;
        local.gc += 3;
        visitante.gc += 3;
        return;
      }

      local.pj += 1; visitante.pj += 1;
      local.gf += golesLocal; visitante.gf += golesVisitante;
      local.gc += golesVisitante; visitante.gc += golesLocal;

      if (golesLocal > golesVisitante) {
        local.g += 1; visitante.p += 1;
      } else if (golesLocal < golesVisitante) {
        visitante.g += 1; local.p += 1;
      } else {
        local.e += 1; visitante.e += 1;
      }

      const [ptsLocal, ptsVisitante] = getMatchStandingsPoints(partido, config);

      local.pts += ptsLocal;
      visitante.pts += ptsVisitante;
    });

    return uniqueEquipos.map((equipo) => {
      const stats = statsMap[equipo.id] || { pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, dg: 0, pts: 0, partidosPendientes: 0 };
      return {
        id: equipo.id,
        nombre: equipo.name || equipo.nombre,
        logo: equipo.logo_url || equipo.img,
        color: equipo.color,
        ...stats,
        dg: (stats.gf || 0) - (stats.gc || 0),
      };
    }).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.dg !== a.dg) return b.dg - a.dg;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return a.pj - b.pj;
    });
  };

  const limitCurrent = selectedJornadaView === 'recent'
    ? effectiveJornada
    : parseInt(selectedJornadaView, 10);
  const resolvedLimit = Number.isNaN(limitCurrent) ? effectiveJornada : limitCurrent;
  const prevTable = buildTableUpTo(resolvedLimit - 1);
  const prevRanks = {};
  prevTable.forEach((equipo, index) => { prevRanks[equipo.id] = index + 1; });

  const tablaGeneral = buildTableUpTo(resolvedLimit).map((equipo, index) => {
    const currentRank = index + 1;
    const prevRank = prevRanks[equipo.id];
    let tendencia = 'same';
    let posDiff = 0;

    if (resolvedLimit - 1 > 0 && prevRank) {
      if (prevRank > currentRank) {
        tendencia = 'up';
        posDiff = prevRank - currentRank;
      } else if (prevRank < currentRank) {
        tendencia = 'down';
        posDiff = currentRank - prevRank;
      }
    }

    return {
      ...equipo,
      tendencia,
      posDiff,
      clinchedStatuses: [],
    };
  });

  return {
    config,
    effectiveJornada,
    selectedJornadaView,
    standingsLimit: resolvedLimit,
    jornadasConfirmadasForDropdown: confirmedList,
    tablaGeneral,
    mergedJornadas,
    repositionMappings,
    repositionMatchMappings,
    relevantMatches,
  };
};

