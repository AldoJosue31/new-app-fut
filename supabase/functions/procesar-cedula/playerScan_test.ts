import { normalizeScannedPlayers, parseScannedCount } from "./playerScan.ts";

const assertEquals = (actual: unknown, expected: unknown, message: string) => {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`${message}\nEsperado: ${expectedJson}\nActual: ${actualJson}`);
  }
};

Deno.test("normaliza campos Gemini y aplica limites conservadores", () => {
  const [player] = normalizeScannedPlayers([{
    name: "  <Ana>   Perez\n",
    observedName: " ANA PÉREZ ",
    jerseyNumber: " # 09 ",
    rowNumber: "3",
    goalEvidence: "  dos marcas <visibles> ",
    goalsConfidence: "87%",
    goals: "25",
    ownGoals: 4,
    yellowCards: 9,
    redCards: -3,
  }]);

  assertEquals(player, {
    name: "Ana Perez",
    observedName: "ANA PÉREZ",
    jerseyNumber: "09",
    rowNumber: 3,
    goalsLegible: true,
    goalEvidence: "dos marcas visibles",
    goalsConfidence: "high",
    goals: 20,
    ownGoals: 0,
    yellowCards: 2,
    redCards: 0,
  }, "Debe sanear texto, porcentajes y conteos sin aceptar autogoles implicitos.");
});

Deno.test("convierte goles escritos con letras o cifras sin perder la evidencia", () => {
  assertEquals([
    parseScannedCount("uno"),
    parseScannedCount("DOS"),
    parseScannedCount("tres goles"),
    parseScannedCount("4"),
    parseScannedCount("x5"),
    parseScannedCount("dieciséis"),
    parseScannedCount("sin cantidad"),
  ], [1, 2, 3, 4, 5, 16, null], "Debe reconocer palabras españolas y cifras.");

  const players = normalizeScannedPlayers([{
    name: "Jugador Uno",
    goals: "uno",
    goalEvidence: "uno",
    goalsLegible: true,
  }, {
    name: "Jugador Dos",
    goals: 0,
    goalEvidence: "DOS",
    goalsLegible: true,
  }, {
    name: "Jugador Tres",
    goals: "3",
    goalEvidence: "3",
    goalsLegible: true,
  }, {
    name: "Jugador Ilegible",
    goals: "dos",
    goalEvidence: "dos, pero borroso",
    goalsLegible: false,
  }]);

  assertEquals(players.map(player => ({
    name: player.name,
    goals: player.goals,
    evidence: player.goalEvidence,
  })), [{
    name: "Jugador Uno",
    goals: 1,
    evidence: "uno",
  }, {
    name: "Jugador Dos",
    goals: 2,
    evidence: "DOS",
  }, {
    name: "Jugador Tres",
    goals: 3,
    evidence: "3",
  }, {
    name: "Jugador Ilegible",
    goals: 0,
    evidence: "dos, pero borroso",
  }], "Una celda ilegible sigue sin aplicar goles aunque contenga una palabra.");
});

Deno.test("conserva autogoles solo con evidencia explicita", () => {
  const players = normalizeScannedPlayers([{
    name: "Uno",
    ownGoals: 2,
    goalEvidence: "A.G. x2",
  }, {
    name: "Dos",
    ownGoals: 1,
    ownGoalEvidence: "own goal",
  }, {
    name: "Tres",
    ownGoals: 3,
    goalEvidence: "marca en GOL",
  }]);

  assertEquals(players.map(({ name, ownGoals, goalEvidence }) => ({ name, ownGoals, goalEvidence })), [{
    name: "Uno",
    ownGoals: 2,
    goalEvidence: "A.G. x2",
  }, {
    name: "Dos",
    ownGoals: 1,
    goalEvidence: "own goal",
  }, {
    name: "Tres",
    ownGoals: 0,
    goalEvidence: "marca en GOL",
  }], "Una cifra aislada no prueba que el gol sea autogol.");
});

Deno.test("normaliza confianza enum o numerica y anula una celda GOL ilegible", () => {
  const players = normalizeScannedPlayers([{
    name: "Celda borrosa",
    rowNumber: 1,
    goals: 7,
    goalsLegible: false,
    goalsConfidence: "HIGH",
    goalEvidence: "marca cortada",
  }, {
    name: "Confianza media",
    rowNumber: 2,
    goals: 1,
    goalsLegible: true,
    goalsConfidence: 0.65,
  }, {
    name: "Confianza baja",
    rowNumber: 3,
    goals: 1,
    goalsConfidence: "low",
  }]);

  assertEquals(players.map(({ goals, goalsLegible, goalsConfidence }) => ({
    goals,
    goalsLegible,
    goalsConfidence,
  })), [{
    goals: 0,
    goalsLegible: false,
    goalsConfidence: "high",
  }, {
    goals: 1,
    goalsLegible: true,
    goalsConfidence: "medium",
  }, {
    goals: 1,
    goalsLegible: true,
    goalsConfidence: "low",
  }], "Una confianza alta no autoriza conservar goles cuando goalsLegible es falso.");
});

Deno.test("prefiere una lectura legible sobre un duplicado ilegible", () => {
  const [player] = normalizeScannedPlayers([{
    name: "Misma fila",
    rowNumber: 9,
    goals: 8,
    goalsLegible: false,
    goalsConfidence: "high",
    goalEvidence: "borrosa",
  }, {
    name: "Misma fila",
    rowNumber: 9,
    goals: 2,
    goalsLegible: true,
    goalsConfidence: "medium",
    goalEvidence: "||",
  }]);

  assertEquals({ goals: player.goals, legible: player.goalsLegible, confidence: player.goalsConfidence }, {
    goals: 2,
    legible: true,
    confidence: "medium",
  }, "La evidencia util debe provenir de una celda declarada legible.");
});

Deno.test("deduplica por fila y conserva la lectura de mayor confianza sin sumar", () => {
  const players = normalizeScannedPlayers([{
    name: "Ana Perez",
    rowNumber: 4,
    goals: 1,
    goalsConfidence: 0.45,
    goalEvidence: "X",
  }, {
    name: "A. Peres",
    rowNumber: 4,
    goals: 3,
    goalsConfidence: 0.94,
    goalEvidence: "XXX",
  }]);

  assertEquals(players.length, 1, "La misma fila debe producir un solo jugador.");
  assertEquals(players[0].goals, 3, "Debe conservar el conteo elegido, no sumar 1 + 3.");
  assertEquals(players[0].name, "A. Peres", "Debe preferir la lectura de mayor confianza.");
});

Deno.test("deduplica nombres equivalentes y dorsales numericos", () => {
  const players = normalizeScannedPlayers([{
    name: "Pérez Ana",
    jerseyNumber: "#09",
    goals: 1,
    goalsConfidence: 0.8,
  }, {
    observedName: "ANA PEREZ",
    jerseyNumber: "9",
    goals: 2,
    goalsConfidence: 0.9,
  }, {
    name: "Luis Soto",
    jerseyNumber: "17",
  }, {
    name: "L. Soto",
    jerseyNumber: 17,
    goals: 1,
    goalsConfidence: 0.7,
  }]);

  assertEquals(players.map(player => ({ name: player.name, jersey: player.jerseyNumber, goals: player.goals })), [{
    name: "ANA PEREZ",
    jersey: "9",
    goals: 2,
  }, {
    name: "L. Soto",
    jersey: "17",
    goals: 1,
  }], "Nombre invertido, acentos y ceros iniciales deben detectar duplicados.");
});

Deno.test("usa evidencia y completitud para desempatar confianza", () => {
  const [player] = normalizeScannedPlayers([{
    name: "Mario Ruiz",
    rowNumber: 8,
    goals: 0,
    goalsConfidence: 0.8,
  }, {
    observedName: "Mario Ruiz",
    jerseyNumber: 11,
    rowNumber: 8,
    goals: 2,
    goalsConfidence: 0.8,
    goalEvidence: "dos rayas",
  }]);

  assertEquals({
    name: player.name,
    goals: player.goals,
    evidence: player.goalEvidence,
    jersey: player.jerseyNumber,
  }, {
    name: "Mario Ruiz",
    goals: 2,
    evidence: "dos rayas",
    jersey: "11",
  }, "A igual confianza debe preferir evidencia visible y mas anclas de fila.");
});

Deno.test("resuelve duplicados transitivos y mantiene el orden visual original", () => {
  const players = normalizeScannedPlayers([{
    name: "Primero",
    rowNumber: 1,
    jerseyNumber: 7,
    goalsConfidence: 0.2,
  }, {
    name: "Lectura puente",
    rowNumber: 1,
    jerseyNumber: 8,
    goalsConfidence: 0.4,
  }, {
    name: "Ganador",
    rowNumber: 2,
    jerseyNumber: 8,
    goals: 2,
    goalsConfidence: 0.95,
  }, {
    name: "Jugador posterior",
    rowNumber: 3,
  }]);

  assertEquals(players.map(player => player.name), ["Ganador", "Jugador posterior"],
    "La union fila-dorsal debe ser transitiva sin mover el grupo de su posicion original.");
  assertEquals(players[0].goals, 2, "Los duplicados transitivos tampoco deben sumar conteos.");
});

Deno.test("ignora basura pero conserva eventos sin nombre para revision", () => {
  const players = normalizeScannedPlayers([
    null,
    "jugador",
    {},
    { name: "Ilegible" },
    { rowNumber: 0, goals: "x" },
    { goals: 1, goalEvidence: "X", goalsConfidence: 140 },
  ]);

  assertEquals(players, [{
    name: "",
    observedName: "",
    jerseyNumber: "",
    rowNumber: null,
    goalsLegible: true,
    goalEvidence: "X",
    goalsConfidence: "high",
    goals: 1,
    ownGoals: 0,
    yellowCards: 0,
    redCards: 0,
  }], "Un gol sin identidad debe seguir visible como no asignado; filas vacias se descartan.");
});

Deno.test("acepta aliases comunes de objetos Gemini crudos", () => {
  const [player] = normalizeScannedPlayers([{
    playerName: "Laura Diaz",
    visibleName: "L. Díaz",
    dorsal: "#14",
    row: 6,
    goalsEvidence: "2",
    goalConfidence: 91,
    goals: 2.9,
    yellowCards: true,
    redCards: false,
  }]);

  assertEquals(player, {
    name: "Laura Diaz",
    observedName: "L. Díaz",
    jerseyNumber: "14",
    rowNumber: 6,
    goalsLegible: true,
    goalEvidence: "2",
    goalsConfidence: "high",
    goals: 2,
    ownGoals: 0,
    yellowCards: 1,
    redCards: 0,
  }, "La normalizacion debe tolerar aliases sin propagar campos arbitrarios.");
});

Deno.test("una entrada que no es arreglo produce una coleccion vacia", () => {
  assertEquals(normalizeScannedPlayers(null), [], "null no contiene jugadores.");
  assertEquals(normalizeScannedPlayers({ players: [] }), [], "No debe confiar en envolturas arbitrarias.");
});
