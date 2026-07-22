import {
    findBestScanMatch,
    normalizeScanName,
    scanNameSimilarity,
} from "./cedulaScanMatching.js";

const MAX_OCR_LINES = 220;
const MAX_LINE_LENGTH = 180;
const MIN_LINE_CONFIDENCE = 0.2;
const MIN_RELIABLE_PAIR_CONFIDENCE = 0.76;
const LOCAL_OCR_TIMEOUT_MS = 45_000;
const MATCH_SEPARATOR_PATTERN = /\b(?:v\s*[.-]?\s*[s5]|contra)\b/i;
const BYE_PATTERN = /\b(?:descansa|descanso|libre|bye|sin\s+juego)\b/i;
const CLOCK_PATTERN = /\b([01]?\d|2[0-3])(?:\s*[:.]\s*([0-5]\d))\s*([ap]\s*\.?\s*m\.?)?\b/i;
const MERIDIEM_PATTERN = /^\s*([ap])\s*\.?\s*m\.?\s*$/i;
const WEEKDAYS = [
    { label: "domingo", index: 0 },
    { label: "lunes", index: 1 },
    { label: "martes", index: 2 },
    { label: "miercoles", index: 3 },
    { label: "jueves", index: 4 },
    { label: "viernes", index: 5 },
    { label: "sabado", index: 6 },
];

let ocrInstancePromise = null;
let localOcrDisabledForSession = false;

const cleanText = (value, maxLength = MAX_LINE_LENGTH) => Array.from(String(value || ""))
    .map((character) => (
        character.charCodeAt(0) < 32 || character === "<" || character === ">" ? " " : character
    ))
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

const toFiniteNumber = (value, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
};

const getBoundingBox = (item) => {
    if (item?.boundingBox) {
        return {
            x: Math.max(0, toFiniteNumber(item.boundingBox.x)),
            y: Math.max(0, toFiniteNumber(item.boundingBox.y)),
            width: Math.max(0, toFiniteNumber(item.boundingBox.width)),
            height: Math.max(0, toFiniteNumber(item.boundingBox.height)),
        };
    }

    const points = Array.isArray(item?.poly) ? item.poly : [];
    const xs = points.map((point) => toFiniteNumber(point?.[0], Number.NaN)).filter(Number.isFinite);
    const ys = points.map((point) => toFiniteNumber(point?.[1], Number.NaN)).filter(Number.isFinite);
    if (!xs.length || !ys.length) return { x: 0, y: 0, width: 0, height: 0 };
    const left = Math.min(...xs);
    const top = Math.min(...ys);
    return {
        x: Math.max(0, left),
        y: Math.max(0, top),
        width: Math.max(0, Math.max(...xs) - left),
        height: Math.max(0, Math.max(...ys) - top),
    };
};

const boxCenter = (box) => ({
    x: box.x + (box.width / 2),
    y: box.y + (box.height / 2),
});

const compareReadingOrder = (left, right) => {
    const rowTolerance = Math.max(4, Math.min(left.boundingBox.height, right.boundingBox.height) * 0.6);
    const yDelta = left.boundingBox.y - right.boundingBox.y;
    return Math.abs(yDelta) <= rowTolerance
        ? left.boundingBox.x - right.boundingBox.x
        : yDelta;
};

const weightedLineConfidence = (lines) => {
    const totalWeight = lines.reduce((total, line) => total + Math.max(1, line.text.length), 0);
    return totalWeight
        ? lines.reduce(
            (total, line) => total + (line.confidence * Math.max(1, line.text.length)),
            0,
        ) / totalWeight
        : 0;
};

/**
 * Converts PaddleOCR output into a small, serializable contract that can also
 * be sent to the Edge Function as a deterministic hint.
 */
export const normalizePaddleOcrResult = (result = {}) => {
    const lines = (Array.isArray(result?.items) ? result.items : [])
        .slice(0, MAX_OCR_LINES * 2)
        .map((item, index) => ({
            id: `ocr-line-${index}`,
            text: cleanText(item?.text),
            confidence: clamp01(item?.score ?? item?.confidence),
            boundingBox: getBoundingBox(item),
        }))
        .filter((line) => line.text && line.confidence >= MIN_LINE_CONFIDENCE)
        .sort(compareReadingOrder)
        .slice(0, MAX_OCR_LINES)
        .map((line, index) => ({ ...line, id: `ocr-line-${index}` }));

    const confidence = weightedLineConfidence(lines);

    return {
        text: lines.map((line) => line.text).join("\n").slice(0, 24_000),
        confidence: clamp01(confidence),
        lines,
        image: {
            width: Math.max(1, toFiniteNumber(result?.image?.width, 1)),
            height: Math.max(1, toFiniteNumber(result?.image?.height, 1)),
        },
        metrics: result?.metrics || null,
    };
};

const tokenize = (value) => [...String(value || "").matchAll(/[\p{L}\p{N}]+/gu)]
    .map((match, index) => ({ raw: match[0], index }));

const buildTextWindows = (value, maxTokens = 6) => {
    const tokens = tokenize(value);
    const windows = [];
    for (let start = 0; start < tokens.length; start += 1) {
        for (let length = 1; length <= Math.min(maxTokens, tokens.length - start); length += 1) {
            windows.push({
                text: tokens.slice(start, start + length).map((token) => token.raw).join(" "),
                start,
                end: start + length,
            });
        }
    }
    return windows;
};

const findBestTeamWindow = (value, teams, {
    threshold = 0.58,
    minMargin = 0.055,
    excludedIds = new Set(),
} = {}) => {
    const availableTeams = teams.filter((team) => !excludedIds.has(String(team.id)));
    if (!availableTeams.length) return null;

    let best = null;
    for (const window of buildTextWindows(value)) {
        const match = findBestScanMatch(window.text, availableTeams, (team) => team.name, {
            threshold,
            minMargin,
            strongThreshold: 0.87,
            team: true,
        });
        if (!match) continue;
        const registeredTokenCount = normalizeScanName(match.option.name, { team: true }).split(" ").length;
        const windowTokenCount = window.end - window.start;
        const lengthPenalty = Math.min(0.12, Math.abs(windowTokenCount - registeredTokenCount) * 0.035);
        const adjustedScore = match.score - lengthPenalty;
        if (!best || adjustedScore > best.adjustedScore) {
            best = { ...match, ...window, adjustedScore };
        }
    }
    return best;
};

const rangesOverlap = (left, right) => left.start < right.end && right.start < left.end;

const findLineMentions = (line, teams) => {
    const candidates = new Map();
    for (const window of buildTextWindows(line.text)) {
        const match = findBestScanMatch(window.text, teams, (team) => team.name, {
            threshold: 0.62,
            minMargin: 0.06,
            strongThreshold: 0.88,
            team: true,
        });
        if (!match) continue;
        const id = String(match.option.id);
        const current = candidates.get(id);
        const registeredTokenCount = normalizeScanName(match.option.name, { team: true }).split(" ").length;
        const adjustedScore = match.score - Math.min(
            0.12,
            Math.abs((window.end - window.start) - registeredTokenCount) * 0.035,
        );
        if (!current || adjustedScore > current.adjustedScore) {
            candidates.set(id, {
                team: match.option,
                matchScore: match.score,
                adjustedScore,
                margin: match.margin,
                start: window.start,
                end: window.end,
                line,
            });
        }
    }

    const accepted = [];
    [...candidates.values()]
        .sort((left, right) => right.adjustedScore - left.adjustedScore)
        .forEach((candidate) => {
            if (!accepted.some((current) => rangesOverlap(current, candidate))) accepted.push(candidate);
        });
    return accepted.sort((left, right) => left.start - right.start);
};

const explicitPairFromLine = (line, teams) => {
    const separator = line.text.match(MATCH_SEPARATOR_PATTERN);
    if (!separator || separator.index === undefined) return null;
    const leftText = line.text.slice(0, separator.index);
    const rightText = line.text.slice(separator.index + separator[0].length);
    const local = findBestTeamWindow(leftText, teams, { threshold: 0.55, minMargin: 0.05 });
    if (!local) return null;
    const visitor = findBestTeamWindow(rightText, teams, {
        threshold: 0.55,
        minMargin: 0.05,
        excludedIds: new Set([String(local.option.id)]),
    });
    if (!visitor) return null;
    const center = boxCenter(line.boundingBox);
    return {
        local: local.option,
        visitor: visitor.option,
        confidence: Math.min(local.score, visitor.score) * (0.82 + (line.confidence * 0.18)),
        recognitionConfidence: line.confidence,
        center,
        sourceLineIds: [line.id],
        explicit: true,
    };
};

const buildPairCandidates = (ocr, teams) => {
    const explicitPairs = ocr.lines.map((line) => explicitPairFromLine(line, teams)).filter(Boolean);
    const mentions = ocr.lines.flatMap((line) => {
        if (BYE_PATTERN.test(normalizeScanName(line.text))) return [];
        return findLineMentions(line, teams);
    });
    const imageWidth = Math.max(1, ocr.image.width);
    const imageHeight = Math.max(1, ocr.image.height);
    const geometricPairs = [];

    for (let leftIndex = 0; leftIndex < mentions.length; leftIndex += 1) {
        const left = mentions[leftIndex];
        for (let rightIndex = leftIndex + 1; rightIndex < mentions.length; rightIndex += 1) {
            const right = mentions[rightIndex];
            if (String(left.team.id) === String(right.team.id) || left.line.id === right.line.id) continue;
            const leftCenter = boxCenter(left.line.boundingBox);
            const rightCenter = boxCenter(right.line.boundingBox);
            const horizontalDelta = Math.abs(leftCenter.x - rightCenter.x) / imageWidth;
            const verticalDelta = Math.abs(leftCenter.y - rightCenter.y) / imageHeight;
            const widthAllowance = Math.min(
                0.085,
                Math.max(0.035, ((left.line.boundingBox.width + right.line.boundingBox.width) / 2) / imageWidth),
            );
            if (horizontalDelta > widthAllowance || verticalDelta > 0.055) continue;

            const proximity = clamp01(
                1 - ((horizontalDelta / Math.max(widthAllowance, 0.001)) * 0.42)
                - ((verticalDelta / 0.055) * 0.58),
            );
            const ordered = leftCenter.y <= rightCenter.y ? [left, right] : [right, left];
            geometricPairs.push({
                local: ordered[0].team,
                visitor: ordered[1].team,
                confidence: Math.min(left.matchScore, right.matchScore)
                    * (0.78 + (proximity * 0.22)),
                recognitionConfidence: Math.min(left.line.confidence, right.line.confidence),
                center: {
                    x: (leftCenter.x + rightCenter.x) / 2,
                    y: (leftCenter.y + rightCenter.y) / 2,
                },
                sourceLineIds: [left.line.id, right.line.id],
                explicit: false,
            });
        }
    }

    const bestByTeams = new Map();
    [...explicitPairs, ...geometricPairs].forEach((pair) => {
        const ids = [String(pair.local.id), String(pair.visitor.id)].sort();
        const key = ids.join("::");
        const current = bestByTeams.get(key);
        const pairRank = pair.confidence + (pair.explicit ? 0.12 : 0);
        const currentRank = current ? current.confidence + (current.explicit ? 0.12 : 0) : -1;
        if (!current || pairRank > currentRank) bestByTeams.set(key, pair);
    });
    return [...bestByTeams.values()];
};

const chooseBestDisjointPairs = (pairs, teams) => {
    if (!pairs.length) return [];
    const teamIds = teams.map((team) => String(team.id));
    if (teamIds.length > 24) {
        const used = new Set();
        return [...pairs]
            .sort((left, right) => (Number(right.explicit) - Number(left.explicit)) || right.confidence - left.confidence)
            .filter((pair) => {
                const localId = String(pair.local.id);
                const visitorId = String(pair.visitor.id);
                if (used.has(localId) || used.has(visitorId)) return false;
                used.add(localId);
                used.add(visitorId);
                return true;
            });
    }

    const edgesByTeam = new Map(teamIds.map((id) => [id, []]));
    pairs.forEach((pair) => {
        edgesByTeam.get(String(pair.local.id))?.push(pair);
        edgesByTeam.get(String(pair.visitor.id))?.push(pair);
    });
    const memo = new Map();
    const better = (left, right) => {
        if (left.pairs.length !== right.pairs.length) return left.pairs.length > right.pairs.length ? left : right;
        return left.score >= right.score ? left : right;
    };

    const solve = (remaining) => {
        if (remaining.size < 2) return { pairs: [], score: 0 };
        const key = [...remaining].sort().join("|");
        if (memo.has(key)) return memo.get(key);

        const pivot = [...remaining].sort((left, right) => {
            const leftDegree = (edgesByTeam.get(left) || []).filter((edge) => {
                const other = String(edge.local.id) === left ? String(edge.visitor.id) : String(edge.local.id);
                return remaining.has(other);
            }).length;
            const rightDegree = (edgesByTeam.get(right) || []).filter((edge) => {
                const other = String(edge.local.id) === right ? String(edge.visitor.id) : String(edge.local.id);
                return remaining.has(other);
            }).length;
            return leftDegree - rightDegree;
        })[0];

        const withoutPivot = new Set(remaining);
        withoutPivot.delete(pivot);
        let best = solve(withoutPivot);
        for (const edge of edgesByTeam.get(pivot) || []) {
            const other = String(edge.local.id) === pivot ? String(edge.visitor.id) : String(edge.local.id);
            if (!remaining.has(other)) continue;
            const nextRemaining = new Set(withoutPivot);
            nextRemaining.delete(other);
            const tail = solve(nextRemaining);
            best = better(best, {
                pairs: [edge, ...tail.pairs],
                score: edge.confidence + (edge.explicit ? 0.08 : 0) + tail.score,
            });
        }
        memo.set(key, best);
        return best;
    };

    return solve(new Set(teamIds)).pairs;
};

const parseClock = (value, nearbyMeridiem = "") => {
    const match = cleanText(value).match(CLOCK_PATTERN);
    if (!match) return null;
    let hour = Number(match[1]);
    const minute = Number(match[2] || 0);
    const meridiem = cleanText(match[3] || nearbyMeridiem).replace(/[^ap]/gi, "").toLowerCase();
    if (meridiem) {
        if (hour < 1 || hour > 12) return null;
        if (hour === 12) hour = 0;
        if (meridiem === "p") hour += 12;
    }
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    return {
        normalized: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
        label: `${match[1]}:${String(minute).padStart(2, "0")}${meridiem ? ` ${meridiem.toUpperCase()}M` : ""}`,
    };
};

const buildTimeAnchors = (ocr) => ocr.lines.flatMap((line) => {
    if (!CLOCK_PATTERN.test(line.text)) return [];
    const center = boxCenter(line.boundingBox);
    const nearbyMeridiem = ocr.lines
        .filter((candidate) => candidate.id !== line.id && MERIDIEM_PATTERN.test(candidate.text))
        .map((candidate) => ({
            line: candidate,
            center: boxCenter(candidate.boundingBox),
        }))
        .filter((candidate) => (
            Math.abs(candidate.center.x - center.x) <= ocr.image.width * 0.035
            && Math.abs(candidate.center.y - center.y) <= ocr.image.height * 0.04
        ))
        .sort((left, right) => Math.abs(left.center.y - center.y) - Math.abs(right.center.y - center.y))[0]?.line.text;
    const clock = parseClock(line.text, nearbyMeridiem);
    return clock ? [{ ...clock, center }] : [];
});

const identifyWeekday = (value) => {
    const normalized = normalizeScanName(value);
    if (!normalized) return null;
    const exact = WEEKDAYS.find((weekday) => normalized.includes(weekday.label));
    if (exact) return exact;
    const ranked = WEEKDAYS
        .map((weekday) => ({ ...weekday, score: scanNameSimilarity(normalized, weekday.label) }))
        .sort((left, right) => right.score - left.score);
    return ranked[0]?.score >= 0.72 && (ranked[0].score - (ranked[1]?.score || 0)) >= 0.08
        ? ranked[0]
        : null;
};

const buildWeekdayAnchors = (ocr) => ocr.lines.flatMap((line) => {
    const weekday = identifyWeekday(line.text);
    return weekday ? [{ ...weekday, center: boxCenter(line.boundingBox), text: line.text }] : [];
});

const parseIsoDate = (value) => {
    const match = String(value || "").match(/^(20\d{2})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    return Number.isNaN(date.getTime()) ? null : date;
};

const formatIsoDate = (date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;

const dateForWeekday = (weekday, context) => {
    const start = parseIsoDate(context?.roundStartDate);
    const end = parseIsoDate(context?.roundEndDate);
    if (!start || !end || end < start) return "";
    const matches = [];
    for (let timestamp = start.getTime(); timestamp <= end.getTime() && matches.length < 2; timestamp += 86_400_000) {
        const date = new Date(timestamp);
        if (date.getUTCDay() === weekday) matches.push(date);
    }
    return matches.length === 1 ? formatIsoDate(matches[0]) : "";
};

const scheduleForPair = (pair, ocr, context, weekdayAnchors, timeAnchors) => {
    const weekday = weekdayAnchors
        .map((anchor) => ({ ...anchor, distance: Math.abs(anchor.center.x - pair.center.x) / ocr.image.width }))
        .filter((anchor) => anchor.distance <= 0.105)
        .sort((left, right) => left.distance - right.distance)[0];
    const clock = timeAnchors
        .map((anchor) => ({ ...anchor, distance: Math.abs(anchor.center.y - pair.center.y) / ocr.image.height }))
        .filter((anchor) => anchor.distance <= 0.07)
        .sort((left, right) => left.distance - right.distance)[0];
    const date = weekday ? dateForWeekday(weekday.index, context) : "";
    return {
        date,
        time: clock?.normalized || "",
        dateTimeDetected: Boolean(date && clock?.normalized),
        rawSchedule: {
            rangeLabel: "",
            dateLabel: "",
            weekdayLabel: weekday?.text || "",
            timeLabel: clock?.label || "",
            dateSource: date ? "round-context-weekday" : "",
        },
        scheduleLabel: ` | ${weekday?.text || ""} | ${clock?.label || ""}`,
    };
};

const findByeTeam = (ocr, teams, usedIds) => {
    const remaining = teams.filter((team) => !usedIds.has(String(team.id)));
    if (remaining.length === 1) return { team: remaining[0], inferred: true };
    const byeLines = ocr.lines.filter((line) => BYE_PATTERN.test(normalizeScanName(line.text)));
    for (const line of byeLines) {
        const direct = findBestTeamWindow(line.text.replace(BYE_PATTERN, " "), remaining, {
            threshold: 0.55,
            minMargin: 0.05,
        });
        if (direct) return { team: direct.option, inferred: false };
    }
    return { team: null, inferred: false };
};

/**
 * Resolves OCR lines only against the closed participant list. The result has
 * both the final scan shape used by the React review and raw entries for the
 * server-side deterministic validator.
 */
export const buildRoleScanFromOcr = (normalizedOcr, context = {}) => {
    const ocr = normalizedOcr?.lines ? normalizedOcr : normalizePaddleOcrResult(normalizedOcr);
    const teams = (Array.isArray(context?.teams) ? context.teams : [])
        .filter((team) => team?.id !== undefined && cleanText(team?.name));
    const expectedMatches = Math.floor(teams.length / 2);
    const pairCandidates = buildPairCandidates(ocr, teams);
    const selectedPairs = chooseBestDisjointPairs(pairCandidates, teams).slice(0, expectedMatches);
    const usedIds = new Set(selectedPairs.flatMap((pair) => [String(pair.local.id), String(pair.visitor.id)]));
    const needsBye = teams.length % 2 === 1;
    const bye = needsBye ? findByeTeam(ocr, teams, usedIds) : { team: null, inferred: false };
    if (bye.team) usedIds.add(String(bye.team.id));
    const weekdayAnchors = buildWeekdayAnchors(ocr);
    const timeAnchors = buildTimeAnchors(ocr);
    const matches = selectedPairs
        .sort((left, right) => left.center.y - right.center.y || left.center.x - right.center.x)
        .map((pair) => ({
            localTeamId: String(pair.local.id),
            localTeam: pair.local.name,
            visitorTeamId: String(pair.visitor.id),
            visitorTeam: pair.visitor.name,
            ...scheduleForPair(pair, ocr, context, weekdayAnchors, timeAnchors),
            confidence: clamp01(pair.confidence),
        }));

    const lineUsage = new Map();
    selectedPairs.forEach((pair) => pair.sourceLineIds.forEach((lineId) => {
        lineUsage.set(lineId, (lineUsage.get(lineId) || 0) + 1);
    }));
    const reliablePairs = selectedPairs.every((pair) => (
        pair.confidence >= MIN_RELIABLE_PAIR_CONFIDENCE
        && pair.recognitionConfidence >= 0.45
    ));
    const minimumPairConfidence = selectedPairs.length
        ? Math.min(...selectedPairs.map((pair) => clamp01(pair.confidence)))
        : 0;
    const noSharedSourceLines = [...lineUsage.values()].every((uses) => uses === 1);
    const relevantSourceLineIds = new Set(selectedPairs.flatMap((pair) => pair.sourceLineIds));
    const relevantOcrConfidence = weightedLineConfidence(
        ocr.lines.filter((line) => relevantSourceLineIds.has(line.id)),
    );
    const reliableOcr = relevantOcrConfidence >= MIN_RELIABLE_PAIR_CONFIDENCE;
    const complete = teams.length >= 2
        && matches.length === expectedMatches
        && usedIds.size === teams.length
        && (!needsBye || Boolean(bye.team))
        && reliablePairs
        && reliableOcr
        && noSharedSourceLines;

    const entries = matches.map((match) => ({
        divisionLabel: cleanText(context?.divisionName),
        roundLabel: cleanText(context?.roundTitle),
        scheduleLabel: match.scheduleLabel,
        localTeam: match.localTeam,
        visitorTeam: match.visitorTeam,
        byeTeam: "",
    }));
    if (bye.team) {
        entries.push({
            divisionLabel: cleanText(context?.divisionName),
            roundLabel: cleanText(context?.roundTitle),
            scheduleLabel: "",
            localTeam: "",
            visitorTeam: "",
            byeTeam: bye.team.name,
        });
    }

    const clientOcr = {
        text: ocr.text,
        // La confianza de la decision se calcula solo sobre las lineas fuente
        // de los cruces; filas de otras divisiones no deben forzar Gemini.
        confidence: clamp01(relevantOcrConfidence),
        lines: ocr.lines.map(({ text, confidence, boundingBox }) => ({
            text,
            confidence,
            boundingBox: {
                x: clamp01(boundingBox.x / ocr.image.width),
                y: clamp01(boundingBox.y / ocr.image.height),
                width: clamp01(boundingBox.width / ocr.image.width),
                height: clamp01(boundingBox.height / ocr.image.height),
            },
        })),
        scan: {
            entries,
            complete,
            minimumPairConfidence,
            noSharedSourceLines,
        },
    };
    const scan = {
        matches: matches.map((match) => ({
            localTeamId: match.localTeamId,
            localTeam: match.localTeam,
            visitorTeamId: match.visitorTeamId,
            visitorTeam: match.visitorTeam,
            date: match.date,
            time: match.time,
            dateTimeDetected: match.dateTimeDetected,
            rawSchedule: match.rawSchedule,
        })),
        byeTeamId: bye.team ? String(bye.team.id) : "",
        byeTeam: bye.team?.name || "",
        matchedTeamCount: usedIds.size,
        expectedTeamCount: teams.length,
        sourceDivision: cleanText(context?.divisionName),
        sourceRound: cleanText(context?.roundTitle),
        complete,
        byeInferred: bye.inferred,
    };

    return {
        clientOcr,
        scan,
        complete,
        diagnostics: {
            recognizedLines: ocr.lines.length,
            pairCandidates: pairCandidates.length,
            selectedPairs: selectedPairs.length,
            minimumPairConfidence,
            reliablePairs,
            reliableOcr,
            rawOcrConfidence: clamp01(ocr.confidence),
            relevantOcrConfidence: clamp01(relevantOcrConfidence),
            noSharedSourceLines,
        },
    };
};

export const canRunLocalRoleOcr = () => (
    !localOcrDisabledForSession
    && typeof window !== "undefined"
    && typeof window.Worker === "function"
    && typeof window.WebAssembly === "object"
    && !window.navigator?.connection?.saveData
    && !["slow-2g", "2g"].includes(window.navigator?.connection?.effectiveType)
);

const getOcrInstance = async () => {
    if (!ocrInstancePromise) {
        ocrInstancePromise = import("@paddleocr/paddleocr-js")
            .then(({ PaddleOCR }) => PaddleOCR.create({
                lang: "es",
                ocrVersion: "PP-OCRv6",
                worker: true,
                ortOptions: {
                    backend: "wasm",
                    numThreads: 1,
                    simd: true,
                },
            }))
            .catch((error) => {
                ocrInstancePromise = null;
                throw error;
            });
    }
    return ocrInstancePromise;
};

const withTimeout = (promise, milliseconds) => new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(
        () => {
            const error = new Error("LOCAL_OCR_TIMEOUT");
            error.code = "LOCAL_OCR_TIMEOUT";
            reject(error);
        },
        milliseconds,
    );
    promise.then(
        (value) => {
            window.clearTimeout(timeoutId);
            resolve(value);
        },
        (error) => {
            window.clearTimeout(timeoutId);
            reject(error);
        },
    );
});

export const runLocalRoleOcr = async (image, context, { timeoutMs = LOCAL_OCR_TIMEOUT_MS } = {}) => {
    if (!canRunLocalRoleOcr()) return null;
    const deadline = Date.now() + timeoutMs;
    const remainingTime = () => Math.max(1, deadline - Date.now());
    let ocr = null;
    try {
        ocr = await withTimeout(getOcrInstance(), remainingTime());
        const results = await withTimeout(ocr.predict(image, {
            textDetLimitSideLen: 1600,
            textDetMaxSideLimit: 2200,
            textRecScoreThresh: MIN_LINE_CONFIDENCE,
        }), remainingTime());
        const normalized = normalizePaddleOcrResult(results?.[0]);
        if (!normalized.lines.length) return null;
        return buildRoleScanFromOcr(normalized, context);
    } catch (error) {
        // Evita volver a iniciar el modelo tras un timeout/fallo y detiene el
        // Worker pendiente antes de continuar con el respaldo remoto.
        localOcrDisabledForSession = true;
        const pendingInstance = ocr ? Promise.resolve(ocr) : ocrInstancePromise;
        ocrInstancePromise = null;
        pendingInstance?.then((instance) => instance?.dispose?.()).catch(() => {});
        throw error;
    }
};
