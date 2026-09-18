import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createOptiFlowApiServer } from "../src/api-server.js";

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

async function startTestServer(t, options = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "optiflow-api-"));
  const historyFile = path.join(directory, "history.json");
  const server = createOptiFlowApiServer({
    environment: "test",
    historyFile: historyFile,
    logger: options.logger || {
      info: function info() {}
    },
    serviceName: "optiflow-api"
  });

  await new Promise(function listen(resolve) {
    server.listen(0, "127.0.0.1", resolve);
  });

  t.after(function cleanup() {
    server.close();
    fs.rmSync(directory, { recursive: true, force: true });
  });

  const address = server.address();
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
