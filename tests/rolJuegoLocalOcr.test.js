import assert from "node:assert/strict";
import test from "node:test";
import {
    buildRoleScanFromOcr,
    normalizePaddleOcrResult,
} from "../src/utils/rolJuegoLocalOcr.js";

const box = (x, y, width, height) => [
    [x, y],
    [x + width, y],
    [x + width, y + height],
    [x, y + height],
];

const teams = [
    { id: "1", name: "Tigres" },
    { id: "2", name: "Leones" },
    { id: "3", name: "Halcones" },
    { id: "4", name: "Pumas" },
];

const context = {
    divisionName: "Primera A",
    roundTitle: "Jornada 1",
    roundStartDate: "2026-07-06",
    roundEndDate: "2026-07-12",
    teams,
};

test("normaliza lineas, confianza y cajas de PaddleOCR", () => {
    const normalized = normalizePaddleOcrResult({
        image: { width: 400, height: 200 },
        items: [
            { text: " Tigres   vs Leones ", score: 0.9, poly: box(100, 50, 120, 20) },
            { text: "", score: 0.99, poly: box(0, 0, 10, 10) },
            { text: "ruido", score: 0.1, poly: box(0, 0, 10, 10) },
        ],
    });

    assert.equal(normalized.lines.length, 1);
    assert.equal(normalized.lines[0].text, "Tigres vs Leones");
    assert.deepEqual(normalized.lines[0].boundingBox, { x: 100, y: 50, width: 120, height: 20 });
    assert.equal(normalized.confidence, 0.9);
});

test("resuelve una jornada completa localmente y conserva fecha/hora", () => {
    const normalized = normalizePaddleOcrResult({
        image: { width: 500, height: 300 },
        items: [
            { text: "LUNES", score: 0.99, poly: box(90, 20, 70, 18) },
            { text: "MARTES", score: 0.99, poly: box(300, 20, 80, 18) },
            { text: "6:00 PM", score: 0.99, poly: box(8, 100, 60, 18) },
            { text: "Tigres vs Leones", score: 0.97, poly: box(80, 100, 120, 20) },
            { text: "Halcones vs Pumas", score: 0.98, poly: box(280, 100, 150, 20) },
        ],
    });
    const result = buildRoleScanFromOcr(normalized, context);

    assert.equal(result.complete, true);
    assert.equal(result.scan.matches.length, 2);
    assert.deepEqual(
        result.scan.matches.map((match) => [match.localTeamId, match.visitorTeamId]),
        [["1", "2"], ["3", "4"]],
    );
    assert.equal(result.scan.matches[0].date, "2026-07-06");
    assert.equal(result.scan.matches[0].time, "18:00");
    assert.equal(result.scan.matches[1].date, "2026-07-07");
    assert.equal(result.clientOcr.scan.entries.length, 2);
    assert.equal(result.clientOcr.scan.complete, true);
    assert.equal(result.clientOcr.scan.noSharedSourceLines, true);
    assert.ok(result.clientOcr.scan.minimumPairConfidence >= 0.76);
    assert.deepEqual(result.clientOcr.lines[0].boundingBox, {
        x: 0.18,
        y: 20 / 300,
        width: 0.14,
        height: 0.06,
    });
});

test("empareja nombres fragmentados por geometria sin inventar equipos", () => {
    const normalized = normalizePaddleOcrResult({
        image: { width: 500, height: 300 },
        items: [
            { text: "Tigres", score: 0.98, poly: box(90, 100, 60, 14) },
            { text: "Leones", score: 0.98, poly: box(92, 110, 65, 14) },
            { text: "Halcones", score: 0.98, poly: box(310, 100, 80, 14) },
            { text: "Pumas", score: 0.98, poly: box(315, 110, 60, 14) },
        ],
    });
    const result = buildRoleScanFromOcr(normalized, context);

    assert.equal(result.complete, true);
    assert.equal(result.scan.matches.length, 2);
    assert.deepEqual(new Set(result.scan.matches.flatMap((match) => [
        match.localTeamId,
        match.visitorTeamId,
    ])), new Set(["1", "2", "3", "4"]));
});

test("un resultado incompleto queda como pista y exige el respaldo remoto", () => {
    const normalized = normalizePaddleOcrResult({
        image: { width: 500, height: 300 },
        items: [
            { text: "Tigres vs Leones", score: 0.97, poly: box(80, 100, 120, 20) },
        ],
    });
    const result = buildRoleScanFromOcr(normalized, context);

    assert.equal(result.complete, false);
    assert.equal(result.scan.matches.length, 1);
    assert.equal(result.clientOcr.scan.entries.length, 1);
});

test("no marca completa una estructura con todos los equipos pero baja confianza OCR", () => {
    const normalized = normalizePaddleOcrResult({
        image: { width: 500, height: 300 },
        items: [
            { text: "Tigres vs Leones", score: 0.3, poly: box(80, 100, 120, 20) },
            { text: "Halcones vs Pumas", score: 0.3, poly: box(280, 100, 150, 20) },
        ],
    });
    const result = buildRoleScanFromOcr(normalized, context);

    assert.equal(result.scan.matches.length, 2);
    assert.equal(result.complete, false);
    assert.equal(result.clientOcr.scan.complete, false);
    assert.equal(result.clientOcr.scan.noSharedSourceLines, true);
});

test("el ruido ajeno no reduce la confianza de cruces claros", () => {
    const normalized = normalizePaddleOcrResult({
        image: { width: 500, height: 300 },
        items: [
            { text: "Tigres vs Leones", score: 0.98, poly: box(80, 100, 120, 20) },
            { text: "Halcones vs Pumas", score: 0.98, poly: box(280, 100, 150, 20) },
            { text: "texto largo no relacionado con una jornada", score: 0.21, poly: box(20, 220, 420, 18) },
            { text: "otra linea extensa de ruido visual", score: 0.21, poly: box(20, 245, 420, 18) },
        ],
    });
    const result = buildRoleScanFromOcr(normalized, context);

    assert.equal(result.scan.matches.length, 2);
    assert.ok(normalized.confidence < 0.76);
    assert.equal(result.complete, true);
    assert.equal(result.clientOcr.scan.complete, true);
    assert.ok(result.clientOcr.confidence >= 0.76);
    assert.equal(result.diagnostics.reliablePairs, true);
    assert.equal(result.diagnostics.reliableOcr, true);
});
