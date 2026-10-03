import { importSalesEventScenario } from "../src/index.js";
import { readRequiredJsonArgument, writeTextFile } from "./shared-cli.js";

const inputPath = process.argv[2];
const outputPath = process.argv[3];

const exportDocument = readRequiredJsonArgument(
  inputPath,
  "Usage: node scripts/import-sales-event-scenario.js <sales-export.json> [scenario.json]"
).document;
const scenario = importSalesEventScenario(exportDocument);
const payload = JSON.stringify(scenario, null, 2);

if (!outputPath) {
  console.log(payload);
} else {
  writeTextFile(outputPath, payload + "\n");
}
