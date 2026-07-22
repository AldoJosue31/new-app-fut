import { normalizeClientOcr } from "../_shared/documentOcr.ts";
import { validateClientScheduleScan } from "./clientScan.ts";

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const context = {
  divisionName: "Segunda",
  roundTitle: "Jornada 2",
  roundStartDate: "2026-07-20",
  roundEndDate: "2026-07-25",
  teams: [
    { id: "a", name: "Tigres Norte" },
    { id: "b", name: "Real Sur" },
    { id: "c", name: "Union Centro" },
    { id: "d", name: "Atletico Valle" },
  ],
};

Deno.test("acepta rol local completo tras revalidar participantes", () => {
  const ocr = normalizeClientOcr({
    text: "Jornada 2",
    confidence: 0.91,
    scan: {
      complete: true,
      noSharedSourceLines: true,
      minimumPairConfidence: 0.84,
      entries: [{
        divisionLabel: "Segunda",
        roundLabel: "Jornada 2",
        weekdayLabel: "LUNES",
        timeLabel: "7:00 PM",
        localTeam: "Tigres Norte",
        visitorTeam: "Real Sur",
      }, {
        divisionLabel: "Segunda",
        roundLabel: "Jornada 2",
        weekdayLabel: "MARTES",
        timeLabel: "8:00 PM",
        localTeam: "Union Centro",
        visitorTeam: "Atletico Valle",
      }],
    },
  });
  const validated = validateClientScheduleScan(ocr, context);
  assert(validated?.scan.complete, "Debe cubrir los cuatro participantes.");
  assert(validated?.scan.matches.length === 2, "Debe conservar dos cruces.");
});

Deno.test("rol parcial o con equipos ajenos cae a Gemini", () => {
  const ocr = normalizeClientOcr({
    text: "Jornada 2",
    confidence: 0.91,
    scan: {
      complete: true,
      noSharedSourceLines: true,
      minimumPairConfidence: 0.84,
      entries: [{
        divisionLabel: "Otra",
        roundLabel: "Jornada 2",
        localTeam: "Equipo ajeno",
        visitorTeam: "Real Sur",
      }],
    },
  });
  assert(!validateClientScheduleScan(ocr, context), "No debe aceptar cobertura parcial ni equipos ajenos.");
});

Deno.test("cobertura total declarada incompleta nunca evita Gemini", () => {
  const ocr = normalizeClientOcr({
    text: "Jornada 2",
    confidence: 0.95,
    scan: {
      complete: false,
      noSharedSourceLines: true,
      minimumPairConfidence: 0.9,
      entries: [{ localTeam: "Tigres Norte", visitorTeam: "Real Sur" }, {
        localTeam: "Union Centro",
        visitorTeam: "Atletico Valle",
      }],
    },
  });
  assert(
    !validateClientScheduleScan(ocr, context),
    "La cobertura determinista no debe sobreescribir la decision de baja confianza del parser local.",
  );
});
