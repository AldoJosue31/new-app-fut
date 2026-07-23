const TEAM_NOISE_WORDS = new Set([
  "ac",
  "club",
  "deportivo",
  "equipo",
  "fc",
  "futbol",
  "sc",
]);

const normalizeOcrCharacters = (value) => value
  .replace(/0/g, "o")
  .replace(/[1|]/g, "i")
  .replace(/5/g, "s");

const normalizeScanText = (value) => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase();

// A bare number is a dorsal only when it is visibly separated from the name.
// Explicit forms such as "#10Jose" may omit that separator without making
// OCR substitutions at the beginning of a real name (5antos, 1van, 0scar)
// disappear.
const EXPLICIT_DORSAL_PREFIX = /^\s*(?:(?:dorsal|numero|num|nro|no|n)\s*(?:[.\u00b0\u00ba#:-]\s*)?|[#\u2116]\s*)(\d{1,3})(?:\s*[-.):]\s*|\s*)/;
const BRACKETED_DORSAL_PREFIX = /^\s*\[(\d{1,3})\]\s*/;
const BARE_DORSAL_PREFIX = /^\s*(\d{1,3})(?:\s*[-.):]\s*|\s+|$)/;

const findLeadingDorsalMatch = (value) => {
  const text = normalizeScanText(value);
  return text.match(EXPLICIT_DORSAL_PREFIX)
    || text.match(BRACKETED_DORSAL_PREFIX)
    || text.match(BARE_DORSAL_PREFIX);
};

export const extractLeadingScanDorsal = (value = "") => {
  const match = findLeadingDorsalMatch(value);
  return match ? String(Number(match[1])) : "";
};

export const normalizeScanDorsal = (value) => {
  if (value === null || value === undefined || value === "") return "";
  const text = normalizeScanText(value).trim();
  const direct = text.match(/^(?:#\s*)?(\d{1,3})$/);
  const extracted = direct?.[1] || extractLeadingScanDorsal(text);
  if (!extracted) return "";
  const number = Number(extracted);
  return Number.isInteger(number) && number >= 0 && number <= 999 ? String(number) : "";
};

const stripLeadingScanDorsal = (value) => {
  const text = normalizeScanText(value);
  const match = findLeadingDorsalMatch(text);
  return match ? text.slice(match[0].length) : text;
};

export const normalizeScanName = (value = "", { team = false } = {}) => {
  const normalized = normalizeOcrCharacters(stripLeadingScanDorsal(value))
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  if (!team || !normalized) return normalized;
  const meaningfulTokens = normalized
    .split(" ")
    .filter(token => token && !TEAM_NOISE_WORDS.has(token));
  return meaningfulTokens.join(" ") || normalized;
};

const scanNameFingerprint = (value, options = {}) => normalizeScanName(value, options)
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

const editSimilarity = (left, right) => (
  1 - (levenshtein(left, right) / Math.max(left.length, right.length, 1))
);

const jaroSimilarity = (left, right) => {
  if (left === right) return 1;
  if (!left || !right) return 0;

  const matchDistance = Math.max(0, Math.floor(Math.max(left.length, right.length) / 2) - 1);
  const leftMatches = Array(left.length).fill(false);
  const rightMatches = Array(right.length).fill(false);
  let matches = 0;

  for (let i = 0; i < left.length; i += 1) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, right.length);
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
  const rightMatched = right.split("").filter((_, index) => rightMatches[index]);
  const transpositions = leftMatched.reduce(
    (total, character, index) => total + (character !== rightMatched[index] ? 1 : 0),
    0,
  ) / 2;

  return (
    (matches / left.length)
    + (matches / right.length)
    + ((matches - transpositions) / matches)
  ) / 3;
};

const jaroWinklerSimilarity = (left, right) => {
  const jaro = jaroSimilarity(left, right);
  let prefixLength = 0;
  while (
    prefixLength < Math.min(4, left.length, right.length)
    && left[prefixLength] === right[prefixLength]
  ) {
    prefixLength += 1;
  }
  return jaro + (prefixLength * 0.1 * (1 - jaro));
};

const tokenSimilarity = (left, right) => {
  if (left === right) return 1;
  if (left.length === 1 && right.startsWith(left)) return 0.94;
  if (right.length === 1 && left.startsWith(right)) return 0.94;
  return Math.max(editSimilarity(left, right), jaroWinklerSimilarity(left, right));
};

const directedTokenCoverage = (sourceTokens, targetTokens) => {
  if (!sourceTokens.length || !targetTokens.length) return 0;
  const scores = sourceTokens.map(source => Math.max(
    ...targetTokens.map(target => tokenSimilarity(source, target)),
  ));
  return scores.reduce((total, score) => total + score, 0) / scores.length;
};

export const scanNameSimilarity = (left, right, options = {}) => {
  const a = normalizeScanName(left, options);
  const b = normalizeScanName(right, options);
  if (!a || !b) return 0;
  if (a === b) return 1;

  const aTokens = a.split(" ").filter(Boolean);
  const bTokens = b.split(" ").filter(Boolean);
  if ([...aTokens].sort().join(" ") === [...bTokens].sort().join(" ")) return 1;
  const directCharacters = Math.max(editSimilarity(a, b), jaroWinklerSimilarity(a, b));
  const reorderedCharacters = Math.max(
    editSimilarity([...aTokens].sort().join(" "), [...bTokens].sort().join(" ")),
    jaroWinklerSimilarity([...aTokens].sort().join(" "), [...bTokens].sort().join(" ")),
  );
  const forwardCoverage = directedTokenCoverage(aTokens, bTokens);
  const backwardCoverage = directedTokenCoverage(bTokens, aTokens);
  const balancedCoverage = (forwardCoverage + backwardCoverage) / 2;
  const partialCoverage = Math.min(forwardCoverage, backwardCoverage * 0.9);
  const containmentScore = Math.min(a.length, b.length) >= 4 && (a.includes(b) || b.includes(a))
    ? 0.86 + (0.12 * (Math.min(a.length, b.length) / Math.max(a.length, b.length)))
    : 0;

  return Math.min(1, Math.max(
    directCharacters * 0.96,
    reorderedCharacters * 0.94,
    balancedCoverage * 0.93,
    partialCoverage,
    containmentScore,
  ));
};

export const findBestScanMatch = (
  value,
  options,
  getLabel,
  {
    threshold = 0.34,
    minMargin = 0.06,
    strongThreshold = 0.82,
    team = false,
  } = {},
) => {
  const normalizedValue = normalizeScanName(value, { team });
  if (!normalizedValue || !options?.length) return null;
  const valueFingerprint = scanNameFingerprint(value, { team });

  const ranked = options
    .map(option => {
      const label = getLabel(option);
      return {
        option,
        label,
        score: scanNameSimilarity(value, label, { team }),
        exact: normalizedValue === normalizeScanName(label, { team }),
        fingerprint: scanNameFingerprint(label, { team }),
      };
    })
    .sort((a, b) => b.score - a.score);

  // Nombre y apellidos con las mismas palabras son una equivalencia determinista,
  // aunque la cedula los escriba en orden inverso. Solo se acepta si es unica.
  const equivalentMatches = ranked.filter(candidate => candidate.fingerprint === valueFingerprint);
  if (equivalentMatches.length > 1) return null;
  if (equivalentMatches.length === 1) {
    const equivalent = equivalentMatches[0];
    const runnerUp = ranked.find(candidate => candidate !== equivalent);
    return {
      ...equivalent,
      tokenExact: true,
      margin: runnerUp ? equivalent.score - runnerUp.score : 1,
      runnerUpScore: runnerUp?.score || 0,
    };
  }

  const top = ranked[0];
  const runnerUp = ranked[1];
  const margin = runnerUp ? top.score - runnerUp.score : 1;
  const requiredMargin = top.score >= strongThreshold ? Math.min(0.025, minMargin) : minMargin;

  if (top.score < threshold || margin < requiredMargin) return null;
  return { ...top, margin, runnerUpScore: runnerUp?.score || 0 };
};

const defaultScannedPlayerName = (row) => (
  typeof row === "string" ? row : row?.name || ""
);

const defaultRegisteredPlayerName = (candidate) => {
  if (!candidate || typeof candidate !== "object") return String(candidate || "");
  return candidate.full_name
    || candidate.name
    || `${candidate.first_name || ""} ${candidate.last_name || ""}`.trim();
};

const defaultScannedPlayerDorsal = (row) => (
  row && typeof row === "object"
    ? row.dorsal ?? row.number ?? row.shirtNumber ?? row.shirt_number
    : ""
);

const defaultRegisteredPlayerDorsal = (candidate) => (
  candidate && typeof candidate === "object"
    ? candidate.dorsal ?? candidate.number ?? candidate.shirtNumber ?? candidate.shirt_number
    : ""
);

const defaultRegisteredPlayerKey = (candidate, index) => {
  const identifier = candidate && typeof candidate === "object"
    ? candidate.id ?? candidate.player_id
    : undefined;
  return identifier === undefined || identifier === null
    ? `candidate-index:${index}`
    : `candidate-id:${String(identifier)}`;
};

const compareRankedCandidates = (left, right) => (
  right.score - left.score
  || Number(right.tokenExact) - Number(left.tokenExact)
  || left.candidateIndex - right.candidateIndex
);

const compareGlobalProposals = (left, right) => (
  right.priority - left.priority
  || right.score - left.score
  || right.margin - left.margin
  || right.normalizedLength - left.normalizedLength
  || left.rowIndex - right.rowIndex
);

/**
 * Resolves OCR player rows against the complete registered pool.
 *
 * Every row is ranked once against every candidate. A row may only propose its
 * independently safe best candidate; it is never re-ranked after another row
 * claims that candidate. Candidate conflicts are then resolved globally, with
 * unique dorsals and exact names taking precedence over fuzzy names.
 */
export const resolveScannedPlayerMatches = (
  rows = [],
  candidates = [],
  {
    getRowName = defaultScannedPlayerName,
    getRowDorsal = defaultScannedPlayerDorsal,
    getCandidateName = defaultRegisteredPlayerName,
    getCandidateDorsal = defaultRegisteredPlayerDorsal,
    getCandidateKey = defaultRegisteredPlayerKey,
    threshold = 0.72,
    shortNameThreshold = 0.82,
    minMargin = 0.08,
    strongThreshold = 0.92,
    strongMinMargin = 0.04,
    dorsalNameFloor = 0.45,
    dorsalConflictThreshold = 0.78,
    team = false,
  } = {},
) => {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const uniqueCandidateKeys = new Set();
  const candidateRecords = (Array.isArray(candidates) ? candidates : []).flatMap((candidate, candidateIndex) => {
    const key = String(getCandidateKey(candidate, candidateIndex));
    if (uniqueCandidateKeys.has(key)) return [];
    uniqueCandidateKeys.add(key);
    const label = String(getCandidateName(candidate) || "");
    const normalizedName = normalizeScanName(label, { team });
    return [{
      candidate,
      candidateIndex,
      key,
      label,
      normalizedName,
      fingerprint: scanNameFingerprint(label, { team }),
      dorsal: normalizeScanDorsal(getCandidateDorsal(candidate)),
    }];
  });

  const candidatesByDorsal = new Map();
  for (const record of candidateRecords) {
    if (!record.dorsal) continue;
    const sameDorsal = candidatesByDorsal.get(record.dorsal) || [];
    sameDorsal.push(record);
    candidatesByDorsal.set(record.dorsal, sameDorsal);
  }

  const baseResults = [];
  const proposals = [];

  rows.forEach((row, rowIndex) => {
    const rawName = String(getRowName(row, rowIndex) || "");
    const normalizedName = normalizeScanName(rawName, { team });
    const fingerprint = scanNameFingerprint(rawName, { team });
    const explicitDorsal = normalizeScanDorsal(getRowDorsal(row, rowIndex));
    const dorsal = explicitDorsal || extractLeadingScanDorsal(rawName);
    const normalizedLength = normalizedName.replace(/\s+/g, "").length;
    const ranked = candidateRecords.map(record => ({
      ...record,
      score: normalizedName ? scanNameSimilarity(rawName, record.label, { team }) : 0,
      exact: Boolean(normalizedName) && normalizedName === record.normalizedName,
      tokenExact: Boolean(fingerprint) && fingerprint === record.fingerprint,
    })).sort(compareRankedCandidates);
    const top = ranked[0];
    const runnerUp = ranked[1];
    const initialResult = {
      row,
      rowIndex,
      matched: null,
      option: null,
      score: 0,
      margin: 0,
      runnerUpScore: runnerUp?.score || 0,
      method: null,
      dorsal,
      reason: candidateRecords.length ? "weak-name" : "no-candidates",
    };
    baseResults.push(initialResult);

    if (!candidateRecords.length) return;

    const uniqueDorsalCandidate = dorsal && candidatesByDorsal.get(dorsal)?.length === 1
      ? candidatesByDorsal.get(dorsal)[0]
      : null;

    if (uniqueDorsalCandidate) {
      const dorsalRank = ranked.find(candidate => candidate.key === uniqueDorsalCandidate.key);
      const exactNameCandidates = ranked.filter(candidate => candidate.tokenExact);
      const exactNameConflict = exactNameCandidates.length === 1
        && exactNameCandidates[0].key !== uniqueDorsalCandidate.key;
      const strongNameConflict = Boolean(
        normalizedName
        && top
        && top.key !== uniqueDorsalCandidate.key
        && top.score >= dorsalConflictThreshold
        && (dorsalRank?.score || 0) < dorsalNameFloor
        && top.score - (dorsalRank?.score || 0) >= minMargin,
      );

      if (exactNameConflict || strongNameConflict) {
        initialResult.reason = "dorsal-name-conflict";
        initialResult.score = dorsalRank?.score || 0;
        initialResult.runnerUpScore = top?.score || 0;
        return;
      }

      proposals.push({
        row,
        rowIndex,
        record: uniqueDorsalCandidate,
        score: normalizedName ? dorsalRank?.score || 0 : 1,
        margin: normalizedName && top?.key === uniqueDorsalCandidate.key
          ? top.score - (runnerUp?.score || 0)
          : 1,
        runnerUpScore: runnerUp?.score || 0,
        method: "dorsal",
        dorsal,
        exact: dorsalRank?.exact || false,
        tokenExact: dorsalRank?.tokenExact || false,
        normalizedLength,
        priority: 3,
      });
      return;
    }

    if (!normalizedName || !top) {
      initialResult.reason = dorsal ? "unknown-dorsal" : "empty-name";
      return;
    }

    const equivalentMatches = ranked.filter(candidate => candidate.tokenExact);
    if (equivalentMatches.length > 1) {
      initialResult.reason = "ambiguous-name";
      initialResult.score = top.score;
      initialResult.margin = top.score - (runnerUp?.score || 0);
      return;
    }

    if (equivalentMatches.length === 1) {
      const exactCandidate = equivalentMatches[0];
      const exactRunnerUp = ranked.find(candidate => candidate.key !== exactCandidate.key);
      proposals.push({
        row,
        rowIndex,
        record: exactCandidate,
        score: exactCandidate.score,
        margin: exactCandidate.score - (exactRunnerUp?.score || 0),
        runnerUpScore: exactRunnerUp?.score || 0,
        method: "exact-name",
        dorsal,
        exact: exactCandidate.exact,
        tokenExact: true,
        normalizedLength,
        priority: 2,
      });
      return;
    }

    const requiredThreshold = normalizedLength < 6 || !normalizedName.includes(" ")
      ? Math.max(threshold, shortNameThreshold)
      : threshold;
    const margin = top.score - (runnerUp?.score || 0);
    const requiredMargin = top.score >= strongThreshold ? strongMinMargin : minMargin;
    initialResult.score = top.score;
    initialResult.margin = margin;
    initialResult.runnerUpScore = runnerUp?.score || 0;

    if (!normalizedName.includes(" ") && top.normalizedName.includes(" ")) {
      initialResult.reason = "partial-name";
      return;
    }
    if (top.score < requiredThreshold) {
      initialResult.reason = "weak-name";
      return;
    }
    if (runnerUp && margin < requiredMargin) {
      initialResult.reason = "ambiguous-name";
      return;
    }

    proposals.push({
      row,
      rowIndex,
      record: top,
      score: top.score,
      margin,
      runnerUpScore: runnerUp?.score || 0,
      method: "fuzzy-name",
      dorsal,
      exact: false,
      tokenExact: false,
      normalizedLength,
      priority: 1,
    });
  });

  const proposalsByCandidate = new Map();
  for (const proposal of proposals) {
    const competing = proposalsByCandidate.get(proposal.record.key) || [];
    competing.push(proposal);
    proposalsByCandidate.set(proposal.record.key, competing);
  }

  for (const competing of proposalsByCandidate.values()) {
    competing.sort(compareGlobalProposals);
    const winner = competing[0];
    const winnerResult = baseResults[winner.rowIndex];
    Object.assign(winnerResult, {
      matched: winner.record.candidate,
      option: winner.record.candidate,
      score: winner.score,
      margin: winner.margin,
      runnerUpScore: winner.runnerUpScore,
      method: winner.method,
      dorsal: winner.dorsal,
      exact: winner.exact,
      tokenExact: winner.tokenExact,
      reason: null,
    });

    for (const loser of competing.slice(1)) {
      Object.assign(baseResults[loser.rowIndex], {
        score: loser.score,
        margin: loser.margin,
        runnerUpScore: loser.runnerUpScore,
        method: loser.method,
        dorsal: loser.dorsal,
        exact: loser.exact,
        tokenExact: loser.tokenExact,
        suggested: loser.record.candidate,
        reason: "candidate-conflict",
        conflictWithRowIndex: winner.rowIndex,
      });
    }
  }

  return baseResults;
};

export const normalizeScanDate = (value = "") => {
  const match = String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/);
  if (!match) return "";

  const [, year, month, day] = match;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  const isValid = parsed.getUTCFullYear() === Number(year)
    && parsed.getUTCMonth() === Number(month) - 1
    && parsed.getUTCDate() === Number(day);
  return isValid ? `${year}-${month}-${day}` : "";
};

export const getScannedDateReview = (currentDate, scannedDate, applyScannedDate = false) => {
  const normalizedCurrentDate = normalizeScanDate(currentDate);
  const normalizedScannedDate = normalizeScanDate(scannedDate);
  const hasExistingDate = Boolean(normalizedCurrentDate);
  const hasValidScannedDate = Boolean(normalizedScannedDate);
  const datesMatch = hasExistingDate
    && hasValidScannedDate
    && normalizedCurrentDate === normalizedScannedDate;
  const canReplaceDate = hasExistingDate && hasValidScannedDate && !datesMatch;

  let label = normalizedScannedDate || normalizedCurrentDate || "Sin detectar";
  if (datesMatch) label = `${normalizedCurrentDate} · coincide`;
  else if (canReplaceDate && !applyScannedDate) label = `${normalizedCurrentDate} · se conserva`;

  return {
    normalizedCurrentDate,
    normalizedScannedDate,
    hasExistingDate,
    hasValidScannedDate,
    datesMatch,
    canReplaceDate,
    label,
  };
};

export const resolveScannedTeamSides = (firstName, secondName, actualTeams) => {
  const [registeredLocal, registeredVisit] = actualTeams;
  const firstReadable = Boolean(normalizeScanName(firstName, { team: true }));
  const secondReadable = Boolean(normalizeScanName(secondName, { team: true }));
  const oppositeSide = side => side === "local" ? "visit" : "local";
  const singleTeamOptions = {
    threshold: 0.28,
    minMargin: 0.04,
    strongThreshold: 0.76,
    team: true,
  };

  if (firstReadable && !secondReadable) {
    const match = findBestScanMatch(firstName, actualTeams, team => team.name, singleTeamOptions);
    if (match) {
      return {
        firstSide: match.option.side,
        secondSide: oppositeSide(match.option.side),
        swapped: match.option.side === "visit",
        ambiguous: false,
      };
    }
  }

  if (!firstReadable && secondReadable) {
    const match = findBestScanMatch(secondName, actualTeams, team => team.name, singleTeamOptions);
    if (match) {
      return {
        firstSide: oppositeSide(match.option.side),
        secondSide: match.option.side,
        swapped: match.option.side === "local",
        ambiguous: false,
      };
    }
  }

  const directScore = scanNameSimilarity(firstName, registeredLocal.name, { team: true })
    + scanNameSimilarity(secondName, registeredVisit.name, { team: true });
  const swappedScore = scanNameSimilarity(firstName, registeredVisit.name, { team: true })
    + scanNameSimilarity(secondName, registeredLocal.name, { team: true });
  const swapped = swappedScore > directScore + 0.04;
  const selectedScore = swapped ? swappedScore : directScore;

  return {
    firstSide: swapped ? "visit" : "local",
    secondSide: swapped ? "local" : "visit",
    swapped,
    ambiguous: selectedScore < 0.62
      || (firstReadable && secondReadable && Math.abs(directScore - swappedScore) < 0.04),
  };
};
