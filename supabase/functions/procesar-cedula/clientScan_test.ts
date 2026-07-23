import { normalizeClientOcr } from "../_shared/documentOcr.ts";
import { validateClientCedulaScan } from "./clientScan.ts";

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const context = {
  teams: [{ side: "local" as const, name: "Tigres Norte", players: ["Ana Perez"] }, {
    side: "visitor" as const,
    name: "Real Sur",
    players: ["Maria Lopez"],
  }],
};

const validScan = {
  complete: true,
  playersComplete: true,
  teamBlocks: [{
    block: "first",
    name: "Tigres Norte",
    score: 3,
    penaltyScore: 0,
    players: [{ name: "Ana Perez", goals: 2, ownGoals: 0, yellowCards: 1, redCards: 0 }],
  }, {
    block: "second",
    name: "Real Sur",
    score: 1,
    penaltyScore: 0,
    players: [{ name: "Maria Lopez", goals: 1, ownGoals: 0, yellowCards: 0, redCards: 0 }],
  }],
  referee: "Arbitro Uno",
  date: "2026-07-22",
  time: "19:30",
  observations: "",
  walkover: { detected: false, absentTeamBlock: "none", evidence: "" },
};

Deno.test("acepta una cedula cliente explicita, completa y exacta", () => {
  const ocr = normalizeClientOcr({ text: "cedula", confidence: 0.96, scan: validScan });
  const validated = validateClientCedulaScan(ocr, context);
  assert(validated, "La lectura exacta debe evitar Gemini.");
  assert(validated?.rawScan.teamBlocks[0].name === "Tigres Norte", "Conserva el equipo canonico.");
  assert(validated?.rawScan.teamBlocks[0].players[0].name === "Ana Perez", "Conserva el jugador canonico.");
});

Deno.test("rechaza lecturas incompletas, dudosas o con nombres ajenos", () => {
  const incomplete = normalizeClientOcr({
    text: "cedula",
    confidence: 0.96,
    scan: { ...validScan, playersComplete: false },
  });
  assert(!validateClientCedulaScan(incomplete, context), "Exige cobertura explicita de jugadores.");

  const lowConfidence = normalizeClientOcr({ text: "cedula", confidence: 0.7, scan: validScan });
  assert(!validateClientCedulaScan(lowConfidence, context), "Rechaza confianza baja.");

  const foreign = normalizeClientOcr({
    text: "cedula",
    confidence: 0.96,
    scan: {
      ...validScan,
      teamBlocks: [
        { ...validScan.teamBlocks[0], name: "Equipo ajeno" },
        validScan.teamBlocks[1],
      ],
    },
  });
  assert(!validateClientCedulaScan(foreign, context), "No fuerza equipos ajenos al partido.");
});

Deno.test("un walkover cliente exige bloque y equipo ausente inequivocos", () => {
  const unknownAbsentTeam = normalizeClientOcr({
    text: "W.O.",
    confidence: 0.96,
    scan: {
      ...validScan,
      walkover: {
        detected: true,
        absentTeamBlock: "unknown",
        absentTeamName: "Real Sur",
        evidence: "W.O.",
      },
    },
  });
  assert(!validateClientCedulaScan(unknownAbsentTeam, context), "No acepta un ausente desconocido.");

  const wrongAbsentTeam = normalizeClientOcr({
    text: "W.O.",
    confidence: 0.96,
    scan: {
      ...validScan,
      walkover: {
        detected: true,
        absentTeamBlock: "first",
        absentTeamName: "Real Sur",
        evidence: "W.O.",
      },
    },
  });
  assert(!validateClientCedulaScan(wrongAbsentTeam, context), "El nombre debe corresponder al bloque ausente.");

  const exactAbsentTeam = normalizeClientOcr({
    text: "W.O.",
    confidence: 0.96,
    scan: {
      ...validScan,
      walkover: {
        detected: true,
        absentTeamBlock: "first",
        absentTeamName: "Tigres Norte",
        evidence: "W.O.",
      },
    },
  });
  const validated = validateClientCedulaScan(exactAbsentTeam, context);
  assert(validated?.rawScan.walkover.absentTeamName === "Tigres Norte", "Conserva el nombre canonico.");
});
