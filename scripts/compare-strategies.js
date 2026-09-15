import fs from "node:fs";
import path from "node:path";
import { compareStrategies, renderComparisonReport } from "../src/index.js";

const scenarioPaths = process.argv.slice(2);
const selectedPaths =
  scenarioPaths.length > 0 ? scenarioPaths : listScenarioPaths(path.resolve(process.cwd(), "data", "scenarios"));

const comparisons = selectedPaths.map(function compareScenario(scenarioPath) {
  const absolutePath = path.resolve(process.cwd(), scenarioPath);
  const scenario = JSON.parse(fs.readFileSync(absolutePath, "utf8"));

  return compareStrategies(scenario, {
    baselineStrategy: process.env.OPTIFLOW_BASELINE_STRATEGY,
    candidateStrategy: process.env.OPTIFLOW_CANDIDATE_STRATEGY,
    solver: {
      maxOrders: readOptionalInteger(process.env.OPTIFLOW_SOLVER_MAX_ORDERS),
      timeoutMs: readOptionalInteger(process.env.OPTIFLOW_SOLVER_TIMEOUT_MS)
    }
  });
});

if (process.env.OPTIFLOW_OUTPUT_FORMAT === "json") {
  console.log(JSON.stringify({ comparisons: comparisons }, null, 2));
} else {
  process.stdout.write(renderComparisonReport(comparisons));
}

function listScenarioPaths(directory) {
  return fs
    .readdirSync(directory)
    .filter(function filterJson(fileName) {
      return fileName.endsWith(".json");
    })
    .sort()
    .map(function mapScenarioPath(fileName) {
      return path.join(directory, fileName);
    });
}

function readOptionalInteger(value) {
  if (!value) {
    return undefined;
  }

  return Number(value);
}
