import assert from "node:assert/strict";
import test from "node:test";
import { autoCorregirFixture } from "../src/utils/fixtureAutoCorrection.js";
import { validarFixture } from "../src/utils/fixtureValidation.js";

const TEAM_IDS = {
    Borrachos: 1226,
    "Castros FC": 1227,
    Centauros: 79,
    Chelsea: 1228,
    Condip: 1229,
    "Dep. Islacc": 76,
    "Dep. las Flores": 1230,
    "Franco Canadiense": 81,
    Galleros: 90,
    "Inter FC": 89,
    Mashacles: 91,
    Michuca: 87,
    Moralinda: 1231,
    Nalgones: 82,
    "Toros Neza": 78,
    Tuzos: 77,
    "X Force": 88,
    "Zacamila Juvenil": 80,
};

// Fixture persistido del torneo 332, una cadena compacta por jornada.
const PERSISTED_ROUNDS = [
    "Moralinda|Dep. las Flores;Chelsea|Galleros;X Force|Condip;Mashacles|Borrachos;Toros Neza|Castros FC;Tuzos|Franco Canadiense;Michuca|Centauros;Zacamila Juvenil|Nalgones;Inter FC|Dep. Islacc",
    "Chelsea|Zacamila Juvenil;Nalgones|Tuzos;Inter FC|Michuca;Dep. Islacc|Moralinda;Mashacles|Toros Neza;Galleros|Centauros;Franco Canadiense|Castros FC;Condip|Dep. las Flores;X Force|Borrachos",
    "Franco Canadiense|Zacamila Juvenil;Centauros|Condip;X Force|Nalgones;Mashacles|Dep. las Flores;Chelsea|Michuca;Castros FC|Galleros;Dep. Islacc|Tuzos;Borrachos|Moralinda;Inter FC|Toros Neza",
    "Dep. las Flores|Michuca;Toros Neza|Moralinda;Franco Canadiense|Chelsea;Zacamila Juvenil|Borrachos;Dep. Islacc|Mashacles;Tuzos|Castros FC;Inter FC|Nalgones;X Force|Centauros;Galleros|Condip",
    "Nalgones|Dep. Islacc;Borrachos|Tuzos;Dep. las Flores|Inter FC;Toros Neza|Franco Canadiense;Moralinda|Centauros;Mashacles|Michuca;Zacamila Juvenil|Galleros;Condip|Chelsea;X Force|Castros FC",
    "Centauros|Tuzos;Nalgones|Condip;Borrachos|Franco Canadiense;X Force|Inter FC;Zacamila Juvenil|Michuca;Dep. Islacc|Dep. las Flores;Galleros|Toros Neza;Moralinda|Castros FC;Chelsea|Mashacles",
    "Chelsea|Inter FC;X Force|Mashacles;Toros Neza|Condip;Moralinda|Galleros;Castros FC|Centauros;Dep. Islacc|Franco Canadiense;Dep. las Flores|Borrachos;Michuca|Nalgones;Tuzos|Zacamila Juvenil",
    "Borrachos|Dep. Islacc;Moralinda|Inter FC;Michuca|Franco Canadiense;Castros FC|Zacamila Juvenil;Mashacles|Galleros;Condip|Tuzos;Dep. las Flores|Nalgones;X Force|Chelsea;Centauros|Toros Neza",
    "X Force|Dep. las Flores;Centauros|Franco Canadiense;Mashacles|Zacamila Juvenil;Toros Neza|Tuzos;Inter FC|Galleros;Nalgones|Chelsea;Castros FC|Borrachos;Condip|Moralinda;Michuca|Dep. Islacc",
    "Centauros|Dep. Islacc;Moralinda|Zacamila Juvenil;Toros Neza|Chelsea;X Force|Galleros;Nalgones|Mashacles;Condip|Castros FC;Michuca|Borrachos;Franco Canadiense|Dep. las Flores;Tuzos|Inter FC",
    "Nalgones|Moralinda;X Force|Franco Canadiense;Galleros|Michuca;Tuzos|Chelsea;Zacamila Juvenil|Centauros;Inter FC|Borrachos;Dep. Islacc|Castros FC;Dep. las Flores|Toros Neza;Condip|Mashacles",
    "Franco Canadiense|Galleros;Toros Neza|Dep. Islacc;Borrachos|Condip;Mashacles|Inter FC;Centauros|Chelsea;Dep. las Flores|Zacamila Juvenil;Nalgones|Castros FC;X Force|Michuca;Tuzos|Moralinda",
    "Castros FC|Mashacles;Michuca|Condip;Toros Neza|Nalgones;Inter FC|Zacamila Juvenil;X Force|Tuzos;Dep. Islacc|Chelsea;Dep. las Flores|Centauros;Franco Canadiense|Moralinda;Galleros|Borrachos",
    "Borrachos|Nalgones;Michuca|Tuzos;Castros FC|Inter FC;X Force|Dep. Islacc;Dep. las Flores|Galleros;Mashacles|Centauros;Condip|Franco Canadiense;Zacamila Juvenil|Toros Neza;Chelsea|Moralinda",
    "X Force|Moralinda;Centauros|Borrachos;Chelsea|Castros FC;Michuca|Toros Neza;Franco Canadiense|Mashacles;Galleros|Nalgones;Tuzos|Dep. las Flores;Zacamila Juvenil|Dep. Islacc;Condip|Inter FC",
    "X Force|Toros Neza;Castros FC|Dep. las Flores;Moralinda|Michuca;Borrachos|Chelsea;Nalgones|Franco Canadiense;Inter FC|Centauros;Tuzos|Mashacles;Galleros|Dep. Islacc;Zacamila Juvenil|Condip",
    "Galleros|Tuzos;Dep. Islacc|Condip;Castros FC|Michuca;X Force|Zacamila Juvenil;Borrachos|Toros Neza;Moralinda|Mashacles;Centauros|Nalgones;Chelsea|Dep. las Flores;Franco Canadiense|Inter FC",
];

const SCANNED_ROUND =
    "Nalgones|Toros Neza;Michuca|Galleros;Dep. las Flores|Centauros;Dep. Islacc|Chelsea;Zacamila Juvenil|Franco Canadiense;Tuzos|Borrachos;Mashacles|Moralinda;Castros FC|Condip;X Force|Inter FC";

const parseRound = (round) =>
    round.split(";").map((pair) => pair.split("|"));

const buildTeam = (name) => ({ id: TEAM_IDS[name], name });

const buildMatch = (roundIndex, matchIndex, localName, visitanteName, overrides = {}) => ({
    id: `r${roundIndex + 1}-m${matchIndex + 1}`,
    local: buildTeam(localName),
    visitante: buildTeam(visitanteName),
    jornadaIndex: roundIndex,
    locked: false,
    roundLocked: false,
    isByeMatch: false,
    ...overrides,
});

const buildTournamentFixture = () => {
    const persisted = PERSISTED_ROUNDS.flatMap((round, roundIndex) =>
        parseRound(round).map(([localName, visitanteName], matchIndex) =>
            buildMatch(roundIndex, matchIndex, localName, visitanteName, roundIndex < 2
                ? { locked: true, roundLocked: true }
                : {}),
        ),
    );

    const scannedMatches = parseRound(SCANNED_ROUND).map(
        ([localName, visitanteName], matchIndex) =>
            buildMatch(2, matchIndex, localName, visitanteName, {
                locked: true,
                roundLocked: false,
                scanLocked: true,
            }),
    );

    return [
        ...persisted.filter(({ jornadaIndex }) => jornadaIndex !== 2),
        ...scannedMatches,
    ].sort(
        (first, second) =>
            first.jornadaIndex - second.jornadaIndex || first.id.localeCompare(second.id),
    );
};

const getRound = (fixture, roundIndex) =>
    fixture.filter(({ jornadaIndex }) => jornadaIndex === roundIndex);

test("corrige el fixture real del torneo 332 sin tocar jornadas confirmadas ni escaneada", () => {
    const initial = buildTournamentFixture();
    const immutableBefore = [0, 1, 2].map((roundIndex) => getRound(initial, roundIndex));

    assert.equal(PERSISTED_ROUNDS.length, 17);
    assert.equal(validarFixture(initial, { vueltas: "1" }).totalConflicts, 8);

    const corrected = autoCorregirFixture(initial, 15000, { vueltas: "1" });

    [0, 1, 2].forEach((roundIndex) => {
        assert.deepEqual(getRound(corrected, roundIndex), immutableBefore[roundIndex]);
    });
    assert.equal(validarFixture(corrected, { vueltas: "1" }).totalConflicts, 0);
});
