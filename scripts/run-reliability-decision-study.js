import {
  renderReliabilityDecisionStudyReport,
  runReliabilityDecisionStudy
} from "../src/index.js";
import { readOptionalNumber } from "../src/shared/numbers.js";
import { readJsonFile } from "./shared-cli.js";

const inputPath =
  process.argv[2] || "data/reliability/reliability-decision-study.example.json";
const input = readJsonFile(inputPath);
const result = runReliabilityDecisionStudy(input, {
  confidenceLevel: readOptionalNumber(process.env.OPTIFLOW_RISK_CONFIDENCE_LEVEL)
});

if (process.env.OPTIFLOW_OUTPUT_FORMAT === "json") {
  console.log(JSON.stringify(result, null, 2));
} else {
  process.stdout.write(renderReliabilityDecisionStudyReport(result));
}
