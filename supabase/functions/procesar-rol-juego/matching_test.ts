import { selectScheduleForDivision } from "./matching.ts";

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const teams = [
  { id: "a", name: "Atletico San Juan" },
  { id: "b", name: "Deportivo Morelos" },
  { id: "c", name: "Real Hidalgo" },
  { id: "d", name: "Union Pachuca" },
  { id: "e", name: "Halcones Tulancingo" },
];

Deno.test("elige la division por cobertura de participantes y corrige OCR", () => {
  const scan = selectScheduleForDivision({
    entries: [
      {
        divisionLabel: "Primera Fuerza",
        roundLabel: "Jornada 3",
        localTeam: "Tigres Norte",
        visitorTeam: "America Centro",
      },
      {
        divisionLabel: "Primera Fuerza",
        roundLabel: "Jornada 3",
        localTeam: "Juventus",
        visitorTeam: "Cruz Azul",
      },
      {
        divisionLabel: "Segunda Division",
        roundLabel: "Fecha 3",
        localTeam: "Atletlco San Juan",
        visitorTeam: "Deportlvo Morelos",
      },
      {
        divisionLabel: "Segunda Division",
        roundLabel: "Fecha 3",
        localTeam: "Rea1 Hidalgo",
        visitorTeam: "Union Pachuca",
      },
      {
        divisionLabel: "Segunda Division",
        roundLabel: "Fecha 3",
        byeTeam: "Halcones Tulancing0",
      },
    ],
  }, {
    divisionName: "Segunda Division",
    roundTitle: "Jornada 3",
    teams,
  });

  assert(
    scan.complete,
    "La jornada de la division objetivo debe quedar completa.",
  );
  assert(
    scan.matches.length === 2,
    "Debe recuperar los dos partidos esperados.",
  );
  assert(
    scan.matches[0].localTeamId === "a",
    "Debe mapear el OCR al ID del participante.",
  );
  assert(scan.byeTeamId === "e", "Debe reconocer al equipo que descansa.");
  assert(
    scan.sourceDivision === "Segunda Division",
    "Debe escoger el bloque de la division actual.",
  );
});

Deno.test("descarta partidos ajenos aunque todas las divisiones vengan en un solo bloque", () => {
  const scan = selectScheduleForDivision({
    sections: [{
      divisionLabel: "Rol general",
      roundLabel: "Jornada 7",
      matches: [
        { localTeam: "Tigres Norte", visitorTeam: "America Centro" },
        { localTeam: "Atletico San Juan", visitorTeam: "Deportivo Morelos" },
        { localTeam: "Juventus", visitorTeam: "Cruz Azul" },
        { localTeam: "Real Hidalgo", visitorTeam: "Union Pachuca" },
      ],
    }],
  }, {
    divisionName: "Segunda Division",
    roundTitle: "Jornada 7",
    teams,
  });

  assert(
    scan.matches.length === 2,
    "Solo deben sobrevivir los partidos con dos participantes actuales.",
  );
  assert(
    scan.matches.every((match) =>
      ["a", "b", "c", "d"].includes(match.localTeamId) ||
      ["a", "b", "c", "d"].includes(match.visitorTeamId)
    ),
    "No debe devolver equipos de otra division.",
  );
  assert(
    scan.byeTeamId === "e",
    "Debe inferir el descanso por el unico participante restante.",
  );
  assert(scan.byeInferred, "Debe indicar que el descanso fue inferido.");
});

Deno.test("no fuerza nombres de otra division sobre los participantes actuales", () => {
  const scan = selectScheduleForDivision({
    sections: [{
      divisionLabel: "Primera Division",
      roundLabel: "Jornada 2",
      matches: [
        { localTeam: "Tigres Norte", visitorTeam: "America Centro" },
        { localTeam: "Juventus", visitorTeam: "Cruz Azul" },
      ],
    }],
  }, {
    divisionName: "Segunda Division",
    roundTitle: "Jornada 2",
    teams,
  });

  assert(
    scan.matches.length === 0,
    "Los cruces sin participantes de la division deben descartarse.",
  );
  assert(!scan.complete, "Una lectura ajena no puede marcarse completa.");
});
