import { compareRiskAdjustedStrategies } from "../src/index.js";
import { readOptionalNumber } from "../src/shared/numbers.js";
import {
  readRequiredJsonArgument,
  readSimulationOptionsFromEnv,
  readSolverOptionsFromEnv,
  readUncertaintyOptionsFromEnv
} from "./shared-cli.js";

const scenario = readRequiredJsonArgument(
  process.argv[2],
  "Usage: node scripts/compare-risk.js <scenario.json>"
).document;
const result = compareRiskAdjustedStrategies(scenario, {
  baselineStrategy: process.env.OPTIFLOW_BASELINE_STRATEGY,
  candidateStrategy: process.env.OPTIFLOW_CANDIDATE_STRATEGY,
  confidenceLevel: readOptionalNumber(process.env.OPTIFLOW_RISK_CONFIDENCE_LEVEL),
  ...readSimulationOptionsFromEnv(),
  solver: readSolverOptionsFromEnv(),
  uncertainty: readUncertaintyOptionsFromEnv()
});

console.log(JSON.stringify(renderRiskComparison(result), null, 2));

function renderRiskComparison(result) {
  return {
    scenarioId: result.scenarioId,
    confidenceLevel: result.confidenceLevel,
    baseline: renderStrategy(result.baseline),
    candidate: renderStrategy(result.candidate),
    recommendations: result.recommendations
  };
}

function renderStrategy(entry) {
  return {
    strategy: entry.strategy,
    expectedCost: entry.simulation.summary.totalCost.mean,
    costValueAtRisk: entry.risk.totalCost.valueAtRisk,
    costConditionalValueAtRisk: entry.risk.totalCost.conditionalValueAtRisk,
    lateProbability: entry.simulation.summary.lateProbability,
    unassignedProbability: entry.simulation.summary.unassignedProbability
  };
}
