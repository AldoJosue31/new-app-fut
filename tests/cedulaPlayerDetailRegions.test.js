import assert from "node:assert/strict";
import test from "node:test";
import {
  CEDULA_PLAYER_DETAIL_VERSION,
  getCedulaPlayerDetailRegions,
} from "../src/utils/cedulaPlayerDetailRegions.js";

test("genera dos recortes superpuestos y acotados para una cedula vertical", () => {
  const regions = getCedulaPlayerDetailRegions(2000, 3000);

  assert.equal(CEDULA_PLAYER_DETAIL_VERSION, "cedula-player-details-v1");
  assert.equal(regions.length, 2);
  assert.equal(regions[0].x, 0);
  assert.ok(regions[0].width > 1000);
  assert.ok(regions[1].x < 1000);
  assert.ok(regions.every(region => (
    region.x >= 0
    && region.y >= 0
    && region.x + region.width <= 2000
    && region.y + region.height <= 3000
  )));
});

test("rechaza dimensiones invalidas sin producir recortes", () => {
  assert.deepEqual(getCedulaPlayerDetailRegions(0, 3000), []);
  assert.deepEqual(getCedulaPlayerDetailRegions(2000, Number.NaN), []);
});
