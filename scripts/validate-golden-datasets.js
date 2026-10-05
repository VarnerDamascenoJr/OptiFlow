import fs from "node:fs";
import path from "node:path";
import { renderGoldenDatasetReport, validateGoldenDatasets } from "../src/index.js";

const rootPath = process.cwd();
const datasetPath = process.argv[2] || "data/statistics/golden-datasets.v1.json";
const result = validateGoldenDatasets(readJson(datasetPath), {
  loadScenario(relativePath) {
    return readJson(relativePath);
  }
});

if (process.env.OPTIFLOW_OUTPUT_FORMAT === "json") {
  console.log(JSON.stringify(result, null, 2));
} else {
  process.stdout.write(renderGoldenDatasetReport(result));
}

if (!result.valid) {
  process.exitCode = 1;
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.resolve(rootPath, relativePath), "utf8"));
}
