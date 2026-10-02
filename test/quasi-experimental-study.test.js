import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  renderQuasiExperimentalStudyReport,
  runQuasiExperimentalStudy
} from "../src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootPath = path.join(__dirname, "..");

test("estimates an intervention effect with difference in differences", function testDifferenceInDifferences() {
  const study = runQuasiExperimentalStudy(
    readJson("data/quasi-experimental/payment-retry-policy.example.json")
  );

  assert.strictEqual(study.schemaVersion, "optiflow-quasi-experimental-study.v1");
  assert.strictEqual(study.design.method, "difference_in_differences");
  assert.strictEqual(study.groups.treatment.change, 0.06);
  assert.strictEqual(study.groups.control.change, 0.015);
  assert.deepStrictEqual(study.estimate.confidenceInterval95, {
    lower: 0.0095,
    upper: 0.0805
  });
  assert.strictEqual(study.estimate.effect, 0.045);
  assert.strictEqual(study.conclusion.label, "cautious_positive_association");
  assert.match(study.conclusion.caution, /parallel trends/);
});

test("renders a cautious quasi-experimental report", function testQuasiExperimentalReport() {
  const report = renderQuasiExperimentalStudyReport(
    runQuasiExperimentalStudy(readJson("data/quasi-experimental/payment-retry-policy.example.json"))
  );

  assert.match(report, /OptiFlow quasi-experimental study/);
  assert.match(report, /Intervention: payment-retry-policy-v2/);
  assert.match(report, /Design: difference_in_differences/);
  assert.match(report, /effect=\+0.045/);
  assert.match(report, /Conclusion: cautious_positive_association/);
});

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(rootPath, relativePath), "utf8"));
}
