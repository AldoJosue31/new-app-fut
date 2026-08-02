import assert from "node:assert/strict";
import test from "node:test";

import {
    buildScannedMatchTimestamp,
    hasCompleteScannedSchedule,
    persistedDateTimeKey,
    resolveScannedSchedule,
} from "../src/utils/scannedScheduleUtils.js";

test("conserva la fecha y hora aceptadas durante todo el guardado del fixture", () => {
    const scannedMatch = {
        scanScheduleAccepted: true,
        scannedDate: "2026-07-11",
        scannedTime: "19:30",
        date: "2026-07-11",
        time: "19:30",
    };

    assert.deepEqual(resolveScannedSchedule(scannedMatch), {
        date: "2026-07-11",
        time: "19:30",
        complete: true,
    });
    assert.equal(hasCompleteScannedSchedule(scannedMatch), true);
    assert.equal(
        buildScannedMatchTimestamp(scannedMatch),
        "2026-07-11 19:30:00",
    );
});

test("usa date y time canonicos si la metadata temporal del escaneo esta vacia", () => {
    const canonicalMatch = {
        scannedDate: "",
        scannedTime: "",
        date: "2026-07-12",
        time: "08:05",
    };

    assert.equal(
        buildScannedMatchTimestamp(canonicalMatch),
        "2026-07-12 08:05:00",
    );
});

test("reconstruye el horario desde el timestamp persistido para la recarga", () => {
    const persistedMatch = { date: "2026-07-13T14:45:00+00:00" };

    assert.deepEqual(resolveScannedSchedule(persistedMatch), {
        date: "2026-07-13",
        time: "14:45",
        complete: true,
    });
    assert.equal(
        persistedDateTimeKey(persistedMatch.date),
        "2026-07-13 14:45:00",
    );
});

test("no fabrica un timestamp cuando falta fecha u hora", () => {
    assert.equal(buildScannedMatchTimestamp({ date: "2026-07-11" }), null);
    assert.equal(buildScannedMatchTimestamp({ time: "19:30" }), null);
});
