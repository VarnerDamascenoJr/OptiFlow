import fs from "node:fs";
import path from "node:path";
import { renderOptimizationMetrics, solveScenario } from "../src/index.js";

const scenarioPath = process.argv[2];

if (!scenarioPath) {
  console.error("Usage: node scripts/run-scenario.js <scenario.json>");
  process.exit(1);
}

const absoluteScenarioPath = path.resolve(process.cwd(), scenarioPath);
const scenario = JSON.parse(fs.readFileSync(absoluteScenarioPath, "utf8"));
const result = solveScenario(scenario, {
  metadata: {
    requestId: process.env.OPTIFLOW_REQUEST_ID,
    correlationId: process.env.OPTIFLOW_CORRELATION_ID,
    transactionId: process.env.OPTIFLOW_TRANSACTION_ID,
    optimizationRunId: process.env.OPTIFLOW_OPTIMIZATION_RUN_ID,
    service: process.env.OPTIFLOW_SERVICE_NAME,
    environment: process.env.OPTIFLOW_ENVIRONMENT
  }
});

if (process.env.OPTIFLOW_OUTPUT_FORMAT === "prometheus") {
  process.stdout.write(renderOptimizationMetrics(result));
} else {
  console.log(JSON.stringify(result, null, 2));
}
