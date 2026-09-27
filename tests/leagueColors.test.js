import test from "node:test";
import assert from "node:assert/strict";
import { normalizeHexColor, dominantColorFromPixels, colorContrast, contrastingTextColor, readableAccent, getLeagueGradientTones } from "../src/utils/leagueColors.js";
import { getStandingsExportAppearance, STANDINGS_DESIGN_PRESETS } from "../src/components/organismos/tabs/torneos/exports/standings/standingsExportStyles.js";

const pixels = (...groups) => new Uint8ClampedArray(groups.flatMap(([count, rgba]) => Array.from({ length: count }, () => rgba).flat()));

test("league colors normalize valid hex and reject CSS or malformed values", () => {
  assert.equal(normalizeHexColor(" #abc "), "#AABBCC");
  assert.equal(normalizeHexColor("e31b23"), "#E31B23");
  for (const value of [null, "", "#12345", "#12345678", "red", "var(--color)", "#GG0000"]) assert.equal(normalizeHexColor(value), null);
});

test("logo detection ignores transparency and white backgrounds, groups similar dominant colors", () => {
  const image = pixels([800, [255, 255, 255, 255]], [200, [0, 200, 20, 0]], [100, [220, 24, 32, 255]], [80, [222, 25, 33, 255]], [40, [25, 75, 180, 255]]);
  assert.equal(dominantColorFromPixels(image), "#DD1820");
  assert.equal(dominantColorFromPixels(pixels([10, [0, 0, 0, 0]])), null);
  assert.equal(dominantColorFromPixels(new Uint8ClampedArray()), null);
});

test("monochrome logos retain black or white when there is no chromatic ink", () => {
  assert.equal(dominantColorFromPixels(pixels([100, [255, 255, 255, 255]], [20, [0, 0, 0, 255]])), "#000000");
  assert.equal(dominantColorFromPixels(pixels([10, [255, 255, 255, 255]])), "#FFFFFF");
});

test("brand accents and header text remain readable for light, dark and bright league colors", () => {
  for (const color of ["#FFFFFF", "#000000", "#FFEB00", "#E31B23", "#1CB0F6", "#123456"]) {
    assert.ok(colorContrast(contrastingTextColor(color), color) >= 4.5);
    for (const background of ["#FFFFFF", "#FFFDFA", "#1E293B"]) assert.ok(colorContrast(readableAccent(color, background), background) >= 4.5);
    for (const themeMode of ["light", "dark"]) {
      for (const preset of STANDINGS_DESIGN_PRESETS) {
        const appearance = getStandingsExportAppearance({ ...preset, themeMode, leagueColors: { primary: color, secondary: "#F4CB46" } });
        if (["scoreboard", "editorial"].includes(preset.tableDesign)) {
          assert.equal(appearance.table.headerBg, color);
          assert.ok(colorContrast(appearance.table.headerText, appearance.table.headerBg) >= 4.5);
        }
        if (preset.tableDesign === "scoreboard") {
          assert.ok(colorContrast(appearance.table.primary, appearance.table.card) >= 4.5);
          assert.ok(colorContrast(appearance.table.pointsText, appearance.table.pointsBg) >= 4.5);
        }
        assert.ok(colorContrast(appearance.table.primary, themeMode === "dark" ? "#1E293B" : "#FFFDFA") >= 4.5);
        assert.equal(appearance.table.positive, themeMode === "dark" ? "#4ade80" : "#15803d");
        assert.equal(appearance.table.negative, themeMode === "dark" ? "#f87171" : "#b91c1c");
      }
    }
  }
});

test("optional secondary color derives a tonal palette; invalid or disabled branding preserves presets", () => {
  const preset = STANDINGS_DESIGN_PRESETS[1];
  const original = getStandingsExportAppearance(preset);
  assert.deepEqual(getStandingsExportAppearance({ ...preset, leagueColors: { primary: "invalid" } }), original);
  assert.notDeepEqual(getStandingsExportAppearance({ ...preset, leagueColors: { primary: "#E31B23" } }), original);
  const colors = { primary: "#E31B23", secondary: "#F4CB46" };
  assert.notEqual(getStandingsExportAppearance({ ...preset, leagueColors: colors }).page.backgroundImage, getStandingsExportAppearance({ ...preset, leagueColors: { primary: colors.primary } }).page.backgroundImage);
});

test("gradient tones keep the chosen hues while balancing strongly different brightness", () => {
  for (const themeMode of ["light", "dark"]) {
    for (const [primary, secondary, primaryChannel, secondaryChannel] of [
      ["#FF0000", "#00FFFF", 0, 0],
      ["#00FF00", "#FF00FF", 1, 1],
      ["#0000FF", "#FFFF00", 2, 2]
    ]) {
      const tones = getLeagueGradientTones(primary, secondary, themeMode);
      const rgb = hex => [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16));
      const main = rgb(tones.primaryTone);
      const companion = rgb(tones.secondaryTone);
      const mainOthers = main.filter((_, index) => index !== primaryChannel);
      const companionOthers = companion.filter((_, index) => index !== secondaryChannel);
      assert.equal(mainOthers[0], mainOthers[1]);
      assert.ok(main[primaryChannel] > mainOthers[0], "primary hue must stay unchanged");
      assert.equal(companionOthers[0], companionOthers[1]);
      assert.ok(companion[secondaryChannel] < companionOthers[0], "secondary hue must stay unchanged");
      assert.ok(colorContrast(tones.primaryTone, tones.secondaryTone) < colorContrast(primary, secondary), "gradient brightness must be gentler than the raw colors");
      for (const tone of [main, companion]) {
        const lightness = (Math.max(...tone) + Math.min(...tone)) / (2 * 255);
        assert.ok(themeMode === "dark" ? lightness < 0.25 : lightness > 0.88, "both colors must share a subdued tonal range");
      }
      for (const tone of Object.values(tones)) {
        assert.equal(normalizeHexColor(tone), tone);
        assert.ok(colorContrast(themeMode === "dark" ? "#F8FAFC" : "#0F172A", tone) >= 4.5);
      }
    }
  }
});

test("gradient harmony handles monochrome colors and defaults to the league hue", () => {
  for (const themeMode of ["light", "dark"]) {
    for (const color of ["#000000", "#FFFFFF", "#808080"]) {
      const tones = getLeagueGradientTones(color, color, themeMode);
      for (const tone of Object.values(tones)) {
        assert.equal(tone.slice(1, 3), tone.slice(3, 5));
        assert.equal(tone.slice(3, 5), tone.slice(5, 7));
      }
    }
    assert.deepEqual(getLeagueGradientTones("#E31B23", undefined, themeMode), getLeagueGradientTones("#E31B23", "#E31B23", themeMode));
  }
});

test("all branded gradients use harmonized stops without changing stored or table colors", () => {
  const leagueColors = Object.freeze({ primary: "#0000FF", secondary: "#FFFF00" });
  for (const themeMode of ["light", "dark"]) {
    const tones = getLeagueGradientTones(leagueColors.primary, leagueColors.secondary, themeMode);
    for (const backgroundDesign of ["emerald", "aurora", "sunset"]) {
      const appearance = getStandingsExportAppearance({ themeMode, tableDesign: "scoreboard", backgroundDesign, leagueColors });
      assert.equal(appearance.page.bg, tones.base);
      assert.ok(appearance.page.backgroundImage.includes(tones.primaryTone));
      assert.ok(appearance.page.backgroundImage.includes(tones.secondaryTone));
      assert.equal(appearance.table.headerBg, leagueColors.primary);
      assert.equal(appearance.table.pointsBg, leagueColors.secondary);
    }
  }
});
