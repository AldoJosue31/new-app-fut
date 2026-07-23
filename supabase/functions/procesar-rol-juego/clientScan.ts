import {
  type DocumentOcrResult,
  normalizeOcrConfidence,
} from "../_shared/documentOcr.ts";
import {
  type RawScheduleEntry,
  type RawScheduleScan,
  type RegisteredTeam,
  selectScheduleForDivision,
} from "./matching.ts";

type SelectionContext = {
  divisionName: string;
  roundTitle: string;
  roundStartDate?: string;
  roundEndDate?: string;
  teams: RegisteredTeam[];
};

const cleanText = (value: unknown, maxLength = 100) =>
  String(value || "")
    .replace(/[\u0000-\u001f<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

const normalizeEntry = (value: unknown): RawScheduleEntry | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entry = value as Record<string, unknown>;
  const normalized = {
    divisionLabel: cleanText(entry.divisionLabel),
    roundLabel: cleanText(entry.roundLabel),
    scheduleLabel: cleanText(entry.scheduleLabel, 300),
    scheduleRangeLabel: cleanText(entry.scheduleRangeLabel, 240),
    dateLabel: cleanText(entry.dateLabel),
    weekdayLabel: cleanText(entry.weekdayLabel),
    timeLabel: cleanText(entry.timeLabel),
    localTeam: cleanText(entry.localTeam),
    visitorTeam: cleanText(entry.visitorTeam),
    byeTeam: cleanText(entry.byeTeam),
  };
  return normalized.localTeam || normalized.visitorTeam || normalized.byeTeam
    ? normalized
    : null;
};

type NormalizedClientScheduleScan = RawScheduleScan & {
  complete: true;
  noSharedSourceLines: true;
  minimumPairConfidence: number;
};

export const normalizeClientScheduleScan = (
  value: unknown,
): NormalizedClientScheduleScan | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (raw.complete !== true || raw.noSharedSourceLines !== true) return null;
  const minimumPairConfidence = normalizeOcrConfidence(raw.minimumPairConfidence);
  if (!minimumPairConfidence) return null;
  const entries = (Array.isArray(raw.entries) ? raw.entries : [])
    .slice(0, 100)
    .map(normalizeEntry)
    .filter((entry): entry is RawScheduleEntry => Boolean(entry));
  return entries.length
    ? { entries, complete: true, noSharedSourceLines: true, minimumPairConfidence }
    : null;
};

/** El resultado local sólo se acepta si cubre toda la división objetivo. */
export const validateClientScheduleScan = (
  ocr: DocumentOcrResult | null,
  context: SelectionContext,
  minimumConfidence = 0.76,
) => {
  if (ocr?.provider !== "client" || ocr.confidence < minimumConfidence) return null;
  const rawScan = normalizeClientScheduleScan(ocr.structuredScan);
  if (
    !rawScan ||
    rawScan.minimumPairConfidence < minimumConfidence ||
    context.teams.length < 2
  ) return null;
  const scan = selectScheduleForDivision(rawScan, context);
  return scan.complete ? { scan, confidence: ocr.confidence } : null;
};
