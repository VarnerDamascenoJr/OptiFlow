import fs from "node:fs";
import path from "node:path";
import { runFunnelPlanningStudy } from "../src/index.js";
import { readOptionalInteger, readOptionalNumber } from "../src/shared/numbers.js";

const defaultOutputPath = "studies/statistics/2026-09-29-funnel-planning/evidence/summary.json";
const outputPath = process.argv[2] || defaultOutputPath;
const rootPath = process.cwd();
const result = runFunnelPlanningStudy(
  {
    salesPriors: readJson("data/sales-event-exports/optiflow-sales-priors.example.json"),
    salesAnalyticsExport: readJson("data/sales-event-exports/sales-analytics-priors.example.json"),
    scenario: readJson("data/scenarios/small-delivery.json"),
    sharedStatisticalFixture: readJson("data/statistics/shared-statistical-fixture.v1.json")
  },
  {
    iterations: readOptionalInteger(process.env.OPTIFLOW_SIMULATION_ITERATIONS),
    profiles: readOptionalProfiles(process.env.OPTIFLOW_DECISION_PROFILES),
    seed: readOptionalInteger(process.env.OPTIFLOW_SIMULATION_SEED),
    uncertainty: {
      travelTimeVariationRate: readOptionalNumber(process.env.OPTIFLOW_TRAVEL_TIME_VARIATION_RATE)
    }
  }
);

const absoluteOutputPath = path.resolve(rootPath, outputPath);
fs.mkdirSync(path.dirname(absoluteOutputPath), { recursive: true });
fs.writeFileSync(absoluteOutputPath, JSON.stringify(result, null, 2) + "\n");
console.log(absoluteOutputPath);

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.resolve(rootPath, relativePath), "utf8"));
}

function readOptionalProfiles(value) {
  if (!value) {
    return undefined;
  }

  return value.split(",").map(function mapProfile(profile) {
    return profile.trim();
  });
}
