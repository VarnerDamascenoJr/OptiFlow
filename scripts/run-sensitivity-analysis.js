import fs from "node:fs";
import path from "node:path";
import { analyzeDecisionSensitivity, renderSensitivityReport } from "../src/index.js";

const scenarioPath = process.argv[2];

if (!scenarioPath) {
  console.error("Usage: node scripts/run-sensitivity-analysis.js <scenario.json>");
  process.exit(1);
}

const absoluteScenarioPath = path.resolve(process.cwd(), scenarioPath);
const scenario = JSON.parse(fs.readFileSync(absoluteScenarioPath, "utf8"));
const salesEventPriors = readOptionalJsonFile(process.env.OPTIFLOW_SALES_PRIORS_PATH);
const result = analyzeDecisionSensitivity(scenario, {
  baselineStrategy: process.env.OPTIFLOW_BASELINE_STRATEGY,
  candidateStrategy: process.env.OPTIFLOW_CANDIDATE_STRATEGY,
  confidenceLevel: readOptionalNumber(process.env.OPTIFLOW_RISK_CONFIDENCE_LEVEL),
  iterations: readOptionalInteger(process.env.OPTIFLOW_SIMULATION_ITERATIONS),
  profiles: readOptionalProfiles(process.env.OPTIFLOW_DECISION_PROFILES),
  salesEventPriors: salesEventPriors,
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

if (process.env.OPTIFLOW_OUTPUT_FORMAT === "json") {
  console.log(JSON.stringify(result, null, 2));
} else {
  process.stdout.write(renderSensitivityReport(result));
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

function readOptionalProfiles(value) {
  if (!value) {
    return undefined;
  }

  return value.split(",").map(function mapProfile(profile) {
    return profile.trim();
  });
}

function readOptionalJsonFile(filePath) {
  if (!filePath) {
    return undefined;
  }

  const absolutePath = path.resolve(process.cwd(), filePath);
  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
}
