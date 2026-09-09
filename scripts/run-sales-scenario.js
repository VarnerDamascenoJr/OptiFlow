import fs from "node:fs";
import path from "node:path";
import { evaluateSalesDecisionScenario } from "../src/index.js";

const scenarioPath = process.argv[2];

if (!scenarioPath) {
  console.error("Usage: node scripts/run-sales-scenario.js <scenario.json>");
  process.exit(1);
}

const absoluteScenarioPath = path.resolve(process.cwd(), scenarioPath);
const scenario = JSON.parse(fs.readFileSync(absoluteScenarioPath, "utf8"));
const result = evaluateSalesDecisionScenario(scenario);

console.log(JSON.stringify(result, null, 2));
