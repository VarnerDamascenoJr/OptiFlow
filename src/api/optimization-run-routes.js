import createExecutionMetadata from "../execution-metadata.js";
import { readOptionalPositiveInteger } from "../shared/numbers.js";
import { readNonEmptyString } from "../shared/strings.js";
import validateScenario from "../validate-scenario.js";
import { createHttpError, readJsonBody, sendError, sendJson } from "./http.js";

export async function handleCreateOptimizationRunRoute(requestContext) {
  const body = await readJsonBody(
    requestContext.request,
    requestContext.dependencies.bodyLimitBytes
  );
  const scenario = resolveScenario(body, requestContext.dependencies.repository);

  try {
    validateScenario(scenario);
  } catch (error) {
    sendError(requestContext.response, 422, "validation_failed", error.message);
    return;
  }

  const strategy = readNonEmptyString(body.strategy) || "nearest-neighbor-capacity";
  const metadata = createExecutionMetadata(body.metadata || {});
  const persisted = requestContext.dependencies.runQueue.enqueue({
    maxAttempts: readOptionalPositiveInteger(body.maxAttempts),
    metadata: metadata,
    scenario: scenario,
    solver: body.solver || {},
    strategy: strategy,
    timeoutMs: readOptionalPositiveInteger(body.timeoutMs)
  });

  sendJson(requestContext.response, 202, renderOptimizationRun(persisted));
}

export function handleGetOptimizationRunRoute(requestContext) {
  const pathname = requestContext.url.pathname;
  const optimizationRunId = decodeURIComponent(pathname.slice("/optimization-runs/".length));
  const run = requestContext.dependencies.repository.getRun(optimizationRunId);

  if (!run) {
    sendError(requestContext.response, 404, "optimization_run_not_found", "Optimization run not found");
    return;
  }

  sendJson(requestContext.response, 200, renderOptimizationRun(run));
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

function renderOptimizationRun(persisted) {
  return {
    optimizationRun: persisted.optimizationRun,
    scenario: persisted.scenario,
    routePlan: persisted.routePlan,
    metrics: persisted.metrics
  };
}
