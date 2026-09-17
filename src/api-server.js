import http from "node:http";
import { performance } from "node:perf_hooks";
import createExecutionMetadata from "./execution-metadata.js";
import { createOptimizationHistoryRepository } from "./optimization-history.js";
import { solveScenario } from "./index.js";
import validateScenario from "./validate-scenario.js";

const DEFAULT_BODY_LIMIT_BYTES = 1024 * 1024;

export function createOptiFlowApiServer(options = {}) {
  const repository =
    options.repository || createOptimizationHistoryRepository(options.historyFile);
  const bodyLimitBytes = options.bodyLimitBytes || DEFAULT_BODY_LIMIT_BYTES;

  return http.createServer(function handleRequest(request, response) {
    handleApiRequest(request, response, {
      bodyLimitBytes: bodyLimitBytes,
      repository: repository
    }).catch(function handleUnexpectedError(error) {
      if (error.statusCode && error.code) {
        sendError(response, error.statusCode, error.code, error.message);
        return;
      }

      sendError(response, 500, "internal_error", "Unexpected API error", {
        message: error.message
      });
    });
  });
}

async function handleApiRequest(request, response, dependencies) {
  const url = new URL(request.url, "http://localhost");
  const method = request.method || "GET";

  if (method === "GET" && url.pathname === "/health") {
    sendJson(response, 200, { status: "ok", service: "optiflow-api" });
    return;
  }

  if (method === "POST" && url.pathname === "/scenarios/validate") {
    await handleValidateScenario(request, response, dependencies);
    return;
  }

  if (method === "POST" && url.pathname === "/scenarios") {
    await handleCreateScenario(request, response, dependencies);
    return;
  }

  if (method === "GET" && url.pathname.startsWith("/scenarios/")) {
    handleGetScenario(url.pathname, response, dependencies);
    return;
  }

  if (method === "POST" && url.pathname === "/optimization-runs") {
    await handleCreateOptimizationRun(request, response, dependencies);
    return;
  }

  if (method === "GET" && url.pathname.startsWith("/optimization-runs/")) {
    handleGetOptimizationRun(url.pathname, response, dependencies);
    return;
  }

  sendError(response, 404, "not_found", "Route not found");
}

async function handleValidateScenario(request, response, dependencies) {
  const body = await readJsonBody(request, dependencies.bodyLimitBytes);
  const scenario = readScenarioPayload(body);

  try {
    validateScenario(scenario);
  } catch (error) {
    sendError(response, 422, "validation_failed", error.message);
    return;
  }

  sendJson(response, 200, {
    valid: true,
    scenarioId: scenario.id
  });
}

async function handleCreateScenario(request, response, dependencies) {
  const body = await readJsonBody(request, dependencies.bodyLimitBytes);
  const scenario = readScenarioPayload(body);

  try {
    validateScenario(scenario);
  } catch (error) {
    sendError(response, 422, "validation_failed", error.message);
    return;
  }

  const scenarioRecord = dependencies.repository.recordScenario({
    scenario: scenario,
    createdAt: new Date()
  });

  sendJson(response, 201, renderScenarioRecord(scenarioRecord));
}

function handleGetScenario(pathname, response, dependencies) {
  const scenarioRecordId = decodeURIComponent(pathname.slice("/scenarios/".length));
  const scenarioRecord = dependencies.repository.getScenarioRecord(scenarioRecordId);

  if (!scenarioRecord) {
    sendError(response, 404, "scenario_not_found", "Scenario record not found");
    return;
  }

  sendJson(response, 200, renderScenarioRecord(scenarioRecord));
}

async function handleCreateOptimizationRun(request, response, dependencies) {
  const body = await readJsonBody(request, dependencies.bodyLimitBytes);
  const scenario = resolveScenario(body, dependencies.repository);

  try {
    validateScenario(scenario);
  } catch (error) {
    sendError(response, 422, "validation_failed", error.message);
    return;
  }

  const strategy = readOptionalString(body.strategy) || "nearest-neighbor-capacity";
  const metadata = createExecutionMetadata(body.metadata || {});
  const startedAt = new Date();
  const started = performance.now();

  try {
    const result = solveScenario(scenario, {
      metadata: metadata,
      solver: body.solver || {},
      strategy: strategy
    });
    const persisted = dependencies.repository.recordCompletedRun({
      durationMs: performance.now() - started,
      finishedAt: new Date(),
      result: result,
      scenario: scenario,
      startedAt: startedAt
    });

    sendJson(response, 201, renderOptimizationRun(persisted));
  } catch (error) {
    const persisted = dependencies.repository.recordFailedRun({
      durationMs: performance.now() - started,
      error: error,
      finishedAt: new Date(),
      metadata: metadata,
      scenario: scenario,
      startedAt: startedAt,
      strategy: strategy
    });

    sendJson(response, 422, renderOptimizationRun(persisted));
  }
}

function handleGetOptimizationRun(pathname, response, dependencies) {
  const optimizationRunId = decodeURIComponent(pathname.slice("/optimization-runs/".length));
  const run = dependencies.repository.getRun(optimizationRunId);

  if (!run) {
    sendError(response, 404, "optimization_run_not_found", "Optimization run not found");
    return;
  }

  sendJson(response, 200, renderOptimizationRun(run));
}

function resolveScenario(body, repository) {
  if (body && body.scenario) {
    return body.scenario;
  }

  if (body && body.scenarioRecordId) {
    const scenarioRecord = repository.getScenarioRecord(body.scenarioRecordId);

    if (!scenarioRecord) {
      throw createHttpError(404, "scenario_not_found", "Scenario record not found");
    }

    return scenarioRecord.payload;
  }

  if (body && body.scenarioId) {
    const scenarioRecord = repository.findScenarioRecordByScenarioId(body.scenarioId);

    if (!scenarioRecord) {
      throw createHttpError(404, "scenario_not_found", "Scenario not found");
    }

    return scenarioRecord.payload;
  }

  throw createHttpError(400, "scenario_required", "Request must include scenario, scenarioRecordId, or scenarioId");
}

async function readJsonBody(request, limitBytes) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;

    if (size > limitBytes) {
      throw createHttpError(413, "body_too_large", "Request body is too large");
    }

    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (_error) {
    throw createHttpError(400, "invalid_json", "Request body must be valid JSON");
  }
}

function readScenarioPayload(body) {
  if (body && body.scenario) {
    return body.scenario;
  }

  return body;
}

function renderScenarioRecord(scenarioRecord) {
  return {
    scenarioRecordId: scenarioRecord.id,
    scenarioId: scenarioRecord.scenarioId,
    name: scenarioRecord.name,
    contentHash: scenarioRecord.contentHash,
    createdAt: scenarioRecord.createdAt,
    scenario: scenarioRecord.payload
  };
}

function renderOptimizationRun(persisted) {
  return {
    optimizationRun: persisted.optimizationRun,
    scenario: persisted.scenario,
    routePlan: persisted.routePlan,
    metrics: persisted.metrics
  };
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(payload, null, 2) + "\n");
}

function sendError(response, statusCode, code, message, details) {
  sendJson(response, statusCode, {
    error: {
      code: code,
      message: message,
      details: details || null
    }
  });
}

function createHttpError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function readOptionalString(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}
