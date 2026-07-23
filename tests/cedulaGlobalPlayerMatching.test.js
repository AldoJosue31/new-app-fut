import assert from "node:assert/strict";
import test from "node:test";
import {
  extractLeadingScanDorsal,
  normalizeScanDorsal,
  normalizeScanName,
  resolveScannedPlayerMatches,
} from "../src/utils/cedulaScanMatching.js";

const registered = (id, name, dorsal) => ({ id, name, dorsal });

test("normaliza letras confundidas por OCR sin tratarlas como un dorsal pegado", () => {
  assert.equal(normalizeScanName("5antos Perez"), "santos perez");
  assert.equal(normalizeScanName("1van Lopez"), "ivan lopez");
  assert.equal(normalizeScanName("0scar Ruiz"), "oscar ruiz");
  assert.equal(extractLeadingScanDorsal("5antos Perez"), "");
});

test("elimina dorsales separados, con numeral y con prefijos explicitos", () => {
  assert.equal(normalizeScanName("10. Jose Perez"), "jose perez");
  assert.equal(normalizeScanName("10 Jose Perez"), "jose perez");
  assert.equal(normalizeScanName("#10Jose Perez"), "jose perez");
  assert.equal(normalizeScanName("Dorsal 010 - Jose Perez"), "jose perez");
  assert.equal(normalizeScanName("10"), "");
  assert.equal(extractLeadingScanDorsal("#010 Jose Perez"), "10");
  assert.equal(extractLeadingScanDorsal("10"), "10");
  assert.equal(normalizeScanDorsal("#010"), "10");
});

test("una fila exacta desplaza a una aproximada sin reasignarla al siguiente jugador", () => {
  const rows = [
    { key: "fuzzy", name: "Luis Hernandes", goals: 2 },
    { key: "exact", name: "Luis Hernandez", goals: 1 },
  ];
  const candidates = [
    registered(1, "Luis Hernandez", 10),
    registered(2, "Lucas Hernandez", 11),
  ];

  const result = resolveScannedPlayerMatches(rows, candidates);
  assert.equal(result[0].matched, null);
  assert.equal(result[0].reason, "candidate-conflict");
  assert.equal(result[0].suggested.id, 1);
  assert.equal(result[1].matched.id, 1);
  assert.equal(result[1].method, "exact-name");
  assert.equal(result.some(match => match.matched?.id === 2), false);
});

test("el resultado seguro no depende del orden de filas OCR", () => {
  const rows = [
    { key: "fuzzy", name: "Luis Hernandes" },
    { key: "exact", name: "Luis Hernandez" },
  ];
  const candidates = [
    registered(1, "Luis Hernandez", 10),
    registered(2, "Lucas Hernandez", 11),
  ];

  for (const input of [rows, [...rows].reverse()]) {
    const byKey = new Map(resolveScannedPlayerMatches(input, candidates).map(match => [match.row.key, match]));
    assert.equal(byKey.get("exact").matched.id, 1);
    assert.equal(byKey.get("fuzzy").matched, null);
    assert.equal(byKey.get("fuzzy").reason, "candidate-conflict");
  }
});

test("dos filas duplicadas nunca ocupan dos jugadores parecidos", () => {
  const result = resolveScannedPlayerMatches(
    [{ name: "Juan Perez" }, { name: "Juan Perez" }],
    [registered(1, "Juan Perez", 7), registered(2, "Juan Peres", 8)],
  );

  assert.equal(result.filter(match => match.matched?.id === 1).length, 1);
  assert.equal(result.filter(match => match.matched?.id === 2).length, 0);
  assert.equal(result.filter(match => match.reason === "candidate-conflict").length, 1);
});

test("rechaza una coincidencia debil aunque solo exista un candidato", () => {
  const [result] = resolveScannedPlayerMatches(
    [{ name: "Pedro" }],
    [registered(1, "Mario", 9)],
  );

  assert.equal(result.matched, null);
  assert.equal(result.reason, "weak-name");
  assert.ok(result.score > 0.3, "la regresion debe cubrir el margen artificial de un solo candidato");
});

test("no asigna un apellido aislado a un nombre completo aunque sea el unico candidato", () => {
  const [result] = resolveScannedPlayerMatches(
    [{ name: "Hernandez" }],
    [registered(1, "Luis Hernandez", 9)],
  );

  assert.equal(result.matched, null);
  assert.equal(result.reason, "partial-name");
});

test("acepta un error OCR fuerte cuando nombre y apellido siguen siendo inequivocos", () => {
  const [result] = resolveScannedPlayerMatches(
    [{ name: "Jose Manuel Hernandes" }],
    [registered(1, "Jose Manuel Hernandez", 10), registered(2, "Mario Lopez", 11)],
  );

  assert.equal(result.matched.id, 1);
  assert.equal(result.method, "fuzzy-name");
  assert.ok(result.score >= 0.72);
});

test("rechaza nombres casi identicos cuando el margen global es insuficiente", () => {
  const [result] = resolveScannedPlayerMatches(
    [{ name: "Juan Pere" }],
    [registered(1, "Juan Perez", 7), registered(2, "Juan Peres", 8)],
  );

  assert.equal(result.matched, null);
  assert.equal(result.reason, "ambiguous-name");
});

test("usa un dorsal unico como ancla aun si el nombre es poco legible", () => {
  const [result] = resolveScannedPlayerMatches(
    [{ name: "texto ilegible", dorsal: 10 }],
    [registered(1, "Jose Perez", 10), registered(2, "Mario Lopez", 11)],
  );

  assert.equal(result.matched.id, 1);
  assert.equal(result.method, "dorsal");
  assert.equal(result.dorsal, "10");
});

test("extrae el dorsal del nombre y resuelve homonimos", () => {
  const [result] = resolveScannedPlayerMatches(
    [{ name: "#11 Jose Perez" }],
    [registered(1, "Jose Perez", 10), registered(2, "Jose Perez", 11)],
  );

  assert.equal(result.matched.id, 2);
  assert.equal(result.method, "dorsal");
});

test("un dorsal repetido en el plantel no anula una coincidencia exacta unica", () => {
  const [result] = resolveScannedPlayerMatches(
    [{ name: "Mario Lopez", dorsal: 10 }],
    [registered(1, "Jose Perez", 10), registered(2, "Mario Lopez", 10)],
  );

  assert.equal(result.matched.id, 2);
  assert.equal(result.method, "exact-name");
});

test("no aplica un dorsal cuando contradice un nombre exacto diferente", () => {
  const [result] = resolveScannedPlayerMatches(
    [{ name: "Mario Lopez", dorsal: 10 }],
    [registered(1, "Jose Perez", 10), registered(2, "Mario Lopez", 11)],
  );

  assert.equal(result.matched, null);
  assert.equal(result.reason, "dorsal-name-conflict");
});

test("asigna cada candidato una sola vez y conserva la correspondencia de filas", () => {
  const result = resolveScannedPlayerMatches(
    [{ name: "Ana Perez" }, { name: "Maria Lopez" }, { name: "Nombre ilegible" }],
    [registered(1, "Ana Perez", 4), registered(2, "Maria Lopez", 5)],
  );

  assert.deepEqual(result.map(match => match.matched?.id || null), [1, 2, null]);
  assert.equal(new Set(result.filter(match => match.matched).map(match => match.matched.id)).size, 2);
});
