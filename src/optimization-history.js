import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const STORE_VERSION = 1;
const DEFAULT_HISTORY_FILE = ".optiflow/optimization-history.json";

export function createOptimizationHistoryRepository(filePath = DEFAULT_HISTORY_FILE) {
  const historyFile = path.resolve(process.cwd(), filePath);

  return {
    filePath: historyFile,
    findScenarioRecordByScenarioId: function findScenarioRecordByScenarioId(scenarioId) {
      return findScenarioRecordByScenarioId(historyFile, scenarioId);
    },
    getScenarioRecord: function getScenarioRecord(scenarioRecordId) {
      return readScenarioRecord(historyFile, scenarioRecordId);
    },
    getRun: function getRun(optimizationRunId) {
      return readRun(historyFile, optimizationRunId);
    },
    listRuns: function listRuns() {
      return readStore(historyFile).optimizationRuns.slice();
    },
    listScenarioRecords: function listScenarioRecords() {
      return readStore(historyFile).scenarios.slice();
    },
    recordCompletedRun: function recordCompletedRun(input) {
      return persistCompletedRun(historyFile, input);
    },
    recordFailedRun: function recordFailedRun(input) {
      return persistFailedRun(historyFile, input);
    },
    recordQueuedRun: function recordQueuedRun(input) {
      return persistQueuedRun(historyFile, input);
    },
    recordRunningRun: function recordRunningRun(input) {
      return persistRunningRun(historyFile, input);
    },
    recordScenario: function recordScenario(input) {
      return persistScenario(historyFile, input);
    }
  };
}

function persistScenario(historyFile, input) {
  assertObject(input, "history input");
  assertObject(input.scenario, "history input.scenario");

  const store = readStore(historyFile);
  const scenarioRecord = buildScenarioRecord(input.scenario, input.sourcePath, input.createdAt);

  upsertScenario(store, scenarioRecord);
  writeStore(historyFile, store);
  return readScenarioRecord(historyFile, scenarioRecord.id);
}

function persistQueuedRun(historyFile, input) {
  assertObject(input, "history input");
  assertObject(input.scenario, "history input.scenario");
  assertObject(input.metadata, "history input.metadata");

  const optimizationRunId = readString(input.metadata.optimizationRunId);

  if (!optimizationRunId) {
    throw new Error("metadata.optimizationRunId is required to persist optimization history");
  }

  const store = readStore(historyFile);
  const existingRun = findRunRecord(store, optimizationRunId);
  const scenarioRecord = buildScenarioRecord(input.scenario, input.sourcePath, input.queuedAt);

  upsertScenario(store, scenarioRecord);
  removeRunArtifacts(store, optimizationRunId);
  store.optimizationRuns.push({
    id: optimizationRunId,
    scenarioRecordId: scenarioRecord.id,
    scenarioId: input.scenario.id,
    status: "QUEUED",
    queuedAt: normalizeTimestamp(input.queuedAt),
    startedAt: existingRun ? existingRun.startedAt : null,
    finishedAt: null,
    strategy: input.strategy,
    error: input.error ? serializeError(input.error) : null,
    durationMs: null,
    attemptCount: readNonNegativeInteger(input.attemptCount, existingRun ? existingRun.attemptCount : 0),
    maxAttempts: readPositiveInteger(input.maxAttempts, existingRun ? existingRun.maxAttempts : 1),
    timeoutMs: readPositiveInteger(input.timeoutMs, existingRun ? existingRun.timeoutMs : null),
    metadata: clone(input.metadata)
  });

  writeStore(historyFile, store);
  return readRun(historyFile, optimizationRunId);
}

function persistRunningRun(historyFile, input) {
  assertObject(input, "history input");
  assertObject(input.scenario, "history input.scenario");
  assertObject(input.metadata, "history input.metadata");

  const optimizationRunId = readString(input.metadata.optimizationRunId);

  if (!optimizationRunId) {
    throw new Error("metadata.optimizationRunId is required to persist optimization history");
  }

  const store = readStore(historyFile);
  const existingRun = findRunRecord(store, optimizationRunId);
  const scenarioRecord = buildScenarioRecord(input.scenario, input.sourcePath, input.startedAt);

  upsertScenario(store, scenarioRecord);
  removeRunArtifacts(store, optimizationRunId);
  store.optimizationRuns.push({
    id: optimizationRunId,
    scenarioRecordId: scenarioRecord.id,
    scenarioId: input.scenario.id,
    status: "RUNNING",
    queuedAt: existingRun ? existingRun.queuedAt : normalizeTimestamp(input.startedAt),
    startedAt: normalizeTimestamp(input.startedAt),
    finishedAt: null,
    strategy: input.strategy,
    error: null,
    durationMs: null,
    attemptCount: readPositiveInteger(input.attemptCount, existingRun ? existingRun.attemptCount + 1 : 1),
    maxAttempts: readPositiveInteger(input.maxAttempts, existingRun ? existingRun.maxAttempts : 1),
    timeoutMs: readPositiveInteger(input.timeoutMs, existingRun ? existingRun.timeoutMs : null),
    metadata: clone(input.metadata)
  });

  writeStore(historyFile, store);
  return readRun(historyFile, optimizationRunId);
}

function persistCompletedRun(historyFile, input) {
  assertObject(input, "history input");
  assertObject(input.scenario, "history input.scenario");
  assertObject(input.result, "history input.result");
  assertObject(input.result.metadata, "history input.result.metadata");

  const optimizationRunId = readString(input.result.metadata.optimizationRunId);

  if (!optimizationRunId) {
    throw new Error("result.metadata.optimizationRunId is required to persist optimization history");
  }

  const scenarioRecord = buildScenarioRecord(input.scenario, input.sourcePath, input.startedAt);
  const finishedAt = normalizeTimestamp(input.finishedAt);
  const startedAt = normalizeTimestamp(input.startedAt);
  const durationMs = normalizeDurationMs(input.durationMs, startedAt, finishedAt);
  const store = readStore(historyFile);
  const existingRun = findRunRecord(store, optimizationRunId);

  upsertScenario(store, scenarioRecord);
  removeRunArtifacts(store, optimizationRunId);
  store.optimizationRuns.push({
    id: optimizationRunId,
    scenarioRecordId: scenarioRecord.id,
    scenarioId: input.scenario.id,
    status: "SUCCEEDED",
    queuedAt: existingRun ? existingRun.queuedAt : startedAt,
    startedAt: startedAt,
    finishedAt: finishedAt,
    strategy: input.result.strategy,
    error: null,
    durationMs: durationMs,
    attemptCount: readPositiveInteger(input.attemptCount, existingRun ? existingRun.attemptCount : 1),
    maxAttempts: readPositiveInteger(input.maxAttempts, existingRun ? existingRun.maxAttempts : 1),
    timeoutMs: readPositiveInteger(input.timeoutMs, existingRun ? existingRun.timeoutMs : null),
    metadata: clone(input.result.metadata)
  });
  store.routePlans.push({
    runId: optimizationRunId,
    scenarioId: input.scenario.id,
    strategy: input.result.strategy,
    routes: clone(input.result.routes),
    unassignedOrderIds: clone(input.result.unassignedOrderIds),
    unassignedOrderDetails: clone(input.result.unassignedOrderDetails || [])
  });
  store.metrics.push({
    runId: optimizationRunId,
    scenarioId: input.scenario.id,
    values: clone(input.result.metrics)
  });

  writeStore(historyFile, store);
  return readRun(historyFile, optimizationRunId);
}

function persistFailedRun(historyFile, input) {
  assertObject(input, "history input");
  assertObject(input.scenario, "history input.scenario");
  assertObject(input.metadata, "history input.metadata");

  const optimizationRunId = readString(input.metadata.optimizationRunId);

  if (!optimizationRunId) {
    throw new Error("metadata.optimizationRunId is required to persist optimization history");
  }

  const scenarioRecord = buildScenarioRecord(input.scenario, input.sourcePath, input.startedAt);
  const finishedAt = normalizeTimestamp(input.finishedAt);
  const startedAt = normalizeTimestamp(input.startedAt);
  const durationMs = normalizeDurationMs(input.durationMs, startedAt, finishedAt);
  const store = readStore(historyFile);
  const existingRun = findRunRecord(store, optimizationRunId);

  upsertScenario(store, scenarioRecord);
  removeRunArtifacts(store, optimizationRunId);
  store.optimizationRuns.push({
    id: optimizationRunId,
    scenarioRecordId: scenarioRecord.id,
    scenarioId: input.scenario.id,
    status: "FAILED",
    queuedAt: existingRun ? existingRun.queuedAt : startedAt,
    startedAt: startedAt,
    finishedAt: finishedAt,
    strategy: input.strategy,
    error: serializeError(input.error),
    durationMs: durationMs,
    attemptCount: readPositiveInteger(input.attemptCount, existingRun ? existingRun.attemptCount : 1),
    maxAttempts: readPositiveInteger(input.maxAttempts, existingRun ? existingRun.maxAttempts : 1),
    timeoutMs: readPositiveInteger(input.timeoutMs, existingRun ? existingRun.timeoutMs : null),
    metadata: clone(input.metadata)
  });

  writeStore(historyFile, store);
  return readRun(historyFile, optimizationRunId);
}

function readScenarioRecord(historyFile, scenarioRecordId) {
  const store = readStore(historyFile);
  const scenarioRecord = store.scenarios.find(function findScenario(candidate) {
    return candidate.id === scenarioRecordId;
  });

  return scenarioRecord ? clone(scenarioRecord) : null;
}

function findScenarioRecordByScenarioId(historyFile, scenarioId) {
  const matches = readStore(historyFile).scenarios.filter(function findScenario(candidate) {
    return candidate.scenarioId === scenarioId;
  });

  if (matches.length === 0) {
    return null;
  }

  return clone(matches[matches.length - 1]);
}

function findRunRecord(store, optimizationRunId) {
  return store.optimizationRuns.find(function findRun(candidate) {
    return candidate.id === optimizationRunId;
  });
}

function readRun(historyFile, optimizationRunId) {
  const store = readStore(historyFile);
  const run = store.optimizationRuns.find(function findRun(candidate) {
    return candidate.id === optimizationRunId;
  });

  if (!run) {
    return null;
  }

  const scenarioRecord = store.scenarios.find(function findScenario(candidate) {
    return candidate.id === run.scenarioRecordId;
  });
  const routePlan = store.routePlans.find(function findRoutePlan(candidate) {
    return candidate.runId === run.id;
  });
  const metrics = store.metrics.find(function findMetrics(candidate) {
    return candidate.runId === run.id;
  });

  return {
    optimizationRun: clone(run),
    scenario: scenarioRecord ? clone(scenarioRecord.payload) : null,
    scenarioRecord: scenarioRecord ? clone(scenarioRecord) : null,
    routePlan: routePlan ? clone(routePlan) : null,
    metrics: metrics ? clone(metrics.values) : null
  };
}

function buildScenarioRecord(scenario, sourcePath, timestamp) {
  const payload = clone(scenario);
  const contentHash = hashJson(payload);

  return {
    id: "scenario_" + contentHash.slice(0, 16),
    scenarioId: scenario.id,
    name: typeof scenario.name === "string" ? scenario.name : null,
    contentHash: contentHash,
    sourcePath: sourcePath ? path.resolve(process.cwd(), sourcePath) : null,
    createdAt: normalizeTimestamp(timestamp),
    payload: payload
  };
}

function upsertScenario(store, scenarioRecord) {
  const existingIndex = store.scenarios.findIndex(function findScenario(candidate) {
    return candidate.id === scenarioRecord.id;
  });

  if (existingIndex === -1) {
    store.scenarios.push(scenarioRecord);
    return;
  }

  store.scenarios[existingIndex] = {
    ...store.scenarios[existingIndex],
    ...scenarioRecord,
    createdAt: store.scenarios[existingIndex].createdAt
  };
}

function removeRunArtifacts(store, optimizationRunId) {
  store.optimizationRuns = store.optimizationRuns.filter(function keepRun(run) {
    return run.id !== optimizationRunId;
  });
  store.routePlans = store.routePlans.filter(function keepRoutePlan(routePlan) {
    return routePlan.runId !== optimizationRunId;
  });
  store.metrics = store.metrics.filter(function keepMetrics(metrics) {
    return metrics.runId !== optimizationRunId;
  });
}

function readStore(historyFile) {
  if (!fs.existsSync(historyFile)) {
    return createEmptyStore();
  }

  const store = JSON.parse(fs.readFileSync(historyFile, "utf8"));

  if (store.version !== STORE_VERSION) {
    throw new Error("Unsupported optimization history version: " + store.version);
  }

  return {
    version: STORE_VERSION,
    scenarios: Array.isArray(store.scenarios) ? store.scenarios : [],
    optimizationRuns: Array.isArray(store.optimizationRuns) ? store.optimizationRuns : [],
    routePlans: Array.isArray(store.routePlans) ? store.routePlans : [],
    metrics: Array.isArray(store.metrics) ? store.metrics : []
  };
}

function writeStore(historyFile, store) {
  fs.mkdirSync(path.dirname(historyFile), { recursive: true });
  const temporaryFile = historyFile + "." + process.pid + "." + Date.now() + ".tmp";
  fs.writeFileSync(temporaryFile, JSON.stringify(store, null, 2) + "\n");
  fs.renameSync(temporaryFile, historyFile);
}

function createEmptyStore() {
  return {
    version: STORE_VERSION,
    scenarios: [],
    optimizationRuns: [],
    routePlans: [],
    metrics: []
  };
}

function serializeError(error) {
  if (!error) {
    return null;
  }

  return {
    name: typeof error.name === "string" ? error.name : "Error",
    message: typeof error.message === "string" ? error.message : String(error)
  };
}

function normalizeTimestamp(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string" && value.length > 0) {
    return new Date(value).toISOString();
  }

  return new Date().toISOString();
}

function normalizeDurationMs(value, startedAt, finishedAt) {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.round(value * 1000) / 1000;
  }

  return Math.max(0, new Date(finishedAt).getTime() - new Date(startedAt).getTime());
}

function hashJson(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertObject(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(label + " must be an object");
  }
}

function readString(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readPositiveInteger(value, fallback) {
  if (Number.isInteger(value) && value > 0) {
    return value;
  }

  return fallback;
}

function readNonNegativeInteger(value, fallback) {
  if (Number.isInteger(value) && value >= 0) {
    return value;
  }

  return fallback;
}
