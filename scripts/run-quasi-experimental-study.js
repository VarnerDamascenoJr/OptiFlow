import fs from "node:fs";
import path from "node:path";
import { runQuasiExperimentalStudy } from "../src/index.js";

const defaultOutputPath = "studies/statistics/2026-10-02-quasi-experimental/evidence/summary.json";
const outputPath = process.argv[2] || defaultOutputPath;
const rootPath = process.cwd();
const result = runQuasiExperimentalStudy(
  readJson("data/quasi-experimental/payment-retry-policy.example.json")
);
const absoluteOutputPath = path.resolve(rootPath, outputPath);

fs.mkdirSync(path.dirname(absoluteOutputPath), { recursive: true });
fs.writeFileSync(absoluteOutputPath, JSON.stringify(result, null, 2) + "\n");
console.log(absoluteOutputPath);

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.resolve(rootPath, relativePath), "utf8"));
}
