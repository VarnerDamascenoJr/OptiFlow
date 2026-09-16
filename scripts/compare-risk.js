import fs from "node:fs";
import path from "node:path";
import { compareRiskAdjustedStrategies } from "../src/index.js";

const scenarioPath = process.argv[2];

if (!scenarioPath) {
  console.error("Usage: node scripts/compare-risk.js <scenario.json>");
  process.exit(1);
}

const absoluteScenarioPath = path.resolve(process.cwd(), scenarioPath);
const scenario = JSON.parse(fs.readFileSync(absoluteScenarioPath, "utf8"));
const result = compareRiskAdjustedStrategies(scenario, {
  baselineStrategy: process.env.OPTIFLOW_BASELINE_STRATEGY,
  candidateStrategy: process.env.OPTIFLOW_CANDIDATE_STRATEGY,
  confidenceLevel: readOptionalNumber(process.env.OPTIFLOW_RISK_CONFIDENCE_LEVEL),
  iterations: readOptionalInteger(process.env.OPTIFLOW_SIMULATION_ITERATIONS),
  seed: readOptionalInteger(process.env.OPTIFLOW_SIMULATION_SEED),
  solver: {
    maxOrders: readOptionalInteger(process.env.OPTIFLOW_SOLVER_MAX_ORDERS),
    timeoutMs: readOptionalInteger(process.env.OPTIFLOW_SOLVER_TIMEOUT_MS)
  },
  uncertainty: {
    cancellationProbability: readOptionalNumber(process.env.OPTIFLOW_CANCELLATION_PROBABILITY),
    demandVariationProbability: readOptionalNumber(process.env.OPTIFLOW_DEMAND_VARIATION_PROBABILITY),
    demandVariationRate: readOptionalNumber(process.env.OPTIFLOW_DEMAND_VARIATION_RATE),
    travelTimeVariationRate: readOptionalNumber(process.env.OPTIFLOW_TRAVEL_TIME_VARIATION_RATE)
  }
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
