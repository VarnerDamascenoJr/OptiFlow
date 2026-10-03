import fs from "node:fs";
import path from "node:path";
import { runStockoutRiskStudy } from "../src/index.js";
import { readOptionalNumber } from "../src/shared/numbers.js";

const defaultOutputPath = "studies/statistics/2026-10-01-stockout-risk/evidence/summary.json";
const outputPath = process.argv[2] || defaultOutputPath;
const rootPath = process.cwd();
const result = runStockoutRiskStudy(readJson("data/stockout/stockout-risk-study.example.json"), {
  stockoutPenaltyPerUnit: readOptionalNumber(process.env.OPTIFLOW_STOCKOUT_PENALTY_PER_UNIT)
});
const absoluteOutputPath = path.resolve(rootPath, outputPath);

fs.mkdirSync(path.dirname(absoluteOutputPath), { recursive: true });
fs.writeFileSync(absoluteOutputPath, JSON.stringify(result, null, 2) + "\n");
console.log(absoluteOutputPath);

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.resolve(rootPath, relativePath), "utf8"));
}
