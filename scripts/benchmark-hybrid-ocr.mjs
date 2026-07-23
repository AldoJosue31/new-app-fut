import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const VALID_DOCUMENT_TYPES = new Set(["cedula", "rol"]);

const isPlainObject = value => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

export const normalizeBenchmarkValue = value => {
  if (typeof value === "string") {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean" || value === null) return value;
  return value === undefined ? null : String(value);
};

const canonicalize = value => {
  if (Array.isArray(value)) {
    return value.map(canonicalize).sort((left, right) => (
      JSON.stringify(left).localeCompare(JSON.stringify(right))
    ));
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map(key => [key, canonicalize(value[key])]),
    );
  }
  return normalizeBenchmarkValue(value);
};

const canonicalKey = value => JSON.stringify(canonicalize(value));

const readPath = (value, path) => path.reduce(
  (current, segment) => current?.[segment],
  value,
);

const collectExpectedMetrics = (expected, path = [], metrics = []) => {
  if (Array.isArray(expected)) {
    metrics.push({ kind: "collection", path, expected });
    return metrics;
  }
  if (isPlainObject(expected)) {
    for (const [key, value] of Object.entries(expected)) {
      collectExpectedMetrics(value, [...path, key], metrics);
    }
    return metrics;
  }
  metrics.push({ kind: "field", path, expected });
  return metrics;
};

const matchesExpectedShape = (expected, actual) => {
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || expected.length !== actual.length) return false;
    return multisetIntersection(expected, actual) === expected.length;
  }
  if (isPlainObject(expected)) {
    return isPlainObject(actual) && Object.entries(expected).every(
      ([key, value]) => matchesExpectedShape(value, actual[key]),
    );
  }
  return canonicalKey(expected) === canonicalKey(actual);
};

const multisetIntersection = (expected, actual) => {
  const actualOwner = new Array(actual.length).fill(-1);

  const assign = (expectedIndex, visited) => {
    for (let actualIndex = 0; actualIndex < actual.length; actualIndex += 1) {
      if (visited.has(actualIndex) || !matchesExpectedShape(expected[expectedIndex], actual[actualIndex])) {
        continue;
      }
      visited.add(actualIndex);
      if (actualOwner[actualIndex] === -1 || assign(actualOwner[actualIndex], visited)) {
        actualOwner[actualIndex] = expectedIndex;
        return true;
      }
    }
    return false;
  };

  return expected.reduce(
    (matches, _value, index) => matches + Number(assign(index, new Set())),
    0,
  );
};

const percentile = (values, ratio) => {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.ceil(ratio * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
};

const round = value => Number(value.toFixed(4));
const rate = (numerator, denominator) => denominator ? round(numerator / denominator) : null;

const emptyBucket = type => ({
  type,
  documents: 0,
  successfulDocuments: 0,
  exactDocuments: 0,
  expectedFields: 0,
  correctFields: 0,
  expectedItems: 0,
  actualItems: 0,
  matchedItems: 0,
  fallbackDocuments: 0,
  providerCounts: {},
  pipelineCounts: {},
  durations: [],
});

const finalizeBucket = bucket => {
  const collectionPrecision = rate(bucket.matchedItems, bucket.actualItems);
  const collectionRecall = rate(bucket.matchedItems, bucket.expectedItems);
  const collectionF1 = collectionPrecision !== null
    && collectionRecall !== null
    && collectionPrecision + collectionRecall > 0
    ? round((2 * collectionPrecision * collectionRecall) / (collectionPrecision + collectionRecall))
    : bucket.expectedItems === 0 && bucket.actualItems === 0 ? 1 : 0;

  return {
    type: bucket.type,
    documents: bucket.documents,
    successRate: rate(bucket.successfulDocuments, bucket.documents),
    exactDocumentRate: rate(bucket.exactDocuments, bucket.documents),
    fieldAccuracy: rate(bucket.correctFields, bucket.expectedFields),
    collectionPrecision,
    collectionRecall,
    collectionF1,
    fallbackRate: rate(bucket.fallbackDocuments, bucket.documents),
    latencyMs: {
      p50: percentile(bucket.durations, 0.5),
      p95: percentile(bucket.durations, 0.95),
    },
    providerCounts: bucket.providerCounts,
    pipelineCounts: bucket.pipelineCounts,
  };
};

const validateSample = (sample, index) => {
  if (!isPlainObject(sample)) throw new TypeError(`Muestra ${index + 1}: debe ser un objeto.`);
  if (!VALID_DOCUMENT_TYPES.has(sample.type)) {
    throw new TypeError(`Muestra ${index + 1}: type debe ser "cedula" o "rol".`);
  }
  if (!isPlainObject(sample.expected)) {
    throw new TypeError(`Muestra ${index + 1}: expected debe ser un objeto.`);
  }
  if (sample.actual !== null && sample.actual !== undefined && !isPlainObject(sample.actual)) {
    throw new TypeError(`Muestra ${index + 1}: actual debe ser un objeto o null.`);
  }
};

export const evaluateHybridOcrSamples = samples => {
  if (!Array.isArray(samples) || !samples.length) {
    throw new TypeError("El benchmark requiere al menos una muestra.");
  }

  const buckets = new Map([
    ["all", emptyBucket("all")],
    ["cedula", emptyBucket("cedula")],
    ["rol", emptyBucket("rol")],
  ]);

  samples.forEach((sample, index) => {
    validateSample(sample, index);
    const activeBuckets = [buckets.get("all"), buckets.get(sample.type)];
    const actual = isPlainObject(sample.actual) ? sample.actual : null;
    const metrics = collectExpectedMetrics(sample.expected);
    let documentExact = Boolean(actual);

    for (const bucket of activeBuckets) {
      bucket.documents += 1;
      if (actual) bucket.successfulDocuments += 1;
      if (sample.meta?.fallbackUsed === true) bucket.fallbackDocuments += 1;
      const provider = String(sample.meta?.provider || "unknown");
      bucket.providerCounts[provider] = (bucket.providerCounts[provider] || 0) + 1;
      const ocrProvider = String(sample.meta?.ocrProvider || "").trim();
      const pipeline = ocrProvider && ocrProvider !== provider
        ? `${ocrProvider}->${provider}`
        : provider;
      bucket.pipelineCounts[pipeline] = (bucket.pipelineCounts[pipeline] || 0) + 1;
      const durationMs = Number(sample.meta?.durationMs);
      if (Number.isFinite(durationMs) && durationMs >= 0) bucket.durations.push(durationMs);
    }

    for (const metric of metrics) {
      const actualValue = actual ? readPath(actual, metric.path) : undefined;
      if (metric.kind === "field") {
        const correct = canonicalKey(metric.expected) === canonicalKey(actualValue);
        if (!correct) documentExact = false;
        for (const bucket of activeBuckets) {
          bucket.expectedFields += 1;
          if (correct) bucket.correctFields += 1;
        }
        continue;
      }

      const actualItems = Array.isArray(actualValue) ? actualValue : [];
      const matchedItems = multisetIntersection(metric.expected, actualItems);
      if (matchedItems !== metric.expected.length || actualItems.length !== metric.expected.length) {
        documentExact = false;
      }
      for (const bucket of activeBuckets) {
        bucket.expectedItems += metric.expected.length;
        bucket.actualItems += actualItems.length;
        bucket.matchedItems += matchedItems;
      }
    }

    if (documentExact) {
      for (const bucket of activeBuckets) bucket.exactDocuments += 1;
    }
  });

  return {
    generatedAt: new Date().toISOString(),
    overall: finalizeBucket(buckets.get("all")),
    byType: {
      cedula: finalizeBucket(buckets.get("cedula")),
      rol: finalizeBucket(buckets.get("rol")),
    },
  };
};

export const parseBenchmarkDataset = (contents, source = "dataset") => {
  const trimmed = String(contents || "").trim();
  if (!trimmed) throw new TypeError(`${source}: el archivo esta vacio.`);

  if (trimmed.startsWith("[")) {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) throw new TypeError(`${source}: se esperaba un arreglo JSON.`);
    return parsed;
  }

  return trimmed.split(/\r?\n/).filter(Boolean).map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new SyntaxError(`${source}:${index + 1}: JSON invalido (${error.message}).`);
    }
  });
};

export const formatBenchmarkReport = report => {
  const formatRate = value => value === null ? "n/a" : `${(value * 100).toFixed(1)}%`;
  const formatLatency = value => value === null ? "n/a" : `${value} ms`;
  const rows = [report.overall, report.byType.cedula, report.byType.rol];
  const lines = [
    "tipo       docs  exito   exactos  campos  items F1  fallback  p50       p95",
  ];
  for (const row of rows) {
    lines.push([
      row.type.padEnd(10),
      String(row.documents).padStart(4),
      formatRate(row.successRate).padStart(7),
      formatRate(row.exactDocumentRate).padStart(8),
      formatRate(row.fieldAccuracy).padStart(7),
      formatRate(row.collectionF1).padStart(8),
      formatRate(row.fallbackRate).padStart(9),
      formatLatency(row.latencyMs.p50).padStart(9),
      formatLatency(row.latencyMs.p95).padStart(9),
    ].join("  "));
  }
  lines.push(`proveedores: ${JSON.stringify(report.overall.providerCounts)}`);
  lines.push(`pipelines: ${JSON.stringify(report.overall.pipelineCounts)}`);
  return lines.join("\n");
};

const isMain = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const [datasetPath, outputFlag] = process.argv.slice(2);
  if (!datasetPath) {
    console.error("Uso: node scripts/benchmark-hybrid-ocr.mjs <dataset.json|dataset.jsonl> [--json]");
    process.exitCode = 2;
  } else {
    try {
      const samples = parseBenchmarkDataset(await readFile(datasetPath, "utf8"), datasetPath);
      const report = evaluateHybridOcrSamples(samples);
      console.log(outputFlag === "--json" ? JSON.stringify(report, null, 2) : formatBenchmarkReport(report));
    } catch (error) {
      console.error(error?.message || error);
      process.exitCode = 1;
    }
  }
}
