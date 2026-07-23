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

Deno.test("resuelve fecha por rango semanal y columna, y normaliza horas 12 y 24 horas", () => {
  const rangeLabel =
    "SEMANA DEL LUNES 13 DE JULIO AL SABADO 18 DE JULIO DE 2026";
  const scan = selectScheduleForDivision({
    entries: [
      {
        divisionLabel: "Segunda Division",
        roundLabel: "Jornada 3",
        scheduleLabel: `${rangeLabel} | MIERCOLES | 7:00 P.M.`,
        localTeam: "Atletico San Juan",
        visitorTeam: "Deportivo Morelos",
      },
      {
        divisionLabel: "Segunda Division",
        roundLabel: "Jornada 3",
        scheduleRangeLabel: rangeLabel,
        weekdayLabel: "SABADO",
        timeLabel: "18:30 HRS",
        localTeam: "Real Hidalgo",
        visitorTeam: "Union Pachuca",
      },
      {
        divisionLabel: "Segunda Division",
        roundLabel: "Jornada 3",
        byeTeam: "Halcones Tulancingo",
      },
    ],
  }, {
    divisionName: "Segunda Division",
    roundTitle: "Jornada 3",
    teams,
  });

  assert(
    scan.matches[0].date === "2026-07-15",
    "Debe resolver el miercoles del rango.",
  );
  assert(
    scan.matches[0].time === "19:00",
    "Debe convertir P.M. a formato de 24 horas.",
  );
  assert(
    scan.matches[0].dateTimeDetected,
    "Debe marcar fecha y hora completas.",
  );
  assert(
    scan.matches[0].rawSchedule.rangeLabel === rangeLabel,
    "Debe conservar el encabezado semanal original.",
  );
  assert(
    scan.matches[0].rawSchedule.dateSource === "image-range-weekday",
    "Debe explicar que la fecha salio del rango y la columna.",
  );
  assert(
    scan.matches[1].date === "2026-07-18",
    "Debe resolver el sabado del rango.",
  );
  assert(
    scan.matches[1].time === "18:30",
    "Debe aceptar una hora en formato de 24 horas.",
  );
});

Deno.test("conserva la fecha y hora del cruce correcto al descartar filas ajenas", () => {
  const scan = selectScheduleForDivision({
    entries: [
      {
        divisionLabel: "Rol general",
        roundLabel: "Jornada 7",
        scheduleRangeLabel: "DEL 13 AL 18 DE JULIO DE 2026",
        weekdayLabel: "SABADO",
        timeLabel: "6:00 PM",
        localTeam: "Tigres Norte",
        visitorTeam: "America Centro",
      },
      {
        divisionLabel: "Rol general",
        roundLabel: "Jornada 7",
        scheduleRangeLabel: "DEL 13 AL 18 DE JULIO DE 2026",
        weekdayLabel: "LUNES",
        timeLabel: "7:00 PM",
        localTeam: "Atletico San Juan",
        visitorTeam: "Deportivo Morelos",
      },
      {
        divisionLabel: "Rol general",
        roundLabel: "Jornada 7",
        scheduleRangeLabel: "DEL 13 AL 18 DE JULIO DE 2026",
        weekdayLabel: "MARTES",
        timeLabel: "20:15",
        localTeam: "Real Hidalgo",
        visitorTeam: "Union Pachuca",
      },
    ],
  }, {
    divisionName: "Segunda Division",
    roundTitle: "Jornada 7",
    teams,
  });

  assert(scan.matches.length === 2, "Debe descartar el cruce ajeno.");
  assert(
    scan.matches[0].localTeamId === "a",
    "El primer cruce aceptado debe ser el del lunes.",
  );
  assert(
    scan.matches[0].date === "2026-07-13",
    "La fecha del cruce descartado no debe desplazarse.",
  );
  assert(
    scan.matches[0].time === "19:00",
    "La hora debe permanecer en su fila original.",
  );
  assert(
    scan.matches[1].date === "2026-07-14",
    "El segundo cruce debe conservar el martes.",
  );
  assert(
    scan.matches[1].time === "20:15",
    "La hora 24h del segundo cruce debe conservarse.",
  );
});

Deno.test("resuelve un rango semanal que cruza mes y ano", () => {
  const scan = selectScheduleForDivision({
    entries: [
      {
        divisionLabel: "Segunda Division",
        roundLabel: "Jornada 10",
        scheduleRangeLabel:
          "DEL LUNES 29 DE DICIEMBRE DE 2025 AL DOMINGO 4 DE ENERO DE 2026",
        weekdayLabel: "MIERCOLES",
        timeLabel: "12:05 a.m.",
        localTeam: "Atletico San Juan",
        visitorTeam: "Deportivo Morelos",
      },
      {
        divisionLabel: "Segunda Division",
        roundLabel: "Jornada 10",
        localTeam: "Real Hidalgo",
        visitorTeam: "Union Pachuca",
      },
      {
        divisionLabel: "Segunda Division",
        roundLabel: "Jornada 10",
        byeTeam: "Halcones Tulancingo",
      },
    ],
  }, {
    divisionName: "Segunda Division",
    roundTitle: "Jornada 10",
    teams,
  });

  assert(
    scan.matches[0].date === "2025-12-31",
    "Debe ubicar el miercoles antes del cambio de ano.",
  );
  assert(
    scan.matches[0].time === "00:05",
    "Debe normalizar medianoche en formato a.m.",
  );
  assert(
    !scan.matches[1].dateTimeDetected,
    "No debe inventar fecha u hora para otra fila.",
  );
});

Deno.test("acepta una fecha explicita y usa el rango de jornada solo como respaldo", () => {
  const threeTeams = teams.slice(0, 3);
  const explicit = selectScheduleForDivision({
    entries: [{
      divisionLabel: "Segunda Division",
      roundLabel: "Jornada 4",
      dateLabel: "VIERNES 17/07/2026",
      weekdayLabel: "VIERNES",
      timeLabel: "8:45 PM",
      localTeam: "Atletico San Juan",
      visitorTeam: "Deportivo Morelos",
    }],
  }, {
    divisionName: "Segunda Division",
    roundTitle: "Jornada 4",
    teams: threeTeams,
  });

  assert(
    explicit.matches[0].date === "2026-07-17",
    "Debe conservar la fecha explicita valida.",
  );
  assert(
    explicit.matches[0].time === "20:45",
    "Debe convertir la hora explicita.",
  );
  assert(
    explicit.matches[0].rawSchedule.dateSource === "explicit",
    "Debe registrar la fuente explicita.",
  );

  const contextual = selectScheduleForDivision({
    entries: [{
      divisionLabel: "Segunda Division",
      roundLabel: "Jornada 4",
      weekdayLabel: "JUEVES",
      timeLabel: "18:00",
      localTeam: "Atletico San Juan",
      visitorTeam: "Deportivo Morelos",
    }],
  }, {
    divisionName: "Segunda Division",
    roundTitle: "Jornada 4",
    roundStartDate: "2026-07-13",
    roundEndDate: "2026-07-18",
    teams: threeTeams,
  });

  assert(
    contextual.matches[0].date === "2026-07-16",
    "Debe resolver el dia dentro del rango de jornada.",
  );
  assert(
    contextual.matches[0].rawSchedule.dateSource === "round-context-weekday",
    "Debe distinguir el respaldo del contexto de una fecha visible.",
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
