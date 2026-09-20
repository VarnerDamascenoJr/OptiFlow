import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  createExecutionMetadata,
  createOptimizationHistoryRepository,
  solveScenario
} from "../src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scenarioPath = path.join(__dirname, "..", "data", "scenarios", "small-delivery.json");
const scenario = JSON.parse(fs.readFileSync(scenarioPath, "utf8"));

test("persists and recovers completed optimization runs", function testCompletedRun(t) {
  const directory = createTemporaryDirectory(t);
  const historyFile = path.join(directory, "history.json");
  const repository = createOptimizationHistoryRepository(historyFile);
  const result = solveScenario(scenario, {
    strategy: "exact-enumeration",
    metadata: {
      optimizationRunId: "run-history-demo",
      requestId: "req-history-demo",
      correlationId: "corr-history-demo"
    }
  });

  repository.recordCompletedRun({
    scenario: scenario,
    result: result,
    startedAt: "2026-09-16T10:00:00.000Z",
    finishedAt: "2026-09-16T10:00:01.250Z",
    durationMs: 1250,
    sourcePath: scenarioPath
  });

  const recovered = createOptimizationHistoryRepository(historyFile).getRun("run-history-demo");

  assert.strictEqual(recovered.optimizationRun.status, "SUCCEEDED");
  assert.strictEqual(recovered.optimizationRun.strategy, "exact-enumeration");
  assert.strictEqual(recovered.optimizationRun.durationMs, 1250);
  assert.strictEqual(recovered.optimizationRun.error, null);
  assert.deepStrictEqual(recovered.scenario, scenario);
  assert.deepStrictEqual(recovered.routePlan.routes, result.routes);
  assert.deepStrictEqual(recovered.routePlan.unassignedOrderIds, result.unassignedOrderIds);
  assert.deepStrictEqual(recovered.metrics, result.metrics);
  assert.strictEqual(repository.listRuns().length, 1);
});

test("models scenario, run, route plan and metrics as separate history collections", function testCollections(t) {
  const directory = createTemporaryDirectory(t);
  const historyFile = path.join(directory, "history.json");
  const repository = createOptimizationHistoryRepository(historyFile);
  const result = solveScenario(scenario, {
    metadata: {
      optimizationRunId: "run-history-collections"
    }
  });

  repository.recordCompletedRun({
    scenario: scenario,
    result: result,
    startedAt: "2026-09-16T10:00:00.000Z",
    finishedAt: "2026-09-16T10:00:00.020Z",
    durationMs: 20,
    sourcePath: scenarioPath
  });

  const store = JSON.parse(fs.readFileSync(historyFile, "utf8"));

  assert.strictEqual(store.version, 1);
  assert.strictEqual(store.scenarios.length, 1);
  assert.strictEqual(store.optimizationRuns.length, 1);
  assert.strictEqual(store.routePlans.length, 1);
  assert.strictEqual(store.metrics.length, 1);
  assert.strictEqual(store.optimizationRuns[0].scenarioRecordId, store.scenarios[0].id);
  assert.strictEqual(store.routePlans[0].runId, "run-history-collections");
  assert.strictEqual(store.metrics[0].runId, "run-history-collections");
});

test("finds a stored scenario by scenario id", function testFindScenarioById(t) {
  const directory = createTemporaryDirectory(t);
  const repository = createOptimizationHistoryRepository(path.join(directory, "history.json"));
  const stored = repository.recordScenario({ scenario: scenario });

  assert.deepStrictEqual(repository.findScenarioRecordByScenarioId(scenario.id), stored);
  assert.strictEqual(repository.findScenarioRecordByScenarioId("unknown-scenario"), null);
});

test("persists failed runs with explainable error details", function testFailedRun(t) {
  const directory = createTemporaryDirectory(t);
  const historyFile = path.join(directory, "history.json");
  const repository = createOptimizationHistoryRepository(historyFile);
  const metadata = createExecutionMetadata({
    optimizationRunId: "run-history-failed"
  });

  repository.recordFailedRun({
    scenario: scenario,
    metadata: metadata,
    strategy: "exact-enumeration",
    error: new Error("exact-enumeration exceeded its solver timeout"),
    startedAt: "2026-09-16T10:00:00.000Z",
    finishedAt: "2026-09-16T10:00:00.010Z",
    durationMs: 10,
    sourcePath: scenarioPath
  });

  const recovered = repository.getRun("run-history-failed");

  assert.strictEqual(recovered.optimizationRun.status, "FAILED");
  assert.strictEqual(recovered.optimizationRun.strategy, "exact-enumeration");
  assert.deepStrictEqual(recovered.optimizationRun.error, {
    name: "Error",
    message: "exact-enumeration exceeded its solver timeout"
  });
  assert.deepStrictEqual(recovered.scenario, scenario);
  assert.strictEqual(recovered.routePlan, null);
  assert.strictEqual(recovered.metrics, null);
});

test("reads the versioned optimization history fixture", function testHistoryFixture() {
  const fixturePath = path.join(__dirname, "fixtures", "optimization-history-v1.json");
  const repository = createOptimizationHistoryRepository(fixturePath);
  const recovered = repository.getRun("run-fixture-v1");

  assert.strictEqual(recovered.optimizationRun.status, "SUCCEEDED");
  assert.strictEqual(recovered.optimizationRun.strategy, "nearest-neighbor-capacity");
  assert.strictEqual(recovered.scenario.id, "fixture-scenario-v1");
  assert.strictEqual(recovered.routePlan.routes.length, 1);
  assert.strictEqual(recovered.metrics.totalCost, 0);
});

function createTemporaryDirectory(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "optiflow-history-"));

  t.after(function cleanup() {
    fs.rmSync(directory, { recursive: true, force: true });
  });

  return directory;
}
