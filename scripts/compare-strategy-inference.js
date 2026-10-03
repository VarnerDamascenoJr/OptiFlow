import { compareStrategiesWithInference, renderInferenceReport } from "../src/index.js";
import { readOptionalInteger, readOptionalNumber } from "../src/shared/numbers.js";
import {
  readOptionalJsonFile,
  readRequiredJsonArgument,
  readSimulationOptionsFromEnv,
  readSolverOptionsFromEnv,
  readUncertaintyOptionsFromEnv
} from "./shared-cli.js";

const scenario = readRequiredJsonArgument(
  process.argv[2],
  "Usage: node scripts/compare-strategy-inference.js <scenario.json>"
).document;
const salesEventPriors = readOptionalJsonFile(process.env.OPTIFLOW_SALES_PRIORS_PATH);
const result = compareStrategiesWithInference(scenario, {
  baselineStrategy: process.env.OPTIFLOW_BASELINE_STRATEGY,
  bootstrapIterations: readOptionalInteger(process.env.OPTIFLOW_BOOTSTRAP_ITERATIONS),
  bootstrapSeed: readOptionalInteger(process.env.OPTIFLOW_BOOTSTRAP_SEED),
  candidateStrategy: process.env.OPTIFLOW_CANDIDATE_STRATEGY,
  confidenceLevel: readOptionalNumber(process.env.OPTIFLOW_RISK_CONFIDENCE_LEVEL),
  includeSamples: process.env.OPTIFLOW_INFERENCE_INCLUDE_SAMPLES === "true",
  salesEventPriors: salesEventPriors,
  ...readSimulationOptionsFromEnv(),
  solver: readSolverOptionsFromEnv(),
  uncertainty: readUncertaintyOptionsFromEnv()
});

if (process.env.OPTIFLOW_OUTPUT_FORMAT === "json") {
  console.log(JSON.stringify(result, null, 2));
} else {
  process.stdout.write(renderInferenceReport(result));
}
