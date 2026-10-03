import { renderDecisionBacktestReport, runDecisionBacktest } from "../src/index.js";
import { readOptionalNumber } from "../src/shared/numbers.js";
import {
  readOptionalProfiles,
  readRequiredJsonArgument,
  readSimulationOptionsFromEnv,
  readSolverOptionsFromEnv,
  readUncertaintyOptionsFromEnv
} from "./shared-cli.js";

const backtestDocument = readRequiredJsonArgument(
  process.argv[2],
  "Usage: node scripts/run-decision-backtest.js <backtest.json>"
).document;
const result = runDecisionBacktest(backtestDocument, {
  confidenceLevel: readOptionalNumber(process.env.OPTIFLOW_RISK_CONFIDENCE_LEVEL),
  profiles: readOptionalProfiles(process.env.OPTIFLOW_DECISION_PROFILES),
  ...readSimulationOptionsFromEnv(),
  solver: readSolverOptionsFromEnv(),
  uncertainty: readUncertaintyOptionsFromEnv()
});

if (process.env.OPTIFLOW_OUTPUT_FORMAT === "json") {
  console.log(JSON.stringify(result, null, 2));
} else {
  process.stdout.write(renderDecisionBacktestReport(result));
}
