import fs from "node:fs";
import path from "node:path";
import { importSalesEventScenario } from "../src/index.js";

const inputPath = process.argv[2];
const outputPath = process.argv[3];

if (!inputPath) {
  console.error("Usage: node scripts/import-sales-event-scenario.js <sales-export.json> [scenario.json]");
  process.exit(1);
}

const absoluteInputPath = path.resolve(process.cwd(), inputPath);
const exportDocument = JSON.parse(fs.readFileSync(absoluteInputPath, "utf8"));
const scenario = importSalesEventScenario(exportDocument);
const payload = JSON.stringify(scenario, null, 2);

if (!outputPath) {
  console.log(payload);
} else {
  const absoluteOutputPath = path.resolve(process.cwd(), outputPath);
  fs.mkdirSync(path.dirname(absoluteOutputPath), { recursive: true });
  fs.writeFileSync(absoluteOutputPath, payload + "\n");
}
