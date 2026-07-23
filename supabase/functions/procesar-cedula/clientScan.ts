import type { DocumentOcrResult } from "../_shared/documentOcr.ts";

type ScanContextTeam = {
  side: "local" | "visitor";
  name: string;
  players: string[];
};

type ScanContext = { teams: ScanContextTeam[] };

type RawPlayer = Record<string, unknown>;

export type ValidatedClientCedulaScan = {
  rawScan: {
    teamBlocks: Array<{
      block: "first" | "second";
      name: string;
      score: number;
      penaltyScore: number;
      players: RawPlayer[];
    }>;
    referee: string;
    date: string;
    time: string;
    observations: string;
    walkover: {
      detected: boolean;
      absentTeamBlock: "first" | "second" | "both" | "unknown" | "none";
      absentTeamName: string;
      evidence: string;
    };
  };
  confidence: number;
};

const cleanText = (value: unknown, maxLength = 100) =>
  String(value || "")
    .replace(/[\u0000-\u001f<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

const comparable = (value: unknown) =>
  cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const boundedCount = (value: unknown, maximum = 99) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= maximum
    ? parsed
    : null;
};

const validDate = (value: unknown) => {
  const text = cleanText(value, 10);
  const match = text.match(/^(20\d{2})-(\d{2})-(\d{2})$/);
  if (!match) return "";
  const date = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) &&
      date.getUTCFullYear() === Number(match[1]) &&
      date.getUTCMonth() + 1 === Number(match[2]) &&
      date.getUTCDate() === Number(match[3])
    ? text
    : "";
};

const validTime = (value: unknown) => {
  const text = cleanText(value, 5);
  const match = text.match(/^(\d{2}):(\d{2})$/);
  return match && Number(match[1]) <= 23 && Number(match[2]) <= 59 ? text : "";
};

const exactTeam = (value: unknown, teams: ScanContextTeam[]) => {
  const key = comparable(value);
  const matches = teams.filter((team) => comparable(team.name) === key);
  return matches.length === 1 ? matches[0] : null;
};

const normalizePlayer = (
  value: unknown,
  team: ScanContextTeam,
): RawPlayer | null => {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const playerKey = comparable(raw.name);
  const registered = team.players.filter((name) => comparable(name) === playerKey);
  if (!playerKey || registered.length !== 1) return null;
  const goals = boundedCount(raw.goals, 20);
  const ownGoals = boundedCount(raw.ownGoals, 20);
  const yellowCards = boundedCount(raw.yellowCards, 5);
  const redCards = boundedCount(raw.redCards, 2);
  if ([goals, ownGoals, yellowCards, redCards].some((count) => count === null)) {
    return null;
  }
  return {
    name: registered[0],
    goals,
    ownGoals,
    yellowCards,
    redCards,
  };
};

/**
 * Sólo acepta una cédula ya estructurada cuando el OCR cliente declara que
 * revisó documento y jugadores completos. Los nombres deben coincidir
 * exactamente con el contexto cerrado; ante cualquier duda se usa Gemini.
 */
export const validateClientCedulaScan = (
  ocr: DocumentOcrResult | null,
  context: ScanContext,
): ValidatedClientCedulaScan | null => {
  if (ocr?.provider !== "client" || ocr.confidence < 0.9) return null;
  const structured = ocr.structuredScan;
  if (!structured || typeof structured !== "object" || Array.isArray(structured)) return null;
  const raw = structured as Record<string, unknown>;
  if (raw.complete !== true || raw.playersComplete !== true) return null;
  if (context.teams.length !== 2) return null;
  const rawBlocks = Array.isArray(raw.teamBlocks) ? raw.teamBlocks : [];
  if (rawBlocks.length !== 2) return null;

  const blocks = rawBlocks.map((value, index) => {
    if (!value || typeof value !== "object") return null;
    const block = value as Record<string, unknown>;
    const expectedBlock = index === 0 ? "first" : "second";
    if (block.block !== expectedBlock) return null;
    const team = exactTeam(block.name, context.teams);
    const score = Object.hasOwn(block, "score") ? boundedCount(block.score) : null;
    const penaltyScore = block.penaltyScore === undefined
      ? 0
      : boundedCount(block.penaltyScore, 30);
    if (!team || score === null || penaltyScore === null) return null;
    const rawPlayers = Array.isArray(block.players) ? block.players : [];
    const players = rawPlayers.map((player) => normalizePlayer(player, team));
    if (players.some((player) => !player)) return null;
    return {
      block: expectedBlock as "first" | "second",
      name: team.name,
      score,
      penaltyScore,
      players: players as RawPlayer[],
      team,
    };
  });
  if (blocks.some((block) => !block)) return null;
  const [first, second] = blocks as Array<NonNullable<(typeof blocks)[number]>>;
  if (first.team.side === second.team.side) return null;

  const rawWalkover = raw.walkover && typeof raw.walkover === "object"
    ? raw.walkover as Record<string, unknown>
    : {};
  const detected = rawWalkover.detected === true;
  const absentTeamBlock = String(rawWalkover.absentTeamBlock || "none");
  if (!["first", "second", "both", "unknown", "none"].includes(absentTeamBlock)) return null;
  const evidence = cleanText(rawWalkover.evidence, 240);
  let absentTeamName = "";
  if (detected && !/(?:no\s+se\s+present|inasistencia|w\.?\s*o\.?|default|no\s+lleg)/i.test(evidence)) {
    return null;
  }
  if (detected) {
    if (absentTeamBlock !== "first" && absentTeamBlock !== "second") return null;
    const expectedAbsentTeam = absentTeamBlock === "first" ? first.team : second.team;
    const declaredAbsentTeam = exactTeam(rawWalkover.absentTeamName, context.teams);
    if (!declaredAbsentTeam || declaredAbsentTeam.side !== expectedAbsentTeam.side) return null;
    absentTeamName = expectedAbsentTeam.name;
  } else if (absentTeamBlock !== "none" || cleanText(rawWalkover.absentTeamName, 100)) {
    return null;
  }

  return {
    rawScan: {
      teamBlocks: [
        {
          block: first.block,
          name: first.name,
          score: first.score,
          penaltyScore: first.penaltyScore,
          players: first.players,
        },
        {
          block: second.block,
          name: second.name,
          score: second.score,
          penaltyScore: second.penaltyScore,
          players: second.players,
        },
      ],
      referee: cleanText(raw.referee, 120),
      date: validDate(raw.date),
      time: validTime(raw.time),
      observations: cleanText(raw.observations, 500),
      walkover: {
        detected,
        absentTeamBlock: absentTeamBlock as ValidatedClientCedulaScan["rawScan"]["walkover"]["absentTeamBlock"],
        absentTeamName,
        evidence,
      },
    },
    confidence: ocr.confidence,
  };
};
