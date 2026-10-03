import { performance } from "node:perf_hooks";
import {
  createExecutionMetadata,
  createOptimizationHistoryRepository,
  solveScenario
} from "../src/index.js";
import { readRequiredJsonArgument, readSolverOptionsFromEnv } from "./shared-cli.js";

const scenarioInput = readRequiredJsonArgument(
  process.argv[2],
  "Usage: node scripts/run-scenario-history.js <scenario.json>"
);
const scenario = scenarioInput.document;
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
    solver: readSolverOptionsFromEnv()
  });
  const finishedAt = new Date();
  const persisted = repository.recordCompletedRun({
    scenario: scenario,
    result: result,
    startedAt: startedAt,
    finishedAt: finishedAt,
    durationMs: performance.now() - started,
    sourcePath: scenarioInput.absolutePath
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
    sourcePath: scenarioInput.absolutePath
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
