import { analyzeDecisionSensitivity, renderSensitivityReport } from "../src/index.js";
import { readOptionalNumber } from "../src/shared/numbers.js";
import {
  readOptionalJsonFile,
  readOptionalProfiles,
  readRequiredJsonArgument,
  readSimulationOptionsFromEnv,
  readSolverOptionsFromEnv,
  readUncertaintyOptionsFromEnv
} from "./shared-cli.js";

const scenario = readRequiredJsonArgument(
  process.argv[2],
  "Usage: node scripts/run-sensitivity-analysis.js <scenario.json>"
).document;
const salesEventPriors = readOptionalJsonFile(process.env.OPTIFLOW_SALES_PRIORS_PATH);
const result = analyzeDecisionSensitivity(scenario, {
  baselineStrategy: process.env.OPTIFLOW_BASELINE_STRATEGY,
  candidateStrategy: process.env.OPTIFLOW_CANDIDATE_STRATEGY,
  confidenceLevel: readOptionalNumber(process.env.OPTIFLOW_RISK_CONFIDENCE_LEVEL),
  profiles: readOptionalProfiles(process.env.OPTIFLOW_DECISION_PROFILES),
  salesEventPriors: salesEventPriors,
  ...readSimulationOptionsFromEnv(),
  solver: readSolverOptionsFromEnv(),
  uncertainty: readUncertaintyOptionsFromEnv()
});

if (process.env.OPTIFLOW_OUTPUT_FORMAT === "json") {
  console.log(JSON.stringify(result, null, 2));
} else {
  process.stdout.write(renderSensitivityReport(result));
}
