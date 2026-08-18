const VS_SEPARATOR_PATTERN = /\s+(?:v\.?s\.?|vs\.?|versus)\s+/gi;

const isPlayablePair = (pair) =>
    pair?.local?.id !== "BYE" && pair?.visitante?.id !== "BYE";

export const getTextRoundMatchStats = (text = "", pairs = []) => {
    const detected = pairs.filter(isPlayablePair).length;
    const rawAttempts = (String(text).match(VS_SEPARATOR_PATTERN) || []).length;
    // Los descansos se escriben como "Equipo vs DESCANSA", pero no son
    // partidos jugables y no deben contar contra el total esperado.
    const recognizedNonPlayablePairs = pairs.length - detected;

    return {
        detected,
        attempted: Math.max(0, rawAttempts - recognizedNonPlayablePairs),
    };
};

export const isTextRoundComplete = ({
    detected = 0,
    expected = 0,
    attempted = 0,
    isLocked = false,
} = {}) =>
    isLocked || expected === 0 || (detected >= expected && detected === attempted);

export const shouldBlockTextCompleteness = ({
    viewMode,
    requireCompleteRounds,
    invalidRoundIndexes = [],
} = {}) =>
    viewMode === "text" &&
    Boolean(requireCompleteRounds) &&
    invalidRoundIndexes.length > 0;
