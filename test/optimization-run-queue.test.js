import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createExecutionMetadata, createOptimizationHistoryRepository, solveScenario } from "../src/index.js";
import { createOptimizationRunQueue } from "../src/optimization-run-queue.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scenarioPath = path.join(__dirname, "..", "data", "scenarios", "small-delivery.json");
const scenario = JSON.parse(fs.readFileSync(scenarioPath, "utf8"));

test("queues, runs and completes optimization jobs outside the request path", async function testSuccessfulJob(t) {
  const repository = createTemporaryRepository(t);
  const queue = createOptimizationRunQueue({
    repository: repository,
    solve: solveScenario
  });

  const queued = queue.enqueue({
    metadata: createExecutionMetadata({
      optimizationRunId: "run-queue-success"
    }),
    scenario: scenario,
    strategy: "nearest-neighbor-capacity"
  });

  assert.strictEqual(queued.optimizationRun.status, "QUEUED");
  assert.strictEqual(queued.routePlan, null);
  assert.strictEqual(queued.metrics, null);

  await queue.onIdle();

  const recovered = repository.getRun("run-queue-success");
  assert.strictEqual(recovered.optimizationRun.status, "SUCCEEDED");
  assert.strictEqual(recovered.optimizationRun.attemptCount, 1);
  assert.strictEqual(recovered.metrics.totalCost, 792);
});

test("retries a failed job before succeeding", async function testRetry(t) {
  const repository = createTemporaryRepository(t);
  let calls = 0;
  const queue = createOptimizationRunQueue({
    defaultMaxAttempts: 2,
    repository: repository,
    solve: function solveWithTransientFailure(inputScenario, options) {
      calls += 1;

      if (calls === 1) {
        throw new Error("temporary solver failure");
      }

      return solveScenario(inputScenario, options);
    }
  });

  queue.enqueue({
    metadata: createExecutionMetadata({
      optimizationRunId: "run-queue-retry"
    }),
    scenario: scenario,
    strategy: "nearest-neighbor-capacity"
  });

  await queue.onIdle();

  const recovered = repository.getRun("run-queue-retry");
  assert.strictEqual(calls, 2);
  assert.strictEqual(recovered.optimizationRun.status, "SUCCEEDED");
  assert.strictEqual(recovered.optimizationRun.attemptCount, 2);
  assert.strictEqual(recovered.optimizationRun.maxAttempts, 2);
});

test("persists an explainable failure after attempts are exhausted", async function testFailure(t) {
  const repository = createTemporaryRepository(t);
  const queue = createOptimizationRunQueue({
    defaultMaxAttempts: 2,
    repository: repository,
    solve: function alwaysFail() {
      throw new Error("permanent solver failure");
    }
  });

  queue.enqueue({
    metadata: createExecutionMetadata({
      optimizationRunId: "run-queue-failed"
    }),
    scenario: scenario,
    strategy: "nearest-neighbor-capacity"
  });

  await queue.onIdle();

  const recovered = repository.getRun("run-queue-failed");
  assert.strictEqual(recovered.optimizationRun.status, "FAILED");
  assert.strictEqual(recovered.optimizationRun.attemptCount, 2);
  assert.strictEqual(recovered.optimizationRun.error.message, "permanent solver failure");
  assert.strictEqual(recovered.routePlan, null);
  assert.strictEqual(recovered.metrics, null);
});

test("persists timeout failures", async function testTimeout(t) {
  const repository = createTemporaryRepository(t);
  const queue = createOptimizationRunQueue({
    defaultTimeoutMs: 1,
    repository: repository,
    solve: function slowSolve(inputScenario, options) {
      const started = Date.now();

      while (Date.now() - started <= 2) {
        // Force a tiny deterministic timeout without external timers.
      }

      return solveScenario(inputScenario, options);
    }
  });

  queue.enqueue({
    metadata: createExecutionMetadata({
      optimizationRunId: "run-queue-timeout"
    }),
    scenario: scenario,
    strategy: "nearest-neighbor-capacity"
  });

  await queue.onIdle();

  const recovered = repository.getRun("run-queue-timeout");
  assert.strictEqual(recovered.optimizationRun.status, "FAILED");
  assert.match(recovered.optimizationRun.error.message, /exceeded timeout/);
});

function createTemporaryRepository(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "optiflow-queue-"));
  const repository = createOptimizationHistoryRepository(path.join(directory, "history.json"));

  t.after(function cleanup() {
    fs.rmSync(directory, { recursive: true, force: true });
  });

  return repository;
}
