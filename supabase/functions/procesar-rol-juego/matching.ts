export type RegisteredTeam = {
  id: string;
  name: string;
};

export type RawScheduleSection = {
  divisionLabel?: unknown;
  roundLabel?: unknown;
  matches?: Array<{ localTeam?: unknown; visitorTeam?: unknown }>;
  byeTeam?: unknown;
};

export type RawScheduleEntry = {
  divisionLabel?: unknown;
  roundLabel?: unknown;
  localTeam?: unknown;
  visitorTeam?: unknown;
  byeTeam?: unknown;
};

export type RawScheduleScan = {
  entries?: RawScheduleEntry[];
  sections?: RawScheduleSection[];
  matches?: RawScheduleSection["matches"];
  byeTeam?: unknown;
};

type SelectionContext = {
  divisionName: string;
  roundTitle: string;
  teams: RegisteredTeam[];
};

const TEAM_NOISE_WORDS = new Set([
  "ac",
  "club",
  "deportivo",
  "equipo",
  "fc",
  "futbol",
  "sc",
]);

const text = (value: unknown, maxLength = 100) =>
  Array.from(String(value || ""))
    .map((character) =>
      character.charCodeAt(0) < 32 || character === "<" || character === ">"
        ? " "
        : character
    )
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

const normalizeOcrCharacters = (value: string) =>
  value
    .replace(/0/g, "o")
    .replace(/[1|]/g, "i")
    .replace(/5/g, "s");

export const normalizeTeamName = (value: unknown) => {
  const normalized = normalizeOcrCharacters(
    text(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/^\s*\d{1,3}\s*[-.):]?\s*/, ""),
  )
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  if (!normalized) return "";
  const meaningfulTokens = normalized
    .split(" ")
    .filter((token) => token && !TEAM_NOISE_WORDS.has(token));
  return meaningfulTokens.join(" ") || normalized;
};

const fingerprint = (value: unknown) =>
  normalizeTeamName(value)
    .split(" ")
    .filter(Boolean)
    .sort()
    .join(" ");

const levenshtein = (left = "", right = "") => {
  if (!left.length) return right.length;
  if (!right.length) return left.length;
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const previous = row[j];
      row[j] = left[i - 1] === right[j - 1]
        ? diagonal
        : Math.min(diagonal, row[j - 1], row[j]) + 1;
      diagonal = previous;
    }
  }

  return row[right.length];
};

const editSimilarity = (left: string, right: string) => (
  1 - (levenshtein(left, right) / Math.max(left.length, right.length, 1))
);

const jaroSimilarity = (left: string, right: string) => {
  if (left === right) return 1;
  if (!left || !right) return 0;

  const distance = Math.max(
    0,
    Math.floor(Math.max(left.length, right.length) / 2) - 1,
  );
  const leftMatches = Array(left.length).fill(false);
  const rightMatches = Array(right.length).fill(false);
  let matches = 0;

  for (let i = 0; i < left.length; i += 1) {
    const start = Math.max(0, i - distance);
    const end = Math.min(i + distance + 1, right.length);
    for (let j = start; j < end; j += 1) {
      if (rightMatches[j] || left[i] !== right[j]) continue;
      leftMatches[i] = true;
      rightMatches[j] = true;
      matches += 1;
      break;
    }
  }
  if (!matches) return 0;

  const leftMatched = left.split("").filter((_, index) => leftMatches[index]);
  const rightMatched = right.split("").filter((_, index) =>
    rightMatches[index]
  );
  const transpositions = leftMatched.reduce(
    (total, character, index) =>
      total + (character !== rightMatched[index] ? 1 : 0),
    0,
  ) / 2;

  return ((matches / left.length) + (matches / right.length) +
    ((matches - transpositions) / matches)) / 3;
};

const jaroWinklerSimilarity = (left: string, right: string) => {
  const jaro = jaroSimilarity(left, right);
  let prefix = 0;
  while (
    prefix < Math.min(4, left.length, right.length) &&
    left[prefix] === right[prefix]
  ) prefix += 1;
  return jaro + (prefix * 0.1 * (1 - jaro));
};

const tokenSimilarity = (left: string, right: string) => {
  if (left === right) return 1;
  if (left.length === 1 && right.startsWith(left)) return 0.94;
  if (right.length === 1 && left.startsWith(right)) return 0.94;
  return Math.max(
    editSimilarity(left, right),
    jaroWinklerSimilarity(left, right),
  );
};

const directedCoverage = (source: string[], target: string[]) => {
  if (!source.length || !target.length) return 0;
  return source.reduce((total, token) => (
    total +
    Math.max(...target.map((candidate) => tokenSimilarity(token, candidate)))
  ), 0) / source.length;
};

export const teamNameSimilarity = (left: unknown, right: unknown) => {
  const a = normalizeTeamName(left);
  const b = normalizeTeamName(right);
  if (!a || !b) return 0;
  if (a === b) return 1;

  const aTokens = a.split(" ").filter(Boolean);
  const bTokens = b.split(" ").filter(Boolean);
  if ([...aTokens].sort().join(" ") === [...bTokens].sort().join(" ")) return 1;

  const direct = Math.max(editSimilarity(a, b), jaroWinklerSimilarity(a, b));
  const sortedA = [...aTokens].sort().join(" ");
  const sortedB = [...bTokens].sort().join(" ");
  const reordered = Math.max(
    editSimilarity(sortedA, sortedB),
    jaroWinklerSimilarity(sortedA, sortedB),
  );
  const forward = directedCoverage(aTokens, bTokens);
  const backward = directedCoverage(bTokens, aTokens);
  const balanced = (forward + backward) / 2;
  const containment =
    Math.min(a.length, b.length) >= 4 && (a.includes(b) || b.includes(a))
      ? 0.86 +
        (0.12 * (Math.min(a.length, b.length) / Math.max(a.length, b.length)))
      : 0;

  return Math.min(
    1,
    Math.max(direct * 0.96, reordered * 0.94, balanced * 0.93, containment),
  );
};

const resolveTeam = (rawName: unknown, teams: RegisteredTeam[]) => {
  const normalized = normalizeTeamName(rawName);
  if (!normalized) return null;

  const exact = teams.filter((team) =>
    normalizeTeamName(team.name) === normalized
  );
  if (exact.length === 1) return { team: exact[0], score: 1 };

  const rawFingerprint = fingerprint(rawName);
  const tokenExact = teams.filter((team) =>
    fingerprint(team.name) === rawFingerprint
  );
  if (tokenExact.length === 1) return { team: tokenExact[0], score: 1 };

  const ranked = teams
    .map((team) => ({ team, score: teamNameSimilarity(rawName, team.name) }))
    .sort((a, b) => b.score - a.score);
  const top = ranked[0];
  const runnerUp = ranked[1];
  if (!top || top.score < 0.62) return null;
  const requiredMargin = top.score >= 0.88 ? 0.025 : 0.07;
  if (runnerUp && top.score - runnerUp.score < requiredMargin) return null;
  return top;
};

const canonicalizeSection = (
  section: RawScheduleSection,
  context: SelectionContext,
) => {
  const usedIds = new Set<string>();
  const acceptedMatches = [] as Array<{
    sourceIndex: number;
    confidence: number;
    localTeamId: string;
    localTeam: string;
    visitorTeamId: string;
    visitorTeam: string;
  }>;
  let rejectedMatches = 0;
  let confidenceTotal = 0;
  const expectedMatches = Math.floor(context.teams.length / 2);

  const resolvedMatches =
    (Array.isArray(section.matches) ? section.matches : [])
      .slice(0, 40)
      .map((rawMatch, sourceIndex) => {
        const local = resolveTeam(rawMatch?.localTeam, context.teams);
        const visitor = resolveTeam(rawMatch?.visitorTeam, context.teams);
        if (!local || !visitor || local.team.id === visitor.team.id) {
          rejectedMatches += 1;
          return null;
        }
        return {
          local,
          visitor,
          sourceIndex,
          confidence: local.score + visitor.score,
        };
      })
      .filter((match) => match !== null)
      .sort((a, b) => b.confidence - a.confidence);

  for (const match of resolvedMatches) {
    const localId = match.local.team.id;
    const visitorId = match.visitor.team.id;
    if (usedIds.has(localId) || usedIds.has(visitorId)) {
      rejectedMatches += 1;
      continue;
    }
    usedIds.add(localId);
    usedIds.add(visitorId);
    confidenceTotal += match.confidence;
    acceptedMatches.push({
      sourceIndex: match.sourceIndex,
      confidence: match.confidence,
      localTeamId: localId,
      localTeam: match.local.team.name,
      visitorTeamId: visitorId,
      visitorTeam: match.visitor.team.name,
    });
    if (acceptedMatches.length >= expectedMatches) break;
  }

  const matches = acceptedMatches
    .sort((a, b) => a.sourceIndex - b.sourceIndex)
    .map((match) => ({
      localTeamId: match.localTeamId,
      localTeam: match.localTeam,
      visitorTeamId: match.visitorTeamId,
      visitorTeam: match.visitorTeam,
    }));

  let bye = resolveTeam(section.byeTeam, context.teams);
  if (bye && usedIds.has(bye.team.id)) bye = null;
  let byeInferred = false;
  if (
    !bye && context.teams.length % 2 === 1 && matches.length === expectedMatches
  ) {
    const remaining = context.teams.filter((team) => !usedIds.has(team.id));
    if (remaining.length === 1) {
      bye = { team: remaining[0], score: 1 };
      byeInferred = true;
    }
  }
  if (bye) usedIds.add(bye.team.id);

  const divisionLabel = text(section.divisionLabel);
  const roundLabel = text(section.roundLabel);
  const coverage = context.teams.length
    ? usedIds.size / context.teams.length
    : 0;
  const divisionScore = context.divisionName && divisionLabel
    ? teamNameSimilarity(context.divisionName, divisionLabel)
    : 0;
  const roundScore = context.roundTitle && roundLabel
    ? teamNameSimilarity(context.roundTitle, roundLabel)
    : 0;
  const isComplete = matches.length === expectedMatches &&
    (context.teams.length % 2 === 0 || Boolean(bye));
  const score = (matches.length * 120) +
    (usedIds.size * 25) +
    (coverage * 100) +
    (divisionScore * 60) +
    (roundScore * 30) +
    (isComplete ? 200 : 0) +
    (confidenceTotal * 10) -
    (rejectedMatches * 2);

  return {
    score,
    matches,
    bye,
    byeInferred,
    divisionLabel,
    roundLabel,
    rejectedMatches,
    matchedTeamCount: usedIds.size,
    isComplete,
  };
};

export const selectScheduleForDivision = (
  raw: RawScheduleScan,
  context: SelectionContext,
) => {
  const groupedEntries = new Map<string, RawScheduleSection>();
  for (
    const entry of (Array.isArray(raw?.entries) ? raw.entries : []).slice(
      0,
      100,
    )
  ) {
    const divisionLabel = text(entry?.divisionLabel);
    const roundLabel = text(entry?.roundLabel);
    const key = `${normalizeTeamName(divisionLabel)}::${
      normalizeTeamName(roundLabel)
    }`;
    const section = groupedEntries.get(key) || {
      divisionLabel,
      roundLabel,
      matches: [],
      byeTeam: "",
    };
    const localTeam = text(entry?.localTeam);
    const visitorTeam = text(entry?.visitorTeam);
    if (localTeam || visitorTeam) {
      section.matches?.push({ localTeam, visitorTeam });
    }
    const byeTeam = text(entry?.byeTeam);
    if (byeTeam) section.byeTeam = byeTeam;
    groupedEntries.set(key, section);
  }

  const sections = groupedEntries.size
    ? [...groupedEntries.values()]
    : Array.isArray(raw?.sections) && raw.sections.length
    ? raw.sections.slice(0, 24)
    : [{ matches: raw?.matches, byeTeam: raw?.byeTeam }];
  const candidates = sections
    .map((section) => canonicalizeSection(section || {}, context))
    .filter((candidate) => candidate.matches.length > 0)
    .sort((a, b) => b.score - a.score);
  const selected = candidates[0];
  const expectedTeamCount = context.teams.length;

  if (!selected) {
    return {
      matches: [],
      byeTeamId: "",
      byeTeam: "",
      matchedTeamCount: 0,
      expectedTeamCount,
      sourceDivision: "",
      sourceRound: "",
      complete: false,
      byeInferred: false,
    };
  }

  return {
    matches: selected.matches,
    byeTeamId: selected.bye?.team.id || "",
    byeTeam: selected.bye?.team.name || "",
    matchedTeamCount: selected.matchedTeamCount,
    expectedTeamCount,
    sourceDivision: selected.divisionLabel,
    sourceRound: selected.roundLabel,
    complete: selected.isComplete,
    byeInferred: selected.byeInferred,
  };
};
