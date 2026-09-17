import fs from "node:fs";
import path from "node:path";
import { simulateFixedPlan } from "../src/index.js";

const scenarioPath = process.argv[2];

if (!scenarioPath) {
  console.error("Usage: node scripts/simulate-plan.js <scenario.json>");
  process.exit(1);
}

const absoluteScenarioPath = path.resolve(process.cwd(), scenarioPath);
const scenario = JSON.parse(fs.readFileSync(absoluteScenarioPath, "utf8"));
const result = simulateFixedPlan(scenario, {
  iterations: readOptionalInteger(process.env.OPTIFLOW_SIMULATION_ITERATIONS),
  seed: readOptionalInteger(process.env.OPTIFLOW_SIMULATION_SEED),
  strategy: process.env.OPTIFLOW_STRATEGY,
  uncertainty: {
    cancellationProbability: readOptionalNumber(process.env.OPTIFLOW_CANCELLATION_PROBABILITY),
    demandVariationProbability: readOptionalNumber(process.env.OPTIFLOW_DEMAND_VARIATION_PROBABILITY),
    demandVariationRate: readOptionalNumber(process.env.OPTIFLOW_DEMAND_VARIATION_RATE),
    travelTimeVariationRate: readOptionalNumber(process.env.OPTIFLOW_TRAVEL_TIME_VARIATION_RATE)
  }
});
const output = process.env.OPTIFLOW_SIMULATION_INCLUDE_SAMPLES === "true"
  ? result
  : {
      scenarioId: result.scenarioId,
      strategy: result.strategy,
      seed: result.seed,
      iterations: result.iterations,
      uncertainty: result.uncertainty,
      baseMetrics: result.baseMetrics,
      summary: result.summary
    };

console.log(JSON.stringify(output, null, 2));

function readOptionalInteger(value) {
  if (!value) {
    return undefined;
  }

  return Number(value);
}

function readOptionalNumber(value) {
  if (!value) {
    return undefined;
  }

  return Number(value);
}
