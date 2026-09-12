import { buildScannedMatchTimestamp, persistedDateTimeKey } from "./scannedScheduleUtils.js";

const key = (value) => String(value ?? "");

const parseConfig = (config) => {
  if (typeof config === "string") {
    try { return JSON.parse(config) || {}; } catch { return {}; }
  }
  return config || {};
};

export const isScannedFixtureMatch = (match) => Boolean(
  match?.scanSource === "rol-juego" || match?.scanLocked || match?.scanScheduleAccepted,
);

export const getScannedFixtureRoundIndexes = (matches = []) => [...new Set(
  matches.filter((match) => !match.roundLocked && isScannedFixtureMatch(match))
    .map((match) => Number(match.jornadaIndex)).filter(Number.isFinite),
)];

// Comparar el contenido del modal permite limpiar también una jornada vaciada,
// movida o editada después de volver a abrir un escaneo ya guardado.
export const getChangedFixtureRoundIndexes = (initialMatches = [], updatedMatches = []) => {
  const signature = (matches, roundIndex) => matches
    .filter((match) => Number(match.jornadaIndex) === roundIndex)
    .map((match) => JSON.stringify([
      key(match.dbId), key(match.local?.id), key(match.visitante?.id),
      isScannedFixtureMatch(match), match.scanScheduleAction || "",
      match.scanScheduleAccepted ? buildScannedMatchTimestamp(match) : null,
    ]))
    .sort().join("|");
  return [...new Set([...initialMatches, ...updatedMatches].map((match) => Number(match.jornadaIndex)))]
    .filter((index) => Number.isFinite(index) && signature(initialMatches, index) !== signature(updatedMatches, index));
};

export const resolveFixturePlanningSchedule = (match, original = null, { replacePlanning = false } = {}) => {
  const timestamp = match.scanScheduleAccepted ? buildScannedMatchTimestamp(match) : null;
  const protectedSchedule = match.roundLocked || (match.locked && !isScannedFixtureMatch(match));
  const shouldClear = !protectedSchedule && (
    match.scanScheduleAction === "clear" || replacePlanning || isScannedFixtureMatch(match)
  );
  return {
    date: timestamp || (shouldClear ? null : original?.date || null),
    status: timestamp ? "Programado" : shouldClear ? "Pendiente" : original?.status || "Pendiente",
    changed: timestamp
      ? persistedDateTimeKey(original?.date) !== timestamp || original?.status !== "Programado"
      : shouldClear && Boolean(original) && (Boolean(original.date) || original.status !== "Pendiente"),
  };
};

export const getPlanningDraftRevision = (config, jornadaId) => {
  const current = parseConfig(config);
  return current.planningDraftRevisions?.[key(jornadaId)] || current.scannedFixtureRounds?.[key(jornadaId)] || "";
};

export const withPlanningDraftRevisions = (config, jornadaIds, revision) => {
  const current = parseConfig(config);
  return {
    ...current,
    planningDraftRevisions: {
      ...current.planningDraftRevisions,
      ...Object.fromEntries(jornadaIds.map((id) => [key(id), revision])),
    },
  };
};

// Los atrasados pueden estar vinculados a una jornada de reposición, aunque
// su origen siga siendo una jornada anterior. No son sobrantes del nuevo rol.
export const getCarriedFixtureMatchIds = ({
  originalMatches = [], jornadas = [], repositionMatchMappings = [], repositionMappings = [],
}) => {
  const roundIndexes = new Map(jornadas.map((round, index) => [key(round.id), index]));
  const matchOrigins = new Map(repositionMatchMappings.map((mapping) => [key(mapping.matchId), mapping.originalJornadaId]));
  const roundOrigins = new Map(repositionMappings.map((mapping) => [key(mapping.repositionJornadaId), mapping.originalJornadaId]));
  return originalMatches.filter((match) => {
    const originId = matchOrigins.get(key(match.id)) || roundOrigins.get(key(match.jornada_id)) || match.originJornadaId;
    return roundIndexes.get(key(originId)) < roundIndexes.get(key(match.jornada_id));
  }).map((match) => match.id);
};

// La jornada reemplazada queda exactamente como el modal, incluidos los
// registros duplicados que no se mostraban en él. Los atrasados se conservan.
export const getFixtureMatchIdsToDelete = ({
  deletedMatchIds = [], originalMatches = [], updatedMatches = [], jornadas = [],
  replacedRoundIndexes = [], carriedMatchIds = [],
}) => {
  const replacedJornadaIds = new Set(replacedRoundIndexes.map((index) => jornadas[index])
    .filter((round) => round && !["Confirmada", "Finalizada"].includes(round.status))
    .map((round) => key(round.id)));
  const retainedIds = new Set(updatedMatches.filter((match) => match.dbId != null).map((match) => key(match.dbId)));
  const carriedIds = new Set(carriedMatchIds.map(key));
  const originalById = new Map(originalMatches.map((match) => [key(match.id), match]));
  const confirmedJornadaIds = new Set(jornadas.filter((round) => ["Confirmada", "Finalizada"].includes(round.status)).map((round) => key(round.id)));
  const omittedIds = originalMatches.filter((match) => replacedJornadaIds.has(key(match.jornada_id))).map((match) => match.id);
  return [...new Map([...deletedMatchIds, ...omittedIds]
    .filter((id) => id != null && !retainedIds.has(key(id)) && !carriedIds.has(key(id)) &&
      !confirmedJornadaIds.has(key(originalById.get(key(id))?.jornada_id)))
    .map((id) => [key(id), id])).values()];
};

export const clearPlanningDraftsForRounds = (
  tournamentId, jornadas = [], roundIndexes = [],
  storage = typeof window === "undefined" ? null : window.localStorage,
) => {
  if (!storage || tournamentId == null) return;
  const prefixes = new Set();
  roundIndexes.forEach((roundIndex) => {
    const jornada = jornadas[Number(roundIndex)];
    if (jornada?.id != null) prefixes.add(`planning_draft_${tournamentId}_id_${jornada.id}`);
    prefixes.add(`planning_draft_${tournamentId}_J${Number(roundIndex)}`);
  });
  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const storageKey = storage.key(index);
    if (storageKey && [...prefixes].some((prefix) => storageKey === prefix || storageKey.startsWith(`${prefix}_v`))) {
      storage.removeItem(storageKey);
    }
  }
};

export const getPlanningDraftStorageKey = (base, dataVersion, scannedRevision = "") =>
  base ? `${base}_v${dataVersion}${scannedRevision ? `_scan_${scannedRevision}` : ""}` : null;

// Los IDs de BD se reutilizan al cambiar rivales. Un borrador de ese ID sólo
// sigue siendo válido si representa exactamente el mismo partido y jornada.
export const canReusePlanningDraftMatch = (match, draft) => Boolean(draft) &&
  key(match.local?.id) === key(draft.local?.id) &&
  key(match.visitante?.id) === key(draft.visitante?.id) &&
  key(match.jornada_id) === key(draft.jornada_id);
