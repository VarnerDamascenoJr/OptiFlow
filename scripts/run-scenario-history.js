import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import {
  createExecutionMetadata,
  createOptimizationHistoryRepository,
  solveScenario
} from "../src/index.js";

const scenarioPath = process.argv[2];

if (!scenarioPath) {
  console.error("Usage: node scripts/run-scenario-history.js <scenario.json>");
  process.exit(1);
}

const absoluteScenarioPath = path.resolve(process.cwd(), scenarioPath);
const scenario = JSON.parse(fs.readFileSync(absoluteScenarioPath, "utf8"));
const strategy = process.env.OPTIFLOW_STRATEGY || "nearest-neighbor-capacity";
const historyFile = process.env.OPTIFLOW_HISTORY_FILE || ".optiflow/optimization-history.json";
const metadata = createExecutionMetadata({
  requestId: process.env.OPTIFLOW_REQUEST_ID,
  correlationId: process.env.OPTIFLOW_CORRELATION_ID,
  transactionId: process.env.OPTIFLOW_TRANSACTION_ID,
  optimizationRunId: process.env.OPTIFLOW_OPTIMIZATION_RUN_ID,
  service: process.env.OPTIFLOW_SERVICE_NAME,
  environment: process.env.OPTIFLOW_ENVIRONMENT
});
const repository = createOptimizationHistoryRepository(historyFile);
const startedAt = new Date();
const started = performance.now();

try {
  const result = solveScenario(scenario, {
    strategy: strategy,
    metadata: metadata,
    solver: {
      maxOrders: readOptionalInteger(process.env.OPTIFLOW_SOLVER_MAX_ORDERS),
      timeoutMs: readOptionalInteger(process.env.OPTIFLOW_SOLVER_TIMEOUT_MS)
    }
  });
  const finishedAt = new Date();
  const persisted = repository.recordCompletedRun({
    scenario: scenario,
    result: result,
    startedAt: startedAt,
    finishedAt: finishedAt,
    durationMs: performance.now() - started,
    sourcePath: absoluteScenarioPath
  });

  console.log(JSON.stringify(buildSummary(repository.filePath, persisted), null, 2));
} catch (error) {
  const finishedAt = new Date();
  const persisted = repository.recordFailedRun({
    scenario: scenario,
    metadata: metadata,
    strategy: strategy,
    error: error,
    startedAt: startedAt,
    finishedAt: finishedAt,
    durationMs: performance.now() - started,
    sourcePath: absoluteScenarioPath
  });

  console.error(JSON.stringify(buildSummary(repository.filePath, persisted), null, 2));
  process.exit(1);
}

function buildSummary(historyFilePath, persisted) {
  const routePlan = persisted.routePlan;

  return {
    historyFile: historyFilePath,
    optimizationRunId: persisted.optimizationRun.id,
    status: persisted.optimizationRun.status,
    scenarioId: persisted.optimizationRun.scenarioId,
    strategy: persisted.optimizationRun.strategy,
    durationMs: persisted.optimizationRun.durationMs,
    recovered: {
      hasScenarioInput: Boolean(persisted.scenario),
      hasRoutePlan: Boolean(routePlan),
      hasMetrics: Boolean(persisted.metrics),
      totalCost: persisted.metrics ? persisted.metrics.totalCost : null,
      routeCount: routePlan ? routePlan.routes.length : 0
    }
  };
}

function readOptionalInteger(value) {
  if (!value) {
    return undefined;
  }

  return Number(value);
}
