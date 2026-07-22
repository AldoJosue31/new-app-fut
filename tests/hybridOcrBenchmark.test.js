import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateHybridOcrSamples,
  normalizeBenchmarkValue,
  parseBenchmarkDataset,
} from "../scripts/benchmark-hybrid-ocr.mjs";

test("normaliza texto sin ocultar diferencias numericas", () => {
  assert.equal(normalizeBenchmarkValue("  Atlético   Nacional "), "atletico nacional");
  assert.equal(normalizeBenchmarkValue(3), 3);
  assert.notEqual(normalizeBenchmarkValue(3), normalizeBenchmarkValue(9));
});

test("mide campos, colecciones sin importar orden y uso de fallback", () => {
  const report = evaluateHybridOcrSamples([
    {
      id: "rol-1",
      type: "rol",
      expected: {
        byeTeamId: "e",
        matches: [
          { localTeamId: "a", visitorTeamId: "b" },
          { localTeamId: "c", visitorTeamId: "d" },
        ],
      },
      actual: {
        byeTeamId: "E",
        matches: [
          { localTeamId: "c", visitorTeamId: "d", date: "2026-07-07", time: "20:00" },
          { localTeamId: "a", visitorTeamId: "b", date: "2026-07-06", time: "19:00" },
        ],
      },
      meta: { provider: "client", fallbackUsed: false, durationMs: 100 },
    },
    {
      id: "cedula-1",
      type: "cedula",
      expected: { localTeam: { score: 3 }, visitorTeam: { score: 1 }, players: [] },
      actual: { localTeam: { score: 9 }, visitorTeam: { score: 1 }, players: [] },
      meta: {
        provider: "gemini",
        ocrProvider: "google-vision",
        fallbackUsed: true,
        durationMs: 900,
      },
    },
  ]);

  assert.equal(report.overall.successRate, 1);
  assert.equal(report.overall.exactDocumentRate, 0.5);
  assert.equal(report.overall.fieldAccuracy, 0.6667);
  assert.equal(report.overall.collectionF1, 1);
  assert.equal(report.overall.fallbackRate, 0.5);
  assert.deepEqual(report.overall.providerCounts, { client: 1, gemini: 1 });
  assert.deepEqual(report.overall.pipelineCounts, { client: 1, "google-vision->gemini": 1 });
  assert.deepEqual(report.overall.latencyMs, { p50: 100, p95: 900 });
});

test("una lectura fallida cuenta como documento no exacto", () => {
  const report = evaluateHybridOcrSamples([
    {
      id: "cedula-fallida",
      type: "cedula",
      expected: { localTeam: { score: 2 }, visitorTeam: { score: 0 } },
      actual: null,
      meta: { provider: "google-vision", fallbackUsed: false, durationMs: 45000 },
    },
  ]);

  assert.equal(report.overall.successRate, 0);
  assert.equal(report.overall.exactDocumentRate, 0);
  assert.equal(report.overall.fieldAccuracy, 0);
});

test("acepta datasets JSON y JSONL e informa la linea invalida", () => {
  const sample = { type: "rol", expected: {}, actual: {} };
  assert.deepEqual(parseBenchmarkDataset(JSON.stringify([sample])), [sample]);
  assert.deepEqual(parseBenchmarkDataset(`${JSON.stringify(sample)}\n${JSON.stringify(sample)}`), [sample, sample]);
  assert.throws(
    () => parseBenchmarkDataset(`${JSON.stringify(sample)}\n{`, "casos.jsonl"),
    /casos\.jsonl:2/,
  );
});
