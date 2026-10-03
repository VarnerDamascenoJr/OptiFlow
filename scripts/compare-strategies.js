import { compareStrategies, renderComparisonReport } from "../src/index.js";
import {
  listJsonFiles,
  readJsonFile,
  readSolverOptionsFromEnv,
  resolvePath
} from "./shared-cli.js";

const scenarioPaths = process.argv.slice(2);
const selectedPaths =
  scenarioPaths.length > 0 ? scenarioPaths : listScenarioPaths(resolvePath("data/scenarios"));

const comparisons = selectedPaths.map(function compareScenario(scenarioPath) {
  const scenario = readJsonFile(scenarioPath);

  return compareStrategies(scenario, {
    baselineStrategy: process.env.OPTIFLOW_BASELINE_STRATEGY,
    candidateStrategy: process.env.OPTIFLOW_CANDIDATE_STRATEGY,
    solver: readSolverOptionsFromEnv()
  });
});

if (process.env.OPTIFLOW_OUTPUT_FORMAT === "json") {
  console.log(JSON.stringify({ comparisons: comparisons }, null, 2));
} else {
  process.stdout.write(renderComparisonReport(comparisons));
}

function listScenarioPaths(directory) {
  return listJsonFiles(directory);
}
