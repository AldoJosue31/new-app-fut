const MAX_RAW_PLAYERS = 120;
const MAX_NAME_LENGTH = 100;
const MAX_JERSEY_LENGTH = 12;
const MAX_EVIDENCE_LENGTH = 160;
const MAX_ROW_NUMBER = 120;

export type ScannedGoalsConfidence = "high" | "medium" | "low";

export type NormalizedScannedPlayer = {
  name: string;
  observedName: string;
  jerseyNumber: string;
  rowNumber: number | null;
  goalsLegible: boolean;
  goalEvidence: string;
  goalsConfidence: ScannedGoalsConfidence;
  goals: number;
  ownGoals: number;
  yellowCards: number;
  redCards: number;
};

type CandidatePlayer = NormalizedScannedPlayer & {
  sourceIndex: number;
  nameKeys: string[];
  jerseyKey: string;
  confidenceScore: number;
};

const cleanText = (value: unknown, maxLength: number) => String(value ?? "")
  .normalize("NFKC")
  .replace(/[\u0000-\u001f\u007f<>]/g, " ")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, maxLength);

const comparableText = (value: unknown) => cleanText(value, MAX_NAME_LENGTH)
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const NON_IDENTIFYING_NAMES = new Set([
  "",
  "desconocido",
  "desconocida",
  "ilegible",
  "n a",
  "na",
  "no legible",
  "sin nombre",
  "unknown",
]);

const comparableName = (value: unknown) => {
  const comparable = comparableText(value);
  if (NON_IDENTIFYING_NAMES.has(comparable)) return "";
  return comparable.split(" ").filter(Boolean).sort().join(" ");
};

const sanitizeJerseyNumber = (value: unknown) => cleanText(value, MAX_JERSEY_LENGTH)
  .replace(/^#+\s*/, "")
  .replace(/\s+/g, "")
  .replace(/[^\p{L}\p{N}/-]/gu, "")
  .toUpperCase()
  .slice(0, MAX_JERSEY_LENGTH);

const comparableJersey = (value: string) => {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (!normalized || ["na", "sn", "sinnumero", "unknown"].includes(normalized)) return "";
  return /^\d+$/.test(normalized) ? String(Number(normalized)) : normalized;
};

const SPANISH_COUNT_WORDS = new Map<string, number>([
  ["cero", 0],
  ["ningun", 0],
  ["ninguno", 0],
  ["ninguna", 0],
  ["un", 1],
  ["uno", 1],
  ["una", 1],
  ["dos", 2],
  ["tres", 3],
  ["cuatro", 4],
  ["cinco", 5],
  ["seis", 6],
  ["siete", 7],
  ["ocho", 8],
  ["nueve", 9],
  ["diez", 10],
  ["once", 11],
  ["doce", 12],
  ["trece", 13],
  ["catorce", 14],
  ["quince", 15],
  ["dieciseis", 16],
  ["diecisiete", 17],
  ["dieciocho", 18],
  ["diecinueve", 19],
  ["veinte", 20],
]);

/**
 * Convierte conteos escritos con cifras o palabras en español. Devuelve null
 * cuando el texto no contiene una cantidad inequívoca.
 */
export const parseScannedCount = (value: unknown): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? Math.trunc(value) : null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value === null || value === undefined) return null;

  const raw = cleanText(value, 80).toLowerCase();
  if (!raw) return null;
  const directNumber = raw.replace(",", ".").match(/^[+-]?\d+(?:\.\d+)?$/);
  if (directNumber) return Math.trunc(Number(directNumber[0]));

  const normalized = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9+-]+/g, " ")
    .trim();
  const numericMatch = normalized.match(/(?:^|\s|x)(\d{1,2})(?=$|\s)/);
  if (numericMatch) return Number(numericMatch[1]);

  for (const token of normalized.split(/\s+/)) {
    const count = SPANISH_COUNT_WORDS.get(token);
    if (count !== undefined) return count;
  }
  return null;
};

const boundedInteger = (value: unknown, maximum: number) => {
  const parsed = parseScannedCount(value);
  if (parsed === null) return 0;
  return Math.min(maximum, Math.max(0, Math.trunc(parsed)));
};

const normalizeRowNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= MAX_ROW_NUMBER
    ? parsed
    : null;
};

const normalizeConfidence = (value: unknown): {
  level: ScannedGoalsConfidence;
  score: number;
} => {
  const raw = cleanText(value, 24);
  const enumValue = raw.toLowerCase();
  if (enumValue === "high") return { level: "high", score: 1 };
  if (enumValue === "medium") return { level: "medium", score: 0.65 };
  if (enumValue === "low") return { level: "low", score: 0.25 };
  const parsed = Number(raw.endsWith("%") ? raw.slice(0, -1) : raw);
  if (!Number.isFinite(parsed)) return { level: "low", score: 0 };
  const normalized = raw.endsWith("%") || (parsed > 1 && parsed <= 100)
    ? parsed / 100
    : parsed;
  const score = Math.min(1, Math.max(0, normalized));
  return {
    level: score >= 0.8 ? "high" : score >= 0.5 ? "medium" : "low",
    score,
  };
};

const normalizeLegibility = (value: unknown) => {
  if (value === false || value === 0) return false;
  if (typeof value === "string" && value.trim().toLowerCase() === "false") return false;
  // Compatibilidad con la salida Gemini anterior, que no incluia este campo.
  return true;
};

const hasExplicitOwnGoalEvidence = (value: string) => {
  const evidence = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return /(?:^|[^a-z0-9])(?:autogol(?:es)?|auto\s*-?\s*gol(?:es)?|own\s*-?\s*goal(?:s)?|gol(?:es)?\s+en\s+propia\s+puerta|a\s*\.?\s*g\s*\.?|o\s*\.?\s*g\s*\.?)(?=$|[^a-z0-9])/.test(evidence);
};

const normalizeCandidate = (value: unknown, sourceIndex: number): CandidatePlayer | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;

  const rawName = cleanText(
    raw.name ?? raw.playerName ?? raw.registeredName,
    MAX_NAME_LENGTH,
  );
  const observedName = cleanText(
    raw.observedName ?? raw.visibleName ?? raw.readName ?? rawName,
    MAX_NAME_LENGTH,
  );
  const name = rawName || observedName;
  const jerseyNumber = sanitizeJerseyNumber(
    raw.jerseyNumber ?? raw.dorsal ?? raw.shirtNumber ?? raw.number,
  );
  const rowNumber = normalizeRowNumber(raw.rowNumber ?? raw.row ?? raw.rowIndex);
  const ownGoalEvidence = cleanText(
    raw.ownGoalEvidence ?? raw.ownGoalsEvidence,
    MAX_EVIDENCE_LENGTH,
  );
  const directGoalEvidence = cleanText(
    raw.goalEvidence ?? raw.goalsEvidence ?? raw.goalMarkEvidence ?? raw.evidence,
    MAX_EVIDENCE_LENGTH,
  );
  const goalEvidence = directGoalEvidence || ownGoalEvidence;
  const goalsConfidence = normalizeConfidence(
    raw.goalsConfidence ?? raw.goalConfidence ?? raw.confidence,
  );
  const goalsLegible = normalizeLegibility(raw.goalsLegible);
  const declaredGoals = parseScannedCount(raw.goals);
  const evidencedGoals = parseScannedCount(goalEvidence);
  const resolvedGoals = evidencedGoals !== null
      && evidencedGoals > 0
      && (declaredGoals === null || declaredGoals === 0)
    ? evidencedGoals
    : declaredGoals ?? evidencedGoals ?? 0;
  const goals = goalsLegible
    ? Math.min(20, Math.max(0, resolvedGoals))
    : 0;
  const declaredOwnGoals = boundedInteger(raw.ownGoals, 20);
  const ownGoals = hasExplicitOwnGoalEvidence(`${goalEvidence} ${ownGoalEvidence}`)
    ? declaredOwnGoals
    : 0;
  const yellowCards = boundedInteger(raw.yellowCards, 2);
  const redCards = boundedInteger(raw.redCards, 2);

  const nameKeys = [...new Set([name, observedName].map(comparableName).filter(Boolean))];
  const jerseyKey = comparableJersey(jerseyNumber);
  const hasIdentity = Boolean(nameKeys.length || jerseyKey || rowNumber !== null);
  const hasEvent = goals > 0 || ownGoals > 0 || yellowCards > 0 || redCards > 0 || Boolean(goalEvidence);
  if (!hasIdentity && !hasEvent) return null;

  return {
    name,
    observedName: observedName || name,
    jerseyNumber,
    rowNumber,
    goalsLegible,
    goalEvidence,
    goalsConfidence: goalsConfidence.level,
    goals,
    ownGoals,
    yellowCards,
    redCards,
    sourceIndex,
    nameKeys,
    jerseyKey,
    confidenceScore: goalsConfidence.score,
  };
};

const evidenceStrength = (candidate: CandidatePlayer) => {
  if (!candidate.goalEvidence) return 0;
  const explicitOwnGoal = hasExplicitOwnGoalEvidence(candidate.goalEvidence) ? 2 : 0;
  return 1 + explicitOwnGoal + Math.min(1, candidate.goalEvidence.length / MAX_EVIDENCE_LENGTH);
};

const identityStrength = (candidate: CandidatePlayer) =>
  Number(Boolean(candidate.name)) +
  Number(Boolean(candidate.observedName)) +
  Number(Boolean(candidate.jerseyKey)) +
  Number(candidate.rowNumber !== null);

const preferCandidate = (left: CandidatePlayer, right: CandidatePlayer) => {
  if (right.goalsLegible !== left.goalsLegible) return right.goalsLegible ? right : left;
  if (right.confidenceScore !== left.confidenceScore) {
    return right.confidenceScore > left.confidenceScore ? right : left;
  }
  const leftEvidence = evidenceStrength(left);
  const rightEvidence = evidenceStrength(right);
  if (rightEvidence !== leftEvidence) return rightEvidence > leftEvidence ? right : left;
  const leftIdentity = identityStrength(left);
  const rightIdentity = identityStrength(right);
  if (rightIdentity !== leftIdentity) return rightIdentity > leftIdentity ? right : left;
  return right.sourceIndex < left.sourceIndex ? right : left;
};

/**
 * Normaliza jugadores de un solo bloque de equipo. Las coincidencias de fila,
 * nombre o dorsal se consideran lecturas duplicadas del mismo renglon; se elige
 * una lectura completa y nunca se suman sus estadisticas.
 */
export const normalizeScannedPlayers = (rawPlayers: unknown): NormalizedScannedPlayer[] => {
  if (!Array.isArray(rawPlayers)) return [];
  const candidates = rawPlayers
    .slice(0, MAX_RAW_PLAYERS)
    .map(normalizeCandidate)
    .filter((candidate): candidate is CandidatePlayer => Boolean(candidate));
  if (!candidates.length) return [];

  const parents = candidates.map((_, index) => index);
  const find = (index: number): number => {
    let root = index;
    while (parents[root] !== root) root = parents[root];
    while (parents[index] !== index) {
      const parent = parents[index];
      parents[index] = root;
      index = parent;
    }
    return root;
  };
  const union = (left: number, right: number) => {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot !== rightRoot) parents[rightRoot] = leftRoot;
  };

  const seenRows = new Map<number, number>();
  const seenJerseys = new Map<string, number>();
  const seenNames = new Map<string, number>();
  candidates.forEach((candidate, index) => {
    if (candidate.rowNumber !== null) {
      const previous = seenRows.get(candidate.rowNumber);
      if (previous !== undefined) union(index, previous);
      else seenRows.set(candidate.rowNumber, index);
    }
    if (candidate.jerseyKey) {
      const previous = seenJerseys.get(candidate.jerseyKey);
      if (previous !== undefined) union(index, previous);
      else seenJerseys.set(candidate.jerseyKey, index);
    }
    for (const nameKey of candidate.nameKeys) {
      const previous = seenNames.get(nameKey);
      if (previous !== undefined) union(index, previous);
      else seenNames.set(nameKey, index);
    }
  });

  const groups = new Map<number, { firstIndex: number; preferred: CandidatePlayer }>();
  candidates.forEach((candidate, index) => {
    const root = find(index);
    const current = groups.get(root);
    if (!current) {
      groups.set(root, { firstIndex: candidate.sourceIndex, preferred: candidate });
      return;
    }
    current.firstIndex = Math.min(current.firstIndex, candidate.sourceIndex);
    current.preferred = preferCandidate(current.preferred, candidate);
  });

  return [...groups.values()]
    .sort((left, right) => left.firstIndex - right.firstIndex)
    .map(({ preferred }) => ({
      name: preferred.name,
      observedName: preferred.observedName,
      jerseyNumber: preferred.jerseyNumber,
      rowNumber: preferred.rowNumber,
      goalsLegible: preferred.goalsLegible,
      goalEvidence: preferred.goalEvidence,
      goalsConfidence: preferred.goalsConfidence,
      goals: preferred.goals,
      ownGoals: preferred.ownGoals,
      yellowCards: preferred.yellowCards,
      redCards: preferred.redCards,
    }));
};
