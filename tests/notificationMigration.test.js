import assert from "node:assert/strict";
import { existsSync, globSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const sourceFiles = globSync(
  ["app/**/*.{js,jsx,ts,tsx}", "src/**/*.{js,jsx,ts,tsx}"],
  { cwd: projectRoot },
).map((relativePath) => ({
  relativePath,
  source: readFileSync(path.join(projectRoot, relativePath), "utf8"),
}));

test("mantiene eliminado el Toast local y sus consumidores", () => {
  const legacyToastPath = path.join(
    projectRoot,
    "src/components/atomos/Toast.jsx",
  );

  assert.equal(existsSync(legacyToastPath), false);

  for (const { relativePath, source } of sourceFiles) {
    assert.doesNotMatch(
      source,
      /components\/atomos\/Toast|<Toast(?:\s|>)/,
      `Se encontró un Toast local en ${relativePath}`,
    );
  }
});

test("conserva un solo contenedor global de Sileo", () => {
  const countMatches = (pattern) =>
    sourceFiles.reduce(
      (total, { source }) => total + (source.match(pattern) || []).length,
      0,
    );

  assert.equal(countMatches(/<Toaster(?:\s|>)/g), 1);
  assert.equal(countMatches(/<AppToaster(?:\s|>)/g), 1);
});
