import { runFunnelPlanningStudy } from "../src/index.js";
import { readOptionalInteger, readOptionalNumber } from "../src/shared/numbers.js";
import { readJsonFile, readOptionalProfiles, writeJsonFile } from "./shared-cli.js";

const defaultOutputPath = "studies/statistics/2026-09-29-funnel-planning/evidence/summary.json";
const outputPath = process.argv[2] || defaultOutputPath;
const rootPath = process.cwd();
const result = runFunnelPlanningStudy(
  {
    salesPriors: readJsonFile("data/sales-event-exports/optiflow-sales-priors.example.json", rootPath),
    salesAnalyticsExport: readJsonFile("data/sales-event-exports/sales-analytics-priors.example.json", rootPath),
    scenario: readJsonFile("data/scenarios/small-delivery.json", rootPath),
    sharedStatisticalFixture: readJsonFile("data/statistics/shared-statistical-fixture.v1.json", rootPath)
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

const absoluteOutputPath = writeJsonFile(outputPath, result, rootPath);
console.log(absoluteOutputPath);
