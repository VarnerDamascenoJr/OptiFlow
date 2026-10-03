import { runQuasiExperimentalStudy } from "../src/index.js";
import { readJsonFile, writeJsonFile } from "./shared-cli.js";

const defaultOutputPath = "studies/statistics/2026-10-02-quasi-experimental/evidence/summary.json";
const outputPath = process.argv[2] || defaultOutputPath;
const rootPath = process.cwd();
const result = runQuasiExperimentalStudy(
  readJsonFile("data/quasi-experimental/payment-retry-policy.example.json", rootPath)
);
const absoluteOutputPath = writeJsonFile(outputPath, result, rootPath);

console.log(absoluteOutputPath);
