import fs from "node:fs";
import path from "node:path";
import { renderDecisionBacktestReport, runDecisionBacktest } from "../src/index.js";

const backtestPath = process.argv[2];

if (!backtestPath) {
  console.error("Usage: node scripts/run-decision-backtest.js <backtest.json>");
  process.exit(1);
}

const absoluteBacktestPath = path.resolve(process.cwd(), backtestPath);
const backtestDocument = JSON.parse(fs.readFileSync(absoluteBacktestPath, "utf8"));
const result = runDecisionBacktest(backtestDocument, {
  confidenceLevel: readOptionalNumber(process.env.OPTIFLOW_RISK_CONFIDENCE_LEVEL),
  iterations: readOptionalInteger(process.env.OPTIFLOW_SIMULATION_ITERATIONS),
  profiles: readOptionalProfiles(process.env.OPTIFLOW_DECISION_PROFILES),
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
  process.stdout.write(renderDecisionBacktestReport(result));
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
