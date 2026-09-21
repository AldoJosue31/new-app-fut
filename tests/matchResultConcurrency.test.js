import assert from "node:assert/strict";
import test from "node:test";

import {
  createMatchResultConflictError,
  isMatchResultConflictError,
  MATCH_RESULT_CONFLICT_CODE,
  normalizeMatchResultRevision,
} from "../src/utils/matchResultConcurrency.js";

test("normaliza revisiones válidas de resultados", () => {
  assert.equal(normalizeMatchResultRevision(0), 0);
  assert.equal(normalizeMatchResultRevision("7"), 7);
  assert.equal(normalizeMatchResultRevision(15), 15);
});

test("rechaza revisiones que no pueden servir para control optimista", () => {
  for (const revision of [undefined, null, -1, 1.5, "invalida"]) {
    assert.throws(
      () => normalizeMatchResultRevision(revision),
      /versión del resultado/i,
    );
  }
});

test("convierte la respuesta stale de la RPC en un conflicto recuperable", () => {
  const remoteError = {
    code: "P0001",
    message: MATCH_RESULT_CONFLICT_CODE,
  };
  const conflict = createMatchResultConflictError(remoteError);

  assert.equal(conflict.code, MATCH_RESULT_CONFLICT_CODE);
  assert.equal(conflict.cause, remoteError);
  assert.equal(isMatchResultConflictError(conflict), true);
  assert.equal(isMatchResultConflictError(remoteError), true);
  assert.equal(isMatchResultConflictError(new Error("otro error")), false);
});
