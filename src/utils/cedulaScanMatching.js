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

export const normalizeScanName = (value = "", { team = false } = {}) => {
  const normalized = normalizeOcrCharacters(String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/^\s*\d{1,3}\s*[-.):]?\s*/, ""))
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
