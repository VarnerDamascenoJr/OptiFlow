import { renderOptimizationMetrics, solveScenario } from "../src/index.js";
import { readRequiredJsonArgument, readSolverOptionsFromEnv } from "./shared-cli.js";

const scenario = readRequiredJsonArgument(
  process.argv[2],
  "Usage: node scripts/run-scenario.js <scenario.json>"
).document;
const result = solveScenario(scenario, {
  strategy: process.env.OPTIFLOW_STRATEGY,
  metadata: {
    requestId: process.env.OPTIFLOW_REQUEST_ID,
    correlationId: process.env.OPTIFLOW_CORRELATION_ID,
    transactionId: process.env.OPTIFLOW_TRANSACTION_ID,
    optimizationRunId: process.env.OPTIFLOW_OPTIMIZATION_RUN_ID,
    service: process.env.OPTIFLOW_SERVICE_NAME,
    environment: process.env.OPTIFLOW_ENVIRONMENT
  },
  solver: readSolverOptionsFromEnv()
});

if (process.env.OPTIFLOW_OUTPUT_FORMAT === "prometheus") {
  process.stdout.write(renderOptimizationMetrics(result));
} else {
  console.log(JSON.stringify(result, null, 2));
}
