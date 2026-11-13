import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createOptiFlowApplication } from "../src/api-server.js";
import { createOptimizationHistoryRepository, solveScenario } from "../src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scenarioPath = path.join(__dirname, "..", "data", "scenarios", "small-delivery.json");
const scenario = JSON.parse(fs.readFileSync(scenarioPath, "utf8"));

test("validates, creates, queues and retrieves optimization history over HTTP", async function testApiFlow(t) {
  const client = await startTestServer(t);

  const validation = await client.post("/scenarios/validate", { scenario: scenario });
  assert.strictEqual(validation.status, 200);
  assert.strictEqual(validation.body.valid, true);
  assert.strictEqual(validation.body.scenarioId, "small-delivery-v1");

  const createdScenario = await client.post("/scenarios", { scenario: scenario });
  assert.strictEqual(createdScenario.status, 201);
  assert.strictEqual(createdScenario.body.scenarioId, "small-delivery-v1");
  assert.match(createdScenario.body.scenarioRecordId, /^scenario_/);

  const createdRun = await client.post("/optimization-runs", {
    metadata: {
      optimizationRunId: "run-api-flow",
      requestId: "req-api-flow",
      correlationId: "corr-api-flow"
    },
    scenarioRecordId: createdScenario.body.scenarioRecordId,
    strategy: "exact-enumeration"
  });
  assert.strictEqual(createdRun.status, 202);
  assert.strictEqual(createdRun.body.optimizationRun.id, "run-api-flow");
  assert.strictEqual(createdRun.body.optimizationRun.status, "QUEUED");
  assert.strictEqual(createdRun.body.optimizationRun.strategy, "exact-enumeration");
  assert.strictEqual(createdRun.body.metrics, null);

  const recoveredRun = await waitForRunStatus(client, "run-api-flow", "SUCCEEDED");
  assert.strictEqual(recoveredRun.status, 200);
  assert.strictEqual(recoveredRun.body.optimizationRun.id, "run-api-flow");
  assert.strictEqual(recoveredRun.body.routePlan.routes.length, 2);
  assert.strictEqual(recoveredRun.body.metrics.totalCost, 744);

  const metrics = await client.getText("/metrics");
  assert.strictEqual(metrics.status, 200);
  assert.match(metrics.body, /optiflow_optimization_runs_total\{.*status="succeeded".*strategy="exact-enumeration".*\} 1/);
  assert.match(metrics.body, /optiflow_optimization_run_duration_seconds\{.*scenario_id="small-delivery-v1".*\}/);
  assert.match(metrics.body, /optiflow_optimization_plan_cost\{.*strategy="exact-enumeration".*\} 744/);
  assert.match(metrics.body, /optiflow_optimization_plan_distance\{.*strategy="exact-enumeration".*\} 61/);
  assert.match(metrics.body, /optiflow_optimization_plan_late_minutes\{.*strategy="exact-enumeration".*\} 0/);
  assert.match(metrics.body, /optiflow_optimization_plan_unassigned_orders\{.*strategy="exact-enumeration".*\} 1/);
  assert.match(metrics.body, /optiflow_optimization_queue_depth\{.*service="optiflow-api".*\} 0/);
});

test("persists failed asynchronous optimization runs", async function testFailedAsyncRun(t) {
  const client = await startTestServer(t);
  const createdRun = await client.post("/optimization-runs", {
    metadata: {
      optimizationRunId: "run-api-failed"
    },
    scenario: scenario,
    solver: {
      maxOrders: 1
    },
    strategy: "exact-enumeration"
  });

  assert.strictEqual(createdRun.status, 202);
  assert.strictEqual(createdRun.body.optimizationRun.status, "QUEUED");

  const recoveredRun = await waitForRunStatus(client, "run-api-failed", "FAILED");

  assert.strictEqual(recoveredRun.body.optimizationRun.error.message, "exact-enumeration supports at most 1 orders; received 4");
  assert.strictEqual(recoveredRun.body.routePlan, null);
  assert.strictEqual(recoveredRun.body.metrics, null);
});

test("queues OR-Tools and persists its solution status and bound over HTTP", async function testOrToolsApi(t) {
  const client = await startTestServer(t);
  const queued = await client.post("/optimization-runs", {
    metadata: { optimizationRunId: "run-api-or-tools" },
    scenario: scenario,
    strategy: "or-tools",
    solver: { timeoutMs: 3000 },
    timeoutMs: 15000
  });
  assert.strictEqual(queued.status, 202);
  const recovered = await waitForRunStatus(client, "run-api-or-tools", "SUCCEEDED");
  assert.strictEqual(recovered.body.optimizationRun.status, "SUCCEEDED");
  assert.strictEqual(recovered.body.metrics.totalCost, 744);
  assert.strictEqual(recovered.body.routePlan.solverInfo.status, "OPTIMAL");
  assert.strictEqual(recovered.body.routePlan.solverInfo.bestObjectiveBound, 744);
});

test("returns standardized validation errors", async function testValidationError(t) {
  const client = await startTestServer(t);
  const invalidScenario = structuredClone(scenario);
  invalidScenario.orders[0].demand = 999;
  const response = await client.post("/scenarios/validate", { scenario: invalidScenario });

  assert.strictEqual(response.status, 422);
  assert.deepStrictEqual(response.body.error, {
    code: "validation_failed",
    message: "orders[0] demand exceeds every vehicle capacity",
    details: null
  });
});

test("returns standardized JSON parse errors", async function testInvalidJson(t) {
  const client = await startTestServer(t);
  const response = await fetch(client.url("/scenarios"), {
    body: "{not-json",
    headers: {
      "content-type": "application/json"
    },
    method: "POST"
  });
  const body = await response.json();

  assert.strictEqual(response.status, 400);
  assert.strictEqual(body.error.code, "invalid_json");
});

test("serves the scenario interface assets", async function testInterfaceAssets(t) {
  const client = await startTestServer(t);
  const home = await fetch(client.url("/"));
  const script = await fetch(client.url("/app.js"));
  const styles = await fetch(client.url("/app.css"));

  assert.strictEqual(home.status, 200);
  assert.match(await home.text(), /OptiFlow Scenario Console/);
  assert.strictEqual(script.status, 200);
  assert.match(await script.text(), /runComparison/);
  assert.strictEqual(styles.status, 200);
  assert.match(await styles.text(), /metric-grid/);
});

test("logs optimization execution lifecycle with correlation metadata", async function testOptimizationLogs(t) {
  const events = [];
  const client = await startTestServer(t, {
    logger: {
      info: function info(payload) {
        events.push(payload);
      }
    }
  });

  const createdRun = await client.post("/optimization-runs", {
    metadata: {
      optimizationRunId: "run-api-logs",
      requestId: "req-api-logs",
      correlationId: "corr-api-logs",
      transactionId: "txn-api-logs"
    },
    scenario: scenario,
    strategy: "nearest-neighbor-capacity"
  });

  assert.strictEqual(createdRun.status, 202);
  await waitForRunStatus(client, "run-api-logs", "SUCCEEDED");

  assert.deepStrictEqual(
    events.map(function mapEvent(event) {
      return event.event;
    }),
    [
      "optimization_run_queued",
      "optimization_run_started",
      "optimization_run_succeeded"
    ]
  );
  assert.deepStrictEqual(events[2], {
    event: "optimization_run_succeeded",
    service: "optiflow-api",
    environment: "test",
    optimization_run_id: "run-api-logs",
    request_id: "req-api-logs",
    correlation_id: "corr-api-logs",
    transaction_id: "txn-api-logs",
    scenario_id: "small-delivery-v1",
    strategy: "nearest-neighbor-capacity",
    status: "SUCCEEDED",
    attempt_count: 1,
    max_attempts: 1,
    duration_ms: events[2].duration_ms,
    total_cost: 792,
    total_distance: 73,
    total_late_minutes: 0,
    unassigned_orders: 1,
    error: null
  });
  assert.strictEqual(typeof events[2].duration_ms, "number");
});

test("preserves health and not-found responses through NestJS routing", async function testRouting(t) {
  const client = await startTestServer(t);
  assert.deepStrictEqual(await client.get("/health"), {
    status: 200,
    body: { status: "ok", service: "optiflow-api" }
  });

  for (const [pathname, code] of [
    ["/missing", "not_found"],
    ["/scenarios/missing", "scenario_not_found"],
    ["/optimization-runs/missing", "optimization_run_not_found"]
  ]) {
    const response = await client.get(pathname);
    assert.strictEqual(response.status, 404);
    assert.strictEqual(response.body.error.code, code);
    assert.strictEqual(response.body.error.details, null);
  }

  const missingScenario = await client.post("/optimization-runs", { scenarioRecordId: "missing" });
  assert.strictEqual(missingScenario.status, 404);
  assert.strictEqual(missingScenario.body.error.code, "scenario_not_found");
});

test("keeps bounded JSON parsing and does not enable Express form parsing", async function testBodyLimit(t) {
  const client = await startTestServer(t, { bodyLimitBytes: 32 });
  const oversized = await client.post("/scenarios", { payload: "x".repeat(64) });
  assert.strictEqual(oversized.status, 413);
  assert.strictEqual(oversized.body.error.code, "body_too_large");

  const form = await fetch(client.url("/scenarios"), {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "id=not-json"
  });
  assert.strictEqual(form.status, 400);
  assert.strictEqual((await form.json()).error.code, "invalid_json");
});

test("shares the injected repository between scenario and execution modules and retries the injected solver", async function testInjection(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "optiflow-injected-history-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const repository = createOptimizationHistoryRepository(path.join(directory, "history.json"));
  let attempts = 0;
  const client = await startTestServer(t, {
    repository,
    defaultMaxAttempts: 2,
    solve(input, options) {
      attempts += 1;
      if (attempts === 1) throw new Error("transient solver failure");
      return solveScenario(input, options);
    }
  });
  const created = await client.post("/scenarios", scenario);
  const recordId = created.body.scenarioRecordId;
  assert.strictEqual(repository.getScenarioRecord(recordId).scenarioId, scenario.id);
  assert.strictEqual((await client.get("/scenarios/" + recordId)).body.scenarioRecordId, recordId);

  const queued = await client.post("/optimization-runs", {
    scenarioRecordId: recordId,
    metadata: { optimizationRunId: "run-injected" }
  });
  assert.strictEqual(queued.status, 202);
  const completed = await waitForRunStatus(client, "run-injected", "SUCCEEDED");
  assert.strictEqual(completed.body.optimizationRun.attemptCount, 2);
  assert.strictEqual(completed.body.metrics.totalCost, 792);
  assert.strictEqual(repository.getRun("run-injected").metrics.totalCost, 792);
  assert.strictEqual(attempts, 2);
});

test("preserves the error envelope for unexpected dependency failures", async function testDependencyFailure(t) {
  const client = await startTestServer(t, {
    repository: { getScenarioRecord() { throw new Error("repository unavailable"); } }
  });
  const response = await client.get("/scenarios/missing");
  assert.deepStrictEqual(response, {
    status: 500,
    body: { error: {
      code: "internal_error",
      message: "Unexpected API error",
      details: { message: "repository unavailable" }
    } }
  });
});

test("awaits the injected queue before completing application shutdown", async function testShutdown() {
  let releaseQueue;
  let draining = false;
  const app = await createOptiFlowApplication({
    repository: {},
    runQueue: {
      onIdle() {
        draining = true;
        return new Promise(resolve => { releaseQueue = resolve; });
      }
    }
  });
  let closed = false;
  const closing = app.close().then(() => { closed = true; });
  for (let attempt = 0; attempt < 100 && !draining; attempt += 1) {
    await new Promise(resolve => setImmediate(resolve));
  }
  assert.strictEqual(draining, true);
  assert.strictEqual(closed, false);
  releaseQueue();
  await closing;
  assert.strictEqual(closed, true);
});

async function startTestServer(t, options = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "optiflow-api-"));
  const historyFile = path.join(directory, "history.json");
  const app = await createOptiFlowApplication({
    ...options,
    environment: "test",
    historyFile: historyFile,
    logger: options.logger || {
      info: function info() {}
    },
    serviceName: "optiflow-api"
  });

  await app.listen(0, "127.0.0.1");

  t.after(async function cleanup() {
    await app.close();
    fs.rmSync(directory, { recursive: true, force: true });
  });

  const address = app.getHttpServer().address();
  const baseUrl = "http://" + address.address + ":" + address.port;

  return {
    get: function get(pathname) {
      return request(baseUrl + pathname);
    },
    getText: function getText(pathname) {
      return requestText(baseUrl + pathname);
    },
    post: function post(pathname, body) {
      return request(baseUrl + pathname, {
        body: JSON.stringify(body),
        headers: {
          "content-type": "application/json"
        },
        method: "POST"
      });
    },
    url: function url(pathname) {
      return baseUrl + pathname;
    }
  };
}

async function request(url, options) {
  const response = await fetch(url, options);

  return {
    status: response.status,
    body: await response.json()
  };
}

async function requestText(url, options) {
  const response = await fetch(url, options);

  return {
    status: response.status,
    body: await response.text()
  };
}

async function waitForRunStatus(client, optimizationRunId, expectedStatus) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const response = await client.get("/optimization-runs/" + optimizationRunId);

    if (response.body.optimizationRun.status === expectedStatus) {
      return response;
    }

    await new Promise(function delay(resolve) {
      setTimeout(resolve, 5);
    });
  }

  return client.get("/optimization-runs/" + optimizationRunId);
}
