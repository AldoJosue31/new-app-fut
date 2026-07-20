const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const normalizeScannedDate = (value) => {
    const candidate = String(value || "").trim();
    const match = candidate.match(ISO_DATE_PATTERN);
    if (!match) return "";

    const [, year, month, day] = match;
    const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    if (
        parsed.getUTCFullYear() !== Number(year) ||
        parsed.getUTCMonth() !== Number(month) - 1 ||
        parsed.getUTCDate() !== Number(day)
    ) {
        return "";
    }

    return candidate;
};

export const normalizeScannedTime = (value) => {
    const candidate = String(value || "").trim();
    const match = candidate.match(TIME_PATTERN);
    return match ? `${match[1]}:${match[2]}` : "";
};

export const hasCompleteScannedSchedule = (match) =>
    Boolean(
        normalizeScannedDate(match?.scannedDate ?? match?.date) &&
        normalizeScannedTime(match?.scannedTime ?? match?.time)
    );

export const buildScannedMatchTimestamp = (match) => {
    const date = normalizeScannedDate(match?.scannedDate ?? match?.date);
    const time = normalizeScannedTime(match?.scannedTime ?? match?.time);
    return date && time ? `${date} ${time}:00` : null;
};

export const persistedDateTimeKey = (value) => {
    const match = String(value || "").match(
        /(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})(?::\d{2})?/
    );
    if (!match) return "";
    const date = normalizeScannedDate(match[1]);
    const time = normalizeScannedTime(match[2]);
    return date && time ? `${date} ${time}:00` : "";
};
