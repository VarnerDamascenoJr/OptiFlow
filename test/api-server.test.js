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

async function startTestServer(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "optiflow-api-"));
  const historyFile = path.join(directory, "history.json");
  const server = createOptiFlowApiServer({ historyFile: historyFile });

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
