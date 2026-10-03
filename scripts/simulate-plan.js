import { simulateFixedPlan } from "../src/index.js";
import {
  readOptionalJsonFile,
  readRequiredJsonArgument,
  readSimulationOptionsFromEnv,
  readUncertaintyOptionsFromEnv
} from "./shared-cli.js";

const scenario = readRequiredJsonArgument(
  process.argv[2],
  "Usage: node scripts/simulate-plan.js <scenario.json>"
).document;
const salesEventPriors = readOptionalJsonFile(process.env.OPTIFLOW_SALES_PRIORS_PATH);
const result = simulateFixedPlan(scenario, {
  ...readSimulationOptionsFromEnv(),
  strategy: process.env.OPTIFLOW_STRATEGY,
  salesEventPriors: salesEventPriors,
  uncertainty: readUncertaintyOptionsFromEnv()
});
const output = process.env.OPTIFLOW_SIMULATION_INCLUDE_SAMPLES === "true"
  ? result
  : {
      scenarioId: result.scenarioId,
      strategy: result.strategy,
      seed: result.seed,
      iterations: result.iterations,
      uncertainty: result.uncertainty,
      calibration: result.calibration,
      baseMetrics: result.baseMetrics,
      summary: result.summary
    };

console.log(JSON.stringify(output, null, 2));
