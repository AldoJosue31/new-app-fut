import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { formatForecastMatchDate } from "../src/utils/forecastPresentation.js";

test("forecast keeps the scheduled hour from both Supabase and planning timestamp formats", () => {
  for (const value of [
    "2026-10-24 22:00:00+00",
    "2026-10-24T22:00:00+00:00",
    "2026-10-24T22:00:00.000Z",
    "2026-10-24 22:00:00",
    "2026-10-24T22:00:00",
  ]) {
    assert.equal(formatForecastMatchDate(value), "24 oct, 10:00 p.m.");
  }
});

test("forecast distinguishes midnight from noon and preserves the scheduled calendar day", () => {
  assert.equal(formatForecastMatchDate("2026-01-01T00:00:00Z"), "1 ene, 12:00 a.m.");
  assert.equal(formatForecastMatchDate("2026-10-24 00:15:00+00"), "24 oct, 12:15 a.m.");
  assert.equal(formatForecastMatchDate("2026-10-24T12:00:00+00:00"), "24 oct, 12:00 p.m.");
  assert.equal(formatForecastMatchDate("2026-12-31 23:59:00+00"), "31 dic, 11:59 p.m.");
});

test("forecast does not invent midnight when only the match date is known", () => {
  assert.equal(formatForecastMatchDate("2026-10-24"), "24 oct · Hora por confirmar");
});

test("forecast handles missing or invalid scheduled dates without displaying a normalized date", () => {
  for (const value of [null, undefined, "", "invalid", "2026-02-29T22:00:00Z", "2026-04-31 22:00:00+00"]) {
    assert.equal(formatForecastMatchDate(value), "Fecha por confirmar");
  }
});

test("forecast schedules display identically across browser time zones, including date boundaries", () => {
  const moduleUrl = new URL("../src/utils/forecastPresentation.js", import.meta.url).href;
  const values = ["2026-10-24T22:00:00+00:00", "2026-01-01T00:00:00Z", "2026-12-31 23:59:00+00", "2026-10-24"];
  const expected = ["24 oct, 10:00 p.m.", "1 ene, 12:00 a.m.", "31 dic, 11:59 p.m.", "24 oct · Hora por confirmar"];
  const script = `import { formatForecastMatchDate } from ${JSON.stringify(moduleUrl)};
    console.log(JSON.stringify(${JSON.stringify(values)}.map(formatForecastMatchDate)));`;

  for (const timeZone of ["UTC", "America/Mexico_City", "America/Tijuana", "Asia/Tokyo"]) {
    const output = execFileSync(process.execPath, ["--input-type=module", "-e", script], {
      env: { ...process.env, TZ: timeZone }, encoding: "utf8",
    });
    assert.deepEqual(JSON.parse(output), expected, timeZone);
  }
});
