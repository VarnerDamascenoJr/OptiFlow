import { runStockoutRiskStudy } from "../src/index.js";
import { readOptionalNumber } from "../src/shared/numbers.js";
import { readJsonFile, writeJsonFile } from "./shared-cli.js";

const defaultOutputPath = "studies/statistics/2026-10-01-stockout-risk/evidence/summary.json";
const outputPath = process.argv[2] || defaultOutputPath;
const rootPath = process.cwd();
const result = runStockoutRiskStudy(readJsonFile("data/stockout/stockout-risk-study.example.json", rootPath), {
  stockoutPenaltyPerUnit: readOptionalNumber(process.env.OPTIFLOW_STOCKOUT_PENALTY_PER_UNIT)
});
const absoluteOutputPath = writeJsonFile(outputPath, result, rootPath);

console.log(absoluteOutputPath);
