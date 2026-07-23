export type RawScheduleFields = {
  scheduleLabel?: unknown;
  scheduleRangeLabel?: unknown;
  dateLabel?: unknown;
  weekdayLabel?: unknown;
  timeLabel?: unknown;
};

export type ScheduleContext = {
  roundStartDate?: unknown;
  roundEndDate?: unknown;
};

type CalendarDate = {
  year: number;
  month: number;
  day: number;
};

type DateRange = {
  start: CalendarDate;
  end: CalendarDate;
};

const DAY_MS = 86_400_000;

const MONTHS = new Map<string, number>([
  ["enero", 1],
  ["ene", 1],
  ["febrero", 2],
  ["feb", 2],
  ["marzo", 3],
  ["mar", 3],
  ["abril", 4],
  ["abr", 4],
  ["mayo", 5],
  ["may", 5],
  ["junio", 6],
  ["jun", 6],
  ["julio", 7],
  ["jul", 7],
  ["agosto", 8],
  ["ago", 8],
  ["septiembre", 9],
  ["setiembre", 9],
  ["sept", 9],
  ["sep", 9],
  ["octubre", 10],
  ["oct", 10],
  ["noviembre", 11],
  ["nov", 11],
  ["diciembre", 12],
  ["dic", 12],
]);

const WEEKDAYS = new Map<string, number>([
  ["domingo", 0],
  ["lunes", 1],
  ["martes", 2],
  ["miercoles", 3],
  ["jueves", 4],
  ["viernes", 5],
  ["sabado", 6],
]);

const MONTH_PATTERN = [...MONTHS.keys()]
  .sort((left, right) => right.length - left.length)
  .join("|");

const cleanText = (value: unknown, maxLength = 180) =>
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

const comparableText = (value: unknown) =>
  cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const normalizeYear = (value: unknown) => {
  const year = Number(value);
  if (!Number.isInteger(year)) return 0;
  if (year >= 0 && year <= 99) return 2000 + year;
  return year;
};

const daysInMonth = (year: number, month: number) =>
  new Date(Date.UTC(year, month, 0)).getUTCDate();

const isCalendarDate = (date: CalendarDate | null): date is CalendarDate =>
  Boolean(
    date &&
      Number.isInteger(date.year) &&
      date.year >= 2000 &&
      date.year <= 2100 &&
      Number.isInteger(date.month) &&
      date.month >= 1 &&
      date.month <= 12 &&
      Number.isInteger(date.day) &&
      date.day >= 1 &&
      date.day <= daysInMonth(date.year, date.month),
  );

const epochDay = (date: CalendarDate) =>
  Math.floor(Date.UTC(date.year, date.month - 1, date.day) / DAY_MS);

const dateFromEpochDay = (value: number): CalendarDate => {
  const date = new Date(value * DAY_MS);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
};

const formatDate = (date: CalendarDate | null) =>
  isCalendarDate(date)
    ? `${date.year}-${String(date.month).padStart(2, "0")}-${
      String(date.day).padStart(2, "0")
    }`
    : "";

const parseIsoDate = (value: unknown): CalendarDate | null => {
  const match = comparableText(value).match(
    /(?:^|\D)(20\d{2})-(\d{1,2})-(\d{1,2})(?:\D|$)/,
  );
  if (!match) return null;
  const date = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
  return isCalendarDate(date) ? date : null;
};

const parseNumericDate = (value: unknown): CalendarDate | null => {
  const match = comparableText(value).match(
    /(?:^|\D)(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})(?:\D|$)/,
  );
  if (!match) return null;
  const date = {
    year: normalizeYear(match[3]),
    month: Number(match[2]),
    day: Number(match[1]),
  };
  return isCalendarDate(date) ? date : null;
};

type PartialWordDate = {
  day: number;
  month: number;
  year: number;
  index: number;
  end: number;
};

const extractWordDates = (value: unknown) => {
  const normalized = comparableText(value);
  const regex = new RegExp(
    `\\b(\\d{1,2})\\s*(?:de\\s*)?(${MONTH_PATTERN})(?:\\s*(?:de\\s*)?(\\d{2,4}))?\\b`,
    "g",
  );
  const dates: PartialWordDate[] = [];
  let match;
  while ((match = regex.exec(normalized)) !== null) {
    dates.push({
      day: Number(match[1]),
      month: MONTHS.get(match[2]) || 0,
      year: match[3] ? normalizeYear(match[3]) : 0,
      index: match.index,
      end: regex.lastIndex,
    });
  }
  return { normalized, dates };
};

const inferMissingRangeYears = (dates: PartialWordDate[]) => {
  const resolved = dates.map((date) => ({ ...date }));
  const knownIndexes = resolved
    .map((date, index) => date.year ? index : -1)
    .filter((index) => index >= 0);
  if (!knownIndexes.length) return resolved;

  resolved.forEach((date, index) => {
    if (date.year) return;
    const nearestIndex = knownIndexes.reduce((nearest, candidate) =>
      Math.abs(candidate - index) < Math.abs(nearest - index)
        ? candidate
        : nearest
    );
    const reference = resolved[nearestIndex];
    date.year = reference.year;
    if (index < nearestIndex && date.month > reference.month) date.year -= 1;
    if (index > nearestIndex && date.month < reference.month) date.year += 1;
  });
  return resolved;
};

const extractFullNumericDates = (value: unknown) => {
  const normalized = comparableText(value);
  const results: Array<CalendarDate & { index: number }> = [];
  const patterns = [
    {
      regex: /\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/g,
      build: (match: RegExpExecArray) => ({
        year: Number(match[1]),
        month: Number(match[2]),
        day: Number(match[3]),
      }),
    },
    {
      regex: /\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/g,
      build: (match: RegExpExecArray) => ({
        year: normalizeYear(match[3]),
        month: Number(match[2]),
        day: Number(match[1]),
      }),
    },
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.regex.exec(normalized)) !== null) {
      const date = pattern.build(match);
      if (isCalendarDate(date)) results.push({ ...date, index: match.index });
    }
  }

  const deduped = new Map<string, CalendarDate & { index: number }>();
  results.sort((left, right) => left.index - right.index).forEach((date) => {
    const key = `${date.index}:${formatDate(date)}`;
    if (!deduped.has(key)) deduped.set(key, date);
  });
  return [...deduped.values()];
};

const validRange = (
  start: CalendarDate,
  end: CalendarDate,
): DateRange | null => {
  if (!isCalendarDate(start) || !isCalendarDate(end)) return null;
  const duration = epochDay(end) - epochDay(start);
  if (duration < 0 || duration > 31) return null;
  return { start, end };
};

export const parseSpanishDateRange = (value: unknown): DateRange | null => {
  const numericDates = extractFullNumericDates(value);
  if (numericDates.length >= 2) {
    return validRange(numericDates[0], numericDates[numericDates.length - 1]);
  }

  const extracted = extractWordDates(value);
  let wordDates = inferMissingRangeYears(extracted.dates);
  if (wordDates.length === 1 && wordDates[0].year) {
    const prefix = extracted.normalized.slice(0, wordDates[0].index);
    const firstDayMatch = prefix.match(
      /(?:^|\s)(\d{1,2})\s*(?:al|a|-)\s*(?:[a-z]+\s*)?$/,
    );
    if (firstDayMatch) {
      wordDates = [{
        ...wordDates[0],
        day: Number(firstDayMatch[1]),
        index: Math.max(0, prefix.lastIndexOf(firstDayMatch[1])),
      }, wordDates[0]];
    }
  }

  if (wordDates.length < 2) return null;
  const start = wordDates[0];
  const end = wordDates[wordDates.length - 1];
  return validRange(start, end);
};

const parseContextRange = (context: ScheduleContext): DateRange | null => {
  const start = parseIsoDate(context.roundStartDate);
  const end = parseIsoDate(context.roundEndDate);
  return start && end ? validRange(start, end) : null;
};

const dateInsideRange = (date: CalendarDate, range: DateRange) => {
  const day = epochDay(date);
  return day >= epochDay(range.start) && day <= epochDay(range.end);
};

const findUniqueDateInRange = (
  range: DateRange,
  predicate: (date: CalendarDate) => boolean,
) => {
  const matches: CalendarDate[] = [];
  for (let day = epochDay(range.start); day <= epochDay(range.end); day += 1) {
    const date = dateFromEpochDay(day);
    if (predicate(date)) matches.push(date);
  }
  return matches.length === 1 ? matches[0] : null;
};

const parseWeekday = (...values: unknown[]) => {
  for (const value of values) {
    const normalized = comparableText(value);
    for (const [label, weekday] of WEEKDAYS) {
      if (new RegExp(`\\b${label}\\b`).test(normalized)) return weekday;
    }
  }
  return null;
};

const resolveExplicitDate = (value: unknown, range: DateRange | null) => {
  const direct = parseIsoDate(value) || parseNumericDate(value);
  if (direct) return direct;

  const extracted = extractWordDates(value).dates[0];
  if (extracted) {
    if (extracted.year) {
      const date = {
        year: extracted.year,
        month: extracted.month,
        day: extracted.day,
      };
      return isCalendarDate(date) ? date : null;
    }
    if (range) {
      return findUniqueDateInRange(
        range,
        (date) => date.month === extracted.month && date.day === extracted.day,
      );
    }
  }

  if (range) {
    const normalized = comparableText(value);
    const dayOnly = normalized.match(/(?:^|\D)(\d{1,2})(?:\D|$)/);
    if (dayOnly) {
      const day = Number(dayOnly[1]);
      return findUniqueDateInRange(range, (date) => date.day === day);
    }
  }
  return null;
};

export const normalizeScheduleTime = (value: unknown) => {
  const normalized = comparableText(value)
    .replace(/a\s*\.?\s*m\.?/g, "am")
    .replace(/p\s*\.?\s*m\.?/g, "pm")
    .replace(/(\d)\.(\d{2})/g, "$1:$2")
    .replace(/\b(horas?|hrs?)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const match = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!match) return "";

  let hour = Number(match[1]);
  const minute = match[2] === undefined ? 0 : Number(match[2]);
  const meridiem = match[3] || "";
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return "";

  if (meridiem) {
    if (hour < 1 || hour > 12) return "";
    if (hour === 12) hour = 0;
    if (meridiem === "pm") hour += 12;
  } else if (hour < 0 || hour > 23) {
    return "";
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

const extractTimeLabel = (value: unknown) => {
  const candidate = cleanText(value);
  const match = candidate.match(
    /\b\d{1,2}(?::|\.)\d{2}\s*(?:[ap]\s*\.?\s*m\.?|hrs?|horas?)?\b/i,
  );
  return match?.[0] || "";
};

export const normalizeMatchSchedule = (
  raw: RawScheduleFields,
  context: ScheduleContext = {},
) => {
  const scheduleLabel = cleanText(raw?.scheduleLabel, 300);
  const scheduleParts = scheduleLabel.split("|").map((part) => part.trim())
    .filter(Boolean);
  const compactDateLabel = scheduleParts.length >= 3
    ? scheduleParts.slice(0, -2).join(" | ")
    : scheduleParts[0] || "";
  const compactWeekdayLabel = scheduleParts.length >= 3
    ? scheduleParts[scheduleParts.length - 2]
    : compactDateLabel;
  const rangeLabel = cleanText(
    raw?.scheduleRangeLabel || compactDateLabel,
    300,
  );
  const explicitDateLabel = cleanText(
    raw?.dateLabel ||
      (parseSpanishDateRange(compactDateLabel) ? "" : compactDateLabel),
  );
  const dateLabel = explicitDateLabel || scheduleLabel;
  const weekdayLabel = cleanText(raw?.weekdayLabel || compactWeekdayLabel);
  const timeLabel = cleanText(
    raw?.timeLabel || extractTimeLabel(scheduleLabel),
  );
  const imageRange = parseSpanishDateRange(rangeLabel);
  const contextRange = parseContextRange(context);
  const referenceRange = imageRange || contextRange;
  const weekday = parseWeekday(weekdayLabel, dateLabel);

  let date = resolveExplicitDate(explicitDateLabel, referenceRange);
  let dateSource = date ? "explicit" : "";

  if (!date && weekday !== null && imageRange) {
    date = findUniqueDateInRange(
      imageRange,
      (candidate) =>
        new Date(Date.UTC(candidate.year, candidate.month - 1, candidate.day))
          .getUTCDay() === weekday,
    );
    if (date) dateSource = "image-range-weekday";
  }
  if (!date && weekday !== null && contextRange) {
    date = findUniqueDateInRange(
      contextRange,
      (candidate) =>
        new Date(Date.UTC(candidate.year, candidate.month - 1, candidate.day))
          .getUTCDay() === weekday,
    );
    if (date) dateSource = "round-context-weekday";
  }

  if (
    date &&
    ((imageRange && !dateInsideRange(date, imageRange)) ||
      (weekday !== null &&
        new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay() !==
          weekday))
  ) {
    date = null;
    dateSource = "";
  }

  const normalizedDate = formatDate(date);
  const time = normalizeScheduleTime(timeLabel);
  return {
    date: normalizedDate,
    time,
    dateTimeDetected: Boolean(normalizedDate && time),
    rawSchedule: {
      rangeLabel,
      dateLabel,
      weekdayLabel,
      timeLabel,
      dateSource,
    },
  };
};
