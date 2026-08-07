import assert from "node:assert/strict";
import test from "node:test";
import {
  findBestScanMatch,
  getScannedTeamNameMismatches,
  getScannedDateReview,
  resolveScannedTeamSides,
  scanNameSimilarity,
} from "../src/utils/cedulaScanMatching.js";

const player = name => ({ id: name, name });

test("reconoce nombres aunque apellidos y nombre vengan invertidos", () => {
  assert.ok(scanNameSimilarity("Pérez, Juan Carlos", "Juan Carlos Perez") > 0.85);
});

test("acepta una equivalencia unica por palabras aunque exista otro candidato muy parecido", () => {
  const match = findBestScanMatch(
    "Zayago Emanuel",
    [player("Emanuel Zayago"), player("Emanue Zayago")],
    option => option.name,
  );

  assert.equal(match?.option.name, "Emanuel Zayago");
  assert.equal(match?.tokenExact, true);
});

test("no elige entre dos registros con el mismo nombre en distinto orden", () => {
  const match = findBestScanMatch(
    "Zayago Emanuel",
    [player("Emanuel Zayago"), player("Zayago Emanuel")],
    option => option.name,
  );

  assert.equal(match, null);
});

test("tolera sustituciones comunes del OCR", () => {
  const match = findBestScanMatch(
    "J0se ManueI Hernandes",
    [player("José Manuel Hernández"), player("Mario López")],
    option => option.name,
  );

  assert.equal(match?.option.name, "José Manuel Hernández");
});

test("ignora el dorsal escrito antes del nombre", () => {
  const match = findBestScanMatch(
    "10. José Manuel Hernández",
    [player("José Manuel Hernández"), player("Mario López")],
    option => option.name,
  );

  assert.equal(match?.option.name, "José Manuel Hernández");
});

test("acepta inicial y apellido cuando la coincidencia es unica", () => {
  const match = findBestScanMatch(
    "L. Hernández",
    [player("Luis Hernández"), player("Carlos Medina")],
    option => option.name,
  );

  assert.equal(match?.option.name, "Luis Hernández");
});

test("no elige automaticamente entre candidatos casi identicos", () => {
  const match = findBestScanMatch(
    "Juan Pere",
    [player("Juan Pérez"), player("Juan Peres")],
    option => option.name,
  );

  assert.equal(match, null);
});

test("resuelve bloques invertidos aun con ruido en el nombre del equipo", () => {
  const assignment = resolveScannedTeamSides("AtIetico NacionaI", "Tigres FC", [
    { side: "local", name: "Tigres F.C." },
    { side: "visit", name: "Atlético Nacional" },
  ]);

  assert.equal(assignment.firstSide, "visit");
  assert.equal(assignment.secondSide, "local");
  assert.equal(assignment.ambiguous, false);
});

test("no advierte por variaciones razonables ni por equipos escaneados en orden inverso", () => {
  const teams = [
    { side: "local", name: "Tigres F.C." },
    { side: "visit", name: "Atletico Nacional" },
  ];
  const assignment = resolveScannedTeamSides("AtIetico NacionaI", "Tigres", teams);

  assert.deepEqual(
    getScannedTeamNameMismatches("AtIetico NacionaI", "Tigres", teams, assignment),
    [],
  );
});

test("advierte y conserva el nombre escaneado cuando un equipo es claramente diferente", () => {
  const teams = [
    { side: "local", name: "Tigres" },
    { side: "visit", name: "Atletico Nacional" },
  ];
  const mismatches = getScannedTeamNameMismatches("Tigres FC", "Real Madrid", teams);

  assert.equal(mismatches.length, 1);
  assert.equal(mismatches[0].scannedName, "Real Madrid");
  assert.equal(mismatches[0].registeredName, "Atletico Nacional");
});

test("advierte por los dos nombres cuando la cedula corresponde a otro partido", () => {
  const teams = [
    { side: "local", name: "Tigres" },
    { side: "visit", name: "Atletico Nacional" },
  ];
  const mismatches = getScannedTeamNameMismatches("Chelsea", "Real Madrid", teams);

  assert.equal(mismatches.length, 2);
  assert.deepEqual(mismatches.map(item => item.scannedName), ["Chelsea", "Real Madrid"]);
});

test("advierte con los nombres reales de una cedula ajena aunque la asignacion no sea ambigua", () => {
  const teams = [
    { side: "local", name: "Napoli" },
    { side: "visit", name: "Tiernos FC" },
  ];
  const assignment = resolveScannedTeamSides("SIFON", "R IMPERIO", teams);
  const mismatches = getScannedTeamNameMismatches("SIFON", "R IMPERIO", teams, assignment);

  assert.equal(assignment.ambiguous, false);
  assert.deepEqual(mismatches.map(item => item.scannedName), ["SIFON", "R IMPERIO"]);
});

test("no ofrece reemplazar la fecha cuando la cedula trae la misma fecha", () => {
  const review = getScannedDateReview("2026-07-11", "2026-07-11");

  assert.equal(review.datesMatch, true);
  assert.equal(review.canReplaceDate, false);
  assert.equal(review.label, "2026-07-11 · coincide");
});

test("compara tambien una fecha actual almacenada como timestamp", () => {
  const review = getScannedDateReview("2026-07-11T19:00:00Z", "2026-07-11");

  assert.equal(review.datesMatch, true);
  assert.equal(review.canReplaceDate, false);
});

test("solo ofrece reemplazo cuando la fecha detectada es valida y diferente", () => {
  const preserved = getScannedDateReview("2026-07-11", "2026-07-17");
  const replaced = getScannedDateReview("2026-07-11", "2026-07-17", true);

  assert.equal(preserved.canReplaceDate, true);
  assert.equal(preserved.label, "2026-07-11 · se conserva");
  assert.equal(replaced.label, "2026-07-17");
});
